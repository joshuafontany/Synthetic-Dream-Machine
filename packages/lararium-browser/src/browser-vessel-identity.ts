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
 * Meme: lar:///ha.ka.ba/lararium/browser/browser-vessel-identity
 */

import {
  generateOrLoadKeypair,
  signingSeedFromHex,
  readIdentityAnchors,
  generateOrLoadPersonaRoot,
  loadPersonaRootSeed,
  wearPersona as coreWearPersona,
  loadActivePersona as coreLoadActivePersona,
  personaRootExists as corePersonaRootExists,
  listPersonaRoots as coreListPersonaRoots,
  type KeypairStore,
  type KeypairCrypto,
  type PersonaVault,
  type PersonaRoot,
  type ActivePersonaStore,
  type AnchorStore,
  type IdentityAnchors,
  type OwnPersonaPetnameStore,
  type OwnPublicHandleStore,
  type PersonaPublicHandleRecord,
} from "@lararium/mesh";

const KEY_RECORD = "vessel-key";

// The IndexedDB object stores this vessel keeps. `keystore`/`bootstrap` carry the device key + the
// social bootstrap (the founding floor); the persona-multitude stores mirror the node fs vault's
// per-index files. Every store bumps the DB version together, so a reboot upgrades additively (the
// device key + bootstrap survive; the new stores appear empty until a persona founds).
const IDB_VERSION       = 3;
const PERSONA_ROOTS_STORE  = "persona-roots";     // per-index persona-root keypairs (self-sovereign secret)
const PERSONA_ROSTER_STORE = "persona-roster";    // the EXPLICIT held-root record (never a keys()-scan)
const ACTIVE_PERSONA_STORE = "active-persona";    // the worn-mask pointer (one handle-index)
const ANCHORS_STORE        = "anchors";           // per-index veiled-Handle anchors (public doc-ids)
const ANCHOR_ROSTER_STORE  = "anchor-roster";     // the EXPLICIT anchored-index record
// The two-layer pet-names (#64 stage 4): the PRIVATE own-persona label map (never federates) + the PUBLIC
// own-published-face record. Per-index, keyed by `h${N}` like the persona-root slots.
const PERSONA_PETNAME_STORE      = "persona-petnames";        // handleIndex → the human's PRIVATE label
const PERSONA_PUBLIC_HANDLE_STORE = "persona-public-handles"; // handleIndex → the vessel's OWN published face
const ROSTER_RECORD        = "roster";            // the single key both roster stores write under
const ACTIVE_RECORD        = "active";            // the single key the selector writes under

/** The persona-root filename analog — a per-handle-index key inside the persona-roots store. UNIFORM
 *  `h${N}` (no founding special-case), mirroring the node vault's `.persona-group-root-…-h${N}.json`. */
function personaRootKey(handleIndex: number): string { return `h${handleIndex}`; }

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
    const req = indexedDB.open(idbName, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      // Additive migration: each store lands only when absent, so a v1 DB (keystore + bootstrap) keeps
      // its device key + social bootstrap and gains the persona-multitude stores empty.
      if (!db.objectStoreNames.contains("keystore"))         db.createObjectStore("keystore");
      if (!db.objectStoreNames.contains("bootstrap"))        db.createObjectStore("bootstrap");
      if (!db.objectStoreNames.contains(PERSONA_ROOTS_STORE))  db.createObjectStore(PERSONA_ROOTS_STORE);
      if (!db.objectStoreNames.contains(PERSONA_ROSTER_STORE)) db.createObjectStore(PERSONA_ROSTER_STORE);
      if (!db.objectStoreNames.contains(ACTIVE_PERSONA_STORE)) db.createObjectStore(ACTIVE_PERSONA_STORE);
      if (!db.objectStoreNames.contains(ANCHORS_STORE))        db.createObjectStore(ANCHORS_STORE);
      if (!db.objectStoreNames.contains(ANCHOR_ROSTER_STORE))  db.createObjectStore(ANCHOR_ROSTER_STORE);
      // v3 additive: the two-layer pet-name stores. A v2 DB gains them empty; no persona names until the
      // human labels one / publishes a glamour.
      if (!db.objectStoreNames.contains(PERSONA_PETNAME_STORE))       db.createObjectStore(PERSONA_PETNAME_STORE);
      if (!db.objectStoreNames.contains(PERSONA_PUBLIC_HANDLE_STORE)) db.createObjectStore(PERSONA_PUBLIC_HANDLE_STORE);
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

export function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Enumerate one store's keys — the per-index roster read the pet-name + public-handle stores ride (each
 *  keys by `h${N}`, one record per persona, so the key list IS the roster). */
