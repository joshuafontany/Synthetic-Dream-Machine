# Work Tracking — Lararium MCP Program

Status: **living planning surface; sequence-bound, not calendar-bound**
Cadence assumption: burn-down follows readiness and operator attention, not IRL calendar windows.

---

## Program board

### Now

Sprint-02 closed. Sprint-03 focus:

- remote HTTP/SSE adapter (MCP-STORY-301, MCP-TASK-008)
- auth, scopes, and approval policy (MCP-STORY-302, MCP-TASK-009)
- eval suite for hydration drift (MCP-STORY-501, MCP-TASK-010)
- pranala-edge DAG walk stays on design hold until the base DAG concept settles (MCP-TASK-004 follow-on)

### Next

- security review and operational runbook (MCP-STORY-502)
- hardening gate

### Completed in this pass

- consumed meme law into carrier validation planning
- consumed invariant law into boot/cache planning
- consumed memetic-wikitext primitive law into parser seed planning
- consumed loci law into resolver/tree planning
- consumed `implements` bundles into interface-index planning
- seeded `lares/lararium_mcp/` with resolver, carrier ingress, indexes, resources, and read-only tool façade
- bound the spine to a dependency-light stdio MCP JSON-RPC server
- wrote and committed `BOOT_LOCI_INVENTORY.md` (MCP-TASK-001)
- wrote and committed `EDGE_TAXONOMY.md` (MCP-TASK-002)
- wrote and committed `HYDRATION_ARTIFACT_CONTRACT.md` (MCP-TASK-003)
- wrote and committed `TW_FILTER_BOUNDARY.md` (MCP-TASK-013)
- confirmed `SUBMODULE_INTEGRATION_MATRIX.md` complete (MCP-TASK-011, MCP-TASK-012)
- closed MCP-STORY-101, MCP-STORY-102, MCP-STORY-104, MCP-STORY-105 as done
- built `lares/lararium_mcp/compiler.py` — `compile_minimal_boot`, `compile_full_boot`, `compile_boot_receipt` (MCP-STORY-103, MCP-TASK-004)
- added 26 compiler tests; 35 total tests pass
- wired compiler tools and boot artifact resources into the MCP server
- wired `lararium` server entry into `.mcp.json` (MCP-STORY-201 closed)
- committed `docs/mcp/examples/minimal_boot_example.json` and `boot_receipt_example.json`
- wrote and committed `AST_ENVELOPE.md` (MCP-TASK-015)
- wrote and committed `TW_AST_MAPPING.md` (MCP-TASK-016)
- wrote and committed `PRANALA_ALIGNMENT.md` (MCP-TASK-019)
- closed MCP-STORY-103, MCP-STORY-106, MCP-STORY-201 as done
- fixed prompt naming: renamed `lararium.X` → `lararium-X` to match tool convention (77 tests pass)
- reconciled all story Status fields with backlog truth (SPRINT-02 stories marked done)
- wrote SPRINT-02 exit markers
- added `StaticMapDriftTests` (8 tests) to `test_compiler.py` — guards `_SOCKET`/`_DEPTH` against required-core drift
- created `lares/lararium_mcp/adapters/mempalace.py` — MemPalace sidecar adapter (subprocess + JSON-RPC client, all tool groups) with 14 unit tests
- closed MCP-SUBTASK-007 (mempalace lane) as done

### Later

- expose remote read-only server
- add evals and operations hardening
- expand non-MemPalace adapter lanes after the read-only boundary stays stable

---

## Definitions

### Definition of Ready

A story enters `ready` when:
- scope fits one sprint or less
- parent epic appears
- dependencies appear
- acceptance notes appear
- submodule and grammar implications appear when relevant

### Definition of Done

A ticket reaches `done` when:
- code or docs land in repo
- linked docs update
- source-sensitive claims carry dated references
- submodule touchpoints get named explicitly
- residue becomes a follow-on ticket rather than hidden chat memory

### High-manaoio preference

When two tickets compete, prefer the one that:
- consumes more local repo truth
- closes more ambiguity for the next implementer
- yields a reusable contract, table, or matrix
- keeps operator crossings smaller

---

## Sprint ledger

The sprint IDs now mark ordered work slices, not wall-clock promises.

| Sprint | Theme | Status |
|---|---|---:|
| SPRINT-00 | contraction, inventory, submodule contract, filter boundary | closed |
| SPRINT-01 | hydration compiler + adapter contract + first local read path | closed |
| SPRINT-02 | local stdio slice + three-surface local wiring | closed |
| SPRINT-03 | remote read-only surface + eval start | active-next |
| SPRINT-04 | hardening, runbook, and release prep | follow-on |

---

## Dependency notes

- `MCP-EPIC-01` must settle the submodule contract before adapter work can stop thrashing.
- `MCP-STORY-111` bridges carrier-law planning into the local server spine; MCP transport binding should consume this spine rather than legacy code outside `lares/`.
- `MCP-EPIC-02` depends on both hydration artifacts and the adapter interface.
- `MCP-EPIC-03` waits for read-only local semantics to settle.
- `MCP-EPIC-04` begins local-first.
- `MCP-EPIC-05` starts early for policy framing and closes late.

---

## Risks register

| Risk | Current reading | Response lane |
|---|---|---|
| graph semantics stay under-typed | high | inventory + edge taxonomy + pranala alignment + meme/invariant/memetic-wikitext/loci consume + interface bundles + AST envelope |
| submodule roles stay fuzzy | high | submodule matrix + adapter contract |
| TiddlyWiki runtime scope creeps into v1 | high | direct-import boundary doc |
| client support diverges across platforms | high | tool portability floor + per-client docs |
| write actions arrive too early | medium | read-only v1 gate |
| hydration packets bloat | medium | artifact contract + compaction rules |
| source syntax and runtime graphs stay conflated | high | meme + invariant + memetic-wikitext inventory + AST envelope + execution-graph contract |
| carrier tree and address law stay informal | high | loci-derived tree table + resource namespace map |
| interface composition stays implicit | high | invariant/interface inventory + interface-bundle index |
