/**
 * purple-minter — mint a RECEIVER-BOUNDARY (purple) sink at the cross-plane closure. A cymatic sink gets
 * DETECTED (it sits in the data); only a purple one — present in no single plane, bridged where the
 * planes cross — the receiver MINTS. The mint carries a UUID-first pet-name (named before understood), a
 * closure-vector (the metameric-basin key — many event-logs collapsing to the nearest basin within radius
 * become ONE sink), and the co-attesting planes the ring wrapped. The crucible-before-binding floor (commit-dial)
 * rides in the mint: a PROPOSED mint stands minted-but-unbound until it crosses the floor.
 *
 * The pet-name generator arrives INJECTED (mintId) — a runtime passes crypto.randomUUID; a test passes a
 * counter, so the mint stays deterministic. The Ki-plane bridging node rides back as data (the planes it
 * joins), never a side-effect — the caller wires it into the reaction-graph.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/mesh/flow
 */

import type { SinkVerdict } from "./sink.js";
import type { SinkClassVerdict } from "./sink-class.js";
import { commitDial, type CommitVerdict, type CommitFloor } from "./commit-dial.js";
import { DEFAULT_BASIN_RADIUS } from "./arl-dial.js";

export interface MintedSink {
  /** The UUID-first pet-name — gibberish before the sink earns a truer name. */
  readonly petName: string;
  /** The closure-vector — the metameric-basin key; many logs collapsing to the nearest basin become one sink. */
  readonly closureVector: readonly number[];
  /** The co-attesting planes the receiver's ring wrapped into being. */
  readonly planes: readonly string[];
  /** The purple invariant — a receiver-boundary sink lives in NO single plane. */
  readonly presentInNoPlane: true;
  /** The crucible-before-binding verdict — RULED binds, PROPOSED stands minted-but-unbound. */
  readonly commit: CommitVerdict;
}

export interface MintRegistry {
  /** The pet-name of the nearest stored basin WITHIN `radius` of this closure-vector, or undefined —
   *  one nearest-basin query gates dedup (found) vs mint-fresh (none). Replaces the hard-walled grid cell
   *  that false-split two near vectors across a boundary. */
  nearest(vector: readonly number[], radius: number): string | undefined;
  /** Bind a closure-vector to its pet-name (the metameric-basin memory). */
  record(vector: readonly number[], petName: string): void;
  /** The basin count — a gauge on the linear-scan cost (O(size) per query), read by a health-monitor.
   *  A soft cap crossed marks the deferred LSH/attractor-index (Hopfield) as due; never a printf here. */
  size(): number;
}

/** Basins past this count turn the linear nearest-scan expensive — the deferred LSH/Hopfield index's cue. */
export const LINEAR_SCAN_SOFT_CAP = 2048;

/** A basin-registry — the metameric-collapse memory as attractor basins (a closure-vector collapses to the
 *  nearest basin within radius, else mints a fresh one). Linear scan (few sinks); an LSH/attractor index
 *  rides a later pass. */
export function makeMintRegistry(): MintRegistry {
  const basins: { vector: number[]; petName: string }[] = [];
  return {
    nearest(vector, radius) {
      let best: string | undefined;
      let bestDist = radius;
      for (const b of basins) {
        let d = 0;
        for (let i = 0; i < vector.length; i++) {
          const dv = (vector[i] ?? 0) - (b.vector[i] ?? 0);
          d += dv * dv;
        }
        d = Math.sqrt(d);
        if (d <= bestDist) {
          bestDist = d;
          best = b.petName;
        }
      }
      return best;
    },
    record: (vector, petName) => void basins.push({ vector: [...vector], petName }),
    size: () => basins.length,
  };
}

export interface MintOptions {
  /** The basin radius — dedup-collapse within it, mint-fresh outside. Default 0.1 (the dial supplies it). */
  readonly basinRadius?: number;
  /** The crucible floor the mint binds against (atemporal feeds waive standing). */
  readonly floor?: CommitFloor;
}

/**
 * Mint a purple (receiver-boundary) sink, gated by the crucible floor. Returns null for a cymatic/none
 * candidate (those get detected, never minted). A metameric match (a closure-vector within a basin's radius)
 * returns the SAME pet-name — many-to-one collapse. The mint carries its commit verdict; a PROPOSED mint stands
 * minted-but-unbound (crucible-before-binding — the caller never seals a sub-floor sink).
 */
export function mintPurpleSink(
  verdict: SinkVerdict,
  klass: SinkClassVerdict,
  registry: MintRegistry,
  mintId: () => string,
  opts: MintOptions = {},
): MintedSink | null {
  if (klass.sinkClass !== "receiver-boundary") return null; // cymatic/none get DETECTED, never minted

  const basinRadius = opts.basinRadius ?? DEFAULT_BASIN_RADIUS;
  // The floor reads the feed's OWN truth: an atemporal (corpus) sink waives standing (a corpus never
  // re-locks), so the designation carries the authority rather than trusting each caller to remember.
  const floor: CommitFloor = { ...opts.floor, requireStanding: opts.floor?.requireStanding ?? !verdict.atemporal };
  const commit = commitDial(
    { born: verdict.birth.born, rigid: verdict.standing.rigid, supersaturation: verdict.supersaturation },
    floor,
  );

  // The closure-vector: sort by plane NAME (never Map-insertion order — a false split), take each plane's
  // agreement. ONE nearest-basin query gates two outcomes NOW — collapse to a basin within radius (dedup),
  // else mint a fresh one (birth). No hard-walled grid.
  const sorted = [...verdict.planeSignals].sort((a, b) => a.plane.localeCompare(b.plane));
  const closureVector = sorted.map((p) => p.agreement);
  const existing = registry.nearest(closureVector, basinRadius);
  const petName = existing ?? mintId();
  if (!existing) registry.record(closureVector, petName);
  // GAP (grow-a-channel, deferred to D1/track): a HIT dedups to the found basin but DISCARDS the new vector —
  // the basin anchor stays frozen at its FIRST member. Under a drifting stream that anchor goes stale, so a
  // late member can fall outside radius of it and FALSE-SPLIT. True accretion (moving the basin toward its
  // members — a registry.accrete(vector, petName) centroid update) rides the online WRITE pass. The `nearest`
  // /`record` interface already carries the seam; grow slots in without a shape change.

  // GAP (KA-4, deferred): the caller-side reaction-graph bridging-edge stays UNBUILT — the ring closes as
  // returned data (`planes`), not yet as a Ki-graph node. Wire mint → reaction-graph in a follow-up.
  return {
    petName,
    closureVector,
    planes: sorted.map((p) => p.plane),
    presentInNoPlane: true,
    commit,
  };
}
