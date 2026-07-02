/**
 * Scripted commands — thin shells over existing tsx scripts and pnpm composers.
 *
 * These commands do not refactor the underlying scripts; they invoke them via
 * child_process. The script files remain the source of truth for their logic.
 */

import { join } from "node:path";
import { runTsxScript, runCommand } from "../spawn.js";
import { repoRoot as REPO_ROOT } from "@lararium/mesh/node";
import { larDataDir, larProjectionDir, larIdentityDir, larRoot } from "../env.js";
import type { ParsedArgs } from "../parse-args.js";

const NODE_PKG = join(REPO_ROOT, "packages", "lararium-node");

export async function cmdBuildGenesis(args: ParsedArgs): Promise<number> {
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

/** `lares serve` — boot the lararium node only (no Vite).
 *
 *  Runs the BUILT dist, never tsx-source: the sovereign island workers spawn from
 *  compiled `.js` siblings (`node-daemon-island.js` / `node-wiki-island.js`, no
 *  `execArgv`), so a tsx-source run produces a half-dead vessel (port bound, daemon
 *  worker ERR_MODULE_NOT_FOUND). `node dist/src/main.js` is the design boot (= the
 *  package `start` script, the handoff's canonical hearth, the e2e harness). Scouted
 *  2026-06-16; hoike #dev-loop-restart. */
export async function cmdServe(args: ParsedArgs): Promise<number> {
  const { existsSync } = await import("node:fs");
  const distMain = join(NODE_PKG, "dist", "src", "main.js");
  if (!existsSync(distMain)) {
    console.error(`[lares serve] ${distMain} not found — run \`pnpm -r build\` first (the island workers are compiled; tsx-source cannot spawn them).`);
    return 1;
  }
  const extraArgs: string[] = [];
  if (args.options["wiki"])    extraArgs.push("--wiki",    args.options["wiki"]);
  if (args.options["port"])    extraArgs.push("--port",    args.options["port"]);
  if (args.options["storage"]) extraArgs.push("--storage", args.options["storage"]);
  if (args.options["root"])    extraArgs.push("--root",    args.options["root"]);
  if (args.flags["debug"])     extraArgs.push("--debug");
  return runCommand("node", [distMain, ...extraArgs], NODE_PKG);
}

/** `lares dev` — boot node + Vite app concurrently (full dev experience). */
export async function cmdDev(_args: ParsedArgs): Promise<number> {
  // Defer to the workspace-root `pnpm dev` script which already wires
  // `concurrently -n node,vite`. Touching that orchestration here would
  // duplicate config that's better kept at one site.
  return runCommand("pnpm", ["dev"]);
}

/**
 * `lares reset` — wipe the vessel store (`<data>/vessel`) + bootstrap artifact, then re-init.
 *
 * Operator-confirmation gate: until S7 lands proper auth, we still want a
 * second-thought guard. Honors --force to skip the prompt.
 */
/**
 * The reset wipe-list — the ONE spelling of every path `lares reset` deletes, resolved at
 * call time (AFTER any --root sets LAR_ROOT). Exported for the wipe-list contract test:
 * the projection watermark dies WITH the store (GAP 1); identity NEVER appears here.
 *
 * The strangler RETIRED (2026-07-01): larDataDir()/larProjectionDir() resolve the canonical
 * XDG dirs deterministically — no legacy arm exists to dangle, so the wipe names them directly.
 */
export function resetTargets(): Array<{ path: string; recursive: boolean }> {
  const gen = (name: string, recursive = false) => ({ path: join(larRoot(), "genesis", name), recursive });
  return [
    { path: larDataDir(), recursive: true },   // the vessel store (<data>/vessel)
    gen("social-bootstrap.json"),
    gen("island.bin"),
    gen("island.sha256"),
    gen("island.sha256-pre"),                  // legacy (pre-split); cleaned for migration
    gen("island.cid"),
    gen("island.cid-engine"),
    gen("island.cid-plugins"),
    gen("island.manifest.json"),               // G-CAS slice 1: the CAS index
    gen("cas", true),                          // G-CAS slice 1: the blob bytes
    // The projection watermark (synced-tree) must die WITH the store — a surviving watermark makes the
    // post-reset ingest read every bags/*.md as "unchanged" and the fresh empty docs stay empty,
    // silently (GAP 1, regenesis scout 2026-07-01).
    { path: larProjectionDir(), recursive: true },
  ];
}

export async function cmdReset(args: ParsedArgs): Promise<number> {
  const { rmSync, existsSync } = await import("node:fs");
  // Only an EXPLICIT --root sets LAR_ROOT (isolated instances). NEVER default it to REPO_ROOT —
  // that would make larHome() resolve to the repo and defeat the ~/.lares uplift (the bug this
  // reset hit). With LAR_ROOT unset: storage → <data>/vessel (larDataDir), genesis → repo (larRoot).
  if (args.options["root"]) process.env["LAR_ROOT"] = args.options["root"];
  const targets = resetTargets();

  console.log("[lares reset] will delete:");
  for (const t of targets) if (existsSync(t.path)) console.log(`  ${t.path}`);
  if (!args.flags["force"]) {
    console.log("Pass --force to proceed.");
    return 1;
  }
  for (const t of targets) rmSync(t.path, { recursive: t.recursive, force: true });
  console.log(`[lares reset] preserved identity: ${larIdentityDir()} (out of the wipe zone)`);
  // Rebuild genesis BEFORE init — init founds the hearth from the engine CID, so the baked artifact
  // must exist first. (The reverse order fails: "hearth true-name (engine CID) absent".)
  console.log("[lares reset] cleared. Rebuilding genesis artifact…");
  const genesisCode = await cmdBuildGenesis(args);
  if (genesisCode !== 0) return genesisCode;
  console.log("[lares reset] Running lares init…");
  const { cmdInit } = await import("./init.js");
  return cmdInit(args);
}

/** `lares fresh` — reset (--force implied) then serve. Assumes dist is current (run `refresh` to
 *  also recompile). */
export async function cmdFresh(args: ParsedArgs): Promise<number> {
  const resetCode = await cmdReset({ ...args, flags: { ...args.flags, force: true } });
  if (resetCode !== 0) return resetCode;
  return cmdServe(args);
}

/**
 * `lares refresh` — THE idempotent post-dev-change cure. After ANY code edit, run this:
 *   1. `pnpm -r build`     — recompile every package's dist (the island workers spawn from dist, not
 *                            tsx-source — a stale dist = a half-dead vessel). Idempotent.
 *   2. `reconcile --fresh` — stop the incumbent on the port (graceful→force, by port-access, no PID
 *                            file), re-pave the vessel (~/.lares storage wiped + re-init + genesis
 *                            re-baked under the fresh build; identity preserved), then serve the dist.
 *
 * Idempotent from ANY prior state (running / stale / none). The dev-loop sibling commands, by reach:
 *   - `refresh`   : code changed → REBUILD + re-pave + serve   (this — the full cure)
 *   - `reconcile` : just converge a running vessel (no rebuild, no wipe unless --fresh)
 *   - `rebuild`   : dep-bump serde skew → re-bake genesis only (NO wipe, identity-safe)
 *   - `fresh`     : re-pave + serve, assuming dist already current
 *   - `serve`     : boot the dist, fail-fast (no convergence, no rebuild)
 */
export async function cmdRefresh(args: ParsedArgs): Promise<number> {
  console.log("[lares refresh] (1/2) pnpm -r build — recompiling all dist…");
  const buildCode = await runCommand("pnpm", ["-r", "build"], REPO_ROOT);
  if (buildCode !== 0) {
    console.error("[lares refresh] build failed — fix the compile, then re-run `lares refresh`.");
    return buildCode;
  }
  console.log("[lares refresh] (2/2) reconcile --fresh — re-pave + serve…");
  return cmdReconcile({ ...args, flags: { ...args.flags, fresh: true } });
}

/**
 * `lares reconcile` — converge to ONE live vessel for the dev/test loop. Idempotent
 * from ANY prior state (running / stale / none): stop the incumbent by ACCESS to the
 * OS port-table (graceful SIGTERM → poll port-free → bounded SIGKILL fallback — no PID
 * file, no supervisor), optional `--fresh` wipe, then serve. The port is the single-
 * instance capability; the EADDRINUSE bite that kept hitting us dies here.
 * Operator ruling 2026-06-16 (hoike #dev-loop-restart). `serve` stays fail-fast.
 */
export async function cmdReconcile(args: ParsedArgs): Promise<number> {
  const port = Number(args.options["port"] ?? process.env["LAR_PORT"] ?? "8080");
  const { stopIncumbent } = await import("../port-control.js");
  try {
    const r = await stopIncumbent(port);
    if (r.stopped) console.log(`[lares reconcile] stopped incumbent on :${port} (${r.forced ? "forced" : "graceful"})`);
    else           console.log(`[lares reconcile] :${port} already free`);
  } catch (e) {
    console.error(`[lares reconcile] ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  if (args.flags["fresh"]) {
    const resetCode = await cmdReset({ ...args, flags: { ...args.flags, force: true } });
    if (resetCode !== 0) return resetCode;
  }
  return cmdServe(args);
}

/**
 * `lares rebuild` — the identity-safe dep-bump cure (Tier 0).
 *
 * When a dependency bump (keyhive / automerge / beelay / TW5) skews the on-disk
 * serde format, the vessel-host can't deserialize the stored genesis engine and
 * faults (`tag for enum is not valid`). The cure is to REBUILD the genesis engine
 * under the current deps — NOT to wipe storage and NEVER to touch identity.
 *
 * Idempotent: stop the incumbent on the port (graceful→force, like reconcile),
 * rebuild genesis under the explicitly-resolved root, then serve. No `.lararium`
 * wipe, no key/card touch — the operator's DID survives untouched. Reserve `reset`/
 * `fresh` for true re-founding; reach for `rebuild` first on a dep-bump fault.
 */
export async function cmdRebuild(args: ParsedArgs): Promise<number> {
  const root       = args.options["root"] ?? process.env["LAR_ROOT"] ?? REPO_ROOT;
  const rootedArgs: ParsedArgs = { ...args, options: { ...args.options, root } };
  const port = Number(args.options["port"] ?? process.env["LAR_PORT"] ?? "8080");
  const { stopIncumbent } = await import("../port-control.js");
  try {
    const r = await stopIncumbent(port);
    if (r.stopped) console.log(`[lares rebuild] stopped incumbent on :${port} (${r.forced ? "forced" : "graceful"})`);
    else           console.log(`[lares rebuild] :${port} already free`);
  } catch (e) {
    console.error(`[lares rebuild] ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  console.log("[lares rebuild] rebuilding genesis engine under current deps (storage + identity untouched)…");
  const genesisCode = await cmdBuildGenesis(rootedArgs);
  if (genesisCode !== 0) return genesisCode;
  return cmdServe(rootedArgs);
}
