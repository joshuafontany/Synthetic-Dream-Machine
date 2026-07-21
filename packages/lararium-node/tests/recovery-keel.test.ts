/**
 * recovery-keel.test — the founding → device-loss → recovery lifecycle, composing all three keel layers.
 * A citizen founds (split 2-of-3), its device drowns, and it recovers the SAME root from the surviving
 * two custodians {recorded-code, escrow} to re-admit a fresh device — whose edge verifies against the
 * original pinned root. The device-share (dead with the device) is never the recovery path.
 */
import { afterEach, beforeAll, beforeEach, describe, test, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed25519 from "@noble/ed25519";
import { assembleQuorum, reconstructFromQuorum, decodeShareBytes, guardianShareFromCard, verifyDeviceDelegation, personaPrefixOf, type RecoveryShare } from "@lararium/mesh";
import { splitRootAtFounding, reconstructAndReadmit, provisionRecoveryAtFounding, provisionRecoveryCardsAtFounding } from "../src/recovery-keel.js";
import { generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed } from "../src/node-vessel-identity.js";
import { loadRecoveryDeviceShare } from "../src/recovery-share-store.js";

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
// The persona's stable inception prefix over (root op-key + unarmed recovery-commit). In Fork-A reconstruct
// the op-key does NOT rotate, so the reconstructed root IS the KEL head and this is the identifier the
// re-admit carries. Computed once (async pubkey derivation) before the suite runs.
let ROOT_PREFIX = "";
beforeAll(async () => {
  const pk = await ed25519.getPublicKeyAsync(ROOT);
  ROOT_PREFIX = personaPrefixOf(`0x${Buffer.from(pk).toString("hex")}`, "");
});
const readmitFields = (joineeVerifyingKey: string) => ({
  joineeVerifyingKey, personaKelPrefix: ROOT_PREFIX, hearthTrueName: PLACE,
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

describe("recovery-keel — founding provision against the real identity store", () => {
  const saved: Record<string, string | undefined> = {};
  const setEnv = (k: string, v: string | undefined): void => { saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; };
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-recprov-"));
    setEnv("LAR_ROOT", undefined);
    setEnv("XDG_STATE_HOME", join(root, "state"));
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("provision at founding: split the minted root, seal the device-share, recover from {code, escrow}", async () => {
    const dataDir = root;   // identityDir ignores it — the store resolves under XDG state
    await generateOrLoadPersonaGroupRoot(dataDir);                    // the founding mint
    const { recordedCode, escrowCarrier } = await provisionRecoveryAtFounding(dataDir, seededRng(11));

    // The device-share landed sealed in the identity home; the two off-device carriers came back.
    expect(loadRecoveryDeviceShare()?.custodian).toBe("device");
    expect(recordedCode.length).toBeGreaterThan(0);
    expect(escrowCarrier.length).toBeGreaterThan(0);

    // A drowned device recovers the REAL minted root from {recorded-code, escrow}.
    const codeShare:   RecoveryShare = { bytes: decodeShareBytes(recordedCode),  custodian: "recorded-code", recoveryEpoch: 1 };
    const escrowShare: RecoveryShare = { bytes: decodeShareBytes(escrowCarrier), custodian: "escrow-peer",   recoveryEpoch: 1 };
    const recovered = reconstructFromQuorum(assembleQuorum([codeShare, escrowShare], 2));
    expect([...recovered]).toEqual([...await loadPersonaGroupRootSeed(dataDir)]);
  });
});

describe("recovery-keel — identity recovery issues the SHARED guardian cards (reserve-aligned)", () => {
  const saved: Record<string, string | undefined> = {};
  const setEnv = (k: string, v: string | undefined): void => { saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; };
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lares-reccard-"));
    setEnv("LAR_ROOT", undefined);
    setEnv("XDG_STATE_HOME", join(dir, "state"));
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(dir, { recursive: true, force: true });
  });

  test("founding: split the minted root into mine + guardian-A/B cards, seal 'mine', recover from the two guardians", async () => {
    await generateOrLoadPersonaGroupRoot(dir);                       // the founding mint
    const { cards, mineSealed } = await provisionRecoveryCardsAtFounding(dir, "Ola", "Kai", seededRng(11));

    // The SAME card shape the charter reserve issues: three slots, three distinct custodians, human labels.
    expect(mineSealed).toBe(true);
    expect(cards.map((c) => c.slot)).toEqual(["mine", "guardian-a", "guardian-b"]);
    expect(cards.map((c) => c.custodian)).toEqual(["device", "guardian", "escrow-peer"]);
    expect(cards.find((c) => c.slot === "guardian-a")!.label).toContain("guardian-A (Ola)");
    expect(new Set(cards.map((c) => c.confirmPhrase)).size).toBe(3);

    // The "mine" (device) share sealed on THIS device; a lost device recovers from the two GUARDIAN cards.
    expect(loadRecoveryDeviceShare()?.custodian).toBe("device");
    const guardianCards = cards.filter((c) => c.slot !== "mine");
    const quorum = guardianCards.map((c) => guardianShareFromCard(c, 1));
    const freshVK = freshDeviceKey();
    const payload = await reconstructAndReadmit(quorum, readmitFields(freshVK));

    // The re-admit edge verifies against the ORIGINAL minted root — reconstruct-to-readmit, unchanged.
    const rootDid = `0x${Buffer.from(await ed25519.getPublicKeyAsync(await loadPersonaGroupRootSeed(dir))).toString("hex")}`;
    expect(payload.signerDid).toBe(rootDid);
    expect(payload.deviceEdge.deviceVerifyingKey).toBe(freshVK);
    expect((await verifyDeviceDelegation(payload.deviceEdge, rootDid)).ok).toBe(true);
  });

  test("ONE guardian card alone cannot recover — below threshold (fail closed)", async () => {
    await generateOrLoadPersonaGroupRoot(dir);
    const { cards } = await provisionRecoveryCardsAtFounding(dir, "Ola", "Kai", seededRng(11));
    const one = [guardianShareFromCard(cards.find((c) => c.slot === "guardian-a")!, 1)];
    await expect(reconstructAndReadmit(one, readmitFields(freshDeviceKey()))).rejects.toThrow(/below threshold/);
  });
});
