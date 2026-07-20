/**
 * archive-passphrase.test (#60) — the at-rest seal LIFECYCLE over the two secret carriers.
 *
 * Proves the fail-closed guarantees the passphrase surface stands on:
 *   · seal      → cleartext carriers become sealed envelopes; a later boot without the passphrase fails.
 *   · rotate    → both carriers open under the NEW passphrase and FAIL (GCM) under the old.
 *   · wrong old → ZERO writes: the on-disk bytes stay byte-identical to the pre-call state.
 *   · export    → a sealed backup re-opens to the IDENTICAL plaintext.
 *   · status    → truthful per-carrier state, including a SPLIT-KEK (and repair closes it).
 *   · daemon-up (runVaultVerb) and daemon-down (direct) land byte-identical carriers.
 *
 * The seal itself is proved in archive-seal.test; this proves the LIFECYCLE composed over it.
 */
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { isSealedEnvelope, decodeEnvelope } from "@lararium/mesh";
import { scryptKek, unsealBytes, ARCHIVE_PASSPHRASE_ENV } from "../src/archive-seal.js";
import { larIdentityDir } from "../src/vessel-paths.js";
import { archivePath } from "../src/identity-anchors.js";
import { deviceSharePath } from "../src/recovery-share-store.js";
import { sealExpected } from "../src/lares-config.js";
import {
  archiveSealStatus, sealArchiveWithPassphrase, rotateArchivePassphrase,
  exportSealedArchive, repairSplitKek, assertSealReady, runVaultVerb, weakPassphraseWarning,
} from "../src/archive-passphrase.js";

const saved: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  if (!(k in saved)) saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
}

const PASS_A = "correct horse battery staple";
const PASS_B = "a different long passphrase here";

const ARCHIVE_PLAIN  = Uint8Array.from([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 9, 10, 11, 12]);
const SHARE_PLAIN    = Uint8Array.from(Array.from({ length: 40 }, (_, i) => (i * 13 + 3) & 0xff));

/** Unseal a sealed carrier's bytes under a passphrase (mirrors the core's private opener). */
function opensUnder(bytes: Uint8Array, pass: string): boolean {
  try { const e = decodeEnvelope(bytes); unsealBytes(e, scryptKek(pass, e.salt)); return true; }
  catch { return false; }
}
function plainUnder(bytes: Uint8Array, pass: string): Uint8Array {
  const e = decodeEnvelope(bytes);
  return unsealBytes(e, scryptKek(pass, e.salt));
}

