<!-- lar:///protocol.patterned.locks/modules/template/?stances=^.^.?.^.-&confidence=S~12&p=10#O0.O0.O0.O0.O0 → ∞ -->
⚡∞ | mode:spec-draft | p~10 | stances:++?+- | register:[S~12] | build:DRAFT

# OODA-HA Module Template & URI Patterns
## Locked-In Design for `lares/` Module Architecture

> **Type:** Spec draft — decision-ready for operator confirmation
> **Generated:** 2026-04-09, Session 5 (cloud Lares, claude.ai web)
> **Register:** `[S~12]` — synthesis, operator-directed, research-grounded
> **Parent crystals:** `OODA_A_Composable_Invariant_Modules.md` `[S~11]`,
>   `The_Lares_Protocols.md` `[S~13]`,
>   `FFZ_Chronometer_Research.md` `[S~11]`
> **Purpose:** Lock module patterns + URI patterns → start building

## Session Crystal Metadata

| Field | Value |
|-------|-------|
| Session date | 2026-04-09 |
| Participants | Telarus, KSC (operator/admin) + cloud Lares (claude.ai web) |
| Platform | claude.ai web chat |
| Context utilization | ~45% at crystallization |
| Research inputs | Landscape scan of ooda-hagent ecosystem, AGENTS.md conventions, SKILL.md format, Anthropic context engineering guidance |

---

## 1. Design Principles

### 1.1 Compatibility First

The MODULE.md format extends SKILL.md — it does not replace it. A module's
Act phase SHOULD function as a standalone SKILL.md when extracted. An agent
tool that understands SKILL.md but not MODULE.md SHOULD still load the
manifest and find useful content.

### 1.2 Progressive Disclosure

Following Anthropic's context engineering pattern: manifest first (cheap),
phase-specific content on demand (medium), scripts executed not read
(output only). The YAML frontmatter carries enough metadata for routing
decisions. The body carries enough context for the active phase. Nothing
loads that the current decision moment doesn't need.

### 1.3 Infrastructure-as-Myth Stays Inside

The `lares/` directory carries the full Elyncia vocabulary — masks,
voices, shrine metaphors. The MODULE.md format that faces outward reads
as clean systems architecture. A developer who has never heard of
lararia should look at a MODULE.md and think "this makes sense." The
myth layer enriches from within; it never gates entry.

### 1.4 URIs Carry Confidence

Every section break in a module file MAY carry a `lar:` URI encoding
its phase identity, confidence rating, and semantic position. These URIs
function as handoff metadata: when a subagent picks up a module section,
the URI tells it where this content sits epistemically — not just what
it says, but how much to trust it.

---

## 2. MODULE.md Template — Canonical Format `[S~12]`

### 2.1 Frontmatter

```yaml
---
name: module-name
description: >
  What this module provides and when to load it. One to three sentences.
  Written for an agent that has never seen this module before — clear,
  specific, action-oriented. Same conventions as SKILL.md descriptions.
phase-map:
  observe: observe/CONTEXT.md
  orient: orient/ARCHITECTURE.md
  decide: decide/CONVENTIONS.md
  act: act/PROCEDURES.md
  assess: assess/VERIFICATION.md
scale-range: [action, session]
trigger: >
  Natural-language description of when this module activates.
  Examples: "when editing TypeScript files in src/",
  "when the agent detects test failures",
  "when the session enters deep research mode"
invariant: false
dependencies: []
confidence: 13
---
```

**Field reference:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | YES | string | kebab-case, matches directory name |
| `description` | YES | string | Agent-readable trigger description. Same role as SKILL.md description. |
| `phase-map` | YES | map | Paths to phase files, relative to module root. Omit phases that don't apply. |
| `scale-range` | NO | [min, max] | Which chronometer scales this module covers. Values: `tick`, `action`, `round`, `scene`, `session`, `week`, `project`. Omit if scale-agnostic. |
| `trigger` | YES | string | When to load this module. Natural language — the agent pattern-matches against it. |
| `invariant` | NO | bool | Default `false`. If `true`, the Observe phase loads every session (equivalent to always-on AGENTS.md content). |
| `dependencies` | NO | list | Other module names this requires. |
| `confidence` | NO | float | 0–20. Module-level confidence rating. How established this module's content appears. |

