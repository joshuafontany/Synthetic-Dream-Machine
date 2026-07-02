/**
 * merge-gate — the fan-in merge as a validating, order-assigning, reject-recycling GATE + the
 * consume-license-on-commit flow: skip a spent license, dead-letter a failed proofread, else commit.
 */
import { describe, test, expect } from "vitest";
import { mergeGate, type MergeItem } from "../src/index.js";

const item = (seq: number, key: string): MergeItem<number> => ({ seq, key, embedded: seq * 10 });
const acceptAll = () => ({ ok: true } as const);

describe("merge-gate — validate · consume-license · dead-letter", () => {
  test("fresh license + passes proofread → commit", () => {
    const v = mergeGate(item(1, "k1"), new Set(), acceptAll);
    expect(v.kind).toBe("commit");
    if (v.kind === "commit") expect(v.item.embedded).toBe(10);
  });

  test("license already consumed → idempotent skip (never re-commits)", () => {
    const v = mergeGate(item(2, "k1"), new Set(["k1"]), acceptAll);
    expect(v).toEqual({ kind: "skip-licensed", key: "k1" });
  });

  test("fails the proofread → dead-letter WITH the reason (kept, never dropped)", () => {
    const v = mergeGate(item(3, "k3"), new Set(), () => ({ ok: false, reason: "malformed" }));
    expect(v).toEqual({ kind: "dead-letter", key: "k3", reason: "malformed" });
  });

  test("consume-license precedes proofread — a spent key skips even if it would fail validation", () => {
    const v = mergeGate(item(4, "k1"), new Set(["k1"]), () => ({ ok: false, reason: "would-fail" }));
    expect(v.kind).toBe("skip-licensed");           // already resolved once → no re-work, no re-reject
  });

  test("pure — the same inputs give the same verdict, no side effects", () => {
    const licensed = new Set<string>();
    const a = mergeGate(item(1, "k1"), licensed, acceptAll);
    const b = mergeGate(item(1, "k1"), licensed, acceptAll);
    expect(a).toEqual(b);
    expect(licensed.size).toBe(0);                  // the gate consumes nothing itself — the caller does, on land
  });
});
