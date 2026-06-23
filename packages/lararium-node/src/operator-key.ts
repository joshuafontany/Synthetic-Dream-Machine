/**
 * operator-key — device Ed25519 keypair lifecycle.
 *
 * Local-first identity root (Brooklyn Zelenka / UCAN / Keyhive alignment):
 *   - keypair is generated device-local, persists to disk with mode 0o600
 *   - verifyingKey (hex 32 bytes) feeds did:key derivation
 *   - did:key derivation happens in the TW5 VM (cold-boot-ceremony module)
 *   - displayName derives from `git config user.name` — local truth, no network call
 *
 * Identity plane (5-scale model): this keypair is the VESSEL's key — Plane 0
 * (device-vessel), the user×vessel bond. The OPERATOR identity is Plane 1, the
 * PersonGroup (the group of a user's vessels). TODAY the two CONFLATE: one key is
 * COPIED across a user's vessels (Model A) and the IdentityTiddler brands it
 * `kind="operator"`. Model A is a TEMPORARY stopgap — the copy-the-key antipattern;
 * the target mints a DISTINCT key per vessel, delegated into the PersonGroup by a
 * signed edge (the delegation IS the relationship). The behavioral Plane 0/1 split
 * is held for the genesis refactor (crucible-gated). See
 * lar:///ha.ka.ba/@lares/v0.1/docs/lares/federation (Model A/B) and
 * lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture (the 5-scale).
 *
 * Storage law — identity lives OUTSIDE the wipe zone:
 *   callers pass the storage dir (`<root>/.lararium`); the keypair + card persist to
 *   a SIBLING `<root>/.lararium-identity/`, structurally unreachable by any `reset`/
 *   `rebuild` that rmSyncs `<root>/.lararium`. This realizes the law below (the key
 *   MUST NOT sit inside an Automerge doc storage path) and the keypair-wipe lesson:
 *   a destructive storage verb can no longer reach identity.
 *
 * Key file naming (inside the identity dir):
 *   git email configured:  .operator-key-{email-slug}.json
 *   git email absent:      .operator-key.json
 *
 * Different developers on the same machine each get their own keypair.
 * The keypair derives from a local CSPRNG — fully device-local, no external service.
 *
 * MUST NOT be placed inside any Automerge doc storage path — MUST NOT sync.
 * Mode 0o600 at write time; caller must ensure the identity dir is not world-readable.
 */

import { generateKeyPairSync } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";

/**
 * The identity dir — a SIBLING of the storage dir, structurally OUTSIDE any
 * `.lararium/` wipe. `reset`/`rebuild` rmSync `<root>/.lararium`; the key + card
 * live in `<root>/.lararium-identity` and no storage verb can reach them.
 */
function identityDir(dataDir: string): string {
  return join(dirname(dataDir), ".lararium-identity");
}

/**
 * One-time, best-effort migration of a legacy in-storage identity file into the
 * sibling identity dir: moves `<dataDir>/<file>` → `<identityDir>/<file>` when the
 * new location lacks it but the legacy one holds it. Idempotent — a no-op once moved.
 */
function migrateLegacyIdentity(dataDir: string, fileName: string): void {
  const idDir   = identityDir(dataDir);
  const nextLoc = join(idDir, fileName);
  const legacy  = join(dataDir, fileName);
  if (!existsSync(nextLoc) && existsSync(legacy)) {
    mkdirSync(idDir, { recursive: true });
    renameSync(legacy, nextLoc);
    chmodSync(nextLoc, 0o600);
    console.log(`[operator-key] migrated ${fileName} → .lararium-identity (out of the wipe zone)`);
  }
}

// ── Local operator identity hint ──────────────────────────────────────────
// Fully local-first: reads git config only. No network calls, no server tokens.
// Email slug derived from git email (email-prefix, lowercased, sanitized) for
// per-developer key file naming on shared machines. DisplayName from git user.name.
//
// Causal-island law: operator identity derives from local keys — not from any
// server-conferred session. Git config supplies local truth; no external registry.

const exec = promisify(execFile);