export function idbKeys(db: IDBDatabase, store: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAllKeys();
    req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
    req.onerror   = () => reject(req.error);
  });
}

// ── Platform seams for the shared keypair lifecycle (vessel-identity-core) ──────
// The browser mints via WebCrypto (Ed25519 subtle) and persists the keypair to
// IndexedDB. The core (mesh) owns the generate-or-load control flow over these.
// base64urlToHex stays browser-local — it decodes a WebCrypto JWK field via
// `atob`, with no mesh-floor equivalent.

function base64urlToHex(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob(b64);
  let hex = "";
  for (let i = 0; i < bin.length; i++) hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
  return hex;
}

const browserKeypairCrypto: KeypairCrypto = {
  async generate() {
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
    return { verifyingKey: base64urlToHex(pubJwk.x), signingKey: base64urlToHex(privJwk.d) };
  },
};

/**
 * An IndexedDB keypair slot at (store, key) — the ONE keypair-persistence primitive both the device key
 * and each persona-root reuse (custody-by-type: the browser at-rest guard, such as it is, lives HERE in
 * the adapter; the mesh core never sees the bytes). Today the browser holds NO seal for self-sovereign
 * secrets — a persona-root persists CLEARTEXT hex exactly as the device key beside it does (IDB, origin-
 * scoped). SURFACED: a WebCrypto at-rest seal (the browser twin of node's scrypt/AES-GCM archive-seal)
 * is a follow-on; until it lands, the persona-root shares the device key's cleartext-at-rest posture.
 */
function idbKeypairSlot(idbName: string, storeName: string, key: string): KeypairStore {
  return {
    async load() {
      const db = await openVesselIdb(idbName);
      const existing = await idbGet<PersistedBrowserKey>(db, storeName, key);
      db.close();
      return existing ? { verifyingKey: existing.verifyingKey, signingKey: existing.signingKey } : undefined;
    },
    async save(kp) {
      const db = await openVesselIdb(idbName);
      const record: PersistedBrowserKey = { verifyingKey: kp.verifyingKey, signingKey: kp.signingKey };
      await idbPut(db, storeName, key, record);
      db.close();
    },
  };
}

/** The device keypair slot — the vessel's OWN signing capability (the Individual), distinct from every
 *  persona-root (the two-key atom: device-key ⊥ persona-root). */
function idbKeypairStore(idbName: string): KeypairStore {
  return idbKeypairSlot(idbName, "keystore", KEY_RECORD);
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
  const { verifyingKey } = await generateOrLoadKeypair(idbKeypairStore(idbName), browserKeypairCrypto);
  const base: BrowserVesselIdentity = { verifyingKey };
  return displayName ? { ...base, displayName } : base;
}

/**
 * Load the operator's 32-byte Ed25519 signing seed from IDB.
 * Throws when no keypair exists — call generateOrLoadBrowserVesselIdentity first.
 */
export async function loadBrowserSigningSeed(idbName = "lares:vessel"): Promise<Uint8Array> {
  const existing = await idbKeypairStore(idbName).load();
  if (!existing) {
    throw new Error("[browser-vessel-identity] no keypair in IDB — call generateOrLoadBrowserVesselIdentity first");
  }
  return signingSeedFromHex(existing.signingKey);
}

