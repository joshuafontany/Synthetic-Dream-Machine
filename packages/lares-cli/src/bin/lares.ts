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
 *     can also run from inside the TW5 vm via the verb-tiddler protocol.
 *   - No HTTP/RPC surface here. CLI ↔ live-node coordination rides a
 *     capability-bearing verb-summons over the daemon's Unix socket, whose
 *     outcome lands as a durable CRDT receipt — web2-free.
 *   - One surface, two actors (operator-peer #actor-parity): the same commands
 *     serve a HUMAN at a TTY and an AI AGENT acting programmatically. Output
 *     renders by audience — prose on a TTY, a deterministic structured payload
 *     under `--json` / off-TTY (see ../render.ts). Authority rides WITH the
 *     intent (capability-bearing verb-summons), never a session or login.
 */

import { fileURLToPath } from "node:url";
import { realpathSync }  from "node:fs";
import { parseArgs, type ParsedArgs } from "../parse-args.js";
import { cmdInit }                    from "../commands/init.js";
import { cmdWake }                    from "../commands/wake.js";
import { cmdStatus, cmdNode, cmdNodeStop } from "../commands/status.js";
import { cmdDraft }                   from "../commands/draft.js";
import { cmdNormalize }               from "../commands/normalize.js";
import { cmdBag }                     from "../commands/bag.js";
import { cmdWiki }                    from "../commands/wiki.js";
import { cmdAct }                     from "../commands/act.js";
import { cmdIngest }                  from "../commands/ingest.js";
import { cmdSeed }                    from "../commands/seed.js";
import { cmdRegenesis }               from "../commands/regenesis.js";
import { cmdWatch }                   from "../commands/watch.js";
import { cmdRepack }                  from "../commands/repack.js";
import { cmdWingOf }                  from "../commands/wing-of.js";
import { cmdSense }                   from "../commands/sense.js";
import { cmdMempalace }               from "../commands/mempalace.js";
import { cmdHooks }                   from "../commands/hooks.js";
import { cmdSensorium }               from "../commands/sensorium.js";
import { cmdCleanupDays }             from "../commands/cleanup-days.js";
import { renderCommandHelp }          from "../command-help.js";
import {
  cmdBuildGenesis, cmdTestQuine, cmdHeleuma,
  cmdServe, cmdDev, cmdReset, cmdFresh, cmdReconcile, cmdRebuild, cmdRefresh,
} from "../commands/scripted.js";
import { cmdDeviceAdmit, cmdInviteSend, cmdInviteReceive } from "../commands/ceremony.js";
import { cmdVault }                    from "../commands/vault.js";
import { cmdPersona }                  from "../commands/persona.js";
import { cmdCircle }                   from "../commands/circle.js";
import { cmdNexus }                    from "../commands/nexus.js";
import { freshBuildGate, FRESH_BUILD_COMMANDS } from "../build-freshness.js";

type Handler = (args: ParsedArgs) => Promise<number>;

interface Command {
  readonly name:        string;
  readonly summary:     string;
  readonly handler:     Handler;
}

const COMMANDS: readonly Command[] = [
  { name: "wake",          summary: "Boot ENTRY POINT (idempotent, every awakening): ensure the node up (attach if healthy, start detached if down) + emit a live hydration frame. --install founds the whole stack from a cold pull; --admit FILE joins an existing operator PersonaGroup (own keypair, same group) from a device-admit payload; --init stands up the mempalace palace (init + auto_save=false gate); --claude / --codex / --copilot wire the mempalace MCP + session ingest hook into ~/.claude / ~/.codex / ~/.copilot in each harness's own format; --vscode registers the mempalace MCP (recall) into every present VS Code variant (stable + Insiders, remote + local). All composable + idempotent.", handler: cmdWake },
  { name: "stop",          summary: "Halt the daemon on the port (graceful SIGTERM → force SIGKILL) — the missing pair to `lares wake`. Pure port-control: no vm boot, no wipe. A free port reads as already-stopped. Fills the gap `reconcile` (stop+serve) and `hooks pause` (capture only) leave open. Also `lares node stop`.", handler: cmdNodeStop },
  { name: "init",          summary: "Bootstrap a new Lararium node (seed identities/circles/sessions/daemon docs).", handler: cmdInit          },
  { name: "act",           summary: "Residency Model ACTION verb (ADD/COPY/MOVE/CLEAR/DROP/LOAD). Run `lares act` for usage.", handler: cmdAct          },
  { name: "ingest",        summary: "Disk→records through the Confluence gate: scan + diff (preview) or --apply through the island's INGEST verb. --tag-blobs stamps the CAS opt-in flag (`.meta` sidecar / meme ahu iam) for the large un-flagged carriers that would fault at regenesis (preview names the count).", handler: cmdIngest       },
  { name: "watch",         summary: "Watch a source dir and fire the ingest gesture per settle — one wave per quiet window. Preview by default; --apply submits.", handler: cmdWatch        },
  { name: "repack",        summary: "Collect a multi-tiddler bundle's (.json) members from its aside provenance and re-render the packed file — the deliberate round-trip before an upstream TW5 PR.", handler: cmdRepack       },
  { name: "seed",          summary: "Plant every bags/@* holding back into its doc, kind-routed: system bags (@lares/@lararium) → the diff-gated ingest gesture; other holdings → `act LOAD` (mints the catalog-corpus entry on a virgin catalog). Idempotent — a converged tree no-ops. Preview by default; --apply submits. The regenesis re-feed entity.", handler: cmdSeed },
  { name: "regenesis",     summary: "CRDT-layer rebirth from bags/ (alpha ritual): stop incumbent → reset (store + genesis + projection watermark) → wake → seed --apply (zero-new wave = FAIL post-reset). Identity preserved; the mempalace stays untouched (its own cadence: palace-teardown + harvest --all). Every step idempotent, so a failed ceremony re-runs from the top. Preview by default; --force enacts. --bag <@slug> = the L4 scalpel: rebirth ONE bag's doc from its bags/@slug canon on the LIVE vessel (CLEAR-in-place → clear per-bag watermark → re-seed), leaving @daemon, siblings, identity, genesis, and the mempalace untouched.", handler: cmdRegenesis },
  { name: "draft",         summary: "Pull a tiddler from a lower bag into a writable draft (no tombstone). The operator may later land it through a residency ACTION verb (`lares act`).", handler: cmdDraft        },
  { name: "bag",           summary: "Operate on individual bags: pin / unpin / stats / register-cold. Run `lares bag help`.",      handler: cmdBag          },
  { name: "wiki",          summary: "Operate on whole wikis: init/open/sync/pin/unpin/add-bag/remove-bag/list/which. Run `lares wiki help`.", handler: cmdWiki },
  { name: "status",        summary: "Node health surface. Bare `lares status` reports node health (bootstrap presence, storage size, port). `lares status sensorium` mirrors the MCP `status` taxonomy — the read routes through the @daemon cap; without it the verb refuses honestly. `--palaces` prints the palace-organ health table.", handler: cmdStatus        },
  { name: "node",          summary: "The node command group. `lares node status` = local node health (bootstrap presence, storage size, port in use) — the historical `lares status` behavior. Pure local inspection, no vm boot.", handler: cmdNode          },
  { name: "cleanup-days",  summary: "Read or set Claude Code's `cleanupPeriodDays` in ~/.claude/settings.json — how many days a session file survives before Claude deletes it at startup. Those files are the mempalace's verbatim harvest source, so a short window evaporates raw memory before it's mined. `lares cleanup-days` shows the current value; `lares cleanup-days <N>` (or `max`) sets it. Claude rejects 0; the floor 99999 (~274 yrs) is the keep-forever idiom. `lares wake --claude` sets the floor when absent (no-clobber); this command forces/raises it.", handler: cmdCleanupDays },
  { name: "sense",         summary: "THE SOVEREIGN SENSORIUM'S ONE DOOR (the guest comparator lives at `lares mempalace`). READ — four verbs, the PLANE as a parameter: `search` (hybrid recall) · `relate` (bitemporal KG) · `structure` (entity-pair hallways) · `status` (wings/rooms/entities/total); `--lens <content|structure|form|persistence>` picks the plane (default content). VERBATIM/LIFECYCLE — `recall` (stamp-filtered verbatim drawers) · `capture` (one native source) · `pour` (the sovereign harvest: content + planes + worldline) · `teardown` (clean tear for a re-pave) · `worldline` (walk the spirit tree) · `telemetry` (project lar_* gradients) · `subagents` (capture spirit transcripts) · `flow` (capture topology). One verb reaches any plane; a new plane needs no new verb. Rides the @daemon's composed caps (the single-owner law).", handler: cmdSense },
  { name: "wing-of",       summary: "Resolve a transcript's per-project WING through the one TS wing law (recorded cwd → wing slug) — the resolver the ingest hook calls first; prints the bare slug on the prose path. `lares wing-of <transcript.jsonl>`. No recorded cwd → not-found (the caller's fallback ladder decides).", handler: cmdWingOf },
  { name: "mempalace",     summary: "THE GUEST COMPARATOR'S DOOR (the sovereign sensorium lives at `lares sense`). `setup` raises the guest ~/.mempalace; `harvest` mines vanilla transcript drawers into it only — no lar_* stamps, no live capture, the clean comparator; `repave` previews or rebuilds it; `status` / `quiesce` / `resume` observe and control live holders and hooks.", handler: cmdMempalace },
  { name: "hooks",         summary: "The hook-lever: `pause` / `resume` / `status` the capture + ingest hooks (a marker file the hook scripts no-op on when paused). Lets a migration/teardown run WITHOUT daemon-spawn contention. `lares mempalace quiesce` pauses AND drains; this is the lever alone.", handler: cmdHooks },
  { name: "sensorium",     summary: "The source-neutral sensorium surface: `run` / `open` ingest a path into an ephemeral sensorium; `query` / `ls` / `keep` / `dissolve` tend its lifecycle; `name`, `propose-name`, `names`, and `accept-name` attach or review local labels over a discovered cap-stack. Run `lares sensorium help`.", handler: cmdSensorium },
  { name: "serve",         summary: "Run the lararium node in foreground (no Vite).",                                handler: cmdServe         },
  { name: "dev",           summary: "Run node + Vite app concurrently (full dev experience).",                       handler: cmdDev           },
  { name: "rebuild",       summary: "Identity-safe dep-bump cure: rebuild the genesis engine under current deps, then serve. No wipe, keypair untouched.", handler: cmdRebuild       },
  { name: "reset",         summary: "Wipe the vessel store + bootstrap, then re-init (identity at `<state>/identity` is preserved). Requires --force.",        handler: cmdReset         },
  { name: "fresh",         summary: "reset --force, then serve.",                                                    handler: cmdFresh         },
  { name: "reconcile",     summary: "Idempotent dev/test restart: stop the incumbent on the port (graceful→force), [--fresh] wipe, then serve.", handler: cmdReconcile     },
  { name: "refresh",       summary: "THE post-dev-change cure (idempotent): pnpm -r build, then reconcile --fresh (stop incumbent + re-pave ~/.lares + re-bake genesis + serve). Identity preserved. Use after editing code.", handler: cmdRefresh       },
  { name: "build-genesis", summary: "Build the deterministic genesis-island artifact.",                              handler: cmdBuildGenesis  },
  { name: "test-quine",    summary: "Verify the quine round-trip: genesis → boot → render → hash.",                  handler: cmdTestQuine     },
  { name: "heleuma",       summary: "Audit / scaffold load-bearing source-file memes. Pass --write to scaffold.",    handler: cmdHeleuma       },
  { name: "normalize",     summary: "Canonicalize a meme carrier's framing (embeds the iam namespace into the SOH) so the round-trip laws hold. `--check` reports drift without writing (CI/pre-commit).", handler: cmdNormalize     },
  { name: "vault",         summary: "At-rest seal LIFECYCLE for the sovereign secret carriers (keyhive archive + recovery share): `status` shows the seal state (--check probes a passphrase → split-KEK detection); `seal` seals cleartext carriers under a new passphrase; `rotate` re-seals old→new; `export <path>` writes a passphrase-SEALED backup (--force overwrites); `repair` cures a split-KEK. DAEMON-FIRST: mutating verbs route through the daemon when up (so its in-memory policy moves with the carriers — no un-rotate), direct file op when down. The passphrase never touches argv/history — no-echo TTY prompt (double-entry for a new pass) or LARES_ARCHIVE_PASSPHRASE(+_NEW)+--yes.", handler: cmdVault },
  { name: "persona",       summary: "The PLURALITY-PONO identity multitude (#66): `new <index> --name '<displayName>'` mints/loads the persona-root at that handle-index (fail-closed via assertHandleIndex) and sets its PRIVATE pet-name; `wear <index>` switches the active persona (reboot-to-switch, one face to the mesh); `list` prints the private multitude (held indices + active marker + pet-names). Drives the founder-side node core; a joinee receives a root by admit, never mints here.", handler: cmdPersona },
  { name: "circle",        summary: "The FOLLOW VERB — the INVERSION-OF-CONTROL social graph. `add <nym> --to <circle> [--petname <label>] [--card <file>]` recognises a nym (already-known, or TOFU-admits a carried self-certifying HandleCard) + optionally sets its PRIVATE local label + adds it to the circle (adding to a circle IS the follow); `remove <nym> --to <circle>` unfollows; `list [--to <circle>]` reads the private follow-view (petname + last-seen glamour). The graph is PRIVATE and LOCAL — nothing reaches @crossroads, no central trace. Publishing a public glamour stays a separate, deliberate act. Fail-closed: following an unmet nym needs `--card`.", handler: cmdCircle },
  { name: "nexus",         summary: "The Nexus founding-kahu ROSTER + its PRE-ROTATED charter-epoch chain (TUF≈KERI) — the Kapae immune antigen's authority home (#68). `nexus charter seat` seats the held personas' ed25519 VERIFYING keys (read from the vault, never the seed; matched by pet-name) + establishes the genesis epoch with a `--next-key-commit` pre-rotation; `nexus charter rotate` reveals the pre-committed next key-set + advances the chain (FAIL-CLOSED on reveal mismatch); `nexus charter commit --keys` computes a commitment digest; `nexus charter show` reads the roster, chain head, + quorum verdict. `nexus kapae <nym> [--reason]` RAISES a quorum-signed ban onto the always-carried antigen board (a banned presenter draws Mu); `nexus kapae --list` folds the currently-Kapae'd set; `nexus un_kapae <nym>` mints a quorum-signed lift at a strictly higher version (FAIL-CLOSED: a sub-quorum or unseated charter REFUSES, writing nothing).", handler: cmdNexus },
  { name: "device-admit",  summary: "Admit a new vessel into your operator PersonaGroup (produces an admit payload via runDeviceAdmit; QR/NFC/LAN transport pending).",    handler: cmdDeviceAdmit  },
  { name: "invite-send",   summary: "Invite another operator into the Nexus MeshCabal (DreamNet founding ceremony — not yet implemented).",  handler: cmdInviteSend   },
  { name: "invite-receive",summary: "Receive and apply a Nexus MeshCabal invitation (DreamNet — not yet implemented).",                      handler: cmdInviteReceive },
];

/**
 * Every top-level `lares` command name — the source the isomorphism fixture (cli-verbs.json) mirrors
 * and YIN's three-way parity test reads (CLI command-table ↔ MCP tool-set ↔ VERB_SEATS). Kept in sync
 * with COMMANDS by derivation, so a new verb here surfaces in the fixture the moment it regenerates.
 */
export const COMMAND_NAMES: readonly string[] = COMMANDS.map((c) => c.name);

function printHelp(): void {
  console.log("lares — operator CLI for the Lares lararium stack\n");
  console.log("Usage:  lares <command> [args...]\n");
  console.log("Commands:");
  for (const c of COMMANDS) {
    console.log(`  ${c.name.padEnd(14)} ${c.summary}`);
  }
  console.log(`  ${"help".padEnd(14)} Show this message.\n`);
  console.log("Global flags:");
  console.log(`  ${"--json".padEnd(14)} Emit a deterministic JSON result (ok|error + requestId) for agents/pipes.`);
  console.log(`  ${"--no-json".padEnd(14)} Force human prose even when stdout is not a TTY.`);
  console.log(`  ${"--yes".padEnd(14)} Skip confirmation prompts (required for non-interactive/agent runs).\n`);
  console.log("Output renders by audience: prose on a TTY, JSON off-TTY or under --json.");
  console.log("Run `lares <command> --help` for a command's own examples-first help.");
}

export async function dispatch(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  // Global help: bare `lares`, `lares help`, or `lares --help` (no command).
  if (args.command === null || args.command === "help" || (args.flags["help"] && !COMMANDS.some((c) => c.name === args.command))) {
    printHelp();
    return args.command === null ? 1 : 0;
  }
  const cmd = COMMANDS.find((c) => c.name === args.command);
  if (!cmd) {
    console.error(`lares: unknown command "${args.command}".  Run \`lares help\` for the list.`);
    return 2;
  }
  // Per-command help: `lares <command> --help` renders the command's own examples-first help and
  // returns — never running the handler. The command may ALSO render help on missing-args itself.
  if (args.flags["help"]) {
    renderCommandHelp(cmd.name, cmd.summary);
    return 0;
  }
  // Fresh-Build Invariant — a daemon-lifecycle verb (found/boot/mutate-identity) never runs
  // from stale dist: build the workspace, then re-exec this command in a fresh process.
  if (FRESH_BUILD_COMMANDS.has(cmd.name)) {
    const gate = freshBuildGate(argv, args);
    if (gate !== null) return gate;
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

/** Entry for the committed bin shim (bin/lares.mjs) — same path as direct invocation. */
export function runCli(): void {
  dispatch(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err)  => { console.error(err); process.exit(1); },
  );
}

if (invokedAsScript) {
  runCli();
}
