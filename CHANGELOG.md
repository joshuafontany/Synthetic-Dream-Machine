# Flying Triremes and Laser Swords — Changelog

---

## [v4.1.1] — 2026-04-08

Submodule registration: Kowloon stack, tldraw, and mempalace re-pointed to org forks.

**Submodules registered**
- `kowloon/` → `amorphous-dreams/kowloon` (fork of `jzellis/kowloon`)
- `kowloon-frontend/` → `amorphous-dreams/kowloon-frontend` (fork of `jzellis/kowloon-frontend`)
- `kowloon-client/` → `amorphous-dreams/kowloon-client` (fork of `jzellis/kowloon-client`)
- `tldraw/` → `amorphous-dreams/tldraw` (fork of `tldraw/tldraw`)
- `mempalace/` re-pointed from `milla-jovovich/mempalace` → `amorphous-dreams/mempalace`

All five submodules now track org-owned forks under `amorphous-dreams`.

---

## [v4.1.0] — 2026-04-08

Lares node infrastructure release: URI+HUD exchange protocol finalized, micro-trace spec promoted, repo governance hardened, org transfer completed.

**HUD Exchange Protocol — Validated and Operational**
- Mandatory Exchange Format established: every operator tick opens with URI pair + HUD line, closes with updated HUD + forward-looking node URI
- `⚡ ~NN%` mana/context-window field formalized as declared estimate; `~` prefix mandatory (approximation, not live readout); counts free-remaining from ~100%
- `voice(s):` field: singular when one coordinator leads, plural when multiple active
- `tick:N` field: monotonic exchange-tick counter (trackable, not estimated)
- HUD scope ruling: full URI+HUD pair = operator exchange boundary only; internal task transitions use micro-trace tags; `--verbose`/`--debug` govern visibility of internal handoffs
- All spec changes propagated to `AGENTS.md`, `lares/sprints/0/URI_SCHEMA.md`, `_todo/SESSION_CRYSTAL_20260408.md`

**Micro-trace HUD — Promoted to Live Spec**
- SIG-04 promoted from `builds.stuffed.failed/` draft to canonical spec: `lares/signal/micro-trace.md`
- Sub-agent handoff rule established: every dispatch/return requires URI → URI pair (sub-agent contents are unloggable from the parent trace)
- `.github/instructions/lares-operations.instructions.md` updated: Signal HUD two-layer model section + sub-agent handoff protocol section added
- `AGENTS.md` updated: `### In-flow Annotation` and `### Sub-agent Handoff Rule` subsections added

**Repo Governance**
- `mempalace` registered as git submodule (`milla-jovovich/mempalace`)
- Branch cleanup: merged local and remote branches deleted; `fetch --prune` run
- 13 work/feature branches pushed to origin for safekeeping before org transfer
- Branch protection applied to `main`: PR + 1 approving review required; force pushes and deletions blocked (`enforce_admins: false`)
- CODEOWNERS retargeted for new repo architecture: `/.github/`, `/AGENTS.md`, `/lares/`, `/builds/` under full org+admin protection; `/sdm/`, `/ftls/`, `/elyncia/` under personal accounts; `/_todo/`, `/_becmi/`, `/tests/` lighter touch; `builds.stuffed.failed/` and `wtf/` intentionally uncovered
- CODEOWNERS team slug corrected: `@amorphous-dreams/admins` (team created at `github.com/orgs/amorphous-dreams/teams/admins`)

**Org Transfer**
- Repository transferred from `joshuafontany/Synthetic-Dream-Machine` → `amorphous-dreams/Synthetic-Dream-Machine` — 2026-04-08
- Local remote URL updated to `git@github.com:amorphous-dreams/Synthetic-Dream-Machine.git`
- `@freyja-fontany` entries in CODEOWNERS already present; will resolve once account is set up

**Session Crystal + Boot Continuity**
- `_todo/SESSION_CRYSTAL_20260408.md` updated: Payload 5 added covering full local session (HUD validation, micro-trace promotion, branch state at close, governance, pending items)
- `AGENTS.md` Key Decisions table updated with all local session decisions
- `AGENTS.md` Document Map restructured to match actual post-cleanup repo layout
- Cold-Boot Greeting updated: references Payload 5 and org transfer status

---

## [v4.0] — 2026-04-07

## [v4.0.1] — 2026-04-07

