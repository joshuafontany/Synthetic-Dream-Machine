/*\
title: lar:///ha.ka.ba/@lararium/tw5/modules/capture-annotate-vm
type: application/javascript
module-type: startup
\*/
/**
 * capture-annotate-vm — TW5 startup module: the IN-VM capture annotate (the one-runtime lock).
 *
 * Publishes `$tw.lares.captureAnnotateVm(turnText, sourceFile) → lar_* patch`. The @daemon (and any
 * other VM — browser, admin) injects THIS into its capture engine instead of the node-side
 * `defaultAnnotate`, so all ast-parsing runs INSIDE the TW5 VM, against the FULL self-hosted grammar
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
import { harvestTurnGradient, buildPatch } from "@lararium/mesh/harvest";
import { parseMemeText } from "./meme-ast/index.js";
import { getGrammar } from "./grammar-cache.js";

// TW5 injects $tw as a module parameter (vm.runInContext sandbox); reach it as the injected var.
declare const $tw: { lares?: Record<string, unknown> } | undefined;

/** Cap the serialized tree so a pathological turn never bloats a drawer's chroma metadata. */
const AST_MAX = 16000;

export const name  = "lararium-capture-annotate-vm";
export const after = ["lararium-grammar-cache"];

export type CaptureAnnotateVm = (turnText: string, sourceFile?: string) => Record<string, string | number>;

export function startup(): void {
  if (!$tw) return;
  const t = $tw as { lares?: { captureAnnotateVm?: CaptureAnnotateVm } };
  t.lares ??= {};
  t.lares.captureAnnotateVm = (turnText: string, sourceFile?: string) => {
    // 2. HARVEST (regex, in-VM) → the lar_* reading patch (existing behavior preserved).
    const patch = buildPatch(harvestTurnGradient(turnText), sourceFile);
    // 1. PARSE (meme-ast, FULL grammar, in-VM) + 3. AST (ride the tree along). Best-effort: a parse
    //    failure must never sink a capture — the harvest patch still lands.
    try {
      const grammar = getGrammar() ?? undefined;
      const result  = parseMemeText("lar:///turn", turnText, grammar);
      if (result.failures.length) patch["lar_ast_failures"] = result.failures.length;
      const astJson = JSON.stringify(result.meme);
      if (astJson.length <= AST_MAX) patch["lar_ast"] = astJson;
      else patch["lar_ast_truncated"] = astJson.length;
    } catch { /* parse contained — harvest patch already built */ }
    return patch;
  };
}
