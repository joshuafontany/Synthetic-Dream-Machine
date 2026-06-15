/**
 * delete-gate — vectors for the wave-level deletion decision (watcher build 4,
 * the moʻolelo ruling 2026-06-14). PURE: synthetic hashes, no live carrier,
 * no I/O — the grace window + durability live in the watcher; the SPLIT
 * (rename vs tombstone vs mass-delete brake) lives here.
 *
 * The ruling under proof:
 *   - a projected carrier gone from disk, no pairing add → TOMBSTONE
 *   - a delete whose synced-hash UNIQUELY matches a fresh add's disk-hash → RENAME re-link
 *   - hash collision (identical-content carriers) → NO guess; fall to tombstone
 *   - tombstones above a FRACTION of the bag's carriers → SUSPEND, apply nothing
 *   - renames never count toward the mass-delete brake (a move is not a loss)
 */

import { describe, test, expect } from "vitest";
import { decideDeletions } from "../src/delete-gate.js";

describe("delete-gate — the wave-level deletion decision", () => {
  test("a projected carrier gone, no pairing add → tombstone", () => {
    const d = decideDeletions({
      deletes: [{ uri: "lar:///a", syncedHash: "h-a" }],
      adds: [],
      liveCarrierCount: 10,
      massDeleteFraction: 0.5,
    });
    expect(d).toEqual({ kind: "apply", renames: [], tombstones: ["lar:///a"] });
  });

  test("unique synced↔disk hash match → rename re-link, not tombstone", () => {
    const d = decideDeletions({
      deletes: [{ uri: "lar:///old", syncedHash: "H" }],
      adds: [{ uri: "lar:///new", diskHash: "H" }],
      liveCarrierCount: 10,
      massDeleteFraction: 0.5,
    });
    expect(d).toEqual({ kind: "apply", renames: [{ fromUri: "lar:///old", toUri: "lar:///new" }], tombstones: [] });
  });

  test("hash collision (identical content) → no guess, both tombstone", () => {
    // two deletes share hash H with one add — ambiguous which is the rename.
    const d = decideDeletions({
      deletes: [{ uri: "lar:///a", syncedHash: "H" }, { uri: "lar:///b", syncedHash: "H" }],
      adds: [{ uri: "lar:///c", diskHash: "H" }],
      liveCarrierCount: 10,
      massDeleteFraction: 0.9,
    });
    expect(d.kind).toBe("apply");
    if (d.kind === "apply") {
      expect(d.renames).toEqual([]);
      expect([...d.tombstones].sort()).toEqual(["lar:///a", "lar:///b"]);
    }
  });

  test("tombstones above the fraction → suspend, apply nothing", () => {
    const deletes = ["a", "b", "c", "d", "e", "f"].map((u) => ({ uri: `lar:///${u}`, syncedHash: `h-${u}` }));
    const d = decideDeletions({
      deletes,
      adds: [],
      liveCarrierCount: 10,
      massDeleteFraction: 0.5, // threshold 5.0; 6 tombstones > 5 → trip
    });
    expect(d.kind).toBe("suspend");
    if (d.kind === "suspend") {
      expect(d.wouldTombstone.length).toBe(6);
      expect(d.reason).toMatch(/fraction|mass/i);
    }
  });

  test("renames do not count toward the mass-delete brake", () => {
    // 3 deletes, all uniquely paired as renames; 0 real tombstones.
    const d = decideDeletions({
      deletes: [
        { uri: "lar:///o1", syncedHash: "1" },
        { uri: "lar:///o2", syncedHash: "2" },
        { uri: "lar:///o3", syncedHash: "3" },
      ],
      adds: [
        { uri: "lar:///n1", diskHash: "1" },
        { uri: "lar:///n2", diskHash: "2" },
        { uri: "lar:///n3", diskHash: "3" },
      ],
      liveCarrierCount: 2,
      massDeleteFraction: 0.5, // threshold 1.0 — would trip on 3 tombstones, but these are renames
    });
    expect(d.kind).toBe("apply");
    if (d.kind === "apply") {
      expect(d.renames.length).toBe(3);
      expect(d.tombstones).toEqual([]);
    }
  });
});
