/**
 * node-vessel-identity — device Ed25519 keypair lifecycle.
 *
 * Local-first identity root (Brooklyn Zelenka / UCAN / Keyhive alignment):
 *   - keypair is generated device-local, persists to disk with mode 0o600
 *   - verifyingKey (hex 32 bytes) feeds did:key derivation
 *   - did:key derivation happens in the TW5 VM (cold-boot-ceremony module)
 *   - displayName derives from `git config user.name` — local truth, no network call
 *
 * The TRUE NAME MODEL — three parts that bind without merging (#has-stack ontology: a
 * nameless entity carries a stack of capabilities, never a numbered plane):
 *   · the VESSEL key — THIS file's keypair — belongs to the PLACE. Founding mints it
 *     per-install off the local CSPRNG; it NEVER travels to another vessel. It names a
 *     *somewhere*, and it signs only AS ITSELF.
 *   · the PERSONA ROOT — the PersonaGroup root, custodied further down this file — belongs
 *     to the HUMAN. A DISTINCT key in its own slot: never derived from the vessel seed,
 *     never the same bytes, never copied outward.
 *   · the DELEGATION EDGE binds the two without collapsing them. The persona root signs
 *     "Operator O delegates to Device D AT PLACE P" (mesh/device-delegation, v2), and
 *     `hearthTrueName` carries P — the hearth's True Name. The edge IS the relationship;
 *     the vessel's stack #has it.
 *
 * Why the split carries weight: one key copied across a user's vessels presents the SAME
 * collector to every verifier, so a single bit links every self. Holding vessel apart from
 * persona is what makes the veil → PersonaGroup → Handle architecture implementable at all.
 * See lar:///ha.ka.ba/lares/docs/federation and api/pono/has-stack-ontology.
 *
 * Storage law — identity lives OUTSIDE the wipe zone:
 *   the keypair + card persist to `<lares>/identity` (`larIdentityDir`), in the XDG data
 *   home BESIDE — never inside — the wiped `<lares>/vessel`. No `reset`/`regenesis`/`rebuild`
 *   can reach it (they rmSync the substrate store, never the home that holds it). This realizes the
 *   law below (the key MUST NOT sit inside an Automerge doc storage path) and the
 *   keypair-wipe lesson: a destructive storage verb cannot reach identity.
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
import { join } from "node:path";
import { larIdentityDir } from "./vessel-paths.js";
import {
  generateOrLoadKeypair,
  signingSeedFromHex,
  generateOrLoadPersonaRoot,
  loadPersonaRootSeed,
  loadPersonaRootVerifyingKey,
  wearPersona as coreWearPersona,
  loadActivePersona as coreLoadActivePersona,
  personaRootExists as corePersonaRootExists,
  listPersonaRoots as coreListPersonaRoots,
  type KeypairStore,
  type KeypairCrypto,
  type PersonaVault,
  type ActivePersonaStore,
  type PersonaRoot,
  type OwnPersonaPetnameStore,
  type PersonaDeclaration,
  type PersonaDeclarationStore,
  type OwnPublicHandleStore,
  type PersonaPublicHandleRecord,
} from "@lararium/mesh";
import { nodeAnchorStore } from "./identity-anchors.js";
import { nodeRecoveryShareStore } from "./recovery-share-store.js";

/**
 * The identity dir — the ONE resolver, `<lares>/identity` (`larIdentityDir`), in the XDG
 * state home OUTSIDE any substrate wipe. `reset`/`regenesis`/`rebuild` reforge the
 * `<lares>/vessel` store; the key + card + anchors survive here, unreachable by any storage
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

// ── Platform shores for the shared keypair lifecycle (vessel-identity-core) ────
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
// disk (0o600, in `<lares>/identity`). Full pre-rotation (a thief of the CURRENT key
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
      `[vessel-identity] no key file at ${keyFile} — run \`lares vessel found\` first to generate the keypair`,
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
 * must run `lares vessel found` (which mints + persists it during the founding ceremony).
 */
export async function loadVesselCard(dataDir: string): Promise<string> {
  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const cardFile = join(identityDir(dataDir), cardFileName(hint.login));
  if (!existsSync(cardFile)) {
    throw new Error(
      `[vessel-identity] no ContactCard at ${cardFile} — run \`lares vessel found\` (it mints the card during the founding ceremony)`,
    );
  }
  return readFileSync(cardFile, "utf8");
}

