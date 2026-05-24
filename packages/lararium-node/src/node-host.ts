/**
 * node-host — path roots and structural contracts for the lararium node daemon.
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { repoRoot } from "@lararium/mesh/node";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const LARES_ROOT       = dirname(dirname(__dirname)); // packages/lararium-node
export const BAGS_ROOT        = join(repoRoot, "bags");
export const LARES_MEMES_ROOT = join(BAGS_ROOT, "@lares");
export const REPO_ROOT        = repoRoot;

export interface CorpusSource {
  name:   string;
  path:   string;
  bag:    string;
  quine?: true;
}
