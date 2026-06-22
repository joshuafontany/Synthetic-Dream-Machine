import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBearing, readBearings, queryBearings, type BearingRecord } from "../src/bearing-index.js";

function rec(over: Partial<BearingRecord>): BearingRecord {
  return {
    ts: "2026-06-21T10:00:00Z",
    sessionId: "s1",
    turn: "m1",
    aim: "lar:///operator.weighs.deps",
    yield: "lar:///council.fork.named",
    confidence: 18,
    driftFlags: [],
    validFrom: null,
    validTo: null,
    sourceDrawerId: null,
    ...over,
  };
}

describe("bearing-index (local-only NDJSON store)", () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bearings-"));
    file = join(dir, "mempalace", "bearing-index.ndjson");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("appends and reads back round-trip (creates dirs on first write)", () => {
    appendBearing(file, rec({ turn: "m1" }));
    appendBearing(file, rec({ turn: "m2", aim: "lar:///breach.watch.fires" }));
    const all = readBearings(file);
    expect(all).toHaveLength(2);
    expect(all[1].aim).toBe("lar:///breach.watch.fires");
  });

  it("reads an empty/absent file as []", () => {
    expect(readBearings(file)).toEqual([]);
  });

  it("crash-degrades: drops a torn trailing line, keeps the rest", () => {
    appendBearing(file, rec({ turn: "m1" }));
    writeFileSync(file, JSON.stringify(rec({ turn: "m1" })) + "\n" + '{"partial":', { flag: "w" });
    const all = readBearings(file);
    expect(all).toHaveLength(1);
  });

  it("is append-only: same (aim,yield) on different turns are NOT deduped", () => {
    appendBearing(file, rec({ turn: "m1" }));
    appendBearing(file, rec({ turn: "m2" })); // identical aim/yield, different turn
    expect(readBearings(file)).toHaveLength(2);
  });

  it("preserves drifted URIs verbatim (no normalization)", () => {
    appendBearing(file, rec({ turn: "m1", aim: "lar:///Breach.Watch.Fires" }));
    expect(readBearings(file)[0].aim).toBe("lar:///Breach.Watch.Fires");
  });

  it("keeps both drifted spellings distinct, and matches verbatim (case-sensitive)", () => {
    appendBearing(file, rec({ turn: "m1", aim: "lar:///Breach.Watch.Fires", confidence: 8 }));
    appendBearing(file, rec({ turn: "m2", aim: "lar:///breach.watch.fires", confidence: 8 }));
    // both stored distinctly — a case-identical substring finds both (no collision)
    expect(queryBearings(file, { aimLike: "reach." })).toHaveLength(2);
    // verbatim: matching is case-sensitive, so the drift is never folded away
    expect(queryBearings(file, { aimLike: "Watch" })).toHaveLength(1);
    expect(queryBearings(file, { aimLike: "watch" })).toHaveLength(1);
  });

  it("drift-gauge: maxConfidence surfaces only drifted bearings", () => {
    appendBearing(file, rec({ turn: "m1", confidence: 18 }));
    appendBearing(file, rec({ turn: "m2", confidence: 8, driftFlags: ["arity:2"] }));
    const drifted = queryBearings(file, { maxConfidence: 12 });
    expect(drifted).toHaveLength(1);
    expect(drifted[0].driftFlags).toEqual(["arity:2"]);
  });

  it("asOf reads the gradient span (validFrom..validTo)", () => {
    appendBearing(file, rec({ turn: "m1", validFrom: "2026-06-01T00:00:00Z", validTo: "2026-06-10T00:00:00Z" }));
    expect(queryBearings(file, { asOf: "2026-06-05T00:00:00Z" })).toHaveLength(1);
    expect(queryBearings(file, { asOf: "2026-06-20T00:00:00Z" })).toHaveLength(0);
  });
});
