/**
 * realm-feed slot values — teaching the reader both forms BEFORE the board is shared.
 *
 * A realm's feed slot holds an epoch. Under a vessel's own daemon bag that is all it needs: the only
 * hand that can write there owns it, which is why `verifyRealmFeedSlot` has no caller yet. The moment
 * the feed moves to the realm's substrate — a board every dweller may write — a slot has to carry the
 * seal tying a roll to its writer, and a bare integer has nowhere to put one.
 *
 * Changing the format at the moment of the move would migrate a live board. Teaching the READER both
 * forms now costs nothing and removes that step: a sealed writer can roll into a board full of bare
 * integers, and every reader already folds both.
 */
import { describe, it, expect } from "vitest";
import {
  realmFeedSlotValue, readRealmFeedSlot, cabalRealmMaintenanceProvenance,
} from "../src/cabal-realm-clock.js";
import { realmFeedSlotUri } from "../src/cabal-realm.js";

const REALM = "0x" + "cd".repeat(32);
const A = "0x" + "a1".repeat(32);
const B = "0x" + "b2".repeat(32);

describe("realm-feed slot values — one fold, two spellings", () => {
  it("★ an unsealed roll writes a BARE integer — an untouched board stays untouched ★", () => {
    expect(realmFeedSlotValue({ epoch: 4 })).toBe("4");
  });

  it("★ a sealed roll carries its signature ★", () => {
    const v = realmFeedSlotValue({ epoch: 4, sig: "ab".repeat(32) });
    expect(readRealmFeedSlot(v)).toEqual({ epoch: 4, sig: "ab".repeat(32) });
  });

  it("★ both forms round-trip ★", () => {
    for (const value of [{ epoch: 0 }, { epoch: 7 }, { epoch: 7, sig: "ff" }]) {
      expect(readRealmFeedSlot(realmFeedSlotValue(value))).toEqual(value);
    }
  });

  it("★ a malformed slot reads null — one bad entry never costs the whole fold ★", () => {
    // "" and "0x10" are the load-bearing ones: a Number() cast reads them as 0 and 16, so an empty
    // slot would fold as a maintainer at genesis and a non-decimal value would count as an epoch.
    for (const bad of ["", "   ", "0x10", "not-a-number", "{", '{"epoch":"four"}', '{"sig":"ab"}']) {
      expect(readRealmFeedSlot(bad)).toBeNull();
    }
  });

  it("★ an empty seal reads as UNSEALED, never as a seal ★", () => {
    // A slot claiming a signature it does not carry must not look sealed to a later gate.
    expect(readRealmFeedSlot('{"epoch":3,"sig":""}')).toEqual({ epoch: 3 });
  });

  it("★ the clock folds a MIXED board — sealed beside bare ★", () => {
    // The migration case, stated as a property: a board mid-transition still reads whole.
    const board = new Map([
      [realmFeedSlotUri(REALM, A), realmFeedSlotValue({ epoch: 2 })],
      [realmFeedSlotUri(REALM, B), realmFeedSlotValue({ epoch: 5, sig: "cc".repeat(32) })],
    ]);
    const p = cabalRealmMaintenanceProvenance(REALM, board);
    expect(p.maintainerCount).toBe(2);
    expect(p.effectiveEpoch).toBe(5);
  });

  it("★ a malformed slot does not drop its NEIGHBOURS ★", () => {
    const board = new Map([
      [realmFeedSlotUri(REALM, A), "garbage"],
      [realmFeedSlotUri(REALM, B), "3"],
    ]);
    const p = cabalRealmMaintenanceProvenance(REALM, board);
    expect(p.maintainers.map((m) => m.writerId)).toEqual([B]);
  });
});
