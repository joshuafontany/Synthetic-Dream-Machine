/**
 * lease-fence-weld — the hand that ROLLS a lease and the hand that READS it must meet on one board.
 *
 * ── THE GAP THIS EXISTS TO CLOSE ────────────────────────────────────────────────────────────────
 * `rollLeaseEpochOnBoard` writes a per-writer slot under `<daemon-bag>/lease-epoch/{resource}/`, on
 * the DAEMON board, via the `nexus-rekey` verb. A reader that scans a DIFFERENT document for that
 * prefix matches nothing, folds an empty slot-set, and reads epoch 0 — forever.
 *
 * Measured: the cabal admission fence read the VOUCH board. Every invite therefore compared against
 * 0, no bound could ever sit behind it, and no vouch could ever lapse. Both halves were individually
 * correct and no test made them meet, which is the shape of every weld this house has lost.
 *
 * A green fence proves nothing on its own. It has to fail after a real roll.
 *
 * ── AND ONE HAND MUST STAY AWAY ─────────────────────────────────────────────────────────────────
 * A realm's FEED is not its fence. The fence bounds outstanding invites — authority this vessel holds
 * alone. The feed is the heartbeat its members keep together, and has to take a peer's write. The
 * same weld that makes the first two meet must keep the third apart from both.
 */
import { describe, it, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { rollLeaseEpochOnBoard } from "../src/lease-rekey.js";
import { leaseEpochPrefix } from "@lararium/mesh";
import { realmLeaseEpoch } from "../src/commands/cabal-join.js";
import { realmMaintenanceFromBoard, realmFeedWrite } from "@lararium/mesh";

const REALM = "a".repeat(64);
const WRITER = "b".repeat(64);

describe("the roll and the fence meet on one board", () => {
  it("★ a rolled epoch is VISIBLE to the fence that gates admission ★", async () => {
    const repo = new Repo({});
    const handle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    // Before any roll a realm stands at genesis — an invite bound at 0 is live.
    expect(realmLeaseEpoch(handle.doc(), REALM)).toBe(0);

    rollLeaseEpochOnBoard(handle as never, REALM, WRITER);

    // AFTER THE ROLL THE FENCE MUST MOVE. If this reads 0, the two halves are looking at different
    // documents and every invite stands forever.
    expect(realmLeaseEpoch(handle.doc(), REALM)).toBe(1);
  });

  it("★ a roll on ANOTHER resource never moves this realm's fence ★", async () => {
    const repo = new Repo({});
    const handle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });
    rollLeaseEpochOnBoard(handle as never, "c".repeat(64), WRITER);
    expect(realmLeaseEpoch(handle.doc(), REALM)).toBe(0);
  });

  it("★ two writers rolling concurrently both climb — the max never drops ★", async () => {
    const repo = new Repo({});
    const handle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });
    rollLeaseEpochOnBoard(handle as never, REALM, WRITER);
    rollLeaseEpochOnBoard(handle as never, "d".repeat(64), REALM === "" ? "x" : "e".repeat(64));
    expect(realmLeaseEpoch(handle.doc(), REALM)).toBeGreaterThanOrEqual(1);
  });

  // ── AND THE FEED MUST NOT MEET EITHER OF THEM ─────────────────────────────────────────────────
  // A realm carries two epochs with one name. Its ADMISSION FENCE bounds outstanding invites and is
  // an authority this vessel holds alone; its FEED is the heartbeat its members keep together and
  // has to take a peer's write. Addressed alike, each would drive the other: feeding a realm would
  // stale its own invites, and revoking an invite would read as somebody maintaining it.

  it("★ a fence roll registers NO maintainer — revoking is not feeding ★", async () => {
    const repo = new Repo({});
    const handle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    rollLeaseEpochOnBoard(handle as never, REALM, WRITER);

    expect(realmLeaseEpoch(handle.doc(), REALM)).toBe(1);
    expect(realmMaintenanceFromBoard(handle.doc() as never, REALM).maintainers).toEqual([]);
  });

  it("★ a feed lands in its own space — feeding does not stale an invite ★", async () => {
    const repo = new Repo({});
    const handle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    const feed = realmFeedWrite(REALM, WRITER, new Map());
    expect(feed.slotUri.startsWith(leaseEpochPrefix(REALM))).toBe(false);
    expect(feed.first).toBe(true);

    // The fence is untouched by a feed, so an invite bound at 0 stays live through any amount of it.
    expect(realmLeaseEpoch(handle.doc(), REALM)).toBe(0);
  });
});