interface LocalOperatorHint { login: string | null; displayName: string | null }

async function readLocalOperatorHint(): Promise<LocalOperatorHint> {
  let displayName: string | null = null;
  let login:       string | null = null;
  try {
    const { stdout } = await exec("git", ["config", "--global", "user.name"], { timeout: 2_000 });
    displayName = stdout.trim() || null;
  } catch { /* git absent or user.name unset */ }
  try {
    const { stdout } = await exec("git", ["config", "--global", "user.email"], { timeout: 2_000 });
    const email = stdout.trim();
    if (email) {
      // Stable, filesystem-safe slug: email prefix, lowercased, non-alnum→dash.
      login = email.split("@")[0]!.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    }
  } catch { /* git absent or user.email unset */ }
  return { login, displayName };
}

interface PersistedKey {
  /** Hex-encoded 32-byte Ed25519 public key. Input to did:key derivation. */
  verifyingKey: string;
  /** Hex-encoded 32-byte Ed25519 private key seed. Local signing only. Never synced. */
  signingKey:   string;
  /** Git email prefix at key-generation time. Informational only — drives key file naming. */
  gitEmail?: string;
}

export interface OperatorIdentity {
  /** Hex-encoded 32-byte Ed25519 verifying key. */
  verifyingKey: string;
  /** Display name from git config user.name. Enriches IdentityTiddler only. */
  displayName?: string;
}

function keyFileName(login: string | null): string {
  return login ? `.operator-key-${login}.json` : ".operator-key.json";
}

/**
 * Generate or load the device Ed25519 operator keypair.
 *
 * Key file naming uses git email slug — different developers on the same machine
 * each hold separate keys. Falls back to a shared file when git email is absent.
 *
 * Causal-islands alignment: keypair generation runs as a device-local operation that
 * MUST complete before any Automerge doc opens. The verifyingKey flows into the
 * cold-boot ceremony which writes the IdentityTiddler into IdentitiesDoc via
 * direct handle.change() — not through the TW5 sync adaptor (wrong island).
 */
export async function generateOrLoadOperatorKeypair(
  dataDir: string,
): Promise<OperatorIdentity> {
  const idDir = identityDir(dataDir);
  mkdirSync(idDir, { recursive: true });

  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  // Sweep BOTH identity files out of the wipe zone on every boot/init — the card
  // is re-mintable but still identity; move it eagerly alongside the key so a
  // `reset` between CLI identity loads can never strand it in `.lararium/`.
  migrateLegacyIdentity(dataDir, keyFileName(hint.login));
  migrateLegacyIdentity(dataDir, cardFileName(hint.login));
  const keyFile  = join(idDir, keyFileName(hint.login));

  let verifyingKey: string;

  if (existsSync(keyFile)) {
    const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
    verifyingKey = raw.verifyingKey;
    console.log(`[operator-key] loaded keypair${hint.login ? ` for ${hint.login}` : ""}`);
  } else {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pubJwk  = publicKey.export({ format: "jwk" }) as { x: string };
    const privJwk = privateKey.export({ format: "jwk" }) as { d: string };

    verifyingKey           = Buffer.from(pubJwk.x,  "base64url").toString("hex");
    const signingKey       = Buffer.from(privJwk.d, "base64url").toString("hex");
    const persisted: PersistedKey = { verifyingKey, signingKey, ...(hint.login ? { gitEmail: hint.login } : {}) };

    writeFileSync(keyFile, JSON.stringify(persisted, null, 2), { mode: 0o600, encoding: "utf8" });
    chmodSync(keyFile, 0o600);
    console.log(`[operator-key] generated new Ed25519 keypair${hint.login ? ` for ${hint.login}` : ""}`);
  }

  const base: OperatorIdentity = { verifyingKey };
  return hint.displayName ? { ...base, displayName: hint.displayName } : base;
}

