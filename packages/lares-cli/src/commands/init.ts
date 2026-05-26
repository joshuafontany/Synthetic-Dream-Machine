/**
 * `lares init` — bootstrap a new Lararium node.
 *
 * Thin shim over `runInit` from @lararium/node. Idempotent; pass --force to
 * re-seed when genesis/social-bootstrap.json already lives on disk.
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
import type { ParsedArgs } from "../parse-args.js";

export async function cmdInit(args: ParsedArgs): Promise<number> {
  const opts: Parameters<typeof runInit>[0] = {};
  const root = args.options["root"] ?? process.env["LAR_ROOT"];
  if (args.flags["force"])     Object.assign(opts, { force: true });
  if (args.options["storage"]) Object.assign(opts, { storageDir: args.options["storage"] });
  else if (root)               Object.assign(opts, { storageDir: join(root, ".lararium") });
  if (args.options["genesis"]) Object.assign(opts, { genesisDir: args.options["genesis"] });
  else if (root)               Object.assign(opts, { genesisDir: join(root, "genesis") });
  if (args.options["admit"])   Object.assign(opts, { admitPayloadPath: args.options["admit"] });
  await runInit(opts);
  return 0;
}
