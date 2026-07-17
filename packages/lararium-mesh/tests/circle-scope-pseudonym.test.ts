/**
 * Per-circle SCOPE-PSEUDONYM (the beyond-Ink&Switch unlinkability FLOOR). The load-bearing
 * property: ONE persona presents a DIFFERENT key to each circle it joins (cross-circle
 * unlinkable), yet the SAME key on rejoining the SAME circle (rejoin-stable). Derived from
 * the proven all-hardened tree extended one level — touches neither BeeKEM nor GroupId.
 */
import { describe, test, expect } from "vitest";

import { circleScopeIndex, deriveCircleScopedKey, deriveVeiledUserKey } from "../src/persona-identity.js";
import { HARDENED_OFFSET } from "../src/persona-hd.js";

const SEED = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 7 + 3) & 0xff));
const CIRCLE_A = "circle:aaaa@lararium";
const CIRCLE_B = "circle:bbbb@lararium";

describe("circleScopeIndex", () => {
  test("deterministic + a valid raw (pre-hardening) index", () => {
    const i = circleScopeIndex(CIRCLE_A);
    expect(circleScopeIndex(CIRCLE_A)).toBe(i);     // same docId → same index
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(HARDENED_OFFSET);        // < 0x80000000, hardens internally
  });

  test("different circles → (almost surely) different indices", () => {
    expect(circleScopeIndex(CIRCLE_A)).not.toBe(circleScopeIndex(CIRCLE_B));
  });
});

describe("deriveCircleScopedKey — cross-circle unlinkability", () => {
  test("same persona, DIFFERENT circle → DIFFERENT key (unlinkable)", async () => {
    const a = await deriveCircleScopedKey(SEED, 0, 0, CIRCLE_A);
    const b = await deriveCircleScopedKey(SEED, 0, 0, CIRCLE_B);
    expect(a.verifyingKey).not.toBe(b.verifyingKey);
    expect(a.signingKey).not.toBe(b.signingKey);
  });

  test("same (persona, circle) → SAME key (rejoin-stable)", async () => {
    const a1 = await deriveCircleScopedKey(SEED, 0, 0, CIRCLE_A);
    const a2 = await deriveCircleScopedKey(SEED, 0, 0, CIRCLE_A);
    expect(a1.verifyingKey).toBe(a2.verifyingKey);
  });

  test("DIFFERENT persona (handle), same circle → DIFFERENT key", async () => {
    const h0 = await deriveCircleScopedKey(SEED, 0, 0, CIRCLE_A);
    const h1 = await deriveCircleScopedKey(SEED, 1, 0, CIRCLE_A);
    expect(h0.verifyingKey).not.toBe(h1.verifyingKey);
  });

  test("the scoped leaf DIFFERS from the base 2-level handle key (a real added level)", async () => {
    const base = await deriveVeiledUserKey(SEED, 0, 0);          // m/handle'/context'
    const scoped = await deriveCircleScopedKey(SEED, 0, 0, CIRCLE_A); // m/handle'/context'/circle-scope'
    expect(scoped.verifyingKey).not.toBe(base.verifyingKey);
  });

  test("valid 64-hex ed25519 keys", async () => {
    const a = await deriveCircleScopedKey(SEED, 0, 0, CIRCLE_A);
    expect(a.verifyingKey).toMatch(/^[0-9a-f]{64}$/);
    expect(a.signingKey).toMatch(/^[0-9a-f]{64}$/);
  });
});