export async function loadVesselSigningSeed(dataDir: string): Promise<Uint8Array> {
  const hint    = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const keyFile = join(identityDir(dataDir), keyFileName(hint.login));
  if (!existsSync(keyFile)) {
    throw new Error(
      `[vessel-identity] no key file at ${keyFile} — run \`lares vessel found\` first to generate the keypair`,
    );
  }
  const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
  if (typeof raw.signingKey !== "string" || raw.signingKey.length !== 64) {
    throw new Error(`[vessel-identity] malformed signingKey in ${keyFile}`);
  }
  return signingSeedFromHex(raw.signingKey);
}

// ── PersonaGroup root key custody — the FS-backed PersonaVault (over @lararium/mesh) ─────
//
// Two DISTINCT capabilities, never two numbered planes (#has-stack ontology — a nameless entity
// carries a stack of capabilities, not a layer index):
//   · the per-vessel device key above = the capability a vessel #has to sign AS ITSELF (its own leaf).
//   · the PersonaGroup root here        = the operator-root capability that SIGNS the device-delegation
//     edges granting vessels membership. Its public key is the operator-root DID (`0x`+hex) peers PIN
//     to verify those edges offline at the Binding Gate (no Beelay). A vessel joins the PersonaGroup by
//     holding a signed edge from this root — membership is a capability the stack #has, not a plane.
//
// The isomorphic control flow (generate/load/wear/custody-refuse/roster) lives in @lararium/mesh's
// persona-vault — platform-blind. THIS adapter supplies the node shores: per-index 0o600 KeypairStore
// slots in `<lares>/identity` (outside every `reset`/`rebuild` wipe), a JSON active-persona selector,
// the anchor store, and the sealed recovery-share store. The SEAL stays in this adapter — the core
// never sees plaintext seal policy (custody-by-TYPE: each root is the vessel's OWN sovereign secret).
//
// ROOT-ON-FOUNDER: `generateOrLoadPersonaGroupRoot` mints founder-side only; a joinee holds the
// founder's public DID + a signed edge at admit, so its vault reads listRoots()=[]. UNIFORM KEYING —
// every persona-root spells `-h${N}` (no founding special-case); the ROSTER is an EXPLICIT written
// record the slot's save maintains, never inferred from an empty home nor regex-scanned off the dir.
//
// Pre-rotation for the root is a follow-on (same register as the vessel KERI hook above): the root is
// the MORE pin-worthy identity, so its inception commitment + offline next-seed custody upgrade lands
// with the full `lares rotate-root` ceremony.

/** The persona-root keypair filename — uniform `-h${N}` per handle-index, login-scoped so developers on
 *  one machine hold separate roots. No founding special-case (uniform keying). */
function personaGroupRootFileName(login: string | null, handleIndex: number): string {
  return login ? `.persona-group-root-${login}-h${handleIndex}.json` : `.persona-group-root-h${handleIndex}.json`;
}

/** The active-persona selector filename — one pointer per vessel, login-scoped. */
function activePersonaFileName(login: string | null): string {
  return login ? `.active-persona-${login}.json` : ".active-persona.json";
}

/** The persona-root ROSTER filename — the EXPLICIT written record of every handle-index this vessel
 *  holds a root for. The founding persona becomes a record on its mint, never inferred. */
function personaRosterFileName(login: string | null): string {
  return login ? `.persona-roster-${login}.json` : ".persona-roster.json";
}

/** Read the roster's explicit record (ascending), or [] when none has landed / a torn one reads back. */
function readPersonaRoster(idDir: string, login: string | null): number[] {
  const file = join(idDir, personaRosterFileName(login));
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { roots?: unknown };
    if (Array.isArray(raw.roots)) {
      return [...new Set(raw.roots.filter((n): n is number => Number.isSafeInteger(n) && n >= 0))].sort((a, b) => a - b);
    }
  } catch { /* a torn roster reads empty — a re-mint re-records the index it holds */ }
  return [];
}

/** Record a held handle-index into the roster (0o600) — the founding persona's explicit written mark. */
function recordPersonaRoot(idDir: string, login: string | null, handleIndex: number): void {
  const roots = new Set(readPersonaRoster(idDir, login));
  roots.add(handleIndex);
  const file = join(idDir, personaRosterFileName(login));
  writeFileSync(file, JSON.stringify({ roots: [...roots].sort((a, b) => a - b) }, null, 2), { mode: 0o600, encoding: "utf8" });
  chmodSync(file, 0o600);
}

