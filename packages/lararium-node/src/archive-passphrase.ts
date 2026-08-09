/**
 * archive-passphrase (node atom) — the passphrase-LIFECYCLE surface over the at-rest seal (G1, #60).
 *
 * `archive-seal` frames the crypto atoms (scrypt KEK, AES-256-GCM seal/unseal, the envelope). This file
 * adds NO new crypto — it composes those atoms into the operator's four lifecycle gestures over the two
 * secret carriers the vessel holds at rest:
 *   · keyhive-archive.bin        — the sovereign identity floor; the daemon RE-SEALS it every boot (M3).
 *   · recovery-device-share.bin  — the device recovery share; written ONCE at founding.
 *
 * TWO-CARRIER ATOMICITY (FORK-2, RATIFY — the collapse was blocked). The two carriers hold GENUINELY
 * INDEPENDENT write lifecycles: the archive re-seals on every boot (a frequent write the M3 path owns,
 * which does NOT hold the device-share in scope and writes even under the cleartext policy), while the
 * device-share writes only at founding. One shared envelope would force the frequent M3 writer to
 * unseal-and-rebundle a co-tenant secret it never holds — corrupting the device-share on any boot that
 * ran without it. So the carriers stay TWO files, and this surface holds them consistent through a
 * ratification discipline instead: PRE-VALIDATE every unseal, STAGE every temp, then RENAME in sequence.
 * A crash strictly BETWEEN the two renames is the only residual split-KEK window, which `archiveSealStatus`
 * DETECTS and `repairSplitKek` re-seals shut.
 *
 * THE PASSPHRASE NEVER PERSISTS. Every function DERIVES a KEK at the moment and DROPS the passphrase when
 * it returns; plaintext buffers zeroize the instant they are re-sealed. No function returns or logs key
 * material — a status read reports per-carrier STATE (absent/cleartext/sealed) and never the key.
 *
 * FAIL-CLOSED throughout: a wrong old passphrase throws at the GCM tag BEFORE any byte is written
 * (zero-write), an empty passphrase is refused, and a would-be silent overwrite on export is refused.
 */

