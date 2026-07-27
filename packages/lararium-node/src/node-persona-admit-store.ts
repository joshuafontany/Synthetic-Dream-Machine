/**
 * node-persona-admit-store — the node-fs PER-VESSEL multitude-view + the airgapped ceremony's pending state.
 *
 * THE LOAD-BEARING INVARIANT: the admitted-persona list is PER-VESSEL and NEVER fleet-syncs / federates. A
 * synced "all my faces" record would be almost a global-now-of-the-self, and a captured vessel must spill only
 * the faces actually admitted TO IT. So this rides a LOCAL 0o600 JSON file under the identity home — never an
 * Automerge bag, never a board. The never-syncs wall is STRUCTURAL: no bag/relay/board write exists in this
 * shore, exactly as the circle-follow graph + the handle-book beside it. Separation is composed by WHERE a key is
 * admitted, never dissolved by a convenience sync.
 *
 * TWO surfaces:
 *   · the MULTITUDE-VIEW — the mutually-signed `JoinRecord`s admitted to THIS vessel, keyed by persona prefix
 *     (a re-admission at a higher expiry supersedes; the newest verified join stands). BOTH the granting vessel
 *     (A) and the target vessel (B) record their matching copy — dual-admission, each into its own local view.
 *   · the PENDING state — the airgapped 3-hop runs as SEPARATE CLI invocations, so the on-device SECRET between
 *     hops persists here, 0o600, consume-ONCE: B's enrollment ephemeral secret (offer→open) and A's sent grant
 *     memo (grant→accept). The ephemeral X25519 secret NEVER leaves the device and is dropped the instant it is
 *     consumed (a completed or abandoned enrollment leaves no standing secret).
 *
 * TRACK-CONTRACTS-NEVER-IDENTITIES: a JoinRecord holds prefixes + key-material + nonces only — no name, no email,
 * no device inventory. A user leaves no roster trace anywhere but its OWN vessel's local view.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/persona-admit-store
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { hex, hexToBytes, type JoinRecord, type EnrollmentSecret, type SentGrantMemo } from "@lararium/mesh";
import { larIdentityDir } from "./vessel-paths.js";

/** The per-vessel multitude-view file — the personas admitted to THIS vessel (0o600, never federated). */
const ADMISSIONS_FILE = ".persona-admissions.json";
/** B's pending enrollment secrets, keyed by ephemeral pubkey (0o600, consume-once). */
const PENDING_ENROLL_FILE = ".persona-enroll-pending.json";
/** A's pending sent-grant memos, keyed by nonce_A (0o600, consume-once). */
const PENDING_GRANT_FILE = ".persona-grant-pending.json";

function idDirOf(dir?: string): string { return dir ?? larIdentityDir(); }

function readJson<T>(dir: string, file: string, fallback: T): T {
  const path = join(dir, file);
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, "utf8")) as T; }
  catch { return fallback; }   // a torn file reads empty — the airgapped hop is simply re-run
}

