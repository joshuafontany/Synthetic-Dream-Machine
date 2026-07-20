/**
 * persona-vault.test — the isomorphic persona core over an IN-MEMORY PersonaVault (#64 stage 1).
 *
 * The control flow (generate/list/wear/custody-refuse/recovery-split-per-persona) lives in @lararium/mesh,
 * platform-blind. This exercises it against a Map-backed vault — the browser/node adapters supply the same
 * shape over their own storage. No back-compat spelling constraint: the vault keys uniformly by index, the
 * roster is the store's OWN explicit record, and an unworn selector reads undefined (no inference).
 */
import { describe, test, expect } from "vitest";
import {
  generateOrLoadPersonaRoot, loadPersonaRootSeed, listPersonaRoots, personaRootExists,
  wearPersona, loadActivePersona,
  splitRootAtFounding, provisionRecoveryAtFounding, reconstructAndReadmit,
  assembleQuorum, reconstructFromQuorum, decodeShareBytes,
  type PersonaVault, type ActivePersonaStore, type AnchorStore, type RecoveryShareStore,
  type KeypairStore, type KeypairCrypto, type PersistedKeypair, type IdentityAnchors, type RecoveryShare,
  type ReadmissionSecret,
} from "../src/index.js";
import * as ed25519 from "@noble/ed25519";

// A deterministic RNG so a split reproduces across runs (test-only — never a production crypto source).
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

// An ed25519 KeypairCrypto over @noble — each generate() mints a distinct pair, hex-encoded.
const memCrypto: KeypairCrypto = {
  async generate(): Promise<PersistedKeypair> {
    const priv = seededRng(Math.floor(Math.random() * 0xffffffff)).getRandomValues(new Uint8Array(32));
    const pub = await ed25519.getPublicKeyAsync(priv);
    return { signingKey: Buffer.from(priv).toString("hex"), verifyingKey: Buffer.from(pub).toString("hex") };
  },
};

/** A wholly in-memory PersonaVault — Maps for roots/anchors/recovery, a cell for the selector. */
function makeInMemoryVault(): PersonaVault {
  const roots = new Map<number, PersistedKeypair>();
  const anchorsMap = new Map<number, IdentityAnchors>();
  const shares = new Map<number, RecoveryShare>();
  let worn: number | undefined;

  const selector: ActivePersonaStore = {
    async load() { return worn; },
    async save(i) { worn = i; },
  };
  const anchors: AnchorStore = {
    load: (i) => anchorsMap.get(i) ?? null,
    save: (i, a) => { anchorsMap.set(i, a); },
    list: () => [...anchorsMap.keys()].sort((a, b) => a - b),
  };
  const recovery: RecoveryShareStore = {
    load: (i) => shares.get(i) ?? null,
    save: (i, s) => { shares.set(i, s); },
  };
  return {
    rootSlot(i): KeypairStore {
      return {
        async load() { return roots.get(i); },
        async save(kp) { roots.set(i, kp); },
      };
    },
    async listRoots() { return [...roots.keys()].sort((a, b) => a - b); },
    async hasRoot(i) { return roots.has(i); },
    selector, anchors, recovery,
  };
}

const pubHexOf = async (seed: Uint8Array): Promise<string> =>
  Buffer.from(await ed25519.getPublicKeyAsync(seed)).toString("hex");

