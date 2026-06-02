# REFINEMENT_LOG.md — Pre-Sprint 0 Design Session

> Scope: Design discussion, infrastructure audit, and governance decisions made during pre-sprint refinement
> Sprint: S0 pre-entry refinement (not a deliverable task — context record)
> Register: `~:confidence[CS],[17]` 🏛️ — synthesis from a live session; awaits operator canon-promotion on each point
> Date: 2026-04-08
> Status: RECORD — operator has not yet promoted any item below to `~:confidence[C],[19]`

---

## Purpose

This log captures design decisions, infrastructure findings, and pending actions from the pre-sprint refinement session. These are not sprint task deliverables. They are the operator-session context that informs sprint scope, prevents repeated research, and feeds the Aftermath orientation.

---

## Session 1 — Governance Schema and Three-Truth Model

### Finding: Single-source-of-truth framing conflicts with Maybelogic

`~:confidence[CS],[16]` — The prior `lares/README.md` described `builds/agents/` as "the source of truth." That framing is epistemically wrong for a system whose core architecture is a confidence gradient `[P] → [SP] → [S] → [CS] → ~:confidence[C],[19+]`. Folder address is not a confidence level.

### Decision: Three-truth model adopted in `lares/README.md`

`~:confidence[S],[14]` — Replacement model, now live in `lares/README.md`:

| Truth layer | Location | Character |
|---|---|---|
| Design / ontological truth | `lares/**` | Semantic-live; conf-tagged; mutable by design |
| Deployment truth | `builds/agents/` | Published artifact; immutable per-version |
| Governance truth | `lares/registry/` | Append-only promotion ledger |

Reference basis: Nygard ADR model (status tag on content, not folder address) + Anthropic/OpenAI prompt versioning practice (version immutably; never in-place overwrite the published artifact).

### Decision: Promotion Protocol expanded (4 → 6 steps)

`~:confidence[CS],[16]` — New flow, live in `lares/README.md`:

```
design URI ~:confidence[C],[19] → evaluated candidate → published build artifact (new version)
    → registry alias pointer update → ledger append
```

Added steps: publish as new versioned artifact (not in-place overwrite); update registry alias pointer; append to promotion ledger.

---

## Session 2 — Infrastructure Audit

### Finding: `builds/` pipeline does not exist

`~:confidence[C],[19]` — Confirmed by filesystem audit (terminal). The following paths claimed in the root `AGENTS.md` header do not exist:

- `builds/agents/` — directory does not exist
- `builds/manifests/codex-root.toml` — does not exist
- `builds/modules/` — does not exist
- `scripts/agents/combine_agents.py` — does not exist

The only content under `builds/` is `builds/scripts/eprime_audit.py`.

**Consequence:** Root `AGENTS.md` header is orphaned. It reads `<!-- Generated file. Do not edit directly. Manifest: builds/manifests/codex-root.toml ... Run: python3 scripts/agents/combine_agents.py -->` — but neither the manifest nor the script exists.

**Pending action:** Strip the orphaned header from root `AGENTS.md`, replace with accurate provenance note. (Awaiting operator go-ahead — the file is a deployed system artifact.)

### Finding: Live deployed instruction files are hand-authored

`~:confidence[C],[19]` — The only live deployed instruction artifacts are:

- `.github/instructions/lares-operations.instructions.md` (hand-authored)
- `.github/instructions/lares-voice.instructions.md` (hand-authored)
- `.github/ROSTER.md`
- `.claude/settings.local.json`

No `.github/copilot-instructions.md`, no `.github/agents/`, no `.claude/CLAUDE.md`, no `.codex/` directory.

---

## Session 3 — Deployment Target Research

### Finding: AGENTS.md is now a Linux Foundation open standard

`~:confidence[CS],[17]` — AGENTS.md is stewarded by the Agentic AI Foundation under the Linux Foundation. 60k+ repos. Nearest-in-tree wins. VS Code supports via `chat.useAgentsMdFile`. Supported by OpenAI Codex, Copilot coding agent, Gemini CLI, Aider, Cursor, and more.

### Finding: Agent Skills (`SKILL.md`) supersedes 3-platform worker split

`~:confidence[CS],[17]` — `agentskills.io` open standard. Workers live in `.github/skills/*/SKILL.md`. On-demand loading by relevance. Portable across VS Code + Copilot CLI + coding agent without needing per-platform generated variants. This supersedes the old model: `.github/agents/*.agent.md` + `.claude/agents/*.md` + `.codex/agents/*.toml`.

**Consequence:** The `builds.stuffed.failed/` archive model built a compiler pipeline to generate 3 platform variants of each worker. That complexity is no longer necessary. One `SKILL.md` per worker = done.

### Deployment target map (current best practice)

`~:confidence[CS],[16]` — Confirmed deployment paths for this VS Code / GitHub Copilot environment:

