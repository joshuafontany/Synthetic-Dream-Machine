/**
 * Scripted commands — thin shells over existing tsx scripts and pnpm composers.
 *
 * These commands do not refactor the underlying scripts; they invoke them via
 * child_process. The script files remain the source of truth for their logic.
 */

import { join } from "node:path";
import { runTsxScript, runCommand } from "../spawn.js";
import { repoRoot as REPO_ROOT } from "@lararium/mesh/node";
import { larDataDir, larProjectionDir, larIdentityDir, larariumDataHome, larRoot } from "../env.js";
import type { ParsedArgs } from "../parse-args.js";

const NODE_PKG = join(REPO_ROOT, "packages", "lararium-node");

export async function cmdBake(args: ParsedArgs): Promise<number> {
  // Genesis is corpus-relative — larRoot() (LAR_ROOT ?? repoRoot), NOT the vessel home.
  const genesisDir = args.options["genesis"] ?? join(larRoot(), "genesis");
  const env = { ...process.env, LAR_GENESIS: genesisDir };
  return runCommand("pnpm", ["--filter", "@lararium/node", "build:genesis"], REPO_ROOT, env);
}

export async function cmdTestQuine(_args: ParsedArgs): Promise<number> {
  return runTsxScript(join(NODE_PKG, "scripts", "test-quine.ts"));
}

export async function cmdHeleuma(args: ParsedArgs): Promise<number> {
  const scriptArgs: string[] = [];
  if (args.flags["write"]) scriptArgs.push("--write");
  return runTsxScript(join(REPO_ROOT, "scripts", "heleuma.ts"), scriptArgs);
}

/** `lares vessel stand --foreground` — boot the lararium node only (no Vite).
 *
 *  Runs the BUILT dist, never tsx-source: the sovereign island workers spawn from
 *  compiled `.js` siblings (`node-daemon-island.js` / `node-wiki-island.js`, no
 *  `execArgv`), so a tsx-source run produces a half-dead vessel (port bound, daemon
 *  worker ERR_MODULE_NOT_FOUND). `node dist/src/main.js` names the only sound boot
 *  (= the package `start` script, the e2e harness). */
export async function cmdStandForeground(args: ParsedArgs): Promise<number> {
  const { existsSync } = await import("node:fs");
  const distMain = join(NODE_PKG, "dist", "src", "main.js");
  if (!existsSync(distMain)) {
    console.error(`[lares vessel stand --foreground] ${distMain} not found — run \`pnpm build\` first (the island workers are compiled; tsx-source cannot spawn them).`);
    return 1;
  }
  const extraArgs: string[] = [];
  if (args.options["wiki"])    extraArgs.push("--wiki",    args.options["wiki"]);
  if (args.options["port"])    extraArgs.push("--port",    args.options["port"]);
  if (args.options["root"])    extraArgs.push("--root",    args.options["root"]);
  if (args.flags["debug"])     extraArgs.push("--debug");
  return runCommand("node", [distMain, ...extraArgs], NODE_PKG);
}

/** `lares vessel stand --with-app` — boot node + Vite app concurrently (full dev experience). */
export async function cmdStandWithApp(_args: ParsedArgs): Promise<number> {
  // Defer to the workspace-root `pnpm dev` script which already wires
  // `concurrently -n node,vite`. Touching that orchestration here would
  // duplicate config that's better kept at one site.
  return runCommand("pnpm", ["dev"]);
}

/**
 * `lares vessel clear` — wipe the vessel store (`<lares>/vessel`) + bootstrap artifact, then re-init.
 *
 * Operator-confirmation gate: the wipe refuses without `--force`, so destruction stays a
 * deliberate second act.
 */
/**
 * The clear wipe-list — the ONE spelling of every path `lares vessel clear` deletes, resolved at
 * call time (AFTER any --root sets LAR_ROOT). Exported for the wipe-list contract test:
 * the projection watermark dies WITH the store; identity NEVER appears here.
 *
 * larDataDir()/larProjectionDir() resolve the canonical XDG dirs deterministically, so the
 * wipe names them directly.
 */
