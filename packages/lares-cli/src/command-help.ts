/**
 * command-help — the per-command HELP REGISTRY. Closes the long-standing "TBD" gap where
 * `lares <command> --help` fell back to the one-line summary.
 *
 * Each entry carries `{ synopsis, examples[], flags[] }` and renders EXAMPLES FIRST (clig.dev:
 * "show them first") — operators copy a working line faster than they read a flag table — then the
 * flags, then a `next:` nudge (the git-status idiom: suggest what to run after). A destructive verb
 * names its preview/confirm path in the synopsis so the safe gesture is the discoverable one.
 *
 * The registry is sparse on purpose: a command WITHOUT an entry renders its dispatch summary (passed
 * in by the caller) — the gap narrows command-by-command without a big-bang rewrite. The `corpus`
 * entry is the live source the design meme (lar:///ha.ka.ba/lares/api/lares/corpus) mirrors.
 */

export interface CommandHelp {
  /** one paragraph: what the command does + (for destructive verbs) its preview/confirm path. */
  readonly synopsis: string;
  /** copy-pasteable invocations, the common cases FIRST. */
  readonly examples: readonly string[];
  /** `--flag  meaning` lines (the value form spelled where it takes one). */
  readonly flags?: readonly string[];
  /** suggested next commands (the git-status idiom). */
  readonly next?: readonly string[];
}

