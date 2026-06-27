/**
 * has-capture — the IN=accumulate cap (the axon). A sovereign causal island that hosts the
 * isomorphic capture-engine: raw turns arrive over the island SIGNAL channel (the main thread only
 * transports — it never handles the data-plane), the engine WAL-backs + batch-flushes them to the
 * palace on the island's own server tick, and projects coalesced stats frames OUT via `ctx.post`
 * (the OUT=coalesce dendrite — the telemetry twin of the wiki island's `projection:frame`). The
 * capture-engine's own servo keeps the gate self-regulating.
 *
 * role = capability ≠ platform: the engine factory is INJECTED (node: makeNodeCaptureEngine wired
 * to the palace; browser: an idb/relay engine), so this cap imports no substrate and the same
 * `#has capture` stacks on any vessel.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/island-caps
 */

import type { CaptureEngine, CapturePost } from "@lararium/mesh";

import type { IslandCap } from "./island-caps.js";
import type { IslandContext } from "./island-context.js";

/** The OUT-frame listenable (the telemetry twin of PROJECTION_FRAME). */
export const TELEMETRY_FRAME = "telemetry:frame";
/** Default signal type that carries a raw turn IN to a capture island. */
const DEFAULT_ENQUEUE_SIGNAL = "telemetry:place-verb";

export interface CaptureCapOptions {
  /** Build the capture engine given the OUT-frame `post` seam (the cap wires it to `ctx.post`).
   *  The vessel supplies flush/reserve/annotate/servo (node: makeNodeCaptureEngine). */
  readonly makeEngine: (post: CapturePost) => CaptureEngine;
  /** the island's own server tick (ms); default 50 (20 Hz). */
  readonly tickMs?: number;
  /** the signal type that carries a raw turn IN; default "telemetry:place-verb". */
  readonly enqueueSignal?: string;
}

/** A raw turn delivered over the island signal channel (flat or under `args`). */
interface EnqueueSignal {
  readonly turnText?: string;
  readonly sourceFile?: string;
  readonly args?: { readonly turnText?: string; readonly sourceFile?: string };
}

/** The IN=accumulate cap — hosts the capture-engine inside a causal island. */
export function hasCapture(opts: CaptureCapOptions): IslandCap {
  let engine: CaptureEngine | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  const signal = opts.enqueueSignal ?? DEFAULT_ENQUEUE_SIGNAL;
  const tickMs = opts.tickMs ?? 50;

  return {
    name: "capture",
    async onEa(ctx: IslandContext) {
      const post: CapturePost = (frame) =>
        // Event payload is flat scalars (the CRDT/tiddler law) — flatten the stats + the live
        // (breathing) gate; the host reconstructs. gate_depth makes the servo's effect visible.
        ctx.post({
          schema_version: 1,
          type: "event",
          wikiUri: ctx.wikiUri,
          listenable: TELEMETRY_FRAME,
          payload: {
            rev: frame.rev,
            stat_depth: frame.stats.depth,
            stat_failures: frame.stats.failures,
            stat_spilled: frame.stats.spilled,
            stat_deadLettered: frame.stats.deadLettered,
            gate_depth: frame.gate.depth,
            gate_maxWaitMs: frame.gate.maxWaitMs,
            gate_maxDepth: frame.gate.maxDepth,
          },
        });
      const e = opts.makeEngine(post);
      engine = e;
      await e.recover(); // open sessions survive a restart (WAL replay)
      timer = setInterval(() => void e.tick(Date.now()), tickMs);
      return async () => {
        if (timer) clearInterval(timer);
        try {
          await e.tick(Date.now()); // graceful final flush (the WAL also recovers any unfilled batch)
        } catch {
          /* WAL recovers it on next boot */
        }
        e.dispose();
      };
    },
    onSignal(type: string, raw: unknown): boolean {
      if (type !== signal) return false;
      const e = engine;
      if (!e) {
        // Pre-boot: a turn arrived before onEa wired the engine. SURFACE the drop — this turn's
        // text is lost (the WAL holds only already-enqueued records), so never swallow it silently.
        console.warn(`[has-capture] dropped a "${signal}" turn — engine not yet booted (drop-honesty)`);
        return true;
      }
      const msg = raw as EnqueueSignal;
      const turnText = msg.turnText ?? msg.args?.turnText;
      const sourceFile = msg.sourceFile ?? msg.args?.sourceFile;
      if (typeof turnText !== "string" || typeof sourceFile !== "string") {
        console.warn(`[has-capture] dropped a malformed "${signal}" turn — needs string turnText + sourceFile (drop-honesty)`);
        return true;
      }
      void e.enqueue(turnText, sourceFile);
      return true;
    },
  };
}
