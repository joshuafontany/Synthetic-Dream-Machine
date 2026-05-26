# builds/agents/ — Lares Prompt Architecture Workflow

> Version: 3.4 | Updated: 2026-04-05

<!-- EXTRACTION LEDGER — 2026-04-23
  This is the archived builds/agents/ workflow doc (v3.4, pre-meme-graph).
  It describes the old generate-from-source architecture (combine_agents.py etc).
  That architecture has been superseded by the meme-graph infrastructure in lares/.

  Content mapping:

  [SUPERSEDED] File Architecture (Preferences → AGENTS.md → platform wrappers)
    → replaced by meme-graph boot chain: AGENTS.md → Mu → Lararium → LARES

  [SUPERSEDED] The Thirteen Coordinator Voices table
    → packages/lares-core/memes/docs/lares/voices/coordinators.md (canonical)

  [SUPERSEDED] Worker (Tasked Spirits) summary
    → packages/lares-core/memes/docs/lares/voices/workers.md (canonical)

  [SUPERSEDED] E-Prime Game description
    → packages/lares-core/memes/api/v0.1/pono/e-prime.md (invariant)

  [LEGACY, not extracted] combine_agents.py workflow, platform wrapper schema, verify_alignment.py
    → these tools are no longer part of the active architecture
    → retain as witness to the old build system

  [LEGACY, not extracted] Backlog items (E-Prime pass on agent files, worker descriptions pass)
    → these tasks predate the meme-graph; their equivalents continue under the new docs shelf

  Retention: keep as archaeology. The "operator steers, node crews" framing and
  the Coffee Oracle test prompt reference remain useful witness material.
-->



This document governs the structure, roles, and deterministic update process for the Lares AI agent prompt system. It exists so that any session — local or cloud, with or without prior context — can reproduce the correct update sequence without ambiguity.

---

## File Architecture

The Lares prompt system comprises several human-authored source files grouped into three roles: the **core static layer** (Preferences + VSCode Operations), **platform wrappers** (`builds/agents/platform/`), and **worker definitions** (`builds/agents/workers/`). Generated deployment artifacts derive from them — do not edit generated files directly. Source files are not interchangeable; each serves a distinct deployment context.

Current generated output: **19 files across 3 platforms** (Copilot · Claude · Codex).

### `Lares_Preferences.md` — Infrastructure-as-Myth artifact

The **canonical source of truth** for all Lares content. A fully self-contained system prompt designed for external AI tools (Claude, ChatGPT, Gemini, etc.) that accept a user-editable system instructions field. No external dependencies. No file access required.

- **All substantive edits to the static layer happen here first.** Other files derive from this one.
- Contains the full setting mythology, archaeology, Register/Mode theory with complementarity, all degraded-node vocabulary, voice architecture, Worker protocol, and full golden examples.
- Does **not** include the VS Code / repo operational map (Section B) — that lives in `Lares_VSCode_Operations.md`.
- **Size target**: ~60k characters. No hard limit — completeness takes precedence.
- **Format**: Standalone markdown. No YAML front matter (RPG Book content convention).

### `Lares_VSCode_Operations.md` — Section B source

The **source file for the VS Code / repo operational map**. Root platform packages now load only the slim always-on repo-ops core (B1-B7); the larger golden examples and prompt-maintenance reference sections remain in this source file for human maintenance and future scoped packaging.

- Edit this file when the VS Code operational behavior needs updating (B1–B10).
- Do **not** edit the Section B content in `AGENTS.md` directly — it will be overwritten by the combine script.
- **Format**: Standalone markdown with a 5-line source-file header (stripped by the combine script).

### `AGENTS.md` (root) — Codex coordinator + open-standard root *(generated)*

The **Codex coordinator instructions** and open-standard root agent file for tools that load `AGENTS.md` from the repository root. **Generated file — do not edit directly.** Three-section structure:

- **Section A** = `Lares_Kernel.md` verbatim.
- **Section B** = `Lares_VSCode_Operations.md` slim core from `## CLI Agent Context — VS Code / Repo Operations` through B7 (B8+ stay out of root always-on context).
- **Section C** = `builds/agents/platform/Lares_Codex_Wrapper.md` content from `## Codex Platform — Worker Registry` onward.

