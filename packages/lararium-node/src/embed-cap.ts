/**
 * embed-cap — the node-side of the lares EMBED cap (text→vector). Drives the palace-less `embed_io.py`
 * holder (which CONSUMES the vendored mempalace embedder — store-compatible vectors by construction,
 * upstream-tracked). This is the EMBED half of the caller-vector split: `makeEmbedCap().embed(texts)`
 * fans the embedding out here (the model loads once in the held process); `content_io.put` commits
 * the vector (the single writer). The vendored `mine` (embed-on-write) leaves the live path.
 *
 * Palace-less: the model is the resource, not a store dir — ONE holder per process (composeEncoder),
 * the spawn omits `--palace`. Meme: lar:///ha.ka.ba/lares/api/pono/nalu
 */

import { resolveEmbedSpawn } from "@lararium/mempalace";

import { composeEncoder, livePalaceHolderCount, makeServeSpawn, type PalaceHolderSpawn } from "./sensorium.js";

/** the holder label — palace-less: ONE embed holder per process (the model is the resource). */
const LABEL = "embed";

/** The outcome of an embed batch: the vectors + the model name (for the EmbedderIdentity contract). */
export interface EmbedResult {
  readonly vectors: number[][];
  readonly model: string;
  readonly dim: number;
}

export interface EmbedCap {
  /** Embed a batch of texts → their vectors (store-compatible: same model as the mine path). */
  embed(texts: readonly string[]): Promise<EmbedResult>;
  /** Release this reference; the holder process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Test shore alias: how the holder process is produced (defaults to the palace-less python helper). */
export type EmbedHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `embed_io.py serve` (NO --palace). */
const defaultHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveEmbedSpawn, { palaceless: true });

export interface EmbedCapOptions {
  /** per-call RPC timeout (ms); default 120s — the FIRST embed may load (or download) the model. */
  readonly timeoutMs?: number;
  /** test shore: override how the holder process is produced. */
  readonly spawn?: EmbedHolderSpawn;
}

/** Open the embed cap — the shared palace-less holder (the model loads once), driven over line-RPC. */
export function makeEmbedCap(opts: EmbedCapOptions = {}): EmbedCap {
  const p = composeEncoder(LABEL, opts.spawn ?? defaultHolderSpawn, opts.timeoutMs ?? 120_000);
  return {
    async embed(texts): Promise<EmbedResult> {
      const r = (await p.send("embed", { texts: [...texts] })) as Partial<EmbedResult> | null;
      return { vectors: r?.vectors ?? [], model: r?.model ?? "", dim: r?.dim ?? 0 };
    },
    close: p.close,
  };
}

/** Test-only: how many embed holder processes are live (proves "one holder, never a pile"). */
export function _liveEmbedHolderCount(): number {
  return livePalaceHolderCount(LABEL);
}
