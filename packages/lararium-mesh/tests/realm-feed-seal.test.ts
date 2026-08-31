/**
 * realm-feed-seal — a roll that proves whose hand made it.
 *
 * ── WHY A SHARED LEDGER NEEDS THIS FIRST ────────────────────────────────────────────────────────
 * A realm's maintenance ledger rides per-writer lease slots, and a slot's stored value is a bare
 * epoch number. That is sound where it lives today: the slots sit under the daemon bag, which is this
 * vessel's own, so the only hand that can roll a slot is the hand that owns the bag.
 *
 * It stops being sound the moment the ledger moves to the realm's own substrate, which is the move a
 * cross-operator reading requires — a doc every dweller may write. `realm-feed` takes its writer as a
 * plain string, so on a shared doc any dweller could roll any other's slot.
 *
 * AND THE DAMAGE WOULD BE PERMANENT. The lease is a MAX-REGISTER, chosen so a low roll costs nothing
 * and a high one converges. That same property makes a forged high roll IRREVERSIBLE: the max never
 * decreases, so nothing can lower it afterwards. The property that makes the lease safe locally is
 * exactly what makes forgery unfixable once shared.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────────────────────────
 * A roll carries a seal over the realm, the writer and the epoch TOGETHER, made by the writer's own
 * persona root — "a FACE feeds a realm, not a device". A reader verifies before counting, so an
 * unsigned or mis-signed slot is IGNORED rather than folded. Trust rides the signature, never the
 * doc it was found in.
 *
 * This seals the WRITE PATH. It does not move the ledger; that stays a separate act.
 */
import { describe, it, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { signRealmFeed, verifyRealmFeedSlot } from "../src/cabal-realm-clock.js";

const REALM = "a".repeat(64);

async function face(seedByte: number) {
  const seed = new Uint8Array(32).fill(seedByte);
  const nym  = Buffer.from(await ed.getPublicKeyAsync(seed)).toString("hex");
  return { nym, sign: async (b: Uint8Array) => Buffer.from(await ed.signAsync(b, seed)).toString("hex") };
}

describe("realm-feed-seal — a roll names the hand that made it", () => {
  it("★ a roll this face signed VERIFIES ★", async () => {
    const f = await face(3);
    const sealed = await signRealmFeed({ realm: REALM, writer: f.nym, epoch: 4 }, f.sign);
    expect(await verifyRealmFeedSlot({ realm: REALM, writer: f.nym, epoch: 4, sig: sealed })).toBe(true);
  });

  it("★ another face cannot roll THIS face's slot ★", async () => {
    // The whole point of sealing the write path: on a shared doc the slot uri is guessable, so the
    // seal is the only thing that ties a roll to its writer.
    const mine = await face(3);
    const theirs = await face(5);
    const forged = await signRealmFeed({ realm: REALM, writer: mine.nym, epoch: 99 }, theirs.sign);
    expect(await verifyRealmFeedSlot({ realm: REALM, writer: mine.nym, epoch: 99, sig: forged })).toBe(false);
  });

  it("★ the EPOCH is bound — a roll cannot be replayed at a higher number ★", async () => {
    // Load-bearing under a max-register: a lifted roll could never be lowered again.
    const f = await face(3);
    const sealed = await signRealmFeed({ realm: REALM, writer: f.nym, epoch: 4 }, f.sign);
    expect(await verifyRealmFeedSlot({ realm: REALM, writer: f.nym, epoch: 900, sig: sealed })).toBe(false);
  });

  it("★ the REALM is bound — a roll cannot be carried to another realm ★", async () => {
    const f = await face(3);
    const sealed = await signRealmFeed({ realm: REALM, writer: f.nym, epoch: 4 }, f.sign);
    expect(await verifyRealmFeedSlot({ realm: "b".repeat(64), writer: f.nym, epoch: 4, sig: sealed })).toBe(false);
  });

  it("★ an unsigned or torn slot is IGNORED, never folded and never thrown ★", async () => {
    const f = await face(3);
    for (const bad of ["", "zz", "abcd"]) {
      expect(await verifyRealmFeedSlot({ realm: REALM, writer: f.nym, epoch: 4, sig: bad })).toBe(false);
    }
    expect(await verifyRealmFeedSlot({ realm: REALM, writer: "nope", epoch: 4, sig: "00".repeat(64) })).toBe(false);
  });

  it("★ case in the writer hex never splits one face into two ★", async () => {
    const f = await face(3);
    const sealed = await signRealmFeed({ realm: REALM, writer: f.nym.toUpperCase(), epoch: 4 }, f.sign);
    expect(await verifyRealmFeedSlot({ realm: REALM, writer: f.nym, epoch: 4, sig: sealed })).toBe(true);
  });
});