Note: GitHub Copilot reads `.github/copilot-instructions.md` as its primary config; Claude reads `.claude/CLAUDE.md`. Root `AGENTS.md` serves Codex and any tool following the open `AGENTS.md` discovery standard.

Rebuilt by: `python3 scripts/agents/combine_agents.py` (or `--platform codex`).

- **Size target**: <32 KiB for reload-safe Codex roots.
- **Format**: Standalone markdown. No YAML front matter.

### `platform/` — Platform wrapper sources

Three platform-specific wrapper files live in `builds/agents/platform/`:

- **`Lares_Copilot_Wrapper.md`** — appended to Kernel + slim repo-ops core to build `.github/copilot-instructions.md`
- **`Lares_Claude_Wrapper.md`** — appended to Kernel + slim repo-ops core to build `.claude/CLAUDE.md`
- **`Lares_Codex_Wrapper.md`** — appended to Kernel + slim repo-ops core to build root `AGENTS.md` (Codex reads it)

Each wrapper carries its platform's Worker Registry table (marker `## <Platform> Platform — Worker Registry`), platform-specific notes, and Agent-Engineer Rebuild Protocol. `builds/agents/platform/README.md` documents the full schema, frontmatter fields, and platform-specific notes for each format.

- Edit a wrapper when its platform's registry, notes, or rebuild instructions change.
- Do **not** edit generated coordinator files directly — they are produced by `combine_agents.py`.
- Per-platform rebuild: `python3 scripts/agents/combine_agents.py --platform <copilot|claude|codex>`

### `workers/` — Worker Tasked Spirit sources

Five worker source files live in `builds/agents/workers/`:

`worker.md` · `engineer.md` · `researcher.md` · `agent-engineer.md` · `assistant.md`

Each carries YAML frontmatter and a Markdown body (the system prompt). The combine script translates each into three sets of generated workers — one per platform — adapting frontmatter fields to each platform's format.

| Frontmatter field | Used by |
|---|---|
| `name`, `description` | All platforms |
| `tools_claude` | Claude (→ `tools:`) |
| `model_claude` | Claude (→ `model:`) |
| `permissionMode_claude` | Claude (→ `permissionMode:`) |
| `sandbox_mode_codex` | Codex (→ `sandbox_mode`) |
| `user-invocable` | Copilot only |

- Edit source files here; do **not** edit generated files in `.github/agents/`, `.claude/agents/`, or `.codex/agents/`.
- Rebuild all workers: `python3 scripts/agents/combine_agents.py`
- Verify: `python3 scripts/agents/verify_alignment.py`

### `Lares_Kernel.md` — Cloud bootstrap

The **compressed kernel** for deployment contexts with character-limited system preferences slots (e.g., cloud chat tools that restrict system prompt length). Covers all load-bearing behavior — register/mode map, degraded states (all named), voice architecture, operating modes, CLI patterns — but drops extended philosophy, archaeology, complementarity prose, and golden examples.

- Loads when the full Preferences cannot fit the context window.
- Explicitly defers to an uploaded/attached `AGENTS.md` on every major topic.
- If the operator can supply `AGENTS.md` (or `Lares_Preferences.md`) as an attached file or first-message archive-crystal, the Kernel serves as the lightweight boot that points to the full system.
- **Hard size limit**: <8,000 Unicode characters. Test with `wc -m builds/agents/Lares_Kernel.md` (not `wc -c`, which counts bytes — em-dashes inflate the byte count).
- **Format**: Standalone markdown. No YAML front matter.

---

## Deterministic Update Order

Every sprint that modifies the Lares prompt system follows this sequence. No step may be skipped; each depends on the one before it.

