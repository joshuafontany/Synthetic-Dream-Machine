/*\
title: lar:///ha.ka.ba/@lararium/tw5/modules/query-derive-vm
type: application/javascript
module-type: startup
\*/
/**
 * query-derive-vm — TW5 startup module: the IN-VM recall query-derive (one-runtime lock, recall leg).
 *
 * The recall twin of {@link captureAnnotateVm}. Publishes
 * `$tw.lares.deriveQuerySkeletonVm(query) → { skeleton, basis } | null`. The @daemon island reaches
 * THIS over the island-protocol channel (`daemon:derive-skeleton-request`); the host's recall verb
 * round-trips a sigil-bearing query string through here, so the markers→vector recall runs the SAME
 * Move→Vec functor capture runs — parse with the FULL self-hosted grammar (getGrammar reads the
 * in-realm SharktoothSigil tiddlers, not the bootstrap subset), fold the meme-ast TREE into the
 * move-skeleton (the structural plane present, NOT `[]`), and pin to the LIVE grammar-cache basis (no
 * disk crutch). One runtime, no fallback: capture and recall apply ONE functor.
 *
 * The skeleton (the linear stream + the placeholdered graph + the parsed bearing) and the serialized
 * basis (`{ axes, dimension }` — the index Map dropped, as capture serializes it) ride back over the
 * channel as plain objects (GP-2). Degrades to `null` (→ the recall keyword/content branch) when the
 * query carries no axis-bearing move token or no basis stands.
 */

// PURE subpath (no Automerge) — the barrel `@lararium/mesh` drags in wasm the plugin build can't bundle.
import { harvestTurnGradient } from "@lararium/mesh/harvest";
import { parseMemeText } from "./meme-ast/index.js";
import type { GrammarRules } from "./meme-ast/types.js";
import { getGrammar } from "./grammar-cache.js";
import { emitMoveSkeleton, buildConstructiconBasis } from "./form-layer/index.js";
import type { MoveSkeleton, ConstructiconAxis } from "./form-layer/index.js";

// TW5 injects $tw as a module parameter (vm.runInContext sandbox); reach it as the injected var.
declare const $tw: { lares?: Record<string, unknown> } | undefined;

/** The serialized constructicon basis — `{ axes, dimension }`, the index Map dropped, the SAME shape
 *  capture persisted (the form-vector space the stored vectors were pinned to). */
export interface SerializedQueryBasis {
  readonly axes: readonly ConstructiconAxis[];
  readonly dimension: number;
}

/** The in-VM query-derive result — the move-skeleton (FULL functor, structural plane present) + the
 *  live basis to vectorize it against. `null` when the query carries no derivable move-form. */
export interface QuerySkeletonDerivation {
  readonly skeleton: MoveSkeleton;
  readonly basis: SerializedQueryBasis;
}

/**
 * The PURE query-derive — the recall twin of the capture annotate's form leg. Mirrors capture
 * EXACTLY: harvest the markers, parse with the full grammar, then {@link emitMoveSkeleton}(harvest,
 * tree) — the meme-ast TREE rides as the graph plane (the structural plane present, the truncation the
 * old node-side deriver suffered now gone). The basis is the LIVE grammar-cache basis (capture pinned
 * the stored vectors to this same in-realm grammar). Returns `null` when the query carries no
 * axis-bearing token (a bare `<<~` water opener / no markers) or no basis stands.
 *
 * `grammar` is injected so the function unit-tests node-side (the startup wraps it with getGrammar()).
 */
export function deriveQuerySkeleton(query: string, grammar?: GrammarRules): QuerySkeletonDerivation | null {
  const harvest = harvestTurnGradient(query);
  const result = parseMemeText("lar:///query", query, grammar);
  // FULL functor — fold the harvest AND the parsed TREE (result.nodes) into the skeleton, identical to
  // capture-annotate-vm; the graph plane carries the placeholdered AST, never the truncated `[]`.
  const skeleton = emitMoveSkeleton(harvest, result.nodes);
  // No axis-bearing move token → no move-form signal; degrade to the keyword/content branch.
  if (!skeleton.stream.some((t) => t.axisId !== null)) return null;
  const basis = buildConstructiconBasis(grammar);
  if (basis.dimension <= 0) return null;
  return { skeleton, basis: { axes: basis.axes, dimension: basis.dimension } };
}

export const name  = "lararium-query-derive-vm";
export const after = ["lararium-grammar-cache"];

export type DeriveQuerySkeletonVm = (query: string) => QuerySkeletonDerivation | null;

export function startup(): void {
  if (!$tw) return;
  const t = $tw as { lares?: { deriveQuerySkeletonVm?: DeriveQuerySkeletonVm } };
  t.lares ??= {};
  // The live in-VM derive: the basis comes from the in-realm grammar-cache (the full self-hosted
  // grammar), NOT a disk cache. Best-effort: a parse fault yields null (→ content-only fusion).
  t.lares.deriveQuerySkeletonVm = (query: string) => {
    try {
      return deriveQuerySkeleton(query, getGrammar() ?? undefined);
    } catch {
      return null;
    }
  };
}