| Target type | Path | Load behavior |
|---|---|---|
| Copilot always-on | `.github/copilot-instructions.md` | Every Copilot session — **missing**, needs creation |
| AGENTS.md always-on | `AGENTS.md` (root) | All AGENTS.md-compatible agents |
| AGENTS.md subfolder | `<dir>/AGENTS.md` | Nearest-in-tree wins for subdir scope |
| Path-scoped instructions | `.github/instructions/*.instructions.md` | `applyTo:` glob on each file |
| Worker / skill | `.github/skills/*/SKILL.md` | On-demand by agent relevance — **dir missing**, needs creation |
| Claude Code always-on | `.claude/CLAUDE.md` | Claude Code sessions — **missing**, needs creation |
| Custom agents | `.github/agents/*.agent.md` | User-selectable in VS Code Chat — **dir missing** |

### Recommended simplified pipeline model

`~:confidence[S],[13]` — Replaces the over-engineered `combine_agents.py` approach:

1. **Source** — design material in `lares/**` with confidence tags
2. **Deploy** — a minimal deploy script copies `~:confidence[C],[19]`-tagged modules to the target paths above (or operator does it manually for now)
3. **Version** — committed artifacts; git SHA = content address. No separate versioning layer needed until content is stable enough to warrant it.

Lock content before automating. The old pipeline built the compiler before the source modules were stable.

---

## Pending Actions (Operator Decisions Required)

These are not sprint tasks. They are deployment decisions that need operator go-ahead before any file edits.

| ID | Action | Risk | Status |
|---|---|---|---|
| PA-01 | Strip orphaned header from root `AGENTS.md` | Low — cosmetic but visible | ⏳ awaiting |
| PA-02 | Update `lares/platform/README.md` with deployment target map + simplified pipeline model | Low | ⏳ awaiting |
| PA-03 | Create `.github/copilot-instructions.md` | Medium — new system-wide always-on file | ⏳ awaiting |
| PA-04 | Create `.github/skills/` directory and first `SKILL.md` worker | Medium — new pattern | ⏳ awaiting |
| PA-05 | Create `.claude/CLAUDE.md` | Medium — new system-wide always-on file | ⏳ awaiting |

---

## Sprint 0 Scope Impact

None of the above findings or pending actions affect Sprint 0's task board (URI schema validation). Sprint 0 tasks (S0-01 through S0-07) + the Operator Review Gate (S0-08) proceed independently.

PA-02 (platform README) and PA-04 (SKILL.md workers) touch Sprint 5 territory (Platform Packaging). They are flagged here as pre-existing design decisions to carry forward.

---

## Sources Consulted This Session

- `adr.github.io` — ADR model; Nygard status-on-content pattern
- Anthropic / OpenAI prompt engineering docs — version immutably, build evals, define success criteria first
- `code.visualstudio.com/docs/copilot/customization/agent-skills` — SKILL.md spec, `.github/skills/*/SKILL.md` pattern
- `agents.md/` — Linux Foundation / Agentic AI Foundation stewardship, 60k+ repos, nearest-tree semantics
- `builds.stuffed.failed/agents/AGENTS.md` — prior architecture (discarded model, documented for archaeology)
- Live filesystem audit (terminal) — confirmed actual state vs. claimed state in root `AGENTS.md`

---

## Session 4 — Pre-Sprint Context Audit (for Tasked Spirit Workers)

`~:confidence[C],[19]` — Filesystem + file scan performed 2026-04-08 to prepare Worker reading lists for Sprints 1–4.

### Finding: C and D deep-research reports were not in the sprint backlog

Two source docs in `_todo/core/` existed but were unrouted:

| File | Title (from header) | Lines | Feeds |
|---|---|---|---|
| `_todo/core/C-deep-research-report.md` | URI Stamping and Loader Architecture for Claude Agents | 382 | S1 (crystal URI event fields), S3 (TOML manifest + cache-safety rules) |
| `_todo/core/D-deep-research-report.md` | Invariant-Loading Architecture for Lares Multi-Agent System | 361 | S2 (invariants — companion to A), S3 (fail-closed loader as design constraint) |

C covers: ABNF-like `lar:` URI grammar, cache-safety rules (prefix cache breakpoints), TOML manifest examples, stamping protocol, bootloader, and test plan. Directly useful for S3 registry/schema design and for validating the URI schema promoted in S0.

D covers: structured TOML invariants, HUD event anchors, fail-closed loader pipeline, multi-agent orchestration under Anthropic/OWASP guidance, priority layer table. Companion to A for S2 invariants work — adds OWASP prompt-injection framing A lacks.

**Action taken:** C and D added to relevant backlog rows in `SPRINT_ROADMAP_1_4.md`. Both docs added to reading lists in `lares/schemas/AGENTS.md`, `lares/registry/AGENTS.md`, and `lares/invariants/AGENTS.md`.

### Finding: Systematic broken path references in subdir AGENTS.md files

