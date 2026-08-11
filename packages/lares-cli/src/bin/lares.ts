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
import { cmdHerm }                    from "../commands/herm.js";
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
import { cmdFlowRun }                 from "../commands/flow-run.js";
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
import { cmdLibrary }                  from "../commands/library.js";
import { cmdCabal }                    from "../commands/cabal.js";
import { cmdEdge }                     from "../commands/edge.js";
import { cmdRaise }                    from "../commands/raise.js";
import { cmdCircle }                   from "../commands/circle.js";
import { cmdNexus }                    from "../commands/nexus.js";
import { freshBuildGate, FRESH_BUILD_COMMANDS } from "../build-freshness.js";
import { VERB_SURFACE, projectOntoSurface } from "@lararium/tw5";

type Handler = (args: ParsedArgs) => Promise<number>;

interface Command {
  readonly name:        string;
  readonly summary:     string;
  readonly handler:     Handler;
  /**
   * Which projections MAY expose this command — named from the SHARED `VERB_SURFACE` vocabulary the daemon
   * verb-plane also reads, so the two tables can never drift apart on what a surface is CALLED.
   *
   * The tables stay separate on purpose: a CLI command runs in-process at a terminal, a daemon verb routes
   * through the VM into a vessel, and collapsing them would conflate two planes. Only the VOCABULARY unifies.
   *
   * Absent → `[VERB_SURFACE.cli]`, and that default carries a rule rather than a convenience: nothing
   * reaches an AGENT surface until a hand declares it. Growing the agent face stays a deliberate act per verb.
   */
  readonly surfaces?:   readonly string[];
  /**
   * TRUE when running this command HOLDS A KEY — it mints, signs, seals, or stakes. Carries the SAME
   * meaning as `VerbSpec.signs` on the daemon plane, deliberately worded once and referenced here.
   *
   * An agent surface may render such a command and compose its arguments; it MUST NEVER execute one. The
   * signing hand stays the human's, which is why `lares surface --executable` drops these even from a
   * surface that declared them.
   */
  readonly signs?:      boolean;
}

/** What a projection hands back — the shape any surface renders from. */
export interface SurfaceEntry {
  readonly name:      string;
  readonly summary:   string;
  readonly signs:     boolean;
}

/**
 * PROJECT the command table onto one surface.
 *
 * One table, many faces. A surface that kept its own catalogue would drift from the plane it claims to
 * expose, and that drift never announces itself — it shows up as a verb an agent can reach and a human
 * cannot, or the reverse. So the declaration lives beside the handler, once.
 */
export function projectCommands(surface: string, executableOnly = false): readonly SurfaceEntry[] {
  return projectOntoSurface(COMMANDS, (c) => c, surface, executableOnly)
    .map((c) => ({ name: c.name, summary: c.summary, signs: c.signs === true }));
}

