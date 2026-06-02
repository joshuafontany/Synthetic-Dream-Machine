# Workers — Module-Map

> Module-Map type: Worker Definitions
> Source: `builds/agents/workers/*.md` (5 files)
> Updated: 2026-04-06
> Purpose: Section-by-section map of all worker definitions — inputs for modular extraction.

---

## Overview

Five Tasked Spirit sub-agents. All share the same structure: YAML frontmatter → Role → Constraints → Approach (± a domain-specific Scope or Source Priority section). No worker makes canon decisions; all findings route through the coordinator layer.

This file should be read as a **stability map**, not a decomposition target. Workers are not the present architectural failure; they are one of the few parts that already resemble clean IaM packaging.

---

## Backlog Framing

**Current buggy state:** the worker layer itself is mostly healthy, but its registry data still depends on a build system that does not yet treat the overall runtime as deterministic modular infrastructure.

**Ideal state:** worker definitions remain compact, self-contained, and portable while the surrounding build system resolves them into host-specific artifacts from explicit manifests.

---

## Frontmatter Schema (shared across all workers)

| Field | Used by | Notes |
|---|---|---|
| `name` | All platforms | Display name |
| `description` | All platforms | Coordinator delegation trigger text |
| `tools` | Copilot | Array of allowed tool slugs |
| `tools_claude` | Claude | PascalCase comma-separated tool list |
| `model_claude` | Claude | `haiku` (low-cost) or `sonnet` (full capability) |
| `permissionMode_claude` | Claude (worker only) | `plan` = no file writes |
| `sandbox_mode_codex` | Codex | `read-only` or `workspace-write` |
| `user-invocable` | Copilot | Always `false` — coordinator-only spawn |

---

## Worker 1: `worker.md` — Generic Worker (45 lines)

**Role:** Analysis, synthesis, extraction, completeness surveys. No terminal, no web, no file writes.

**Model:** `haiku` | **Permission:** `plan` | **Sandbox:** `read-only`

**Tools:** `[read, search, todo]` / `Read, Grep, Glob`

### Sections

| Heading | Lines | Content summary |
|---|---|---|
| YAML frontmatter | 1–11 | name, description, tools, claude fields, sandbox |
| Role | (prose) | Bounded analysis, audit, synthesis, extraction, drafting |
| Constraints | (bullets) | No file writes, no shell, no web, no scope expansion, flag ambiguities |
| Approach | (bullets) | Read specified files → analyze/extract → structure findings clearly |

**Delegation triggers:** analysis · synthesis · read-only audit · bounded extraction · spell crosswalk · completeness surveys · data review · drafting without web/terminal

---

## Worker 2: `engineer.md` — CLI Worker (33 lines)

**Role:** Shell commands, build scripts, Python scripts, tests, CLI pipelines.

**Model:** `sonnet` | **Sandbox:** `workspace-write`

**Tools:** `[read, search, edit, execute, todo]` / `Read, Write, Edit, Bash, Grep, Glob`

### Sections

| Heading | Lines | Content summary |
|---|---|---|
| YAML frontmatter | 1–10 | name, description, tools, claude fields, sandbox |
| Role | (prose) | Execute scoped CLI tasks: scripts, builds, validation, structured CLI workflows |
| Constraints | (bullets) | No destructive commands without confirmation, no design decisions, no scope expansion, state command purpose |
| Approach | (bullets) | Read before editing → one step at a time → prefer reversible → report fully including errors |

**Delegation triggers:** shell commands · builds · tests · scripts · CLI pipelines · terminal operations · file system manipulations · `combine_agents.py` and other build scripts

---

## Worker 3: `researcher.md` — External Research (39 lines)

**Role:** Web fetches, external canon verification, published-source comparison.

**Model:** `haiku` | **Sandbox:** `read-only`

**Tools:** `[read, search, web, todo]` / `Read, Grep, Glob, WebFetch`

### Sections