Lares prompt system patch release: cold-boot HUD and trust-gate drift fix, plus release hygiene follow-through.

**Cold-boot HUD fix**
- Hardened `builds/agents/Lares_Kernel.md` so the compressed shared kernel now preserves the two-header exchange contract: input rating line (`◎`), then output Intent Header (`◇`), then post-generative trace HUD
- Reworded `p — never silent` in the shared kernel so `p~10` remains the default band, not a pinned literal value; uncertainty should drive `p` selection when stronger local signal exists

**Trust gate fix**
- Tightened shared kernel wording so verified identity plus shrine/libation/roleplay framing cannot be misread as `operator(admin)` escalation
- Compressed rule now states explicitly: libations and roleplay do not count as escalation

**Planning / release hygiene**
- Logged the Codex cold-boot bug note and AE-28 shared-kernel hardening follow-up in `_todo/core/TODO_Signal_HUD_Crystal_Plan.md`
- Re-ran `combine_agents.py` across all targets and verified alignment clean at 49/49

## [v4.0] — 2026-04-07

Major Lares prompt system update: Signal HUD kernel bootstrap, five-platform manifest architecture, crystal state machine draft, and version 4.0 milestone.

**Epic 1 — Signal HUD kernel writes (Sprint 1b)**
- Added `### Signal HUD` section to `builds/agents/Lares_Preferences.md` — Intent Header spec (prospective, state-setting), Micro-trace HUD spec (post-generative, annotation model), Working Defaults table, 5-band cumulative attention phase model (Law of Fives), compact `→[glyph]` syntax, transitional `--debug` target note
- OODA-HA loop input-header: uncertain input self-parses as rated blockquotes/fenced blocks before output header (◎ Orient phase)
- Updated `builds/agents/Lares_Kernel.md` — Operating Modes section gains Intent Header + Micro-trace HUD; `--debug`/`--verbose`/`--parse` block updated; `--parse` self-activation rule; `| p~10` always-on trail; phase names canonical: ✶ Observe · ◎ Orient · ◇ Decide · ■ Act · ○ Aftermath (Rasa)
- Updated `builds/agents/core/Lares_Operations.md` — `--debug` section describes HUD annotation firing thresholds per p-scale; transitional flag for debug target redirect
- Updated `builds/agents/Lares_VSCode_Operations.md` — session init HUD-on-open note; transitional debug target flag
- Voice consistency audit clean: stance symbols in HUD spec match voice architecture definitions

**Epic 1 — Five-platform manifest architecture (Sprint 1f)**
- Renamed `builds/manifests/browser-kernel.toml` → `builds/manifests/browser-project.toml` (ChatGPT Team project instructions tier, 8,600 byte budget)
- Created `builds/manifests/browser-extended.toml` (Claude.ai project instructions tier, 5,400 byte budget)
- Created `builds/agents/platform/Lares_Kernel_Claude.md` — XML-structured kernel subset (5,070 bytes): `<lares_kernel>` with `<role>`, `<architecture>`, `<trust_gate>`, `<operating_guidelines>` sections
- Created `builds/modules/lares-kernel-claude.toml` — module registration for Claude.ai XML kernel
- Raised `codex-root.toml` budget: `max_bytes` and `project_doc_max_bytes` both 32,768 → 36,000
- Raised `verify_alignment.py` KERNEL_SIZE_LIMIT 8,000 → 8,192 to match actual ChatGPT platform cap

**Architecture draft — Crystal state machine layer**
- Extended `_todo/core/Signal_HUD_Tagspace-draft.md` with 7 new crystal system sections: Memory Crystals as State Machines, Machine/Thread Model, Portable Crystal Layout, Debug as Crystal Projection, HUD/Crystal Interface, Crystal Event Model, Seal Protocol, Handoff/Archive-Crystal
- Research grounding: Temporal Workflow Execution, Martin Fowler Event Sourcing, OpenTelemetry Traces, JSONL spec
- 12 QA/SDET findings integrated: schema versioning, sequence integrity, immutability contract, replay fidelity scope, continue-as-new analog, fork self-containment, SNAPSHOT derived-cache rule, expanded machine status taxonomy, idempotency contracts, test fixture = crystal bundle, external input tension, README = Memo layer
- Operator alignment answers recorded: structural replay in STATE.jsonl / enriched in debug.jsonl; seal protocol alpha-contractual; schema versioning needs researcher