// ── PersonaGroup root custody — the IDB-backed PersonaVault (over @lararium/mesh) ────────────────
//
// The browser twin of the node fs vault (node-vessel-identity: makeNodeFsPersonaVault). Two DISTINCT
// capabilities, never two planes (#has-stack): the device key above signs AS THIS VESSEL (its own leaf);
// the PersonaGroup root here is the operator-root that SIGNS the device-delegation edges granting
// membership. PLURALITY PONO at the identity layer — a human wears a SET of personas, so the vault holds
// a SET of roots keyed by handle-index, WEARS one at a time, and MAY switch.
//
// The isomorphic control flow (generate/load/wear/custody-refuse/roster) lives platform-blind in mesh's
// persona-vault; THIS adapter supplies the browser seams: per-index IDB keypair slots, a JSON active-
// persona selector, the anchor store, and (SURFACED) a NULL recovery store. The at-rest guard stays HERE
// (custody-by-type) — but the browser holds no seal for self-sovereign secrets yet, so each root persists
// cleartext exactly as the device key does (see idbKeypairSlot).
//
// ROOT-ON-FOUNDER: the founding ceremony mints founder-side only; a joinee's vault holds anchors at its
// admitted index with NO matching root (listRoots()=[]). UNIFORM KEYING — every root spells `h${N}`; the
// ROSTER is an EXPLICIT written record the slot's save maintains, never an IDB keys()-scan (the browser
// twin of the node dir-scan ward).

/** Read the persona-root roster's explicit record (ascending), or [] when none / a torn one reads back. */
async function readPersonaRoster(idbName: string): Promise<number[]> {
  const db = await openVesselIdb(idbName);
  const raw = await idbGet<{ roots?: unknown }>(db, PERSONA_ROSTER_STORE, ROSTER_RECORD);
  db.close();
  if (Array.isArray(raw?.roots)) {
    return [...new Set(raw.roots.filter((n): n is number => Number.isSafeInteger(n) && n >= 0))].sort((a, b) => a - b);
  }
  return [];
}

/** Record a held handle-index into the persona-root roster — the mint's explicit written mark. */
async function recordPersonaRoot(idbName: string, handleIndex: number): Promise<void> {
  const roots = new Set(await readPersonaRoster(idbName));
  roots.add(handleIndex);
  const db = await openVesselIdb(idbName);
  await idbPut(db, PERSONA_ROSTER_STORE, ROSTER_RECORD, { roots: [...roots].sort((a, b) => a - b) });
  db.close();
}

/** The IDB ActivePersonaStore — one worn-mask pointer (never a root). No inference from an empty home:
 *  an unset selector reads undefined (the caller decides any default). */
function idbActivePersonaStore(idbName: string): ActivePersonaStore {
  return {
    async load() {
      const db = await openVesselIdb(idbName);
      const raw = await idbGet<{ handleIndex?: unknown }>(db, ACTIVE_PERSONA_STORE, ACTIVE_RECORD);
      db.close();
      return Number.isSafeInteger(raw?.handleIndex) && (raw!.handleIndex as number) >= 0
        ? (raw!.handleIndex as number)
        : undefined;
    },
    async save(handleIndex) {
      const db = await openVesselIdb(idbName);
      await idbPut(db, ACTIVE_PERSONA_STORE, ACTIVE_RECORD, { handleIndex });
      db.close();
    },
  };
}

/**
 * The IDB AnchorStore — over a PRIMED in-memory snapshot.
 *
 * SURFACED FORK (core-shape mismatch, resolved adapter-side): the mesh `AnchorStore` seam is SYNCHRONOUS
 * (`load`/`save`/`list` return values, not Promises) — it was shaped around node's sync fs. IndexedDB is
 * fundamentally async, so the browser cannot read it synchronously mid-call. Rather than churn the core to
 * async (which would force node's sync fs stores async too, across the whole identity surface), this
 * adapter primes an in-memory snapshot from IDB ONCE at vault construction (async) and serves the sync
 * reads from it; a `save` updates the snapshot synchronously and WRITES THROUGH to IDB fire-and-forget.
 * Sound because anchors carry ONLY PUBLIC doc-ids (no secret, no custody risk), the in-process snapshot is
 * authoritative for the vessel's life, and IDB re-primes at the next construction ("live process state is
 * the boundary", the same pattern the active-surface pointer rides).
 */
