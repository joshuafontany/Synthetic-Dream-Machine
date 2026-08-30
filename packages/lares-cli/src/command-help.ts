/**
 * command-help — the per-command HELP REGISTRY behind `lares <command> --help`.
 *
 * Each entry carries `{ synopsis, examples[], flags[] }` and renders EXAMPLES FIRST (clig.dev:
 * "show them first") — operators copy a working line faster than they read a flag table — then the
 * flags, then a `next:` nudge (the git-status idiom: suggest what to run after). A destructive verb
 * names its preview/confirm path in the synopsis so the safe gesture is the discoverable one.
 *
 * The registry is sparse: a command WITHOUT an entry renders its dispatch summary (passed in by the
 * caller). The `corpus` entry is the live source the design meme (lar:///ha.ka.ba/lares/api/corpus) mirrors.
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
  sensorium: {
    synopsis:
      "The source-neutral sensorium surface. `run` / `open` ingest a path into a scratch sensorium. " +
      "`run` is ephemeral-DEFAULT: open → ingest → analyze → DISSOLVE on exit (success OR error). `open` " +
      "leaves it live to `query` / `keep` / `dissolve`. Every scratch is leak-proofed: " +
      "`dissolve --orphans` reaps anything an interrupted run left behind. Four planes stand over the " +
      "scratch: content · multi-scale-FFZ bands · content-free structure vectors · the corpus's OWN " +
      "grammar (FORM induction, mined blind and MDL-stopped).",
    examples: [
      "lares sensorium run ./notes -- what decisions were made # open, analyze, dissolve",
      "lares sensorium run ./notes --keep                     # ... but retain it",
      "lares sensorium open ./src --name myproj               # spin up + ingest, leave live",
      "lares sensorium query c-abc123 capability model        # search a live sensorium",
      "lares sensorium ls                                     # live sensoria",
      "lares sensorium keep c-abc123                          # retain ephemeral → durable",
      "lares sensorium dissolve c-abc123                      # remove one (idempotent)",
      "lares sensorium dissolve --orphans                     # reap leaked scratch",
      "lares sensorium name memory root \"working memory\"",
      "lares sensorium propose-name memory cid:abc \"a turning\" --projection entity-graph --evidence cid:abc,cid:def",
      "lares sensorium names memory",
      "lares sensorium accept-name memory pn-1234",
    ],
    flags: [
      "--keep             (run) retain the sensorium instead of dissolving on exit",
      "--name <n>         (run|open) working label (default: the source basename)",
      "--all              (dissolve) remove every live sensorium",
      "--orphans          (dissolve) reap leaked scratch (interrupted runs, dead owners)",
      "--projection <h>   (propose-name) the proposing derived projection",
      "--evidence a,b     (propose-name) local evidence references",
    ],
    next: ["lares sensorium ls", "lares sensorium names memory", "lares sense teardown   # the full nuke, incl. .corpus/*"],
  },

  mempalace: {
    synopsis:
      "THE GUEST COMPARATOR'S DOOR (the sovereign sensorium lives at `lares sense`). The guest ~/.mempalace " +
      "is the vendored vanilla nakama store — a clean comparator, a SEPARATE causal island the vessel never " +
      "boots into. `setup` raises it (+ pins hooks.auto_save=false); `harvest` mines transcripts into it " +
      "through the vendored miner's OWN vanilla path — no lar_* stamps, no sensorium planes; `repave` " +
      "previews or rebuilds it (quiesce → verify → tear → stand → harvest, idempotent). `status` surfaces " +
      "the live daemon/hook/capture topology (PID · serves · SPAWNER · uptime); `quiesce` pauses hooks then " +
      "drains the daemons to zero; `resume` un-pauses.",
    examples: [
      "lares mempalace setup               # raise the guest ~/.mempalace",
      "lares mempalace harvest --all       # mine transcripts into the guest (vanilla, no lar_*)",
      "lares mempalace repave --confirm    # tear + stand the guest clean",
      "lares mempalace status              # the live daemon/hook/capture topology + spawners",
      "lares mempalace quiesce             # pause hooks → drain daemons → confirm zero, then un-pause",
      "lares mempalace resume              # un-pause the hooks (daemon re-spawns lazily)",
    ],
    flags: [
      "--all       (harvest) sweep every transcript source",
      "--confirm   (repave) rebuild (default previews)",
      "--hold      (quiesce) leave the hooks paused after draining (run `resume` when done)",
    ],
    next: ["lares sense teardown --confirm --drain   # tear the SOVEREIGN planes", "lares hooks status"],
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

  vessel: {
    synopsis:
      "THE VESSEL DOOR — one namespace over the vessel's own causal island. Seven primitives and one " +
      "read: `found` mints identity + bootstrap · `stand` brings the daemon up and reports · `stop` " +
      "halts it on the port · `clear` wipes the store and re-founds (identity survives) · `bake` " +
      "re-derives the genesis island · `seed` plants every bags/* holding back into its doc · `read` " +
      "inspects and starts nothing. Compositions ride `vessel rite <petname>`, so a new cap-stack " +
      "arrives as a rite rather than another top-level verb.",
    examples: [
      "lares vessel stand                      # idempotent boot, attach-or-start, and REPORT",
      "lares vessel wire                       # point every AI surface here (re-aims drift)",
      "lares vessel wire --claude              # ~/.claude alone",
      "lares vessel read --palaces             # health, plus the palace-organ table",
      "lares vessel seed --apply --yes         # plant every holding (idempotent)",
      "lares vessel rite refresh               # the post-code-change cure: build · stop · clear · stand",
    ],
    flags: [
      "stand --foreground   this terminal owns the node (no Vite)",
      "stand --with-app     node + Vite app together",
      "stand --restart [--clear]   free the port first, optionally wiping the store",
      "stand --observe      REPORT ONLY — withholds the standing half; outranks every acting flag",
      "stand --install      found the vessel before standing it — stays inside LAR_ROOT",
      "stand --init         ... and wires every AI surface too (reaches ~/.claude etc; `vessel wire` is the door for that alone)",
      "stand --admit <file>        join an existing operator PersonaGroup",
      "wire [--claude|--codex|--copilot|--vscode]   aim that surface here; no flag aims them all",
      "wire --observe       REPORT what a wiring would touch; write nothing",
      "read --palaces       the palace-organ health table (mempalace · structure · form · mesh)",
      "rite <petname>       founding · refresh · rebuild · rebirth — the pet-named cap-stacks",
    ],
    next: ["lares vessel read --palaces", "lares sense pour --all"],
  },

  sense: {
    synopsis:
      "THE SOVEREIGN SENSORIUM'S ONE DOOR (the guest comparator lives at `lares mempalace`). READ four " +
      "verbs with the plane as a `--lens` parameter (search · relate · structure · status), so a new plane " +
      "needs no new verb. TEND the planes with the lifecycle verbs (recall · capture · pour · teardown · " +
      "worldline · telemetry · subagents · flow). `pour --all` walks the whole tending movement — " +
      "quiesce · baseline · drawers · bearing · projection · verify · resume — never the guest miner. " +
      "Every verb rides the daemon's composed caps (the " +
      "single-owner law: nothing opens a store beside the vessel's holder).",
    examples: [
      "lares sense search \"entrance block\" --lens structure   # hybrid recall over a plane",
      "lares sense status --lens content                       # wings · rooms · entities · total",
      "lares sense recall keyhive convergent removal           # stamp-filtered verbatim drawers",
      "lares sense recall fork --voice Council --band canon     # filters compose (AND)",
      "lares sense pour --all                                  # the sovereign re-pave (all sources)",
      "lares sense worldline 0425c035                          # walk a session's spirit tree",
      "lares sense teardown --confirm --drain                  # tear the planes for a clean re-pave",
    ],
    flags: [
      "--lens <plane>  content | structure | form | persistence (default content) — READ verbs",
      "--wing <w>      scope to one project wing",
      "--voice/--band/--agent/--surface/--drift   recall stamp filters (compose AND, honest counts)",
      "--imago <id>    (recall) fetch one imago verbatim; --list lists imagines",
      "--all           (pour) sweep every transcript source",
      "--confirm/--drain/--force   (teardown) remove / quiesce-first / override live holders",
    ],
    next: ["lares sense status --lens content", "lares mempalace status   # the guest comparator door"],
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