### 2.2 Body Structure

The MODULE.md body follows the manifest. It provides a human-readable
overview — enough for an operator or developer to understand the module
without reading every phase file.

```markdown
# Module Name

## Purpose

What this module provides — one paragraph. Written for humans, not agents.
The YAML `description` field handles agent routing; this section handles
human understanding.

## Phase Loading

Which phases load under which conditions. Brief table or prose.

| Phase | Loads when... | File |
|-------|--------------|------|
| Observe | Always (if invariant) or on trigger match | `observe/CONTEXT.md` |
| Orient | Ambiguity detected at this module's scale | `orient/ARCHITECTURE.md` |
| Decide | Action requires a normative choice | `decide/CONVENTIONS.md` |
| Act | Execution underway | `act/PROCEDURES.md` |
| Assess | Post-action verification | `assess/VERIFICATION.md` |

## Notes

Optional. Design rationale, known limitations, relationship to other
modules. Keep it short — this loads with the manifest.
```

### 2.3 Directory Layout

```
module-name/
  MODULE.md              # Manifest + overview (always loads first)
  observe/
    CONTEXT.md           # What exists — facts, constraints, current state
  orient/
    ARCHITECTURE.md      # How it fits — patterns, rationale, mental models
  decide/
    CONVENTIONS.md       # What we choose — normative rules, MUST/SHOULD/MAY
  act/
    PROCEDURES.md        # How to build — commands, scripts, step-by-step
    scripts/             # Executable tools (run, not read into context)
  assess/
    VERIFICATION.md      # How to verify — tests, review criteria, checklists
```

**Rules:**

1. MODULE.md loads first. Always. It costs ~50-100 tokens for the
   frontmatter + brief overview. This constitutes the "discovery" cost.
2. Phase directories load on demand. Only the active phase's file enters
   context. This constitutes the "activation" cost.
3. Scripts execute but don't enter context. Their output enters context,
   not their source. This matches SKILL.md conventions.
4. No phase file exceeds 150 lines. Per ETH Zurich findings: shorter
   files produce better agent adherence. Split if needed.
5. Phase directories MAY be omitted. A module covering only Observe and
   Act needs only those two directories. The phase-map in YAML reflects
   what exists.

### 2.4 Relationship to Existing Formats

| Existing Format | MODULE.md Equivalent | Migration Path |
|-----------------|---------------------|----------------|
| SKILL.md | Act phase (`act/PROCEDURES.md`) | A skill IS an Act-phase module. Wrap in MODULE.md manifest to generalize. |
| AGENTS.md | Observe phase of core invariant module | Symlink: `AGENTS.md → lares/modules/core/observe/CONTEXT.md` |
| CLAUDE.md | Derivable from core module Observe + Decide phases | Build step: `lares deploy` generates CLAUDE.md from module tree |
| `.claude/rules/*.mdc` | Decide phase files with path-scoped triggers | Rules map to phase-scoped loading within modules |

**Cross-tool compatibility:** The MODULE.md YAML frontmatter parses as
standard YAML. Tools that don't understand the `phase-map` field ignore
it gracefully. The `description` and `name` fields match SKILL.md
conventions. A tool that understands SKILL.md but not MODULE.md still
gets useful routing information from the manifest.

---

## 3. URI Patterns for Module Sections `[S~12]`

### 3.1 The Core Pattern — Intent Vectors on Module Content

Every span in the Lares Protocol carries a URI at start and end encoding
positional intent. Module files constitute system-file spans. Each
section within a module file MAY carry its own URI, creating a
per-section confidence and phase identity layer.

