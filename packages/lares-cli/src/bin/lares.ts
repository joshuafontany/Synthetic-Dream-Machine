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
import { cmdStatus, cmdNode, cmdSensorium } from "../commands/status.js";
import { cmdDoctor }                  from "../commands/doctor.js";
import { cmdDraft }                   from "../commands/draft.js";
import { cmdNormalize }               from "../commands/normalize.js";
import { cmdBag }                     from "../commands/bag.js";
import { cmdWiki }                    from "../commands/wiki.js";
import { cmdAct }                     from "../commands/act.js";
import { cmdIngest }                  from "../commands/ingest.js";
import { cmdSeed }                    from "../commands/seed.js";
import { cmdRegenesis }               from "../commands/regenesis.js";
import { cmdWatch }                   from "../commands/watch.js";
import { cmdHarvest, cmdCapture }     from "../commands/harvest.js";
import { cmdWingOf }                  from "../commands/wing-of.js";
import { cmdFlow }                    from "../commands/flow.js";
import { cmdRecall }                  from "../commands/recall.js";
import { cmdSense }                   from "../commands/sense.js";
import { cmdTelemetry }               from "../commands/telemetry.js";
import { cmdSubagents }               from "../commands/subagents.js";
import { cmdWorldline }               from "../commands/worldline.js";
import { cmdPalaceTeardown }          from "../commands/palace-teardown.js";
import { cmdMempalace }               from "../commands/mempalace.js";
import { cmdHooks }                   from "../commands/hooks.js";
import { cmdCorpus }                  from "../commands/corpus.js";
import { cmdCleanupDays }             from "../commands/cleanup-days.js";
import { renderCommandHelp }          from "../command-help.js";
import {
  cmdBuildGenesis, cmdTestQuine, cmdHeleuma,
  cmdServe, cmdDev, cmdReset, cmdFresh, cmdReconcile, cmdRebuild, cmdRefresh,
} from "../commands/scripted.js";
import { cmdDeviceAdmit, cmdInviteSend, cmdInviteReceive } from "../commands/ceremony.js";
import { freshBuildGate, FRESH_BUILD_COMMANDS } from "../build-freshness.js";

type Handler = (args: ParsedArgs) => Promise<number>;

interface Command {
  readonly name:        string;
  readonly summary:     string;
  readonly handler:     Handler;
}

