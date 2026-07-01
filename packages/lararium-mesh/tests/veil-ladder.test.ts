/**
 * veil-ladder — the three rungs (throwaway → lived → handle). Tests: rep is born at the
 * lived rung (not below, not granted above); persistence spends anonymity (linkAge climbs);
 * ROTATION carries rep + resets the linkability clock (over a real veil-crossing HOLD); the
 * pledge lifts earned standing on a voucher-edge; the burn is the price.
 */
import { describe, test, expect } from "vitest";
import {
  throwawayVeil, persistToLived, earnRep, rotate, pledgeToHandle, burn, linkability,
  crossVeil, type Voucher, type PersonaPath,
} from "../src/index.js";

const SEED = new Uint8Array(32).fill(0x07);
const GUILD: Voucher = { voucherKeyHex: "0xguild_amorphous_dreams", stakedRep: 50 };

describe("veil-ladder — the three rungs of a self", () => {
  test("the THROWAWAY floor: a key, no name, no rep, no history", () => {
    const v = throwawayVeil("0xthrowaway_key");
    expect(v.rung).toBe("throwaway");
    expect(v.rep).toBe(0);
    expect(v.petname).toBeUndefined();
    expect(v.published).toBe(false);
  });

  test("rep is BORN at the lived rung — a throwaway earns nothing", () => {
    const t = throwawayVeil("0xk");
    expect(() => earnRep(t, 5)).toThrow(/born at the LIVED rung/);
    const lived = persistToLived(t, "wanderer");
    expect(lived.rung).toBe("lived");
    expect(lived.petname).toBe("wanderer");
  });

  test("persistence spends anonymity — earning works climbs rep AND the linkability clock", () => {
    let v = persistToLived(throwawayVeil("0xk"));
    v = earnRep(v, 10);
    v = earnRep(v, 15);
    expect(v.rep).toBe(25);
    expect(linkability(v)).toBe(2);   // two acts of works → linkAge 2
  });

  test("ROTATION carries positive rep onto a FRESH key + resets the linkability clock", async () => {
    let v = persistToLived(throwawayVeil("0xanon_A_key"));
    v = earnRep(earnRep(v, 20), 20);           // rep 40, linkAge 2 — the clock is ticking loud
    expect(linkability(v)).toBe(2);
    // the fresh key comes from a real veil-crossing HOLD (unlinkable refound)
    const fresh = await crossVeil(SEED, { handleIndex: 3, contextIndex: 0 } as PersonaPath, "hold");
    const rotated = rotate(v, fresh.verifyingKey);
    expect(rotated.rep).toBe(40);              // the earned name carries
    expect(rotated.verifyingKey).toBe(fresh.verifyingKey);   // a new, unlinkable key
    expect(rotated.verifyingKey).not.toBe("0xanon_A_key");
    expect(linkability(rotated)).toBe(0);      // the clock reset — anonymity restored, rep kept
  });

  test("the PLEDGE lifts a lived anon's EARNED standing into a published Handle; a throwaway can't", () => {
    const t = throwawayVeil("0xk");
    expect(() => pledgeToHandle(t, "FastJack", GUILD)).toThrow(/only a lived anon/);
    const lived = earnRep(persistToLived(throwawayVeil("0xk")), 30);
    const handle = pledgeToHandle(lived, "FastJack", GUILD);
    expect(handle.rung).toBe("handle");
    expect(handle.published).toBe(true);
    expect(handle.petname).toBe("FastJack");
    expect(handle.pledgedBy).toBe("0xguild_amorphous_dreams");   // the slashable pledge-edge
    expect(handle.rep).toBe(30);                                  // the earned standing, lifted not created
  });

  test("the BURN is the price — a Handle forfeits rep + name + publication, drops to the floor", () => {
    const handle = pledgeToHandle(earnRep(persistToLived(throwawayVeil("0xk")), 100), "BurnMe", GUILD);
    const burned = burn(handle, "0xfresh_floor_key");
    expect(burned.rung).toBe("throwaway");
    expect(burned.rep).toBe(0);                 // the accrued standing — gone (dear for the accrued)
    expect(burned.published).toBe(false);
    expect(burned.petname).toBeUndefined();
    // only a Handle burns; a lived anon rotates instead
    const lived = persistToLived(throwawayVeil("0xk2"));
    expect(() => burn(lived, "0xk3")).toThrow(/only a published Handle burns/);
  });

  test("the full lifecycle breathes: throwaway → lived → earn → rotate → pledge → burn → floor", async () => {
    let v = throwawayVeil("0xborn");
    v = persistToLived(v, "nomad");
    v = earnRep(earnRep(v, 12), 8);                                       // lived, rep 20, linkAge 2
    const fresh = await crossVeil(SEED, { handleIndex: 9, contextIndex: 1 } as PersonaPath, "hold");
    v = rotate(v, fresh.verifyingKey);                                    // rep 20, linkAge 0, fresh key
    expect(v.rep).toBe(20);
    expect(linkability(v)).toBe(0);
    v = pledgeToHandle(v, "Nomad-of-the-Dreams", GUILD);                  // → Handle, published
    expect(v.rung).toBe("handle");
    v = burn(v, "0xback_to_floor");                                        // the price
    expect(v.rung).toBe("throwaway");
    expect(v.rep).toBe(0);
  });
});
