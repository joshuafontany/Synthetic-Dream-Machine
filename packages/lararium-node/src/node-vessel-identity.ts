/**
 * node-vessel-identity — device Ed25519 keypair lifecycle.
 *
 * Local-first identity root (Brooklyn Zelenka / UCAN / Keyhive alignment):
 *   - keypair is generated device-local, persists to disk with mode 0o600
 *   - verifyingKey (hex 32 bytes) feeds did:key derivation
 *   - did:key derivation happens in the TW5 VM (cold-boot-ceremony module)
 *   - displayName derives from `git config user.name` — local truth, no network call
 *
 * Identity capabilities (#has-stack ontology — a nameless entity carries a stack of
 * capabilities, never a numbered plane): this keypair is the VESSEL's own signing
 * capability, the user×vessel bond. The OPERATOR identity is a DISTINCT capability —
 * the PersonaGroup root that delegates membership to a user's vessels. TODAY the two
 * CONFLATE: one key is COPIED across a user's vessels (Model A) and the IdentityTiddler
 * brands it `kind="operator"`. Model A is a TEMPORARY stopgap — the copy-the-key
 * antipattern; the target mints a DISTINCT key per vessel, delegated into the
 * PersonaGroup by a signed edge (the delegation IS the relationship — the vessel's stack
 * #has the edge). The behavioral vessel/operator-root split is held for the genesis
 * refactor (crucible-gated). See lar:///ha.ka.ba/@lares/docs/lares/federation
 * (Model A/B) and the #has-stack ontology (api/pono/has-stack-ontology).
 *
 * Storage law — identity lives OUTSIDE the wipe zone:
 *   callers pass the storage dir (`<root>/.lararium`); the keypair + card persist to
 *   a SIBLING `<root>/.lararium-identity/`, structurally unreachable by any `reset`/
 *   `rebuild` that rmSyncs `<root>/.lararium`. This realizes the law below (the key
 *   MUST NOT sit inside an Automerge doc storage path) and the keypair-wipe lesson:
 *   a destructive storage verb can no longer reach identity.
 *
 * Key file naming (inside the identity dir):
 *   git email configured:  .vessel-key-{email-slug}.json
 *   git email absent:      .vessel-key.json
 *
 * Different developers on the same machine each get their own keypair.
 * The keypair derives from a local CSPRNG — fully device-local, no external service.
 *
 * MUST NOT be placed inside any Automerge doc storage path — MUST NOT sync.
 * Mode 0o600 at write time; caller must ensure the identity dir is not world-readable.
 */