import { readFileSync, existsSync, writeFileSync, renameSync, rmSync, openSync, fsyncSync, closeSync, chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { isSealedEnvelope, decodeEnvelope } from "@lararium/mesh";
import { scryptKek, sealBytes, unsealBytes, openArchiveBytes, ARCHIVE_PASSPHRASE_ENV } from "./archive-seal.js";
import { archivePath } from "./identity-anchors.js";
import { deviceSharePath } from "./recovery-share-store.js";
import { setSealExpected, sealExpected as readSealExpected, type LaresConfig } from "./lares-config.js";
import { probeSecretService, keychainKekAvailable } from "./secret-service-probe.js";

const SALT_LEN = 16;

/** The SOFT floor: a passphrase shorter than this WARNS but is never rejected (FORK-4, operator agency). */
export const PASSPHRASE_MIN_LENGTH = 12;

/**
 * A warning string when a passphrase reads weak, else null. SOFT floor only — the caller warns and
 * proceeds; the core NEVER hard-rejects on length (a determined operator owns their own risk).
 */
export function weakPassphraseWarning(passphrase: string): string | null {
  if (passphrase.length < PASSPHRASE_MIN_LENGTH) {
    return `passphrase is ${passphrase.length} chars — under the ${PASSPHRASE_MIN_LENGTH}-char floor; a short passphrase weakens the scrypt KEK against an offline guess`;
  }
  return null;
}

export type CarrierName = "archive" | "device-share";

interface Carrier {
  readonly name: CarrierName;
  readonly path: string;
}

/** The two at-rest secret carriers, in a FIXED order (the rename sequence the ratify flow commits in). */
function carriers(): readonly Carrier[] {
  return [
    { name: "archive",      path: archivePath() },
    { name: "device-share", path: deviceSharePath() },
  ];
}

export type CarrierState = "absent" | "cleartext" | "sealed";

export interface CarrierStatus {
  readonly state: CarrierState;
  /** The seal mode from the envelope header (passphrase/keychain) — only when sealed. */
  readonly mode?: "passphrase" | "keychain";
  /** When a probe passphrase is supplied: does THIS carrier open under it? (sealed carriers only). */
  readonly opensUnderProbe?: boolean;
}

export interface ArchiveSealStatus {
  readonly carriers: Record<CarrierName, CarrierStatus>;
  /** True when a probe was supplied and the sealed carriers DISAGREE on it — a split-KEK signal. */
  readonly split: boolean;
  /** The boot-gate marker (config hint) — sealing is expected. */
  readonly sealExpected: boolean;
  /** Is `LARES_ARCHIVE_PASSPHRASE` present in the environment? (presence only — never the value). */
  readonly passphraseEnvSet: boolean;
  /**
   * Why the keychain KEK leg reads dark or lit on THIS machine. Carried so an operator reads the reason
   * rather than guessing at a silence — a leg that never explains itself gets mistaken for a leg that
   * never ran.
   */
  readonly keychain: { readonly persistentStore: boolean; readonly reason: string; readonly kekAvailable: boolean };
}

/** Try unsealing raw carrier bytes under a passphrase; true on a clean GCM open, false on any failure. */
function opensUnder(bytes: Uint8Array, passphrase: string): boolean {
  try {
    const env = decodeEnvelope(bytes);
    unsealBytes(env, scryptKek(passphrase, env.salt));
    return true;
  } catch { return false; }
}

/** Seal plaintext under a FRESH-salt scrypt KEK (no IV/salt ever repeats — archive-seal law). */
function sealUnder(plaintext: Uint8Array, passphrase: string): Uint8Array {
  const salt = randomBytes(SALT_LEN);
  return sealBytes(plaintext, scryptKek(passphrase, salt), "passphrase", salt);
}

/**
 * The RATIFY commit: write EVERY temp (fsync'd) before renaming ANY, then rename in sequence. A failure
 * before the first rename leaves the on-disk carriers BYTE-IDENTICAL (zero-write); a crash strictly
 * between renames leaves a split-KEK the status/repair path closes. Callers MUST pre-validate all unseals
 * before calling this, so a wrong passphrase never reaches a temp write.
 */
function stageAndCommit(writes: readonly { path: string; bytes: Uint8Array }[]): void {
  const staged: string[] = [];
  try {
    for (const w of writes) {
      const tmp = `${w.path}.${process.pid}.vault-tmp`;
      writeFileSync(tmp, w.bytes);
      const fd = openSync(tmp, "r+");
      try { fsyncSync(fd); } finally { closeSync(fd); }   // flush payload BEFORE the rename exposes it
      staged.push(tmp);
    }
  } catch (err) {
    // Zero renames ran — remove every temp so the carriers stay exactly as they were.
    for (const t of staged) { try { rmSync(t, { force: true }); } catch { /* best-effort */ } }
    throw err;
  }
  for (let i = 0; i < writes.length; i++) {
    renameSync(staged[i]!, writes[i]!.path);            // atomic pointer swap, per carrier
    try { chmodSync(writes[i]!.path, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
  }
  // Persist the rename dirents (best-effort; the fs already lands them durably on platforms without dir-fsync).
  for (const w of writes) {
    try { const dfd = openSync(dirname(w.path), "r"); try { fsyncSync(dfd); } finally { closeSync(dfd); } }
    catch { /* platform without dir-fsync */ }
  }
}

/** Zero a plaintext buffer the instant it is no longer needed (narrow the in-memory secret window). */
function wipe(bytes: Uint8Array): void { bytes.fill(0); }

/**
 * Report the seal state of BOTH carriers — TRUTHFUL and key-free. Never derives, prints, or returns key
 * material. With `probe` supplied it additionally reports which sealed carriers OPEN under that passphrase
 * (the split-KEK detector); a split reads true when the sealed carriers disagree on the probe.
 */
export function archiveSealStatus(opts: { probe?: string; cfg?: LaresConfig } = {}): ArchiveSealStatus {
  const out = {} as Record<CarrierName, CarrierStatus>;
  const probeResults: boolean[] = [];
  for (const c of carriers()) {
    if (!existsSync(c.path)) { out[c.name] = { state: "absent" }; continue; }
    let bytes: Uint8Array;
    try { bytes = readFileSync(c.path); } catch { out[c.name] = { state: "absent" }; continue; }
    if (!isSealedEnvelope(bytes)) { out[c.name] = { state: "cleartext" }; continue; }
    const mode = decodeEnvelope(bytes).mode;
    if (opts.probe !== undefined) {
      const opens = opensUnder(bytes, opts.probe);
      probeResults.push(opens);
      out[c.name] = { state: "sealed", mode, opensUnderProbe: opens };
    } else {
      out[c.name] = { state: "sealed", mode };
    }
  }
  // Split-KEK: a probe opened SOME sealed carriers but not all — the carriers rode different KEKs.
  const split = probeResults.length > 1 && probeResults.some((v) => v) && probeResults.some((v) => !v);
  const probe = probeSecretService();
  return {
    carriers: out,
    split,
    sealExpected: readSealExpected(opts.cfg),
    passphraseEnvSet: Boolean(process.env[ARCHIVE_PASSPHRASE_ENV]),
    keychain: { persistentStore: probe.persistent, reason: probe.reason, kekAvailable: keychainKekAvailable() },
  };
}

export interface SealResult { readonly sealed: CarrierName[]; readonly skipped: CarrierName[]; }

/**
 * Seal every CLEARTEXT carrier under a fresh-salt KEK from `passphrase`, atomically (ratify). Already-sealed
 * carriers are skipped (idempotent); absent carriers are skipped. FAIL-CLOSED: an empty passphrase is
 * refused (never a zero-entropy KEK). Writes the boot-gate marker so a later boot without the passphrase
 * fails PRECISELY. Zero-write when nothing is cleartext.
 */
export function sealArchiveWithPassphrase(passphrase: string): SealResult {
  if (!passphrase) throw new Error("archive-passphrase: refusing to seal under an empty passphrase");
  const sealed: CarrierName[] = [];
  const skipped: CarrierName[] = [];
  const writes: { path: string; bytes: Uint8Array }[] = [];
  const plaintexts: Uint8Array[] = [];
  for (const c of carriers()) {
    if (!existsSync(c.path)) { skipped.push(c.name); continue; }
    const bytes = readFileSync(c.path);
    if (isSealedEnvelope(bytes)) { skipped.push(c.name); continue; }   // already sealed — idempotent
    writes.push({ path: c.path, bytes: sealUnder(bytes, passphrase) });
    plaintexts.push(bytes);
    sealed.push(c.name);
  }
  if (writes.length > 0) stageAndCommit(writes);
  for (const p of plaintexts) wipe(p);
  // Mark sealing in force whenever a carrier now reads sealed on disk (this call OR a prior one) — the
  // boot-gate must fire even if every carrier was already sealed and this call sealed nothing new.
  if (carriers().some((c) => existsSync(c.path) && isSealedEnvelope(readFileSync(c.path)))) {
    setSealExpected(true);
  }
  return { sealed, skipped };
}

export interface RotateResult { readonly rotated: CarrierName[]; }

/**
 * Rotate the passphrase: unseal every SEALED carrier under `oldPassphrase`, re-seal ALL present carriers
 * under `newPassphrase`, atomically (ratify). A wrong `oldPassphrase` throws at the GCM tag during
 * PRE-VALIDATION — before any temp is written — so a bad old passphrase leaves the carriers byte-identical
 * (zero-write). A cleartext carrier present alongside the sealed one is brought UNDER the new passphrase
 * in the same act (so all carriers converge on the new KEK). Refuses when nothing is sealed (use `seal`).
 */
export function rotateArchivePassphrase(oldPassphrase: string, newPassphrase: string): RotateResult {
  if (!newPassphrase) throw new Error("archive-passphrase: refusing to rotate to an empty passphrase");
  const present = carriers().filter((c) => existsSync(c.path));
  const sealedPresent = present.filter((c) => isSealedEnvelope(readFileSync(c.path)));
  if (sealedPresent.length === 0) {
    throw new Error("archive-passphrase: nothing is sealed — use `vault seal` to seal cleartext carriers first");
  }
  // PRE-VALIDATE every unseal under the OLD passphrase before touching disk. A wrong old passphrase
  // throws HERE (GCM tag), aborting with zero writes.
  const plans: { path: string; plaintext: Uint8Array; name: CarrierName }[] = [];
  for (const c of present) {
    const bytes = readFileSync(c.path);
    const plaintext = isSealedEnvelope(bytes)
      ? unsealBytes(decodeEnvelope(bytes), scryptKek(oldPassphrase, decodeEnvelope(bytes).salt))
      : bytes;   // a cleartext carrier carries its own plaintext
    plans.push({ path: c.path, plaintext, name: c.name });
  }
  // Stage the re-seals under the NEW passphrase, then commit in sequence.
  const writes = plans.map((p) => ({ path: p.path, bytes: sealUnder(p.plaintext, newPassphrase) }));
  stageAndCommit(writes);
  for (const p of plans) wipe(p.plaintext);
  setSealExpected(true);
  return { rotated: plans.map((p) => p.name) };
}

export interface ExportResult { readonly dest: string; readonly bytes: number; readonly mode: "passphrase"; }

/**
 * Export the keyhive archive as a passphrase-SEALED backup to an operator path — NEVER the raw cleartext.
 * The CURRENT archive is opened through the vessel's live policy (`LARES_ARCHIVE_PASSPHRASE` when sealed;
 * bare when cleartext); the backup is then ALWAYS re-sealed under `passphrase` (fresh salt) — so a
 * cleartext vessel still writes an ENCRYPTED backup. Refuses a silent overwrite (pass `force` to replace).
 * Atomic + 0600. The passphrase drops and the plaintext zeroizes on return.
 */
export function exportSealedArchive(passphrase: string, destPath: string, force = false): ExportResult {
  if (!passphrase) throw new Error("archive-passphrase: refusing to export under an empty passphrase");
  const src = archivePath();
  if (!existsSync(src)) throw new Error(`archive-passphrase: no keyhive archive at ${src} to export`);
  if (existsSync(destPath) && !force) {
    throw new Error(`archive-passphrase: ${destPath} exists — pass --force to overwrite (refusing a silent clobber)`);
  }
  // Open the current archive through the LIVE policy: a sealed archive needs LARES_ARCHIVE_PASSPHRASE
  // (openArchiveBytes throws PRECISELY when it is sealed but unconfigured); a cleartext archive passes through.
  const plaintext = openArchiveBytes(readFileSync(src));
  const sealed = sealUnder(plaintext, passphrase);
  wipe(plaintext);
  mkdirSync(dirname(destPath), { recursive: true });
  // atomicWriteFileSync-equivalent kept inline so the export shares the SAME temp→fsync→rename discipline
  // and lands 0600 in one act.
  stageAndCommit([{ path: destPath, bytes: sealed }]);
  return { dest: destPath, bytes: sealed.length, mode: "passphrase" };
}

export interface RepairResult { readonly repaired: CarrierName[]; readonly alreadyConsistent: CarrierName[]; }

/**
 * Repair a split-KEK: bring every sealed carrier UNDER `sealPassphrase`. A carrier that already opens under
 * `sealPassphrase` is left untouched (consistent); a carrier that opens only under `openPassphrase` (the
 * lagging one a crashed rotate left behind) is re-sealed under `sealPassphrase`, atomically. A carrier that
 * opens under NEITHER is a hard error (nothing here can recover it). Fail-closed, zero-write on any failure
 * before the commit.
 */
export function repairSplitKek(openPassphrase: string, sealPassphrase: string): RepairResult {
  if (!sealPassphrase) throw new Error("archive-passphrase: refusing to repair to an empty passphrase");
  const repaired: CarrierName[] = [];
  const alreadyConsistent: CarrierName[] = [];
  const writes: { path: string; bytes: Uint8Array }[] = [];
  const plaintexts: Uint8Array[] = [];
  for (const c of carriers()) {
    if (!existsSync(c.path)) continue;
    const bytes = readFileSync(c.path);
    if (!isSealedEnvelope(bytes)) continue;   // cleartext carriers are not part of a KEK split
    if (opensUnder(bytes, sealPassphrase)) { alreadyConsistent.push(c.name); continue; }
    if (!opensUnder(bytes, openPassphrase)) {
      throw new Error(`archive-passphrase: carrier "${c.name}" opens under NEITHER passphrase — cannot repair (recover it from a backup)`);
    }
    const env = decodeEnvelope(bytes);
    const plaintext = unsealBytes(env, scryptKek(openPassphrase, env.salt));
    writes.push({ path: c.path, bytes: sealUnder(plaintext, sealPassphrase) });
    plaintexts.push(plaintext);
    repaired.push(c.name);
  }
  if (writes.length > 0) stageAndCommit(writes);
  for (const p of plaintexts) wipe(p);
  if (repaired.length > 0) setSealExpected(true);
  return { repaired, alreadyConsistent };
}

/**
 * The BOOT-GATE (FORK-3/5). Called on the boot load path: when the config marks sealing expected but no
 * `LARES_ARCHIVE_PASSPHRASE` rides the environment, throw a PRECISE message that names the fix — instead
 * of the generic sealed-without-key throw that surfaces only once the reader hits the envelope. The marker
 * is a HINT (config), never a secret; this only reads presence of the env var, never its value.
 */
export function assertSealReady(cfg?: LaresConfig, env: NodeJS.ProcessEnv = process.env): void {
  if (readSealExpected(cfg) && !env[ARCHIVE_PASSPHRASE_ENV]) {
    throw new Error(
      `[lararium] your archive is sealed — set ${ARCHIVE_PASSPHRASE_ENV} to the passphrase that sealed it, then boot again`,
    );
  }
}

/**
 * The DAEMON vault handler — the node-side shore injected into the daemon behavior (the persistArchive
 * inversion, #60). It runs IN the daemon worker, so it does the carrier fs ops AND updates the worker's
 * OWN in-memory seal policy: after a successful seal/rotate/repair it sets `process.env[ARCHIVE_PASSPHRASE_ENV]`
 * to the passphrase now in force, so any subsequent in-session seal (the M3 archive floor) rides the NEW
 * passphrase — never the old. That closes the un-rotate window: the carriers re-seal atomically AND the
 * policy the daemon would seal under next agrees with them. The passphrase rides the verb args over the
 * owner-only 0600 UDS — the SAME trust boundary as a CLI argument on the operator's own machine — and is
 * dropped after each op (it lives only in process.env, exactly as the launch environment already holds it;
 * it never reaches disk).
 */
export async function runVaultVerb(verb: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const str = (k: string): string => {
    const v = args[k];
    if (typeof v !== "string" || v.length === 0) throw new Error(`vault ${verb}: "${k}" (string) required`);
    return v;
  };
  switch (verb) {
    case "vault-status": {
      const probe = typeof args["probe"] === "string" ? (args["probe"] as string) : undefined;
      const status = archiveSealStatus(probe ? { probe } : {});
      return { verb, ...status };
    }
    case "vault-seal": {
      const passphrase = str("passphrase");
      const r = sealArchiveWithPassphrase(passphrase);
      process.env[ARCHIVE_PASSPHRASE_ENV] = passphrase;   // in-memory policy → next seal rides the new pass
      return { verb, ...r };
    }
    case "vault-rotate": {
      const oldPass = str("old");
      const newPass = str("new");
      const r = rotateArchivePassphrase(oldPass, newPass);
      process.env[ARCHIVE_PASSPHRASE_ENV] = newPass;      // no un-rotate: the policy moves with the carriers
      return { verb, ...r };
    }
    case "vault-export": {
      const passphrase = str("passphrase");
      const dest = str("dest");
      const force = args["force"] === true;
      const r = exportSealedArchive(passphrase, dest, force);
      return { verb, ...r };
    }
    case "vault-repair": {
      const openPass = str("openPass");
      const sealPass = str("sealPass");
      const r = repairSplitKek(openPass, sealPass);
      process.env[ARCHIVE_PASSPHRASE_ENV] = sealPass;
      return { verb, ...r };
    }
    default:
      throw new Error(`archive-passphrase: unknown vault verb "${verb}"`);
  }
}
