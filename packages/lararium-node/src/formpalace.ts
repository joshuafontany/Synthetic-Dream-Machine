/**
 * formpalace — the LIVING-GRAMMAR FORM store: a LOCAL, caller-vector store for the per-turn
 * FORM-vector (the two-planes form-capture's CONTINUOUS plane, encoded). Backed by a "form"
 * collection inside a mempalace instance (the same ChromaDB engine, the SECOND collection beside
 * the palace default), reached through ONE persistent Python holder (`form_encoder.py serve
 * --palace <dir>`). It NEVER federates — local, the eidetic↔grammatical bridge twin to `.structurepalace`.
 *
 * Each turn's move-skeleton (emitMoveSkeleton, P1) + constructicon basis (buildConstructiconBasis,
 * P0) ride to the holder, which ENCODES the sparse fuzzy-membership form-vector (form_encoder, P2)
 * and STORES it as a caller-supplied dense vector (densified to basis.dimension), keyed by the
 * turn's `verbatim_sha` — the SAME key the content drawer carries as `lar_verbatim_sha`, so the
 * FORM graph and the CONTENT graph (the existing verbatim mempalace) fuse on one join key. The
 * embedding model is never invoked (we always supply our own vector), mirroring `.structurepalace`.
 *
 * THE CAP-STACK (the palace-instance #has): formpalace = the SHARED palace transport
 * ({@link PalaceHolderRegistry}, palace-holder.ts) composed with its OWN op-surface —
 * `encode_store`/`query`/`filter`/`get` over the python form-encoder holder. DISTINCT from
 * structurepalace (per-turn form-vectors keyed by verbatim_sha vs per-structure AST drawers keyed by
 * structural hash, no AST payload stored here) but riding the IDENTICAL transport cap — two
 * op-surface shapes, one transport, no god base-class (the sidecar 2-shapes lesson, one up).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace#two-planes
 */

import { resolveFormEncoderSpawn } from "@lararium/mempalace";
import type { MoveSkeleton, ConstructiconBasis, BearingFacets } from "@lararium/tw5/form-layer";

import {
  composePalace,
  livePalaceHolderCount,
  makeServeSpawn,
  type PalaceHolderSpawn,
} from "./palace-holder.js";

/** the palace label — the transport registry key (one holder singleton per label per dir). */
const LABEL = "form";

/** The serializable basis shape the Python encoder consumes (its `index` is re-derived from order). */
export interface SerializedBasis {
  readonly axes: ConstructiconBasis["axes"];
  readonly dimension: number;
}

/** The metadata stamped on a form entry — the where-filterable facets + the content-join key.
 *  Carries the {@link BearingFacets} (bearing_w1/w2/w3/root/path/frag/grade) too: the aim/yield
 *  bearing descended into flat scalars, where-filterable for the STRUCTURED bearing recall path
 *  (multi-graph-recall#makeFormSearch). Stamped off `skeleton.bearing.facets` in
 *  node-capture-engine#makeFormSplitFlush; the python store carries any `bearing_*` key through. */
export interface FormMetadata extends BearingFacets {
  /** the confidence register band (e.g. "synthesis"), for where-filtering */
  readonly register?: string;
  /** the deepest grammar-stack layer the turn touched */
  readonly grammar_layer?: string;
  /** the DECLARED HUD attention grain (0..20 Aperture) — the paragraph-scale recall knob (P6) */
  readonly aperture?: number;
  /** sha256 of the canonical placeholdered-graph — the FORM recurrence key */
  readonly struct_hash?: string;
  /** sha256 of the verbatim turn — the CROSS-GRAPH join key to the content drawer */
  readonly verbatim_sha: string;
}

/** The outcome of an encode+store round-trip. */
export interface FormStoreResult {
  readonly key: string;
  readonly dimension: number;
  readonly count: number;
  readonly conformance: number;
  readonly slor: { readonly live: boolean; readonly model: string | null; readonly reason: string };
  readonly form_vector: { readonly indices: readonly number[]; readonly values: readonly number[] };
}

