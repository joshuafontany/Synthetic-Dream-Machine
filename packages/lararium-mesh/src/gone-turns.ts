/**
 * gone-turns — the REWIND detector primitive (pure, dependency-free).
 *
 * The harvest index (`~/.lares/harvest/<wing>.ndjson`) is append-only, keyed by turn-uuid, with NO
 * gone-turn reconciliation: once a turn is recorded it stays, even if the operator later REWINDS the
 * transcript (an edited message, a branch abandoned) so that turn-uuid no longer appears. A turn the
 * index still holds but the current transcript no longer carries is a GONE turn — a rewind.
 *
 * Kapae (rewind = set-aside, never erase) closes the worldline edges keyed to a gone turn
 * (mempalace/worldline-kg `kapaeTurn`). This primitive only DETECTS; the caller scopes the comparison
 * (per-session, so a partial harvest never false-positives a session absent from the run) and fires
 * the close.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#time (rewind = set-aside)
 */

/**
 * The turn-uuids present in `prev` (the index) but absent from `current` (the live transcript) — the
 * GONE turns (rewound). Order follows first appearance in `prev`; duplicates and empties are dropped.
 * SCOPE is the caller's: pass the index-uuids and current-uuids for ONE session, so a turn merely
 * absent from this harvest run (a different session) never reads as gone.
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