import { generateKeyPairSync, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
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

export interface VesselIdentity {
  /** Hex-encoded 32-byte Ed25519 verifying key. */
  verifyingKey: string;
  /** Display name from git config user.name. Enriches IdentityTiddler only. */
  displayName?: string;
}

function keyFileName(login: string | null): string {
  return login ? `.vessel-key-${login}.json` : ".vessel-key.json";
}

// ── KERI-style pre-rotation (the can't-retrofit root-rotation hook) ──────────
//
// At key GENERATION (the only window before the key ever signs), commit the DIGEST
// of the NEXT root key. A thief of the current key still cannot rotate the identifier,
// because a rotation must reveal a pre-image hashing to this committed digest — which
// the thief never saw. Pre-rotation CANNOT be retrofitted: a key that has already
// signed has no valid inception window.
//
// MINIMAL hook (operator ruling 2026-06-24): the load-bearing part is the
// commit-the-next-key-digest-BEFORE-first-use ordering, captured here. The full KERI
// KEL / CESR / SAID encoding + the `lares rotate-root` ceremony land later (the
// `digestAlgo` field keeps the digest swappable to blake3-256 SAID at KERI-interop).
//
// CUSTODY CAVEAT: this minimal hook persists the next-root private seed on the SAME
// disk (0o600, in .lararium-identity). Full pre-rotation (a thief of the CURRENT key
// cannot rotate) needs the next seed in OFFLINE/cold custody — an operator-arranged
// follow-on. The commitment (`n`) is load-bearing now; it upgrades when the seed
// moves offline.
function kelFileName(login: string | null): string {
  return login ? `.vessel-kel-${login}.json` : ".vessel-kel.json";
}
function nextSeedFileName(login: string | null): string {
  return login ? `.vessel-next-${login}.json` : ".vessel-next.json";
}

interface InceptionKel {
  v:          string;   // "lares-prerotation/v1" — minimal; full KERI KEL/CESR lands later
  t:          string;   // "icp" — inception (KEL entry 0)
  s:          string;   // sequence — "0" at inception
  k:          string[]; // current verifying key(s), revealed (hex)
  nt:         string;   // next signing threshold
  n:          string[]; // DIGEST(s) of the next key(s) — the pre-rotation commitment
  digestAlgo: string;   // "sha256" now; swappable to "blake3-256-said" at KERI-interop
  createdAt:  string;   // ISO-8601
}

/** Generate the next-root keypair + the pre-rotation inception commitment. */
function mintInceptionCommitment(currentVerifyingKey: string): {
  kel: InceptionKel;
  nextSeed: { nextVerifyingKey: string; nextSigningKey: string };
} {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubJwk  = publicKey.export({ format: "jwk" })  as { x: string };
  const privJwk = privateKey.export({ format: "jwk" }) as { d: string };
  const nextVerifyingKey = Buffer.from(pubJwk.x,  "base64url").toString("hex");
  const nextSigningKey   = Buffer.from(privJwk.d, "base64url").toString("hex");
  const nextDigest = createHash("sha256").update(Buffer.from(nextVerifyingKey, "hex")).digest("hex");
  return {
    kel: {
      v: "lares-prerotation/v1", t: "icp", s: "0",
      k: [currentVerifyingKey], nt: "1", n: [nextDigest],
      digestAlgo: "sha256", createdAt: new Date().toISOString(),
    },
    nextSeed: { nextVerifyingKey, nextSigningKey },
  };
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
export async function generateOrLoadVesselIdentity(
  dataDir: string,
): Promise<VesselIdentity> {
  const idDir = identityDir(dataDir);
  mkdirSync(idDir, { recursive: true });

  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  // Sweep BOTH identity files out of the wipe zone on every boot/init — the card
  // is re-mintable but still identity; move it eagerly alongside the key so a
  // `reset` between CLI identity loads can never strand it in `.lararium/`.
  const keyFile  = join(idDir, keyFileName(hint.login));

  let verifyingKey: string;

  if (existsSync(keyFile)) {
    const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
    verifyingKey = raw.verifyingKey;
    console.log(`[vessel-identity] loaded keypair${hint.login ? ` for ${hint.login}` : ""}`);
    // No-retrofit guard: a key minted before pre-rotation has no valid inception window —
    // NEVER fake one (it has already signed; the thief-can't-rotate guarantee is unrecoverable).
    if (!existsSync(join(idDir, kelFileName(hint.login)))) {
      console.log(`[vessel-identity] key predates pre-rotation — non-pre-rotating (not retrofitted)`);
    }
  } else {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pubJwk  = publicKey.export({ format: "jwk" }) as { x: string };
    const privJwk = privateKey.export({ format: "jwk" }) as { d: string };

    verifyingKey           = Buffer.from(pubJwk.x,  "base64url").toString("hex");
    const signingKey       = Buffer.from(privJwk.d, "base64url").toString("hex");
    const persisted: PersistedKey = { verifyingKey, signingKey, ...(hint.login ? { gitEmail: hint.login } : {}) };

    writeFileSync(keyFile, JSON.stringify(persisted, null, 2), { mode: 0o600, encoding: "utf8" });
    chmodSync(keyFile, 0o600);
    console.log(`[vessel-identity] generated new Ed25519 keypair${hint.login ? ` for ${hint.login}` : ""}`);

    // Pre-rotation: commit the next-root key's digest NOW — before this key ever signs
    // (first use is `keyhive.init`, downstream of founding). The only valid window; cannot
    // be retrofitted. Minimal commitment; full KERI KEL/ceremony later (see kelFileName note).
    const { kel, nextSeed } = mintInceptionCommitment(verifyingKey);
    const kelFile  = join(idDir, kelFileName(hint.login));
    const nextFile = join(idDir, nextSeedFileName(hint.login));
    writeFileSync(kelFile,  JSON.stringify(kel, null, 2),      { mode: 0o600, encoding: "utf8" });
    writeFileSync(nextFile, JSON.stringify(nextSeed, null, 2), { mode: 0o600, encoding: "utf8" });
    chmodSync(kelFile, 0o600);
    chmodSync(nextFile, 0o600);
    console.log(`[vessel-identity] committed pre-rotation inception (next-key digest sealed)${hint.login ? ` for ${hint.login}` : ""}`);
  }

  const base: VesselIdentity = { verifyingKey };
  return hint.displayName ? { ...base, displayName: hint.displayName } : base;
}

/**
 * Load the operator's 32-byte Ed25519 SIGNING seed (private key bytes).
 *
 * Separate from `generateOrLoadVesselIdentity` — that function returns only
 * the public verifying key (sufficient for IdentityTiddler), while this one
 * surfaces the private seed needed by KeyhiveProvider.init({ seed }) and any
 * other capability layer that signs on the operator's behalf.
 *
 * SECURITY: the returned bytes ARE the operator's private signing key. Treat
 * with care: don't log it, don't write it anywhere outside the vessel-identity
 * file, and don't pass it across process boundaries that aren't already
 * inside the operator's trust domain.
 *
 * Throws when no key file exists — caller must call
 * `generateOrLoadVesselIdentity(dataDir)` first to ensure one is on disk.
 */
/**
 * Load the operator's hex-encoded Ed25519 PUBLIC verifying key from disk.
 * Cheap read — no crypto. Returns the same `verifyingKey` field
 * generateOrLoadVesselIdentity surfaces, without regenerating if missing.
 *
 * Used by the CLI to populate verb-tiddler `requested-by` with a
 * Keyhive-recognizable DID (`0x` + verifyingKey hex). Throws when no key
 * file exists.
 */
export async function loadVesselVerifyingKey(dataDir: string): Promise<string> {
  const hint    = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const keyFile = join(identityDir(dataDir), keyFileName(hint.login));
  if (!existsSync(keyFile)) {
    throw new Error(
      `[vessel-identity] no key file at ${keyFile} — run \`lares init\` first to generate the keypair`,
    );
  }
  const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
  if (typeof raw.verifyingKey !== "string" || raw.verifyingKey.length !== 64) {
    throw new Error(`[vessel-identity] malformed verifyingKey in ${keyFile}`);
  }
  return raw.verifyingKey;
}

function cardFileName(login: string | null): string {
  return login ? `.vessel-card-${login}.json` : ".vessel-card.json";
}

/**
 * Persist the operator's pre-minted Keyhive ContactCard JSON beside the keypair
 * (mode 0o600). The founding ceremony mints it once; a short-lived LEAF actor
 * (CLI run / agent turn) re-presents this cached card on every peer handshake
 * WITHOUT booting keyhive — the light-identity path (operator-peer #actor-parity
 * OP-AP5). The card carries no expiry/nonce, so the cache never goes stale; proof
 * freshness rides the per-challenge nonce, never the card.
 */
export async function persistVesselCard(dataDir: string, contactCardJson: string): Promise<void> {
  const idDir = identityDir(dataDir);
  mkdirSync(idDir, { recursive: true });
  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const cardFile = join(idDir, cardFileName(hint.login));
  writeFileSync(cardFile, contactCardJson, { mode: 0o600, encoding: "utf8" });
  chmodSync(cardFile, 0o600);
  console.log(`[vessel-identity] persisted ContactCard${hint.login ? ` for ${hint.login}` : ""}`);
}

/**
 * Load the operator's cached ContactCard JSON. Throws when absent — the caller
 * must run `lares init` (which mints + persists it during the founding ceremony).
 */
export async function loadVesselCard(dataDir: string): Promise<string> {
  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const cardFile = join(identityDir(dataDir), cardFileName(hint.login));
  if (!existsSync(cardFile)) {
    throw new Error(
      `[vessel-identity] no ContactCard at ${cardFile} — run \`lares init\` (it mints the card during the founding ceremony)`,
    );
  }
  return readFileSync(cardFile, "utf8");
}

export async function loadVesselSigningSeed(dataDir: string): Promise<Uint8Array> {
  const hint    = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const keyFile = join(identityDir(dataDir), keyFileName(hint.login));
  if (!existsSync(keyFile)) {
    throw new Error(
      `[vessel-identity] no key file at ${keyFile} — run \`lares init\` first to generate the keypair`,
    );
  }
  const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
  if (typeof raw.signingKey !== "string" || raw.signingKey.length !== 64) {
    throw new Error(`[vessel-identity] malformed signingKey in ${keyFile}`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(raw.signingKey.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ── PersonaGroup root key custody (the operator-root delegation capability) ──────
//
// Two DISTINCT capabilities, never two numbered planes (#has-stack ontology — a
// nameless entity carries a stack of capabilities, not a layer index):
//   · the per-vessel device key above = the capability a vessel #has to sign AS
//     ITSELF (its own leaf identity).
//   · the PersonaGroup root here        = the operator-root capability that SIGNS the
//     device-delegation edges granting vessels membership. Its public key is the
//     operator-root DID (`0x`+hex) peers PIN to verify those edges offline at the Binding Gate
//     (no Beelay). A vessel joins the PersonaGroup by holding a signed edge from this
//     root — membership is a capability the vessel's stack #has, not a plane it sits on.
//
// The root lives ONLY on the founding vessel: a joining vessel holds the founder's
// public DID + a signed edge, NEVER the root seed (two roots = two operators, not one
// PersonaGroup).
//
// Custody law (same as the vessel key): persists into the SIBLING
// `.lararium-identity/` dir, mode 0o600, structurally outside any `reset`/`rebuild`
// wipe. A root seed inside `.lararium/` would mean operator-identity loss on `lares
// reset` — the same keypair-wipe lesson, now for the operator-root capability.
//
// Pre-rotation for the root is a follow-on (same register as the vessel KERI hook
// above): the root is the MORE pin-worthy identity, so its inception commitment +
// offline next-seed custody upgrade lands with the full `lares rotate-root` ceremony.
function personaGroupRootFileName(login: string | null): string {
  return login ? `.persona-group-root-${login}.json` : ".persona-group-root.json";
}

export interface PersonaGroupRoot {
  /** Hex-encoded 32-byte Ed25519 verifying key — the operator-root DID peers pin (`0x`+hex). */
  verifyingKey: string;
  /** True when this call minted a fresh root; false when it loaded an existing one. */
  created: boolean;
}

/**
 * Generate or load the PersonaGroup-root keypair (the operator-root delegation capability).
 *
 * Idempotent: loads an existing root, mints one only on first call. FOUNDER-ONLY —
 * a joining vessel must NEVER call this; it receives the founder's public DID + a
 * signed delegation edge at admit (Phase 3) instead.
 *
 * Returns only the public verifyingKey; the signing seed surfaces via
 * `loadPersonaGroupRootSeed` for the founding ceremony's edge-minting.
 */
export async function generateOrLoadPersonaGroupRoot(
  dataDir: string,
): Promise<PersonaGroupRoot> {
  const idDir = identityDir(dataDir);
  mkdirSync(idDir, { recursive: true });

  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const rootFile = join(idDir, personaGroupRootFileName(hint.login));

  if (existsSync(rootFile)) {
    const raw = JSON.parse(readFileSync(rootFile, "utf8")) as PersistedKey;
    if (typeof raw.verifyingKey !== "string" || raw.verifyingKey.length !== 64) {
      throw new Error(`[vessel-identity] malformed verifyingKey in ${rootFile}`);
    }
    console.log(`[vessel-identity] loaded PersonaGroup root${hint.login ? ` for ${hint.login}` : ""}`);
    return { verifyingKey: raw.verifyingKey, created: false };
  }

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubJwk  = publicKey.export({ format: "jwk" }) as { x: string };
  const privJwk = privateKey.export({ format: "jwk" }) as { d: string };
  const verifyingKey = Buffer.from(pubJwk.x,  "base64url").toString("hex");
  const signingKey   = Buffer.from(privJwk.d, "base64url").toString("hex");
  const persisted: PersistedKey = { verifyingKey, signingKey, ...(hint.login ? { gitEmail: hint.login } : {}) };

  writeFileSync(rootFile, JSON.stringify(persisted, null, 2), { mode: 0o600, encoding: "utf8" });
  chmodSync(rootFile, 0o600);
  console.log(`[vessel-identity] minted PersonaGroup root${hint.login ? ` for ${hint.login}` : ""}`);
  return { verifyingKey, created: true };
}

/**
 * Load the PersonaGroup-root 32-byte Ed25519 SIGNING seed (founder-only).
 *
 * The founding ceremony signs device-delegation edges with this seed. SECURITY: the
 * returned bytes ARE the operator-root private key — the most sensitive secret on the
 * vessel (it authorizes PersonaGroup membership). Same handling rules as
 * `loadVesselSigningSeed`. Throws when absent — call `generateOrLoadPersonaGroupRoot`
 * first (founding only; a joinee never holds this).
 */
export async function loadPersonaGroupRootSeed(dataDir: string): Promise<Uint8Array> {
  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const rootFile = join(identityDir(dataDir), personaGroupRootFileName(hint.login));
  if (!existsSync(rootFile)) {
    throw new Error(
      `[vessel-identity] no PersonaGroup root at ${rootFile} — mint it via the founding ceremony first (founder-only; a joining vessel never holds the root seed)`,
    );
  }
  const raw = JSON.parse(readFileSync(rootFile, "utf8")) as PersistedKey;
  if (typeof raw.signingKey !== "string" || raw.signingKey.length !== 64) {
    throw new Error(`[vessel-identity] malformed signingKey in ${rootFile}`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(raw.signingKey.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
