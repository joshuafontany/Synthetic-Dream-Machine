/**
 * ingest-hook-wing — the cross-language wing-slug agreement fixture.
 *
 * The wing law now lives ONCE in TS (src/wing-law.ts): the hook calls
 * `lares wing-of <transcript>` FIRST, keeping its bash/python pipeline only as the
 * broken-dist FALLBACK. This test (a) pins the fallback's agreement with the real
 * `wingFromDir` (imported, the old mirror retired), (b) pins the ladder — the hook
 * still calls `wing-of` first, and (c) exercises the resolver itself on a synthetic
 * transcript (recorded cwd → wing; sibling-first; no cwd → null, never a guess).
 */

import { describe, test, expect } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { wingFromDir, resolveTranscriptWing } from "../src/wing-law.js";

const HOOK = join(
  new URL("..", import.meta.url).pathname,
  ".claude-plugin", "hooks", "lares-mempalace-ingest-hook.sh",
);

const hookText = readFileSync(HOOK, "utf8");

/** Pull the hook's own slug/fallback/wing lines — the test runs the REAL pipeline. */
function extractLine(re: RegExp): string {
  const m = hookText.match(re);
  expect(m, `hook line ${re} not found — the wing derivation moved; re-anchor this fixture`).toBeTruthy();
  return m![0];
}

const slugLine     = extractLine(/^slug="\$\(printf[^\n]*\)"$/m);
const fallbackLine = extractLine(/^\[ -n "\$slug" \] \|\| slug="unsorted"$/m);
const wingLine     = extractLine(/^wing="wing_\$\{slug\}"$/m);

function bashWing(base: string): string {
  const script = [
    `base="$BASE_FIXTURE"`,
    slugLine,
    fallbackLine,
    wingLine,
    `printf '%s' "$wing"`,
  ].join("\n");
  const r = spawnSync("bash", ["-c", script], {
    env: { ...process.env, BASE_FIXTURE: base },
    encoding: "utf8",
  });
  expect(r.status).toBe(0);
  return r.stdout;
}

describe("hook wing-slug ≡ harvest.ts wingFromDir", () => {
  const fixtures = [
    "Synthetic-Dream-Machine",   // hyphen + case → wing_synthetic_dream_machine
    "My Project",                // space → underscore
    "weird@Name!.v2",            // punctuation stripped
    "already_snake_09",          // fixpoint
    "",                          // empty → wing_unsorted
  ];

  for (const base of fixtures) {
    test(`"${base}" derives the same wing in bash and TS`, () => {
      expect(bashWing(base)).toBe(wingFromDir(base));
    });
  }

  test("the known-project anchor holds byte-for-byte", () => {
    expect(bashWing("Synthetic-Dream-Machine")).toBe("wing_synthetic_dream_machine");
  });
});

describe("the hook's fallback ladder leads with the ONE resolver", () => {
  test("`lares wing-of` is called FIRST, validated to wing_*, python kept as fallback", () => {
    expect(hookText).toMatch(/"\$LARES" wing-of "\$transcript" --no-json/);
    expect(hookText).toMatch(/case "\$wing" in wing_\*\)/);          // never trust a non-wing echo
    expect(hookText.indexOf('wing-of')).toBeLessThan(hookText.indexOf('project_cwd=""')); // ladder order
  });
});

describe("resolveTranscriptWing — the resolver the hook + `lares wing-of` share", () => {
  function scratchProject(): { dir: string; done: () => void } {
    const dir = mkdtempSync(join(tmpdir(), "wing-of-"));
    return { dir, done: () => rmSync(dir, { recursive: true, force: true }) };
  }
  const row = (cwd?: string): string => JSON.stringify(cwd ? { cwd, type: "user" } : { type: "user" }) + "\n";

  test("derives the wing from the transcript's recorded cwd", () => {
    const { dir, done } = scratchProject();
    try {
      const t = join(dir, "session-b.jsonl");
      writeFileSync(t, row() + row("/home/op/Synthetic-Dream-Machine"));
      expect(resolveTranscriptWing(t)).toBe("wing_synthetic_dream_machine");
    } finally { done(); }
  });

  test("the FIRST sibling's cwd wins (the project dir's stable identity, discoverClaude parity)", () => {
    const { dir, done } = scratchProject();
    try {
      writeFileSync(join(dir, "a-first.jsonl"), row("/home/op/Stable-Project"));
      const t = join(dir, "z-later.jsonl");
      writeFileSync(t, row("/home/op/some/drifted-subdir"));
      expect(resolveTranscriptWing(t)).toBe("wing_stable_project");
    } finally { done(); }
  });

  test("no recorded cwd anywhere → null (fail loud, never a guessed wing)", () => {
    const { dir, done } = scratchProject();
    try {
      const t = join(dir, "bare.jsonl");
      writeFileSync(t, row() + row());
      expect(resolveTranscriptWing(t)).toBeNull();
    } finally { done(); }
  });
});