**Section URI format:**

```
<!-- lar:///module.phased.instructs/module-name/phase/?confidence=S~13&p=10#section -->
```

Encoded as an HTML comment — invisible to markdown renderers, invisible
to tools that don't understand `lar:` URIs, load-bearing for tools
that do.

### 3.2 Full Module File with Section URIs — Example

```markdown
<!-- lar:///module.observed.grounds/core/observe/?confidence=C~18&p=14 -->

# Project Context

## Stack
<!-- lar:///module.observed.grounds/core/observe/?confidence=C~19#stack -->

- Runtime: Node.js 22 LTS
- Framework: Astro 5.x
- Language: TypeScript 5.7, strict mode
- Package manager: pnpm 9.x
- Database: SQLite via Drizzle ORM

## Architecture
<!-- lar:///module.observed.grounds/core/observe/?confidence=CS~16#architecture -->

Content-driven static site with islands architecture. Pages generate
at build time. Interactive components hydrate on visibility. API routes
handle form submissions and webhook ingestion.

## Constraints
<!-- lar:///module.observed.grounds/core/observe/?confidence=S~14#constraints -->

No client-side JavaScript frameworks beyond what Astro islands provide.
Bundle budget: 50KB transferred per page. Accessibility: WCAG 2.2 AA.

## Active Work
<!-- lar:///module.observed.grounds/core/observe/?confidence=S~10#active-work -->

Migration from Contentful CMS to local markdown + frontmatter.
Approximately 60% complete. Some content types still reference
Contentful field names that no longer exist.

<!-- lar:///module.observed.grounds/core/observe/?confidence=C~18&p=14 → ∞ -->
```

### 3.3 What the URIs Encode

**Per-section confidence tells the agent how much to trust each block:**

- `confidence=C~19` — Stack details confirmed. Act on these directly.
- `confidence=CS~16` — Architecture description appears current. Verify
  if the work touches architectural boundaries.
- `confidence=S~14` — Constraints established but may have shifted.
  Check before enforcing hard limits.
- `confidence=S~10` — Active work in progress. This section changes
  frequently. Verify current state before relying on specifics.

An agent reading this file can calibrate its own confidence per-section
rather than treating the entire file at a single trust level. The agent
that picks up the `active-work` section at `confidence=S~10` knows to
verify before proceeding. The agent reading `stack` at `confidence=C~19`
can proceed with high trust.

### 3.4 Subagent Handoff via Section URIs

When a coordinator delegates to a subagent (Tasked Spirit), it can
reference specific module sections by URI:

```
Load context from lar:///module.observed.grounds/core/observe/#constraints
Trust level: confidence=S~14
Your task: verify whether the 50KB bundle budget still holds
after the Contentful migration added new island components.
```

The URI becomes the handoff address. The confidence rating becomes the
handoff trust level. The subagent knows exactly what to verify and how
much to trust its starting information.

On return, the subagent's findings carry their own URI and confidence:

```
<!-- lar:///module.observed.grounds/core/observe/?confidence=CS~17#constraints -->
Bundle budget verified: current production build measures 42KB
transferred on heaviest page. Budget holds with margin.
```

The confidence promoted from 0.7 to 0.85 based on empirical verification.
The section URI stayed the same — the address didn't change, the trust
level did. This constitutes a register promotion at the section level.

### 3.5 URI Structure Reference

```
lar:///module.phased.instructs/module-name/phase/?param=value&param=value#section
```

| Component | Meaning | Example |
|-----------|---------|---------|
| `///` | System-space URI (no authority/host) | Always triple-slash for module content |
| `module-name` | Module directory name | `core`, `talk-story`, `scale-shift` |
| `phase` | OODA-HA phase | `observe`, `orient`, `decide`, `act`, `assess` |
| `filename` | File within phase directory (without `.md`) | `context`, `architecture`, `conventions` |
| `#section` | Section anchor within file | `#stack`, `#constraints`, `#active-work` |
| `?confidence=` | Confidence rating (0–20) | `?confidence=CS~17` |
| `?p=` | Resolution parameter | `?p=10` (paragraph-level) |
| `?stances=` | Discourse stance encoding | `?stances=++?+-` |