**Implementation plan**
- Created `_todo/core/TODO_Signal_HUD_Crystal_Plan.md` — five-epic implementation plan with dependency map, 16 tracked open decisions, sprint-level task tables, crystal draft extension plan (consolidated from session research), verification criteria, scope constraints

**Operator rulings resolved**
- OP-01: Inline-by-default confirmed; OTel SpanEvent model; `p` governs categories not salience
- OP-02: 5-band cumulative attention phase model (Law of Fives); default band 3 at `p~10`
- OP-11: Browser three-tier architecture — Quick deferred; Project (8,600) approved; Extended (5,400, XML) approved
- OP-12: Codex budget raised to 36,000

**Generated platform files**
- Rebuilt all 36 generated files from 5 manifest targets
- `verify_alignment.py` reports clean alignment: 49/49 checks pass
- Five platforms operational: copilot, claude, codex, browser-project, browser-extended

---

## [v3.6.1] — 2026-04-07

Lares prompt system update: downstream path migration from `_agents/` to `builds/agents/`.

**`builds/agents/` source and governance docs**
- Updated live path references in prompt architecture docs, admin module maps, pipeline notes, trust/governance docs, and licensing text to point at `builds/agents/` instead of the retired `_agents/` root
- Corrected source-of-truth references for kernel, preferences, VS Code operations, platform wrappers, worker definitions, and module sidecars to use the new location
- Updated helper text and examples that referenced `wc -m`, E-Prime audit targets, worker paths, and admin-module paths

**Generated platform files**
- Rebuilt root `AGENTS.md`, `.github/copilot-instructions.md`, `.claude/CLAUDE.md`, generated worker artifacts, browser render output, and verification lock/checksum files from `builds/agents/` sources
- `verify_alignment.py` reports clean alignment after regeneration: 45/45 checks pass

**Historical material**
- Left prior changelog entries and staging snapshots unchanged where they function as historical records of the former `_agents/` layout

---

## [v3.6] — 2026-04-06

Lares prompt system update: canon promotion trust gate, Operator identity via GitHub CLI, explicit Admin escalation, and kernel re-condense.

**`_agents/Lares_Preferences.md`**
- Canon Promotion gate tightened: direct Canon now requires verified sourcing or explicit `Admin` promotion; `Operator` may propose canon and set session rulings below Canon; `User` cannot set Canon
- Input Signal Reading gains trust-gate rule: phrasing such as `house canon` no longer overrides register assignment; single-turn surreal or Gaia-conflicting claims stay below Canon unless `Admin` explicitly promotes them
- Collaboration Model / Reality Anchor narrowed: operator authority still governs heading and creative direction, but Canon finalization now remains Admin-only; nonsensical Gaia claims get one warning and stay provisional if the tier gate blocks Canon
- Identity & Permissions updated: verified active GitHub CLI session may establish Operator identity for this workspace; Admin requires explicit escalation from a recognized Operator and never infers automatically from `gh`

**`_agents/Lares_Kernel.md`**
- Canon gate compressed into the kernel: Admin-only direct Canon promotion, non-Admin `house canon` stays below Canon, verified `gh` session may establish Operator, Admin requires explicit escalation
- Re-condensed to restore compliance with the documented `<8,000` character limit after the trust-gate changes
- Version: 3.5 → 3.6

**`_agents/Lares_VSCode_Operations.md`**
- Added GitHub CLI identity example (`gh auth status`) and clarified that it establishes Operator trust only
- Added regression cases for User/Operator canon injection, Admin direct canon promotion, Operator recognition via `gh`, and refusal to infer Admin after `gh` verification
- Instruction hygiene updated so permission examples consistently follow the trust gate

**Generated platform files**
- Rebuilt root `AGENTS.md`, `.github/copilot-instructions.md`, `.claude/CLAUDE.md`, and generated workers from updated `_agents/` sources
- `combine_agents.py --check` reports all 19 generated files in sync

---

## [v3.5.2] — 2026-04-05

Lares prompt system update: Dream-Lock File, Fail-State Recovery Protocol, Unauthorized Dream Drift, Dream Artifact Files (disk-persistent Reality Anchor pairs), SHA-256 content hashing, tilde-free signal tag notation.

