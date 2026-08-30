/**
 * floor-cure — what to tell someone whose vessel refuses at the waking floor.
 *
 * ── TWO STATES, ONE REFUSAL ─────────────────────────────────────────────────────────────────────
 * A vessel at the floor holds no face, and the daemon says so from inside its island — where it can
 * see its own boot and nothing else. Two very different situations reach that same sentence:
 *
 *   NO FACE ANYWHERE     nothing has been minted. Minting one is the cure.
 *   A FACE ON DISK       faces stand, and this daemon booted before they did. It will refuse every
 *                        sovereign act until it is stood again, and minting another changes nothing.
 *
 * Measured on the founding rehearsal: the vessel stood faceless, three kahu were minted, and the
 * seed then refused with "light one with `lares persona new 0`" — sending the operator to create a
 * fourth persona while three stood. Every sovereign act after the mint failed the same way.
 *
 * The daemon cannot tell these apart; the CLI can, because the faces are on ITS disk. So the cure is
 * corrected at the surface that can see, and only where the daemon's own words leave it wrong.
 */
import { describe, it, expect } from "vitest";
import { floorCure } from "../src/floor-cure.js";

const FLOOR = "[daemon] this vessel stands at the waking floor and holds no face — "
            + "light one with `lares persona new 0 --name '<label>'` before any persona-scoped act.";

describe("floor-cure — the refusal keeps its reading, the cure follows the disk", () => {
  it("★ a face on disk turns the cure into the LIFT, not another mint ★", () => {
    const c = floorCure(FLOOR, { faceOnDisk: true });
    expect(c).not.toBeNull();
    expect(c).toMatch(/lares vessel stand/);
    // And it must NOT keep telling a person to mint what they already have.
    expect(c).not.toMatch(/persona new/);
  });

  it("★ with no face on disk the daemon's own cure already stands ★", () => {
    // Nothing to correct: minting really is the move.
    expect(floorCure(FLOOR, { faceOnDisk: false })).toBeNull();
  });

  it("★ a refusal that is not the floor is never rewritten ★", () => {
    // The correction is narrow by design — a surface that re-worded every error would bury the
    // daemon's own reading under a guess.
    expect(floorCure("[daemon] the vault holds shut — `lares vault open`", { faceOnDisk: true })).toBeNull();
    expect(floorCure("verb \"sweep\" timed out after 120000ms", { faceOnDisk: true })).toBeNull();
  });

  it("the PersonaGroup-plane spelling of the same floor gets the same correction", () => {
    const plane = "[daemon] this vessel stands at the waking floor and holds no PersonaGroup plane — "
                + "light a face with `lares persona new 0 --name '<label>'`.";
    expect(floorCure(plane, { faceOnDisk: true })).toMatch(/lares vessel stand/);
  });

  it("★ the cure says WHY, so a person can tell this from a broken vessel ★", () => {
    const c = floorCure(FLOOR, { faceOnDisk: true }) ?? "";
    expect(c).toMatch(/booted|stood|before/i);
    expect(c.length).toBeGreaterThan(40);
  });
});
