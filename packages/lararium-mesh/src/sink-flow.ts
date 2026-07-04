/**
 * sink-flow — compose the CONNECTED half of the gate into one call: feed an event-log through the Sink,
 * tag its class, mint the purple ones. verdict → classifySink(rhythmByPlane, birth) → mintPurpleSink, the
 * crucible floor deriving standing-vs-waived from the feed's own atemporal truth. A cymatic (signal-
 * boundary) candidate DETECTS and mints nothing; a receiver-boundary (purple) one mints at the closure.
 *
 * The DANGLING half — couplingBoundary → project → residual → birth — stays unwired: the residual-
 * projection organ awaits the streaming pass + the operator's rank-k cut and residual-feed rulings.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

import { makeSink, type SinkEvent, type SinkVerdict, type SinkOptions } from "./sink.js";
import { classifySink, type SinkClassVerdict } from "./sink-class.js";
import { mintPurpleSink, type MintedSink, type MintRegistry, type MintOptions } from "./purple-minter.js";
import { couplingBoundary, type BoundaryOpts } from "./directed-boundary.js";
import { projectBoundary, residualComponentEvents, controlLimit, columnsOf } from "./boundary-residual.js";
import type { MeshCoupling } from "./mesh-coupling.js";

export interface SinkFlowResult {
  readonly verdict: SinkVerdict;
  readonly klass: SinkClassVerdict;
  /** The minted purple sink, or null when the candidate detects cymatic / stays sub-birth (no mint). */
  readonly minted: MintedSink | null;
}

/**
 * Run a fed event-log through birth → class → mint. Feed A (temporal) locks a clock and stands on rhythm;
 * feed B (atemporal, `opts.sink.atemporal`) waives standing so a corpus purple still binds. The mint reads
 * the feed's own truth — no caller need remember the waiver.
 */
export function runSinkClassMint(
  events: readonly SinkEvent[],
  registry: MintRegistry,
  mintId: () => string,
  opts: { sink?: SinkOptions; mint?: MintOptions } = {},
): SinkFlowResult {
  const sink = makeSink(opts.sink);
  for (const e of events) sink.ingest(e);
  const verdict = sink.verdict();
  const klass = classifySink(sink.rhythmByPlane(), verdict.birth);
  const minted = mintPurpleSink(verdict, klass, registry, mintId, opts.mint);
  return { verdict, klass, minted };
}

export interface BoundaryResidualOpts {
  readonly boundary?: Omit<BoundaryOpts, "directed">;
  /** The Qα control-limit false-positive level — the ONE operator dial (default 0.05, tunable). */
  readonly alpha?: number;
  readonly sink?: SinkOptions;
  readonly mint?: MintOptions;
}

/**
 * The DIRECTED RESIDUAL BRIDGE (fork 1), wired end-to-end: a directed coupling → the smooth boundary
 * subspace W* → per-frame residual off it → per-node component events → birth/class/mint. The residual
 * (the rough surprise) drives the sink: cross-plane corroboration births, recurrence stands. `refFrames`
 * (a reference/normal window) calibrate the per-node control limit Qα; the node names ride the coupling's
 * own children.
 */
export function runBoundaryResidualFlow(
  coupling: MeshCoupling,
  frames: readonly (readonly number[])[],
  refFrames: readonly (readonly number[])[],
  registry: MintRegistry,
  mintId: () => string,
  opts: BoundaryResidualOpts = {},
): SinkFlowResult {
  const boundary = couplingBoundary(coupling, opts.boundary ?? {});
  const deflate = columnsOf(boundary.eigenbasis, boundary.trivialModes);
  const refResiduals = refFrames.map((f) => projectBoundary(f, boundary.Wstar, deflate).residualVec);
  const qAlpha = controlLimit(refResiduals, opts.alpha ?? 0.05);
  const sink = makeSink(opts.sink);
  for (const f of frames) {
    const proj = projectBoundary(f, boundary.Wstar, deflate);
    for (const e of residualComponentEvents(proj, coupling.children, qAlpha)) sink.ingest(e);
  }
  const verdict = sink.verdict();
  const klass = classifySink(sink.rhythmByPlane(), verdict.birth);
  const minted = mintPurpleSink(verdict, klass, registry, mintId, opts.mint);
  return { verdict, klass, minted };
}
