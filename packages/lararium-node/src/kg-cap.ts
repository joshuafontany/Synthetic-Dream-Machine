/**
 * kg-cap — the node side of the CONSUMED knowledge graph. Drives the `kg_io.py serve` holder, which
 * consumes mempalace's bitemporal `KnowledgeGraph` (entity→predicate→entity with valid_from/valid_to
 * + `as_of` time-travel) over the owned palace's `knowledge_graph.sqlite3`. Lift-as-consume: their
 * graph code behind the causal-island boundary, upstream-tracked; NO LLM (the graph STORE — triple
 * EXTRACTION that fills it is greenfield, optionally LLM-assisted).
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/nalu
 */

import { resolveKgSpawn } from "@lararium/mempalace";

import { composePalace, livePalaceHolderCount, makeServeSpawn, type PalaceHolderSpawn } from "./sensorium.js";

/** the palace label — the transport registry key. */
const LABEL = "kg";

/** Optional bitemporal + provenance fields on a triple (consumed straight through to add_triple). */
export interface TripleOpts {
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly confidence?: number;
  readonly sourceFile?: string;
  readonly sourceDrawerId?: string;
  readonly adapterName?: string;
}

export interface KgCap {
  /** Record an entity (name + type + free properties). */
  addEntity(name: string, entityType?: string, properties?: Record<string, unknown>): Promise<unknown>;
  /** Record a bitemporal triple subject→predicate→object (dedup on an identical still-open triple). */
  addTriple(subject: string, predicate: string, object: string, opts?: TripleOpts): Promise<unknown>;
  /** Close a triple's valid_to by S/P/O (the bitemporal retract — history kept). */
  invalidate(subject: string, predicate: string, object: string, ended?: string): Promise<unknown>;
  /** Query an entity's relationships, optionally `as_of` a date, incoming/outgoing. */
  queryEntity(name: string, opts?: { asOf?: string; direction?: "incoming" | "outgoing" }): Promise<unknown>;
  /** Query all triples for a predicate, optionally `as_of`. */
  queryRelationship(predicate: string, asOf?: string): Promise<unknown>;
  /** The bitemporal timeline (all events, or for one entity). */
  timeline(entityName?: string): Promise<unknown>;
  /** Graph counts (entities/triples/…). */
  stats(): Promise<Record<string, unknown>>;
  /** Release this reference; the holder process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Test seam alias: how the holder process is produced (defaults to the python helper). */
export type KgHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `kg_io.py serve --palace <dir>`. */
const defaultHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveKgSpawn);

export interface KgCapOptions {
  /** per-call RPC timeout (ms); default 30s. */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced. */
  readonly spawn?: KgHolderSpawn;
}

/** Open the KG cap over a palace dir — the consumed bitemporal graph, driven over line-RPC. */
export function makeKgCap(dir: string, opts: KgCapOptions = {}): KgCap {
  const p = composePalace(LABEL, dir, opts.spawn ?? defaultHolderSpawn, opts.timeoutMs ?? 30_000);
  const tripleFields = (o?: TripleOpts): Record<string, unknown> => ({
    ...(o?.validFrom !== undefined ? { valid_from: o.validFrom } : {}),
    ...(o?.validTo !== undefined ? { valid_to: o.validTo } : {}),
    ...(o?.confidence !== undefined ? { confidence: o.confidence } : {}),
    ...(o?.sourceFile !== undefined ? { source_file: o.sourceFile } : {}),
    ...(o?.sourceDrawerId !== undefined ? { source_drawer_id: o.sourceDrawerId } : {}),
    ...(o?.adapterName !== undefined ? { adapter_name: o.adapterName } : {}),
  });
  return {
    addEntity: (name, entityType, properties) => p.send("add_entity", { name, entity_type: entityType ?? "unknown", ...(properties ? { properties } : {}) }),
    addTriple: (subject, predicate, object, o) => p.send("add_triple", { subject, predicate, object, ...tripleFields(o) }),
    invalidate: (subject, predicate, object, ended) => p.send("invalidate", { subject, predicate, object, ...(ended !== undefined ? { ended } : {}) }),
    queryEntity: (name, o) => p.send("query_entity", { name, ...(o?.asOf !== undefined ? { as_of: o.asOf } : {}), ...(o?.direction !== undefined ? { direction: o.direction } : {}) }),
    queryRelationship: (predicate, asOf) => p.send("query_relationship", { predicate, ...(asOf !== undefined ? { as_of: asOf } : {}) }),
    timeline: (entityName) => p.send("timeline", { ...(entityName !== undefined ? { entity_name: entityName } : {}) }),
    stats: async () => (await p.send("stats", {})) as Record<string, unknown>,
    close: p.close,
  };
}

/** Test-only: how many KG holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveKgHolderCount(): number {
  return livePalaceHolderCount(LABEL);
}