async function primeIdbAnchorStore(idbName: string): Promise<AnchorStore> {
  const db = await openVesselIdb(idbName);
  const rosterRaw = await idbGet<{ anchors?: unknown }>(db, ANCHOR_ROSTER_STORE, ROSTER_RECORD);
  const roster: number[] = Array.isArray(rosterRaw?.anchors)
    ? [...new Set(rosterRaw.anchors.filter((n): n is number => Number.isSafeInteger(n) && n >= 0))].sort((a, b) => a - b)
    : [];
  const snapshot = new Map<number, IdentityAnchors>();
  for (const i of roster) {
    const parsed = await idbGet<Partial<IdentityAnchors>>(db, ANCHORS_STORE, personaRootKey(i));
    const anchors = readIdentityAnchors(parsed);
    if (anchors) snapshot.set(i, anchors);
  }
  db.close();
  const rosterSet = new Set(roster);
  return {
    load: (handleIndex) => snapshot.get(handleIndex) ?? null,
    list: () => [...rosterSet].sort((a, b) => a - b),
    save: (handleIndex, anchors) => {
      snapshot.set(handleIndex, anchors);   // the in-process snapshot IS authoritative this vessel's life
      rosterSet.add(handleIndex);
      const roots = [...rosterSet].sort((a, b) => a - b);
      // Write through fire-and-forget (public ids — a lost write self-heals at the next founding/admit).
      void (async () => {
        const wdb = await openVesselIdb(idbName);
        await idbPut(wdb, ANCHORS_STORE, personaRootKey(handleIndex), anchors);
        await idbPut(wdb, ANCHOR_ROSTER_STORE, ROSTER_RECORD, { anchors: roots });
        wdb.close();
      })();
    },
  };
}

/**
 * Build the IDB-backed PersonaVault — the browser mirror of makeNodeFsPersonaVault. `rootSlot(i)` vends the
 * per-index IDB keypair slot, wrapping its save to RECORD the index into the explicit roster (the founding
 * mark). `hasRoot`/`listRoots` read that roster — never an IDB keys()-scan. `anchors` rides the primed
 * snapshot above. `recovery` reads NULL — SURFACED below.
 */
export async function makeBrowserIdbPersonaVault(idbName = "lares:vessel"): Promise<PersonaVault> {
  const anchors = await primeIdbAnchorStore(idbName);
  return {
    rootSlot(handleIndex) {
      const base = idbKeypairSlot(idbName, PERSONA_ROOTS_STORE, personaRootKey(handleIndex));
      return {
        load: () => base.load(),
        async save(keypair) {
          await base.save(keypair);
          await recordPersonaRoot(idbName, handleIndex);   // the mint writes the explicit roster mark
        },
      };
    },
    listRoots: () => readPersonaRoster(idbName),
    async hasRoot(handleIndex) { return (await readPersonaRoster(idbName)).includes(handleIndex); },
    selector: idbActivePersonaStore(idbName),
    anchors,
    // SURFACED (identity/security fork, resolved toward null): the browser holds NO at-rest seal for
    // self-sovereign secrets yet — the device key + persona-roots sit cleartext in IDB. A device
    // recovery-share is share material of the root; sealing it needs the WebCrypto seal leg (the browser
    // twin of node's archive-seal) FIRST, else it would land a self-only secret cleartext with LESS
    // protection than node's sealed store. Recovery provisioning is a separate operator ceremony (even on
    // node it never runs at boot), so a null store blocks nothing the boot needs. `provisionRecoveryAtFounding`
    // fails LOUD on a null recovery store — the honest failure, never a fake seal. Wire this once the
    // browser seal lands (a stage-4+ follow-on).
    recovery: null,
  };
}

/** A persona-root's public face + whether THIS call minted it (the mesh core's PersonaRoot). */
export type BrowserPersonaRoot = PersonaRoot;

