/**
 * build-freshness — the Fresh-Build Invariant for daemon-lifecycle commands.
 *
 * A `lares` run loads the workspace packages from their BUILT dist. A stale dist
 * silently runs OLD code — and for a found/boot/mutate verb that means founding an
 * identity or booting the daemon with superseded logic — e.g. an `init` against a
 * stale `@lararium/node` dist calls the keyhive ceremony without the signer seed and
 * crashes mid-ceremony, leaving a half-founded vessel.
 *
 * Node caches modules at import, so building MID-process cannot reload them. The only
 * sound cure is **build-then-re-exec**: build the whole workspace, then re-run the SAME
 * command in a FRESH process (clean module cache → loads the just-built dist).
 *
 * Best-practice shape for these CLI-managed daemon verbs:
 *   - Fresh-build invariant — never found/boot from stale dist (this module).
 *   - Idempotent          — every verb is safe to re-run (init skips-if-founded, wake
 *                           attaches-or-starts, build no-ops when current).
 *   - Fail-loud           — a build failure ABORTS; the daemon never runs from stale code.
 *   - Composable          — install = build + init + wake + wire, each step re-runnable.
 *
 * Commands in FRESH_BUILD_COMMANDS route through `freshBuildGate` before their handler.
 * The `--skip-build` sentinel marks the re-exec'd child (build already done) so it runs
 * its handler directly — ending the recursion.
 */

import { spawnSync } from "node:child_process";
import { existsSync, statSync, readdirSync, type Dirent } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
import type { ParsedArgs } from "./parse-args.js";

/** Daemon-lifecycle verbs that found / boot / mutate identity from workspace code. */
export const FRESH_BUILD_COMMANDS: ReadonlySet<string> = new Set([
  "init", "wake", "serve", "dev", "rebuild", "reset", "fresh", "reconcile", "build-genesis",
]);

const BUILT_LARES_BIN = join(repoRoot, "packages", "lares-cli", "dist", "src", "bin", "lares.js");

/** Newest mtime of any source carrier under `dir` (skips dist/node_modules/.git). */
function newestSrcMtime(dir: string): number {
  let newest = 0;
  let entries: Dirent[];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      const m = newestSrcMtime(full);
      if (m > newest) newest = m;
    } else if (/\.(ts|mts|cts|json)$/.test(e.name)) {
      try { const m = statSync(full).mtimeMs; if (m > newest) newest = m; } catch { /* unreadable — skip */ }
    }
  }
  return newest;
}

/**
 * CONSERVATIVE staleness check — skip the build only when the workspace is CLEARLY current
 * (the built bin exists and is newer than every source carrier). Any doubt → build. Since the
 * gate always runs a FULL `pnpm -r build` (the bin is built last, depending on everything), a
 * gate-run leaves the bin newest; a later src edit makes it stale again. Biased toward
 * correctness: a false "stale" only costs an idempotent build; a false "fresh" runs old code.
 */
function isWorkspaceStale(): boolean {
  if (!existsSync(BUILT_LARES_BIN)) return true;
  const binMtime = statSync(BUILT_LARES_BIN).mtimeMs;
  return newestSrcMtime(join(repoRoot, "packages")) > binMtime;
}

/**
 * The gate. Returns `null` when the workspace is already fresh (the `--skip-build`
 * child) — the caller then runs the command handler directly. Otherwise builds the
 * workspace (idempotent) and re-execs the SAME command in a fresh process, returning
 * that process's exit code for the caller to propagate. A build failure aborts and
 * returns its non-zero code — the daemon NEVER runs from stale dist.
 */
export function freshBuildGate(argv: readonly string[], args: ParsedArgs): number | null {
  if (args.flags["skip-build"]) return null;   // re-exec'd child — already fresh
  // OBSERVING NEVER FOUNDS OR BOOTS, so it never earns a rebuild. The gate exists because founding or
  // booting from stale dist runs superseded logic against real identity; a caller holding the observe cap
  // alone mutates nothing, so the danger it guards cannot arise.
  //
  // And the rebuild is not free to attempt: `pnpm -r build` CLEANS dist first, so a probe that triggered
  // one would delete the modules out from under any daemon already running — measured, when a liveness
  // check reached for `wake` and killed the node it was measuring. A reading must not be able to disturb
  // what it reads; the capability split says so, and this is where that promise gets kept.
  if (args.flags["observe"]) return null;
  if (!isWorkspaceStale()) return null;        // dist clearly current — run the handler in-process

  console.error("[lares] fresh-build: source changed since the last build — rebuilding before the daemon-lifecycle step…");
  const build = spawnSync("pnpm", ["-r", "build"], {
    cwd:   repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (build.status !== 0) {
    console.error("[lares] fresh-build: workspace build FAILED — aborting (never run the daemon from stale dist).");
    return build.status ?? 1;
  }

  // Re-exec the SAME invocation against the just-built bin, in a fresh process. The
  // `--skip-build` sentinel (appended last) ends the recursion and tells the child to
  // run its handler directly.
  const child = spawnSync(process.execPath, [BUILT_LARES_BIN, ...argv, "--skip-build"], {
    stdio: "inherit",
    env:   process.env,
  });
  return child.status ?? 1;
}