function writeJson(dir: string, file: string, value: unknown): void {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, file);
  writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600, encoding: "utf8" });
  try { chmodSync(path, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

// ── The multitude-view (never fleet-syncs) ──────────────────────────────────────────────────────────────────

/** The vessel's local admitted-persona view: `personaPrefix -> the newest verified JoinRecord`. */
type AdmissionsFile = { readonly admissions?: Record<string, JoinRecord> };

/**
 * Record a mutually-signed JoinRecord into THIS vessel's local multitude-view. Keyed by persona prefix; a
 * re-admission with a LATER expiry supersedes the standing one (the freshest join stands), an older one is
 * ignored. A pure LOCAL write — no bag, no board, no wire. Both A (on ACK-accept) and B (on grant-open) call it.
 */
export function recordAdmittedPersona(join: JoinRecord, dir?: string): void {
  const d = idDirOf(dir);
  const cur = readJson<AdmissionsFile>(d, ADMISSIONS_FILE, {}).admissions ?? {};
  const prior = cur[join.personaRef.prefix];
  if (prior && prior.expiry >= join.expiry) return;   // a stale re-admission never rolls the view back
  writeJson(d, ADMISSIONS_FILE, { admissions: { ...cur, [join.personaRef.prefix]: join } });
}

/** Every persona admitted to THIS vessel, by prefix (the private multitude-view; read-only). */
export function listAdmittedPersonas(dir?: string): JoinRecord[] {
  const admissions = readJson<AdmissionsFile>(idDirOf(dir), ADMISSIONS_FILE, {}).admissions ?? {};
  return Object.values(admissions).sort((a, b) => a.personaRef.prefix.localeCompare(b.personaRef.prefix));
}

/** Is a persona (by prefix) admitted to THIS vessel? A pure local read. */
export function isPersonaAdmitted(prefix: string, dir?: string): boolean {
  const admissions = readJson<AdmissionsFile>(idDirOf(dir), ADMISSIONS_FILE, {}).admissions ?? {};
  return prefix in admissions;
}

// ── The airgapped pending state (consume-once secrets) ──────────────────────────────────────────────────────

/** An EnrollmentSecret with its ephemeral X25519 secret hex-encoded for at-rest JSON (decoded on take). */
type StashedEnroll = { ephemeralSecretHex: string; targetVesselId: string; nonceB: string; expiry: number };
type EnrollFile = { readonly pending?: Record<string, StashedEnroll> };

/** Stash B's on-device enrollment secret between `offer` and `open` (0o600), keyed by the ephemeral pubkey. */
export function stashEnrollmentSecret(ephemeralPubkey: string, secret: EnrollmentSecret, dir?: string): void {
  const d = idDirOf(dir);
  const cur = readJson<EnrollFile>(d, PENDING_ENROLL_FILE, {}).pending ?? {};
  const stashed: StashedEnroll = {
    ephemeralSecretHex: hex(secret.ephemeralSecret),
    targetVesselId: secret.targetVesselId, nonceB: secret.nonceB, expiry: secret.expiry,
  };
  writeJson(d, PENDING_ENROLL_FILE, { pending: { ...cur, [ephemeralPubkey]: stashed } });
}

/**
 * Take (consume-ONCE) B's stashed enrollment secret for an ephemeral pubkey — returns it and DROPS it from the
 * pending set, so a secret never lingers past the one open it enables. Null when absent (the hop is re-run).
 */
export function takeEnrollmentSecret(ephemeralPubkey: string, dir?: string): EnrollmentSecret | null {
  const d = idDirOf(dir);
  const cur = readJson<EnrollFile>(d, PENDING_ENROLL_FILE, {}).pending ?? {};
  const s = cur[ephemeralPubkey];
  if (!s) return null;
  const { [ephemeralPubkey]: _dropped, ...rest } = cur;
  writeJson(d, PENDING_ENROLL_FILE, { pending: rest });   // consume: the secret is gone after one take
  return { ephemeralSecret: hexToBytes(s.ephemeralSecretHex), targetVesselId: s.targetVesselId, nonceB: s.nonceB, expiry: s.expiry };
}

/** PEEK (non-consuming) every stashed enrollment secret — B's `open` tries each against a grant (it cannot know
 *  WHICH pending enrollment a grant answers until one decrypts), then consumes only the matching one. */
export function peekEnrollmentSecrets(dir?: string): Array<{ ephemeralPubkey: string; secret: EnrollmentSecret }> {
  const cur = readJson<EnrollFile>(idDirOf(dir), PENDING_ENROLL_FILE, {}).pending ?? {};
  return Object.entries(cur).map(([ephemeralPubkey, s]) => ({
    ephemeralPubkey,
    secret: { ephemeralSecret: hexToBytes(s.ephemeralSecretHex), targetVesselId: s.targetVesselId, nonceB: s.nonceB, expiry: s.expiry },
  }));
}

type GrantFile = { readonly pending?: Record<string, SentGrantMemo> };

/** Stash A's sent-grant memo between `grant` and `accept` (0o600), keyed by nonce_A (the grant's fresh id). */
export function stashSentMemo(memo: SentGrantMemo, dir?: string): void {
  const d = idDirOf(dir);
  const cur = readJson<GrantFile>(d, PENDING_GRANT_FILE, {}).pending ?? {};
  writeJson(d, PENDING_GRANT_FILE, { pending: { ...cur, [memo.transcript.nonceA]: memo } });
}

/** Take (consume-ONCE) A's sent memo for a nonce_A — returns it and DROPS it. Null when absent. */
export function takeSentMemo(nonceA: string, dir?: string): SentGrantMemo | null {
  const d = idDirOf(dir);
  const cur = readJson<GrantFile>(d, PENDING_GRANT_FILE, {}).pending ?? {};
  const memo = cur[nonceA];
  if (!memo) return null;
  const { [nonceA]: _dropped, ...rest } = cur;
  writeJson(d, PENDING_GRANT_FILE, { pending: rest });
  return memo;
}

/** Drop every pending secret/memo (a `persona admit reset` — abandon an in-flight enrollment). */
export function clearPersonaAdmitPending(dir?: string): void {
  const d = idDirOf(dir);
  for (const f of [PENDING_ENROLL_FILE, PENDING_GRANT_FILE]) {
    try { rmSync(join(d, f), { force: true }); } catch { /* already gone */ }
  }
}
