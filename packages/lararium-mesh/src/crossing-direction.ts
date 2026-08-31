/**
 * crossing-direction — which way a transfer runs, and what that costs.
 *
 * ── ONE DIRECTION RELAXES CONFINEMENT; THE OTHER RAISES IT ──────────────────────────────────────
 * Copying a tiddler from a public bag into a more private one leaves it reaching FEWER readers than
 * the original does. TW5's recipe stack runs on that shape — a user takes a public tiddler and keeps a
 * shadowed copy they may alter — and federation hands every user a public shelf to take from. Nothing
 * leaves, so nothing needs a ceremony.
 *
 * Copying the other way makes material held for few into material held for many, and publication
 * admits no return: no reverse crossing exists, and new residency gets granted outward instead.
 * Information-flow work restricts exactly this direction and permits the inward one freely.
 *
 * ── SO THE COST SITS ON THE OUTWARD CROSSING ────────────────────────────────────────────────────
 * A user may copy and alter a public tiddler into a more private bag. Moving anything from a private
 * bag toward a public one belongs to the kahu-cabal signers, whose quorum carries the integrity that
 * the decision to relax demands — a per-vessel `admin` cap answers for one hand, and a crossing that
 * cannot be walked back wants more hands than one.
 *
 * ── CHEAP DIFFERS FROM UNGATED ──────────────────────────────────────────────────────────────────
 * An inward crossing still answers for its source at `read`. A caller reaching a bag it may not read
 * stays a confused deputy whichever way the copy runs, and the direction changes the price rather than
 * removing it.
 *
 * This names the cost and collects none of it: it holds no keys, verifies no quorum, and reaches no
 * bag. The gate reads it and does the asking.
 */
import { capTierRank, type CapTier } from "./cap-tier.js";

export type CrossingDirection = "inward" | "lateral" | "outward";

export interface CrossingCost {
  readonly direction:   CrossingDirection;
  /** What the SOURCE bag's cap must answer. Outward wants owner authority; inward wants a reader. */
  readonly sourceGrade: "read" | "admin";
  /** Whether the crossing additionally wants a kahu-cabal quorum, which only an outward one does. */
  readonly needsCabal:  boolean;
  /** The direction, and why it costs what it costs. */
  readonly reading:     string;
}

/**
 * Read a crossing's direction from the two publicity tiers.
 *
 * Every step UP the ladder counts as outward, not the extremes alone: a grant from `contract` to
 * `public` relaxes confinement exactly as one from `veil` does, and a rule that watched only the ends
 * would wave through the step that reaches the widest audience.
 */
export function crossingDirection(at: { from: CapTier; to: CapTier }): CrossingCost {
  const from = capTierRank(at.from);
  const to   = capTierRank(at.to);

  if (to > from) {
    return { direction: "outward", sourceGrade: "admin", needsCabal: true,
             reading: `this crossing carries ${at.from} material into ${at.to}, so it RELAXES confinement — `
                    + "material held for few becomes material held for many, and no return crossing exists. "
                    + "Declassifying wants the source owner's authority, and the decision to relax wants the "
                    + "kahu-cabal quorum behind it: one hand cannot answer for an act nobody can walk back." };
  }
  if (to < from) {
    return { direction: "inward", sourceGrade: "read", needsCabal: false,
             reading: `this crossing carries ${at.from} material into ${at.to}, so it RAISES confinement — the `
                    + "copy reaches fewer readers than the original. A shadow copy of a public tiddler into a "
                    + "private bag runs this way, and the recipe stack depends on it staying cheap. The source "
                    + "still answers at read: cheap differs from ungated." };
  }
  return { direction: "lateral", sourceGrade: "read", needsCabal: false,
           reading: `both bags stand at ${at.from}, so this crossing moves nothing across a publicity boundary `
                  + "and relaxes nothing. The source answers at read, because reaching a bag one may not read "
                  + "stays a confused deputy whichever way the copy runs." };
}
