/**
 * browser-vessel-identity — WebCrypto Ed25519 keypair lifecycle for browser vessels.
 *
 * Browser analog of node-vessel-identity.ts (Node). Platform deltas:
 *   - crypto.subtle.generateKey({name:"Ed25519"}) instead of Node generateKeyPairSync
 *   - IndexedDB for persistence instead of NodeFS (mode 0o600)
 *   - No git-config lookup; displayName passed by caller
 *
 * Key material lives only in the origin's IndexedDB under `<idbName>` / "keystore".
 * Never transferred to island Workers.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-vessel-identity
 */

const KEY_RECORD = "vessel-key";

interface PersistedBrowserKey {
  /** Hex-encoded 32-byte Ed25519 verifying key. */
  verifyingKey: string;
  /** Hex-encoded 32-byte Ed25519 private seed. Never synced or transferred. */
  signingKey: string;
}

export interface BrowserVesselIdentity {
  verifyingKey: string;
  displayName?: string;
}

// ── IDB helpers ───────────────────────────────────────────────────────────────

export function openVesselIdb(idbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(idbName, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("keystore"))  db.createObjectStore("keystore");
      if (!db.objectStoreNames.contains("bootstrap")) db.createObjectStore("bootstrap");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror   = () => reject(req.error);
  });
}

export function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Encoding ──────────────────────────────────────────────────────────────────

function base64urlToHex(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob(b64);
  let hex = "";
  for (let i = 0; i < bin.length; i++) hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// ── Keypair lifecycle ─────────────────────────────────────────────────────────

/**
 * Generate or load the browser operator Ed25519 keypair.
 *
 * First call: generates a new keypair via WebCrypto, persists to IDB, returns identity.
 * Subsequent calls: loads from IDB.
 *
 * @param idbName  IDB database name (default "lares:vessel")
 * @param displayName  Optional operator display name for identity tiddler.
 */
export async function generateOrLoadBrowserVesselIdentity(
  idbName    = "lares:vessel",
  displayName?: string,
): Promise<BrowserVesselIdentity> {
  const db      = await openVesselIdb(idbName);
  const existing = await idbGet<PersistedBrowserKey>(db, "keystore", KEY_RECORD);

  if (existing) {
    db.close();
    const base: BrowserVesselIdentity = { verifyingKey: existing.verifyingKey };
    return displayName ? { ...base, displayName } : base;
  }

  // First boot — generate via WebCrypto.
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" } as EcKeyGenParams,
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;

  const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey) as JsonWebKey;
  const pubJwk  = await crypto.subtle.exportKey("jwk", keyPair.publicKey)  as JsonWebKey;

  if (!privJwk.d || !pubJwk.x) {
    throw new Error("[browser-vessel-identity] WebCrypto exportKey produced unexpected JWK shape");
  }

  const signingKey   = base64urlToHex(privJwk.d);
  const verifyingKey = base64urlToHex(pubJwk.x);

  const record: PersistedBrowserKey = { verifyingKey, signingKey };
  await idbPut(db, "keystore", KEY_RECORD, record);
  db.close();

  const base: BrowserVesselIdentity = { verifyingKey };
  return displayName ? { ...base, displayName } : base;
}

/**
 * Load the operator's 32-byte Ed25519 signing seed from IDB.
 * Throws when no keypair exists — call generateOrLoadBrowserVesselIdentity first.
 */
export async function loadBrowserSigningSeed(idbName = "lares:vessel"): Promise<Uint8Array> {
  const db      = await openVesselIdb(idbName);
  const existing = await idbGet<PersistedBrowserKey>(db, "keystore", KEY_RECORD);
  db.close();

  if (!existing) {
    throw new Error("[browser-vessel-identity] no keypair in IDB — call generateOrLoadBrowserVesselIdentity first");
  }
  return hexToBytes(existing.signingKey);
}