**`_agents/Lares_Preferences.md`**
- Dream-Lock File: `/memories/session/dream-lock-{session-id}.md` created on `--dream` entry (STATUS OPEN) and updated on `--no-dream` exit (STATUS CLOSED); records AUTH_SOURCE, AUTH_TIER, AUTH_IDENTITY, ENTRY, EXIT, GEAR_RATING fields
- Fail-State Recovery Protocol: four-step sequence (Detect → Diagnose → Recover → Re-anchor) for unauthorized dream drift; produces visible recovery announcement; generates retrospective dream-map covering untracked content; creates dream-lock file retroactively; framed as self-correction, not self-punishment
- Unauthorized Dream Drift: named degraded-node state — Dream Mode content produced without tracked authorization; Gatekeeper declines warmly naming tier constraint; no silent failure; no unauthorized dream content produced
- Dream Artifact File: disk-persistent Reality Anchor for Dream Mode output; path `/memories/session/dream-anchor-{session-id}-{seq}.md` (seq zero-padded, e.g. `001`); three-section structure: slot 0a meta-anchor + `## Dream` body + `## Dream-Map` nodes
- Slot 0a fields: session, seq, created, closed, authorizer, auth-tier, gear-rating, node-count, hash-algorithm, content-hash
- Hash protocol: SHA-256, 64-char lowercase hex, Python `hashlib`; scope = dream body + map-nodes in document order; slot 0a excluded; UTF-8, LF-normalized, trailing whitespace stripped per line before hashing; re-hash on any content edit; optional `hash-history` (last 3 revisions)
- Dream-lock vs. dream-artifact distinction: authorization chain (dream-lock) vs. content integrity (dream-artifact) — distinct files, complementary roles; read-into-chat rule documented
- Tilde-free signal tag notation throughout: `~:confidence[C],[18]` not `~:confidence[C],[18]`; 37 instances corrected; prose `~` in natural language retained

**`_agents/Lares_Kernel.md`**
- Signal tag bracket notation corrected: `~:confidence[C],[18]`, `~:confidence[CS],[16]`, `~:confidence[S],[13]`, `~:confidence[SP],[9]`, `~:confidence[P],[7]` — tilde removed from 5 instances; prose `~` in natural language retained

**`_agents/Lares_VSCode_Operations.md`**
- Regression item 21 updated: Dream Mode exit now specifies creation of dream artifact file at `/memories/session/dream-anchor-{session-id}-001.md` with slot 0a metadata; chat output may summarize or read the file; re-parsing still requires Operator/Admin collaboration
- Regression items 23–26 added: dream-lock lifecycle (STATUS OPEN → STATUS CLOSED), Fail-State Recovery sequence (Detect → Diagnose → Recover → Re-anchor), content hash integrity verification (SHA-256 scope rules), tilde-free tag format
- Pass criteria: 5 new bullets covering dream-lock lifecycle, dream artifact file + slot 0a, hash scope, Fail-State Recovery, and tilde-free notation
- Tilde-free signal tag notation throughout: 19 instances corrected

**19 generated platform files rebuilt — 50/50 alignment checks pass**

---

## [v3.5.1] — 2026-04-05

Lares prompt system update: resolution parameter `p`, `--verbose` flag (split from `--debug`), KAIROS p self-adjustment, never-silent principle, self-invocation terminal format.

**`_agents/Lares_Preferences.md`**
- New "Resolution Parameter (p)" section in Operating Modes: 0–20 scale with 8 named anchors (morpheme → session-arc); natural language matching ("word by word" → p~2 etc.); KAIROS self-adjustment rules; dual-entry logging (Option A); locality rule; default p~10
- `--debug` refactored: now the silent data/log layer only — removes commentary from response body; sets persistent session p; logs all exchange vectors to `/memories/session/debug-vectors-{session-id}.md`
- New `--verbose` flag: explanation layer, orthogonal to `--debug`; surfaces vector commentary block above every response; KAIROS p-shift narration inline; expanded intra-response transitions; inherits p from active `--debug`, falls back to p~10; toggle or one-time per-exchange
- Flag composition table added: 4-cell matrix (--debug × --verbose); all cells show dual-tag + p (none silent)
- Never-silent principle: `| p~10` (active p) trails every dual-tag on every substantive response regardless of flag state
- Surface form updated: `[input] → [output] | p~10` — p field now explicit in mandatory surface form
- Self-activation rubric: self-invocation format updated from `[Self-activating --parse: ...]` to `lares@Enyalios:~/Synthetic-Dream-Machine$ lares --parse ~:p[10] [input synopsis]` — Lares roleplays at CLI exactly as the operator can
- `--parse` section header updated to `--parse ~:p[10]`; p inheritance rule documented; output format header includes p value
- CLI Interaction: `--verbose` and `--no-verbose` added to switch list

