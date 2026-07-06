/**
 * wiki-coherence-projection — the wiki-sensorium's consistency radius made a LIVE coherence
 * indicator. The SECOND projection-nalu over the same wiki island, twin of tw5-projection.
 *
 * The pattern integrity (projection-nalu):
 *   SOURCE (the wiki's own consistency read — the consistency keystone's {@link WikiStoreAdapter} over the live
 *           CompositeStore)
 *     → forward-pass (projectCoherenceIndicator, PURE — a `radius reading → indicator frame` map)
 *     → NALU (a COALESCE {@link CoalesceGate} — newest-wins, a burst of wikistore changes collapses
 *             to one re-read; intermediates fade, a projection not a WAL)
 *     → SINK (a DOM coherence indicator — the ONLY platform seam; it lives in @lararium/browser,
 *             swapped per platform, `role = capability ≠ platform`).
 *
 * Where tw5-projection carries the RENDERED story river (HTML+CSS), this carries the sensorium's
 * SELF-READING: does the wiki COHERE (radius 0 → the li-planes glue) or FRACTURE (radius >0 → an
 * obstruction, localized to the offending tiddler(s) — the consistency keystone already names them). Same coalesce family,
 * same post→main-thread shape.
 *
 * THE ORGAN STAYS PLATFORM-BLIND. {@link projectCoherenceIndicator} touches no DOM — it maps a
 * radius reading to an indicator frame. {@link wireCoherenceProjection} owns only the gate and two
 * injected seams (read the source, emit the frame). The DOM write swaps in at the sink alone.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-coherence-projection
 */

import type { ConsistencyRadius } from "@lararium/mesh";
import { CoalesceGate } from "@lararium/mesh";
import type { IslandContext } from "./island-context.js";
import { WikiStoreAdapter } from "./wiki-store-adapter.js";

/** The `IslandMsg_Event.listenable` discriminator for a coherence indicator frame. */
export const COHERENCE_FRAME = "coherence:frame";

/** Coalesce window (ms) — a burst of wikistore changes collapses to one consistency re-read. Pinned
 *  to the display frame like tw5-projection's window (the newest-wins projection's optimal window IS
 *  the frame interval; there is nothing to servo — role = physics ≠ uniformity). */
export const COHERENCE_COALESCE_MS = 24;

/** How the wiki's cross-plane li-radius READS as a coherence posture — the three ways the planes stand. */
export type CoherenceStatus = "coherent" | "obstructed" | "indeterminate";

/**
 * The indicator FRAME — what the DOM sink renders. A pure projection of one {@link ConsistencyRadius}
 * reading; it carries no DOM and no platform. `obstructing` names the tiddler(s) where the planes
 * fracture (empty when they glue). The wire serializes `obstructing` (the event payload admits only
 * scalars); the sink receives it back as a list.
 */
export interface CoherenceIndicatorFrame {
  readonly status: CoherenceStatus;
  /** the Robinson radius the read carried (0 when it glues or reads vacuous). */
  readonly radius: number;
  /** a real global section stands — the li-planes glue (radius 0, non-vacuous). */
  readonly glues: boolean;
  /** no engineered overlap constrained the read — a vacuous 0 that says nothing (the consistency keystone's caution a). */
  readonly vacuous: boolean;
  /** the tiddler(s) where the planes disagree — the consistency keystone's localized obstruction locus (empty when coherent). */
  readonly obstructing: readonly string[];
  /** a human line the indicator surfaces, verb-forward. */
  readonly label: string;
}

/**
 * PURE ORGAN — map a consistency-radius reading to a coherence indicator frame. No DOM, no platform:
 * a `radius reading → indicator frame` function the node witnesses directly.
 *
 *   glues (radius 0, non-vacuous) → the planes GLUE → a coherent frame.
 *   radius > 0                    → the planes FRACTURE → an obstruction frame naming the tiddler(s).
 *   vacuous                       → no overlap constrained the read → an indeterminate frame (not a glue).
 */
