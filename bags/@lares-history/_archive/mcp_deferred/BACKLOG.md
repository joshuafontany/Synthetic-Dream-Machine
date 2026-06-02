# Backlog — Lararium MCP Program

Status: **living planning surface; sequence-bound, not calendar-bound**

Legend:
- Status: `todo`, `ready`, `in-progress`, `blocked`, `done`
- Size: `S`, `M`, `L`, `XL`

---

## Epic summary

| ID | Epic | Status | Target sprint | Notes |
|---|---|---:|---|---|
| MCP-EPIC-01 | Hydration Core, Graph Compiler, and Submodule Contract | in-progress | SPRINT-00 / SPRINT-01 / DAG follow-on | core slice closed; DAG redesign follow-on remains |
| MCP-EPIC-02 | Local STDIO MCP Server and Adapters | in-progress | SPRINT-01 / SPRINT-02 / adapter expansion | local server closed; non-MemPalace adapter expansion remains |
| MCP-EPIC-03 | Remote HTTP/SSE Connector Surface | todo | SPRINT-03 | read-only only in v1 |
| MCP-EPIC-04 | Client Integrations and UX | in-progress | SPRINT-02 / SPRINT-03 | local surfaces closed; remote examples remain residue |
| MCP-EPIC-05 | Security, Evals, and Operations | todo | SPRINT-03 / SPRINT-04 | hardening lane |

---

## Story backlog

| ID | Story | Epic | Status | Size | Target sprint |
|---|---|---|---:|---:|---|
| MCP-STORY-101 | Inventory Lararium boot loci, edge classes, and submodule attachments | MCP-EPIC-01 | done | M | SPRINT-00 |
| MCP-STORY-102 | Define hydration artifact contract | MCP-EPIC-01 | done | M | SPRINT-00 |
| MCP-STORY-103 | Implement deterministic closure compiler | MCP-EPIC-01 | done | L | SPRINT-01 |
| MCP-STORY-104 | Define submodule integration contract | MCP-EPIC-01 | done | M | SPRINT-00 |
| MCP-STORY-105 | Define direct-import boundary for TiddlyWiki Filter Language | MCP-EPIC-01 | done | S | SPRINT-00 |
| MCP-STORY-106 | Lock memetic-wikitext and guest-grammar AST envelope | MCP-EPIC-01 | done | M | SPRINT-00 / SPRINT-01 |
| MCP-STORY-107 | Define execution/widget graph contract | MCP-EPIC-01 | done | M | SPRINT-01 |
| MCP-STORY-108 | Define render projection contract for DOM, tldraw, and scene-graph targets | MCP-EPIC-01 | done | M | SPRINT-01 / SPRINT-02 |
| MCP-STORY-109 | Consume meme, invariant, memetic-wikitext carrier trees, and loci law into compiler planning | MCP-EPIC-01 | done | M | SPRINT-00 |
| MCP-STORY-110 | Fold invariant pressure and composable interface bundles into compiler planning | MCP-EPIC-01 | done | M | SPRINT-00 |
| MCP-STORY-111 | Build Lararium MCP read-only carrier spine | MCP-EPIC-01 | done | M | SPRINT-01 |
| MCP-STORY-201 | Expose read-only resources for `lar:///...` and submodule loci | MCP-EPIC-02 | done | L | SPRINT-01 |
| MCP-STORY-202 | Expose hydration prompts | MCP-EPIC-02 | done | M | SPRINT-02 |
| MCP-STORY-203 | Expose portability tools | MCP-EPIC-02 | done | M | SPRINT-02 |
| MCP-STORY-204 | Build submodule adapter layer | MCP-EPIC-02 | done | L | SPRINT-01 / SPRINT-02 |
| MCP-STORY-301 | Deliver remote HTTP/SSE adapter | MCP-EPIC-03 | todo | L | SPRINT-03 |
| MCP-STORY-302 | Add auth, scopes, and approval policy | MCP-EPIC-03 | todo | L | SPRINT-03 |
| MCP-STORY-401 | Wire VS Code / Copilot workspace integration | MCP-EPIC-04 | done | M | SPRINT-02 |
| MCP-STORY-402 | Wire Claude Code local/project scopes | MCP-EPIC-04 | done | M | SPRINT-02 |
| MCP-STORY-403 | Wire Codex local config; keep remote examples as residue | MCP-EPIC-04 | done | M | SPRINT-03 |
| MCP-STORY-501 | Define eval suite for hydration and submodule drift | MCP-EPIC-05 | todo | M | SPRINT-03 |
| MCP-STORY-502 | Document security model and operational runbook | MCP-EPIC-05 | todo | M | SPRINT-04 |

