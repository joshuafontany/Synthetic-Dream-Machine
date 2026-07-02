/**
 * ingest-hook-wing — the cross-language wing-slug agreement fixture.
 *
 * The per-project wing derives in TWO languages: bash in the ingest hook
 * (.claude-plugin/hooks/lares-mempalace-ingest-hook.sh) and TypeScript in
 * harvest.ts (`wingFromDir`). The transform MUST agree — a divergence forks one
 * session's drawers across two wings. This test EXTRACTS the live slug pipeline
 * from the hook (so a hook edit breaks it loudly) and runs each fixture through
 * bash against the TS formula (mirrored below from harvest.ts wingFromDir;
 * unifying onto one resolver — e.g. `lares wing-of <dir>` — retires this mirror).
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";

const HOOK = join(
  new URL("..", import.meta.url).pathname,
  ".claude-plugin", "hooks", "lares-mempalace-ingest-hook.sh",
);

/** The TS side of the contract — harvest.ts `wingFromDir`, mirrored verbatim. */
function wingFromDir(dir: string): string {
  const slug = basename(dir).toLowerCase().replace(/[ -]/g, "_").replace(/[^a-z0-9_]/g, "");
  return `wing_${slug || "unsorted"}`;
}

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
