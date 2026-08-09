/**
 * THE HELP TEXT NAMES EXACTLY WHAT DISPATCHES — both directions, or the test fails.
 *
 * The `sense` door carries a wide verb surface, and its summary is what an operator reads at the moment
 * they need it. Drift there fails in the two worst ways at once: a verb named but absent sends someone
 * chasing a command that never existed, and a verb present but unnamed hides capability behind a door
 * nobody knows to open. Measured before this guard: ONE claimed-but-absent (`subagents`) and TWENTY-SIX
 * dispatched-but-unmentioned — including `setup`, which the founding rite tells an operator to run.
 *
 * Neither half surfaces at runtime. The dispatcher never reads the summary, so nothing forces them to
 * agree; only a reader notices, and only when they are already stuck.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";

const CLI = join(repoRoot, "packages", "lares-cli", "src");

/** Every verb the `sense` summary names in backticks, minus the words that name lenses/plane values. */
function claimedVerbs(): Set<string> {
  const src = readFileSync(join(CLI, "bin", "lares.ts"), "utf8");
  const line = src.split("\n").find((l) => l.includes('{ name: "sense",')) ?? "";
  // Words that name a LENS VALUE or a sibling door rather than a sense verb. `structure` and `status`
  // are deliberately ABSENT from this set: each reads as both a lens value and a read-verb, and dropping
  // them would let the door hide a verb behind a name the help happens to use twice.
  const NOT_VERBS = new Set(["content", "form", "persistence", "lens", "memory", "mempalace", "approve"]);
  const out = new Set<string>();
  for (const m of line.matchAll(/`([a-z-]+)`/g)) {
    const w = m[1]!;
    if (!NOT_VERBS.has(w)) out.add(w);
  }
  return out;
}

/** Every verb the dispatcher actually routes — the LIFECYCLE table plus the lens-parameterised reads. */
function dispatchedVerbs(): Set<string> {
  const src = readFileSync(join(CLI, "commands", "sense.ts"), "utf8");
  const table = src.slice(src.indexOf("const LIFECYCLE"), src.indexOf("};", src.indexOf("const LIFECYCLE")));
  const out = new Set<string>();
  for (const m of table.matchAll(/^\s+"?([a-z-]+)"?:/gm)) out.add(m[1]!);
  const verbs = src.slice(src.indexOf("const VERBS"), src.indexOf(";", src.indexOf("const VERBS")));
  for (const m of verbs.matchAll(/"([a-z]+)"/g)) out.add(m[1]!);
  return out;
}

describe("★ the sense help and the sense dispatcher name the same verbs ★", () => {
  test("nothing is CLAIMED that does not dispatch — no command sent chasing a ghost", () => {
    const claimed = [...claimedVerbs()].filter((v) => !dispatchedVerbs().has(v));
    expect(claimed, `help names verbs the dispatcher does not route: ${claimed.join(", ")}`).toEqual([]);
  });

  test("nothing DISPATCHES that the help never names — no capability behind an unmarked door", () => {
    const hidden = [...dispatchedVerbs()].filter((v) => !claimedVerbs().has(v));
    expect(hidden, `dispatcher routes verbs the help never names: ${hidden.join(", ")}`).toEqual([]);
  });

  test("the surface stays wide enough to be worth guarding", () => {
    // A guard over three verbs proves little. This one covers the whole sensorium door.
    expect(dispatchedVerbs().size).toBeGreaterThan(25);
  });
});