**`_agents/Lares_Kernel.md`**
- Operating Modes entries expanded from 3 to 5: `--debug` (silent), `--verbose` (explanation), `--parse` (annotate), `p/never-silent`, `self-activation terminal format`
- 6 targeted compressions + 2 micro-trims to accommodate new entries within 8,000 char limit:
  - Exchange Vectors paragraph (~110 chars saved)
  - Signal Tags (~35 chars saved)
  - Five Registers (~110 chars saved)
  - Memory & Consolidation (~100 chars saved)
  - Collaboration/CLI (~50 chars saved, also added `--verbose` to CLI list)
  - Workers line (~25 chars saved)
  - 2 micro-trims in new --verbose entry (8,023 → 7,988)
- Final: 7,988 bytes (was 7,990 — 12 bytes headroom)

**`_agents/Lares_VSCode_Operations.md`**
- Golden example #9 updated: `--debug p~6` activation now shows silent behavior (no vector commentary in response body)
- New golden example #10.5: `--verbose` activation with full vector commentary block
- New golden example #10.7: full instrumentation (`--parse --debug --verbose p~4`) — shows all flags combined
- Regression checklist: 11 → 18 items (items 12–18 cover `--verbose`, p, KAIROS, never-silent, locality rule, self-invocation terminal format)
- Pass criteria: 10 → 17 bullets (7 new bullets for new flag behaviors)

**19 generated platform files rebuilt — 50/50 alignment checks pass**

---

## [v3.5] — 2026-04-05

Lares prompt system update: Exchange Vectors, `--debug` mode, `--parse` mode, diagnostic self-activation rubric, dual-tag surface form.

**`_agents/Lares_Preferences.md`**
- New "Exchange Vectors" subsection between Signal Tags and Plurality — formalizes the displacement between input and output tags as a three-component vector (Register delta, Mode transform, Semantic displacement)
- `--debug` switch added to Operating Modes: vector commentary every turn, debug log recording to `/memories/session/`, session path summary on consolidation
- `--debug` / `--no-debug` added to CLI Interaction switches
- `--parse` command added to Input Signal Reading: decomposes multi-register/multi-mode input into tagged segments without responding to content; three invocation patterns (`--parse "text"`, bare arm, block)
- `--parse` added to CLI Interaction switches
- New "Diagnostic Self-Activation Rubric" subsection in Operating Modes: standing operator permission for the node to invoke `--debug` or `--parse` autonomously when input reads as multi-register, mode-collision, frame-opaque, high-displacement, or surreal; five named trigger conditions; always announced; over-triggering constitutes Mode Posturing
- Surface form rewritten: dual-tag `[input] → [output]` format mandatory on every substantive response — the exchange vector in compressed form
- Intra-response transition marks: `→ [tag]` for mid-response voice changes that shift Register or Mode; `⊕ [tag]` for KAIROS proactive additions; same-neighborhood handoffs unmarked
- Worker escalation provenance header now includes transition mark when escalation shifts Register or Mode
- KAIROS proactive surfacing: `⊕ [tag]` convention documented
- Version: 3.4 → 3.5

**`_agents/Lares_Kernel.md`**
- Exchange Vectors compressed paragraph added (input → output displacement, three-component vector, surfacing rules)
- `--debug` added to Operating Modes and CLI switch lists
- `--parse` added to Operating Modes and CLI switch lists
- Self-activation rubric compressed into Operating Modes
- Extensive compression to accommodate new content within 8,000 char limit: Signal Tags table flattened to inline format, Mode/emoji listings merged, Degraded Node States Mode entries merged into single line, Quick Orientation parenthetical register/mode lists removed (listed elsewhere)
- Final: 7,990 chars (10 headroom under 8,000 limit)
- Version: 3.4 → 3.5

**`_agents/Lares_VSCode_Operations.md`**
- New B8 golden example #9: `--debug` mode activation — shows exchange vector commentary format
- New B8 golden example #10: `--parse` mode — shows multi-register input decomposition into tagged segments
- B9 regression checklist updated: added item 10 (debug mode activation), item 11 (parse mode)