export function projectCoherenceIndicator(reading: ConsistencyRadius): CoherenceIndicatorFrame {
  if (reading.vacuous) {
    return {
      status: "indeterminate",
      radius: 0,
      glues: false,
      vacuous: true,
      obstructing: [],
      label: "coherence reads indeterminate — no engineered overlap constrains the planes (a vacuous read)",
    };
  }
  if (reading.glues) {
    return {
      status: "coherent",
      radius: 0,
      glues: true,
      vacuous: false,
      obstructing: [],
      label: "the wiki coheres — structure and form glue on every tiddler",
    };
  }
  const obstructing = [...reading.obstructionLocus];
  const where = obstructing.length > 0 ? obstructing.join(", ") : "an unlocalized overlap";
  return {
    status: "obstructed",
    radius: reading.radius,
    glues: false,
    vacuous: false,
    obstructing,
    label: `the planes fracture (radius ${reading.radius}) at: ${where}`,
  };
}

/** The seams a coherence projector injects — the SOURCE read and the frame EMIT, plus the gate window. */
export interface CoherenceProjectionSeams {
  /** SOURCE: read the wiki's current consistency radius (async — the adapter folds the live store). */
  readonly read: () => Promise<ConsistencyRadius>;
  /** deliver a coalesced frame toward the main-thread sink; `rev` rides monotone so a stale frame drops. */
  readonly emit: (frame: CoherenceIndicatorFrame, rev: number) => void;
  /** the coalesce window (ms); defaults to {@link COHERENCE_COALESCE_MS}. */
  readonly windowMs?: number;
  /** timer seam (deterministic tests); forwarded to the {@link CoalesceGate}. */
  readonly setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  readonly clearTimer?: (h: ReturnType<typeof setTimeout>) => void;
}

/** A running coherence projector — `mark()` on each source move; `dispose()` at teardown. */
export interface CoherenceProjector {
  /** the SOURCE moved — coalesce a re-read (a burst collapses to one flush, newest-wins). */
  mark(): void;
  /** stop the projector — drops any armed flush (teardown). */
  dispose(): void;
}

/**
 * PLATFORM-BLIND WIRING — hold a {@link CoalesceGate} over the injected read/emit seams. Each `mark()`
 * arms one coalesced flush; at the crest the gate re-reads the SOURCE lazily (a burst collapsed to one
 * read), projects the indicator, and emits it with the gate's monotone `rev`. The async read rides
 * fire-and-forget: a read that resolves out of order carries its own older `rev`, so the main-thread
 * sink drops it (the coalesce ordering guarantee's main-thread half).
 */
export function wireCoherenceProjection(seams: CoherenceProjectionSeams): CoherenceProjector {
  const gate = new CoalesceGate({
    windowMs: seams.windowMs ?? COHERENCE_COALESCE_MS,
    onFlush: (rev) => {
      void seams.read().then((reading) => {
        seams.emit(projectCoherenceIndicator(reading), rev);
      });
    },
    ...(seams.setTimer ? { setTimer: seams.setTimer } : {}),
    ...(seams.clearTimer ? { clearTimer: seams.clearTimer } : {}),
  });
  return {
    mark: () => gate.mark(),
    dispose: () => gate.dispose(),
  };
}

/**
 * Mount the coherence projection on a live wiki island (the browser twin runs alongside
 * `mountProjection`). Reads the island's OWN composite through {@link WikiStoreAdapter}, coalesces on
 * the wikistore change beat, and posts each frame as a {@link COHERENCE_FRAME} event to the main
 * thread. `obstructing` serializes to JSON on the wire (the event payload admits only scalars); the
 * main side parses it back for the sink. Returns the `onBoot` teardown.
 */
export function mountCoherenceProjection(ctx: IslandContext): () => void {
  const adapter = new WikiStoreAdapter(ctx.composite);
  const projector = wireCoherenceProjection({
    read: () => adapter.consistency(),
    emit: (frame, rev) => {
      ctx.post({
        schema_version: 1,
        type: "event",
        wikiUri: ctx.wikiUri,
        listenable: COHERENCE_FRAME,
        payload: {
          status: frame.status,
          radius: frame.radius,
          glues: frame.glues,
          vacuous: frame.vacuous,
          obstructing: JSON.stringify([...frame.obstructing]),
          label: frame.label,
          rev,
        },
      });
    },
  });

  // Widen the booted $tw for the loose wiki surface (the same loose-access the cameras + tw5-projection
  // take) — the change beat the projector coalesces on.
  const tw = ctx.tw5.$tw as unknown as Record<string, any>;
  const onChange = (): void => projector.mark();
  tw.wiki.addEventListener("change", onChange);

  // First frame — the island's coherence the moment it breathes.
  projector.mark();

  return () => {
    projector.dispose();
    tw.wiki.removeEventListener("change", onChange);
  };
}
