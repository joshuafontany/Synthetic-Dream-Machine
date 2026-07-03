/**
 * meta-cap — the node side of the CONSUMED ingest meta-model. Drives the palace-less `meta_io.py`
 * holder, which consumes mempalace's heuristic extractors (`_extract_entities_for_metadata` +
 * `detect_hall`, NO LLM) → the structuring metadata (`entities`, `hall`) a drawer carries. Stamping
 * this at capture turns the flat content palace STRUCTURED, unlocking the consumed rich stack
 * (closet-boost, entity/wing filters, hallways, tunnels). Their code behind the boundary, tunable
 * in-house; palace-less (one holder, the config is the resource).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/nalu
 */

import { resolveMetaSpawn } from "@lararium/mempalace";

import { composeEncoder, livePalaceHolderCount, makeServeSpawn, type PalaceHolderSpawn } from "./palace-holder.js";

/** the holder label — palace-less: ONE meta holder per process. */
const LABEL = "meta";

/** The structuring metadata for a turn: the `entities` (";"-joined) + the `hall` routing. */
export interface MetaAnnotation {
  readonly entities: string;
  readonly hall: string;
}

export interface MetaCap {
  /** Derive a turn's structuring metadata (entities + hall) — heuristic, no LLM. */
  annotate(content: string): Promise<MetaAnnotation>;
  /** Release this reference; the holder process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Test seam alias: how the holder process is produced (defaults to the palace-less python helper). */
export type MetaHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `meta_io.py serve` (NO --palace). */
const defaultHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveMetaSpawn, { palaceless: true });

export interface MetaCapOptions {
  /** per-call RPC timeout (ms); default 30s. */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced. */
  readonly spawn?: MetaHolderSpawn;
}

/** Open the meta-model cap — the shared palace-less holder, driven over line-RPC. */
export function makeMetaCap(opts: MetaCapOptions = {}): MetaCap {
  const p = composeEncoder(LABEL, opts.spawn ?? defaultHolderSpawn, opts.timeoutMs ?? 30_000);
  return {
    async annotate(content): Promise<MetaAnnotation> {
      const r = (await p.send("annotate", { content })) as Partial<MetaAnnotation> | null;
      return { entities: r?.entities ?? "", hall: r?.hall ?? "" };
    },
    close: p.close,
  };
}

/** Test-only: how many meta holder processes are live (proves "one holder, never a pile"). */
export function _liveMetaHolderCount(): number {
  return livePalaceHolderCount(LABEL);
}