All `lares/*/AGENTS.md` files that referenced `_todo/core/` source docs used a single `../` prefix (resolving to `lares/<file>`) instead of the correct `../../_todo/core/<file>`. This would have caused Workers to silently fail to find their primary sources.

Broken paths found and fixed:

| File | Was | Now |
|---|---|---|
| `crystal/AGENTS.md` | `../Signal_HUD_Tagspace-draft.md` | `../../_todo/core/Signal_HUD_Tagspace-draft.md` |
| `invariants/AGENTS.md` | `../A_deep-research-report.md` | `../../_todo/core/A_deep-research-report.md` |
| `invariants/AGENTS.md` | `../EP-RA-001.md` | `../../_todo/core/EP-RA-001.md` |
| `invariants/AGENTS.md` | `../TRUST_MODELS.md` | `../../_todo/core/TRUST_MODELS.md` |
| `schemas/AGENTS.md` | `../B_deep-research-report.md` | `../../_todo/core/B_deep-research-report.md` |
| `registry/AGENTS.md` | `../Signal_HUD_Tagspace-draft.md` | `../../_todo/core/Signal_HUD_Tagspace-draft.md` |
| `registry/AGENTS.md` | `../A_deep-research-report.md` | `../../_todo/core/A_deep-research-report.md` |
| `signal/AGENTS.md` | `../Signal_HUD_Tagspace-draft.md` | `../../_todo/core/Signal_HUD_Tagspace-draft.md` |
| `invariants/README.md` | `../EP-RA-001.md` | `../../_todo/core/EP-RA-001.md` |

**Note:** `../signal/`, `../registry/`, `../crystal/`, `../schemas/`, `../platform/` cross-references between `lares/` subdirs remain correct — those paths don't traverse `_todo/`.

### Finding: Stale `builds/agents/` and old sprint numbering in signal/AGENTS.md and signal/README.md

Both files referenced `builds/agents/` as the output target and used the old AE-01–AE-05 sprint numbering. Updated to point to `REFINEMENT_LOG.md` PA-01 through PA-05 (S4 Deployment) and `SPRINT_ROADMAP_1_4.md`.

### Finding: Stale compiler cross-check in schemas/AGENTS.md

Escalation path said `../compiler/` cross-reference. Compiler sprint is gone (4-sprint model). Updated to reference `SPRINT_ROADMAP_1_4.md` S4 Deployment sprint and operator go-ahead as the promotion gate.

### Worker Reading List by Sprint

Compiled for Tasked Spirit Workers entering each sprint:

**S1 — Crystal** (`lares/crystal/`):
- `_todo/core/Signal_HUD_Tagspace-draft.md` (crystal sections only)
- `_todo/core/TODO_Signal_HUD_Crystal_Plan.md` (Epic 5 tracker)
- `lares/sprints/0/URI_SCHEMA.md` (crystal field mapping §7)
- `_todo/core/C-deep-research-report.md` (URI stamping → crystal event URI fields)
- **Resolve Q10 and Q15 before any spec extension**

**S2 — Invariants + Signal HUD** (`lares/invariants/`, `lares/signal/`):
- `_todo/core/A_deep-research-report.md` (primary: 8 `lares.core.*` invariants, priority layers)
- `_todo/core/D-deep-research-report.md` (companion: TOML invariants, fail-closed loader, OWASP framing)
- `_todo/core/EP-RA-001.md` (v3 bidirectional register/mode protocol)
- `_todo/core/TRUST_MODELS.md` (4-tier trust authority caps)
- `_todo/core/TODO_Resolution_Scale_Design.md` (p-band model)
- `_todo/core/Signal_HUD_Tagspace-draft.md` (HUD sections: intent header, micro-trace, HAKABA)
- Kernel `~:confidence[C],[20]` tags (invariants must align; Kernel wins all conflicts)

**S3 — Registry + Schemas** (`lares/registry/`, `lares/schemas/`):
- `lares/sprints/0/URI_SCHEMA.md` (canonical URI anatomy)
- `lares/sprints/0/REGISTRY_CONTRACT.md` (registry stub)
- `_todo/core/A_deep-research-report.md` (RFC 7595 notes; private URI scheme)
- `_todo/core/B_deep-research-report.md` (5 TOML schema types, dual-digest model)
- `_todo/core/C-deep-research-report.md` (TOML manifest examples, ABNF grammar, cache-safety)
- `_todo/core/D-deep-research-report.md` (fail-closed loader as constraint on schemas)
- `lares/README.md` (three-truth model, expanded Promotion Protocol)

**S4 — Deployment** (`lares/platform/`):
- `lares/sprints/0/REFINEMENT_LOG.md` PA-01 through PA-05 (deployment decision queue)
- `lares/sprints/SPRINT_ROADMAP_1_4.md` DEP-01 through DEP-09
- Existing `.github/instructions/*.instructions.md` (two live hand-authored files)
- `_todo/core/PROMPTCRAFT.md` (prompt engineering guidance for deployed content)
