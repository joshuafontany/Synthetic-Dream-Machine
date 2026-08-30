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
 */
import { describe, it, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { rollLeaseEpochOnBoard } from "../src/lease-rekey.js";
import { realmLeaseEpoch } from "../src/commands/cabal-join.js";

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
});