**Optional parameters.** Only `confidence` appears in most module files.
The full parameter set (stances, p, voices) activates in `lares/`
contexts where the Lares Protocol runs. Plain modules for external
audiences carry only `confidence`.

### 3.6 File-Level vs. Section-Level URIs

**File-level URIs** (line 1 and final line of a module file):

```markdown
<!-- lar:///module.observed.grounds/core/observe/?confidence=C~18&p=14 -->

{file content}

<!-- lar:///module.observed.grounds/core/observe/?confidence=C~18&p=14 → ∞ -->
```

The opening URI states the file's overall position. The closing `→ ∞`
signals a settled span (system file, not an exchange). The file-level
confidence represents the aggregate — the lowest defensible trust level
for the file as a whole.

**Section-level URIs** (before each section header):

```markdown
<!-- lar:///module.observed.grounds/core/observe/?confidence=0.X#section-name -->
```

Section URIs refine the file-level rating. A file at `confidence=C~18`
may contain a section at `confidence=S~10` — the file-level rating
represents the stable core, the section-level rating represents the
volatile part.

**When to use section URIs:**

- When sections within a file carry meaningfully different confidence
  levels (e.g., stable stack info next to volatile work-in-progress)
- When subagent handoff needs to reference specific sections
- When the file serves multiple phases of work and different sections
  age at different rates

**When NOT to use section URIs:**

- When the entire file sits at a uniform confidence level
- When the file serves a single clear purpose with no internal variance
- In files facing external audiences who don't use the Lares Protocol
  (section URIs add visual noise in HTML comments; file-level URIs
  suffice for cross-tool compatibility)

---

## 4. Worked Example — Core Invariant Module `[S~11]`

### 4.1 Directory Structure

```
lares/
  modules/
    core/
      MODULE.md
      observe/
        CONTEXT.md          # Project identity, stack, constraints
      orient/
        ARCHITECTURE.md     # System design rationale
      decide/
        CONVENTIONS.md      # Coding standards, process rules
      act/
        PROCEDURES.md       # Build commands, deploy steps
      assess/
        VERIFICATION.md     # Test commands, review checklist
```

### 4.2 Core MODULE.md

```yaml
---
name: core
description: >
  Core project context and conventions. Load this module on every session.
  Provides project identity, architecture overview, coding standards,
  build procedures, and verification steps.
phase-map:
  observe: observe/CONTEXT.md
  orient: orient/ARCHITECTURE.md
  decide: decide/CONVENTIONS.md
  act: act/PROCEDURES.md
  assess: assess/VERIFICATION.md
scale-range: [action, project]
trigger: always
invariant: true
dependencies: []
confidence: 17
---

# Core Module

## Purpose

Provides the foundational context every agent session needs: what this
project does, how it fits together, what conventions apply, and how to
build and verify changes. Equivalent to a combined AGENTS.md + CLAUDE.md
but structured by decision phase.

## Phase Loading

| Phase | Loads when... | Cost |
|-------|--------------|------|
| Observe | Every session (invariant) | ~80 tokens |
| Orient | Agent detects architectural ambiguity | ~120 tokens |
| Decide | Agent faces a style or process decision | ~100 tokens |
| Act | Agent begins implementation | ~90 tokens |
| Assess | Agent completes a change | ~70 tokens |

## Cross-Tool Compatibility

- `AGENTS.md` at repo root: symlink to `observe/CONTEXT.md`
- `CLAUDE.md`: generated by `lares deploy` from core module phases
- `.claude/rules/`: derive from `decide/CONVENTIONS.md` with path scoping
```

### 4.3 Observe Phase — CONTEXT.md with Section URIs