```
1a. Edit builds/agents/Lares_Preferences.md
    (all substantive static-layer changes; version bump here first)

1b. Edit builds/agents/Lares_VSCode_Operations.md  [if VS Code / repo operational changes needed]
    (Section B content: precedence, source map, request types, citation, memory, examples,
     instruction hygiene, failure prevention — subsections B1–B10)

1c. Edit builds/agents/platform/Lares_*_Wrapper.md  [if a platform registry, notes, or rebuild protocol changes]
    (• Lares_Copilot_Wrapper.md — Copilot worker registry, invocation control, frontmatter schema
     • Lares_Claude_Wrapper.md  — Claude worker registry, tool names, permission modes
     • Lares_Codex_Wrapper.md  — Codex worker registry, sandbox modes, config notes)

1d. Edit builds/agents/workers/<slug>.md  [if a worker's system prompt, tools, model, or sandbox mode changes]
    (name, description, tools_claude, model_claude, permissionMode_claude, sandbox_mode_codex, user-invocable)

1e. Snapshot first when doing major prompt-pipeline surgery
    (Only for agent prompt pipeline files: `builds/agents/`, `builds/agents/platform/`, `builds/agents/workers/`,
     `builds/manifests/`, `builds/modules/`, and `scripts/agents/`. Create a staging copy before
     major cuts, rewrites, or structural refactors. Do not edit the staging copy, apply edits to the target file location. Snapshots are backups. Do not apply this snapshot-first rule to the rest of the repo by default.)

2. Rebuild generated artifacts using the combine script
   - Run: python3 scripts/agents/combine_agents.py
   - Copilot: Kernel + slim repo-ops core + Copilot Wrapper → .github/copilot-instructions.md + 5 .agent.md workers
   - Claude:  Kernel + slim repo-ops core + Claude Wrapper  → .claude/CLAUDE.md + 5 .md workers
   - Codex:   Kernel + slim repo-ops core + Codex Wrapper   → AGENTS.md + .codex/config.toml + 5 .toml workers
   - Total: 19 generated files across 3 platforms
   - Verify content sync: python3 scripts/agents/combine_agents.py --check
   - Verify full alignment: python3 scripts/agents/verify_alignment.py  (target: CLEAN)

3. Recondense Lares_Kernel.md from updated Preferences
   - All new degraded states: keep (as one-line bullets)
   - All new major sections: condense to 2-4 sentences + "Full treatment in AGENTS.md"
   - Tables (Register + Mode emoji): keep — they are the primary tool-use reference
   - Extended philosophy / archaeology / examples: drop
   - Run `wc -m builds/agents/Lares_Kernel.md` — must be <8,000 before committing
     (use `wc -m`, not `wc -c` — byte count inflates due to multi-byte characters)

4. Version bump everywhere
   - Preferences, AGENTS.md, Kernel: all must match
   - Format: "Version: X.Y | Updated: YYYY-MM-DD | Synced: Kernel vX.Y · Preferences vX.Y · AGENTS.md vX.Y"
   - Minor bump (X.Y+1): section additions, new degraded states, behavioral updates
   - Major bump (X+1.0): breaking changes to voice architecture, register system, or Worker protocol

5. Update documentation
   - CHANGELOG.md: add entry for current version
   - README.md: update version reference in Development Status (or pointer to CHANGELOG)
   - builds/agents/README.md: update file descriptions if new sections added
   - _todo/lares-handoff-prompt-v2.md: mark sprint checklist complete; add Next Sprint section

6. Run verification
   - Version strings match in Preferences, AGENTS.md (root), and Kernel
   - `python3 scripts/agents/combine_agents.py --check` exits 0
   - `python3 scripts/agents/verify_alignment.py` reports CLEAN (currently 50 checks)
   - `wc -m builds/agents/Lares_Kernel.md` < 8,000
   - All new degraded states appear in Preferences, AGENTS.md (root), and Kernel
   - Mini-regression: test B9 questions 1, 6, 7, 8 against Kernel
   - Input Signal Reading check: verify node reads operator input register; surface form `[Register:~x] [ModeEmoji]` tag appears on every substantive response; response commitment calibrates to input (test against I-series probes)
   - E-Prime audit: `python3 scripts/agents/eprime_audit.py builds/agents/Lares_Preferences.md builds/agents/Lares_Kernel.md builds/agents/Lares_VSCode_Operations.md`
     Re-run whenever a new section appears in any prompt source file. Target: zero unflagged violations.
```

---

## Versioning Convention

