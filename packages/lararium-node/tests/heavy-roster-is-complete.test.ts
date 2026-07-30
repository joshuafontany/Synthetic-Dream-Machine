/**
 * heavy-roster-is-complete — the serial `heavy` roster in vitest.config.ts DETECTS its own staleness.
 *
 * The config splits this package's suites into a full-parallel project and a serial one, because a
 * file standing a live WebSocketServer or a nested `worker_threads` island thrashes under 12-way file
 * parallelism: every such file passes green alone, and a DIFFERENT set reds each run under load — the
 * signature of contention rather than logic.
 *
 * That cure names its members in a hand-written array, and a hand-written array cannot notice a new
 * member. A test file added tomorrow that stands a WS server joins the PARALLEL project silently and
 * re-opens the storm; the only symptom is an intermittent red somewhere else, which reads as flake and
 * costs a day to trace back here. The house already ruled against exactly this shape — design-time
 * enumeration carries no way to detect what it missed.
 *
 * So the roster gets a reader. This test applies the config's OWN criteria to every suite in the
 * directory and fails naming any file that qualifies while sitting outside the array. The array stays
 * (vitest needs a literal list), and it stops being able to drift in silence.
 *
 * WHAT COUNTS AS HEAVY, taken from the config's stated reasoning:
 *   · binds a real listener  — `new WebSocketServer` · `createServer` · `.listen(`
 *   · stands a nested island — `new Worker(` · `worker_threads`
 *
 * A file that matches and belongs in the parallel project anyway (a mock that never binds, say) earns
 * its place on {@link ALLOWED_LIGHT} with the reason written down — an exemption a reader can weigh,
 * never a silent omission.
 */
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(testsDir, "..", "vitest.config.ts");

/** Files that trip a heaviness pattern yet belong in the parallel project. Each needs its reason. */
const ALLOWED_LIGHT: Record<string, string> = {
  // This reader itself only READS the source of other suites; it binds and spawns nothing.
  "tests/heavy-roster-is-complete.test.ts": "reads source text; stands no live resource",
};

/** The roster the config declares, parsed from the literal so the two can never disagree. */
function declaredHeavy(): string[] {
  const src = readFileSync(configPath, "utf8");
  const block = /const heavy = \[([\s\S]*?)\];/.exec(src);
  if (!block) throw new Error("vitest.config.ts no longer declares `const heavy = [...]` — update this reader");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Every suite in this directory, addressed the way the config addresses them. */
function allSuites(): string[] {
  return readdirSync(testsDir)
    .filter((f) => f.endsWith(".test.ts"))
    .map((f) => `tests/${f}`)
    .sort();
}

const HEAVINESS = [
  { why: "binds a listener", rx: /new WebSocketServer|createServer\s*\(|\.listen\s*\(/ },
  { why: "stands a nested island", rx: /new Worker\s*\(|worker_threads/ },
];

/** Why a suite reads heavy, or an empty list when it does not. */
function heavinessOf(suite: string): string[] {
  const src = readFileSync(path.resolve(testsDir, "..", suite), "utf8");
  return HEAVINESS.filter((h) => h.rx.test(src)).map((h) => h.why);
}

describe("the serial heavy roster detects its own staleness", () => {
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
