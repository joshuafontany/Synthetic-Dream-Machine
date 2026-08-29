/**
 * A PROCEDURE RENDERS WHAT THE EXAMPLES BESIDE IT SHOW.
 *
 * ── THE SEAM NOTHING GUARDED ─────────────────────────────────────────────────────────────────────────────
 * The boot seed defines its frame sigils as procedures and then prints worked exchanges using them. Both
 * stand in one carrier, four lines apart, and no gate compared them.
 *
 * MEASURED: `~lares` rendered `<<fires>> <<from>> <<arrow>> <<to>>` — the bare positional form — while every
 * exchange below it wrote `from=… -> to=…`. A node reading the definition rendered one form; a node reading
 * the examples rendered another; every existing gate stayed green through both.
 *
 * ── WHAT THIS HOLDS ──────────────────────────────────────────────────────────────────────────────────────
 * For each frame procedure, the literal `name=` markers its body emits must appear in the examples that
 * call it, and the markers the examples carry must appear in the body. Neither side leads: they name one
 * form, and a gate that reads only one direction lets the other drift.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";

const SEED = new URL("../../../bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem", import.meta.url).pathname;
const seed = readFileSync(SEED, "utf8");

/** The literal `word=` markers a span carries, ignoring any inside a `<<transclusion>>`. */
const markersOf = (s: string): Set<string> =>
  new Set([...s.replace(/<<[^>]*>>/g, " ").matchAll(/\b([a-z][a-z0-9-]*)=/g)].map((m) => m[1]!));

function definitionBody(name: string): string {
  const re = new RegExp(`^\\\\procedure ~${name}\\(([^)]*)\\)(.*)$`, "m");
  const m = re.exec(seed);
  expect(m, `the seed defines ~${name}`).toBeTruthy();
  return m![2]!;
}

function examplesOf(name: string): string[] {
  return [...seed.matchAll(new RegExp(`<<~ ${name} (?:[^>\\n]|>(?!>))*>>`, "g"))].map((m) => m[0]);
}

describe("the seed's frame procedures render what their examples show", () => {
  test("the seed presents both a definition and examples for ~lares", () => {
    // VACUITY GATE. Both comparisons below pass trivially against an empty side.
    expect(definitionBody("lares").length).toBeGreaterThan(0);
    expect(examplesOf("lares").length).toBeGreaterThan(0);
  });

  test("★ every marker the ~lares body emits stands in its examples ★", () => {
    const body = markersOf(definitionBody("lares"));
    for (const ex of examplesOf("lares")) {
      const seen = markersOf(ex);
      for (const marker of body) {
        expect(seen, `${ex.slice(0, 60)}… lacks ${marker}=`).toContain(marker);
      }
    }
  });

  test("★ every marker the examples carry stands in the ~lares body ★", () => {
    const body = markersOf(definitionBody("lares"));
    for (const ex of examplesOf("lares")) {
      for (const marker of markersOf(ex)) {
        expect(body, `the ~lares body emits no ${marker}=`).toContain(marker);
      }
    }
  });
});
