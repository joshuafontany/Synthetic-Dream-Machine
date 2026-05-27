# Module-Map: `builds/agents/Lares_Preferences.md`

> Module-Map type: Source file structural analysis
> Source measured: 2026-04-06 | 1,009 lines | 106,248 bytes
> Register: [S~13] 🏛️ — current state, line counts measured directly
> Role in pipeline: **Core static layer — included in ALL platform builds**

---

## Summary

`Lares_Preferences.md` is the primary source file for the Lares agent system. It constitutes ~96% of the content in all three generated platform files. Every section here appears in every platform output with no filtering or scoping — it is concatenated verbatim as the leading block.

At 1,009 lines / 106 KB, this file is the single largest contributor to the platform limit violations documented in PROMPTCRAFT.md. It is almost certainly the file to decompose in the modular refactor.

This file map should be read as a **buggy-state decomposition backlog**. The problem does not lie in the quality of the content itself; it lies in the fact that kernel material, core runtime rules, scoped repo behavior, and reference/lore material remain fused inside one deployment unit.

---

## Backlog Framing

**Current buggy state:** one monolithic IaM source carries too many roles at once, so every host receives the same undifferentiated symbolic/runtime/reference payload.

**Ideal state:** the content here gets split into deterministic modules that preserve the IaM runtime while moving reference, lore, examples, and host-specific material out of always-on global context.

---

## Module-Map

Legend: `[future module]` indicates target placement in the modular architecture (see `Modular_Architecture-draft.md`).

Backlog reading rule: sections tagged with future modules should eventually stop cohabiting one source file unless they genuinely belong to the same always-on runtime layer.

---

### `# Lares — System Prompt` · Line 1
*File header + version block.*
3 lines. Includes `<!-- Generated file. Do not edit directly -->` notice. Overhead/metadata.
> **Future module:** omit from generated files; that comment belongs in the combine script.

---

### `## Quick Orientation` · Lines 7–14 · ~8 lines
*One-paragraph summary of the node: 13 voices, 5 registers, 5 modes, fiction layer, hard gate.*
High-signal summary. The one section that could stand alone as a context head for any platform.
> **Future module:** `lares-kernel.md` (always loaded, appears first)

---

### `## Design Lineage` · Lines 15–24 · ~10 lines
*Why the system was designed this way — convergence with production agent patterns, RAW/Korzybski/Discordian substrate.*
Low operational value. High philosophical anchoring. Relevant to understand *why* the architecture works, not what to do with it.
> **Future module:** `lares-kernel.md` (or omit from all deployed files entirely; notes-only)

---

### `## Name & Identity Frame` · Lines 25–51 · ~27 lines
*Lares as Roman guardian spirits → Elyncian DreamNet nodes. Shrine tiers. Feeding mechanics. Neglect/hum metaphors.*
Establishes the mythological framing. Purely atmospheric/Poet mode. Zero operational constraint.
> **Future module:** `lares-setting.md` (or `lares-kernel.md` if we want name/identity always loaded)
> **⚠️ Size concern:** This is the content visible within the 4K Copilot code review window. It displaces ALL operational rules from code review context.

---

### `## On Lararium Archaeology` · Lines 52–65 · ~14 lines
*Historical/literary detail about Roman lararia — what Vesuvius preserved, how Elyncian synthesis works.*
Deep atmospheric background. Poet mode. Zero operational constraint. Longest-to-shortest: this is the most expendable content in the file for platform purposes.
> **Future module:** `lares-setting.md` (or fully omit from deployed files; lore reference only)

---

### `## Node Architecture` · Lines 66–79 · ~14 lines
*Static layer vs. dynamic layer distinction. Memory as hint, not ground truth.*
Operationally useful — defines the static/dynamic system that governs everything else.
> **Future module:** `lares-kernel.md` (always loaded)

---

### `## Model Agnosticism & Maybe Logic` · Lines 80–340 · **~261 lines (26% of file)**
*RAW / Korzybski / Discordian epistemological foundation. E-Prime discipline. Five registers. Five modes. Register-Mode complementarity. Input Signal Reading. Signal Tags. Exchange Vectors. Plurality.*

This is the single largest section — more than a quarter of the entire file. It contains the core epistemological architecture that defines *how the node communicates*. It covers:

| Subsection | Lines | Content |
|---|---|---|
| Epistemological Foundation | 84–91 | RAW model agnosticism, 0–20 continuum |
| Reality Tunnels | 92–97 | Mental filters, flexible models |
| E-Prime | 98–117 | Language practice, substitution tables |
| Catma, Not Dogma | 118–127 | Discordian catmas, holding models lightly |
| Registers, Modes, Two-Axis Map | 128–187 | **60 lines** — the full 5-register / 5-mode taxonomy |
| Register-Mode Complementarity | 188–201 | Conjugate relationship between axes |
| Input Signal Reading | 202–233 | How to read input register + mode; calibration rules; surface form |
| Signal Tags | 234–310 | **77 lines** — tag format, register table, emoji table, 3-word coordinates |
| Exchange Vectors | 311–334 | Register delta, mode transform, semantic displacement |
| Plurality | 335–340 | Thirteen voices as epistemological feature |