export function clearTargets(): Array<{ path: string; recursive: boolean }> {
  const gen = (name: string, recursive = false) => ({ path: join(larRoot(), "genesis", name), recursive });
  return [
    // The store, and the social bootstrap WITH it — the address book lives INSIDE `<lares>/vessel`, so
    // it dies with the docs it addresses rather than by this list remembering to name it. An address
    // book that outlived a clear would point at destroyed docs, which is why it sits outside the corpus.
    { path: larDataDir(), recursive: true },   // the vessel store (<lares>/vessel) + the bootstrap within
    gen("island.bin"),
    gen("island.sha256"),
    gen("island.sha256-pre"),                  // the pre-split SHA sidecar — a clear target, so no stale digest survives
    gen("island.cid"),
    gen("island.cid-engine"),
    gen("island.cid-plugins"),
    gen("island.manifest.json"),               // G-CAS slice 1: the CAS index
    gen("cas", true),                          // G-CAS slice 1: the blob bytes
    // The projection watermark (synced-tree) must die WITH the store — a surviving watermark makes
    // a post-clear ingest read every bags/*.md as "unchanged" and the fresh empty docs stay empty,
    // silently.
    { path: larProjectionDir(), recursive: true },
  ];
}

export async function cmdClear(args: ParsedArgs): Promise<number> {
  const { rmSync, existsSync } = await import("node:fs");
  // Only an EXPLICIT --root sets LAR_ROOT (isolated instances). NEVER default it to REPO_ROOT —
  // that would make larHome() resolve to the repo and defeat the `<lares>` uplift the wipe zone rests on.
  // With LAR_ROOT unset: storage → <lares>/vessel (larDataDir), genesis → repo (larRoot).
  if (args.options["root"]) process.env["LAR_ROOT"] = args.options["root"];
  const targets = clearTargets();

  const port = Number(args.options["port"] ?? process.env["LAR_PORT"] ?? "8080");

  console.log("[lares vessel clear] will delete:");
  for (const t of targets) if (existsSync(t.path)) console.log(`  ${t.path}`);
  console.log(`[lares vessel clear] will first stop whatever holds :${port}`);
  if (!args.flags["force"]) {
    console.log("Pass --force to proceed.");
    return 1;
  }

  // ── STOP THE HOLDER BEFORE THE WIPE, ALWAYS ─────────────────────────────────────────────────
  // A daemon holding the store does not notice the store leaving. It keeps its heap, keeps the port,
  // and keeps writing — so the next `vessel stand` finds the port occupied, ATTACHES to that process,
  // and reports a healthy vessel standing over a directory that no longer exists.
  //
  // Measured: the attach succeeded, the seed then failed six-for-six with exit 3, and standing against
  // the half-cleared store left the `catalog` doc unreadable — "hearth-private doc unavailable — local
  // corruption". Only `rite rebirth` recovered it. None of that announced itself as a wipe/holder race.
  //
  // The clear owns this because it owns the destruction: whoever removes the store is the one who can
  // still name what was holding it.
  const { stopIncumbent } = await import("../port-control.js");
  try {
    const r = await stopIncumbent(port);
    console.log(r.stopped
      ? `[lares vessel clear] stopped the incumbent on :${port} (${r.forced ? "forced" : "graceful"})`
      : `[lares vessel clear] :${port} already free`);
  } catch (e) {
    // FAIL CLOSED. Wiping a store out from under a process that survived the stop is precisely the
    // corruption this exists to prevent, so refuse rather than proceed hopefully.
    console.error(`[lares vessel clear] could not free :${port} — ${e instanceof Error ? e.message : String(e)}`);
    console.error("  Refusing to wipe a store a live process may still hold. Stop it, then re-run.");
    return 1;
  }

  for (const t of targets) rmSync(t.path, { recursive: t.recursive, force: true });
  console.log(`[lares vessel clear] preserved identity: ${larIdentityDir()} (the seal and the repo registry sit beside it, equally untouched)`);
  console.log(`[lares vessel clear] preserved the shrine: ${larariumDataHome()} (the acquired shelf + every sensorium — another house entirely, named by no wipe)`);
  // Rebuild genesis BEFORE init — init founds the hearth from the engine CID, so the baked artifact
  // must exist first. (The reverse order fails: "hearth true-name (engine CID) absent".)
  console.log("[lares vessel clear] cleared. Rebuilding genesis artifact…");
  const genesisCode = await cmdBake(args);
  if (genesisCode !== 0) return genesisCode;
  console.log("[lares vessel clear] Running lares vessel found…");
  const { cmdFound } = await import("./found.js");
  return cmdFound(args);
}