/** The node FS ActivePersonaStore — a JSON pointer at `<lares>/identity`, 0o600, outside the wipe. */
function nodeActivePersonaStore(idDir: string, login: string | null): ActivePersonaStore {
  const file = join(idDir, activePersonaFileName(login));
  return {
    async load() {
      if (!existsSync(file)) return undefined;   // no inference: an unset selector reads undefined
      try {
        const raw = JSON.parse(readFileSync(file, "utf8")) as { handleIndex?: unknown };
        if (Number.isSafeInteger(raw.handleIndex) && (raw.handleIndex as number) >= 0) return raw.handleIndex as number;
      } catch { /* a torn selector reads unset — the caller decides any default */ }
      return undefined;
    },
    async save(handleIndex) {
      mkdirSync(idDir, { recursive: true });
      writeFileSync(file, JSON.stringify({ handleIndex }, null, 2), { mode: 0o600, encoding: "utf8" });
      chmodSync(file, 0o600);
    },
  };
}

/**
 * Build the node FS-backed PersonaVault. Resolves the git-email hint ONCE (login-scoped filenames), then
 * closes over the identity dir + hint. `rootSlot(i)` vends the existing 0o600 KeypairStore, wrapping its
 * save to RECORD the index into the explicit roster (the founding mark). `hasRoot`/`listRoots` read that
 * roster — never a dir-scan. `anchors`/`recovery` ride the node stores where the at-rest SEAL lives.
 */
export async function makeNodeFsPersonaVault(): Promise<PersonaVault> {
  const hint  = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const idDir = larIdentityDir();
  mkdirSync(idDir, { recursive: true });
  const login = hint.login;
  return {
    rootSlot(handleIndex) {
      const file = join(idDir, personaGroupRootFileName(login, handleIndex));
      const base = fileKeypairStore(file, login);
      return {
        load: () => base.load(),
        async save(keypair) {
          await base.save(keypair);
          recordPersonaRoot(idDir, login, handleIndex);   // the mint writes the explicit roster mark
        },
      };
    },
    async listRoots() { return readPersonaRoster(idDir, login); },
    async hasRoot(handleIndex) { return readPersonaRoster(idDir, login).includes(handleIndex); },
    selector: nodeActivePersonaStore(idDir, login),
    anchors:  nodeAnchorStore,
    recovery: nodeRecoveryShareStore,
  };
}

/** A persona-root's public face + whether THIS call minted it (the mesh core's PersonaRoot). */
export type PersonaGroupRoot = PersonaRoot;

/**
 * Generate or load the PersonaGroup-root keypair at `handleIndex` (the operator-root delegation
 * capability). FOUNDER-ONLY — a joining vessel receives the founder's public DID + a signed delegation
 * edge at admit instead. Thin wrapper over the mesh core flow; `dataDir` rides the call-site contract
 * (the identity home resolves under XDG state, outside the substrate wipe).
 */
export async function generateOrLoadPersonaGroupRoot(_dataDir: string, handleIndex = 0): Promise<PersonaGroupRoot> {
  const vault  = await makeNodeFsPersonaVault();
  const result = await generateOrLoadPersonaRoot(vault, nodeKeypairCrypto, handleIndex);
  console.log(`[vessel-identity] ${result.created ? "minted" : "loaded"} PersonaGroup root (persona h${handleIndex})`);
  return result;
}

/**
 * Load the PersonaGroup-root 32-byte Ed25519 SIGNING seed at `handleIndex` (founder-only). SECURITY: the
 * returned bytes ARE the operator-root private key — the most sensitive secret on the vessel. Throws when
 * absent — mint via the founding ceremony first (a joinee never holds this).
 */
export async function loadPersonaGroupRootSeed(_dataDir: string, handleIndex = 0): Promise<Uint8Array> {
  return loadPersonaRootSeed(await makeNodeFsPersonaVault(), handleIndex);
}

/**
 * Read the PersonaGroup-root's PUBLIC verifying key at `handleIndex` — the HUMAN's face, distinct from
 * `loadVesselVerifyingKey` (the PLACE's face). Reads only; it never mints, so a caller that merely wants to
 * SHOW the persona root cannot stand one up by accident. Reads undefined when this vessel holds no root
 * there (a joinee pins the founder's DID + a signed edge instead of custodying a root).
 */
export async function loadPersonaGroupRootVerifyingKey(
  _dataDir: string,
  handleIndex = 0,
): Promise<string | undefined> {
  return loadPersonaRootVerifyingKey(await makeNodeFsPersonaVault(), handleIndex);
}

/** True when this vessel HOLDS a persona-root at `handleIndex` (founder-side custody). A joinee holds none. */
export async function personaRootExists(_dataDir: string, handleIndex: number): Promise<boolean> {
  return corePersonaRootExists(await makeNodeFsPersonaVault(), handleIndex);
}

