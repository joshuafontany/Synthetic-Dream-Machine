/**
 * What a vessel holds against what it has declared.
 *
 * The starred tests carry the doctrine rather than the mechanics: a witness that repaired would publish on
 * the operator's behalf, and a correction naming a verb that does not exist spends the reader's trust the
 * first time they type it.
 */
import { describe, expect, test } from "vitest";

import { holdingsWitnessLines, witnessHoldings, type HoldingsReading } from "../src/holdings-witness.js";

const CROSSROADS = "lar:///ha.ka.ba/bags/@crossroads";
const NOTES      = "lar:///ha.ka.ba/bags/@notes";

const reading = (over: Partial<HoldingsReading>): HoldingsReading => ({
  onDisk:   new Map(),
  declared: new Map(),
  casHolds: () => true,
  ...over,
});

describe("★ held is not declared ★", () => {
  test("★ a text in the crossroads mirror that nobody admitted reads as UNDECLARED ★", () => {
    // Bytes on disk publish nothing. The operator believes it published; no stranger mounting the floor
    // can see it, and nothing throws to say so.
    const f = witnessHoldings(reading({ onDisk: new Map([[CROSSROADS, ["library/twain.txt"]]]) }));
    expect(f).toHaveLength(1);
    expect(f[0]?.kind).toBe("undeclared");
    expect(f[0]?.reading).toContain("declared to no Nexus");
  });

  test("★ where no verb stands, the correction SAYS so rather than inventing one ★", () => {
    // A correction naming a command that does not exist is worse than no correction: the reader types it,
    // it fails, and the next warning they see reads as noise.
    const f = witnessHoldings(reading({ onDisk: new Map([[CROSSROADS, ["library/twain.txt"]]]) }));
    expect(f[0]?.correction).toContain("no verb stands");
    expect(f[0]?.correction).not.toMatch(/^lares /);
  });

  test("an ordinary bag names the verb that DOES stand", () => {
    const f = witnessHoldings(reading({ onDisk: new Map([[NOTES, ["a.mem"]]]) }));
    expect(f[0]?.correction).toBe(`lares ingest --bag ${NOTES}`);
  });

  test("a path already declared raises nothing — agreement is silent", () => {
    const f = witnessHoldings(reading({
      onDisk:   new Map([[NOTES, ["a.mem"]]]),
      declared: new Map([[NOTES, [{ name: "a.mem", cid: "cid1" }]]]),
    }));
    expect(f).toEqual([]);
  });
});

describe("★ declared is not held ★", () => {
  test("★ an entry whose body rests nowhere reads as DANGLING ★", () => {
    // A stranger who reads that name learns only that something once stood there.
    const f = witnessHoldings(reading({
      declared: new Map([[CROSSROADS, [{ name: "library/twain.txt", cid: "gone" }]]]),
      casHolds: (c) => c !== "gone",
    }));
    expect(f).toHaveLength(1);
    expect(f[0]?.kind).toBe("dangling");
    expect(f[0]?.reading).toContain("no content store");
  });

  test("a declared entry whose bytes rest locally raises nothing", () => {
    const f = witnessHoldings(reading({
      declared: new Map([[CROSSROADS, [{ name: "x", cid: "here" }]]]),
    }));
    expect(f).toEqual([]);
  });
});

describe("the report a reader actually meets", () => {
  test("★ nothing to say prints NOTHING — silence means agreement, never an unrun check ★", () => {
    expect(holdingsWitnessLines([])).toEqual([]);
  });

  test("every finding carries its reading and its correction, so no line needs a second lookup", () => {
    const f = witnessHoldings(reading({ onDisk: new Map([[NOTES, ["a.mem"]]]) }));
    const lines = holdingsWitnessLines(f).join("\n");
    expect(lines).toContain("a.mem");
    expect(lines).toContain("→ lares ingest");
  });

  test("order stays stable, so two runs differ only where the vessel did", () => {
    const r = reading({ onDisk: new Map([[NOTES, ["b.mem", "a.mem"]], [CROSSROADS, ["z.txt"]]]) });
    expect(witnessHoldings(r).map((f) => f.subject)).toEqual(witnessHoldings(r).map((f) => f.subject));
    expect(witnessHoldings(r).map((f) => f.subject)).toEqual(["z.txt", "a.mem", "b.mem"]);
  });
});
