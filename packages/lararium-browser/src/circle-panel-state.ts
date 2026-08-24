/**
 * circle-panel-state — shape a circle's follow-view into the daemon follow-panel's push args.
 *
 * The isomorphic sibling of persona-panel-state. The vessel HOLDS the follow-graph (main-thread IDB); the
 * daemon follow surface RENDERS in the worker. This pure function turns a {@link FollowView} list + the
 * active circle id into the flat, string-only field bag the `circle-state` worker verb writes onto
 * $:/temp/lares/circles (the surface iterates `[list[…]]` by POSITION and reads `nym-<i>` / `petname-<i>` /
 * `glamour-<i>` by interpolated field name — positional indices, so a long hex nym never becomes a field name).
 *
 * PRIVATE-all: the follow-graph NEVER federates, so this state tiddler MUST stay in the volatile temp slot
 * (never a synced bag). It carries the private petnames + the graph itself — the never-federates surface.
 * The ONE thing a human federates stays the glamour they deliberately publish, never this panel.
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/circle-panel-state
 */

import type { FollowView } from "@lararium/mesh";

/**
 * Shape the follow-panel push args for ONE circle. `list` = the positional indices (the TW5 list field the
 * surface iterates), `circle` = the active circle id, `count` = the member count, and per-member `nym-<i>`
 * (the full nym, for the unfollow button's arg), `petname-<i>` (the PRIVATE local label, blank when unnamed),
 * `glamour-<i>` (the last-seen published face, blank when none).
 */
export function circlePanelStateArgs(
  circleId: string,
  follows: readonly FollowView[],
): Record<string, string> {
  const args: Record<string, string> = {
    circle: circleId,
    count:  String(follows.length),
    list:   follows.map((_, i) => String(i)).join(" "),
  };
  follows.forEach((f, i) => {
    args[`nym-${i}`]     = f.nym;
    args[`petname-${i}`] = f.petname ?? "";
    args[`glamour-${i}`] = f.glamour ?? "";
  });
  return args;
}