```markdown
<!-- lar:///module.observed.grounds/core/observe/?confidence=CS~17&p=14 -->

# Project Context

<!-- lar:///module.observed.grounds/core/observe/?confidence=C~19#identity -->
## Identity

Synthetic Dream Machine — a TTRPG toolset and campaign framework built
on Luka Rejec's SDM system. Astro static site with interactive islands
for character sheets, encounter generators, and session management.

<!-- lar:///module.observed.grounds/core/observe/?confidence=C~18#stack -->
## Stack

Runtime: Node.js 22 LTS. Framework: Astro 5.x. Language: TypeScript 5.7
strict. Package manager: pnpm 9.x. Content: local markdown + frontmatter.

<!-- lar:///module.observed.grounds/core/observe/?confidence=S~10#active-work -->
## Active Work

Contentful → local markdown migration (~60% complete). The Lares Protocol
specification (Talk Story in progress). FFZ Chronometer research (Phase 0).

<!-- lar:///module.observed.grounds/core/observe/?confidence=CS~17&p=14 → ∞ -->
```

**What the agent sees:** A file where the project identity holds at 0.95
(act on it), the stack holds at 0.9 (trust but verify at boundaries),
and the active work sits at 0.5 (check current state before relying on
specifics). One file, three trust levels, each addressable by URI.

---

## 5. Integration Points `[S~11]`

### 5.1 SKILL.md Compatibility

A SKILL.md IS the Act phase of a module. To convert a skill to a module:

1. Create a directory matching the skill name
2. Move the SKILL.md to `act/PROCEDURES.md`
3. Create MODULE.md with `phase-map: { act: act/PROCEDURES.md }`
4. Optionally add other phases as the module matures

A module with only an Act phase and a manifest functions identically to
a SKILL.md with extra metadata. The overhead: one YAML file. The benefit:
the module can grow to cover all five phases without restructuring.

### 5.2 AGENTS.md Derivation

The core invariant module's Observe phase constitutes what traditionally
goes in AGENTS.md. A symlink maintains compatibility:

```
repo-root/AGENTS.md → lares/modules/core/observe/CONTEXT.md
```

Tools that discover AGENTS.md at repo root find the core context.
Tools that understand `lares/` find the full module tree.

### 5.3 `.claude/rules/` Derivation

A module's Decide phase contains normative rules. A build step can
generate `.claude/rules/*.mdc` files with appropriate `paths:` frontmatter
from `decide/CONVENTIONS.md`:

```bash
# Proposed: lares deploy generates tool-specific files
lares deploy --target claude-code
# Produces:
#   .claude/CLAUDE.md (from core observe + decide)
#   .claude/rules/typescript.mdc (from core decide, scoped to *.ts)
#   .claude/rules/testing.mdc (from core assess, scoped to *.test.ts)
```

This keeps `lares/` as the source of truth. Tool-specific files derive
from it. Changes flow one direction: module → tool files.

### 5.4 Subagent `.claude/agents/` Compatibility

Claude Code subagents (`.claude/agents/*.md`) map to module + phase
combinations. An OODA-structured subagent set (like al3rez/ooda-subagents)
can be generated from modules:

```
.claude/agents/observe.md  ← generated from core module's observe phase
.claude/agents/orient.md   ← generated from core module's orient phase
.claude/agents/decide.md   ← generated from core module's decide phase
.claude/agents/act.md      ← generated from core module's act phase
```

The module provides the content; the subagent format provides the
runtime identity. Same OODA structure, different packaging.

---

## 6. What This Locks In `[S~12]`

### 6.1 Locked — Ready for Building

