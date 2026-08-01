/**
 * seal-reserve — the pre-rotation reserve keel's crypto floor, proven pure:
 *   · the next key-set derives HARDENED + reproducibly from the reserve seed (SLIP-0010), and NOT from the
 *     live signing seed (a separate seed yields a disjoint key-set),
 *   · the pre-rotation commit matches sealKeySetHash over the derived verifying keys,
 *   · the reserve seed splits 2-of-3 and ANY two DISTINCT custodians reconstruct it — the guardians
 *     ({guardian-a, guardian-b}) recover WITHOUT the operator,
 *   · FAIL CLOSED: one share reconstructs nothing (no quorum), a tampered card fails the checksum,
 *   · each card carries a DISTINCT confirmation phrase.
 */

import { describe, test, expect } from "vitest";
import {
  generateReserveSeed, deriveReserveKeySet, reserveNextKeyCommit, splitReserveSeed, reserveShareFromCard,
  confirmationPhrase, RESERVE_THRESHOLD, RESERVE_KAHU_COUNT,
  sealKeySetHash, assembleQuorum, reconstructFromQuorum,
  type ReserveCard,
} from "../src/index.js";
import type { RandomProvider } from "../src/crypto.js";

/** A deterministic RNG so the split is reproducible — a counter byte stream (tests never need entropy). */
function counterRng(start = 1): RandomProvider {
  let n = start;
  return {
    getRandomValues<T extends Uint8Array<ArrayBuffer>>(array: T): T {
      for (let i = 0; i < array.length; i++) array[i] = (n++) & 0xff;
      return array;
    },
    randomUUID() { return "00000000-0000-4000-8000-000000000000"; },
  };
}

const EPOCH = 1;
const seedOf = (v: number): Uint8Array => new Uint8Array(32).fill(v);

describe("seal-reserve — hardened next-key derivation", () => {
  test("derives THREE 64-hex keypairs, reproducibly from the seed", async () => {
    const seed = seedOf(7);
    const a = await deriveReserveKeySet(seed, EPOCH);
    const b = await deriveReserveKeySet(seed, EPOCH);
    expect(a.verifyingKeys.length).toBe(RESERVE_KAHU_COUNT);
    expect(a.signingKeys.length).toBe(RESERVE_KAHU_COUNT);
    for (const k of [...a.verifyingKeys, ...a.signingKeys]) expect(k).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toEqual(b);                               // reproducible — a rotate re-derives from the seed
    expect(new Set(a.verifyingKeys).size).toBe(3);      // domain-separated per kahu index → distinct keys
  });

  test("a SEPARATE seed yields a DISJOINT key-set (never derived from the live signing seed)", async () => {
    const reserve = await deriveReserveKeySet(seedOf(7), EPOCH);
    const signing = await deriveReserveKeySet(seedOf(99), EPOCH);   // stand-in for the live signing seed
    for (const k of reserve.verifyingKeys) expect(signing.verifyingKeys).not.toContain(k);
  });

  test("a different reserve epoch re-derives a fresh key-set from the same seed", async () => {
    const e1 = await deriveReserveKeySet(seedOf(7), 1);
    const e2 = await deriveReserveKeySet(seedOf(7), 2);
    expect(e1.verifyingKeys).not.toEqual(e2.verifyingKeys);
  });

  test("the pre-rotation commit matches sealKeySetHash over the derived verifying keys", async () => {
    const { verifyingKeys } = await deriveReserveKeySet(seedOf(7), EPOCH);
    expect(reserveNextKeyCommit(verifyingKeys)).toBe(sealKeySetHash(verifyingKeys, RESERVE_THRESHOLD));
  });
});

describe("seal-reserve — the 2-of-3 split + reconstruct", () => {
  const split = (seed: Uint8Array): { cards: ReserveCard[]; mineShare: ReturnType<typeof splitReserveSeed>["mineShare"] } =>
    splitReserveSeed(seed, "Guardian A", "Guardian B", EPOCH, counterRng());

  const rebuild = (cards: readonly ReserveCard[]): Uint8Array =>
    reconstructFromQuorum(assembleQuorum(cards.map((c) => reserveShareFromCard(c, EPOCH)), RESERVE_THRESHOLD));

  test("{mine, guardian-a} rebuilds the reserve seed", () => {
    const seed = seedOf(42);
    const { cards } = split(seed);
    const bySlot = (s: string): ReserveCard => cards.find((c) => c.slot === s)!;
    expect(new Uint8Array(rebuild([bySlot("mine"), bySlot("guardian-a")]))).toEqual(seed);
  });

  test("{guardian-a, guardian-b} rebuilds the seed WITHOUT the operator (distinct-custodian quorum)", () => {
    const seed = seedOf(42);
    const { cards } = split(seed);
    const guardians = cards.filter((c) => c.slot !== "mine");
    expect(new Uint8Array(rebuild(guardians))).toEqual(seed);
  });

  test("ONE share reconstructs nothing — no quorum (fail closed)", () => {
    const { cards } = split(seedOf(42));
    const one = [reserveShareFromCard(cards[0]!, EPOCH)];
    expect(() => assembleQuorum(one, RESERVE_THRESHOLD)).toThrow(/below threshold/);
  });

  test("a TAMPERED card fails the checksum before any doomed reconstruct", () => {
    const { cards } = split(seedOf(42));
    const good = cards[1]!.shareCode;
    const flip = good[0] === "a" ? "b" : "a";
    const tampered: ReserveCard = { ...cards[1]!, shareCode: flip + good.slice(1) };
    expect(() => reserveShareFromCard(tampered, EPOCH)).toThrow(/checksum/);
  });

  test("each card carries a DISTINCT confirmation phrase", () => {
    const { cards } = split(seedOf(42));
    const phrases = cards.map((c) => c.confirmPhrase);
    expect(new Set(phrases).size).toBe(cards.length);
    for (const p of phrases) expect(p).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);   // 3-word phrase
    expect(confirmationPhrase(cards[0]!.shareCode)).toBe(cards[0]!.confirmPhrase);   // deterministic
  });

  test("generateReserveSeed yields 32 bytes", () => {
    expect(generateReserveSeed(counterRng()).length).toBe(32);
  });
});
