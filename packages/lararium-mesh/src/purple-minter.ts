/**
 * purple-minter — mint a RECEIVER-BOUNDARY (purple) sink at the cross-plane closure. A cymatic sink gets
 * DETECTED (it sits in the data); only a purple one — present in no single plane, bridged where the
 * planes cross — the receiver MINTS. The mint carries a UUID-first pet-name (named before understood), a
 * QUANTIZED closure-vector (the metameric-collapse key — many event-logs landing in one cell collapse to
 * ONE sink), and the co-attesting planes the ring wrapped. The crucible-before-binding floor (commit-dial)
 * rides in the mint: a PROPOSED mint stands minted-but-unbound until it crosses the floor.
 *
 * The pet-name generator arrives INJECTED (mintId) — a runtime passes crypto.randomUUID; a test passes a
 * counter, so the mint stays deterministic. The Ki-plane bridging node rides back as data (the planes it
 * joins), never a side-effect — the caller wires it into the reaction-graph.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

import type { SinkVerdict } from "./sink.js";
import type { SinkClassVerdict } from "./sink-class.js";
import { commitDial, type CommitVerdict, type CommitFloor } from "./commit-dial.js";

export interface MintedSink {
  /** The UUID-first pet-name — gibberish before the sink earns a truer name. */
  readonly petName: string;
  /** The quantized closure-vector — the metameric key; many logs in one cell collapse to one sink. */
  readonly closureVector: readonly number[];
  /** The co-attesting planes the receiver's ring wrapped into being. */
  readonly planes: readonly string[];
  /** The purple invariant — a receiver-boundary sink lives in NO single plane. */
  readonly presentInNoPlane: true;
  /** The crucible-before-binding verdict — RULED binds, PROPOSED stands minted-but-unbound. */
  readonly commit: CommitVerdict;
}

export interface MintRegistry {
  /** The pet-name already minted for this closure-key, or undefined. */
  lookup(key: string): string | undefined;
  /** Bind a closure-key to its pet-name (the metameric-collapse memory). */
  record(key: string, petName: string): void;
}

/** A Map-backed mint registry — the metameric-collapse memory (closure-key → pet-name). */
export function makeMintRegistry(): MintRegistry {
  const m = new Map<string, string>();
  return { lookup: (k) => m.get(k), record: (k, p) => void m.set(k, p) };
}

export interface MintOptions {
  /** Agreement-cell size for the closure-vector quantization (the metameric grain). Default 0.1. */
  readonly quantum?: number;
  /** The crucible floor the mint binds against (atemporal feeds waive standing). */
  readonly floor?: CommitFloor;
}

/**
 * Mint a purple (receiver-boundary) sink, gated by the crucible floor. Returns null for a cymatic/none
 * candidate (those get detected, never minted). A metameric match (same quantized closure-vector) returns
 * the SAME pet-name — many-to-one collapse. The mint carries its commit verdict; a PROPOSED mint stands
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

  const quantum = opts.quantum ?? 0.1;
  const commit = commitDial(
    { born: verdict.birth.born, rigid: verdict.standing.rigid, supersaturation: verdict.supersaturation },
    opts.floor,
  );

  // The metameric key: quantize each plane's agreement into a cell; many spectra → one cone-activation.
  const cells = verdict.planeSignals.map((p) => Math.round(p.agreement / quantum));
  const key = cells.join(",");
  const existing = registry.lookup(key);
  const petName = existing ?? mintId();
  if (!existing) registry.record(key, petName);

  return {
    petName,
    closureVector: cells.map((c) => c * quantum),
    planes: verdict.planeSignals.map((p) => p.plane),
    presentInNoPlane: true,
    commit,
  };
}