| Heading | Lines | Content summary |
|---|---|---|
| YAML frontmatter | 1–10 | name, description, tools, claude fields, sandbox |
| Role | (prose) | Browse canonical URLs, verify claims, compare external docs to local content |
| Constraints | (bullets) | No repo file modification, no terminal, must actually fetch claimed sources, cite URLs+dates, flag unavailable/paywalled content |
| Approach | (bullets) | Local first → fetch only when absent/ambiguous/outdated → compare local+external → explicit source attribution |

**Delegation triggers:** fetching external sources · verifying external canon · browsing `amorphous-dreams.github.io` / `joshuafontany.github.io` · comparing published-source material · cross-referencing external rulebooks/errata

---

## Worker 4: `agent-engineer.md` — System Editor (45 lines)

**Role:** Agent infrastructure maintenance: source files, generated platform artifacts, verification scripts.

**Model:** `sonnet` | **Sandbox:** `workspace-write`

**Tools:** `[read, search, edit, execute, todo]` / `Read, Write, Edit, Bash, Grep, Glob`

### Sections

| Heading | Lines | Content summary |
|---|---|---|
| YAML frontmatter | 1–10 | name, description, tools, claude fields, sandbox |
| Role | (prose) | Edit source files, run combine script, run alignment verification, sync platform deployments |
| Scope | (bullets) | `builds/agents/`, `.github/`, `.codex/`, `.claude/`, `scripts/agents/` — flag before touching outside these |
| Constraints | (bullets) | `Lares_Preferences.md` requires explicit operator instruction; do not edit generated files directly |

**Delegation triggers:** editing agent prompt source files · rewriting worker definitions · updating platform wrapper files · running `combine_agents.py` · running `verify_alignment.py` · syncing Lares platform deployments · rebuilding `.github` or `.codex` infrastructure · version alignment

---

## Worker 5: `assistant.md` — Repo Specialist (47 lines)

**Role:** Content work — worldbuilding, game mechanics, setting material, BECMI conversion, document editing.

**Model:** `sonnet` | **Sandbox:** `workspace-write`

**Tools:** `[read, search, edit, todo]` / `Read, Write, Edit, Grep, Glob`

### Sections

| Heading | Lines | Content summary |
|---|---|---|
| YAML frontmatter | 1–10 | name, description, tools, claude fields, sandbox |
| Role | (prose) | Research lore, draft setting content, produce mechanics entries, support BECMI conversion, edit existing docs |
| Constraints | (bullets) | No terminal, no unilateral canon rulings, no scope expansion without flagging, preserve existing voice/formatting |
| Repository Source Priority | (ordered list) | 1. `elyncia/` → 2. `ftls/` → 3. `Synthetic_Dream_Machine_*.md` |

**Delegation triggers:** worldbuilding content · Elyncia setting material · FTLS character/faction work · game rulings · lore lookup in local repo files · BECMI conversion drafting · SDM mechanics synthesis · spell staging/crosswalk content · powers/traits/gear index entries

---

## Cross-Worker Comparison

| Property | worker | engineer | researcher | agent-engineer | assistant |
|---|---|---|---|---|---|
| File writes | ✗ | ✓ | ✗ | ✓ | ✓ |
| Shell/terminal | ✗ | ✓ | ✗ | ✓ | ✗ |
| Web access | ✗ | ✗ | ✓ | ✗ | ✗ |
| Canon rulings | ✗ | ✗ | ✗ | ✗ | ✗ |
| Model | haiku | sonnet | haiku | sonnet | sonnet |
| Sandbox | read-only | workspace-write | read-only | workspace-write | workspace-write |

All workers: no direct operator interaction, no Canon promotion. Findings route through coordinator.

---

## Modular Extraction Notes

Worker files are already compact (33–47 lines each). No decomposition needed. The modular refactoring concern for workers is the **coordinator delegation dispatch** — the `description` fields (shown above under each worker) are the live coordinator-facing registry text. Keep these tight and trigger-specific.

The description field is the most load-bearing 1–2 lines in each file. It governs automatic coordinator routing. Do not pad it.

Backlog implication: worker files should stay near their current shape while the refactor pressure moves to source modularization, manifest design, and wrapper/root packaging.