/**
 * `lares vessel rite refresh` — THE idempotent post-dev-change cure. After ANY code edit, run this:
 *   1. `pnpm build`       — recompile every package's dist AND stamp the source digest. The island
 *                            workers spawn from dist, so a stale dist half-kills a vessel; and the
 *                            STAMP is what the fresh-build gate reads, so a build that skips it leaves
 *                            the tree reading stale and the next lifecycle verb rebuilds mid-command.
 *                            Idempotent.
 *   2. re-pave + serve    — stop the incumbent on the port (graceful→force, by port-access, no PID
 *                            file), re-pave the vessel (store wiped + re-found + genesis re-baked
 *                            under the fresh build; identity preserved), then serve the dist.
 *
 * Idempotent from ANY prior state (running / stale / none). The dev-loop siblings, by reach:
 *   - `vessel rite refresh`            : code changed → REBUILD + re-pave + serve  (this — the full cure)
 *   - `vessel stand --restart`         : converge a running vessel (no rebuild, no wipe)
 *   - `vessel rite rebuild`            : dep-bump serde skew → re-bake genesis only (NO wipe, identity-safe)
 *   - `vessel stand --restart --clear` : re-pave + serve, assuming dist already current
 *   - `vessel stand --foreground`      : boot the dist, fail-fast (no convergence, no rebuild)
 */
export async function cmdRiteRefresh(args: ParsedArgs): Promise<number> {
  console.log("[lares vessel rite refresh] (1/2) pnpm build — recompiling all dist and stamping…");
  const buildCode = await runCommand("pnpm", ["build"], REPO_ROOT);
  if (buildCode !== 0) {
    console.error("[lares vessel rite refresh] build failed — fix the compile, then re-run `lares vessel rite refresh`.");
    return buildCode;
  }
  console.log("[lares vessel rite refresh] (2/2) reconcile --fresh — re-pave + serve…");
  return cmdRestart({ ...args, flags: { ...args.flags, fresh: true } });
}

/**
 * `lares vessel stand --restart` — converge to ONE live vessel for the dev/test loop. Idempotent
 * from ANY prior state (running / stale / none): stop the incumbent by ACCESS to the
 * OS port-table (graceful SIGTERM → poll port-free → bounded SIGKILL fallback — no PID
 * file, no supervisor), optional `--fresh` wipe, then serve. The port is the single-
 * instance capability, so EADDRINUSE never bites. `serve` stays fail-fast.
 */
export async function cmdRestart(args: ParsedArgs): Promise<number> {
  const port = Number(args.options["port"] ?? process.env["LAR_PORT"] ?? "8080");
  const { stopIncumbent } = await import("../port-control.js");
  try {
    const r = await stopIncumbent(port);
    if (r.stopped) console.log(`[lares vessel stand --restart] stopped incumbent on :${port} (${r.forced ? "forced" : "graceful"})`);
    else           console.log(`[lares vessel stand --restart] :${port} already free`);
  } catch (e) {
    console.error(`[lares vessel stand --restart] ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  if (args.flags["fresh"]) {
    const resetCode = await cmdClear({ ...args, flags: { ...args.flags, force: true } });
    if (resetCode !== 0) return resetCode;
  }
  return cmdStandForeground(args);
}

/**
 * `lares vessel rite rebuild` — the identity-safe dep-bump cure (Tier 0).
 *
 * When a dependency bump (keyhive / automerge / beelay / TW5) skews the on-disk
 * serde format, the vessel-host can't deserialize the stored genesis engine and
 * faults (`tag for enum is not valid`). The cure is to REBUILD the genesis engine
 * under the current deps — NOT to wipe storage and NEVER to touch identity.
 *
 * Idempotent: stop the incumbent on the port (graceful→force, as a restart does),
 * rebuild genesis under the explicitly-resolved root, then serve. No store wipe,
 * no key/card touch — the operator's DID survives untouched. Reserve `vessel clear`
 * for true re-founding; reach for this flow first on a dep-bump fault.
 */
export async function cmdRiteRebuild(args: ParsedArgs): Promise<number> {
  const root       = args.options["root"] ?? process.env["LAR_ROOT"] ?? REPO_ROOT;
  const rootedArgs: ParsedArgs = { ...args, options: { ...args.options, root } };
  const port = Number(args.options["port"] ?? process.env["LAR_PORT"] ?? "8080");
  const { stopIncumbent } = await import("../port-control.js");
  try {
    const r = await stopIncumbent(port);
    if (r.stopped) console.log(`[lares vessel rite rebuild] stopped incumbent on :${port} (${r.forced ? "forced" : "graceful"})`);
    else           console.log(`[lares vessel rite rebuild] :${port} already free`);
  } catch (e) {
    console.error(`[lares vessel rite rebuild] ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  console.log("[lares vessel rite rebuild] rebuilding genesis engine under current deps (storage + identity untouched)…");
  const genesisCode = await cmdBake(rootedArgs);
  if (genesisCode !== 0) return genesisCode;
  return cmdStandForeground(rootedArgs);
}