const COMMANDS: readonly Command[] = [
  { name: "wake",          summary: "Boot ENTRY POINT (idempotent, every awakening): ensure the node up (attach if healthy, start detached if down) + emit a live hydration frame. --install founds the whole stack from a cold pull; --admit FILE joins an existing operator PersonaGroup (own keypair, same group) from a device-admit payload; --init stands the whole vessel (the mempalace palace arrives by its own verb); --claude / --codex / --copilot wire the mempalace MCP + session ingest hook into ~/.claude / ~/.codex / ~/.copilot in each harness's own format; --vscode registers the mempalace MCP (recall) into every present VS Code variant (stable + Insiders, remote + local). --observe REPORTS ONLY: it withholds the standing half of the verb (no node start, no founding, no wiring) and outranks every acting flag, so a caller that wants a reading cannot be talked into an act — the SessionStart hook holds this cap alone. All composable + idempotent.", handler: cmdWake, signs: true /* --install founds; --admit binds a device under a persona root */ },
  { name: "herm",          summary: "Stand a HERM (Lares Viales) — the wiki-less wayfarer that STANDS the carriage crossroads (Socket B) a family's hearths dial to carry sealed @cad bodies between each other. Pi-deployable: `--port` = the http FLOW-map read-face; `--relay-port` (LAR_HERM_RELAY_PORT, default 8090) = the crossroads WS port; `--relay-seed <hex>` (LAR_HERM_RELAY_SEED) pins the gate seed, else it derives from this Herm's OWN identity (stable across restarts — hearths keep dialing the same key, NEVER a fresh random). Spawns the SAME node boot as `lares wake`, routed to the wiki-less recipe; prints the dial URL(s) + gate pubkey to hand a hearth.", handler: cmdHerm },
  { name: "stop",          summary: "Halt the daemon on the port (graceful SIGTERM → force SIGKILL) — the missing pair to `lares wake`. Pure port-control: no vm boot, no wipe. A free port reads as already-stopped. Fills the gap `reconcile` (stop+serve) and `hooks pause` (capture only) leave open. Also `lares node stop`.", handler: cmdNodeStop },
  { name: "init",          summary: "Bootstrap a new Lararium node (seed identities/circles/sessions/daemon docs).", handler: cmdInit, signs: true /* mints the vessel key + persona root and signs the founding edge */ },
  { name: "act",           summary: "Residency Model ACTION verb (ADD/COPY/MOVE/CLEAR/DROP/LOAD). Run `lares act` for usage.", handler: cmdAct          },
  { name: "ingest",        summary: "Disk→records through the Confluence gate: scan + diff (preview) or --apply through the island's INGEST verb. --tag-blobs stamps the CAS opt-in flag (`.meta` sidecar / meme ahu iam) for the large un-flagged carriers that would fault at regenesis (preview names the count).", handler: cmdIngest       },
  { name: "watch",         summary: "Watch a source dir and fire the ingest gesture per settle — one wave per quiet window. Preview by default; --apply submits.", handler: cmdWatch        },
  { name: "repack",        summary: "Collect a multi-tiddler bundle's (.json) members from its aside provenance and re-render the packed file — the deliberate round-trip before an upstream TW5 PR.", handler: cmdRepack       },
  { name: "seed",          summary: "Plant every bags/@* holding back into its doc, kind-routed: system bags (@lares/@lararium) → the diff-gated ingest gesture; other holdings → `act LOAD` (mints the catalog-corpus entry on a virgin catalog). Idempotent — a converged tree no-ops. Preview by default; --apply submits. The regenesis re-feed entity.", handler: cmdSeed, signs: true /* writes founding material */ },
  { name: "regenesis",     summary: "CRDT-layer rebirth from bags/ (alpha ritual): stop incumbent → reset (store + genesis + projection watermark) → wake → seed --apply (zero-new wave = FAIL post-reset). Identity preserved; the mempalace stays untouched (its own cadence: palace-teardown + harvest --all). Every step idempotent, so a failed ceremony re-runs from the top. Preview by default; --force enacts. --bag <@slug> = the L4 scalpel: rebirth ONE bag's doc from its bags/@slug canon on the LIVE vessel (CLEAR-in-realm → clear per-bag watermark → re-seed), leaving @daemon, siblings, identity, genesis, and the mempalace untouched.", handler: cmdRegenesis, signs: true /* re-founds identity-bearing state */ },
  { name: "draft",         summary: "Pull a tiddler from a lower bag into a writable draft (no tombstone). The operator may later land it through a residency ACTION verb (`lares act`).", handler: cmdDraft        },
  { name: "bag",           summary: "Operate on individual bags: pin / unpin / stats / register-cold. Run `lares bag help`.",      handler: cmdBag          },
  { name: "wiki",          summary: "Operate on whole wikis: init/open/sync/pin/unpin/add-bag/remove-bag/list/which. Run `lares wiki help`.", handler: cmdWiki },
  { name: "status",        summary: "Node health surface. Bare `lares status` reports node health (bootstrap presence, storage size, port). `lares status sensorium` mirrors the MCP `status` taxonomy — the read routes through the @daemon cap; without it the verb refuses honestly. `--palaces` prints the palace-organ health table.", handler: cmdStatus        },
  { name: "node",          summary: "The node command group. `lares node status` = local node health (bootstrap presence, storage size, port in use) — the historical `lares status` behavior. Pure local inspection, no vm boot.", handler: cmdNode          },
  { name: "cleanup-days",  summary: "Read or set Claude Code's `cleanupPeriodDays` in ~/.claude/settings.json — how many days a session file survives before Claude deletes it at startup. Those files are the mempalace's verbatim harvest source, so a short window evaporates raw memory before it's mined. `lares cleanup-days` shows the current value; `lares cleanup-days <N>` (or `max`) sets it. Claude rejects 0; the floor 99999 (~274 yrs) is the keep-forever idiom. `lares wake --claude` sets the floor when absent (no-clobber); this command forces/raises it.", handler: cmdCleanupDays },
  { name: "sense",         summary: "THE SOVEREIGN SENSORIUM'S ONE DOOR (the guest comparator lives at `lares mempalace`). Addressed: `lares sense <sensorium> <verb>` targets any sensorium by name; bare `lares sense <verb>` keeps the `memory` default. READ — four verbs, the PLANE as a parameter: `search` (hybrid recall) · `relate` (bitemporal KG) · `structure` (entity-pair hallways) · `status` (wings/rooms/entities/total); `--lens <content|structure|form|persistence>` picks the plane (default content). One verb reaches any plane; a new plane needs no new verb. STAND — `setup` (the sovereign organs; it left the boot, so standing them is its own act). FEED — `capture` (one native source) · `pour` (the sovereign harvest: content + planes + worldline) · `sweep` (the bulk backfill) · `refresh` · `meta` (tune the annotators) · `recall` (stamp-filtered verbatim drawers). HOLDERS — `quiesce` · `resume` · `holders` (the topology) · `teardown` (clean tear for a re-pave). DURABLE LIFECYCLE, direct over manifest.json — `roster` · `inspect` · `build` · `reconcile` read and re-settle; `promote` · `retire` · `un-retire` · `purge` seat HITL and need --approve. INSTRUMENTS over a poured sensorium — `rejim` (rhythm) · `analyze` (change-points) · `ki` (coupling verdict, alias `couple`) · `li` (gluing verdict, alias `cohere`) · `jing` (the li∘ki square, alias `square`) · `plane-record` (ONE cid → its presence across content · structure · form, honest nulls where a plane lacks it — the cross-plane witness, read-only) · `couple-r` + `forecast` (the R plane) · `mismatch` (is the coupling honest?). WALK — `worldline` (the spirit tree) · `telemetry` (project lar_* gradients) · `flow` (capture topology). Rides the @daemon's composed caps (the single-owner law).", handler: cmdSense },
  { name: "flow",          summary: "THE PET-NAMED COMPOSED-FLOW SURFACE (the anti-verb-sprawl door). One verb, N flows: the low-level instruments (crystallize · phase · whiten · couple · gate · mismatch) become the building blocks a FLOW composes, never the surface. Bare `lares flow` lists the flow-set (crystal · rhythm · couple) with their cap-stacks; `lares flow <petname> --signal <ndjson> [--names a,b,c] [--target <uri>]` runs one — the @daemon looks its cap-stack up and runs each step routed by hull (crystallize/couple TS · phase py · mismatch daemon), threading each outcome to the next. New capability arrives as a new flow, never another raw verb. The signal rides --signal for now; auto-extraction from a poured target is owed.", handler: cmdFlowRun },
  { name: "wing-of",       summary: "Resolve a transcript's per-project WING through the one TS wing law (recorded cwd → wing slug) — the resolver the ingest hook calls first; prints the bare slug on the prose path. `lares wing-of <transcript.jsonl>`. No recorded cwd → not-found (the caller's fallback ladder decides).", handler: cmdWingOf },
  { name: "mempalace",     summary: "THE GUEST COMPARATOR'S DOOR (the sovereign sensorium lives at `lares sense`). `setup` raises the guest ~/.mempalace; `harvest` mines vanilla transcript drawers into it only — no lar_* stamps, no live capture, the clean comparator; `repave` previews or rebuilds it; `status` / `quiesce` / `resume` observe and control live holders and hooks.", handler: cmdMempalace },
  { name: "hooks",         summary: "The hook-lever: `pause` / `resume` / `status` the capture + ingest hooks (a marker file the hook scripts no-op on when paused). Lets a migration/teardown run WITHOUT daemon-spawn contention. `lares mempalace quiesce` pauses AND drains; this is the lever alone.", handler: cmdHooks },
  { name: "sensorium",     summary: "The source-neutral sensorium surface: `run` / `open` ingest a path into an ephemeral sensorium; `query` / `ls` / `keep` / `dissolve` tend its lifecycle; `name`, `propose-name`, `names`, and `accept-name` attach or review local labels over a discovered cap-stack. Run `lares sensorium help`.", handler: cmdSensorium },
  { name: "serve",         summary: "Run the lararium node in foreground (no Vite).",                                handler: cmdServe         },
  { name: "dev",           summary: "Run node + Vite app concurrently (full dev experience).",                       handler: cmdDev           },
  { name: "rebuild",       summary: "Identity-safe dep-bump cure: rebuild the genesis engine under current deps, then serve. No wipe, keypair untouched.", handler: cmdRebuild       },
  { name: "reset",         summary: "Wipe the vessel store + bootstrap, then re-init (identity at `<data>/identity` is preserved). Requires --force.",        handler: cmdReset         },
  { name: "fresh",         summary: "reset --force, then serve.",                                                    handler: cmdFresh         },
  { name: "reconcile",     summary: "Idempotent dev/test restart: stop the incumbent on the port (graceful→force), [--fresh] wipe, then serve.", handler: cmdReconcile     },
  { name: "refresh",       summary: "THE post-dev-change cure (idempotent): pnpm -r build, then reconcile --fresh (stop incumbent + re-pave ~/.lares + re-bake genesis + serve). Identity preserved. Use after editing code.", handler: cmdRefresh       },
  { name: "build-genesis", summary: "Build the deterministic genesis-island artifact.",                              handler: cmdBuildGenesis  },
  { name: "test-quine",    summary: "Verify the quine round-trip: genesis → boot → render → hash.",                  handler: cmdTestQuine     },
  { name: "heleuma",       summary: "Audit / scaffold load-bearing source-file memes. Pass --write to scaffold.",    handler: cmdHeleuma       },
  { name: "normalize",     summary: "Canonicalize a meme carrier's framing (embeds the iam namespace into the SOH) so the round-trip laws hold. `--check` reports drift without writing (CI/pre-commit).", handler: cmdNormalize     },
  { name: "vault",         summary: "At-rest seal LIFECYCLE for the sovereign secret carriers (keyhive archive + recovery share): `status` shows the seal state (--check probes a passphrase → split-KEK detection); `seal` seals cleartext carriers under a new passphrase; `rotate` re-seals old→new; `export <path>` writes a passphrase-SEALED backup (--force overwrites); `repair` cures a split-KEK. DAEMON-FIRST: mutating verbs route through the daemon when up (so its in-memory policy moves with the carriers — no un-rotate), direct file op when down. The passphrase never touches argv/history — no-echo TTY prompt (double-entry for a new pass) or LARES_ARCHIVE_PASSPHRASE(+_NEW)+--yes.", handler: cmdVault, signs: true /* holds and rotates persona key material */ },
  { name: "library",       summary: "The ACQUIRED shelf — books and corpora a human did not author, kept READABLE and VERIFIABLE outside every tracked tree. `bags/` carries what an operator authors and round-trips; an acquired body has no author here and no parse∘render fixed point, so left on the seed surface it enters git history and a growing shelf grows the history with it. The tier stands at `<data>/library` (or LAR_LIBRARY) — outside the wipe zone, because `reset` pares `<data>/vessel` on the premise that its blobs rebuild from the bags carriers, which holds for DERIVED blobs and fails completely for acquired ones. Layout: `<collection>/<cid>/<the real filename>` + `meta.json` — the directory name IS the digest (audit with sha256sum, no tooling), the filename is what a human reads, the sidecar carries origin + licence + the RFC-6920 anchor. `list` · `show <coll>` · `acquire <file> --to <coll>` (MOVES by default — moving is the point; --keep copies) · `verify` (re-digests BYTES, never records) · `index <coll> --out <path>` (the tracked part that travels) · `path <coll>`. A reference NAMES: `library:mark-twain` travels, a directory does not.", handler: cmdLibrary },
  { name: "persona",       summary: "The PLURALITY-PONO identity multitude. THREE NAMES, THREE JOBS: `new <index> --name '<petname>'` mints/loads the persona-root at that handle-index (fail-closed via assertHandleIndex) and sets its PRIVATE label; `--handle '<Handle>'` declares what that persona answers to OUTWARD (an intent — only a publicly announced Handle binds a persona to a public glamour); `--seat` stands it for a Kahu chair on THIS node (needs a Handle; neither flag implies the other). The label and the Handle may read identical and stay two acts, so a compartment called 'the-burner' can still stand under any declared Handle. `wear <index>` switches the active persona (reboot-to-switch, one face to the mesh); `list` prints the private multitude (held indices + active marker + labels + declared Handles); `sync` carries this node's labels and Handles up to the fleet (@persona, which the self-slot syncs to the operator's OWN vessels and no stranger — the seat claim stays here). Local-first: a write lands on this node first and rides up when a hearth answers. Drives the founder-side node core; a joinee receives a root by admit, never mints here.", handler: cmdPersona, signs: true /* mints persona roots */ },
  { name: "circle",        summary: "The FOLLOW VERB — the INVERSION-OF-CONTROL social graph. `add <nym> --to <circle> [--petname <label>] [--card <file>]` recognises a nym (already-known, or TOFU-admits a carried self-certifying HandleCard) + optionally sets its PRIVATE local label + adds it to the circle (adding to a circle IS the follow); `remove <nym> --to <circle>` unfollows; `list [--to <circle>]` reads the private follow-view (petname + last-seen glamour). The graph is PRIVATE and LOCAL — nothing reaches @crossroads, no central trace. Publishing a public glamour stays a separate, deliberate act. Fail-closed: following an unmet nym needs `--card`.", handler: cmdCircle },
  { name: "cabal",         summary: "The JOIN AXIS — a mutual-hold relation with a cabal-realm, orthogonal to the CARRIAGE contract `nexus contract` writes. `cabal vouch <joiner-nym> --realm <realm-doc-id> [--expires <iso>] [--as <root-index>]` stakes ONE held face's OWN standing on one joiner, onto the Nexus vouch board — no kahu quorum, because a vouch is one hand's own stake, not a steward act. It ADMITS NOBODY: a vouch is signal-2 on the lineage the admission price walks, and the cost is paid at the moment of vouching, since a voucher's score SPLITS across everyone they vouch for. Re-vouching the same joiner stays ONE edge — re-minting never buys out-degree.", handler: cmdCabal, signs: true /* a vouch STAKES the voucher's own standing */ },
  { name: "edge",          summary: "Set one RELATIONSHIP aside, or take the marker back down \u2014 the k\u0101pae raised over an EDGE rather than over a party. `edge kapae <edge-id> --epoch <e>` shadows that relation; `edge un-kapae <edge-id> --epoch <e>` re-admits it as a deliberate signed act. Scoped under `edge` to mirror `nexus kapae`/`nexus un_kapae` and stay apart from them: that pair shadows a PRESENTER under a kahu quorum, this pair shadows one RELATIONSHIP under whichever key holds it. Setting a relation aside says NOTHING about either end \u2014 the vessel keeps standing, the face keeps standing, only that relation stops counting. A raised marker WINS a same-version tie, so an eviction never quietly reverses when a partition heals. The write asserts no authority: it signs with a named persona root, and whether that root holds the edge gets decided by whichever reader consults the shadow.", handler: cmdEdge, signs: true /* a kapae act signs over a relationship */ },
  { name: "raise",         summary: "The RECOGNISER's half of the raise ceremony. A vessel standing at the WAKING FLOOR emits a challenge; `raise sign <challenge-json> [--as <index>]` signs it with one of YOUR persona roots and hands back a grant. The caps that arrive at that vessel ride YOUR key \u2014 no key of yours ever rests on the vessel you raise, and the grant stands only until that Nexus's lease epoch rolls past it.", handler: cmdRaise, signs: true /* signs with a persona root */ },
  { name: "nexus",         summary: "The Nexus founding-kahu ROSTER + its PRE-ROTATED charter-epoch chain (TUF≈KERI) — the Kapae immune antigen's authority home. `nexus seal seat` seats the held personas' ed25519 VERIFYING keys (read from the vault, never the seed; matched by DECLARED HANDLE — never the private label, which would weld a compartment's private name to a public commitment) + establishes the genesis epoch with a `--next-key-commit` pre-rotation; `nexus seal rotate` reveals the pre-committed next key-set + advances the chain (FAIL-CLOSED on reveal mismatch); `nexus seal commit --keys` computes a commitment digest; `nexus seal show` reads the roster, chain head, + quorum verdict. `nexus kapae <nym> [--reason]` RAISES a quorum-signed ban onto the always-carried antigen board (a banned presenter draws Mu); `nexus kapae --list` folds the currently-Kapae'd set; `nexus un_kapae <nym>` mints a quorum-signed lift at a strictly higher version (FAIL-CLOSED: a sub-quorum or unseated charter REFUSES, writing nothing).", handler: cmdNexus, signs: true /* quorum-signs admits, kapae and charter acts */ },
  { name: "device-admit",  summary: "Admit a new vessel into your operator PersonaGroup (produces an admit payload via runDeviceAdmit; QR/NFC/LAN transport pending).",    handler: cmdDeviceAdmit, signs: true /* signs a device-delegation edge */ },
  { name: "invite-send",   summary: "Invite another operator into the Nexus MeshCabal (DreamNet founding ceremony — not yet implemented).",  handler: cmdInviteSend, signs: true /* seals a boot invite */ },
  { name: "invite-receive",summary: "Receive and apply a Nexus MeshCabal invitation (DreamNet — not yet implemented).",                      handler: cmdInviteReceive, signs: true /* spends a sealed capability */ },
];

