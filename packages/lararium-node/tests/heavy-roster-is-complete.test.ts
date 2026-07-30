/**
 * heavy-roster-is-complete — the serial roster and its criteria both derive from the config.
 *
 * `vitest.config.ts` splits this package into a full-parallel project and a serial one, because a suite
 * standing a live resource starves the box under full parallelism. That split names its members in a
 * literal array (vitest needs one), and a literal array cannot notice a new member: a suite added
 * tomorrow that binds a listener joins the parallel project and re-opens the storm, surfacing later as
 * an intermittent red somewhere else that reads as flake and costs a day to trace back here.
 *
 * So the roster gets a reader. It imports {@link THRASHERS} — the config's OWN class list, not a copy —
 * walks every suite under `tests/` RECURSIVELY, and fails naming any file that matches a class while
 * sitting outside the array.
 *
 * BOTH OF THOSE WORDS CARRY WEIGHT, because an earlier shape lacked them and stayed green while wrong:
 *   · IMPORTS, never re-encodes. Re-stating the criteria here made this reader a second hand-written
 *     list of one fact. The config named three classes, this file encoded two, and four suites standing
 *     a python holder ran parallel under a green check. A reader that carries authority and misses a
 *     class is worse than no reader — a maintainer distrusts a bare array and believes a green test.
 *   · RECURSIVELY. A flat `readdirSync` cannot see `tests/e2e/`, so the reader was structurally blind to
 *     a whole directory it existed to police.
 *
 * A suite matching a class that belongs in the parallel project anyway earns a line in
 * {@link ALLOWED_LIGHT} with its reason — an exemption a reader can weigh, never a silent omission.
 */
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { THRASHERS, heavy as DECLARED_HEAVY, mainExclude } from "../vitest.config.js";
import { fileURLToPath } from "node:url";

const testsDir = path.dirname(fileURLToPath(import.meta.url));

/** Files that trip a heaviness pattern yet belong in the parallel project. Each needs its reason. */
const ALLOWED_LIGHT: Record<string, string> = {
  // This reader itself only READS the source of other suites; it binds and spawns nothing.
  "tests/heavy-roster-is-complete.test.ts": "reads source text; stands no live resource",
};

/** The roster the config declares — read from the module, so the two cannot disagree. */
function declaredHeavy(): string[] {
  return [...DECLARED_HEAVY];
}

/** Every suite under `tests/`, at any depth, addressed the way the config addresses them. */
function allSuites(dir = testsDir, prefix = "tests"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...allSuites(full, `${prefix}/${entry}`));
    else if (entry.endsWith(".test.ts")) out.push(`${prefix}/${entry}`);
  }
  return out.sort();
}


/** Why a suite reads heavy, or an empty list when it does not. */
function heavinessOf(suite: string): string[] {
  const src = readFileSync(path.resolve(testsDir, "..", suite), "utf8");
  return THRASHERS.filter((h) => h.rx.test(src)).map((h) => h.why);
}

/**
 * Suites deliberately outside every project's `include`, each with the reason. A suite reachable by NO
 * project runs nowhere and rots in silence — `tests/e2e/two-vessel-mesh.test.ts` sat unrun long enough to
 * fall behind `runInit`'s hearth-true-name requirement, and nothing said so. Listing it here keeps the
 * fact readable; deleting the entry without deleting the file makes this reader fail.
 */
const EXCLUDED_BY_DESIGN: Record<string, string> = {
  "tests/e2e/two-vessel-mesh.test.ts":
    "excluded from `main`, absent from `heavy` — the two-vessel founding ceremony. It fails against " +
    "current `runInit` (hearth true-name absent) and awaits an operator ruling: repair and roster, or retire.",
};

describe("the serial heavy roster detects its own staleness", () => {
  test("every suite is reachable by some project, or excluded on the record", () => {
    // Reachability derives from the config's OWN exclude list, never a restatement of it.
    const excludedDirs = mainExclude.filter((p) => p.endsWith("/**")).map((p) => p.slice(0, -3));
    const roster = new Set(declaredHeavy());
    const orphaned = allSuites().filter(
      (s) => !roster.has(s) && excludedDirs.some((d) => s.startsWith(`${d}/`)) && !(s in EXCLUDED_BY_DESIGN),
    );
    expect(
      orphaned,
      `These suites belong to no vitest project, so they never run and nothing reports their absence:\n  ` +
        orphaned.join("\n  "),
    ).toEqual([]);
  });

  test("every suite that stands a live resource sits in the roster", () => {
    const roster = new Set(declaredHeavy());
    const missing = allSuites()
      .filter((s) => !roster.has(s) && !(s in ALLOWED_LIGHT))
      .map((s) => ({ suite: s, why: heavinessOf(s) }))
      .filter((r) => r.why.length > 0);

    expect(
      missing,
      `These suites stand a live resource and run in the PARALLEL project, which is the condition ` +
        `that produced the intermittent reds the heavy roster exists to cure. Add each to \`const heavy\` ` +
        `in vitest.config.ts, or list it in ALLOWED_LIGHT with the reason it stays parallel:\n` +
        missing.map((m) => `  ${m.suite} — ${m.why.join(", ")}`).join("\n"),
    ).toEqual([]);
  });

  test("the roster names no suite that has been deleted or renamed", () => {
    const present = new Set(allSuites());
    const orphans = declaredHeavy().filter((s) => !present.has(s));
    expect(
      orphans,
      `The heavy roster names suites that no longer exist. A stale entry costs nothing at runtime and ` +
        `quietly teaches the next reader that the roster is approximate:\n  ${orphans.join("\n  ")}`,
    ).toEqual([]);
  });

  test("every ALLOWED_LIGHT exemption still applies to a suite that exists", () => {
    const present = new Set(allSuites());
    const dead = Object.keys(ALLOWED_LIGHT).filter((s) => !present.has(s));
    expect(dead, `Exemptions outliving their suite:\n  ${dead.join("\n  ")}`).toEqual([]);
  });
});
