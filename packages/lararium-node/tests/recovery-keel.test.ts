/**
 * recovery-keel.test — the founding → device-loss → recovery lifecycle, composing all three keel layers.
 * A citizen founds (split 2-of-3), its device drowns, and it recovers the SAME root from the surviving
 * two custodians {recorded-code, escrow} to re-admit a fresh device — whose edge verifies against the
 * original pinned root. The device-share (dead with the device) is never the recovery path.
 */
import { describe, test, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import * as ed25519 from "@noble/ed25519";
import { assembleQuorum, decodeShareBytes, verifyDeviceDelegation } from "@lararium/mesh";
import { splitRootAtFounding, reconstructAndReadmit } from "../src/recovery-keel.js";

const ROOT = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 61 + 13) & 0xff));
const PLACE = "bafkreic7r3jrao44srh5bp47uryotaqp62bnmovzpqccbfy2kclf447bra";

function seededRng(seed: number) {
  let s = seed >>> 0;
  return {
    getRandomValues<T extends Uint8Array<ArrayBuffer>>(arr: T): T {
      for (let i = 0; i < arr.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; arr[i] = (s >>> 24) & 0xff; }
      return arr;
    },
    randomUUID(): string { return "00000000-0000-0000-0000-000000000000"; },
  };
}
const freshDeviceKey = (): string => {
  const { publicKey } = generateKeyPairSync("ed25519");
  return Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
};
const readmitFields = (joineeVerifyingKey: string) => ({
  joineeVerifyingKey, hearthTrueName: PLACE,
  personaGroupDocIdHex: "aa".repeat(32), personaGroupAgentIdHex: "bb".repeat(32),
  meshCabalDocIdHex: "cc".repeat(32), syncUrl: null,
});

describe("recovery-keel — found → device drowns → recover → re-admit", () => {
  test("a drowned device recovers from {recorded-code, escrow} and re-admits a fresh device", async () => {
    // FOUNDING: split the root 2-of-3; the citizen writes the recorded code, a peer holds the escrow.
    const founding = splitRootAtFounding(ROOT, seededRng(7));
    // The recorded code round-trips through the citizen's transcription.
    expect([...decodeShareBytes(founding.recordedCode).ys]).toEqual([...founding.recordedCodeShare.bytes.ys]);

    // DEVICE DROWNS: the device-share is gone. Recovery rides the two SURVIVING custodians.
    const surviving = [founding.recordedCodeShare, founding.escrowShare];
    const freshVK = freshDeviceKey();
    const payload = await reconstructAndReadmit(surviving, readmitFields(freshVK));

    // The re-admit edge verifies against the ORIGINAL root — the Handle's pinned signer is unchanged.
    const rootDid = `0x${Buffer.from(await ed25519.getPublicKeyAsync(ROOT)).toString("hex")}`;
    expect(payload.signerDid).toBe(rootDid);
    expect(payload.deviceEdge.deviceVerifyingKey).toBe(freshVK);
    expect((await verifyDeviceDelegation(payload.deviceEdge, rootDid)).ok).toBe(true);
  });

  test("the recorded code ALONE cannot recover — it is one share, below threshold", async () => {
    const founding = splitRootAtFounding(ROOT, seededRng(7));
    await expect(reconstructAndReadmit([founding.recordedCodeShare], readmitFields(freshDeviceKey())))
      .rejects.toThrow(/below threshold/);
  });

  test("the escrow peer's share ALONE cannot recover (single custodian, even were it enough count)", () => {
    const founding = splitRootAtFounding(ROOT, seededRng(7));
    // Two copies of the escrow share = one custodian → forbidden, independent of count.
    expect(() => assembleQuorum([founding.escrowShare, founding.escrowShare], 2)).toThrow(/single-custodian|duplicate/);
  });

  test("normal life recovers from any two custodians — {device, escrow} works too", async () => {
    const founding = splitRootAtFounding(ROOT, seededRng(7));
    const payload = await reconstructAndReadmit([founding.deviceShare, founding.escrowShare], readmitFields(freshDeviceKey()));
    const rootDid = `0x${Buffer.from(await ed25519.getPublicKeyAsync(ROOT)).toString("hex")}`;
    expect((await verifyDeviceDelegation(payload.deviceEdge, rootDid)).ok).toBe(true);
  });
});