---

## Task backlog

| ID | Task | Parent | Status | Size |
|---|---|---|---:|---:|
| MCP-TASK-001 | Create canonical inventory of boot-critical loci and submodules | MCP-STORY-101 | done | S |
| MCP-TASK-002 | Define edge taxonomy and precedence table | MCP-STORY-101 | done | S |
| MCP-TASK-003 | Draft artifact JSON / markdown contract | MCP-STORY-102 | done | S |
| MCP-TASK-004 | Design closure compiler algorithm | MCP-STORY-103 | done | M |
| MCP-TASK-005 | Implement `resources/list` and `resources/read` | MCP-STORY-201 | done | M |
| MCP-TASK-006 | Design prompt catalog and arguments | MCP-STORY-202 | done | S |
| MCP-TASK-007 | Design tool façade with read-only hints | MCP-STORY-203 | done | S |
| MCP-TASK-008 | Pick remote transport and deployment envelope | MCP-STORY-301 | todo | S |
| MCP-TASK-009 | Define scope minimization policy | MCP-STORY-302 | todo | S |
| MCP-TASK-010 | Build hydration drift eval fixtures | MCP-STORY-501 | todo | M |
| MCP-TASK-011 | Draft submodule integration matrix | MCP-STORY-104 | done | S |
| MCP-TASK-012 | Classify submodule contribution types | MCP-STORY-104 | done | S |
| MCP-TASK-013 | Specify TiddlyWiki Filter Language direct-import boundary | MCP-STORY-105 | done | S |
| MCP-TASK-014 | Design submodule adapter interface | MCP-STORY-204 | done | M |
| MCP-TASK-015 | Draft AST envelope and node schema | MCP-STORY-106 | done | M |
| MCP-TASK-016 | Map TiddlyWiki parse tree and filter grammar into the AST envelope | MCP-STORY-106 | done | S |
| MCP-TASK-017 | Draft execution/widget graph schema | MCP-STORY-107 | done | M |
| MCP-TASK-018 | Draft render projection contract | MCP-STORY-108 | done | M |
| MCP-TASK-019 | Extract pranala family-to-graph-plane alignment table | MCP-STORY-101 | done | S |
| MCP-TASK-020 | Inventory memetic-wikitext primitive cluster and lowering boundary | MCP-STORY-109 | done | S |
| MCP-TASK-021 | Build loci-derived carrier-tree and child-resolution table | MCP-STORY-109 | done | S |
| MCP-TASK-022 | Inventory meme copy-shape, rating posture, and depth-resolution law | MCP-STORY-109 | done | S |
| MCP-TASK-023 | Inventory invariant pressure, cacheability, and sidecar boundary law | MCP-STORY-110 | done | S |
| MCP-TASK-024 | Build implements/interface composability table | MCP-STORY-110 | done | S |
| MCP-TASK-025 | Implement `lar:` resolver for file-backed and virtual roots | MCP-STORY-111 | done | S |
| MCP-TASK-026 | Implement carrier ingress and shape diagnostics | MCP-STORY-111 | done | S |
| MCP-TASK-027 | Materialize carrier, interface, and invariant indexes | MCP-STORY-111 | done | S |
| MCP-TASK-028 | Build read-only resource façade before MCP transport binding | MCP-STORY-111 | done | S |
| MCP-TASK-029 | Seed tool façade for resource-poor clients | MCP-STORY-111 | done | S |

