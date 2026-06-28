/**
 * node-capture-engine — composes the isomorphic `makeCaptureEngine` (mesh) with node's
 * substrate seams (subprocess flush · fs-WAL reserve). The annotate stays INJECTED so this
 * module never pulls the mempalace barrel — the worker passes `defaultAnnotate`, tests pass
 * a fake. This is node's row of the per-vessel job table: KEEP the shared palace.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { dirname, join } from "node:path";

import { makeCaptureEngine } from "@lararium/mesh";
import type { CaptureAnnotate, CaptureDerive, CaptureEngine, CaptureFlush, CapturePost, CaptureRecord, CaptureServo, FlushGate } from "@lararium/mesh";

import { makeCaptureReserve } from "./capture-reserve.js";
import { makeSubprocessFlush } from "./capture-flush.js";
import { makeAstPalace, type AstPalace } from "./astpalace.js";

export interface NodeCaptureEngineOptions {
  /** palace path passed to `mine --source ndjson --palace` */
  readonly palacePath: string;
  /** dir for transient NDJSON flush-batch files */
  readonly spoolDir: string;
  /** write-ahead log path (durable, all records) */
  readonly walPath: string;
  /** dead-letter quarantine path */
  readonly quarantinePath: string;
  /** the forward annotate pass (worker: `defaultAnnotate`; tests: a fake) */
  readonly annotate: CaptureAnnotate;
  /** the LOCAL `.astpalace` dir (never federates). Default: `<dirname(spoolDir)>/astpalace`. The
   *  routing split writes each turn's AST here keyed by structural hash; the mempalace drawer keeps
   *  only `lar_ast_hash`. Pass `null` to DISABLE the split (the inline `lar_ast` then rides through). */
  readonly astPalaceDir?: string | null;
  readonly gate?: FlushGate;
  readonly mempalaceBin?: string;
  readonly timeoutMs?: number;
  /** OUT family: the coalesced stats-frame sink (the worker posts to parentPort). */
  readonly post?: CapturePost;
  /** OUT coalesce window (ms); default 50. */
  readonly outWindowMs?: number;
  /** self-regulation (fast loop): each flush servos the gate toward the latency set-point. */
  readonly servo?: CaptureServo;
  /** the derivation (slow loop): periodically re-anchor the gate from measured cost/rate (EBQ). */
  readonly derive?: CaptureDerive;
  /** test injection for the flush subprocess */
  readonly spawn?: (bin: string, args: readonly string[]) => Promise<{ stdout: string }>;
}

/**
 * The ROUTING SPLIT — the cleanest seam: the LAST point the node controls before a batch crosses
 * into the (external) mempalace via `mine`. For each record carrying an inline `lar_ast`, route the
 * parse tree to the LOCAL `.astpalace` (keyed by its structural hash, bound to its verbatim), strip
 * the inline tree from the drawer metadata, and leave behind `lar_ast_hash` (the cid reference). The
 * two stores come out clean: VERBATIM + provenance + `lar_ast_hash` in the mempalace drawer,
 * STRUCTURE in `.astpalace`, joined by the hash. A parse/store failure NEVER sinks the capture — the
 * record then rides through with its inline `lar_ast` intact (drop-honesty, capture conserved).
 */
export function makeAstSplitFlush(inner: CaptureFlush, astPalace: AstPalace): CaptureFlush {
  return async (batch: readonly CaptureRecord[]): Promise<number> => {
    const routed: CaptureRecord[] = [];
    for (const rec of batch) {
      const astJson = rec.metadata?.["lar_ast"];
      if (typeof astJson !== "string") {
        routed.push(rec); // no inline tree (truncated/absent) — nothing to split
        continue;
      }
      try {
        const tree = JSON.parse(astJson);
        const hash = await astPalace.put(tree, { source_file: rec.source_file, content: rec.content });
        const { lar_ast: _dropped, ...rest } = rec.metadata as Record<string, string | number | boolean>;
        routed.push({ ...rec, metadata: { ...rest, lar_ast_hash: hash } });
      } catch {
        routed.push(rec); // parse/store failed — keep the inline tree, never lose the turn
      }
    }
    return inner(routed);
  };
}

/** Build the node telemetry engine (the isomorphic worker + node seams). */
export function makeNodeCaptureEngine(opts: NodeCaptureEngineOptions): CaptureEngine {
  const subprocessFlush = makeSubprocessFlush({
    spoolDir: opts.spoolDir,
    palacePath: opts.palacePath,
    ...(opts.mempalaceBin !== undefined ? { mempalaceBin: opts.mempalaceBin } : {}),
    ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts.spawn !== undefined ? { spawn: opts.spawn } : {}),
  });
  // The AST routing split rides between the engine and the (external) mempalace write. Local-only by
  // construction: a content-addressed file store, never a mesh/Automerge surface. `null` disables it.
  const astPalaceDir =
    opts.astPalaceDir === null ? null : (opts.astPalaceDir ?? join(dirname(opts.spoolDir), "astpalace"));
  const flush = astPalaceDir ? makeAstSplitFlush(subprocessFlush, makeAstPalace(astPalaceDir)) : subprocessFlush;
  const reserve = makeCaptureReserve({ walPath: opts.walPath, quarantinePath: opts.quarantinePath });
  return makeCaptureEngine({
    flush,
    reserve,
    annotate: opts.annotate,
    ...(opts.gate !== undefined ? { gate: opts.gate } : {}),
    ...(opts.post !== undefined ? { post: opts.post } : {}),
    ...(opts.outWindowMs !== undefined ? { outWindowMs: opts.outWindowMs } : {}),
    ...(opts.servo !== undefined ? { servo: opts.servo } : {}),
    ...(opts.derive !== undefined ? { derive: opts.derive } : {}),
  });
}
