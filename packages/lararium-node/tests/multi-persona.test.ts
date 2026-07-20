/**
 * multi-persona.test — Plurality Pono at the identity layer (#63).
 *
 * A human contains multitudes; a vessel may HOLD a SET of persona-roots (one per handle-index) and WEAR
 * one at a time. This proves the generalization stands AND that a one-persona vessel behaves byte-identically
 * to today (back-compat): the founding persona (index 0) spells with NO `-h` suffix and needs no selector file.
 *
 * Custody-by-TYPE survives: each persona-root is the vessel's OWN sovereign secret (a distinct ed25519 key),
 * so N roots widen the self-surface, never a held-principal honeypot — and wearing a persona whose root the
 * vessel does not hold is refused (the custody wall in mask form). Recovery splits PER persona-root.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed25519 from "@noble/ed25519";
import { assembleQuorum, reconstructFromQuorum, decodeShareBytes, type RecoveryShare } from "@lararium/mesh";
import {
  generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed,
  loadActivePersonaIndex, wearPersona, personaRootExists, listPersonaRoots,
} from "../src/node-vessel-identity.js";
import { persistIdentityAnchors, loadIdentityAnchors, listAnchoredPersonas } from "../src/identity-anchors.js";
import { provisionRecoveryAtFounding } from "../src/recovery-keel.js";
import { loadRecoveryDeviceShare } from "../src/recovery-share-store.js";
import { larIdentityDir } from "../src/vessel-paths.js";

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};

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

const pubHexOf = async (seed: Uint8Array): Promise<string> =>
  Buffer.from(await ed25519.getPublicKeyAsync(seed)).toString("hex");

describe("multi-persona-per-vessel (#63)", () => {
  let root: string;
  const dataDir = () => root;   // identityDir ignores it — the store resolves under XDG state
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-multipersona-"));
    setEnv("LAR_ROOT", undefined);
    setEnv("XDG_STATE_HOME", join(root, "state"));
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);   // exercise the cleartext-parity path
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("ONE-persona vessel is byte-identical to today — index 0 has no `-h` suffix, no selector file", async () => {
    const founding = await generateOrLoadPersonaGroupRoot(dataDir());   // default index 0
    expect(founding.created).toBe(true);

    const idDir = larIdentityDir();
    const rootFiles = readdirSync(idDir).filter((f) => /^\.persona-group-root/.test(f));
    expect(rootFiles.length, "exactly one root file at founding").toBe(1);
    expect(rootFiles[0], "the founding persona carries NO -h suffix").not.toMatch(/-h\d/);

    // No selector file has landed, so the vessel reads the founding persona — the pre-multi-persona default.
    expect(existsSync(join(idDir, ".active-persona.json")) || readdirSync(idDir).some((f) => f.startsWith(".active-persona"))).toBe(false);
    expect(await loadActivePersonaIndex(dataDir())).toBe(0);
    expect(await listPersonaRoots(dataDir())).toEqual([0]);
  });

  test("a vessel HOLDS two distinct persona-roots (multitude-of-one), each its own sovereign key", async () => {
    const p0 = await generateOrLoadPersonaGroupRoot(dataDir(), 0);
    const p1 = await generateOrLoadPersonaGroupRoot(dataDir(), 1);
    expect(p0.created && p1.created).toBe(true);
    expect(p0.verifyingKey).not.toBe(p1.verifyingKey);       // two DISTINCT quorum-identities

    // Idempotent per index — a reload returns the SAME key, created:false, and never crosses indices.
    const p1b = await generateOrLoadPersonaGroupRoot(dataDir(), 1);
    expect(p1b.created).toBe(false);
    expect(p1b.verifyingKey).toBe(p1.verifyingKey);

    // Each seed signs AS its own persona: its ed25519 public key matches its OWN root, differs from the other.
    const seed0 = await loadPersonaGroupRootSeed(dataDir(), 0);
    const seed1 = await loadPersonaGroupRootSeed(dataDir(), 1);
    expect(await pubHexOf(seed0)).toBe(p0.verifyingKey);
    expect(await pubHexOf(seed1)).toBe(p1.verifyingKey);
    expect(await pubHexOf(seed0)).not.toBe(await pubHexOf(seed1));

    expect(await listPersonaRoots(dataDir())).toEqual([0, 1]);
  });

  test("WEAR a mask — switch the active persona, and it survives (persisted outside the wipe)", async () => {
    await generateOrLoadPersonaGroupRoot(dataDir(), 0);
    await generateOrLoadPersonaGroupRoot(dataDir(), 1);

    expect(await loadActivePersonaIndex(dataDir())).toBe(0);   // default = founding
    await wearPersona(dataDir(), 1);
    expect(await loadActivePersonaIndex(dataDir())).toBe(1);   // the mask is on
    await wearPersona(dataDir(), 0);
    expect(await loadActivePersonaIndex(dataDir())).toBe(0);   // and off again — the house beneath unchanged
  });

  test("custody wall in mask form — cannot WEAR a persona whose root the vessel does not hold", async () => {
    await generateOrLoadPersonaGroupRoot(dataDir(), 0);
    expect(await personaRootExists(dataDir(), 7)).toBe(false);
    await expect(wearPersona(dataDir(), 7)).rejects.toThrow(/no persona-root held/);
    // Index 0 is ALWAYS wearable (a joinee wears its admitted persona through the edge, holds no root).
    await expect(wearPersona(dataDir(), 0)).resolves.toBeUndefined();
  });

  test("handle-index guard rejects out-of-range indices (SLIP-0010 hardened ceiling)", async () => {
    await expect(generateOrLoadPersonaGroupRoot(dataDir(), -1)).rejects.toThrow(/out of range/);
    await expect(generateOrLoadPersonaGroupRoot(dataDir(), 0x80000000)).rejects.toThrow(/out of range/);
  });

  test("recovery splits PER persona — persona-1's quorum reconstructs persona-1's root, not persona-0's", async () => {
    await generateOrLoadPersonaGroupRoot(dataDir(), 0);
    await generateOrLoadPersonaGroupRoot(dataDir(), 1);

    const { recordedCode, escrowCarrier } = await provisionRecoveryAtFounding(dataDir(), seededRng(11), 1, 1);

    // The device-share for persona 1 landed at ITS OWN keyed carrier; persona 0's carrier stays untouched.
    expect(loadRecoveryDeviceShare(1)?.custodian).toBe("device");
    expect(loadRecoveryDeviceShare(0)).toBeNull();

    // The two off-device carriers reconstruct persona-1's REAL root — and NOT persona-0's.
    const codeShare:   RecoveryShare = { bytes: decodeShareBytes(recordedCode),  custodian: "recorded-code", recoveryEpoch: 1 };
    const escrowShare: RecoveryShare = { bytes: decodeShareBytes(escrowCarrier), custodian: "escrow-peer",   recoveryEpoch: 1 };
    const recovered = reconstructFromQuorum(assembleQuorum([codeShare, escrowShare], 2));
    expect([...recovered]).toEqual([...await loadPersonaGroupRootSeed(dataDir(), 1)]);
    expect([...recovered]).not.toEqual([...await loadPersonaGroupRootSeed(dataDir(), 0)]);
  });

  test("veiled-Handle anchors extend to a SET — each persona anchors to its OWN PersonaGroup", () => {
    const a0 = { personaGroupDocIdHex: "a0".repeat(32), meshCabalDocIdHex: "b0".repeat(32), personaGroupAgentIdHex: "c0".repeat(32) };
    const a1 = { personaGroupDocIdHex: "a1".repeat(32), meshCabalDocIdHex: "b1".repeat(32), personaGroupAgentIdHex: "c1".repeat(32) };
    persistIdentityAnchors(a0);          // default index 0 (founding) → anchors.json, back-compat
    persistIdentityAnchors(a1, 1);       // persona 1 → anchors-h1.json

    expect(loadIdentityAnchors()).toEqual(a0);       // the founding-persona read is unchanged
    expect(loadIdentityAnchors(1)).toEqual(a1);
    expect(existsSync(join(larIdentityDir(), "anchors.json"))).toBe(true);   // byte-identical founding spelling
    expect(listAnchoredPersonas()).toEqual([0, 1]);
  });
});