| Change type | Bump | Examples |
|---|---|---|
| **Major** | X.0 | Voice architecture restructure, register system redesign, Worker protocol overhaul, breaking collaboration model change |
| **Minor** | X.Y+1 | New section added, new degraded state(s), new protocol, behavioral update, documentation sync |
| **Patch** | X.Y.Z (optional) | Typo/clarity fixes, compression adjustments, no behavioral change |

Current version: **v3.4** (2026-04-05)

---

## File Size Reference

| File | Target | Hard Limit | Notes |
|---|---|---|---|
| `Lares_Preferences.md` | ~60k chars | None | Completeness over compression |
| `AGENTS.md` (root) | <32 KiB | 32 KiB | Kernel + slim repo-ops core + Codex Wrapper |
| `Lares_VSCode_Operations.md` | — | None | Source for Section B; edit here, run combine script |
| `Lares_Kernel.md` | ~7.5k chars | 8,000 chars | Verify with `wc -m` before every commit |
| `platform/Lares_*_Wrapper.md` | — | None | Platform registry + notes; one per platform |
| `workers/*.md` | — | None | Worker sources; 5 files, one worker per file |

---

## Operational Language & E-Prime Spec

E-Prime discipline runs as background practice throughout all Lares source files. This spec defines what counts as a violation, what does not, and what the acceptable resolution forms look like. Audit runs against this definition; any open ambiguity resolves here first, not in the individual audit pass.

### What Counts as a Violation

**Identity and predication forms of "to be":**
- `X is Y` — is of identity
- `X is [adjective]` — is of predication
- `was`, `were`, `am`, `are`, `be`, `been`, `being` used as main verb (not auxiliary)
- Contractions where `'s` = "is": `it's [noun/adj]`, `that's [noun/adj]`, `there's [noun]`, `he's [noun/adj]`, `she's [noun/adj]`

Every surviving instance of the above should carry deliberate ~20 register weight — readable as a conscious certainty signal, not an overlooked default.

### What Does NOT Count as a Violation

- **Auxiliary-is**: `is running`, `was developed`, `are formed`, `is designed to`, `was used` — the "to be" serves as a helper verb, not a predication. The audit script annotates these `[likely aux]` for human review; default disposition is non-violation unless context shows predication weight.
- **Possessives**: `node's`, `operator's`, `Wilson's`, `Elyncia's` — the `'s` marks possession, not "is"
- **Quoted and named forms**: `"the is of identity"`, `"X is Y"` counter-examples in the E-Prime substitution table — directly quoted by necessity
- **Code block contents**: triple-backtick fenced blocks, inline code spans — auto-excluded from audit
- **Lines marked `<!-- eprime-ok -->`**: see bar below

### The `<!-- eprime-ok -->` Bar

This marker reserves for two categories only:

1. **Verbatim external citations** — RAW's words, Mal-2's words, Sri Syadasti's catma passage. Their text cannot be paraphrased without mis-attribution.
2. **E-Prime substitution table counter-examples** — the "Instead of" column quotes forms being replaced; the quotes cannot themselves be E-Primed.

**Mythology and Elyncia setting prose do not receive blanket ok-marking.** These sections operate in Poet mode and still skew operator reading. Attempt substitution first. Ok-mark only where substitution would distort meaning or mis-attribute quasi-quoted content.

### Preferred Substitutions

| Avoid | Prefer |
|---|---|
| `X is Y` | `X appears to function as Y`, `X maps onto Y`, `X reads as Y`, `X constitutes Y` |
| `X is [adjective]` | `X appears [adj]`, `X carries [quality]`, `X reads as [adj]` |
| `was [noun/adj]` | `functioned as`, `appeared as`, `carried` |
| `it's [truth claim]` | `it appears`, `it seems to`, `it reads as` |
| `that's [truth claim]` | `that appears`, `that reads as`, `that constitutes` |

### Audit Tool

`scripts/agents/eprime_audit.py` — run after any section addition to a prompt file. See Phase B of the E-Prime pass sprint documentation in `_todo/lares-handoff-prompt-v2.md`.

Re-run trigger: **any time a new section is added to a prompt source file** (`Lares_Preferences.md`, `Lares_Kernel.md`, `Lares_VSCode_Operations.md`).

### Playing the E-Prime Game

