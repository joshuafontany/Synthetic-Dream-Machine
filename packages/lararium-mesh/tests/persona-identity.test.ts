/**
 * persona-identity — the persona master-seed lifecycle + the two-key atom.
 *
 * Witnesses: the generate-or-load-then-persist control flow, deterministic
 * veiled-user-key derivation, the two-key atom assembly, and the Model-A guard —
 * the vessel-key passes through BYTE-IDENTICAL, never derived from the seed.
 */

import { describe, test, expect } from "vitest";
import {
  generateOrLoadPersonaSeed,
  deriveVeiledUserKey,
  assembleTwoKeyAtom,
  personaPathIndices,
  PERSONA_SEED_BYTES,
  type PersonaSeedStore,
} from "../src/persona-identity.js";

/** An in-memory PersonaSeedStore — one slot, holds the bytes it was given. */
function memSeedStore(initial?: Uint8Array): PersonaSeedStore & { slot: Uint8Array | undefined } {
  return {
    slot: initial,
    async load() {
      return this.slot;
    },
    async save(seed: Uint8Array) {
      this.slot = seed;
    },
  };
}

/** A deterministic fake randomBytes — fills n bytes with an incrementing pattern. */
function fakeRandomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = (i * 7 + 3) & 0xff;
  return out;
}

describe("generateOrLoadPersonaSeed — lifecycle", () => {
  test("first call creates + persists; second loads the SAME seed", async () => {
    const store = memSeedStore();

    const first = await generateOrLoadPersonaSeed(store, fakeRandomBytes);
    expect(first.created).toBe(true);
    expect(first.seed.length).toBe(PERSONA_SEED_BYTES);
    // persisted before return
    expect(store.slot).toBeDefined();
    expect(Array.from(store.slot!)).toEqual(Array.from(first.seed));

    const second = await generateOrLoadPersonaSeed(store, fakeRandomBytes);
    expect(second.created).toBe(false);
    // byte-identical to the first — the load path, not a fresh mint
    expect(Array.from(second.seed)).toEqual(Array.from(first.seed));
  });

  test("a pre-seeded store loads without minting", async () => {
    const seed = fakeRandomBytes(PERSONA_SEED_BYTES);
    const store = memSeedStore(seed);
    let called = false;
    const guardRandom = (n: number) => {
      called = true;
      return fakeRandomBytes(n);
    };
    const res = await generateOrLoadPersonaSeed(store, guardRandom);
    expect(res.created).toBe(false);
    expect(called).toBe(false); // randomBytes never touched on the load path
    expect(Array.from(res.seed)).toEqual(Array.from(seed));
  });

  test("rejects a randomBytes seam that returns the wrong length", async () => {
    const store = memSeedStore();
    await expect(generateOrLoadPersonaSeed(store, () => new Uint8Array(16))).rejects.toThrow(
      /32 bytes/,
    );
  });
});

describe("deriveVeiledUserKey — deterministic + unlinkable-by-distinctness", () => {
  const seed = fakeRandomBytes(PERSONA_SEED_BYTES);

  test("same seed + indices → same keypair (deterministic)", async () => {
    const a = await deriveVeiledUserKey(seed, 0, 0);
    const b = await deriveVeiledUserKey(seed, 0, 0);
    expect(a).toEqual(b);
    expect(a.signingKey).toHaveLength(64);
    expect(a.verifyingKey).toHaveLength(64);
  });

  test("different contextIndex → different keys", async () => {
    const a = await deriveVeiledUserKey(seed, 0, 0);
    const b = await deriveVeiledUserKey(seed, 0, 1);
    expect(a.verifyingKey).not.toBe(b.verifyingKey);
    expect(a.signingKey).not.toBe(b.signingKey);
  });

  test("different handleIndex → unlinkable-by-distinctness (different keys)", async () => {
    const a = await deriveVeiledUserKey(seed, 0, 0);
    const b = await deriveVeiledUserKey(seed, 1, 0);
    expect(a.verifyingKey).not.toBe(b.verifyingKey);
    expect(a.signingKey).not.toBe(b.signingKey);
  });

  test("wraps derivePersonaKeypair along the [handle, context] path", () => {
    expect(personaPathIndices(3, 7)).toEqual([3, 7]);
  });
});

describe("assembleTwoKeyAtom — two-key atom + the Model-A guard", () => {
  const seed = fakeRandomBytes(PERSONA_SEED_BYTES);
  const vesselVerifyingKey = "11".repeat(32); // a device-minted public key, passed in

  test("pairs the passed vessel key (unchanged) with the derived veiled-user key", async () => {
    const atom = await assembleTwoKeyAtom(vesselVerifyingKey, seed, 0, 0);
    const veiled = await deriveVeiledUserKey(seed, 0, 0);

    expect(atom.vesselVerifyingKey).toBe(vesselVerifyingKey);
    expect(atom.veiledUserVerifyingKey).toBe(veiled.verifyingKey);
  });

  test("the vessel key is byte-identical to what was passed — NEVER derived from the seed", async () => {
    // Across two different handles, the vessel key stays the SAME passed value,
    // while the veiled-user key changes — the substrate (vessel) and the
    // sovereignty (veil) keys never fuse.
    const atomA = await assembleTwoKeyAtom(vesselVerifyingKey, seed, 0, 0);
    const atomB = await assembleTwoKeyAtom(vesselVerifyingKey, seed, 1, 0);

    expect(atomA.vesselVerifyingKey).toBe(vesselVerifyingKey);
    expect(atomB.vesselVerifyingKey).toBe(vesselVerifyingKey);
    // the vessel key did NOT pick up any seed-derived material
    expect(atomA.vesselVerifyingKey).not.toBe(atomA.veiledUserVerifyingKey);
    expect(atomB.vesselVerifyingKey).not.toBe(atomB.veiledUserVerifyingKey);
    // the veiled-user key DID change with the handle — derived, not the vessel
    expect(atomA.veiledUserVerifyingKey).not.toBe(atomB.veiledUserVerifyingKey);
  });
});