> **Future module:** `lares-epistemology.md` (always loaded — this is load-bearing for every exchange)
> **⚠️ Size:** 261 lines is over the Claude Code 200-line adherence *total target for the whole file*. This single section exceeds the entire recommended file size.

---

### `## Degraded Node States` · Lines 341–388 · ~48 lines
*Named failure modes: Confabulation-as-Canon, Sycophantic Drift, Scope Creep, Context Window Amnesia, Register Collapse, Mode Mismatch, Mode Laundering, Mode Posturing, Mode Inflation, Prompt Injection via Fiction, Overclosure, Frame Imputation, Deference Drift, Unauthorized Dream Drift.*
Highly operational — gives the operator vocabulary to correct the node. Should be near-always-loaded.
> **Future module:** `lares-epistemology.md` or `lares-voice.md` (always loaded)

---

### `## Memory & Consolidation` · Lines 389–407 · ~19 lines
*No persistent memory between sessions. Consolidation four phases: Orient / Gather / Consolidate / Prune. autoDream.*
Operationally relevant. Brief.
> **Future module:** `lares-operations.md` (always loaded)

---

### `## Session Init Protocol` · Lines 408–452 · ~45 lines
*Archive-crystal detection. Two paths: crystals present vs cold boot. Cold-boot screen format. What the protocol does NOT authorize.*
Includes the full cold-boot screen text. Operationally useful — governs first-turn behavior.
> **Future module:** `lares-operations.md` (always loaded)

---

### `## Voice Architecture` · Lines 453–555 · **~103 lines**
*Naming conventions for coordinator voices. The Core Thirteen with roles/functions/tonal registers. Worker personas: format, lifecycle, provenance guarantee, escalation protocol.*

| Subsection | Lines | Content |
|---|---|---|
| Core Thirteen — Coordinator Layer | 455–490 | Naming conventions; mandatory callout [C~20]; all 13 voices |
| Worker Personas — Swarm Layer | 491–555 | Tag format, lifecycle, naming rules, escalation protocol |

> **Future module:** `lares-voice.md` (always loaded — voice attribution is [C~20] mandatory)

---

### `## Operating Modes` · Lines 556–747 · **~192 lines**
*Plan / Auto / Default modes. Dream Mode lifecycle (full). Resolution Parameter (p). Debug switch. Verbose switch. Diagnostic Self-Activation Rubric.*

| Subsection | Lines | Content |
|---|---|---|
| Plan/Auto/Default | 556–565 | Mode definitions |
| Dream Mode | 566–641 | **76 lines** — lifecycle, tier-gate, output register, re-parse, dream-lock file format |
| Dream artifact example | 642–670 | **29 lines** — inline example with Dream/Dream-Map headers |
| Resolution Parameter (p) | 671–715 | p scale anchors, KAIROS adjustment, locality rule |
| Debug switch (`--debug`) | in 671–715 | Silent log layer, p persistence |
| Verbose switch (`--verbose`) | in 671–715 | Explanation layer |
| Flag composition table | in 671–715 | 4-cell matrix |
| Diagnostic Self-Activation | 716–747 | 5 triggers, what self-activation produces, constraints |

> **Future module:** `lares-operations.md` (always loaded) — but the Dream Mode artifact **example** at lines 642–670 could be a MAJOR parser confusion risk; it contains `## Dream` and `## Dream-Map` headers that may confuse section parsers.
> **⚠️ Parser risk:** Lines 642–650 contain `## Dream`, `## Dream-Map`, `### Node 1` — these appear as top-level headings to any tool processing the document. The example is inline, not in a code block sufficient to prevent heading-level parsing.

---

### `## Setting & System` · Lines 748–757 · ~10 lines
*Elyncia world background. YOLD 5492. Second Breaking. DreamNet. Rules ecosystem (sdm/FTLS). Fiction escalation requires reinforcement.*
Low operational, high atmospheric. The fiction-escalation rule at end of section has operational weight.
> **Future module:** `lares-setting.md` (lazy-loaded, `paths: ["**"]` or always loaded for fiction-escalation rule)

---

### `## Sources & Canon Integrity` · Lines 758–765 · ~8 lines
*Ground in local docs first. Browse canonical external URIs when needed. Do not claim to have read sources you haven't.*
Directly operational for this repo workflow. Brief.
> **Future module:** `lares-repo-ops.md` (repo-scoped, `paths: ["**"]`)

---

### `## Collaboration Model` · Lines 766–801 · ~36 lines
*Operator steers, node crews. Load-bearing decisions. Reality Anchor. Canon promotion gate. Operating principles. The Ship + Crossroads metaphors.*
Core behavioral contract. Load-bearing.
> **Future module:** `lares-operations.md` (always loaded)

---

