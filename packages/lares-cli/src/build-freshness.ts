/**
 * build-freshness — the Fresh-Build Invariant for daemon-lifecycle commands.
 *
 * A `lares` run loads the workspace packages from their BUILT dist. A stale dist
 * silently runs OLD code — and for a found/boot/mutate verb that means founding an
 * identity or booting the daemon with superseded logic — e.g. a `vessel found` against
 * a stale `@lararium/node` dist calls the keyhive ceremony without the signer seed and
 * crashes mid-ceremony, leaving a half-founded vessel.
 *
 * Node caches modules at import, so building MID-process cannot reload them. The only
 * sound cure is **build-then-re-exec**: build the whole workspace, then re-run the SAME
 * command in a FRESH process (clean module cache → loads the just-built dist).
 *
 * Best-practice shape for these CLI-managed daemon verbs:
 *   - Fresh-build invariant — never found/boot from stale dist (this module).
 *   - Idempotent          — every verb re-runs safely (`found` skips-if-founded, `stand`
 *                           attaches-or-starts, the build no-ops when current).
 *   - Fail-loud           — a build failure ABORTS; the daemon never runs from stale code.
 *   - Composable          — install = build + found + stand + wire, each step re-runnable.
 *
 * An invocation `needsFreshBuild` accepts routes through `freshBuildGate` before its handler.
 * The `--skip-build` sentinel marks the re-exec'd child (build already done) so it runs
 * its handler directly — ending the recursion.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, type Dirent } from "node:fs";
import { join, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
import { repoRoot } from "@lararium/mesh/node";
import type { ParsedArgs } from "./parse-args.js";

/**
 * Does this invocation found / boot / mutate identity from workspace code?
 *
 * DERIVED, never rostered. A remembered list of verb names drifts the moment a surface changes — the
 * same defect the vessel door exists to close. Every substrate motion rides ONE door, so membership
 * reads off that door rather than off a name someone has to recall.
 *
 * The test states the EXCEPTIONS, so it fails safe: a sub-door added later is gated until someone
 * argues otherwise. Only two motions neither found nor boot — `read` inspects and starts nothing, and
 * `stop` is pure port-control that loads no vessel logic.
 */
const NEVER_STALE: ReadonlySet<string> = new Set(["read", "stop", "help"]);

export function needsFreshBuild(args: ParsedArgs): boolean {
  if (args.command !== "vessel") return false;
  const sub = args.positional[0];
  return sub !== undefined && !NEVER_STALE.has(sub);
}

const BUILT_LARES_BIN = join(repoRoot, "packages", "lares-cli", "dist", "src", "bin", "lares.js");
/** The digest the current dist was built from, and the lock that keeps one writer. Both sit beside dist. */
const BUILD_STAMP = join(repoRoot, "node_modules", ".lares-build", "source-digest");
const BUILD_LOCK  = join(repoRoot, "node_modules", ".lares-build", "build.lock");

/**
 * A digest of every source carrier under `dir` — path + bytes, walked in a stable order.
 *
 * FRESHNESS READS CONTENT RATHER THAN CLOCKS. An mtime comparison calls a tree stale whenever a
 * checkout, a `touch`, a restored file or a skewed clock moves a timestamp without moving a byte —
 * and a spurious "stale" is not merely wasteful here, because the rebuild it triggers is the thing
 * that has repeatedly broken the tree. It also runs the other way: an editor that preserves mtimes
 * hides a real change, and a false "fresh" runs superseded logic against real identity.
 *
 * Content answers both. Two trees with the same bytes ARE the same build, whatever their clocks say.
 */
export function sourceDigestForTest(dir: string): string { return sourceDigest(dir); }

function sourceDigest(dir: string): string {
  const h = createHash("sha256");
  const walk = (d: string): void => {
    let entries: Dirent[];
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
      if (e.name.endsWith(".prev")) continue;   // a retired output, never a source
      const full = join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|mts|cts|json)$/.test(e.name)) continue;
      // RELATIVE to the walk root — an absolute path folds the checkout location into the digest,
      // so the same bytes would hash differently per machine and per cwd, and the stamp would never match.
      try { h.update(relative(dir, full)); h.update(readFileSync(full)); } catch { /* unreadable — skip */ }
    }
  };
  walk(dir);
  return h.digest("hex");
}

/**
 * Does the built dist come from THESE bytes? Fresh when the recorded digest matches what the tree
 * currently holds; stale on any mismatch, and stale when no build has ever stamped one.
 */
function isWorkspaceStale(): boolean {
  if (!existsSync(BUILT_LARES_BIN)) return true;
  const digest = sourceDigest(join(repoRoot, "packages"));
  let stamped: string | null = null;
  try { stamped = readFileSync(BUILD_STAMP, "utf8").trim(); } catch { stamped = null; }
  return stamped !== digest;
}

/** Record the digest the current dist was built FROM — written only after a build succeeds. */
function stampBuild(): void {
  try {
    mkdirSync(dirname(BUILD_STAMP), { recursive: true });
    writeFileSync(BUILD_STAMP, sourceDigest(join(repoRoot, "packages")));
  } catch { /* a stamp we cannot write costs one extra build, never correctness */ }
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
  // And the rebuild is not free to attempt: it re-emits every package's dist while a daemon runs from it.
  // Measured, when a liveness check reached for the stand door: the gate fired, the build cleared dist,
  // and the running node lost `node-host.js` mid-flight — the probe killed what it was measuring, then
  // reported it dead. `build` re-emits without clearing today (`build:clean` holds the clearing), so the
  // sharpest edge has moved; the rule stands on the principle rather than on that one blast radius. A
  // reading must not be able to disturb what it reads, and this is where that promise gets kept.
  if (args.flags["observe"]) return null;
  if (!isWorkspaceStale()) return null;        // dist clearly current — run the handler in-process

  // ONE WRITER. Two builds over one dist race with nothing between them, and the loser writes into a
  // tree the winner is mid-way through replacing. An exclusive create IS the lock: the filesystem
  // settles it, so no check-then-act window opens between asking and holding.
  let held = false;
  try {
    mkdirSync(dirname(BUILD_LOCK), { recursive: true });
    writeFileSync(BUILD_LOCK, String(process.pid), { flag: "wx" });
    held = true;
  } catch {
    console.error("[lares] fresh-build: another build holds the lock — refusing to race it.");
    console.error(`  wait for it, or clear a lock no process holds: rm ${BUILD_LOCK}`);
    return 1;
  }

  console.error("[lares] fresh-build: source changed since the last build — rebuilding before the daemon-lifecycle step…");
  const build = spawnSync("pnpm", ["-r", "build"], {
    cwd:   repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (held) rmSync(BUILD_LOCK, { force: true });
  if (build.status !== 0) {
    console.error("[lares] fresh-build: workspace build FAILED — aborting (never run the daemon from stale dist).");
    console.error("  the previous output stands: `build` re-emits dist without clearing it, so nothing was destroyed.");
    return build.status ?? 1;
  }
  stampBuild();   // only a SUCCEEDING build earns a stamp — a failed one leaves the tree reading stale

  // Re-exec the SAME invocation against the just-built bin, in a fresh process. The
  // `--skip-build` sentinel (appended last) ends the recursion and tells the child to
  // run its handler directly.
  const child = spawnSync(process.execPath, [BUILT_LARES_BIN, ...argv, "--skip-build"], {
    stdio: "inherit",
    env:   process.env,
  });
  return child.status ?? 1;
}
