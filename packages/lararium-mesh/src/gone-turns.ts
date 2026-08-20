/**
 * gone-turns — the REWIND detector primitive (pure, dependency-free).
 *
 * The harvest index (`<state>/harvest/<wing>.ndjson`) is append-only, keyed by turn-uuid, with NO
 * gone-turn reconciliation: once a turn is recorded it stays, even if the operator later REWINDS the
 * transcript (an edited message, a branch abandoned) so that turn-uuid no longer appears. A turn the
 * index still holds but the current transcript no longer carries is a GONE turn — a rewind.
 *
 * Kapae (rewind = set-aside, never erase) closes the worldline edges keyed to a gone turn
 * (mempalace/worldline-kg `kapaeTurn`). This primitive only DETECTS; the caller scopes the comparison
 * (per-session, so a partial harvest never false-positives a session absent from the run) and fires
 * the close.
 *
 * ## The current-branch refinement
 *
 * The FORK-family transcript (Claude Code, Codex, Aider, Gemini, Copilot-CLI) ORPHANS-not-deletes: a
 * `/rewind` re-parents new turns off an earlier node, leaving the rewound tail in the `.jsonl` as an
 * orphaned branch. A FLAT file-read (every record) therefore finds NOTHING gone — the orphaned tail is
 * still physically present, so the naive `index − allRecords` set-diff misses every rewind. The cure:
 * reconstruct the CURRENT BRANCH (walk `parentUuid` from the live leaf back to the root) and diff the
 * index against THAT leaf-chain — the orphaned tail is off-branch, so it reads gone.
 *
 * Two non-rewinds MUST be filtered so kapae never fires on them:
 *   - SIDECHAINS (`isSidechain`) — worker-swarm sub-agent turns, kept separate, never main-branch.
 *   - STREAM-SPLITS — a branch point whose divergent children are DIFFERENT types (an assistant
 *     parent carrying both an `assistant` and a `user` child = the normal continue→reply flow, or a
 *     partial stream fragment). Only SAME-TYPE siblings sharing a parent = a real re-issue (the
 *     operator edited a user turn / regenerated an assistant turn).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#time (rewind = set-aside)
 */

/**
 * The turn-uuids present in `prev` (the index) but absent from `current` (the live set) — the GONE
 * turns (rewound). Order follows first appearance in `prev`; duplicates and empties are dropped. SCOPE
 * is the caller's: pass the index-keys and the live-keys for ONE session, so a turn merely absent from
 * this harvest run (a different session) never reads as gone.
 *
 * The PURE set-diff floor — backward-compatible with the live kapae tail. The current-branch
 * refinement rides in the `current` set the caller passes ({@link liveKeysForRewind}): pass the
 * branch-live keys (orphans excluded) and this diff surfaces the rewound tail unchanged.
 */
export function detectGoneTurns(prev: Iterable<string>, current: Iterable<string>): string[] {
  const live = new Set<string>();
  for (const u of current) if (u) live.add(u);
  const gone: string[] = [];
  const seen = new Set<string>();
  for (const u of prev) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    if (!live.has(u)) gone.push(u);
  }
  return gone;
}

/** One transcript record — the minimal shape the branch reconstruction needs (the source carries more). */
export interface BranchNode {
  /** The turn's stable message uuid (the DAG node id). Empty ⇒ excluded from the DAG walk. */
  readonly uuid: string;
  /** The in-transcript parent message uuid, or null at a conversation root. */
  readonly parentUuid: string | null;
  /** True for a worker-swarm sub-agent turn — filtered from the main branch entirely. */
  readonly isSidechain?: boolean;
  /** The turn role (`user` / `assistant`) — the same-type-sibling discriminant. */
  readonly type?: string;
}

/** A {@link BranchNode} carrying its harvest KEY (turnKeyOf — uuid, or a content hash when uuid absent). */
export interface KeyedBranchNode extends BranchNode {
  readonly key: string;
}

/** The MAIN records: uuid'd, non-sidechain — the branch DAG (in append/file order). */
function mainRecords<T extends BranchNode>(records: readonly T[]): T[] {
  return records.filter((r) => r.uuid && !r.isSidechain);
}

/**
 * Reconstruct the CURRENT-BRANCH leaf-chain (root → leaf): the uuids on the `parentUuid` path from the
 * live leaf — the LAST-appended main record, the current tip by construction — back to the root.
 * Sidechains and un-uuid'd records are filtered. Cycle-safe. Empty ⇒ no main records.
 */
export function reconstructCurrentBranch(records: readonly BranchNode[]): string[] {
  const main = mainRecords(records);
  if (main.length === 0) return [];
  const parentOf = new Map<string, string | null>();
  for (const r of main) parentOf.set(r.uuid, r.parentUuid ?? null);
  const leaf = main[main.length - 1]!.uuid; // the current tip — appended last
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = leaf;
  while (cur && parentOf.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    chain.push(cur);
    cur = parentOf.get(cur) ?? null;
  }
  chain.reverse(); // root → leaf
  return chain;
}