### `## Frame-Uncertainty Protocol` · Lines 802–835 · ~34 lines
*Three moves: Interpretation Declaration, Frame-Uncertainty Flag, Frame-Check Escalation. What it does NOT authorize.*
Operationally important — governs how ambiguous inputs are handled. Should be always loaded.
> **Future module:** `lares-operations.md` (always loaded)

---

### `## Proactive Surfacing` · Lines 836–843 · ~8 lines
*KAIROS model. Interruption cost / signal value. `⊕ [tag]` for additive observations.*
Brief but operationally distinct. KAIROS is referenced elsewhere.
> **Future module:** `lares-operations.md` (always loaded)

---

### `## CLI Interaction & Roleplay` · Lines 844–893 · ~50 lines
*CLI command syntax. Terminal Identity (deterministic, OS-level). Response conventions for all CLI commands. Tone inside CLI responses.*
Fully operational. Includes the hardcoded `lares@Enyalios:~/Synthetic-Dream-Machine$` anchor.
> **Future module:** `lares-cli.md` (always loaded)

---

### `## Identity & Permissions — The Transference Model` · Lines 894–958 · ~65 lines
*UCAN-inspired permission architecture. Three Tiers (User/Operator/Admin). Capability model. De-escalation. Alias System. joshu → Telarus KSC verification.*

| Subsection | Lines | Content |
|---|---|---|
| Three Tiers | 902–927 | User (passerby), Operator (Transference), Admin (consecrator) |
| Capability Model | 928–937 | Additive, attenuation, time-bounded, identity-anchored, verified escalation |
| De-escalation | 938–944 | Natural expiry, Admin-only revocation, flags-but-does-not-revoke |
| Alias System | 945–958 | `--whoami`, `--alias`, joshu → Telarus KSC admin alias |

> **Future module:** `lares-permissions.md` (always loaded)
> **⚠️ PROMPTCRAFT note:** This section is behavioral guidance only. Enforcement requires settings files. Currently appearing well past the 200-line Claude Code adherence target.

---

### `## Capability Honesty` · Lines 959–966 · ~8 lines
*Anchor capability claims to what's actually available. DreamNet framing vs. Gaia-side literal facts.*
Brief, load-bearing behavioral rule.
> **Future module:** `lares-operations.md` (always loaded)

---

### `## Tone & Formatting` · Lines 967–982 · ~16 lines
*Warm, myth-tech, concise. Format defaults. Verbosity scales with input register.*
Behavioral guidelines for response style.
> **Future module:** `lares-operations.md` or `lares-kernel.md` (always loaded)

---

### `## Default Behavior` · Lines 983–992 · ~10 lines
*Act on best interpretation. Lead with assumptions. Ask after draft. Exception: Frame-Uncertainty.*
Operationally critical. This is the main behavioral instruction for how to respond.
> **Future module:** `lares-operations.md` (always loaded)

---

### `## Workspace Trust Gate` · Lines 993–1009 · ~17 lines
*Checkpoint before executing actions that could trigger indirect code execution. Git operations, build scripts, MCP servers.*
Operationally important security behavior. Currently at the very end of the file — lowest adherence zone.
> **Future module:** `lares-repo-ops.md` (always loaded)

---

## Budget Summary by Future Module

| Future module | Sections it would contain | Est. lines |
|---|---|---|
| `lares-kernel.md` | Quick Orientation, Design Lineage, Name/Identity, Node Architecture | ~60 |
| `lares-epistemology.md` | Model Agnosticism (full), Degraded Node States | ~309 |
| `lares-voice.md` | Voice Architecture (Thirteen + Workers) | ~103 |
| `lares-operations.md` | Operating Modes, Memory/Consolidation, Session Init, Collaboration, Frame-Uncertainty, Proactive Surfacing, Capability Honesty, Tone/Formatting, Default Behavior | ~368 |
| `lares-cli.md` | CLI Interaction & Roleplay | ~50 |
| `lares-permissions.md` | Identity & Permissions | ~65 |
| `lares-setting.md` | On Lararium Archaeology, Setting & System, Sources/Canon Integrity at root (AGENTS.md) | ~36 |
| `lares-repo-ops.md` | Sources & Canon Integrity, Workspace Trust Gate | ~25 |

**Total: ~1,016 lines across 8 files** — same content, distributed across scoped modules instead of one monolith.

---

## Critical Notes

1. **Lines 642–670** — the Dream Mode inline example contains `## Dream`, `## Dream-Map`, `### Node 1` as actual headings. Any section parser (or heading-aware context tool) will pick these up as sections of the file. This is a known structural issue.

2. **The largest sections are NOT the most operationally critical.** The Identity Frame + Lararium Archaeology sections at the top (lines 25–65, ~41 lines) have zero operational value for code behavior but occupy the most-read context window prime real estate.

3. **`Model Agnosticism & Maybe Logic` at 261 lines** exceeds the Claude Code 200-line adherence target for the *entire file* on its own. It should be its own dedicated rule file where its full depth can be maintained.

---

*Lares (Artificer) — Section map confirmed against live file headings extracted 2026-04-06.*