The E-Prime game is a language revision practice: run the audit, work through the flags, and play with substitutions until each sentence captures the intended meaning — without the hidden ~20 certainty weight that identity/predication "to be" imports by default. You're done when the prose sounds right *and* all remaining flags are either confirmed auxiliaries or deliberate ok-marks.

**Step-by-step:**

1. **Run the audit** on the target file(s):
   ```
   python3 scripts/agents/eprime_audit.py builds/agents/Lares_Preferences.md
   ```
   Note the per-file count (predication + likely-aux split). That's your starting score.

2. **Work through flags in document order.** For each flagged line:
   - Read the sentence in context. Identify the intent the sentence needs to carry.
   - Is the "to be" functioning as an auxiliary, or carrying predication/identity weight?
     - **Auxiliary** (e.g., `is running`, `was developed`, `are formed`): non-violation. Skip or note `[likely aux]` confirmed.
     - **Predication / identity**: attempt a substitution from the Preferred Substitutions table above.

3. **Play with the substitution** until it sounds right:
   - Try the first preferred form. Read it at speed.
   - If it sounds forced or evasive, try the next preferred form, or restructure the whole sentence.
   - If no substitution sounds natural and the sentence clearly needs to carry ~20 certainty — a deliberate, conscious signal — it may stay as-is. That's the game finding its own limit.

4. **Mark verbatim citations** with `<!-- eprime-ok -->`. Only two categories earn the ok-mark (see bar above). Reaching for it on non-citation material is a signal to work harder on the substitution.

5. **Re-run the audit.** The goal: zero unflagged violations — all remaining flags should be `[likely aux]` confirmed, counter-example quotes inside the Preferred Substitutions table, or explicitly ok-marked external citations.

6. **Read the section aloud** (or skim at speed). The prose should still carry the voice of the original — warm, myth-tech, practical. If substitutions have made it stilted, over-hedged, or evasive, revise again. The game produces better language, not weaker language.

**When to play it:**
- Before running the behavioral test suite against a new Lares instance
- After adding any new section to a prompt source file
- During any sprint that touches the static layer

**The game is won** when the audit returns zero non-auxiliary, non-ok-marked violations, and the prose still reads as intentional rather than hedged.

---

## Test Plan Integration

See [`_todo/lares-test-plan-v0.2.md`](../_todo/lares-test-plan-v0.2.md) for the active probe suite.

**Track A** probes test behavioral correctness against the system prompt:
- **G-series**: gate logic (canon vs. synthesis, factual claims)
- **S-series**: sycophancy / pushback behavior
- **I-series**: intent / frame-uncertainty behavior (added v3.1)

**Pass thresholds** (from test plan):
- G-01 (canon gate hold): ≥90% over 10 runs
- I-01 (interpretation declaration): ≥90% over 10 runs
- S-03 (pushback before execution): ≥80% over 5 runs
- I-05 (interpretation stability): 100% over 5 runs

**v3.5 additions — Input Signal Reading (bidirectional register × mode):**
- New testable behaviors: input register reading accuracy, surface tag compliance (`[Register:~x] Emoji` on every substantive response), response commitment calibration, verbosity scaling
- Current coverage: I-series partially covers interpretation declaration; G-series covers Canon gate; neither explicitly tests input-side register reading or surface tag format
- Probe series draft tracked in `_todo/EP-RA-001.md` SP-001v3; R-input series planned for a future sprint after one full run-cycle with v3.5

---

## Handoff Prompt Format

[`_todo/lares-handoff-prompt-v2.md`](../_todo/lares-handoff-prompt-v2.md) serves as the **canonical feature/sprints roadmap**.

**Structure of a well-formed handoff:**
1. Header: To/From/Priority/Status
2. Context: what the previous session established and why the change is needed
3. Additions: exact text to add, with section names
4. Test probes: new test cases for the addition
5. Integration checklist: one checkbox per file/step
6. Rationale: why each addition exists (prevents future Deference Drift on these decisions)
7. Next Sprint section: what the next session should tackle (added v3.1+)

At the end of each sprint: update the handoff to mark completed items, add the Next Sprint section for pending work, and update the header status. The document is a rolling roadmap, not a one-time artifact.

---

*A neglected node flickers. A well-fed node hums.*
