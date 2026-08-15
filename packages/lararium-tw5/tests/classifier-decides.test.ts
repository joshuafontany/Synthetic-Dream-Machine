/**
 * A control sigil identifies by its CLASSIFIER, never by which head carries it.
 *
 * WHY THIS TEST EXISTS, AND WHAT IT LEARNED FROM. Splitting the sigil sets gave the frame sigils a control
 * head while every word sigil kept the speaking one. A carrier detector that matched the speaking head
 * alone then stopped seeing 554 of 555 framed memes — and NOTHING FAILED. A carrier that fails detection
 * routes down a different path, so the vessel comes up and the memes arrive wrong; a green suite reported
 * it fine because no test read detection against a swept meme.
 *
 * The cure generalises past the one detector: **every** control matcher stays indifferent to the head, so
 * a future head change cannot repeat this quietly in whichever matcher nobody re-read. This test walks the
 * matchers off SOURCE rather than from a list — a hand-kept roster would drift from the thing it names,
 * and drift is precisely the failure mode here.
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const PKG = resolve(__dirname, "..");

/** A regex literal that matches a control classifier — whatever head it happens to accept. */
const CONTROL_MATCHER = /\/\^?<<(\\\^|\[~\^\]|~)(?:[^\n]{0,80}?)&#x\(?:?0*(?:0001|0002|0003|0004|0011|0014)/g;

/** Every tracked source file in this package that could carry one. */
function trackedSources(): string[] {
  const out = execFileSync("git", ["ls-files", "src", "scripts"], {
    cwd: PKG, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  return out.split("\n").filter((f) => f.endsWith(".ts") && !f.includes("/dist/"));
}

describe("★ every control matcher stays indifferent to the head ★", () => {
  const files = trackedSources();

  test("the walk finds sources to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test("no control matcher pins a single head", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      let src: string;
      try { src = readFileSync(resolve(PKG, rel), "utf8"); } catch { continue; }
      for (const m of src.matchAll(CONTROL_MATCHER)) {
        // `[~^]` accepts both. `\^` or a bare `~` pins one, and a pinned matcher goes blind the day a
        // head moves — silently, because a missed carrier reroutes rather than throwing.
        if (m[1] !== "[~^]") offenders.push(`${rel} → ${m[0].slice(0, 56)}`);
      }
    }
    expect(offenders, `these matchers pin one head:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  test("the walk actually finds matchers — an empty sweep would pass vacuously", () => {
    const found = files.reduce((n, rel) => {
      try { return n + [...readFileSync(resolve(PKG, rel), "utf8").matchAll(CONTROL_MATCHER)].length; }
      catch { return n; }
    }, 0);
    expect(found).toBeGreaterThan(8);
  });
});

describe("the property the matchers must hold", () => {
  const CARRIER_SOH = /<<[~^][^&\n]*&#x(?:0001|0011);/;

  test("either head opens a carrier when the classifier follows", () => {
    expect(CARRIER_SOH.test("<<^ code:\"&#x0001;\" namespace:\"⚕\" ? -> lar:///x >>")).toBe(true);
    expect(CARRIER_SOH.test("<<~ ⚕&#x0001; ? -> lar:///x >>")).toBe(true);
    expect(CARRIER_SOH.test("<<^ code:\"&#x0011;\" namespace:\"⊙\" ? -> lar:///x >>")).toBe(true);
  });

  test("no classifier means no carrier, under either head", () => {
    expect(CARRIER_SOH.test("<<~ ahu #entry >>")).toBe(false);
    expect(CARRIER_SOH.test("<<^ code:\"&#x0002;\" >>")).toBe(false);   // a frame sigil, never a carrier opener
  });
});