/** One form-similarity match. */
export interface FormMatch {
  readonly key: string;
  readonly distance: number | null;
  readonly metadata: Record<string, unknown>;
}

/** A stored form entry read back by key. */
export interface FormEntry {
  readonly key: string;
  readonly metadata: Record<string, unknown>;
  readonly document: string | null;
}

export interface FormPalace {
  /**
   * Encode a turn's move-skeleton against the basis, then STORE the form-vector keyed by its
   * `verbatim_sha`. Returns the encode+store outcome. THROWS if the holder did not persist, so the
   * caller never stamps a dangling form reference (the content path stays intact regardless).
   */
  encodeStore(input: {
    skeleton: MoveSkeleton;
    basis: SerializedBasis;
    key: string;
    metadata: FormMetadata;
  }): Promise<FormStoreResult>;
  /** Nearest turns by FORM similarity (encode the query skeleton, then search), optional where-filter. */
  query(input: {
    skeleton: MoveSkeleton;
    basis: SerializedBasis;
    nResults?: number;
    where?: Record<string, unknown>;
  }): Promise<FormMatch[]>;
  /**
   * METADATA-ONLY filter — NO vector. The structured bearing / keyword recall path: match form
   * entries by a `where`-clause alone (chroma `.get(where=…)`), so a bearing root or a register
   * scope yields matches without encoding a query skeleton. `distance` is null on each match (a
   * where-match carries no similarity ranking). A null/empty `where` returns up to `nResults` of
   * the collection; a where matching nothing returns []. (multi-graph-recall#makeFormSearch.)
   */
  filter(input: { where?: Record<string, unknown>; nResults?: number }): Promise<FormMatch[]>;
  /** Read a form entry back by its key (the verbatim_sha), or null if absent. */
  get(key: string): Promise<FormEntry | null>;
  /** Release this reference; the holder process is killed when the last reference closes. */
  close(): Promise<void>;
}

/** Test seam alias: how the holder process is produced (defaults to the python helper). */
export type FormHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `form_encoder.py serve --palace <dir>`. */
const defaultHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveFormEncoderSpawn);

export interface FormPalaceOptions {
  /** per-call RPC timeout (ms); default 60s (covers the one-time chroma open + first encode). */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: FormHolderSpawn;
}

/**
 * Open the FORM store rooted at `dir` — a mempalace instance's "form" collection. Composes the
 * shared transport cap (ref-counted ONE holder per canonical dir) with the form op-surface;
 * `close()` releases this reference and kills the process when the last reference closes.
 */
export function makeFormPalace(dir: string, opts: FormPalaceOptions = {}): FormPalace {
  // Compose the SHARED transport cap; layer only the form op-surface below (the sidecar-2-shapes ward).
  const p = composePalace(LABEL, dir, opts.spawn ?? defaultHolderSpawn, opts.timeoutMs ?? 60_000);

  return {
    async encodeStore({ skeleton, basis, key, metadata }): Promise<FormStoreResult> {
      return (await p.send("encode_store", { key, skeleton, basis, metadata })) as FormStoreResult;
    },

    async query({ skeleton, basis, nResults, where }): Promise<FormMatch[]> {
      const res = (await p.send("query", {
        skeleton, basis, n_results: nResults ?? 10,
        ...(where !== undefined ? { where } : {}),
      })) as { matches: FormMatch[] };
      return res.matches ?? [];
    },

    async filter({ where, nResults }): Promise<FormMatch[]> {
      const res = (await p.send("filter", {
        n_results: nResults ?? 10,
        ...(where !== undefined ? { where } : {}),
      })) as { matches: FormMatch[] };
      return res.matches ?? [];
    },

    async get(key: string): Promise<FormEntry | null> {
      return (await p.send("get", { key })) as FormEntry | null;
    },

    close: p.close,
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveFormHolderCount(): number {
  return livePalaceHolderCount(LABEL);
}
