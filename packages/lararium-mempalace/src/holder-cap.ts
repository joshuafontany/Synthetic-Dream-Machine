/**
 * holder-cap — the ONE env-cap composer every mempalace-backed python spawn wears.
 *
 * A holder spawn carries CAPS the same way a vessel does: each cap contributes env, the spawn spreads
 * them, and a spawn that forgets one runs under-capped. Eleven spawn sites spread the GPU
 * compute cap individually; this composes the full set behind ONE name, so a NEW spawn site reaches for
 * `resolveHolderCapEnv` and gets every cap the House declares — never the subset whoever wrote it
 * remembered.
 *
 * The composer caps BOTH shores: the House's own NDJSON holders under @lararium/sensorium's scripts,
 * and the read-only spawn of the guest mempalace holder. Each opens a store through the mempalace
 * library, so each answers to the same declared policy.
 *
 * ── THE WRITE-ROUTING CAP, and why the House declares it ────────────────────────────────────────────
 * mempalace resolves its write route down a seven-rung ladder (docs/write-routing-policy.md). Rungs 4-6
 * read the GUEST config file at `~/.mempalace/config.json` — a store the House does not own. So a House
 * that declares NOTHING inherits the guest install's policy the day one appears: a cross-boundary read
 * the peer boundary exists to refuse.
 *
 * The env rungs sit ABOVE every config rung, so DECLARING cures it whole. The House declares.
 *
 * ── WHY `require` RATHER THAN `prefer` (operator context, 2026-07-29) ───────────────────────────────
 * Operators run MANY chat-session worldlines in parallel, across different agents and backends, all
 * writing one sensorium. That names the multi-writer case, and the policies part exactly there:
 *
 *   · `prefer` uses the daemon when it stands and FALLS BACK TO A DIRECT WRITER otherwise — which means
 *     it re-opens multi-writer access at the precise moment contention peaks (daemon busy, or starting).
 *   · `require` routes every write through the daemon or BLOCKS. Paired with the daemon-singleton flock
 *     (one daemon per palace), it yields single-writer discipline that holds under load.
 *
 * The flock guarantees ONE daemon exists; only `require` guarantees every write goes THROUGH it. The
 * asymmetry decides it: a stalled write retries, and a corrupted vector index does not — concurrent
 * writers on one HNSW segment damage a store no later run repairs.
 *
 * HONEST COST, stated: under `require` a daemon that cannot start stops writes rather than degrading to
 * a direct path. That reads as the correct trade in a civic mesh (a lost write costs more than a stalled
 * one) and as the WRONG one for a latency-bound caller — which keeps this an override, never a
 * weld: an operator who exports `MEMPALACE_WRITE_ROUTING` wins, exactly as the compute cap yields to a
 * pinned `MEMPALACE_EMBEDDING_DEVICE`.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/mempalace-integration
 */

import { resolveComputeCapEnv } from "./compute-cap.js";

/** The env var mempalace reads at rung 2 of its routing ladder — above every config-file rung. */
export const WRITE_ROUTING_ENV = "MEMPALACE_WRITE_ROUTING" as const;

/** The policy the House declares for its own sensorium holders. See the module note for the reasoning. */
export const HOUSE_WRITE_ROUTING = "require" as const;

/**
 * The write-routing cap — DECLARE the House's policy so a holder never inherits the guest's.
 * Honors an operator override (an exported value wins); otherwise declares {@link HOUSE_WRITE_ROUTING}.
 */
export function resolveWriteRoutingEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!process.env[WRITE_ROUTING_ENV]?.trim()) env[WRITE_ROUTING_ENV] = HOUSE_WRITE_ROUTING;
  return env;
}

/**
 * Every cap a mempalace-backed python spawn wears, composed. Spread this onto the spawn env — reaching
 * for it by this one name KEEPS a new spawn site from running under-capped.
 */
/** The env var mempalace reads to bind an embedding function without building it. */
export const LAZY_EMBEDDER_ENV = "MEMPALACE_LAZY_EMBEDDER" as const;

/**
 * The lazy-embedder cap — a STORE holder binds an embedding function and never calls it.
 *
 * chromadb 1.x does not persist the embedding function, so every open must pass one or the reader
 * silently gets the library default and its queries stop matching the writer's vectors. Under the
 * eager factory that binding cost a full onnxruntime session PER STORE PROCESS: opening one content
 * palace imported eleven modules and stood a MiniLM the holder never called, because the ingest
 * pipeline supplies every vector on the wire. Standing three sensoriums multiplies that by every
 * store we open.
 *
 * ── WHY THE HOUSE MAY TAKE THIS TRADE AND UPSTREAM MAY NOT ──────────────────────────────────────
 * The deferral costs chroma's embedder-mismatch detection — the `rebuild-index` hint stops
 * surfacing — and that guard exists to stop a reader querying an incomparable vector space. Upstream
 * keeps it default-off for exactly that reason.
 *
 * Our stores already hold a STRICTER floor of their own: `content_io` pins `expected_dim` (the
 * physically-unusable case) AND `expected_model` (the same-dim different-model swap that passes a
 * dimension check while corrupting recall), plus `_assert_palace_model_history`, which refuses to
 * OPEN a palace whose first stamped drawer names a different embedder than the driver's pin. Those
 * fail loud on the wire and at compose time. So the House gives up a guard it duplicates, never one
 * it depends on.
 */
export function resolveLazyEmbedderEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!process.env[LAZY_EMBEDDER_ENV]?.trim()) env[LAZY_EMBEDDER_ENV] = "1";
  return env;
}

export function resolveHolderCapEnv(python: string | null): Record<string, string> {
  return { ...resolveComputeCapEnv(python), ...resolveWriteRoutingEnv(), ...resolveLazyEmbedderEnv() };
}