export const COMMAND_HELP: Readonly<Record<string, CommandHelp>> = {
  corpus: {
    synopsis:
      "The ephemeral astral MULTIPALACE — scratch mempalace instances (the `docker run --rm` of memory). " +
      "`run` is ephemeral-DEFAULT: open → ingest → analyze → DISSOLVE on exit (success OR error). `open` " +
      "leaves a corpus live to `query` / `keep` / `dissolve`. Every scratch is leak-proofed: " +
      "`dissolve --orphans` reaps anything an interrupted run left behind. (S0 stands the content " +
      "stub; S1 the multi-scale-FFZ bands; S2 the structure parse-router → content-free shape vectors; " +
      "S3 the FORM induction → the corpus's OWN grammar, mined blind and MDL-stopped. Four planes stand.)",
    examples: [
      "lares corpus run ./notes -- what decisions were made   # open, analyze, dissolve",
      "lares corpus run ./notes --keep                        # ... but land it durable",
      "lares corpus open ./src --name myproj                  # spin up + ingest, leave live",
      "lares corpus query c-abc123 capability model           # search a live corpus",
      "lares corpus ls                                        # the live corpus sensoria",
      "lares corpus keep c-abc123                             # promote ephemeral → durable",
      "lares corpus dissolve c-abc123                         # remove one (idempotent)",
      "lares corpus dissolve --orphans                        # reap leaked scratch",
    ],
    flags: [
      "--keep             (run) land the corpus durable instead of dissolving on exit",
      "--name <n>         (run|open) label the corpus (default: the source basename)",
      "--all              (dissolve) remove every live corpus",
      "--orphans          (dissolve) reap leaked scratch (interrupted runs, dead owners)",
    ],
    next: ["lares corpus ls", "lares sense teardown   # the full nuke, incl. .corpus/*"],
  },

  "palace-teardown": {
    synopsis:
      "Tear down the local palace organs + harvest idempotency so a re-pave starts from ZERO — the cure " +
      "for a partial/interrupted re-pave. Enumerates the SAME organ registry `lares wake --init` stands " +
      "up (mempalace · structurepalace · formpalace · meshpalace), PLUS the harvest watermark/stage and every " +
      "`.corpus/*` scratch. PREVIEW by default (touches no disk); `--confirm` removes; REFUSES under a " +
      "live daemon/MCP/mine (naming each blocker + its SPAWNER) unless `--drain` (graceful quiesce-then-" +
      "tear) or `--force`.",
    examples: [
      "lares sense teardown                    # preview what would be removed",
      "lares sense teardown --confirm --drain  # quiesce live daemons, then remove (graceful)",
      "lares sense teardown --confirm          # remove (REFUSES + names blockers if live)",
      "lares sense teardown --confirm --force  # remove even under a live daemon",
    ],
    flags: [
      "--confirm   actually remove (default is a no-disk preview)",
      "--drain     gracefully quiesce live daemons (pause hooks + drain) BEFORE tearing",
      "--force     remove even when a live palace process holds the store / mints daemons",
    ],
    next: ["lares mempalace status   # inspect the topology first", "lares sense pour --all   # re-pave after the nuke"],
  },

  mempalace: {
    synopsis:
      "Observe + gracefully drain the palace daemon/hook/capture topology (alias `lares palace`). The cure " +
      "for the daemon-spawn whack-a-mole: warm write-daemons spawn ON-DEMAND and the capture/ingest hooks " +
      "mint one on every dispatch, so killing the children never stops the SPAWNER. `status` surfaces the " +
      "whole topology (each row: PID · serves-what · SPAWNER · uptime); `quiesce` pauses the hooks FIRST " +
      "then SIGTERM-drains the daemons to zero (idempotent); `resume` un-pauses.",
    examples: [
      "lares mempalace status              # the live daemon/hook/capture topology + spawners",
      "lares mempalace quiesce             # pause hooks → drain daemons → confirm zero, then un-pause",
      "lares mempalace quiesce --hold      # ... but leave the hooks paused (for a migration)",
      "lares mempalace resume              # un-pause the hooks (daemon re-spawns lazily)",
    ],
    flags: ["--hold   (quiesce) leave the hooks paused after draining (run `resume` when done)"],
    next: ["lares sense teardown --confirm --drain   # graceful tear", "lares hooks status"],
  },

  hooks: {
    synopsis:
      "The hook-lever on its own: `pause` / `resume` / `status` the capture + ingest hooks by writing / " +
      "removing a marker file the hook scripts check and NO-OP on when present. Lets a migration or a " +
      "`lares sense teardown` run WITHOUT daemon-spawn contention. `lares mempalace quiesce` pauses AND " +
      "drains in one gesture; this verb is the lever alone (suppress minting without touching live daemons).",
    examples: [
      "lares hooks status                 # is minting paused?",
      "lares hooks pause                  # suppress capture/ingest minting",
      "lares hooks pause --reason migrate # ... with a recorded reason",
      "lares hooks resume                 # un-pause",
    ],
    flags: ["--reason <t>   (pause) record why the hooks were paused (default: manual)"],
    next: ["lares mempalace status", "lares mempalace quiesce   # pause AND drain"],
  },

  status: {
    synopsis:
      "Local node health — bootstrap presence, storage size, whether the daemon port is in use, and " +
      "(when up) a residency snapshot. With `--palaces`, print the palace-organ health table " +
      "(re-runnable): each organ's resolved dir + whether its store has materialized.",
    examples: [
      "lares status            # node health snapshot",
      "lares status --palaces  # the palace-organ health table",
      "lares status --json     # machine-readable",
    ],
    flags: ["--palaces   print the palace-organ health table (mempalace · structure · form · mesh)"],
    next: ["lares wake --init   # stand up any absent organ"],
  },

  wake: {
    synopsis:
      "The boot ENTRY POINT (idempotent). Ensures the node is up (attach if healthy, start detached if " +
      "down) and emits a live hydration frame. `--init`/`--install` stand up the whole stack incl. ALL " +
      "palace organs; `--claude`/`--codex`/`--copilot`/`--vscode` wire each harness's MCP + ingest hook.",
    examples: [
      "lares wake               # idempotent boot, attach-or-start",
      "lares wake --init        # ... + stand up every palace organ",
      "lares wake --install --claude   # cold-pull standup + wire ~/.claude",
    ],
    flags: [
      "--init / --install   found the stack + stand up all palace organs (idempotent)",
      "--admit <file>       join an existing operator PersonaGroup",
      "--claude/--codex/--copilot/--vscode   wire that harness's mempalace MCP + hook",
    ],
    next: ["lares status --palaces", "lares sense pour --all"],
  },

  recall: {
    synopsis:
      "Read the verbatim PLACE memory (mempalace) THROUGH the @daemon seat — semantic search, one-drawer " +
      "fetch, or a drawer list. STAMP FILTERS compose with the search or the list and report honest " +
      "counts (matched of scanned), never a silent drop: the list path matches the stamped lar_* drawer " +
      "metadata exactly; the search path reads surface/agent exactly off the source name and re-runs the " +
      "capture's own gradient reader for voice/band/drift (the search wire returns no drawer metadata).",
    examples: [
      "lares sense recall keyhive convergent removal      # semantic search (default 5 hits)",
      "lares sense recall gate --wing wing_myproj         # scope to one project wing",
      "lares sense recall verdict --surface codex         # only codex-harness turns",
      "lares sense recall fork --voice Council --band canon   # filters compose (AND)",
      "lares sense recall --list --agent a1d5 --wing wing_x__spirits  # one spirit's drawers",
      "lares sense recall --drift --wing wing_x           # drift-flagged drawers only",
      "lares sense recall --drawer wing_x_a1b2c3          # one drawer verbatim",
    ],
    flags: [
      "--wing <w>      scope to one project wing (pass the narrowest wing you know)",
      "--limit <n>     cap results (default 5 search / 20 filtered list)",
      "--drawer <id>   fetch one drawer verbatim",
      "--list          list drawers (a stamp filter alone implies it)",
      "--voice <name>  keep turns a named Voice held (e.g. Council, Ink-Clerk)",
      "--band <b>      canon | synthesis | provisional | raw (the register ladder)",
      "--agent <a>     spirit id / worldline-handle prefix, or the exact pet-name",
      "--surface <s>   claude | codex | copilot-cli | copilot-vscode",
      "--drift         drift-flagged turns only",
      "--port <n>      daemon port",
    ],
    next: ["lares sense worldline <session>   # walk the session's spirit tree", "lares sense telemetry --wing <w>"],
  },

  worldline: {
    synopsis:
      "Walk a session's SPIRIT TREE from the durable worldline edge-DAG: the mempalace knowledge graph " +
      "read READ-ONLY (prov:Delegation spawn→handback intervals + prov:Communication injects, adapter " +
      "lares-worldline), joined with the bearing index (<state>/harvest/*.ndjson) for per-agent turn " +
      "counts + aim/yield. The ∥ mark rides the edge-DAG's own valid-time replay law (the ordering the " +
      "mesh causal projection is defined by — a sibling reads sequential only when the previous handback " +
      "replays before its spawn). `diff <A> <B>` refuses honestly: ITC stamps are not queryably " +
      "persisted (in-memory registry only); the gap needs a persisted ITC read-path.",
    examples: [
      "lares sense worldline 0425c035                # session-id prefix — the braid",
      "lares sense worldline 0425c035-a698-4aeb-a988-1bbf5a19b567.a1d5606cd26b88c82   # a handle walks its run",
      "lares sense worldline 0425c035 --json         # the structured braid (agents/pipes)",
      "lares sense worldline tree 0425c035 --palace ~/.mempalace/palace   # explicit palace",
    ],
    flags: [
      "--palace <dir>  palace dir holding knowledge_graph.sqlite3 (default: the resolved palace)",
      "--json          deterministic JSON braid (nodes carry spawn/handback/turnKey/turns/aim/yield/∥)",
    ],
    next: ["lares sense recall --agent <id>   # a spirit's drawers", "lares sense pour   # project fresh edges + bearing turns"],
  },
};

/**
 * Render a command's help to stdout (examples first, then flags, then `next:`). When no registry
 * entry exists, fall back to the dispatch `summary` so every command still answers `--help`.
 */
export function renderCommandHelp(name: string, summary?: string): void {
  const help = COMMAND_HELP[name];
  if (!help) {
    console.log(`lares ${name}`);
    if (summary) console.log(`\n  ${summary}`);
    console.log(`\n  (no detailed help yet — run \`lares ${name}\` for usage.)`);
    return;
  }
  console.log(`lares ${name} — ${help.synopsis}\n`);
  console.log("Examples:");
  for (const ex of help.examples) console.log(`  ${ex}`);
  if (help.flags && help.flags.length) {
    console.log("\nFlags:");
    for (const f of help.flags) console.log(`  ${f}`);
  }
  if (help.next && help.next.length) {
    console.log("\nNext:");
    for (const n of help.next) console.log(`  ${n}`);
  }
}