/**
 * Generate or load the PersonaGroup-root at `handleIndex` (the operator-root delegation capability),
 * over WebCrypto + IDB. FOUNDER-ONLY — a joining vessel receives the founder's public DID + a signed
 * delegation edge at admit instead. The browser twin of node's generateOrLoadPersonaGroupRoot.
 */
export async function generateOrLoadBrowserPersonaRoot(idbName = "lares:vessel", handleIndex = 0): Promise<BrowserPersonaRoot> {
  return generateOrLoadPersonaRoot(await makeBrowserIdbPersonaVault(idbName), browserKeypairCrypto, handleIndex);
}

/**
 * Load the PersonaGroup-root 32-byte Ed25519 SIGNING seed at `handleIndex` (founder-only). SECURITY: the
 * returned bytes ARE the operator-root private key — the most sensitive secret on the vessel. Throws when
 * absent — mint via the founding ceremony first (a joinee never holds this).
 */
export async function loadBrowserPersonaRootSeed(idbName = "lares:vessel", handleIndex = 0): Promise<Uint8Array> {
  return loadPersonaRootSeed(await makeBrowserIdbPersonaVault(idbName), handleIndex);
}

/** WEAR a persona — set the active handle-index ("put on a mask"). The custody-by-TYPE wall (uniform, no
 *  founding special-case): wearing REQUIRES that this vessel HOLD that persona-root. */
export async function wearBrowserPersona(idbName = "lares:vessel", handleIndex = 0): Promise<void> {
  return coreWearPersona(await makeBrowserIdbPersonaVault(idbName), handleIndex);
}

/** Load the active-persona handle-index the vessel currently WEARS, or undefined when it wears none yet
 *  (no inference from an empty home — the caller decides any default). */
export async function loadBrowserActivePersona(idbName = "lares:vessel"): Promise<number | undefined> {
  return coreLoadActivePersona(await makeBrowserIdbPersonaVault(idbName));
}

/** True when this vessel HOLDS a persona-root at `handleIndex` (founder-side custody). A joinee holds none. */
export async function browserPersonaRootExists(idbName = "lares:vessel", handleIndex = 0): Promise<boolean> {
  return corePersonaRootExists(await makeBrowserIdbPersonaVault(idbName), handleIndex);
}

/** The persona ROSTER — every handle-index this vessel HOLDS a root for, ascending, from the explicit
 *  written record. A one-persona vessel returns `[0]`; a joinee returns `[]`. */
export async function listBrowserPersonaRoots(idbName = "lares:vessel"): Promise<number[]> {
  return coreListPersonaRoots(await makeBrowserIdbPersonaVault(idbName));
}

/**
 * A joinee's browser holds no root, so it cannot WEAR through the root selector (wearPersona gates on
 * hasRoot). It wears its ONE admitted persona through the ANCHOR/EDGE it received at admit. This read
 * answers "which persona am I, as a joinee" from the ANCHOR roster — the founder-signed binding, not a
 * held root.
 *
 * SURFACED (Coreward's joinee-wear path): resolved as a pure ADAPTER READ, no core change. A joinee's
 * admit lands exactly one anchor set (its admitted index), so the anchored-persona roster names the worn
 * persona directly. When a root IS held (a founder), listRoots is the authority and this falls through to
 * the worn selector; a joinee (listRoots()=[]) reads its single anchored index. Undefined only when the
 * vessel is neither founder nor admitted (a bare anon before any founding) — the caller defaults it.
 */
export async function browserJoineePersonaIndex(idbName = "lares:vessel"): Promise<number | undefined> {
  const vault = await makeBrowserIdbPersonaVault(idbName);
  const worn = await vault.selector.load();
  if (worn !== undefined) return worn;                 // an explicit worn pointer wins
  const roots = await vault.listRoots();
  if (roots.length > 0) return roots[0];               // a founder with no explicit pointer → its founding root
  const anchored = vault.anchors.list();               // a joinee holds anchors, no root → its admitted index
  return anchored.length > 0 ? anchored[0] : undefined;
}