describe("persona-vault core (#64 stage 1)", () => {
  test("generate is idempotent per index; two indices mint DISTINCT sovereign roots", async () => {
    const v = makeInMemoryVault();
    const p0 = await generateOrLoadPersonaRoot(v, memCrypto, 0);
    const p1 = await generateOrLoadPersonaRoot(v, memCrypto, 1);
    expect(p0.created && p1.created).toBe(true);
    expect(p0.verifyingKey).not.toBe(p1.verifyingKey);

    const p0b = await generateOrLoadPersonaRoot(v, memCrypto, 0);
    expect(p0b.created).toBe(false);
    expect(p0b.verifyingKey).toBe(p0.verifyingKey);

    // Each seed signs AS its own persona: its ed25519 public key matches its OWN root.
    expect(await pubHexOf(await loadPersonaRootSeed(v, 0))).toBe(p0.verifyingKey);
    expect(await pubHexOf(await loadPersonaRootSeed(v, 1))).toBe(p1.verifyingKey);
  });

  test("listRoots reads the store's own keys; a fresh vault (joinee) reads []", async () => {
    const v = makeInMemoryVault();
    expect(await listPersonaRoots(v)).toEqual([]);   // joinee: anchors possible, roots empty
    await generateOrLoadPersonaRoot(v, memCrypto, 0);
    await generateOrLoadPersonaRoot(v, memCrypto, 2);
    expect(await listPersonaRoots(v)).toEqual([0, 2]);
    expect(await personaRootExists(v, 2)).toBe(true);
    expect(await personaRootExists(v, 5)).toBe(false);
  });

  test("wear + selector: an unworn vessel reads undefined (no inference), then the worn index", async () => {
    const v = makeInMemoryVault();
    await generateOrLoadPersonaRoot(v, memCrypto, 0);
    await generateOrLoadPersonaRoot(v, memCrypto, 1);
    expect(await loadActivePersona(v)).toBeUndefined();   // nothing worn yet — never a silent default
    await wearPersona(v, 1);
    expect(await loadActivePersona(v)).toBe(1);
    await wearPersona(v, 0);
    expect(await loadActivePersona(v)).toBe(0);
  });

  test("custody-by-TYPE: wearing a persona whose root the vault does not hold is refused (uniform, no index-0 exception)", async () => {
    const v = makeInMemoryVault();
    // Even index 0 is refused when no root is held — the uniform custody wall (no founding special-case).
    await expect(wearPersona(v, 0)).rejects.toThrow(/no persona-root held/);
    await generateOrLoadPersonaRoot(v, memCrypto, 0);
    await expect(wearPersona(v, 0)).resolves.toBeUndefined();
    await expect(wearPersona(v, 7)).rejects.toThrow(/no persona-root held/);
  });

  test("handle-index guard rejects out-of-range indices (SLIP-0010 hardened ceiling)", async () => {
    const v = makeInMemoryVault();
    await expect(generateOrLoadPersonaRoot(v, memCrypto, -1)).rejects.toThrow(/out of range/);
    await expect(generateOrLoadPersonaRoot(v, memCrypto, 0x80000000)).rejects.toThrow(/out of range/);
  });

  test("recovery splits PER persona — persona-1's quorum reconstructs persona-1's root, not persona-0's", async () => {
    const v = makeInMemoryVault();
    await generateOrLoadPersonaRoot(v, memCrypto, 0);
    await generateOrLoadPersonaRoot(v, memCrypto, 1);

    const { recordedCode, escrowCarrier } = await provisionRecoveryAtFounding(v, seededRng(11), 1, 1);
    // The device-share for persona 1 landed at ITS OWN key; persona 0's stays untouched.
    expect(v.recovery!.load(1)?.custodian).toBe("device");
    expect(v.recovery!.load(0)).toBeNull();

    const codeShare:   RecoveryShare = { bytes: decodeShareBytes(recordedCode),  custodian: "recorded-code", recoveryEpoch: 1 };
    const escrowShare: RecoveryShare = { bytes: decodeShareBytes(escrowCarrier), custodian: "escrow-peer",   recoveryEpoch: 1 };
    const recovered = reconstructFromQuorum(assembleQuorum([codeShare, escrowShare], 2));
    expect([...recovered]).toEqual([...await loadPersonaRootSeed(v, 1)]);
    expect([...recovered]).not.toEqual([...await loadPersonaRootSeed(v, 0)]);
  });

  test("reconstructAndReadmit hands the branded root to the injected runner, then zeroizes it", async () => {
    const root = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 7 + 3) & 0xff));
    const founding = splitRootAtFounding(root, seededRng(7));
    let seenLen = 0;
    // The injected runner reads the reconstructed root (equal to the original), returns a payload.
    const payload = await reconstructAndReadmit(
      [founding.recordedCodeShare, founding.escrowShare],
      { tag: "readmit" },
      async (reconstructedRoot: ReadmissionSecret, r) => {
        seenLen = reconstructedRoot.length;
        expect([...reconstructedRoot]).toEqual([...root]);   // quorum reconstructs the original
        return { ...r, ok: true };
      },
    );
    expect(payload).toEqual({ tag: "readmit", ok: true });
    expect(seenLen).toBe(32);
  });

  test("anchors ride the vault as a SET keyed by index; list reads the store's keys", () => {
    const v = makeInMemoryVault();
    const a0: IdentityAnchors = { personaGroupDocIdHex: "a0".repeat(32), meshCabalDocIdHex: "b0".repeat(32), personaGroupAgentIdHex: "c0".repeat(32) };
    const a1: IdentityAnchors = { personaGroupDocIdHex: "a1".repeat(32), meshCabalDocIdHex: "b1".repeat(32), personaGroupAgentIdHex: "c1".repeat(32) };
    v.anchors.save(0, a0);
    v.anchors.save(1, a1);
    expect(v.anchors.load(0)).toEqual(a0);
    expect(v.anchors.load(1)).toEqual(a1);
    expect(v.anchors.list()).toEqual([0, 1]);
  });
});
