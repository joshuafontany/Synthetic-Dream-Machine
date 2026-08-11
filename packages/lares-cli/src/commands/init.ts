/**
 * `lares vessel found` — bootstrap a new Lararium node.
 *
 * Thin shim over `runInit` from @lararium/node. Idempotent; pass --force to
 * re-seed when the social bootstrap already lives on disk (<data>/vessel — see larBootstrapPath).
 *
 * Flags:
 *   --force          Re-seed even when bootstrap artifact exists.
 *   --root DIR       Isolate storage + genesis under DIR (overrides LAR_ROOT env).
 *   --storage DIR    Explicit override for Automerge NodeFS storage directory.
 *   --genesis DIR    Explicit override for genesis/ directory.
 *   --admit FILE     Apply a device-admit/v1 JSON payload instead of founding a new Nexus.
 */

import { join } from "node:path";
import { runInit } from "@lararium/node";
import { larDataDir, larRoot } from "../env.js";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdInit(args: ParsedArgs): Promise<number> {
  const opts: Parameters<typeof runInit>[0] = {};
  // ONLY an explicit --root sets LAR_ROOT (never a default — that would defeat the ~/.lares uplift).
  if (args.options["root"]) process.env["LAR_ROOT"] = args.options["root"];
  if (args.flags["force"])     Object.assign(opts, { force: true });
  // storage (runtime) → ~/.lares/.lararium (larDataDir); genesis (the baked seed) stays corpus-relative.
  Object.assign(opts, { storageDir: args.options["storage"] ?? larDataDir() });
  Object.assign(opts, { genesisDir: args.options["genesis"] ?? join(larRoot(), "genesis") });
  if (args.options["admit"])   Object.assign(opts, { admitPayloadPath: args.options["admit"] });
  await runInit(opts);
  return 0;
}
