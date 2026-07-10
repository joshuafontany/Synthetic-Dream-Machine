/**
 * graph-cap — the node side of the CONSUMED structure/graph meta-model. Drives the `graph_io.py serve`
 * holder, which consumes mempalace's palace_graph + hallways over the owned content palace: entity-pair
 * hallways (co-occurrence), cross-wing tunnels, room traversal, graph stats — the organizational recall
 * layer reading the wing/entities/room metadata our meta-model consume stamps. Their graph code behind
 * the causal-island boundary, upstream-tracked; NO LLM.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/nalu
 */

import { resolveGraphSpawn } from "@lararium/mempalace";

import { composePalace, livePalaceHolderCount, makeServeSpawn, type PalaceHolderSpawn } from "./palace-holder.js";

/** the palace label — the transport registry key. */
const LABEL = "graph";

export interface GraphCap {
  /** Graph counts (entities/rooms/tunnels/…). */
  stats(): Promise<Record<string, unknown>>;
  /** The full room graph {nodes, edges}. */
  build(): Promise<{ nodes: unknown; edges: unknown }>;
  /** Entity-pair hallways for a wing (co-occurrence ≥ minCount). */
  hallways(wing: string, minCount?: number): Promise<unknown[]>;
  /** The persisted hallways (optionally for one wing). */
  listHallways(wing?: string): Promise<unknown[]>;
  /** Room traversal from a start room. */
  traverse(startRoom: string, maxHops?: number): Promise<unknown>;
  /** Cross-wing tunnels (optionally between two wings). */
  findTunnels(wingA?: string, wingB?: string): Promise<unknown[]>;
  /** Release this reference; the holder process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Test seam alias: how the holder process is produced (defaults to the python helper). */
export type GraphHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `graph_io.py serve --palace <dir>`. */
const defaultHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveGraphSpawn);

export interface GraphCapOptions {
  /** per-call RPC timeout (ms); default 30s. */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced. */
  readonly spawn?: GraphHolderSpawn;
}

/** Open the graph cap over a content palace dir — the consumed structure/graph, driven over line-RPC. */
export function makeGraphCap(dir: string, opts: GraphCapOptions = {}): GraphCap {
  const p = composePalace(LABEL, dir, opts.spawn ?? defaultHolderSpawn, opts.timeoutMs ?? 30_000);
  return {
    stats: async () => (await p.send("stats", {})) as Record<string, unknown>,
    build: async () => (await p.send("build", {})) as { nodes: unknown; edges: unknown },
    hallways: async (wing, minCount) => (await p.send("hallways", { wing, ...(minCount !== undefined ? { min_count: minCount } : {}) })) as unknown[],
    listHallways: async (wing) => (await p.send("list_hallways", { ...(wing !== undefined ? { wing } : {}) })) as unknown[],
    traverse: (startRoom, maxHops) => p.send("traverse", { start_room: startRoom, ...(maxHops !== undefined ? { max_hops: maxHops } : {}) }),
    findTunnels: async (wingA, wingB) => (await p.send("find_tunnels", { ...(wingA !== undefined ? { wing_a: wingA } : {}), ...(wingB !== undefined ? { wing_b: wingB } : {}) })) as unknown[],
    close: p.close,
  };
}

/** Test-only: how many graph holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveGraphHolderCount(): number {
  return livePalaceHolderCount(LABEL);
}
