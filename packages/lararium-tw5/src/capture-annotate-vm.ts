/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/capture-annotate-vm
type: application/javascript
module-type: startup
\*/
/**
 * capture-annotate-vm — TW5 startup module: the IN-VM capture annotate (the one-runtime lock).
 *
 * Publishes `$tw.lares.captureAnnotateVm(turnText, sourceFile) → lar_* patch`. The @daemon (and any
 * other VM — browser, admin) injects THIS into its capture engine as the annotate pass, so all
 * ast-parsing runs INSIDE the TW5 VM, against the FULL self-hosted grammar
 * (getGrammar reads the SharktoothSigil tiddlers present in-realm — not the node-side bootstrap subset).
 *
 * Does three things, all in-VM:
 *   1. PARSE — parseMemeText with the full grammar → the graded meme-ast tree (the AST-parse moves here).
 *   2. HARVEST — buildPatch(harvestTurnGradient(turn)) → the lar_* reading patch (behavior preserved).
 *   3. AST — the parsed tree rides along as `lar_ast` (verbatim + AST, size-capped), with the
 *      gradient's recovery count as `lar_ast_failures`. The tree is right here once we parse in-VM.
 *
 * Deriving the harvest FROM the tree (retiring the regex shadow) is the next tweak — and now it happens
 * entirely in the worker, against this same in-VM parse.
 */

// PURE subpath (no Automerge) — the barrel `@lararium/mesh` drags in wasm the plugin build can't bundle.
import { harvestTurnGradient, buildPatch, fnv1a8, type BranchContext } from "@lararium/mesh/harvest";
import { parseMemeText } from "./meme-ast/index.js";
import { getGrammar } from "./grammar-cache.js";
import { emitMoveSkeleton, buildConstructiconBasis } from "./form-layer/index.js";

// TW5 injects $tw as a module parameter (vm.runInContext sandbox); reach it as the injected var.
declare const $tw: { lares?: Record<string, unknown> } | undefined;

/** The AST is the STORE now (operator: store the full parse-tree, not flat metadata) — so keep the full
 *  tree for any real turn; the ceiling only catches a runaway-pathological case (then `lar_ast_truncated`
 *  flags it, drop-honesty). The PROPER home for a large tree (a blob vs a chroma metadata field) is an
 *  open drawer-schema question — this raises the interim ceiling via the existing path. */
const AST_MAX = 262144;

export const name  = "lararium-capture-annotate-vm";
export const after = ["lararium-grammar-cache"];

export type CaptureAnnotateVm = (turnText: string, sourceFile?: string, branch?: BranchContext) => Record<string, string | number>;

/**
 * The PURE capture annotate — the live in-VM pass extracted from the `$tw` wrapper so it tests
 * node-side against the bootstrap grammar (the query-derive-vm test pattern).
 *
 * `lar_ffz` — the FFZ rhythmic address — is now a NESTED-MEMBERSHIP CONTAINMENT PATH, not a
 * wall-time projection (the prior Date.now() anchor is REJECTED as un-pono — it imputed a global
 * now). buildPatch derives the Arc cell FREE from `sourceFile` (the session-island); here we supply
 * the Pulse cell as the turn's CONTENT-ADDRESS (the inscription atom, `fnv1a8(turnText)` — what the
 * drawer already holds, web3 content-addressing). The Beat cell (the turn) is null-graceful: no
 * clean per-island turn ordinal exists at this capture site, so it stays absent (porous) — a
 * stage-two wiring. The fluid bands (Theme/Measure) are likewise deferred. The "session" profile is
 * the operator-agent exchange-turn tree-root.
 */
export function captureAnnotate(
  turnText: string,
  sourceFile?: string,
  branch?: BranchContext,
): Record<string, string | number> {
  // 2. HARVEST (regex, in-VM) → the lar_* reading patch (existing behavior preserved). `branch`
  //    (the turn-DAG fork-frontier) rides buildPatch's 3rd arg so a same-session fork derives a
  //    DISTINCT handle (the fork-cut); absent ⇒ byte-identical to before. The 4th arg (CaptureContext)
  //    carries the MEMBERSHIP cells: Pulse = the turn's content-address (Beat null-graceful here).
  const harvest = harvestTurnGradient(turnText);
  const patch = buildPatch(
    harvest,
    sourceFile,
    branch,
    { pulse: fnv1a8(turnText), ffzProfile: "session" },
  );
  // 1. PARSE (meme-ast, FULL grammar, in-VM) + 3. AST (ride the tree along). Best-effort: a parse
  //    failure must never sink a capture — the harvest patch still lands.
  try {
    const grammar = getGrammar() ?? undefined;
    const result  = parseMemeText("lar:///turn", turnText, grammar);
    if (result.failures.length) patch["lar_ast_failures"] = result.failures.length;
    const astJson = JSON.stringify(result.meme);
    if (astJson.length <= AST_MAX) patch["lar_ast"] = astJson;
    else patch["lar_ast_truncated"] = astJson.length;
    // 4. FORM (living-grammar two-planes, in-VM — harvest + tree + FULL grammar coexist HERE).
    //    Emit the move-skeleton (P1) + the constructicon basis (P0) and ride them along as
    //    `lar_skeleton` + `lar_basis`. The node-side FORM split (makeFormSplitFlush) consumes them
    //    into the form-vector store and STRIPS them — they never reach the content drawer. The
    //    Python encode+store can't run in-VM, so the heavy lift crosses to the node holder; only
    //    the cheap, grammar-bound emission lives here. Best-effort: never sinks the harvest/AST.
    const skeleton = emitMoveSkeleton(harvest, result.nodes);
    const skJson = JSON.stringify(skeleton);
    if (skJson.length <= AST_MAX) patch["lar_skeleton"] = skJson;
    const basis = buildConstructiconBasis(grammar);
    const baJson = JSON.stringify({ axes: basis.axes, dimension: basis.dimension });
    if (baJson.length <= AST_MAX) patch["lar_basis"] = baJson;
  } catch { /* parse/emit contained — harvest patch already built */ }
  return patch;
}

export function startup(): void {
  if (!$tw) return;
  const t = $tw as { lares?: { captureAnnotateVm?: CaptureAnnotateVm } };
  t.lares ??= {};
  // `lar_ffz` is a membership containment path (Arc = source_file, Pulse = the turn's
  // content-address), NOT a wall-time stamp — so the live wrapper feeds no clock.
  t.lares.captureAnnotateVm = (turnText: string, sourceFile?: string, branch?: BranchContext) =>
    captureAnnotate(turnText, sourceFile, branch);
  // Also expose the gradient parser itself — callable from a LIVE WIKI (a widget, filter, or module) to
  // parse gradient text in-realm with the full grammar. The native text/x-memetic-wikitext path + tooling
  // reach it here; one parser, one runtime.
  (t.lares as Record<string, unknown>)["parseMemeText"] = parseMemeText;
}
