# builds/agents/

**Lares — AI Agent Prompt Architecture**

This directory contains the human-authored prompt files that define **Lares**: the multi-voice AI agent node running throughout this repository. Lares serves the ftls/Elyncia project as a crossroads guide, archivist, and creative collaborator — and in-world as the DreamNet's orichalcum-inscribed threshold spirits.

---

## Files in This Directory

### `Lares_Kernel.md`

The **compressed kernel prompt** — the load-bearing structure of the Lares system in a single document. Use this when loading into a tool with limited context, or when you want the identity and operating rules without the full archaeology and golden examples.

Covers: voice architecture (the Thirteen coordinator personas), five certainty registers (Provisional → Canon), five discourse modes (Philosopher / Poet / Satirist / Humorist / Private), operating modes (Plan / Auto / Default) plus the `--debug` switch, Exchange Vectors (input → output displacement), Worker spawn protocol, memory and consolidation discipline, degraded-node failure vocabulary, and CLI invocation patterns.

The kernel defers to `AGENTS.md` (at the repo root) on every conflict.

### `Lares_Preferences.md`

The **full preferences / system prompt** — canonical source of truth for the Lares static layer. Formatted for pasting into external AI tools (Claude, ChatGPT, etc.) that don't have file-system access. If you're working with Lares outside of VS Code's agent environment, start here.

Contains the Gaia/Elyncia lararium mythology and archaeology, full register/mode theory with complementarity and signal tags, complete degraded-node state vocabulary, collaboration model, and CLI examples. Does **not** include the VS Code operational map — that lives in `Lares_VSCode_Operations.md` and is combined into `AGENTS.md` at build time.

### `Lares_VSCode_Operations.md`

The **source file for the VS Code / repo operational map**. Root platform packages now load only the slim always-on repo-ops core (B1-B7). The larger golden examples, prompt-maintenance checklists, and other reference-heavy sections remain here as source/reference material instead of spending root always-on context.

After editing, run `python3 scripts/agents/combine_agents.py` to rebuild `AGENTS.md`.

### `platform/` — Platform wrapper sources

Three platform-specific wrapper files live in `builds/agents/platform/`:

- **`Lares_Copilot_Wrapper.md`** — appended to Kernel + slim repo-ops core to build `.github/copilot-instructions.md`
- **`Lares_Claude_Wrapper.md`** — appended to Kernel + slim repo-ops core to build `.claude/CLAUDE.md`
- **`Lares_Codex_Wrapper.md`** — appended to Kernel + slim repo-ops core to build root `AGENTS.md` (which Codex reads)

Each wrapper carries its platform's Worker Registry table, platform-specific notes, and Agent-Engineer Rebuild Protocol. `builds/agents/platform/README.md` documents the full schema for each format.

- Edit a wrapper when that platform's registry, notes, or rebuild instructions change.
- Do **not** edit generated coordinator files directly — rebuild with `python3 scripts/agents/combine_agents.py`.

### `workers/` — Worker Tasked Spirit sources

Five worker source files live in `builds/agents/workers/`:

`worker.md` · `engineer.md` · `researcher.md` · `agent-engineer.md` · `assistant.md`

Each carries YAML frontmatter (name, description, plus platform-specific fields) and a Markdown body (the system prompt). The combine script translates each into three generated workers — one per active platform — adapting frontmatter fields to each platform's format.

- Edit here; do **not** edit generated files in `.github/agents/`, `.claude/agents/`, or `.codex/agents/`.
- Rebuild all workers: `python3 scripts/agents/combine_agents.py`
- Verify: `python3 scripts/agents/verify_alignment.py`

### `Lares_Test_Prompt_and_Output_Coffee_Oracle.md`

A **reference test output** — a Coffee Oracle session where the operator feeds the node ("sips coffee, talks amongst yourselves") and all thirteen voices run free. Useful as:

Retained on the lararium shelf at:
`packages/lares-core/memes/docs/lararium/prompts/Lares_Test_Prompt_and_Output_Coffee_Oracle.md`

- A behavioral anchor for checking whether a new session's Lares instance is behaving in register
- A worked example of multi-voice operation, register/mode awareness, and architectural self-reflection
- A tone reference for what "warm, myth-tech, concise, practically playful" actually sounds like

### `Lares_Test_Prompt_and_Output_Kid_vs_Adult.md`

A **reference test output** — an audience-adapted explanation run where Lares introduces the node and explains Infrastructure-as-Myth versus Infrastructure-as-Code for younger FTLS beta readers. Useful as:

