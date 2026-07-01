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
 * entry is the live source the design meme (lar:///ha.ka.ba/@lares/api/lares/corpus) mirrors.
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
      "lares corpus ls                                        # the live corpus-palaces",
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
    next: ["lares corpus ls", "lares palace-teardown   # the full nuke, incl. .corpus/*"],
  },

  "palace-teardown": {
    synopsis:
      "Tear down the local palace organs + harvest idempotency so a re-pave starts from ZERO — the cure " +
      "for a partial/interrupted re-pave. Enumerates the SAME organ registry `lares wake --init` stands " +
      "up (mempalace · astpalace · formpalace · meshpalace), PLUS the harvest watermark/stage and every " +
      "`.corpus/*` scratch. PREVIEW by default (touches no disk); `--confirm` removes; REFUSES under a " +
      "live MCP/mine unless `--force`.",
    examples: [
      "lares palace-teardown                   # preview what would be removed",
      "lares palace-teardown --confirm         # remove it",
      "lares palace-teardown --confirm --force # remove even under a live MCP",
    ],
    flags: [
      "--confirm   actually remove (default is a no-disk preview)",
      "--force     remove even when a live mempalace process holds the store",
    ],
    next: ["lares harvest --all   # re-pave after the nuke"],
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
    flags: ["--palaces   print the palace-organ health table (mempalace · ast · form · mesh)"],
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
    next: ["lares status --palaces", "lares harvest --all"],
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
