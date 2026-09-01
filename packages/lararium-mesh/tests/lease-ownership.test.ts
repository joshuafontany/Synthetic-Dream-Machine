/**
 * lease-ownership — the fence and the feed share a fold, and must never share a board.
 *
 * ── THE TWO SENSES ──────────────────────────────────────────────────────────────────────────────
 * `epoch-lease` addresses the REVOCATION fence: rolling a slot stales every outstanding grant on a
 * resource at once (`lease-rekey` — "the non-renewal half of revocation"). That is an authority act,
 * and it belongs to the vessel alone.
 *
 * A realm's FEED is the opposite. `cabal-realm` calls it "the realm's own collective-maintenance
 * heartbeat, NOT an authority epoch", and a realm only its owner can feed cannot be read across the
 * members who keep it. It has to take a peer's write.
 *
 * ── WHY THE SEPARATION IS LOAD-BEARING ──────────────────────────────────────────────────────────
 * Both fold by MAX, and neither verifies a seal before folding. One slot carrying a large number is
 * therefore enough to stale a resource. A board that took peer writes AND carried both senses would
 * hand any peer a revocation over resources it has no authority on — denial dressed as maintenance.
 *
 * These pin that the two address spaces cannot see each other, so moving the feed onto a shared
 * board carries no fence with it.
 */
import { describe, it, expect } from "vitest";
import { leaseEpochPrefix, leaseEpochSlotUri } from "../src/epoch-lease.js";
import { realmFeedPrefix, realmFeedSlotUri, cabalRealmLeaseSlot } from "../src/cabal-realm.js";
import { cabalRealmMaintenanceProvenance } from "../src/cabal-realm-clock.js";

const REALM  = "0x" + "cd".repeat(32);
const WRITER = "0x" + "ab".repeat(32);

describe("lease-ownership — one fold, two owners, two spaces", () => {
  it("★ neither prefix contains the other — no scan crosses the seam ★", () => {
    const fence = leaseEpochPrefix(REALM);
    const feed  = realmFeedPrefix(REALM);
    expect(feed.startsWith(fence)).toBe(false);
    expect(fence.startsWith(feed)).toBe(false);
    expect(feed).not.toBe(fence);
  });

  it("★ the FENCE is rooted in the daemon bag; the FEED is relative to its board ★", () => {
    // The fence names an absolute bag — one specific doc, this vessel's own. The feed carries no
    // scheme and no bag, so it addresses whichever board holds it and can follow a realm onto a
    // shared one without dragging the daemon's authority space along.
    expect(leaseEpochPrefix(REALM)).toContain("/bags/daemon/");
    expect(realmFeedPrefix(REALM)).not.toContain("bags/daemon");
    expect(realmFeedPrefix(REALM)).not.toContain("lar:///");
  });

  it("★ a realm read over a board of FENCE slots reports NO maintainer ★", () => {
    // The load-bearing refusal. A vessel's own revocation epochs must never read as somebody
    // feeding a realm — that would turn an authority act into evidence of maintenance.
    const board = new Map([[leaseEpochSlotUri(REALM, WRITER), "99"]]);
    const p = cabalRealmMaintenanceProvenance(REALM, board);
    expect(p.maintainers).toEqual([]);
  });

  it("★ a realm read sees its OWN feed slots ★", () => {
    const board = new Map([[realmFeedSlotUri(REALM, WRITER), "7"]]);
    const p = cabalRealmMaintenanceProvenance(REALM, board);
    expect(p.maintainers.map((m) => m.writerId)).toEqual([WRITER]);
    expect(p.maintainers[0]!.epoch).toBe(7);
  });

  it("★ a fence slot cannot forge a maintainer even under the SAME writer and realm ★", () => {
    // Same realm, same writer, both senses present: only the feed slot counts, and it counts once.
    const board = new Map([
      [leaseEpochSlotUri(REALM, WRITER), "9000"],
      [realmFeedSlotUri(REALM, WRITER),  "2"],
    ]);
    const p = cabalRealmMaintenanceProvenance(REALM, board);
    expect(p.maintainers).toHaveLength(1);
    expect(p.maintainers[0]!.epoch).toBe(2);
  });

  it("★ the realm's named slot IS the feed slot — one address, not two spellings ★", () => {
    expect(cabalRealmLeaseSlot(REALM, WRITER)).toBe(realmFeedSlotUri(REALM, WRITER));
  });

  it("★ a writer id that looks like a path separator cannot escape its realm's space ★", () => {
    const sneaky = "../" + "ff".repeat(32);
    expect(realmFeedSlotUri(REALM, sneaky).startsWith(realmFeedPrefix(REALM))).toBe(true);
    expect(realmFeedSlotUri(REALM, sneaky)).not.toContain("../");
  });
});