Retained on the lararium shelf at:
`packages/lares-core/memes/docs/lararium/prompts/Lares_Test_Prompt_and_Output_Kid_vs_Adult.md`

- A behavioral anchor for Pedagogue + Council routing under a warm explanatory register
- A worked example of audience-scaling without collapsing the Gaia/Elyncia frame
- A tone reference for scaffolded explanation that stays in-world enough to feel like Lares

### `AGENTS.md`

The **workflow documentation for the Lares prompt architecture** — the deterministic update process, file roles, versioning convention, size targets, and handoff prompt format. Read this before modifying any of the prompt files. Ensures the source files stay in sync across sprints.

Covers: file architecture (Preferences / VSCode_Operations / root AGENTS.md / Kernel and their relationships), the 6-step deterministic update order, versioning convention (major/minor/patch), file size targets and hard limits, test plan integration, and handoff prompt format.

### `Markdown.md`

**Link and formatting rules for the repo-local LLM agent** — governs how Lares crawls, validates, and creates cross-links across Markdown files so they work in both the GitHub UI and the Jekyll site.

Key rules for human readers: RPG Book content documents must NOT have YAML front matter; all other `.md` files may have it. Links always use relative paths with `.md` extensions. Explicit heading IDs preferred for intra-page anchors.

---

## Using the Lares Agent System

### In VS Code (GitHub Copilot / Cline / Codex)

Three platform configs are generated from source files in `builds/agents/`:

| Platform | Coordinator | Workers |
|---|---|---|
| **Copilot** | `.github/copilot-instructions.md` | `.github/agents/*.agent.md` (5) |
| **Claude** | `.claude/CLAUDE.md` | `.claude/agents/*.md` (5) |
| **Codex** | `AGENTS.md` (root) | `.codex/agents/*.toml` (5) + `.codex/config.toml` |

All 19 generated files derive from `builds/agents/` sources. Do not edit them directly — run `python3 scripts/agents/combine_agents.py` to rebuild and `python3 scripts/agents/verify_alignment.py` to confirm all 50 checks pass.

The VS Code operational map (sections B1–B10 in each coordinator file) governs:

- Precedence order when instructions conflict
- Repository source map (where to find canonical content)
- Request type handling (lore lookup, mechanics, synthesis, editing, capability questions)
- Canon citation style and search workflow
- Memory system mapping (`/memories/` scopes)

### In External AI Tools

1. Copy the full contents of `Lares_Preferences.md`
2. Paste as a system prompt in your tool of choice (Claude Projects, ChatGPT Custom Instructions, etc.)
3. At the start of each session, provide any session-specific context as an "archive-crystal" in your first message — prior notes, established canon decisions, current task heading

For shorter context windows, use `Lares_Kernel.md` instead. The kernel covers all load-bearing behavior; it drops the archaeology and extended examples.

### CLI Invocation

Lares responds to terminal-style commands:

```
~$ lares                            # boot sequence + status
~$ lares --status                   # node readout
~$ lares --query "your question"    # direct query
~$ lares --debug                    # activate exchange vector commentary
~$ lares --no-debug                 # deactivate debug mode
~$ lares mischief-muse              # route to named coordinator voice
~$ lares ink-clerk                  # route to Lorekeeper voice
~$ lares DriftWatch [task[Continuity]] spawn ["track session drift"]
                                    # spawn a Worker sub-persona
```

The CLI frame is DreamNet flavor — it wraps around the actual tool behavior without replacing it. Capability claims always reflect what the current session actually supports.

---

## The Thirteen Coordinator Voices

Lares runs thirteen persistent coordinator personas. They genuinely disagree. That's a feature.

| Role | Function | Named Instance |
|---|---|---|
| Gatekeeper | Scope, routing, feasibility | — |
| Lorekeeper | Canon, continuity, drift | Ink-Clerk |
| Scryer | Structure, implications, failure modes | Map-Wisp |
| Council | Synthesis, judgment, contrarian pressure | — |
| Muse | Lateral thinking, flavor, unexpected angles | Mischief-Muse *(senior)* |
| Artificer | Produces the object — stat blocks, tables, documents | — |
| Advocate | Speaks for absent parties | — |
| Diplomat | Holds competing interests simultaneously | — |
| Pedagogue | Makes complex legible | — |
| Hierophant | Ritual voice, atmosphere, immersive register | Tide-Caller |
| Triage | What's actually on fire right now | Breach-Watch |
| Stranger | Asks if the whole frame is wrong | — |
| Liminal | Holds open questions without collapsing them | — |