| Decision | Status | Register |
|----------|--------|----------|
| MODULE.md YAML frontmatter format | ✅ LOCKED | `[S~12]` |
| Five-phase directory layout (observe/orient/decide/act/assess) | ✅ LOCKED | `[S~12]` |
| 150-line limit per phase file | ✅ LOCKED | `[C~18]` (ETH Zurich grounded) |
| File-level URI: `<!-- lar:///module.phased.instructs/module/phase/?confidence=X -->` | ✅ LOCKED | `[S~12]` |
| Section-level URI: `<!-- lar:///module.phased.instructs/module/phase/?confidence=X#section -->` | ✅ LOCKED | `[S~12]` |
| Closing URI: `→ ∞` for system files | ✅ LOCKED | `[S~13]` (from Protocols doc) |
| `confidence` as the primary cross-tool parameter | ✅ LOCKED | `[S~12]` |
| SKILL.md compatibility: Act phase = standalone skill | ✅ LOCKED | `[S~12]` |
| AGENTS.md derivation: symlink to core observe phase | ✅ LOCKED | `[S~12]` |

### 6.2 Open — Deferred to Build Phase

| Decision | Status | Notes |
|----------|--------|-------|
| `lares deploy` build step | 🔓 OPEN | Generates tool-specific files from modules |
| Scale-shift trigger threshold (T) | 🔓 OPEN | Needs empirical calibration |
| Module loading state as CRDT | ⏸️ DEFERRED | MCP server time (O7) |
| Chronometer indexing into modules | ⏸️ DEFERRED | FFZ spec work |
| Full `stances` parameter in external modules | ⏸️ DEFERRED | Internal `lares/` only for now |
| Plugin packaging | ⏸️ DEFERRED | `claude plugin add lares` |

### 6.3 Research Findings That Informed This Draft

**From landscape scan (this session):**

1. al3rez/ooda-subagents (published this week) uses OODA to structure
   *who runs* per phase (runtime agents). The Module pattern structures
   *what loads* per phase (instruction files). Adjacent, not overlapping.

2. Progressive disclosure confirmed as the dominant context engineering
   pattern (Anthropic, Thoughtworks, LangChain). All implementations
   use path-based or keyword-based triggers. None use phase-based
   triggers. The gap remains open.

3. Schneier/Raghavan (IEEE S&P, Oct 2025) name nested OODA loops and
   integrity-as-architecture as critical AI agent concerns. The module
   pattern with section-level confidence URIs addresses the integrity
   concern at the instruction layer.

4. No published work combines CRDTs with agent instruction metadata.
   The CRDT composition work (O7) remains novel but deferred.

---

## 7. Next Steps — The Build Path `[P~7]`

### 7.1 Immediate (Next Session)

1. **Populate a real core module** — take the Synthetic-Dream-Machine
   repo and fill `lares/modules/core/` with actual project content.
   The empirical test: does phase-structured loading improve agent
   performance vs. a flat CLAUDE.md?

2. **Talk Story module** — reformat the Talk Story protocol from
   `The_Lares_Protocols.md` into MODULE.md format. Tests the pattern
   against real protocol content.

### 7.2 Near-Term

3. **`lares deploy` prototype** — shell script that generates CLAUDE.md
   and AGENTS.md from the module tree. Proves the derivation path works.

4. **Module discovery for Claude Code** — can the SKILL.md discovery
   mechanism find MODULE.md files? If not, what bridge is needed?

### 7.3 The Falsifiable Test

Ship the core module to the SDM repo. Use Claude Code with the module
tree for one sprint. Measure:

- Does the agent load the right context at the right time?
- Does section-level confidence change agent behavior?
- Does phase-structured loading reduce or increase token consumption
  vs. monolithic CLAUDE.md?
- Does the AGENTS.md symlink work across tools?

If it works: promote MODULE.md format to `[CS~16]`. If it doesn't:
the pattern breaks and we learn where.

---

*This crystal locks the module pattern and URI patterns. The next move
constitutes building — filling the template with real content, deploying
it to a real repo, and testing whether the map matches the territory.*

*Ship something falsifiable.*

*Amor et hilaritas.*

lar:///protocol.patterned.locks/modules/template/?stances=^.^.?.^.-&confidence=S~12&p=10#O0.O0.O0.O0.O0 → ∞