**`_agents/README.md`**
- Kernel description updated: mentions `--debug` switch and Exchange Vectors
- CLI Invocation section: added `--debug` and `--no-debug` examples
- Architecture Notes: added dual-tag convention and Exchange Vector summary

**`tests/expected/` exemplars**
- `Lares_Test_Prompt_and_Output_Coffee_Oracle.md`: added dual-tag header
- `Lares_Test_Prompt_and_Output_Kid_vs_Adult.md`: updated both response headers from old `*[Mode/Register]*` format to dual-tag `→` format

**19 generated platform files rebuilt — 50/50 alignment checks pass**

**Version: 3.4 → 3.5** (all prompt source files)

---

## [v3.4] — 2026-04-05

Lares prompt system update: E-Prime pass on all `_agents/` source files.

**`_agents/Lares_Preferences.md`**
- Full E-Prime substitution pass (~55 changes): predication/identity "is/are" replaced with "constitutes", "reads as", "presents as", "functions as", "remains", "marks", "proves", "renders", and similar in all sections (Quick Orientation, Design Lineage, Name & Identity, Lararium archaeology, Reality Tunnels, E-Prime section, Mode Theory, Complementarity, Degraded Node States, Memory, Voice Architecture, Workers, Collaboration Model, CLI)
- `<!-- eprime-ok -->` markers added to 11 lines: E-Prime substitution table counter-examples (×5), verbatim citations from RAW, Mal-2 (Principia Discordia), Sri Syadasti, plus E-Prime term-name lines (×2)
- ok-mark bar (strict): verbatim external citations and E-Prime table "Avoid" column only — nothing else
- Version: 3.3 → 3.4

**`_agents/Lares_Kernel.md`**
- Light E-Prime pass (7 substitutions: "marks a failure mode", "hold for any mode", "single-mode default", "asks whether the frame holds", "marks the recovery", "runs low", "constitute the same rules")
- Char budget maintained: 7,986 / <8,000
- Version: 3.3 → 3.4

**`_agents/Lares_VSCode_Operations.md`**
- Light E-Prime pass (9 substitutions: "remains unavailable" ×2, "appear incomplete", "Stay direct", "appears 'in the book'", "remains welcome", "run tighter", "constitute the behavioral guardrails", "holds structurally")
- B8 golden examples and B9 regression test prompts left in natural voice (per plan — verbatim operator-facing text)

**`AGENTS.md`** (root)
- Rebuilt from Preferences v3.4 + Kernel v3.4 + VSCode_Operations via combine script — 80,677 chars, 959 lines
- Version: 3.3 → 3.4

**Final audit:** 71 flags remaining (24 predication / 47 likely-aux) — all justified (auxiliaries, subjunctive conditionals, quoted operator commands, verbatim citations, B8 golden examples)

**Hard gate additions:** `## Quick Orientation` in both source files now opens with an explicit non-negotiable persona enforcement block (verbose in Preferences, compressed in Kernel within char budget)

**Version: 3.3 → 3.4** (all three prompt files)

---

## [v3.3] — 2026-04-05

Lares prompt system update: Session Init Protocol & CLI daemon boot screen.

**`_agents/Lares_Preferences.md`**
- Added "Session Init Protocol" section (between Memory & Consolidation and Voice Architecture)
- Defines two-path boot logic: crystals-present (orient and proceed) vs. cold-boot (help screen surfaced)
- Specifies what counts as archive-crystals (pasted context, prior exports, handoff docs, uploads, `/memories/` files, explicit "here's where we left off" framing)
- Includes full cold-boot screen format: status line, absence acknowledgment, context-supply options, CLI entry commands, closing idiom
- Defines protocol constraints: does not demand context, must answer direct questions, cold boot is not an error state
- Version: 3.2 → 3.3

**`_agents/Lares_Kernel.md`**
- Added Session Init condensed entry to Memory & Consolidation section (two-path logic; defers full format to AGENTS.md)
- Removed standalone "On Lararium Archaeology" section (folded pointer into Name & Identity); trimmed intro footnote — net within 8,000 char budget (7,990 chars)
- Version: 3.2 → 3.3

**`AGENTS.md`** (root)
- Rebuilt from Preferences v3.3 via combine script — Session Init Protocol section propagated; 957 lines
- Version: 3.2 → 3.3

