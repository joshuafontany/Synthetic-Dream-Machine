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
 *     can also run from inside the TW5 vm via the verb-tiddler protocol
 *     (see B.3 in packages/HANDOFF.md).
 *   - No HTTP/RPC surface here. CLI ↔ live-node coordination happens through
 *     the daemon Automerge doc — CRDT-native, web2-free.
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
import { cmdStatus }                  from "../commands/status.js";
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
import { cmdRecall }                  from "../commands/recall.js";
import { cmdTelemetry }               from "../commands/telemetry.js";
import { cmdSubagents }               from "../commands/subagents.js";
import { cmdPalaceTeardown }          from "../commands/palace-teardown.js";
import { cmdMempalace }               from "../commands/mempalace.js";
import { cmdHooks }                   from "../commands/hooks.js";
import { cmdCorpus }                  from "../commands/corpus.js";
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
  { name: "regenesis",     summary: "Whole-system rebirth from bags/ (alpha ritual): hooks pause → palace quiesce → stop incumbent → palace-teardown → reset (store + genesis + projection watermark) → wake → seed --apply (zero-new wave = FAIL post-reset) → harvest --all → hooks resume. Identity preserved; every step idempotent, so a failed ceremony re-runs from the top. Preview by default; --force enacts.", handler: cmdRegenesis },
  { name: "draft",         summary: "Pull a tiddler from a lower bag into a writable draft (no tombstone). The operator may later land it through a residency ACTION verb (`lares act`).", handler: cmdDraft        },
  { name: "bag",           summary: "Operate on individual bags: pin / unpin / stats / register-cold. Run `lares bag help`.",      handler: cmdBag          },
  { name: "wiki",          summary: "Operate on whole wikis: init/open/sync/pin/unpin/add-bag/remove-bag/list/which. Run `lares wiki help`.", handler: cmdWiki },
  { name: "status",        summary: "Print local node health: bootstrap presence, storage size, port in use.",      handler: cmdStatus        },
  { name: "harvest",       summary: "Idempotent session-history harvest (the @daemon memory-shore). `--all`: sweep EVERY transcript surface — Claude (~/.claude/projects), Codex (~/.codex/sessions, incl. the VS Code ChatGPT ext), Copilot Chat (VS Code workspaceStorage + CLI, normalized) — group by project wing, mine convos + write lar_* metadata, idempotent. Transcripts only (never curated MD). `--writeback --wing <w>`: enrich one wing's drawers. Default: turns → gradient parser → bearing index. Re-runnable (lar_hv). `lares harvest [--all | --writeback --wing <w>] [--dry-run]`.", handler: cmdHarvest },
  { name: "recall",        summary: "Read the verbatim PLACE memory (mempalace) THROUGH the @daemon seat — semantic recall over the journey, web3-only (a capability-bearing verb-summons, never a direct subprocess). `lares recall <keywords...>` searches; `--wing <w>` filters to a project; `--limit <n>` caps (default 5); `--drawer <id>` fetches one verbatim; `--list` lists drawers.", handler: cmdRecall },
  { name: "capture",       summary: "FEED the telemetry nalu — route a transcript's NEW turns THROUGH the @daemon (the {chat}→@daemon-nalu→mempalace path): each turn → `capture` verb → capture cap → WAL → flush `mine --source ndjson`. Idempotent (per-wing capture watermark). Daemon down → graceful fallback to a direct `mempalace mine --extract exchange` (verbatim-always). `lares capture <transcript|stageDir> --wing <w>`. The drawer leg of the ingest hook.", handler: cmdCapture },
  { name: "telemetry",     summary: "lar-telemetry — read a wing's turn instruments (the gradient chat sigils) THROUGH the @daemon seat and project lar_* onto its mempalace drawers (mempalace through the seat, web3-only). `lares telemetry --wing <w> [--limit <n>]`. Idempotent (lar_hv gate). The capture hook calls this beside the verbatim mine; daemon down → no-op, the sweep backstops (verbatim-always / telemetry-eventual).", handler: cmdTelemetry },
  { name: "subagents",     summary: "Capture tasked-spirit (sub-agent) transcripts DISTINCT from the main agent — each `<session>/subagents/agent-*.jsonl` mines into `wing_<w>__spirits`, named from its handoff (Mask → Pet-Name-by-role → spirit-<id>), both sides of the exchange. A direct mine (no daemon). `lares subagents <session-transcript.jsonl> --wing <w>`. Named spirits are re-callable; run `lares telemetry --wing <w>__spirits` for their gradient.", handler: cmdSubagents },
  { name: "palace-teardown", summary: "Completely tear down the local palace organs + harvest idempotency (mempalace/ast/form/mesh stores, `lar_hv` watermark, stage, `.corpus/*` scratch) so a re-pave starts from zero — the clean cure for a partial/interrupted re-pave. Preview by default; `--confirm` removes; REFUSES under live MCP/mine unless `--drain` (graceful quiesce-then-tear) or `--force`. Re-pave after with `lares harvest --all`.", handler: cmdPalaceTeardown },
  { name: "mempalace",     summary: "Observe + gracefully drain the palace daemon/hook/capture topology (alias `lares palace`). `status`: live table of every warm daemon / recall sidecar / one-shot mine / `lares` hook-leg + its SPAWNER (teaches kill-the-parent). `quiesce [--hold]`: graceful stop-the-world — pause hooks → SIGTERM-drain daemons → confirm zero (idempotent). `resume`: un-pause. The cure for the daemon-spawn whack-a-mole.", handler: cmdMempalace },
  { name: "palace",        summary: "Alias for `lares mempalace` — `status` / `quiesce` / `resume` the palace daemon/hook topology.", handler: cmdMempalace },
  { name: "hooks",         summary: "The hook-lever: `pause` / `resume` / `status` the capture + ingest hooks (a marker file the hook scripts no-op on when paused). Lets a migration/teardown run WITHOUT daemon-spawn contention. `lares mempalace quiesce` pauses AND drains; this is the lever alone.", handler: cmdHooks },
  { name: "corpus",        summary: "The ephemeral astral MULTIPALACE (the `docker run --rm` of memory): `run <path>` opens→ingests→analyzes→DISSOLVES on exit (`--keep` lands it); `open`/`query`/`ls`/`keep`/`dissolve` manage live scratch corpus-palaces. Leak-proof: `dissolve --orphans` reaps interrupted runs. Run `lares corpus help`.", handler: cmdCorpus },
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
