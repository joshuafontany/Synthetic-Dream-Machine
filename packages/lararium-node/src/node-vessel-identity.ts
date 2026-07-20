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
 * refactor. See lar:///ha.ka.ba/lares/docs/lares/federation
 * (Model A/B) and the #has-stack ontology (api/pono/has-stack-ontology).
 *
 * Storage law — identity lives OUTSIDE the wipe zone:
 *   the keypair + card persist to `<state>/identity` (`larIdentityDir`), in the XDG state
 *   home BESIDE — never inside — the wiped `<data>/vessel`. No `reset`/`regenesis`/`rebuild`
 *   can reach it (they rmSync the substrate store, not the state home). This realizes the
 *   law below (the key MUST NOT sit inside an Automerge doc storage path) and the
 *   keypair-wipe lesson: a destructive storage verb can no longer reach identity.
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
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { larIdentityDir } from "./vessel-paths.js";
import {
  generateOrLoadKeypair,
  signingSeedFromHex,
  type KeypairStore,
  type KeypairCrypto,
} from "@lararium/mesh";

/**
 * The identity dir — the ONE resolver, `<state>/identity` (`larIdentityDir`), in the XDG
 * state home OUTSIDE any substrate wipe. `reset`/`regenesis`/`rebuild` reforge the
 * `<data>/vessel` store; the key + card + anchors survive here, unreachable by any storage
 * verb. An empty home re-derives a fresh device key — no migration arm, no legacy spelling.
 */
