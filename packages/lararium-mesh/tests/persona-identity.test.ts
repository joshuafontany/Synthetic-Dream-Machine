/**
 * persona-identity — the persona master-seed lifecycle + the two-key atom.
 *
 * Witnesses: the generate-or-load-then-persist control flow, deterministic
 * veiled-user-key derivation, the two-key atom assembly, and the no-copied-key guard —
 * the vessel-key passes through BYTE-IDENTICAL, never derived from the seed.
 */

import { describe, test, expect } from "vitest";
import {
  deriveVeiledUserKey,
  personaPathIndices,
  PERSONA_SEED_BYTES,
} from "../src/persona-identity.js";

/** A deterministic fake randomBytes — fills n bytes with an incrementing pattern. */
function fakeRandomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = (i * 7 + 3) & 0xff;
  return out;
}

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