/** Load the active-persona handle-index the vessel currently WEARS, or undefined when it wears none yet
 *  (no inference from an empty home — the caller decides any default). */
export async function loadActivePersonaIndex(_dataDir: string): Promise<number | undefined> {
  return coreLoadActivePersona(await makeNodeFsPersonaVault());
}

/** WEAR a persona — set the active handle-index ("put on a mask"). The custody-by-TYPE wall (uniform,
 *  no founding special-case): wearing REQUIRES that this vessel HOLD that persona-root. */
export async function wearPersona(_dataDir: string, handleIndex: number): Promise<void> {
  await coreWearPersona(await makeNodeFsPersonaVault(), handleIndex);
  console.log(`[vessel-identity] wearing persona h${handleIndex}`);
}

/** The persona ROSTER — every handle-index this vessel HOLDS a root for, ascending, from the explicit
 *  written record. A one-persona vessel returns `[0]`; a joinee returns `[]`. */
export async function listPersonaRoots(_dataDir: string): Promise<number[]> {
  return coreListPersonaRoots(await makeNodeFsPersonaVault());
}

// ── The two-layer PET-NAME stores — the own-side private label + the own-side public face ────────────
//
// Two DISTINCT node fs stores over `<lares>/identity` (0o600, outside every substrate wipe), login-scoped
// like the vault's slots so developers on one machine keep separate identity homes:
//   · the PRIVATE pet-name map (`.persona-petnames-${login}.json`) — the human's own label for their own
//     personas, freely renamable, never PUBLICLY federated (persona-petname). A future device-fleet adapter
//     wraps this same shape over a private bag so the label rides the human's own vessels; the local file
//     stands as the local-first floor beneath that sync.
//   · the PUBLIC handle record (`.persona-public-handles-${login}.json`) — the vessel's memory of ITS OWN
//     published glamour faces (index → nym/glamour/version/cardId), so a re-publish advances the monotone
//     card lineage (persona-glamour). Distinct from the pet-name map and from the handle-book (others' nyms).

/** The private pet-name map filename — login-scoped. */
function personaPetnameFileName(login: string | null): string {
  return login ? `.persona-petnames-${login}.json` : ".persona-petnames.json";
}

/** The public published-face record filename — login-scoped. */
function personaPublicHandleFileName(login: string | null): string {
  return login ? `.persona-public-handles-${login}.json` : ".persona-public-handles.json";
}

/** Read the `{handleIndex -> petname}` map from disk, or {} when none / a torn file reads back. */
function readPetnameMap(idDir: string, login: string | null): Record<string, string> {
  const file = join(idDir, personaPetnameFileName(login));
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { names?: unknown };
    if (raw.names && typeof raw.names === "object") return raw.names as Record<string, string>;
  } catch { /* a torn map reads empty — a re-name re-records the label it holds */ }
  return {};
}

