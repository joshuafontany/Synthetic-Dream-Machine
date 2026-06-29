/**
 * node-capture-engine — composes the isomorphic `makeCaptureEngine` (mesh) with node's
 * substrate seams (subprocess flush · fs-WAL reserve). The annotate stays INJECTED so this
 * module never pulls the mempalace barrel — the worker passes the in-VM `$tw.lares.captureAnnotateVm`,
 * tests pass a fake. This is node's row of the per-vessel job table: KEEP the shared palace.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

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
  /** the forward annotate pass (worker: the in-VM `$tw.lares.captureAnnotateVm`; tests: a fake) */
  readonly annotate: CaptureAnnotate;
  /** the LOCAL `.astpalace` dir (never federates) — the routing split writes each turn's AST here
   *  keyed by structural hash; the mempalace drawer keeps only `lar_ast_hash`. Pass the DURABLE home
   *  explicitly (node: `larAstPalaceDir()`). Absent/`null` DISABLES the split (the inline `lar_ast`
   *  rides through) — there is NO implicit default: the old `<dirname(spoolDir)>/astpalace` fallback
   *  was a footgun that silently routed ASTs into a transient tmpfs path. */
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
 * The WING STAMP — the per-record routing channel the @daemon `capture` verb otherwise lacks.
 *
 * The capture pipeline carries no wing: the verb takes only `{turnText, sourceFile}`, the in-VM
 * annotate (buildPatch) sets `lar_*` but never `metadata.wing`, and the flush mines `--source ndjson`
 * with NO `--wing` — so a drawer's wing rides ONLY `metadata.wing` (the ndjson adapter, RFC 002 §2.5).
 * Without a wing, every captured turn lands in the `?` wing. The producer (lares capture / subagents)
 * therefore PREFIXES the source_file with `<wing>/` (e.g. `wing_x__spirits/Name__agent-id__run-r.jsonl`);
 * this flush DECODES that prefix back into `metadata.wing` here at the node boundary — entirely on the
 * node substrate, no mesh/tw5 edit. buildPatch is unaffected: it reads the BASENAME, so the prefix is
 * invisible to surface/agent/handle derivation. The record's own wing wins; a record that already
 * carries a wing is left untouched (idempotent).
 */
export function makeWingStampFlush(inner: CaptureFlush): CaptureFlush {
  return async (batch: readonly CaptureRecord[]): Promise<number> => {
    const stamped = batch.map((rec) => {
      const wing = wingFromSourceFile(rec.source_file);
      if (!wing || (rec.metadata && rec.metadata["wing"])) return rec;
      return { ...rec, metadata: { ...(rec.metadata ?? {}), wing } };
    });
    return inner(stamped);
  };
}

/** Decode a `<wing>/…` routing prefix off a capture source_file, else null (no prefix → no wing). */
function wingFromSourceFile(sourceFile: string): string | null {
  const slash = sourceFile.replace(/\\/g, "/").indexOf("/");
  if (slash <= 0) return null;
  const head = sourceFile.slice(0, slash);
  return head.startsWith("wing_") ? head : null;
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
        const { hash, verbatimSha } = await astPalace.put(tree, { source_file: rec.source_file, content: rec.content });
        const { lar_ast: _dropped, ...rest } = rec.metadata as Record<string, string | number | boolean>;
        // The drawer carries BOTH deterministic joins, set HERE at flush: lar_ast_hash → .astpalace
        // (forward), lar_verbatim_sha ↔ the AST entry's provenance (back). No mine-assigned id, no
        // race-to-catchup — both stores compute the same join independently.
        routed.push({ ...rec, metadata: { ...rest, lar_ast_hash: hash, lar_verbatim_sha: verbatimSha } });
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
  // construction: a content-addressed file store, never a mesh/Automerge surface. Absent/null disables
  // it — NO implicit tmpfs default (that footgun silently wrote ASTs to a transient, wiped path).
  const astPalaceDir = opts.astPalaceDir ?? null;
  const split = astPalaceDir ? makeAstSplitFlush(subprocessFlush, makeAstPalace(astPalaceDir)) : subprocessFlush;
  // Wing-stamp runs OUTERMOST (always, AST split or not): it decodes the `<wing>/` source_file prefix
  // into `metadata.wing` BEFORE the split (which preserves it) and the ndjson mine reads it as routing.
  const flush = makeWingStampFlush(split);
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
