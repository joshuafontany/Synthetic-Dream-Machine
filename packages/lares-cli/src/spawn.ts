/**
 * spawn — child-process helpers for CLI subcommands that delegate to existing
 * tsx scripts or pnpm composers.
 *
 * The CLI shells out for two reasons:
 *   1. The underlying scripts are sizeable and self-contained (build-genesis,
 *      test-quine, heleuma) — re-importing them as library functions would
 *      balloon the CLI diff for no behavioral gain.
 *   2. Composition scripts (root `pnpm dev`) already wrap concurrency
 *      orchestration; re-implementing here would duplicate config.
 *
 * Subcommands whose logic is small AND benefits from in-vm reuse (`found`,
 * future `promote`) live as library imports instead — see commands/init.ts.
 */

import { spawn } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";

/** Run a tsx script and resolve to its exit code. Inherits stdio. */
export function runTsxScript(scriptPath: string, args: readonly string[] = [], env?: NodeJS.ProcessEnv): Promise<number> {
  const tsx = join(repoRoot, "node_modules", ".bin", "tsx");
  return new Promise((resolveP) => {
    const child = spawn(tsx, [scriptPath, ...args], {
      stdio: "inherit",
      cwd:   repoRoot,
      ...(env ? { env } : {}),
    });
    child.on("exit", (code) => resolveP(code ?? 1));
    child.on("error", (err) => { console.error(err); resolveP(1); });
  });
}

/** Run an arbitrary command (pnpm, node, etc.) and resolve to its exit code. */
export function runCommand(cmd: string, args: readonly string[] = [], cwd = repoRoot, env?: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolveP) => {
    const child = spawn(cmd, [...args], { stdio: "inherit", cwd, ...(env ? { env } : {}) });
    child.on("exit",  (code) => resolveP(code ?? 1));
    child.on("error", (err)  => { console.error(err); resolveP(1); });
  });
}