/** Write the `{handleIndex -> petname}` map to disk (0o600) — the label stays inside the fleet, never public. */
function writePetnameMap(idDir: string, login: string | null, names: Record<string, string>): void {
  mkdirSync(idDir, { recursive: true });
  const file = join(idDir, personaPetnameFileName(login));
  writeFileSync(file, JSON.stringify({ names }, null, 2), { mode: 0o600, encoding: "utf8" });
  try { chmodSync(file, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/**
 * Build the node fs OwnPersonaPetnameStore — the PRIVATE own-persona pet-name map. Login-scoped, 0o600, in
 * the identity home outside every wipe. The map holds only the human's own labels for their own personas;
 * nothing here reaches a board (the never-federates wall is structural — no board write exists in this shore).
 */
export async function makeNodePersonaPetnameStore(): Promise<OwnPersonaPetnameStore> {
  const hint  = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const idDir = larIdentityDir();
  const login = hint.login;
  return {
    async get(handleIndex) { return readPetnameMap(idDir, login)[String(handleIndex)]; },
    async set(handleIndex, petname) {
      const names = readPetnameMap(idDir, login);
      names[String(handleIndex)] = petname;
      writePetnameMap(idDir, login, names);
    },
    async clear(handleIndex) {
      const names = readPetnameMap(idDir, login);
      delete names[String(handleIndex)];
      writePetnameMap(idDir, login, names);
    },
    async entries() {
      return Object.entries(readPetnameMap(idDir, login))
        .map(([k, v]) => [Number(k), v] as const)
        .filter(([k]) => Number.isSafeInteger(k) && k >= 0)
        .sort((a, b) => a[0] - b[0]);
    },
  };
}

// ── The DECLARATION store — what a persona declares outward, before any announce ─────────────────────
//
// The third own-side store (persona-declare): the Handle a persona answers to + whether it stands for a Kahu
// seat. It sits between the private pet-name and the published record so neither welds to the other — a
// declared Handle stays a private intent until an announce binds it (the binding law).

/** The declaration map filename — login-scoped, beside the pet-name map. */
function personaDeclarationFileName(login: string | null): string {
  return login ? `.persona-declarations-${login}.json` : ".persona-declarations.json";
}

/** Read the `{handleIndex -> declaration}` map from disk, or {} when none / a torn file reads back. */
function readDeclarationMap(idDir: string, login: string | null): Record<string, PersonaDeclaration> {
  const file = join(idDir, personaDeclarationFileName(login));
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { declarations?: unknown };
    if (raw.declarations && typeof raw.declarations === "object") {
      return raw.declarations as Record<string, PersonaDeclaration>;
    }
  } catch { /* a torn map reads empty — a re-declare re-records what the human meant to wear */ }
  return {};
}

/** Write the `{handleIndex -> declaration}` map to disk (0o600) — an intent, never a published fact. */
function writeDeclarationMap(idDir: string, login: string | null, declarations: Record<string, PersonaDeclaration>): void {
  mkdirSync(idDir, { recursive: true });
  const file = join(idDir, personaDeclarationFileName(login));
  writeFileSync(file, JSON.stringify({ declarations }, null, 2), { mode: 0o600, encoding: "utf8" });
  try { chmodSync(file, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/**
 * Build the node fs PersonaDeclarationStore — what each persona declares outward. Login-scoped, 0o600, in the
 * identity home beside the pet-name map. Nothing here reaches a board: a declaration says what the human
 * MEANS to wear, and only an announce (persona-glamour) binds a persona to a public glamour.
 */
export async function makeNodePersonaDeclarationStore(): Promise<PersonaDeclarationStore> {
  const hint  = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const idDir = larIdentityDir();
  const login = hint.login;
  return {
    async get(handleIndex) { return readDeclarationMap(idDir, login)[String(handleIndex)]; },
    async set(handleIndex, declaration) {
      const all = readDeclarationMap(idDir, login);
      all[String(handleIndex)] = declaration;
      writeDeclarationMap(idDir, login, all);
    },
    async clear(handleIndex) {
      const all = readDeclarationMap(idDir, login);
      delete all[String(handleIndex)];
      writeDeclarationMap(idDir, login, all);
    },
    async entries() {
      return Object.entries(readDeclarationMap(idDir, login))
        .map(([k, v]) => [Number(k), v] as const)
        .filter(([k]) => Number.isSafeInteger(k) && k >= 0)
        .sort((a, b) => a[0] - b[0]);
    },
  };
}

/** Read the `{handleIndex -> record}` public-face map from disk, or {} when none / a torn file reads back. */
function readPublicHandleMap(idDir: string, login: string | null): Record<string, PersonaPublicHandleRecord> {
  const file = join(idDir, personaPublicHandleFileName(login));
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { handles?: unknown };
    if (raw.handles && typeof raw.handles === "object") return raw.handles as Record<string, PersonaPublicHandleRecord>;
  } catch { /* a torn record reads empty — a re-publish re-records the face it holds */ }
  return {};
}

/**
 * Build the node fs OwnPublicHandleStore — the vessel's memory of ITS OWN published glamour faces. Login-
 * scoped, 0o600. Records carry ONLY public data (the veiled nym, the display glamour, the card lineage), so
 * no seal touches them — but they stay in the identity home so a re-publish keeps advancing the lineage a
 * peer's HandleBook holds to.
 */
export async function makeNodePublicHandleStore(): Promise<OwnPublicHandleStore> {
  const hint  = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const idDir = larIdentityDir();
  const login = hint.login;
  const file  = join(idDir, personaPublicHandleFileName(login));
  return {
    async load(handleIndex) { return readPublicHandleMap(idDir, login)[String(handleIndex)] ?? null; },
    async save(record) {
      mkdirSync(idDir, { recursive: true });
      const handles = readPublicHandleMap(idDir, login);
      handles[String(record.handleIndex)] = record;
      writeFileSync(file, JSON.stringify({ handles }, null, 2), { mode: 0o600, encoding: "utf8" });
      try { chmodSync(file, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
    },
    async list() {
      return Object.keys(readPublicHandleMap(idDir, login))
        .map(Number)
        .filter((k) => Number.isSafeInteger(k) && k >= 0)
        .sort((a, b) => a - b);
    },
  };
}