// ── The two-layer PET-NAME stores — the browser twins of the node fs stores ──────────────────────────
//
// Two DISTINCT IDB stores over the vessel's origin DB (v3 additive), keyed `h${N}` per persona:
//   · the PRIVATE pet-name map (PERSONA_PETNAME_STORE) — the human's own label, freely renamable, NEVER
//     federated (persona-petname). The never-federates wall is structural: no board write exists in this
//     seam. A future device-fleet adapter wraps the SAME shape over a private bag for cross-vessel sync.
//   · the PUBLIC published-face record (PERSONA_PUBLIC_HANDLE_STORE) — the vessel's memory of its OWN
//     glamour faces (nym/glamour/version/cardId), so a re-publish advances the monotone lineage
//     (persona-glamour). Distinct from the pet-name map and from the handle-book (others' nyms).

/** The per-persona IDB key — uniform `h${N}`, mirroring the persona-root slots' spelling. */
function personaPetnameKey(handleIndex: number): string { return `h${handleIndex}`; }

/** Parse a `h${N}` store key back to its handle-index, or null when it does not fit the shape. */
function handleIndexFromKey(key: string): number | null {
  const m = /^h(\d+)$/.exec(key);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

/**
 * Build the IDB OwnPersonaPetnameStore — the PRIVATE own-persona pet-name map. Keyed `h${N}`, one label per
 * persona. Holds only the human's own labels; nothing here reaches a board (the never-federates wall).
 */
export async function makeBrowserPersonaPetnameStore(idbName = "lares:vessel"): Promise<OwnPersonaPetnameStore> {
  return {
    async get(handleIndex) {
      const db = await openVesselIdb(idbName);
      const v  = await idbGet<string>(db, PERSONA_PETNAME_STORE, personaPetnameKey(handleIndex));
      db.close();
      return typeof v === "string" ? v : undefined;
    },
    async set(handleIndex, petname) {
      const db = await openVesselIdb(idbName);
      await idbPut(db, PERSONA_PETNAME_STORE, personaPetnameKey(handleIndex), petname);
      db.close();
    },
    async clear(handleIndex) {
      const db = await openVesselIdb(idbName);
      await idbDelete(db, PERSONA_PETNAME_STORE, personaPetnameKey(handleIndex));
      db.close();
    },
    async entries() {
      const db = await openVesselIdb(idbName);
      const keys = await idbKeys(db, PERSONA_PETNAME_STORE);
      const pairs: Array<readonly [number, string]> = [];
      for (const key of keys) {
        const i = handleIndexFromKey(key);
        if (i === null) continue;
        const v = await idbGet<string>(db, PERSONA_PETNAME_STORE, key);
        if (typeof v === "string") pairs.push([i, v] as const);
      }
      db.close();
      return pairs.sort((a, b) => a[0] - b[0]);
    },
  };
}

/**
 * Build the IDB OwnPublicHandleStore — the vessel's memory of ITS OWN published glamour faces. Keyed
 * `h${N}`, one record per persona. Records carry ONLY public data (the veiled nym, the display glamour, the
 * card lineage), so no seal touches them; they persist so a re-publish keeps advancing the lineage a peer's
 * HandleBook holds to.
 */
export async function makeBrowserPublicHandleStore(idbName = "lares:vessel"): Promise<OwnPublicHandleStore> {
  return {
    async load(handleIndex) {
      const db = await openVesselIdb(idbName);
      const r  = await idbGet<PersonaPublicHandleRecord>(db, PERSONA_PUBLIC_HANDLE_STORE, personaPetnameKey(handleIndex));
      db.close();
      return r ?? null;
    },
    async save(record) {
      const db = await openVesselIdb(idbName);
      await idbPut(db, PERSONA_PUBLIC_HANDLE_STORE, personaPetnameKey(record.handleIndex), record);
      db.close();
    },
    async list() {
      const db = await openVesselIdb(idbName);
      const keys = await idbKeys(db, PERSONA_PUBLIC_HANDLE_STORE);
      db.close();
      return keys.map(handleIndexFromKey).filter((n): n is number => n !== null).sort((a, b) => a - b);
    },
  };
}