describe("archive-passphrase — the at-rest seal lifecycle", () => {
  let root: string;

  const writeCleartextCarriers = (opts: { share?: boolean } = {}): void => {
    mkdirSync(larIdentityDir(), { recursive: true });
    writeFileSync(archivePath(), Buffer.from(ARCHIVE_PLAIN));
    if (opts.share !== false) writeFileSync(deviceSharePath(), Buffer.from(SHARE_PLAIN));
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-vault-"));
    setEnv("LAR_ROOT", root);                       // isolates BOTH the identity carriers AND the config
    setEnv(ARCHIVE_PASSPHRASE_ENV, undefined);
    setEnv("LARES_ARCHIVE_PASSPHRASE_NEW", undefined);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    for (const k of Object.keys(saved)) delete saved[k];
    rmSync(root, { recursive: true, force: true });
  });

  test("seal → cleartext carriers become sealed; a boot without the passphrase fails PRECISELY", { timeout: 60_000 }, () => {
    writeCleartextCarriers();
    const r = sealArchiveWithPassphrase(PASS_A);
    expect(r.sealed.sort()).toEqual(["archive", "device-share"]);
    expect(isSealedEnvelope(readFileSync(archivePath()))).toBe(true);
    expect(isSealedEnvelope(readFileSync(deviceSharePath()))).toBe(true);
    // the boot-gate marker landed, so a boot with no passphrase throws a PRECISE message.
    expect(sealExpected()).toBe(true);
    expect(() => assertSealReady()).toThrow(new RegExp(ARCHIVE_PASSPHRASE_ENV));
    setEnv(ARCHIVE_PASSPHRASE_ENV, PASS_A);
    expect(() => assertSealReady()).not.toThrow();   // with the passphrase set, boot proceeds
    // the sealed archive really carries the original plaintext under PASS_A.
    expect([...plainUnder(readFileSync(archivePath()), PASS_A)]).toEqual([...ARCHIVE_PLAIN]);
  });

  test("seal is idempotent — a second seal skips the already-sealed carriers", { timeout: 60_000 }, () => {
    writeCleartextCarriers();
    sealArchiveWithPassphrase(PASS_A);
    const before = readFileSync(archivePath());
    const r2 = sealArchiveWithPassphrase(PASS_A);
    expect(r2.sealed).toEqual([]);                   // nothing re-sealed
    expect(r2.skipped.sort()).toEqual(["archive", "device-share"]);
    expect([...readFileSync(archivePath())]).toEqual([...before]);   // untouched
  });

  test("rotate old→new — BOTH carriers open under the new passphrase and FAIL under the old", { timeout: 60_000 }, () => {
    writeCleartextCarriers();
    sealArchiveWithPassphrase(PASS_A);
    const r = rotateArchivePassphrase(PASS_A, PASS_B);
    expect(r.rotated.sort()).toEqual(["archive", "device-share"]);
    for (const p of [archivePath(), deviceSharePath()]) {
      expect(opensUnder(readFileSync(p), PASS_B)).toBe(true);
      expect(opensUnder(readFileSync(p), PASS_A)).toBe(false);
    }
    // plaintext survives the rotation intact.
    expect([...plainUnder(readFileSync(archivePath()), PASS_B)]).toEqual([...ARCHIVE_PLAIN]);
    expect([...plainUnder(readFileSync(deviceSharePath()), PASS_B)]).toEqual([...SHARE_PLAIN]);
  });

  test("rotate with ONE carrier — the archive alone rotates when the share is absent", { timeout: 60_000 }, () => {
    writeCleartextCarriers({ share: false });
    sealArchiveWithPassphrase(PASS_A);
    const r = rotateArchivePassphrase(PASS_A, PASS_B);
    expect(r.rotated).toEqual(["archive"]);
    expect(opensUnder(readFileSync(archivePath()), PASS_B)).toBe(true);
    expect(existsSync(deviceSharePath())).toBe(false);
  });

  test("wrong old passphrase → ZERO writes (on-disk bytes byte-identical to pre-call)", { timeout: 60_000 }, () => {
    writeCleartextCarriers();
    sealArchiveWithPassphrase(PASS_A);
    const archiveBefore = readFileSync(archivePath());
    const shareBefore   = readFileSync(deviceSharePath());
    expect(() => rotateArchivePassphrase("the WRONG old passphrase", PASS_B)).toThrow();
    // fail-closed: not one byte moved.
    expect([...readFileSync(archivePath())]).toEqual([...archiveBefore]);
    expect([...readFileSync(deviceSharePath())]).toEqual([...shareBefore]);
    // and the carriers still open under the ORIGINAL passphrase (never un-rotated).
    expect(opensUnder(readFileSync(archivePath()), PASS_A)).toBe(true);
  });

  test("export → a passphrase-sealed backup re-opens to the IDENTICAL plaintext", { timeout: 60_000 }, () => {
    writeCleartextCarriers();
    sealArchiveWithPassphrase(PASS_A);
    setEnv(ARCHIVE_PASSPHRASE_ENV, PASS_A);          // the live policy opens the current sealed archive
    const dest = join(root, "backup", "archive.sealed.bin");
    const r = exportSealedArchive(PASS_B, dest, false);   // backup sealed under a DIFFERENT passphrase
    expect(r.dest).toBe(dest);
    expect(isSealedEnvelope(readFileSync(dest))).toBe(true);
    expect([...plainUnder(readFileSync(dest), PASS_B)]).toEqual([...ARCHIVE_PLAIN]);
    // refuses a silent overwrite, honors --force.
    expect(() => exportSealedArchive(PASS_B, dest, false)).toThrow(/force/);
    expect(() => exportSealedArchive(PASS_B, dest, true)).not.toThrow();
  });

  test("export from a CLEARTEXT vessel still writes an ENCRYPTED backup", { timeout: 60_000 }, () => {
    writeCleartextCarriers();                        // never sealed → archive is bare
    const dest = join(root, "backup2.bin");
    exportSealedArchive(PASS_B, dest);
    expect(isSealedEnvelope(readFileSync(dest))).toBe(true);   // the backup is ALWAYS sealed
    expect([...plainUnder(readFileSync(dest), PASS_B)]).toEqual([...ARCHIVE_PLAIN]);
  });

  test("status — truthful per-carrier state (absent/cleartext/sealed) and split detection + repair", { timeout: 60_000 }, () => {
    // cleartext state
    writeCleartextCarriers({ share: false });
    let s = archiveSealStatus();
    expect(s.carriers.archive.state).toBe("cleartext");
    expect(s.carriers["device-share"].state).toBe("absent");

    // seal only the archive, then hand-craft a SPLIT: seal the share under a DIFFERENT passphrase.
    sealArchiveWithPassphrase(PASS_A);               // archive → sealed under PASS_A
    writeFileSync(deviceSharePath(), Buffer.from(SHARE_PLAIN));
    // seal the share alone by rotating it under PASS_B via a direct seal on a fresh cleartext share:
    // sealArchiveWithPassphrase seals any cleartext carrier — but it would use PASS given. Seal the share
    // under PASS_B by temporarily making the archive look sealed (already is) so only the share is cleartext.
    sealArchiveWithPassphrase(PASS_B);               // archive already sealed (skip); share → sealed under PASS_B
    s = archiveSealStatus({ probe: PASS_A });
    expect(s.carriers.archive.opensUnderProbe).toBe(true);
    expect(s.carriers["device-share"].opensUnderProbe).toBe(false);
    expect(s.split).toBe(true);                      // the carriers disagree on PASS_A → split-KEK

    // repair: bring the lagging share (opens under PASS_B) UNDER PASS_A.
    const rep = repairSplitKek(PASS_B, PASS_A);
    expect(rep.repaired).toEqual(["device-share"]);
    expect(rep.alreadyConsistent).toEqual(["archive"]);
    const after = archiveSealStatus({ probe: PASS_A });
    expect(after.split).toBe(false);
    expect(after.carriers.archive.opensUnderProbe).toBe(true);
    expect(after.carriers["device-share"].opensUnderProbe).toBe(true);
  });

  test("daemon-up (runVaultVerb) and daemon-down (direct) land byte-equivalent carriers + set the in-memory policy", { timeout: 60_000 }, async () => {
    // daemon-down: direct seal.
    writeCleartextCarriers();
    sealArchiveWithPassphrase(PASS_A);
    const directArchive = plainUnder(readFileSync(archivePath()), PASS_A);

    // fresh vessel, daemon-up path: the same seal through the verb handler.
    rmSync(larIdentityDir(), { recursive: true, force: true });
    writeCleartextCarriers();
    setEnv(ARCHIVE_PASSPHRASE_ENV, undefined);
    const out = await runVaultVerb("vault-seal", { passphrase: PASS_A });
    expect(out["verb"]).toBe("vault-seal");
    expect(isSealedEnvelope(readFileSync(archivePath()))).toBe(true);
    // the handler updated the worker's OWN in-memory seal policy (no un-rotate on the next M3 seal).
    expect(process.env[ARCHIVE_PASSPHRASE_ENV]).toBe(PASS_A);
    // both paths recover the SAME plaintext.
    expect([...plainUnder(readFileSync(archivePath()), PASS_A)]).toEqual([...directArchive]);

    // rotate through the handler moves the policy with the carriers.
    await runVaultVerb("vault-rotate", { old: PASS_A, new: PASS_B });
    expect(process.env[ARCHIVE_PASSPHRASE_ENV]).toBe(PASS_B);
    expect(opensUnder(readFileSync(archivePath()), PASS_B)).toBe(true);

    // status through the handler is a pure read (no policy mutation).
    const st = await runVaultVerb("vault-status", {});
    expect(st["sealExpected"]).toBe(true);
  });

  test("empty passphrase is refused (fail-closed); a weak one only WARNS (soft floor)", { timeout: 60_000 }, () => {
    writeCleartextCarriers();
    expect(() => sealArchiveWithPassphrase("")).toThrow();
    expect(weakPassphraseWarning("short")).toMatch(/floor/);
    expect(weakPassphraseWarning(PASS_A)).toBeNull();
  });
});
