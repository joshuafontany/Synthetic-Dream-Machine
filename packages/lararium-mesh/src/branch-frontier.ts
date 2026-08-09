/**
 * branch-frontier — the FORK DETECTOR over a conversation parentUuid turn-DAG.
 *
 * Slice-1 made buildPatch ABLE to consume a `BranchContext` (a frontier keyed into the
 * handle so same-session forks stop colliding on the shared `run`). This module FEEDS it:
 * given the transcript's parentUuid DAG it detects branch points (a turn with ≥2 children)
 * and derives the per-turn `BranchContext` to pass as buildPatch's 3rd arg.
 *
 * The DAG reading is the git/Merkle "set of head hashes" idiom: a turn's branch identity is
 * the SET of branch-choice uuids it descended through — the immediate child taken at every
 * forking ancestor on the root→turn path. Two siblings of one fork carry distinct choices, so
 * they derive distinct frontiers → distinct handles; nested forks accumulate. A turn with NO
 * forking ancestor carries no frontier (returns undefined) → the handle stays byte-identical to
 * the unforked case (slice-1's invariant: absent a frontier, behavior is unchanged).
 *
 * Pure + dependency-free (bundles into the TW5 VM beside build-patch). The caller reads the
 * transcript into {uuid, parentUuid} nodes (the harvest/capture leg already parses parentUuid).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#time (Fork = concurrency the DAG holds)
 */

import type { BranchContext } from "./build-patch.js";

/** One turn-DAG node — the minimal shape the fork reading needs (the transcript carries more). */
export interface TurnNode {
  /** The turn's stable message uuid (the DAG node id). */
  readonly uuid: string;
  /** The in-transcript parent message uuid, or null at a conversation root. */
  readonly parentUuid: string | null;
}

/**
 * The child index: parentUuid → the DISTINCT child uuids under it. The root's children sit under
 * the sentinel key `""` is NOT used — a null parent contributes no edge (a root has no fork-parent).
 */
export function buildChildIndex(turns: readonly TurnNode[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  const seenEdge = new Set<string>();
  for (const t of turns) {
    const p = t.parentUuid;
    if (p == null || p === "" || !t.uuid) continue;
    const edge = `${p}\u0000${t.uuid}`;
    if (seenEdge.has(edge)) continue; // a transcript may repeat a (parent,child) — count it once
    seenEdge.add(edge);
    const kids = idx.get(p);
    if (kids) kids.push(t.uuid);
    else idx.set(p, [t.uuid]);
  }
  return idx;
}

/** The branch points: every parent uuid carrying ≥2 distinct children (a divergence in the DAG). */
export function findBranchPoints(turns: readonly TurnNode[]): Set<string> {
  const idx = buildChildIndex(turns);
  const forks = new Set<string>();
  for (const [parent, kids] of idx) if (kids.length >= 2) forks.add(parent);
  return forks;
}

/**
 * Derive a turn's {@link BranchContext} — the SET of branch-choice uuids it descended through.
 * Walk root-ward from the turn; at every node whose PARENT is a branch point, the node IS the
 * branch the turn took, so its uuid joins the frontier. Returns `undefined` when the turn passed
 * through no fork (no collision possible → no frontier → handle unaffected).
 *
 * Cycle-safe (a malformed DAG with a parent loop terminates on the seen-set).
 */
export function branchContextForTurn(turns: readonly TurnNode[], turnUuid: string): BranchContext | undefined {
  if (!turnUuid) return undefined;
  const parentOf = new Map<string, string | null>();
  for (const t of turns) if (t.uuid) parentOf.set(t.uuid, t.parentUuid ?? null);
  const forks = findBranchPoints(turns);
  if (forks.size === 0) return undefined;

  const frontier: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = turnUuid;
  while (cur != null && cur !== "" && !seen.has(cur)) {
    seen.add(cur);
    const parent: string | null = parentOf.get(cur) ?? null;
    if (parent != null && parent !== "" && forks.has(parent)) frontier.push(cur);
    cur = parent;
  }
  if (frontier.length === 0) return undefined;
  return { frontier };
}