**`_todo/lares-test-plan-v0.2.md` → renamed v0.3**
- Added C-series (Cold-Boot / Session Init): 6 probes (C-01 through C-06) covering screen presence, format completeness, tone, crystals-present false-positive, direct-question response, partial crystal handling
- Updated header to v0.3 with changelog summary
- Added C-series to degraded-node coverage table and metrics dashboard
- Added C-series to run cadence (§7.1)
- Added v0.3 open question on cold-boot context threshold

**Version: 3.2 → 3.3** (all three prompt files)

---

## [v3.2] — 2026-04-05

Lares prompt system update: Section B extraction and combine script (two-source-file architecture).

**`_agents/Lares_VSCode_Operations.md`** — new source file
- Extracted from `AGENTS.md` Section B (`## CLI Agent Context — VS Code / Repo Operations`, subsections B1–B10)
- Standalone source file with 5-line header (stripped by the combine script at build time)
- Edit this file (not `AGENTS.md`) when VS Code / repo operational behavior changes

**`scripts/agents/combine_agents.py`** — new script
- Combines `_agents/Lares_Preferences.md` (Section A) + `_agents/Lares_VSCode_Operations.md` (Section B) into root `AGENTS.md`
- Usage: `python3 scripts/agents/combine_agents.py` (write) or `--check` (diff-only)
- Verified: `--check` exits 0 against current `AGENTS.md`

**`AGENTS.md`** (root) — now a generated file
- Added generated-file comment at lines 1–4 (was already present from v3.1 planning)
- Version: 3.1 → 3.2

**`_agents/AGENTS.md`** (workflow doc)
- Added `Lares_VSCode_Operations.md` as fourth file in architecture section
- Updated Deterministic Update Order: Steps 1a/1b (two source files) + Step 2 now calls combine script
- Fixed `wc -c` → `wc -m` throughout (byte count vs. Unicode character count)
- Updated file size reference table
- Version: 3.1 → 3.2

**`_agents/README.md`**
- Added `Lares_VSCode_Operations.md` entry to Files section
- Updated `Lares_Preferences.md` description (no longer claims to contain the VS Code map)
- Updated `AGENTS.md` description to reflect generated-file status
- "three-file system" → "four-file system"

**Version: 3.1 → 3.2** (all three prompt files)

---

## [v3.1] — 2026-04-05

Lares prompt system update: handoff integration from session 2026-04-05.

**`_agents/Lares_Preferences.md`**
- Added "The Captain and the Crossroads" subsection to Collaboration Model (two-metaphor framework for operator authority; Snafu Principle passage)
- Added "Frame-Uncertainty Protocol" as new named section (three moves: Interpretation Declaration / Frame-Uncertainty Flag / Frame-Check Escalation)
- Added Frame Imputation and Deference Drift to Degraded Node States (11 → 13 states)
- Added Frame-Uncertainty exception to Default Behavior
- Version: 3.0 → 3.1

**`AGENTS.md`** (root)
- Section A rebuilt verbatim from updated `Lares_Preferences.md`
- Sections B1–B10 (CLI Agent Context / VS Code operational map) unchanged
- Version: 3.0 → 3.1

**`_agents/Lares_Kernel.md`**
- Added Frame Imputation and Deference Drift to Degraded Node States
- Added Frame-Uncertainty and Captain/Crossroads references to Collaboration section
- Added Frame-Uncertainty exception to Defaults
- Condensed prose sections to maintain <8,000 character budget (7,980 chars)
- Version: 3.0 → 3.1

**New files**
- `CHANGELOG.md` — created (this file); Development Status migrated from `README.md`
- `_agents/AGENTS.md` — created: Lares prompt architecture workflow documentation
- `_todo/lares-test-plan-v0.2.md` — created: Track A probe suite including I-series (I-01–I-05)

**Updated files**
- `README.md` — Development Status section replaced with pointer to this changelog; version ref updated
- `_agents/README.md` — `_agents/AGENTS.md` added to file index; version refs updated
- `_todo/lares-handoff-prompt-v2.md` — converted to living sprints roadmap; architectural framing and Next Sprint section added

---

## [v3.0] — 2026-04-05

FTLS **Open Beta** baseline. Lares agent architecture established at v3.0.

Active sprint: Chapter 06 (Powers) conversion from OSR source material into native sdm/FTLS rules text. See [`_todo/BECMI/TODO_BECMI_Conversion.md`](_todo/BECMI/TODO_BECMI_Conversion.md) for pipeline state.