/**
 * Every top-level `lares` command name — the source the isomorphism fixture (cli-verbs.json) mirrors
 * and YIN's three-way parity test reads (CLI command-table ↔ MCP tool-set ↔ VERB_SEATS). Kept in sync
 * with COMMANDS by derivation, so a new verb here surfaces in the fixture the moment it regenerates.
 */
export const COMMAND_NAMES: readonly string[] = COMMANDS.map((c) => c.name);

/**
 * The global help IS the surface projection — a face reading the one table, never a second catalogue.
 *
 * `lares help --surface <name>` reads another face's projection; `--executable` drops the key-holding acts
 * an agent surface may compose and must never run; `--json` emits the shape another face consumes. Folding
 * these here rather than into a verb of their own keeps the CLI from spending a command on describing
 * commands.
 */
function printHelp(surface: string = VERB_SURFACE.cli, executableOnly = false): void {
  const shown = projectCommands(surface, executableOnly);
  console.log("lares — operator CLI for the Lares lararium stack\n");
  console.log("Usage:  lares <command> [args...]\n");
  if (surface !== VERB_SURFACE.cli || executableOnly) {
    console.log(`Surface: ${surface}${executableOnly ? " (executable — key-holding acts withheld)" : ""}`);
  }
  if (shown.length === 0) {
    console.log(`\nNo verbs project onto "${surface}" — a surface exposes what asked to be exposed.\n`);
    return;
  }
  console.log("Commands:");
  for (const c of shown) {
    console.log(`  ${c.signs ? "✍ " : "  "}${c.name.padEnd(14)} ${c.summary}`);
  }
  if (shown.some((c) => c.signs)) {
    console.log("\n  ✍ = holds a key. An agent surface may compose these and MUST NOT execute them.");
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
    const surface = args.options["surface"] ?? VERB_SURFACE.cli;
    const execOnly = args.flags["executable"] === true;
    if (args.flags["json"] === true) {
      // The shape another face consumes — `signs` rides even in the executable view (where it always reads
      // false), so a reader never infers the flag's absence from a filter it did not run.
      console.log(JSON.stringify({ ok: true, data: { surface, executable: execOnly, entries: projectCommands(surface, execOnly) } }));
      return 0;
    }
    printHelp(surface, execOnly);
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