/**
 * Load the operator's 32-byte Ed25519 SIGNING seed (private key bytes).
 *
 * Separate from `generateOrLoadOperatorKeypair` — that function returns only
 * the public verifying key (sufficient for IdentityTiddler), while this one
 * surfaces the private seed needed by KeyhiveProvider.init({ seed }) and any
 * other capability layer that signs on the operator's behalf.
 *
 * SECURITY: the returned bytes ARE the operator's private signing key. Treat
 * with care: don't log it, don't write it anywhere outside the operator-key
 * file, and don't pass it across process boundaries that aren't already
 * inside the operator's trust domain.
 *
 * Throws when no key file exists — caller must call
 * `generateOrLoadOperatorKeypair(dataDir)` first to ensure one is on disk.
 */
/**
 * Load the operator's hex-encoded Ed25519 PUBLIC verifying key from disk.
 * Cheap read — no crypto. Returns the same `verifyingKey` field
 * generateOrLoadOperatorKeypair surfaces, without regenerating if missing.
 *
 * Used by the CLI to populate verb-tiddler `requested-by` with a
 * Keyhive-recognizable DID (`0x` + verifyingKey hex). Throws when no key
 * file exists.
 */
export async function loadOperatorVerifyingKey(dataDir: string): Promise<string> {
  const hint    = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  migrateLegacyIdentity(dataDir, keyFileName(hint.login));
  const keyFile = join(identityDir(dataDir), keyFileName(hint.login));
  if (!existsSync(keyFile)) {
    throw new Error(
      `[operator-key] no key file at ${keyFile} — run \`lares init\` first to generate the keypair`,
    );
  }
  const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
  if (typeof raw.verifyingKey !== "string" || raw.verifyingKey.length !== 64) {
    throw new Error(`[operator-key] malformed verifyingKey in ${keyFile}`);
  }
  return raw.verifyingKey;
}

function cardFileName(login: string | null): string {
  return login ? `.operator-card-${login}.json` : ".operator-card.json";
}

/**
 * Persist the operator's pre-minted Keyhive ContactCard JSON beside the keypair
 * (mode 0o600). The founding ceremony mints it once; a short-lived LEAF actor
 * (CLI run / agent turn) re-presents this cached card on every peer handshake
 * WITHOUT booting keyhive — the light-identity path (operator-peer #actor-parity
 * OP-AP5). The card carries no expiry/nonce, so the cache never goes stale; proof
 * freshness rides the per-challenge nonce, never the card.
 */
export async function persistOperatorCard(dataDir: string, contactCardJson: string): Promise<void> {
  const idDir = identityDir(dataDir);
  mkdirSync(idDir, { recursive: true });
  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const cardFile = join(idDir, cardFileName(hint.login));
  writeFileSync(cardFile, contactCardJson, { mode: 0o600, encoding: "utf8" });
  chmodSync(cardFile, 0o600);
  console.log(`[operator-key] persisted ContactCard${hint.login ? ` for ${hint.login}` : ""}`);
}

/**
 * Load the operator's cached ContactCard JSON. Throws when absent — the caller
 * must run `lares init` (which mints + persists it during the founding ceremony).
 */
export async function loadOperatorCard(dataDir: string): Promise<string> {
  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  migrateLegacyIdentity(dataDir, cardFileName(hint.login));
  const cardFile = join(identityDir(dataDir), cardFileName(hint.login));
  if (!existsSync(cardFile)) {
    throw new Error(
      `[operator-key] no ContactCard at ${cardFile} — run \`lares init\` (it mints the card during the founding ceremony)`,
    );
  }
  return readFileSync(cardFile, "utf8");
}

export async function loadOperatorSigningSeed(dataDir: string): Promise<Uint8Array> {
  const hint    = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  migrateLegacyIdentity(dataDir, keyFileName(hint.login));
  const keyFile = join(identityDir(dataDir), keyFileName(hint.login));
  if (!existsSync(keyFile)) {
    throw new Error(
      `[operator-key] no key file at ${keyFile} — run \`lares init\` first to generate the keypair`,
    );
  }
  const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
  if (typeof raw.signingKey !== "string" || raw.signingKey.length !== 64) {
    throw new Error(`[operator-key] malformed signingKey in ${keyFile}`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(raw.signingKey.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
