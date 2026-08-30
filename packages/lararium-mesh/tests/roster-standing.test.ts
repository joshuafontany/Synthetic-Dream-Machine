/**
 * roster-standing — what a seated quorum SURVIVES, said before it has to.
 *
 * ── A VALID QUORUM CAN STILL BE A TRAP ──────────────────────────────────────────────────────────
 * The threshold derives majority over what stood, so two chairs derive a threshold of two — every
 * kahu must sign, every time. That roster is perfectly valid and passes every gate, and the day one
 * seat is lost the Nexus can never reach quorum again. Nothing can be signed, including the rotation
 * that would repair it.
 *
 * The number that matters is not the threshold but what remains beneath it: `seated - threshold` is
 * how many chairs may go dark before the quorum locks. Three chairs over a threshold of two survive
 * one loss; two chairs over two survive none.
 *
 * ── WHY IT SPEAKS AT SEATING RATHER THAN AT FAILURE ─────────────────────────────────────────────
 * A locked roster announces itself when an operator needs to sign something and cannot, which is the
 * worst moment to learn it and the one moment nothing can be done. The reading costs nothing and the
 * cure — one more seat — is only available beforehand.
 *
 * It NAMES rather than refuses: a two-chair civic nexus may be exactly what an operator intends for a
 * house of two, and a reading that blocked it would be wrong about somebody's life.
 */
import { describe, it, expect } from "vitest";
import { rosterStanding, seedFloorVerdict } from "../src/roster-standing.js";

describe("roster-standing — what the quorum survives", () => {
  it("★ two chairs over a threshold of two survive NOTHING, and say so ★", () => {
    const r = rosterStanding({ seated: 2, threshold: 2 });
    expect(r.tolerance).toBe(0);
    expect(r.fragile).toBe(true);
    expect(r.reading).toMatch(/2 of 2/);
    // The cure is only available now, so it rides the reading.
    expect(r.reading).toMatch(/one more seat|another seat/i);
  });

  it("★ three chairs over two survive one loss — no warning earned ★", () => {
    const r = rosterStanding({ seated: 3, threshold: 2 });
    expect(r.tolerance).toBe(1);
    expect(r.fragile).toBe(false);
    expect(r.reading).toMatch(/2 of 3/);
  });

  it("★ a lone chair is named as the single point it is ★", () => {
    const r = rosterStanding({ seated: 1, threshold: 1 });
    expect(r.tolerance).toBe(0);
    expect(r.fragile).toBe(true);
    expect(r.reading).toMatch(/1 of 1/);
  });

  it("five over three survive two", () => {
    expect(rosterStanding({ seated: 5, threshold: 3 }).tolerance).toBe(2);
    expect(rosterStanding({ seated: 5, threshold: 3 }).fragile).toBe(false);
  });

  it("★ an UNSEATED roster is not fragile — it is unseated, and says that instead ★", () => {
    // The fail-closed threshold is MAX_SAFE_INTEGER, which would compute a wildly negative
    // tolerance and read as the most fragile roster imaginable. It holds no chairs at all.
    const r = rosterStanding({ seated: 0, threshold: Number.MAX_SAFE_INTEGER });
    expect(r.fragile).toBe(false);
    expect(r.seated).toBe(false);
    expect(r.reading).toMatch(/no kahu|nobody|unseated/i);
  });

  it("★ every reading says what it costs, never only what it is ★", () => {
    for (const args of [{ seated: 2, threshold: 2 }, { seated: 3, threshold: 2 }, { seated: 1, threshold: 1 }]) {
      expect(rosterStanding(args).reading.length).toBeGreaterThan(30);
    }
  });
});

describe("the seed floor — a Nexus never founds below three chairs", () => {
  it("★ two chairs REFUSE at genesis, however sound they look ★", () => {
    // Two seats derive a threshold of two, which is unanimity: the roster locks on its first loss,
    // and the act that would repair it needs the quorum it just lost. A warning is the wrong shape
    // for a state with no exit — the seed refuses, and the operator seats a third.
    const v = seedFloorVerdict({ seated: 2, isGenesis: true });
    expect(v.ok).toBe(false);
    expect(v.why).toMatch(/three|3/i);
  });

  it("★ one chair refuses — a Nexus is not a person ★", () => {
    expect(seedFloorVerdict({ seated: 1, isGenesis: true }).ok).toBe(false);
  });

  it("★ three chairs stand — the smallest roster that survives a loss ★", () => {
    expect(seedFloorVerdict({ seated: 3, isGenesis: true }).ok).toBe(true);
    expect(seedFloorVerdict({ seated: 7, isGenesis: true }).ok).toBe(true);
  });

  it("★ the floor binds the SEED, never a roster already standing ★", () => {
    // A live chain that has lost a kahu is already in trouble; refusing to re-seat it would strand
    // the operator in exactly the state the floor exists to prevent. The floor guards the founding.
    expect(seedFloorVerdict({ seated: 2, isGenesis: false }).ok).toBe(true);
  });

  it("★ the refusal says what to do next, not merely what it refused ★", () => {
    const v = seedFloorVerdict({ seated: 2, isGenesis: true });
    expect(v.why).toMatch(/persona new/);
    expect(v.why.length).toBeGreaterThan(60);
  });
});