---

## Subtask backlog

| ID | Subtask | Parent | Status |
|---|---|---|---:|
| MCP-SUBTASK-001 | enumerate `AGENTS` required core closure | MCP-TASK-001 | ready |
| MCP-SUBTASK-002 | enumerate Mu child hydration sockets | MCP-TASK-001 | ready |
| MCP-SUBTASK-003 | enumerate Lararium child hydration sockets | MCP-TASK-001 | ready |
| MCP-SUBTASK-004 | compare resource vs prompt vs tool exposure | MCP-TASK-003 | ready |
| MCP-SUBTASK-005 | map VS Code prompt/resource/tool affordances | MCP-TASK-006 | ready |
| MCP-SUBTASK-006 | map OpenAI / Anthropic tool-only constraints | MCP-TASK-007 | ready |
| MCP-SUBTASK-007 | map mempalace contribution lane | MCP-TASK-012 | ready |
| MCP-SUBTASK-008 | map Kowloon and Kowloon client contribution lanes | MCP-TASK-012 | ready |
| MCP-SUBTASK-009 | map Kowloon frontend contribution lane | MCP-TASK-012 | ready |
| MCP-SUBTASK-010 | map tldraw contribution lane | MCP-TASK-012 | ready |
| MCP-SUBTASK-011 | map TiddlyWiki5 filter-language contribution lane | MCP-TASK-012 | ready |
| MCP-SUBTASK-012 | define boot-preserved filter feature set for v1 | MCP-TASK-013 | ready |
| MCP-SUBTASK-013 | capture TiddlyWiki parse-node and module families | MCP-TASK-015 / MCP-TASK-016 | ready |
| MCP-SUBTASK-014 | map guest grammar imports into the AST envelope | MCP-TASK-015 / MCP-TASK-016 | ready |
| MCP-SUBTASK-015 | map widget lifecycle, message, and refresh primitives | MCP-TASK-017 | todo |
| MCP-SUBTASK-016 | compare DOM, tldraw, and scene-graph projection fields | MCP-TASK-018 | todo |
| MCP-SUBTASK-017 | inventory current api/docs pranala families, sockets, and ownership examples | MCP-TASK-019 | ready |
| MCP-SUBTASK-018 | inventory memetic-wikitext primitives, composition law, and boot grammar atoms | MCP-TASK-020 | done |
| MCP-SUBTASK-019 | inventory loci parent-child tree, derived filepaths, and child-item conventions | MCP-TASK-021 | done |
| MCP-SUBTASK-020 | inventory meme copy-shape surfaces, rating postures, and declared-depth states | MCP-TASK-022 | done |
| MCP-SUBTASK-021 | inventory invariant pressure surfaces, cacheability rules, and sidecar boundaries | MCP-TASK-023 | done |
| MCP-SUBTASK-022 | inventory current implements bundles and interface composition patterns | MCP-TASK-024 | done |

---

## Priority queue

1. `MCP-STORY-101` — inventory Lararium boot loci, edge classes, and submodule attachments
2. `MCP-STORY-104` — define submodule integration contract
3. `MCP-STORY-105` — define direct-import boundary for TiddlyWiki Filter Language
4. `MCP-STORY-106` — lock memetic-wikitext and guest-grammar AST envelope
5. `MCP-STORY-107` — define execution/widget graph contract
6. `MCP-STORY-102` — define hydration artifact contract
7. `MCP-STORY-103` — deterministic closure compiler
8. `MCP-STORY-204` — build submodule adapter layer

---

## Promotion notes

The current queue follows a high-manaoio rule:

- inventory before implementation guesswork
- boundary before breadth
- direct repo consume before remote-fashion expansion
- adapter contract before client ornament
