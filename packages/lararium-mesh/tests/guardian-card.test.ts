/**
 * guardian-card — the SHARED "Recovery-card" 2-of-3 primitive, proven for BOTH uses (the reserve seed AND
 * the identity root are just secrets here). The card shape + handshake round-trip:
 *   · the three slots carry the three DISTINCT custodian tags (mine→device, guardian-a→guardian, guardian-b→escrow-peer),
 *   · {mine, guardian-a} rebuilds; {guardian-a, guardian-b} rebuilds WITHOUT the operator,
 *   · FAIL CLOSED: one card is no quorum, a tampered card fails the checksum,
 *   · each card carries a DISTINCT, deterministic confirmation phrase over the shared handshake domain.
 */
import { describe, test, expect } from "vitest";
import {
  splitToGuardianCards, guardianShareFromCard, confirmationPhrase,
  GUARDIAN_CARD_THRESHOLD, GUARDIAN_SLOT_CUSTODIAN,
  assembleQuorum, reconstructFromQuorum,
  type GuardianCard,
} from "../src/index.js";
import type { RandomProvider } from "../src/crypto.js";

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
const secretOf = (v: number): Uint8Array => new Uint8Array(32).fill(v);
const split = (s: Uint8Array) => splitToGuardianCards(s, "Guardian A", "Guardian B", EPOCH, counterRng());
const bySlot = (cards: readonly GuardianCard[], slot: string): GuardianCard => cards.find((c) => c.slot === slot)!;
const rebuild = (cards: readonly GuardianCard[]): Uint8Array =>
  reconstructFromQuorum(assembleQuorum(cards.map((c) => guardianShareFromCard(c, EPOCH)), GUARDIAN_CARD_THRESHOLD));

describe("guardian-card — one card shape, one handshake", () => {
  test("three slots carry the three DISTINCT custodian tags + the shared labels", () => {
    const { cards } = split(secretOf(42));
    expect(cards.map((c) => c.slot)).toEqual(["mine", "guardian-a", "guardian-b"]);
    expect(cards.map((c) => c.custodian)).toEqual(["device", "guardian", "escrow-peer"]);
    expect(new Set(cards.map((c) => c.custodian)).size).toBe(3);
    expect(bySlot(cards, "mine").label).toBe("Recovery-card mine");
    expect(bySlot(cards, "guardian-a").label).toContain("guardian-A (Guardian A)");
    expect(GUARDIAN_SLOT_CUSTODIAN["guardian-b"]).toBe("escrow-peer");
  });

  test("mineShare is the device share the vessel seals at rest", () => {
    const { mineShare, cards } = split(secretOf(7));
    expect(mineShare.custodian).toBe("device");
    expect(mineShare.custodian).toBe(bySlot(cards, "mine").custodian);
  });

  test("{mine, guardian-a} rebuilds the secret (1 self + 1 guardian)", () => {
    const s = secretOf(99);
    const { cards } = split(s);
    expect(new Uint8Array(rebuild([bySlot(cards, "mine"), bySlot(cards, "guardian-a")]))).toEqual(s);
  });

  test("{guardian-a, guardian-b} rebuilds WITHOUT the operator (distinct-custodian quorum)", () => {
    const s = secretOf(99);
    const { cards } = split(s);
    expect(new Uint8Array(rebuild(cards.filter((c) => c.slot !== "mine")))).toEqual(s);
  });

  test("ONE card reconstructs nothing — no quorum (fail closed)", () => {
    const { cards } = split(secretOf(42));
    expect(() => assembleQuorum([guardianShareFromCard(cards[0]!, EPOCH)], GUARDIAN_CARD_THRESHOLD)).toThrow(/below threshold/);
  });

  test("a TAMPERED card fails the checksum before any doomed reconstruct", () => {
    const { cards } = split(secretOf(42));
    const good = cards[1]!.shareCode;
    const flip = good[0] === "a" ? "b" : "a";
    const tampered: GuardianCard = { ...cards[1]!, shareCode: flip + good.slice(1) };
    expect(() => guardianShareFromCard(tampered, EPOCH)).toThrow(/checksum/);
  });

  test("each card carries a DISTINCT, deterministic confirmation phrase (shared handshake)", () => {
    const { cards } = split(secretOf(42));
    const phrases = cards.map((c) => c.confirmPhrase);
    expect(new Set(phrases).size).toBe(cards.length);
    for (const p of phrases) expect(p).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
    expect(confirmationPhrase(cards[0]!.shareCode)).toBe(cards[0]!.confirmPhrase);   // deterministic, default domain
  });

  test("BOTH uses share the shape — a reserve seed and an identity root split identically", () => {
    const reserveSeed = secretOf(11);
    const identityRoot = secretOf(11);   // same bytes → same cards prove the primitive is secret-blind
    const a = splitToGuardianCards(reserveSeed, "A", "B", EPOCH, counterRng());
    const b = splitToGuardianCards(identityRoot, "A", "B", EPOCH, counterRng());
    expect(a.cards.map((c) => c.shareCode)).toEqual(b.cards.map((c) => c.shareCode));
    expect(a.cards.map((c) => c.confirmPhrase)).toEqual(b.cards.map((c) => c.confirmPhrase));
  });
});
