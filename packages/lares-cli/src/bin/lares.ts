#!/usr/bin/env node
/**
 * `lares` — operator CLI entry point.
 *
 * Dispatches subcommands. Adding a new command means: add a handler under
 * src/commands/, add a row to COMMANDS below, and (if the command needs help
 * text) add a description.
 *
 * Architecture notes:
 *   - The CLI is a thin dispatch shim. Every command's logic lives in a
 *     library function (typically in @lararium/node), so the same operations
 *     can also run from inside the TW5 vm via the job-tiddler protocol
 *     (see B.3 in packages/HANDOFF.md).
 *   - No HTTP/RPC surface here. CLI ↔ live-node coordination happens through
 *     the admin Automerge doc — CRDT-native, web2-free.
 */

import { fileURLToPath } from "node:url";
import { realpathSync }  from "node:fs";
import { parseArgs, type ParsedArgs } from "../parse-args.js";
import { cmdInit }                    from "../commands/init.js";
import { cmdStatus }                  from "../commands/status.js";
import { cmdPromote }                 from "../commands/promote.js";
import { cmdDraft }                   from "../commands/draft.js";
import { cmdBag }                     from "../commands/bag.js";
import { cmdWiki }                    from "../commands/wiki.js";
import {
  cmdBuildGenesis, cmdTestQuine, cmdHeleuma,
  cmdServe, cmdDev, cmdReset, cmdFresh,
} from "../commands/scripted.js";
import { cmdDeviceAdmit, cmdInviteSend, cmdInviteReceive } from "../commands/ceremony.js";

type Handler = (args: ParsedArgs) => Promise<number>;

interface Command {
  readonly name:        string;
  readonly summary:     string;
  readonly handler:     Handler;
}

const COMMANDS: readonly Command[] = [
  { name: "init",          summary: "Bootstrap a new Lararium node (seed identities/circles/sessions/admin docs).", handler: cmdInit          },
  { name: "promote",       summary: "Promote a tiddler from one bag to another (canon ceremony). Needs `lares serve` running.", handler: cmdPromote      },
  { name: "draft",         summary: "Pull a tiddler from a lower bag into a writable draft (no tombstone). Pair with `promote`.", handler: cmdDraft        },
  { name: "bag",           summary: "Operate on individual bags: pin / unpin / stats / register-cold. Run `lares bag help`.",      handler: cmdBag          },
  { name: "wiki",          summary: "Operate on whole wikis: init/open/sync/pin/unpin/add-bag/remove-bag/list/which. Run `lares wiki help`.", handler: cmdWiki },
  { name: "status",        summary: "Print local node health: bootstrap presence, storage size, port in use.",      handler: cmdStatus        },
  { name: "serve",         summary: "Run the lararium node in foreground (no Vite).",                                handler: cmdServe         },
  { name: "dev",           summary: "Run node + Vite app concurrently (full dev experience).",                       handler: cmdDev           },
  { name: "reset",         summary: "Wipe .lararium/ + bootstrap, then re-init. Requires --force.",                  handler: cmdReset         },
  { name: "fresh",         summary: "reset --force, then serve.",                                                    handler: cmdFresh         },
  { name: "build-genesis", summary: "Build the deterministic genesis-island artifact.",                              handler: cmdBuildGenesis  },
  { name: "test-quine",    summary: "Verify the quine round-trip: genesis → boot → render → hash.",                  handler: cmdTestQuine     },
  { name: "heleuma",       summary: "Audit / scaffold load-bearing source-file memes. Pass --write to scaffold.",    handler: cmdHeleuma       },
  { name: "device-admit",  summary: "Admit a new vessel into your operator PersonGroup (DreamNet device ceremony — not yet implemented).",    handler: cmdDeviceAdmit  },
  { name: "invite-send",   summary: "Invite another operator into the Nexus MeshCabal (DreamNet founding ceremony — not yet implemented).",  handler: cmdInviteSend   },
  { name: "invite-receive",summary: "Receive and apply a Nexus MeshCabal invitation (DreamNet — not yet implemented).",                      handler: cmdInviteReceive },
];

function printHelp(): void {
  console.log("lares — operator CLI for the Lares lararium stack\n");
  console.log("Usage:  lares <command> [args...]\n");
  console.log("Commands:");
  for (const c of COMMANDS) {
    console.log(`  ${c.name.padEnd(14)} ${c.summary}`);
  }
  console.log(`  ${"help".padEnd(14)} Show this message.\n`);
  console.log("Run `lares <command> --help` once a command implements its own help (TBD).");
}

export async function dispatch(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.command === null || args.command === "help" || args.flags["help"]) {
    printHelp();
    return args.command === null ? 1 : 0;
  }
  const cmd = COMMANDS.find((c) => c.name === args.command);
  if (!cmd) {
    console.error(`lares: unknown command "${args.command}".  Run \`lares help\` for the list.`);
    return 2;
  }
  return await cmd.handler(args);
}

// Run dispatch when this file IS the entry point (not when imported).
const invokedAsScript = (() => {
  const arg1 = process.argv[1];
  if (!arg1) return false;
  try {
    return realpathSync(arg1) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedAsScript) {
  dispatch(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err)  => { console.error(err); process.exit(1); },
  );
}
