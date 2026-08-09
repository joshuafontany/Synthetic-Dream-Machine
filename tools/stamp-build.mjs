/**
 * stamp-build — record WHICH BYTES the current dist was built from.
 *
 * The fresh-build gate asks one question before it rebuilds: does the built output come from the source
 * the tree holds right now? It answers by comparing a content digest against this stamp, so a build that
 * never stamps reads as stale forever — and the gate would rebuild on the next lifecycle verb, mid-run,
 * which is precisely the disturbance the digest exists to avoid.
 *
 * So every full build stamps: the root `build` script runs this last, and the gate's own build calls the
 * TypeScript twin after it succeeds.
 *
 * ── THE TWO IMPLEMENTATIONS STAY IN LOCKSTEP ────────────────────────────────────────────────────
 * This file and `build-freshness.ts#sourceDigest` MUST compute the same digest — a build stamped by one
 * and read by the other would rebuild every time, silently, and the loop would look like nothing at all.
 * A test asserts the two agree, so a change to either fails loudly rather than drifting.
 *
 * The duplication buys the bootstrap: this runs BEFORE the CLI exists, so it cannot import from it.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const REPO = resolve(process.argv[2] ?? ".");
const STAMP = join(REPO, "node_modules", ".lares-build", "source-digest");

/** Path + bytes of every source carrier, walked in a stable order. Mirrors sourceDigest in the CLI. */
export function sourceDigest(dir) {
  const h = createHash("sha256");
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
      if (e.name.endsWith(".prev")) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|mts|cts|json)$/.test(e.name)) continue;
      // The path enters the digest RELATIVE to the walk root: an absolute one would fold the
      // checkout location in, so the same bytes would hash differently per machine and per cwd —
      // and a stamp that cannot travel is a stamp that always reads stale.
      try { h.update(relative(dir, full)); h.update(readFileSync(full)); } catch { /* unreadable — skip */ }
    }
  };
  walk(dir);
  return h.digest("hex");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const digest = sourceDigest(join(REPO, "packages"));
  mkdirSync(dirname(STAMP), { recursive: true });
  writeFileSync(STAMP, digest);
  console.log(`[stamp-build] ${digest.slice(0, 16)}… — the dist now names the bytes it came from`);
}