const COMMANDS: readonly Command[] = [
  { name: "wake",          summary: "Boot ENTRY POINT (idempotent, every awakening): ensure the node up (attach if healthy, start detached if down) + emit a live hydration frame. --install founds the whole stack from a cold pull; --admit FILE joins an existing operator PersonaGroup (own keypair, same group) from a device-admit payload; --init stands up the mempalace palace (init + auto_save=false gate); --claude / --codex / --copilot wire the mempalace MCP + session ingest hook into ~/.claude / ~/.codex / ~/.copilot in each harness's own format; --vscode registers the mempalace MCP (recall) into every present VS Code variant (stable + Insiders, remote + local). All composable + idempotent.", handler: cmdWake },
  { name: "init",          summary: "Bootstrap a new Lararium node (seed identities/circles/sessions/daemon docs).", handler: cmdInit          },
  { name: "act",           summary: "Residency Model ACTION verb (ADD/COPY/MOVE/CLEAR/DROP/LOAD). Run `lares act` for usage.", handler: cmdAct          },
  { name: "ingest",        summary: "Disk→records through the §6 gate: scan + diff (preview) or --apply through the island's INGEST verb.", handler: cmdIngest       },
  { name: "watch",         summary: "Watch a source dir and fire the ingest gesture per settle — one wave per quiet window. Preview by default; --apply submits.", handler: cmdWatch        },
  { name: "seed",          summary: "Plant every bags/@* holding back into its doc, kind-routed: system bags (@lares/@lararium) → the diff-gated ingest gesture; other holdings → `act LOAD` (mints the catalog-corpus entry on a virgin catalog). Idempotent — a converged tree no-ops. Preview by default; --apply submits. The regenesis re-feed entity.", handler: cmdSeed },
  { name: "regenesis",     summary: "CRDT-layer rebirth from bags/ (alpha ritual): stop incumbent → reset (store + genesis + projection watermark) → wake → seed --apply (zero-new wave = FAIL post-reset). Identity preserved; the mempalace stays untouched (its own cadence: palace-teardown + harvest --all). Every step idempotent, so a failed ceremony re-runs from the top. Preview by default; --force enacts.", handler: cmdRegenesis },
  { name: "draft",         summary: "Pull a tiddler from a lower bag into a writable draft (no tombstone). The operator may later land it through a residency ACTION verb (`lares act`).", handler: cmdDraft        },
  { name: "bag",           summary: "Operate on individual bags: pin / unpin / stats / register-cold. Run `lares bag help`.",      handler: cmdBag          },
  { name: "wiki",          summary: "Operate on whole wikis: init/open/sync/pin/unpin/add-bag/remove-bag/list/which. Run `lares wiki help`.", handler: cmdWiki },
  { name: "status",        summary: "Status surface (NAMESPACED, the name-collision cure): bare `lares status` = alias → `lares node status` (node health: bootstrap presence, storage size, port). `lares status sensorium` = the Memory-sensorium taxonomy (mirrors the MCP `status` tool; SEATED STUB — read rides the deferred @daemon-cap-wire). `--palaces` keeps the palace-organ health table.", handler: cmdStatus        },
  { name: "node",          summary: "The node command group. `lares node status` = local node health (bootstrap presence, storage size, port in use) — the historical `lares status` behavior. Pure local inspection, no vm boot.", handler: cmdNode          },
  { name: "doctor",        summary: "READ-ONLY vessel health sweep (the `git fsck` role): probes every Automerge doc in the vessel store through a disposable child-process boundary and charts MOUNTED vs CONDEMNED (a torn doc that would abort the WASM runtime on load). Mutates nothing; a condemned doc points at `lares repair`. Exits non-zero on a tear, so a boot/CI gate reads health off the exit code.", handler: cmdDoctor       },
  { name: "sensorium",     summary: "The sensorium command group. `lares sensorium status` = what the Memory sensorium holds (the taxonomy) — the isomorphic mirror of the MCP `status` tool. SEATED STUB today: the read rides the deferred @daemon-cap-wire (`lares status --palaces` shows local organ health meanwhile).", handler: cmdSensorium     },
  { name: "cleanup-days",  summary: "Read or set Claude Code's `cleanupPeriodDays` in ~/.claude/settings.json — how many days a session file survives before Claude deletes it at startup. Those files are the mempalace's verbatim harvest source, so a short window evaporates raw memory before it's mined. `lares cleanup-days` shows the current value; `lares cleanup-days <N>` (or `max`) sets it. Claude rejects 0; the floor 99999 (~274 yrs) is the keep-forever idiom. `lares wake --claude` sets the floor when absent (no-clobber); this command forces/raises it.", handler: cmdCleanupDays },
  { name: "harvest",       summary: "Idempotent SOVEREIGN session-memory capture. `--all` sweeps Claude, Codex, and Copilot transcript sources by wing; the daemon coordinates pointer-only requests to Python source streams, never session text. It never writes ~/.mempalace. `--writeback --wing <w>` re-runs the drawer projection only. Use `lares mempalace harvest` when you deliberately want the separate vanilla guest comparator. Re-runnable from raw transcripts; `lares harvest [--all | --writeback --wing <w>] [--dry-run]`.", handler: cmdHarvest },
  { name: "sense",         summary: "THE SENSORIUM'S DOOR — four universal verbs, the PLANE as a parameter: `search` (hybrid recall) · `relate` (the plane's bitemporal KG) · `structure` (entity-pair hallways) · `status` (wings/rooms/entities/total). `--lens <content|structure|form|persistence>` picks the plane (default content). One verb reaches any plane, so a new plane needs no new verb — `lares sense search \"entrance block\" --lens structure`. Rides the @daemon's composed caps; never opens a store beside the vessel's holder (the single-owner law).", handler: cmdSense },
  { name: "recall",        summary: "Read the verbatim PLACE memory (mempalace) THROUGH the @daemon seat — semantic recall over the journey, web3-only (a capability-bearing verb-summons, never a direct subprocess). `lares recall <keywords...>` searches; `--wing <w>` filters to a project; `--k <n>` caps (default 5; `--limit` stays as a back-compat alias, mirrors the MCP `recall(query, k)` arg); `--drawer <id>` fetches one verbatim; `--list` lists drawers. STAMP FILTERS compose with either: `--voice <name>` `--band <canon|synthesis|provisional|raw>` `--agent <id|handle-prefix|pet-name>` `--surface <claude|codex|copilot-cli|copilot-vscode>` `--drift` (honest counts, never a silent drop).", handler: cmdRecall },
  { name: "capture",       summary: "Capture a native source through the Python source-stream pipe into the sovereign sensorium. The @daemon coordinates only `{surface, pointer, wing, room[, sessionId]}`; it never accepts session turns or text. JSONL may enter through a stage directory; Copilot CLI stays `session-store.db` plus `--session-id`. Re-running re-derives the source and lands only its new tail. `lares capture <transcript|stageDir> --wing <w> [--session-id <copilot-session>]`.", handler: cmdCapture },
  { name: "telemetry",     summary: "lar-telemetry — read a wing's turn instruments (the gradient chat sigils) THROUGH the @daemon seat and project lar_* onto its drawers in the sovereign content plane. `lares telemetry --wing <w> [--limit <n>]`. Idempotent (lar_hv gate). The ingest hook calls it beside the capture leg; daemon down → no-op, and the sweep backstops (verbatim-always / telemetry-eventual).", handler: cmdTelemetry },
  { name: "wing-of",       summary: "Resolve a transcript's per-project WING through the one TS wing law (recorded cwd → wing slug) — the resolver the ingest hook calls first; prints the bare slug on the prose path. `lares wing-of <transcript.jsonl>`. No recorded cwd → not-found (the caller's fallback ladder decides).", handler: cmdWingOf },
  { name: "flow",          summary: "READ-ONLY capture topology: the pointer-only route, daemon socket availability, and live palace processes. It intentionally does not report the retired TypeScript capture WAL or capture-state watermarks. `--json` for the structured payload.", handler: cmdFlow },
  { name: "subagents",     summary: "Capture tasked-spirit (sub-agent) transcripts DISTINCT from the main agent — each `<session>/subagents/agent-*.jsonl` lands in `wing_<w>__spirits`, identified by its worldline handle, both sides of the exchange. Each file is submitted as a Python source pointer; TypeScript never reads its turns. `lares subagents <session-transcript.jsonl> --wing <w>`. Run `lares telemetry --wing <w>__spirits` for their gradient.", handler: cmdSubagents },
  { name: "worldline",     summary: "Walk a session's SPIRIT TREE (the braid: spawn=fork · handback=join · concurrent siblings ∥) from the durable worldline edge-DAG — the mempalace knowledge graph read READ-ONLY, joined with the bearing index for turn counts + aim/yield per agent. `lares worldline <session-id[-prefix]|handle>`; `--palace <dir>` overrides the palace; `--as-of <ts>` reconstructs the braid AS-OF a valid-time frontier (pure READ, mirrors the MCP `worldline(as_of)` arg); `--json` for the structured braid. `kapae <branch>` / `un-kapae <branch>` = SEATED STUBS (mirror the MCP `kapae`/`un_kapae` tools; the write-home rides the deferred @daemon-cap-wire — never this mode=ro handle). `diff <A> <B>` refuses honestly (ITC stamps are not queryably persisted — the gap is named, never faked from timestamps).", handler: cmdWorldline },
  { name: "palace-teardown", summary: "Completely tear down the local palace organs + harvest idempotency (mempalace/structure/form/mesh stores, `lar_hv` watermark, stage, `.corpus/*` scratch) so a re-pave starts from zero — the clean cure for a partial/interrupted re-pave. Preview by default; `--confirm` removes; REFUSES under live MCP/mine unless `--drain` (graceful quiesce-then-tear) or `--force`. Re-pave after with `lares harvest --all`.", handler: cmdPalaceTeardown },
  { name: "mempalace",     summary: "Guest comparator + lifecycle tools (alias `lares palace`). `harvest` mines vanilla transcript drawers into ~/.mempalace only—no lar_* stamps and no live capture. `repave` previews or rebuilds that guest. `status` / `quiesce` / `resume` observe and control live holders and hooks. The sovereign sensorium instead rides `lares harvest`, `lares capture`, `lares recall`, and `lares sense`.", handler: cmdMempalace },
  { name: "palace",        summary: "Alias for `lares mempalace` — `status` / `quiesce` / `resume` the palace daemon/hook topology.", handler: cmdMempalace },
  { name: "hooks",         summary: "The hook-lever: `pause` / `resume` / `status` the capture + ingest hooks (a marker file the hook scripts no-op on when paused). Lets a migration/teardown run WITHOUT daemon-spawn contention. `lares mempalace quiesce` pauses AND drains; this is the lever alone.", handler: cmdHooks },
  { name: "corpus",        summary: "The ephemeral corpus sensorium (the `docker run --rm` of memory): `run <path>` opens→ingests→analyzes→DISSOLVES on exit (`--keep` lands it); `open`/`query`/`ls`/`keep`/`dissolve` manage live scratch corpus sensoria. Leak-proof: `dissolve --orphans` reaps interrupted runs. Run `lares corpus help`.", handler: cmdCorpus },
  { name: "serve",         summary: "Run the lararium node in foreground (no Vite).",                                handler: cmdServe         },
  { name: "dev",           summary: "Run node + Vite app concurrently (full dev experience).",                       handler: cmdDev           },
  { name: "rebuild",       summary: "Identity-safe dep-bump cure: rebuild the genesis engine under current deps, then serve. No wipe, keypair untouched.", handler: cmdRebuild       },
  { name: "reset",         summary: "Wipe .lararium/ + bootstrap, then re-init (identity in .lararium-identity/ is preserved). Requires --force.",        handler: cmdReset         },
  { name: "fresh",         summary: "reset --force, then serve.",                                                    handler: cmdFresh         },
  { name: "reconcile",     summary: "Idempotent dev/test restart: stop the incumbent on the port (graceful→force), [--fresh] wipe, then serve.", handler: cmdReconcile     },
  { name: "refresh",       summary: "THE post-dev-change cure (idempotent): pnpm -r build, then reconcile --fresh (stop incumbent + re-pave ~/.lares + re-bake genesis + serve). Identity preserved. Use after editing code.", handler: cmdRefresh       },
  { name: "build-genesis", summary: "Build the deterministic genesis-island artifact.",                              handler: cmdBuildGenesis  },
  { name: "test-quine",    summary: "Verify the quine round-trip: genesis → boot → render → hash.",                  handler: cmdTestQuine     },
  { name: "heleuma",       summary: "Audit / scaffold load-bearing source-file memes. Pass --write to scaffold.",    handler: cmdHeleuma       },
  { name: "normalize",     summary: "Canonicalize a meme carrier's framing (embeds the iam namespace into the SOH) so the round-trip laws hold. `--check` reports drift without writing (CI/pre-commit).", handler: cmdNormalize     },
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