/** parent-uuid → its distinct child uuids (main records only). */
function childIndex(main: readonly BranchNode[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  const seenEdge = new Set<string>();
  for (const r of main) {
    const p = r.parentUuid;
    if (!p) continue;
    const edge = `${p}\u0000${r.uuid}`;
    if (seenEdge.has(edge)) continue;
    seenEdge.add(edge);
    const kids = idx.get(p);
    if (kids) kids.push(r.uuid);
    else idx.set(p, [r.uuid]);
  }
  return idx;
}

/**
 * The REWIND-ORPHAN uuids: main records off the current branch whose divergence from the branch is a
 * genuine SAME-TYPE re-issue (the operator rewound/regenerated), as opposed to a benign STREAM-SPLIT
 * (a different-type sibling — normal continue→reply, or a partial fragment).
 *
 * A divergence sits at a branch node P that is ON the current branch: P's on-branch child D is the
 * choice the live branch took; every OTHER child R of P roots an orphaned sub-tree. That sub-tree is a
 * rewind IFF R and D share a type (same-type siblings = a real re-issue). The whole sub-tree under a
 * rewound R is orphaned content → all of it kapae'd. A different-type R roots a stream-split → skipped.
 */
export function rewindOrphanUuids(records: readonly BranchNode[]): Set<string> {
  const main = mainRecords(records);
  const orphans = new Set<string>();
  if (main.length === 0) return orphans;

  const branch = reconstructCurrentBranch(records);
  const branchSet = new Set(branch);
  const byUuid = new Map(main.map((r) => [r.uuid, r] as const));
  const kids = childIndex(main);

  // The on-branch child taken at each branch node (parent → the child on the live chain).
  const onBranchChildOf = new Map<string, string>();
  for (let i = 1; i < branch.length; i++) {
    const child = branch[i]!;
    const p = byUuid.get(child)?.parentUuid;
    if (p) onBranchChildOf.set(p, child);
  }

  // Seed: at every on-branch parent P, each off-branch child R of matching type roots a rewind sub-tree.
  const rewindRoots: string[] = [];
  for (const p of branchSet) {
    const taken = onBranchChildOf.get(p);
    const takenType = taken ? byUuid.get(taken)?.type : undefined;
    for (const c of kids.get(p) ?? []) {
      if (branchSet.has(c)) continue; // the on-branch child (or another live node) — not orphaned
      const cType = byUuid.get(c)?.type;
      if (taken && cType === takenType) rewindRoots.push(c); // same-type sibling ⇒ real re-issue
      // different-type sibling / stream-split ⇒ benign, skip its sub-tree
    }
  }

  // Mark each rewind root's whole sub-tree (BFS over children).
  const queue = [...rewindRoots];
  while (queue.length) {
    const u = queue.shift()!;
    if (orphans.has(u)) continue;
    orphans.add(u);
    for (const c of kids.get(u) ?? []) if (!branchSet.has(c)) queue.push(c);
  }
  return orphans;
}

/**
 * The LIVE keys for rewind detection — every keyed record EXCEPT the genuine rewind-orphans. Pass this
 * as `current` to {@link detectGoneTurns}: the prior index minus these live keys = the rewound tail
 * (both the orphaned-in-file re-issue AND a wholesale/absent rewind, since an absent prior key is
 * simply not live). Un-uuid'd records (no DAG identity) always count live — they can never be
 * reconstructed, so they must never false-positive as gone.
 */
export function liveKeysForRewind(records: readonly KeyedBranchNode[]): Set<string> {
  const orphan = rewindOrphanUuids(records);
  const live = new Set<string>();
  for (const r of records) {
    if (!r.key) continue;
    if (r.uuid && orphan.has(r.uuid)) continue; // a genuine rewind-orphan — not live
    live.add(r.key);
  }
  return live;
}

/**
 * The convenience driver: gone turns via current-branch reconstruction. `prev` = the index keys for a
 * scope; `records` = that scope's transcript records (uuid-keyed). Equivalent to
 * `detectGoneTurns(prev, liveKeysForRewind(records))` when the records' keys ARE their uuids (the
 * Claude case). For sources whose key ≠ uuid, prefer {@link liveKeysForRewind} with the real keys.
 */
export function detectGoneTurnsOnBranch(prev: Iterable<string>, records: readonly BranchNode[]): string[] {
  const keyed: KeyedBranchNode[] = records.map((r) => ({ ...r, key: r.uuid }));
  return detectGoneTurns(prev, liveKeysForRewind(keyed));
}