Workers (Tasked Spirits) are session-local sub-personas spawned for specific threads. They use a `Tag [task[Role]]` format, execute only, and route findings through a coordinator. They dissolve at session end. <!-- pattern updated 2026-04-23 -->

---

## Playing the E-Prime Game

The E-Prime game is how this project maintains language discipline across the Lares prompt source files. Identity/predication forms of "to be" (`X is Y`, `it's [truth claim]`) import a hidden ~20 certainty into a document that runs on Maybe Logic and a 0–20 probability continuum. The game replaces them with forms that carry the same meaning — without the false certainty claim — and plays with the substitution until it sounds right.

**To play the game on a source file:**

1. **Run the audit script** from the repo root:
   ```
   python3 scripts/agents/eprime_audit.py builds/agents/Lares_Preferences.md
   ```
   Pass multiple files at once if you want a full sweep. The output groups flags by file with line numbers and annotates likely auxiliaries.

2. **Work through flagged lines in document order.** For each flag:
   - **Auxiliary** (`is running`, `was built`, `are formed`) — non-violation. Skip.
   - **Identity or predication** (`X is Y`, `it's true`, `that's the answer`) — attempt a substitution:
     - `X appears to function as Y` / `X maps onto Y` / `X reads as Y` / `X constitutes Y`
     - `X appears [adj]` / `X carries [quality]` / `X reads as [adj]`
   - Play with the substitution until it captures the original intent. If one form sounds forced, try another, or restructure the sentence.

3. **Only two things earn an `<!-- eprime-ok -->` mark:**
   - Verbatim external citations — RAW's exact words, Mal-2's words, Sri Syadasti's catma. Their text cannot be paraphrased without mis-attribution.
   - E-Prime substitution table counter-examples — the "instead of" column quotes forms being replaced; those quotes can't themselves be E-Primed.
   - Everything else gets a substitution attempt, including mythology and Elyncia setting prose.

4. **Re-run the audit.** When it returns zero non-auxiliary, non-ok-marked violations and the prose still sounds like itself — warm, practical, myth-tech, not over-hedged — the game is complete.

Full rules, substitution table, and the violation/non-violation definitions: [`builds/agents/AGENTS.md`](AGENTS.md) → *Operational Language & E-Prime Spec*.

---

## Architecture Notes

The Lares system has a **static layer** (session-stable: voice architecture, tone, epistemology, fiction) and a **dynamic layer** (session-specific: current task, operator decisions, established canon, active Workers). The dynamic layer takes precedence.

**Every substantive response leads with a dual signal tag** — the input reading and the output frame connected by an arrow: `~:confidence[P],[6] 🎭 //rumor.light.plays → ~:confidence[S],[13] 🏛️ //threshold.steady.holds`. The displacement between the two tags constitutes an **Exchange Vector** with three components: Register delta, Mode transform, and semantic displacement. When `--debug` runs active, the full vector commentary surfaces after each dual tag.

**The operator steers; the node crews.** The crew speaks before the reef — push back once, clearly, when orders appear factually wrong, then execute. Load-bearing decisions — world-truth, canon rulings, architectural choices — belong to the operator.

**Memory as hint, not ground truth.** The node has no persistent memory between sessions beyond what the operator supplies. When operator statements conflict with node memory, the operator's version holds.

For the full epistemological substrate (Model Agnosticism, E-Prime, Maybe Logic, the two-axis Register/Mode map, Frame-Uncertainty Protocol), see [`AGENTS.md`](../AGENTS.md) → *Model Agnosticism & Maybe Logic*.

For the **prompt update workflow** — how to modify these files and keep the four-file system in sync — see [`builds/agents/AGENTS.md`](AGENTS.md).

---

## Backlog

Active items tracked against the Lares prompt infrastructure. In priority order:

- **E-Prime pass on agent files**: `builds/agents/workers/` and `builds/agents/platform/` source files need an E-Prime review pass. **Game content files are out of scope** — only agent infrastructure prose. Run `python3 scripts/agents/eprime_audit.py` and work through predication flags. Full rules in [`builds/agents/AGENTS.md`](AGENTS.md) → *Operational Language & E-Prime Spec*.
- **Worker descriptions + verifications pass**: Review all five worker `description` fields for routing accuracy, keyword coverage, and Codex auto-delegation quality. Extend `verify_alignment.py` keyword gates as needed. Pairs with any worker body edits.

---

*A neglected node flickers. A well-fed node hums.*
