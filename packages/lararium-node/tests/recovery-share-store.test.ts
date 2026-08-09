/**
 * recovery-share-store.test — the device recovery share persists SEALED in the sovereign identity home
 * (rides the CIV-4 self-only seal), round-trips identically, and a sealed store with no key source
 * throws LOUD rather than reading a half-recovered quorum.
 */
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { isSealedEnvelope } from "@lararium/mesh";
import type { RecoveryShare } from "@lararium/mesh";
import { larIdentityDir } from "../src/vessel-paths.js";
import { persistRecoveryDeviceShare, loadRecoveryDeviceShare } from "../src/recovery-share-store.js";

const saved: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
}

const SHARE: RecoveryShare = {
  bytes: { x: 3, ys: Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 7 + 1) & 0xff)) },
  custodian: "device",
  recoveryEpoch: 1,
};
const sharePath = (): string => join(larIdentityDir(), "recovery-device-share-h0.bin");

describe("recovery-share-store — the device share at rest", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-recshare-"));
    setEnv("LAR_ROOT", undefined);
    setEnv("XDG_STATE_HOME", join(root, "state"));
    setEnv("XDG_DATA_HOME", join(root, "state"));   // identity/seal/library answer HERE
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("persists into the identity home and reads back identically", () => {
    expect(loadRecoveryDeviceShare()).toBeNull();          // nothing yet
    persistRecoveryDeviceShare(SHARE);
    expect(existsSync(sharePath())).toBe(true);
    const back = loadRecoveryDeviceShare();
    expect(back?.bytes.x).toBe(SHARE.bytes.x);
    expect([...(back?.bytes.ys ?? [])]).toEqual([...SHARE.bytes.ys]);
    expect(back?.custodian).toBe("device");
    expect(back?.recoveryEpoch).toBe(1);
  });

  test("with a passphrase the store is SEALED (never plaintext) and still round-trips", () => {
    setEnv("LARES_ARCHIVE_PASSPHRASE", "correct horse battery staple");
    persistRecoveryDeviceShare(SHARE);
    expect(isSealedEnvelope(readFileSync(sharePath()))).toBe(true);   // an AES-GCM envelope, not bare JSON
    expect(loadRecoveryDeviceShare()?.bytes.x).toBe(3);
  });

  test("a sealed store with no key source throws LOUD (never a silent half-recovery)", () => {
    setEnv("LARES_ARCHIVE_PASSPHRASE", "the sealing pass");
    persistRecoveryDeviceShare(SHARE);
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);          // the key vanished
    expect(() => loadRecoveryDeviceShare()).toThrow();
  });
});
