/**
 * node-host — path roots and structural contracts for the lararium node daemon.
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { repoRoot } from "@lararium/mesh/node";
import { daemonBagsDir } from "./lares-config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const LARES_ROOT       = dirname(dirname(__dirname)); // packages/lararium-node
export const REPO_ROOT        = repoRoot;

/** The @daemon's bags root — resolves through the composable bags cap (`LAR_BAGS` → config → repo-relative
 *  `<corpus>/bags`). A FUNCTION, not a const, so a per-@daemon `~/.lares/config.json` override carries. */
export function bagsRoot(): string {
  return daemonBagsDir();
}

/** The `@lares` memes root beneath the bags tree — `<bags>/@lares`. Follows the bags cap. */
export function laresMemesRoot(): string {
  return join(bagsRoot(), "@lares");
}

export interface CorpusSource {
  name:   string;
  path:   string;
  bag:    string;
  quine?: true;
}
