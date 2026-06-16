/**
 * Scripted commands — thin shells over existing tsx scripts and pnpm composers.
 *
 * These commands do not refactor the underlying scripts; they invoke them via
 * child_process. The script files remain the source of truth for their logic.
 */

import { join } from "node:path";
import { runTsxScript, runCommand } from "../spawn.js";
import { repoRoot as REPO_ROOT } from "@lararium/mesh/node";
import type { ParsedArgs } from "../parse-args.js";

const NODE_PKG = join(REPO_ROOT, "packages", "lararium-node");

export async function cmdBuildGenesis(args: ParsedArgs): Promise<number> {
  const genesisDir = args.options["genesis"] ?? (args.options["root"] ? join(args.options["root"], "genesis") : process.env["LAR_GENESIS"]);
  const env = genesisDir ? { ...process.env, LAR_GENESIS: genesisDir } : process.env;
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
 *  compiled `.js` siblings (`node-admin-island.js` / `node-wiki-island.js`, no
 *  `execArgv`), so a tsx-source run produces a half-dead vessel (port bound, admin
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
 * `lares reset` — wipe `.lararium/` storage + bootstrap artifact, then re-init.
 *
 * Operator-confirmation gate: until S7 lands proper auth, we still want a
 * second-thought guard. Honors --force to skip the prompt.
 */
export async function cmdReset(args: ParsedArgs): Promise<number> {
  const { rmSync, existsSync } = await import("node:fs");
  // Isolated root: --root flag > LAR_ROOT env > default package dir.
  const root      = args.options["root"] ?? process.env["LAR_ROOT"] ?? NODE_PKG;
  const storage   = join(root, ".lararium");
  const bootstrap = join(root, "genesis", "social-bootstrap.json");
  const islandBin = join(root, "genesis", "island.bin");
  const islandSha = join(root, "genesis", "island.sha256");
  const islandShaPre = join(root, "genesis", "island.sha256-pre");
  const islandCid = join(root, "genesis", "island.cid");

  console.log("[lares reset] will delete:");
  if (existsSync(storage))   console.log(`  ${storage}`);
  if (existsSync(bootstrap)) console.log(`  ${bootstrap}`);
  if (existsSync(islandBin)) console.log(`  ${islandBin}`);
  if (existsSync(islandSha)) console.log(`  ${islandSha}`);
  if (existsSync(islandShaPre)) console.log(`  ${islandShaPre}`);
  if (existsSync(islandCid)) console.log(`  ${islandCid}`);
  if (!args.flags["force"]) {
    console.log("Pass --force to proceed.");
    return 1;
  }
  rmSync(storage,   { recursive: true, force: true });
  rmSync(bootstrap, { force: true });
  rmSync(islandBin, { force: true });
  rmSync(islandSha, { force: true });
  rmSync(islandShaPre, { force: true });
  rmSync(islandCid, { force: true });
  console.log("[lares reset] cleared. Running lares init…");
  const { cmdInit } = await import("./init.js");
  const initCode = await cmdInit(args);
  if (initCode !== 0) return initCode;
  console.log("[lares reset] rebuilding genesis artifact…");
  return cmdBuildGenesis(args);
}

/** `lares fresh` — reset (--force implied) then serve. */
export async function cmdFresh(args: ParsedArgs): Promise<number> {
  const resetCode = await cmdReset({ ...args, flags: { ...args.flags, force: true } });
  if (resetCode !== 0) return resetCode;
  return cmdServe(args);
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
