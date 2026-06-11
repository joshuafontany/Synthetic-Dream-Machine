/**
 * env — the ONE environment contract every CLI command and the test harness
 * honor. Three variables target an instance; nothing else carries targeting:
 *
 *   LAR_ROOT  — instance root (holds .lararium/ data + genesis/). Default: the
 *               dev node home, packages/lararium-node.
 *   LAR_PORT  — daemon WS port. Default 8080.
 *   LAR_TARGET — harness mode selector ("staged" | "live"); the CLI itself
 *               ignores it, the test harness reads it (see tests/harness).
 *
 * Separate instances = separate LAR_ROOT + LAR_PORT pairs. QA attaches to a
 * live pair; Staged mints an ephemeral pair and destroys it after.
 */

import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
import { loadOperatorVerifyingKey } from "@lararium/node";

/** Instance root — LAR_ROOT or the dev node home. */
export function larRoot(): string {
  return process.env["LAR_ROOT"] ?? join(repoRoot, "packages", "lararium-node");
}

/** Instance data dir — <root>/.lararium. */
export function larDataDir(): string {
  return join(larRoot(), ".lararium");
}

/** Instance bootstrap artifact — <root>/genesis/social-bootstrap.json. */
export function larBootstrapPath(): string {
  return join(larRoot(), "genesis", "social-bootstrap.json");
}

/** Daemon WS port — LAR_PORT or 8080. */
export function larPort(): number {
  return Number(process.env["LAR_PORT"] ?? 8080);
}

/**
 * The operator's DID (0x + verifying key) from the instance's key file.
 * Throws a CLEAN error when absent — a placeholder string would only fail
 * later as "bad hex length" inside capability verification. No fallbacks.
 */
export async function operatorDid(): Promise<string> {
  try {
    return "0x" + (await loadOperatorVerifyingKey(larDataDir()));
  } catch {
    throw new Error(`no operator key under ${larDataDir()} — run \`lares init\` (or point LAR_ROOT at an initialized instance)`);
  }
}
