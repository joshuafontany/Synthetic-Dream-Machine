/**
 * hnsw-repair — the divergence-gated, idempotent, fail-soft rebuild tail. parseHnswDivergence reads
 * the drawers block of `mempalace repair-status`; repairHnswIfDiverged skips when aligned, rebuilds
 * when diverged, and NEVER throws (a repair/status failure returns a result, never fails the harvest).
 */

import { describe, expect, test, vi } from "vitest";
import { parseHnswDivergence, repairHnswIfDiverged, type HnswRepairIo } from "../src/hnsw-repair.js";

const OK_STATUS = `
  [drawers]
    sqlite count:   14,839
    hnsw count:     14,839
    divergence:     0
    status:         OK
    note:           within flush-lag tolerance

  [closets]
    sqlite count:   0
    status:         UNKNOWN
`;

const DIVERGED_STATUS = `
  [drawers]
    sqlite count:   20,100
    hnsw count:     10,000
    divergence:     10,100
    status:         DIVERGED
    note:           HNSW frozen below sqlite

  [closets]
    status:         UNKNOWN
`;

describe("parseHnswDivergence", () => {
  test("OK drawers block → not diverged, divergence parsed", () => {
    expect(parseHnswDivergence(OK_STATUS)).toEqual({ diverged: false, divergence: 0 });
  });
  test("DIVERGED drawers block → diverged, comma-number parsed (closets UNKNOWN ignored)", () => {
    expect(parseHnswDivergence(DIVERGED_STATUS)).toEqual({ diverged: true, divergence: 10100 });
  });
  test("unparseable text → fail-safe (never triggers a destructive rebuild)", () => {
    expect(parseHnswDivergence("garbage")).toEqual({ diverged: false, divergence: null });
  });
});

function io(over: Partial<HnswRepairIo>): { io: HnswRepairIo; quiesce: ReturnType<typeof vi.fn>; repair: ReturnType<typeof vi.fn> } {
  const quiesce = vi.fn(async () => {});
  const repair = vi.fn(async () => {});
  return { quiesce, repair, io: { checkStatus: async () => OK_STATUS, quiesce, repair, ...over } };
}

describe("repairHnswIfDiverged", () => {
  test("aligned → SKIP (idempotent: quiesce + repair never run)", async () => {
    const { io: i, quiesce, repair } = io({ checkStatus: async () => OK_STATUS });
    const r = await repairHnswIfDiverged(i);
    expect(r.action).toBe("skip");
    expect(quiesce).not.toHaveBeenCalled();
    expect(repair).not.toHaveBeenCalled();
  });

  test("diverged → quiesce THEN repair, then re-verify (REBUILT)", async () => {
    const order: string[] = [];
    const quiesce = vi.fn(async () => { order.push("quiesce"); });
    const repair = vi.fn(async () => { order.push("repair"); });
    let calls = 0;
    const r = await repairHnswIfDiverged({
      checkStatus: async () => (calls++ === 0 ? DIVERGED_STATUS : OK_STATUS), // diverged, then aligned after rebuild
      quiesce, repair,
    });
    expect(r.action).toBe("repaired");
    expect(r.divergence).toBe(10100);
    expect(r.afterDivergence).toBe(0);
    expect(order).toEqual(["quiesce", "repair"]); // FD quiesce BEFORE the swap
  });

  test("diverged + repair throws → repair-failed (fail-soft; harvest stays ok)", async () => {
    const r = await repairHnswIfDiverged({
      checkStatus: async () => DIVERGED_STATUS,
      quiesce: async () => {},
      repair: async () => { throw new Error("exclusive lock held"); },
    });
    expect(r.action).toBe("repair-failed");
    expect(r.divergence).toBe(10100);
    expect(r.note).toContain("exclusive lock");
  });

  test("status read throws → check-failed (never crashes the harvest)", async () => {
    const r = await repairHnswIfDiverged({
      checkStatus: async () => { throw new Error("repair-status unavailable"); },
      quiesce: async () => { throw new Error("should not run"); },
      repair: async () => { throw new Error("should not run"); },
    });
    expect(r.action).toBe("check-failed");
    expect(r.divergence).toBeNull();
  });
});
