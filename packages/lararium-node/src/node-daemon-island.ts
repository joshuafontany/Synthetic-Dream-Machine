/**
 * node-daemon-island — Node.js daemon island entry point.
 *
 * The bound-operator's vessel-only sovereign worker (severed from federation) AND the operator's
 * authn/z home. Composition only: the node sovereign kernel + the keyhive-wired daemon behavior
 * (makeOperatorDaemonBehavior, @lararium/keyhive). The keyhive wiring is identical on browser.
 *
 * Telemetry fold (idempotent): every @daemon CARRIES the capture cap (tending the bound operator's
 * session-capture is a daemon duty). This entry wires its SINK live when the daemon spawn passes a
 * telemetry block via workerData — the node sink (`mine --source ndjson` + fs-WAL + the
 * self-regulating two-loop). Absent → the cap stays inert (a valid resting state; sink not wired).
 * role = capability ≠ platform — this file picks only the node sink.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/node-daemon-island
 */

import { workerData } from "node:worker_threads";

import type { CapturePost } from "@lararium/mesh";
import type { IslandContext } from "@lararium/tw5";

import { makeNodeCaptureEngine } from "./node-capture-engine.js";
import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeOperatorDaemonBehavior } from "@lararium/keyhive/operator-daemon-behavior";

/** The telemetry SINK config the daemon spawn rides via workerData (open-daemon-vm). */
interface DaemonWorkerData {
  readonly telemetry?: {
    readonly palacePath: string;
    readonly spoolDir: string;
    readonly walPath: string;
    readonly quarantinePath: string;
    /** The DURABLE .structurepalace dir (the memory-ast-unfolding bridge — local, never federates). */
    readonly structurePalaceDir?: string;
    /** The DURABLE .formpalace dir (the living-grammar FORM-vector store — local, never federates). */
    readonly formPalaceDir?: string;
    /** Caller-vector routing: verbatim content flows to the SOVEREIGN contentpalace (embed → content-palace
     *  put), NOT the external guest mine. Only `contentDir` crosses workerData (a string); the engine's
     *  embed/content/meta caps use their default sidecar spawns. Present ⇒ the sovereign capture path. */
    readonly callerVector?: { readonly contentDir: string; readonly structured?: boolean };
    readonly mempalaceBin?: string;
    readonly tickMs?: number;
    readonly targetLatencyMs?: number;
    readonly holdingCostPerMs?: number;
  };
}

const t = (workerData as DaemonWorkerData | null)?.telemetry;

// Sink present → wire the standing capture cap LIVE: the node capture-engine (subprocess flush +
// fs-WAL) with the full two-loop self-regulation (servo + derive). Absent → pass nothing; the
// @daemon still carries the cap, inert (idempotent presence).
const extra = t
  ? {
      makeCaptureEngine: (post: CapturePost, ctx: IslandContext) =>
        makeNodeCaptureEngine({
          palacePath: t.palacePath,
          spoolDir: t.spoolDir,
          walPath: t.walPath,
          quarantinePath: t.quarantinePath,
          ...(t.structurePalaceDir !== undefined ? { structurePalaceDir: t.structurePalaceDir } : {}),
          ...(t.formPalaceDir !== undefined ? { formPalaceDir: t.formPalaceDir } : {}),
          ...(t.callerVector !== undefined ? { callerVector: t.callerVector } : {}),
          // ALL ast-parsing runs INSIDE the TW5 engine: the in-realm annotate (capture-annotate-vm)
          // holds the full self-hosted grammar; the worker only INVOKES it across ctx.tw5.$tw (same
          // thread, so its closure executes in-sandbox). No node-side annotate — if the plugin is not
          // loaded the turn persists un-annotated, surfaced loud (drop-honesty), never the regex shadow.
          annotate: (turnText, sourceFile, branch) => {
            const $tw = ctx.tw5.$tw as unknown as {
              lares?: { captureAnnotateVm?: (t: string, s?: string, b?: unknown) => Record<string, string | number> };
            };
            const fn = $tw.lares?.captureAnnotateVm;
            if (!fn) {
              console.warn("[node-daemon-island] $tw.lares.captureAnnotateVm absent (plugin not loaded) — turn persists un-annotated (drop-honesty)");
              return {};
            }
            // Thread the turn-DAG fork-frontier (branch) into the in-VM annotate → buildPatch's 3rd arg.
            return fn(turnText, sourceFile, branch);
          },
          post,
          servo: { targetLatencyMs: t.targetLatencyMs ?? 1000 },
          derive: { holdingCostPerMs: t.holdingCostPerMs ?? 0.001 },
          ...(t.mempalaceBin !== undefined ? { mempalaceBin: t.mempalaceBin } : {}),
        }),
      ...(t.tickMs !== undefined ? { captureTickMs: t.tickMs } : {}),
    }
  : {};

runSovereignWorker((manifest) => makeOperatorDaemonBehavior(manifest, extra));