function identityDir(_dataDir: string): string {
  return larIdentityDir();
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

export interface VesselIdentity {
  /** Hex-encoded 32-byte Ed25519 verifying key. */
  verifyingKey: string;
  /** Display name from git config user.name. Enriches IdentityTiddler only. */
  displayName?: string;
}

function keyFileName(login: string | null): string {
  return login ? `.vessel-key-${login}.json` : ".vessel-key.json";
}

// ── Platform seams for the shared keypair lifecycle (vessel-identity-core) ────
// node mints via the local CSPRNG (generateKeyPairSync) and persists each keypair
// as a 0o600 JSON file in the wipe-zone-sibling identity dir, stamping the git
// email hint. The core (mesh) owns the generate-or-load control flow over these.

const nodeKeypairCrypto: KeypairCrypto = {
  async generate() {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pubJwk  = publicKey.export({ format: "jwk" })  as { x: string };
    const privJwk = privateKey.export({ format: "jwk" }) as { d: string };
    return {
      verifyingKey: Buffer.from(pubJwk.x,  "base64url").toString("hex"),
      signingKey:   Buffer.from(privJwk.d, "base64url").toString("hex"),
    };
  },
};

/** A single 0o600 JSON keypair slot at `keyFile`; save() stamps the git-email hint. */
function fileKeypairStore(keyFile: string, login: string | null): KeypairStore {
  return {
    async load() {
      if (!existsSync(keyFile)) return undefined;
      const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
      return { verifyingKey: raw.verifyingKey, signingKey: raw.signingKey };
    },
    async save(kp) {
      const persisted: PersistedKey = {
        verifyingKey: kp.verifyingKey,
        signingKey:   kp.signingKey,
        ...(login ? { gitEmail: login } : {}),
      };
      writeFileSync(keyFile, JSON.stringify(persisted, null, 2), { mode: 0o600, encoding: "utf8" });
      chmodSync(keyFile, 0o600);
    },
  };
}

// ── KERI-style pre-rotation (the can't-retrofit root-rotation hook) ──────────
//
// At key GENERATION (the only window before the key ever signs), commit the DIGEST
// of the NEXT root key. A thief of the current key still cannot rotate the identifier,
// because a rotation must reveal a pre-image hashing to this committed digest — which
// the thief never saw. Pre-rotation CANNOT be retrofitted: a key that has already
// signed has no valid inception window.
//
// MINIMAL hook: the load-bearing part is the
// commit-the-next-key-digest-BEFORE-first-use ordering, captured here. The full KERI
// KEL / CESR / SAID encoding + the `lares rotate-root` ceremony land later (the
// `digestAlgo` field keeps the digest swappable to blake3-256 SAID at KERI-interop).
//
// CUSTODY CAVEAT: this minimal hook persists the next-root private seed on the SAME
// disk (0o600, in `<state>/identity`). Full pre-rotation (a thief of the CURRENT key
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

  const { verifyingKey, created } = await generateOrLoadKeypair(
    fileKeypairStore(keyFile, hint.login),
    nodeKeypairCrypto,
  );

  if (!created) {
    console.log(`[vessel-identity] loaded keypair${hint.login ? ` for ${hint.login}` : ""}`);
    // No-retrofit guard: a key minted before pre-rotation has no valid inception window —
    // NEVER fake one (it has already signed; the thief-can't-rotate guarantee is unrecoverable).
    if (!existsSync(join(idDir, kelFileName(hint.login)))) {
      console.log(`[vessel-identity] key predates pre-rotation — non-pre-rotating (not retrofitted)`);
    }
  } else {
    console.log(`[vessel-identity] generated new Ed25519 keypair${hint.login ? ` for ${hint.login}` : ""}`);

    // Pre-rotation: commit the next-root key's digest NOW — before this key ever signs
    // (first use is `keyhive.init`, downstream of founding). The only valid window; cannot
    // be retrofitted. Minimal commitment; full KERI KEL/ceremony later (see kelFileName note).
    // Runs strictly AFTER the keypair reached disk (the core persists before returning).
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
  return signingSeedFromHex(raw.signingKey);
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
// public DID + a signed edge, NEVER the root seed (two roots for ONE persona = two
// operators; but N roots for N DISTINCT personas = one human's multitude, see below).
//
// Custody law (same as the vessel key): persists into `<state>/identity`, mode 0o600,
// structurally outside any `reset`/`rebuild` wipe. A root seed inside the `<data>/vessel`
// store would mean operator-identity loss on `lares reset` — the same keypair-wipe
// lesson, now for the operator-root capability.
//
// PLURALITY PONO at the identity layer: a human contains multitudes, so a vessel may HOLD
// a SET of persona-roots — one per persona the operator wears — keyed by handle-index (the
// `handle'` the persona-HD scheme derives, persona-identity m/handle'/context'). Each index
// names a DISTINCT quorum-identity: its own root, its own device-delegation edge, its own
// recovery split. Custody-by-TYPE survives untouched — EACH root is the vessel's OWN
// sovereign secret (nodeKeypairCrypto.generate, never a held/citizen principal's), so N
// roots make a wider self-surface, never a custodial honeypot. Index 0 = the FOUNDING
// persona: every path spells byte-identically to a one-persona vessel (back-compat). The
// SET is founder-side (a joinee wears its ONE admitted persona through the edge, holds no
// root); whether the a-multitude-of-one quorum wants N personas on ONE disk or N distinct
// vessels is a live custody fork surfaced to the operator, NOT resolved here — this storage
// generalization stands regardless of that resolution.
//
// Pre-rotation for the root is a follow-on (same register as the vessel KERI hook
// above): the root is the MORE pin-worthy identity, so its inception commitment +
// offline next-seed custody upgrade lands with the full `lares rotate-root` ceremony.

/**
 * Validate a persona handle-index — the `handle'` the persona-HD scheme derives. Index 0 = the founding
 * persona (back-compat). The bound mirrors the SLIP-0010 hardened-index ceiling (< 0x80000000), the same
 * space persona-identity allocates handles in, so the storage layer never keys outside the derivation's range.
 */
function assertHandleIndex(handleIndex: number): void {
  if (!Number.isSafeInteger(handleIndex) || handleIndex < 0 || handleIndex >= 0x80000000) {
    throw new RangeError(
      `[vessel-identity] persona handle-index out of range: ${handleIndex} (expected 0 ≤ n < 0x80000000)`,
    );
  }
}

/** The per-persona filename suffix — EMPTY at the founding persona (index 0) so a one-persona vessel's
 *  files spell byte-identically to today; `-h${N}` names each additional persona-root the vessel holds. */
function personaSuffix(handleIndex: number): string {
  return handleIndex === 0 ? "" : `-h${handleIndex}`;
}

function personaGroupRootFileName(login: string | null, handleIndex = 0): string {
  const suffix = personaSuffix(handleIndex);
  return login ? `.persona-group-root-${login}${suffix}.json` : `.persona-group-root${suffix}.json`;
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
 *
 * `handleIndex` selects WHICH persona-root — 0 (default) = the founding persona (back-compat: the file
 * spells exactly as a one-persona vessel's). A higher index mints an ADDITIONAL, DISTINCT quorum-identity
 * for the same operator's multitude; each carries its own edge + recovery split. Every root is the vessel's
 * OWN sovereign secret regardless of index — the SET never becomes a custodial honeypot.
 */
export async function generateOrLoadPersonaGroupRoot(
  dataDir: string,
  handleIndex = 0,
): Promise<PersonaGroupRoot> {
  assertHandleIndex(handleIndex);
  const idDir = identityDir(dataDir);
  mkdirSync(idDir, { recursive: true });

  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const rootFile = join(idDir, personaGroupRootFileName(hint.login, handleIndex));
  const store    = fileKeypairStore(rootFile, hint.login);
  const tag      = `${hint.login ? ` for ${hint.login}` : ""}${handleIndex === 0 ? "" : ` (persona h${handleIndex})`}`;

  // The root rides the same generate-or-load skeleton + seams as the device key —
  // with the root's stricter load-time verifyingKey guard kept (it is the more
  // pin-worthy identity) and FOUNDER-ONLY semantics carried by the caller.
  const existing = await store.load();
  if (existing) {
    if (existing.verifyingKey.length !== 64) {
      throw new Error(`[vessel-identity] malformed verifyingKey in ${rootFile}`);
    }
    console.log(`[vessel-identity] loaded PersonaGroup root${tag}`);
    return { verifyingKey: existing.verifyingKey, created: false };
  }

  const fresh = await nodeKeypairCrypto.generate();
  await store.save(fresh);
  console.log(`[vessel-identity] minted PersonaGroup root${tag}`);
  return { verifyingKey: fresh.verifyingKey, created: true };
}

/**
 * Load the PersonaGroup-root 32-byte Ed25519 SIGNING seed (founder-only).
 *
 * The founding ceremony signs device-delegation edges with this seed. SECURITY: the
 * returned bytes ARE the operator-root private key — the most sensitive secret on the
 * vessel (it authorizes PersonaGroup membership). Same handling rules as
 * `loadVesselSigningSeed`. Throws when absent — call `generateOrLoadPersonaGroupRoot`
 * first (founding only; a joinee never holds this).
 *
 * `handleIndex` selects the persona-root within the vessel's SET (0 = founding, back-compat).
 */
export async function loadPersonaGroupRootSeed(dataDir: string, handleIndex = 0): Promise<Uint8Array> {
  assertHandleIndex(handleIndex);
  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const rootFile = join(identityDir(dataDir), personaGroupRootFileName(hint.login, handleIndex));
  if (!existsSync(rootFile)) {
    throw new Error(
      `[vessel-identity] no PersonaGroup root at ${rootFile} — mint it via the founding ceremony first (founder-only; a joining vessel never holds the root seed)`,
    );
  }
  const raw = JSON.parse(readFileSync(rootFile, "utf8")) as PersistedKey;
  if (typeof raw.signingKey !== "string" || raw.signingKey.length !== 64) {
    throw new Error(`[vessel-identity] malformed signingKey in ${rootFile}`);
  }
  return signingSeedFromHex(raw.signingKey);
}

// ── The active-persona selector — "put on a mask" at the identity layer ──────────
//
// A human contains multitudes; a vessel WEARS one persona at a time (signs/acts as it) and MAY switch.
// The selector persists in the identity home OUTSIDE the wipe (beside the roots it points at), so a
// `reset`/`rebuild` reforges the substrate while the worn persona survives. Default = 0 (the founding
// persona): a one-persona vessel — and every joinee, which holds only its admitted persona — reads 0
// with no selector file present, byte-identical to a vessel that never heard of multi-persona. The
// selector moves a POINTER; it never moves a root (custody stays put).
function activePersonaFileName(login: string | null): string {
  return login ? `.active-persona-${login}.json` : ".active-persona.json";
}

interface ActivePersonaSelector {
  /** The handle-index of the persona this vessel currently wears. */
  handleIndex: number;
}

/**
 * True when this vessel HOLDS a persona-root at `handleIndex` (founder-side custody). A joinee holds
 * none — it wears its admitted persona (index 0) through the anchors/edge, not a root.
 */
export async function personaRootExists(dataDir: string, handleIndex: number): Promise<boolean> {
  assertHandleIndex(handleIndex);
  const hint = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  return existsSync(join(identityDir(dataDir), personaGroupRootFileName(hint.login, handleIndex)));
}

/**
 * Load the active-persona handle-index — which persona the vessel currently WEARS. Default 0 (the
 * founding persona) when no selector has landed OR a torn one reads back: never strand the vessel
 * personaless. A one-persona vessel behaves exactly as today.
 */
export async function loadActivePersonaIndex(dataDir: string): Promise<number> {
  const hint = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const file = join(identityDir(dataDir), activePersonaFileName(hint.login));
  if (!existsSync(file)) return 0;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<ActivePersonaSelector>;
    if (Number.isSafeInteger(raw.handleIndex) && (raw.handleIndex as number) >= 0) {
      return raw.handleIndex as number;
    }
  } catch { /* a torn selector falls back to the founding default — the vessel never loses its face */ }
  return 0;
}

/**
 * WEAR a persona — set the active handle-index (persist 0o600 in the identity home). "Put on a mask."
 * Index 0 (the founding persona) is ALWAYS wearable (a joinee wears it through its edge). A higher index
 * REQUIRES that this vessel HOLD that persona-root — you cannot sign AS a persona whose sovereign secret
 * you do not carry (the custody-by-type wall, in mask form). Only the pointer moves; the root never does.
 */
export async function wearPersona(dataDir: string, handleIndex: number): Promise<void> {
  assertHandleIndex(handleIndex);
  if (handleIndex !== 0 && !(await personaRootExists(dataDir, handleIndex))) {
    throw new Error(
      `[vessel-identity] cannot wear persona h${handleIndex} — no persona-root held for it; ` +
      `mint it via the founding ceremony (founder-side) first`,
    );
  }
  const idDir = identityDir(dataDir);
  mkdirSync(idDir, { recursive: true });
  const hint = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const file = join(idDir, activePersonaFileName(hint.login));
  const selector: ActivePersonaSelector = { handleIndex };
  writeFileSync(file, JSON.stringify(selector, null, 2), { mode: 0o600, encoding: "utf8" });
  chmodSync(file, 0o600);
  console.log(`[vessel-identity] wearing persona h${handleIndex}${hint.login ? ` for ${hint.login}` : ""}`);
}

/**
 * The persona ROSTER — every handle-index this vessel HOLDS a root for, ascending. A one-persona vessel
 * returns `[0]`; a multitude-of-one returns `[0, 1, …]`. Enumerated from the identity home by the
 * persona-root filename convention — the disk IS the roster (no registry).
 */
export async function listPersonaRoots(dataDir: string): Promise<number[]> {
  const hint  = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const idDir = identityDir(dataDir);
  if (!existsSync(idDir)) return [];
  const base0 = personaGroupRootFileName(hint.login, 0);          // the founding-persona spelling
  const stem  = base0.slice(0, -".json".length);                 // …-h${N}.json hangs off this exact stem
  const extra = new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-h(\\d+)\\.json$`);
  const found = new Set<number>();
  for (const f of readdirSync(idDir)) {
    if (f === base0) { found.add(0); continue; }
    const m = extra.exec(f);
    if (m) found.add(Number(m[1]));
  }
  return [...found].sort((a, b) => a - b);
}
