/**
 * node-capture-engine — composes the isomorphic `makeCaptureEngine` (mesh) with node's
 * substrate seams (subprocess flush · fs-WAL reserve). The annotate stays INJECTED so this
 * module never pulls the mempalace barrel — the worker passes the in-VM `$tw.lares.captureAnnotateVm`,
 * tests pass a fake. This is node's row of the per-vessel job table: KEEP the shared palace.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { makeCaptureEngine, canonicalJsonBytes, defaultCryptoProvider, sha256Hex, utf8Bytes } from "@lararium/mesh";
import type { CaptureAnnotate, CaptureDerive, CaptureEngine, CaptureFlush, CapturePost, CaptureRecord, CaptureServo, FlushGate } from "@lararium/mesh";
import type { MoveSkeleton } from "@lararium/tw5/form-layer";

import { makeCaptureReserve } from "./capture-reserve.js";
import { makeSubprocessFlush } from "./capture-flush.js";
import { makeAstPalace, type AstPalace } from "./astpalace.js";
import { makeFormPalace, type FormPalace, type SerializedBasis } from "./formpalace.js";

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
  /** the LOCAL FORM palace dir (never federates) — the routing split emits each turn's move-skeleton
   *  (stashed in-VM as `lar_skeleton` + `lar_basis`) to the living-grammar FORM store, keyed by the
   *  turn's verbatim_sha (the cross-graph join to the content drawer). Absent/`null` DISABLES the form
   *  split (the skeleton/basis are simply dropped from the drawer); no implicit default. */
  readonly formPalaceDir?: string | null;
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

/** The confidence register band (e.g. "synthesis") off the harvest's `lar_confidence` patch field
 *  ("Synthesis:11/20|…"), lowercased — the where-filterable form facet. Absent → "". */
function registerFromPatch(meta: CaptureRecord["metadata"]): string {
  const conf = meta?.["lar_confidence"];
  if (typeof conf !== "string") return "";
  const reg = (conf.split("|")[0] ?? "").split(":")[0] ?? "";
  return reg.trim().toLowerCase();
}

/** The deepest grammar-stack layer the turn touched — `x-memetic` once any classified sigil rode,
 *  else `wikitext` (a plain prose turn never reaches the `<<~` overlay). */
function grammarLayerFromPatch(meta: CaptureRecord["metadata"]): string {
  const sigils = meta?.["lar_sigils"];
  return typeof sigils === "number" && sigils > 0 ? "x-memetic" : "wikitext";
}

/**
 * The FORM ROUTING SPLIT — the form-graph twin of {@link makeAstSplitFlush}. Each record carries the
 * in-VM-emitted move-skeleton (`lar_skeleton`) + constructicon basis (`lar_basis`) — where the
 * harvest, tree, and full self-hosted grammar all coexist. This split routes them to the living-
 * grammar FORM store: the holder ENCODES the fuzzy-membership form-vector and STORES it keyed by the
 * turn's `verbatim_sha` (the SAME key the content drawer keeps as `lar_verbatim_sha` — the two graphs
 * fuse there). The internal `lar_skeleton`/`lar_basis` are STRIPPED from the drawer (they never
 * belong on the content side); the drawer keeps `lar_verbatim_sha` + `lar_form_dim` as the join
 * marker. The form graph is BEST-EFFORT: an encode/store failure (or an absent skeleton) never sinks
 * the capture — the record rides through with the two internal fields dropped, content conserved.
 */
export function makeFormSplitFlush(inner: CaptureFlush, formPalace: FormPalace): CaptureFlush {
  return async (batch: readonly CaptureRecord[]): Promise<number> => {
    const routed: CaptureRecord[] = [];
    for (const rec of batch) {
      const skJson = rec.metadata?.["lar_skeleton"];
      const baJson = rec.metadata?.["lar_basis"];
      if (typeof skJson !== "string" || typeof baJson !== "string") {
        // No in-VM form input (plugin not loaded / pre-form drawer / truncated) — strip any partial
        // internal fields and ride through; nothing to encode.
        if (rec.metadata && ("lar_skeleton" in rec.metadata || "lar_basis" in rec.metadata)) {
          const { lar_skeleton: _s, lar_basis: _b, ...rest } = rec.metadata as Record<string, string | number | boolean>;
          routed.push({ ...rec, metadata: rest });
        } else {
          routed.push(rec);
        }
        continue;
      }
      // Strip the internal form-input fields regardless of outcome — they are not drawer content.
      const { lar_skeleton: _s, lar_basis: _b, ...rest } = rec.metadata as Record<string, string | number | boolean>;
      try {
        const skeleton = JSON.parse(skJson) as MoveSkeleton;
        const basis = JSON.parse(baJson) as SerializedBasis;
        const verbatimSha = await sha256Hex(utf8Bytes(rec.content), defaultCryptoProvider);
        // The FORM recurrence key: the structural hash of the placeholdered graph (the shape, no words).
        const structHash = await sha256Hex(canonicalJsonBytes(skeleton.graph), defaultCryptoProvider);
        const res = await formPalace.encodeStore({
          skeleton,
          basis,
          key: verbatimSha,
          metadata: {
            register: registerFromPatch(rec.metadata),
            grammar_layer: grammarLayerFromPatch(rec.metadata),
            struct_hash: structHash,
            verbatim_sha: verbatimSha,
            // The aim/yield bearing descended to flat where-filterable facets (bearing_w1/w2/w3/
            // root/path/frag/grade) — the one-line read the URI spirit flagged: the in-VM emitter
            // already parsed the RED URI into `skeleton.bearing.facets`; stamp them so the bearing
            // recall path can structured-where-filter on them (dual-graph-recall#makeFormSearch).
            ...skeleton.bearing.facets,
          },
        });
        // The drawer keeps the join key + a marker that a form-vector exists (dimension), set HERE.
        routed.push({ ...rec, metadata: { ...rest, lar_verbatim_sha: verbatimSha, lar_form_dim: res.dimension } });
      } catch {
        // Encode/store failed — keep the capture, drop only the internal form-input fields.
        routed.push({ ...rec, metadata: rest });
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
  const astSplit = astPalaceDir ? makeAstSplitFlush(subprocessFlush, makeAstPalace(astPalaceDir)) : subprocessFlush;
  // The FORM split rides OUTSIDE the AST split (runs first): it consumes the in-VM `lar_skeleton`/
  // `lar_basis`, routes the form-vector to the FORM store, strips those internal fields, then hands
  // the (still lar_ast-bearing) record to the AST split. Both stores come out clean, joined by
  // verbatim_sha. Local-only, never federates; absent/null disables it (no implicit default).
  const formPalaceDir = opts.formPalaceDir ?? null;
  const formSplit = formPalaceDir ? makeFormSplitFlush(astSplit, makeFormPalace(formPalaceDir)) : astSplit;
  // Wing-stamp runs OUTERMOST (always): it decodes the `<wing>/` source_file prefix into
  // `metadata.wing` BEFORE the splits (which preserve it) and the ndjson mine reads it as routing.
  const flush = makeWingStampFlush(formSplit);
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
