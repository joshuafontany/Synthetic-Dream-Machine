# Roadmap — Lararium MCP Program

Status: **living roadmap; sequence-bound, not calendar-bound**
Planning horizon: **ordered phases, burned down as local truth stabilizes**
Program objective: deliver a production-worthy MCP layer that hydrates the Lararium graph and integrates all current git submodules as core pieces of one coherent system.

---

## North-star outcome

A client asks for Lararium context and receives a deterministic, policy-aware, fully hydrated boot packet built from:
- the canonical `lar:///...` graph
- the current meme, invariant, and memetic-wikitext carrier trees under `packages/lares-core/memes`
- meme copy-shape and rating-posture law
- invariant pressure and cache-stable compression law
- `loci` derivation and address-stability law
- composable `implements` interface bundles
- the current git submodule corpus
- a direct import boundary for TiddlyWiki Filter Language

The client should not need to guess from file adjacency, active-tab luck, or vague prompt ritual.

---

## Working protocol

The roadmap now follows:

- **talk story** for early braid-reading
- **refine-consume** for contract passes
- **high-manaoio promotion** for queue ordering

That protocol should keep the program close to repo truth and away from decorative scope swell.

---

## Crucible decisions

### Keep

- canonical graph resolution
- hydration compiler
- resources + prompts + tools exposure model
- local + remote transport split
- read-only v1 gate
- security / eval / operations lane
- direct TiddlyWiki Filter Language import
- all current submodules inside core program scope

### Cut or defer

- importing full TiddlyWiki runtime as the constitutional center
- write-capable repo mutation in v1
- broad speculative connector work before submodule integration settles
- client-specific prompt hacks that bypass the compiler core

---

## Phase map

### Phase 0 — Contraction / program reset

Sequence slot: **Phase 0 / closed**

Deliverables:
- tightened docs shelf
- talk story / refine-consume protocol
- submodule integration matrix
- direct-import boundary for TiddlyWiki Filter Language
- narrowed backlog and story priorities

Exit signal:
- maintainers can point to one small, sharp statement of what the MCP program will and will not do next

### Phase 1 — Hydration core + submodule contract

Sequence slot: **Phase 1 / mostly closed**

Deliverables:
- graph inventory pass over `AGENTS`, `LARES`, Mu, Lararium, required invariants, meme/invariant/memetic-wikitext carrier trees, and all current submodules
- edge taxonomy for hydration vs adjacency vs docs vs imported guest grammar
- pranala family-to-graph-plane alignment table from current API/docs loci
- meme copy-shape, rating posture, and depth-resolution inventory
- invariant compression, cacheability, and sidecar-boundary inventory
- memetic-wikitext primitive-cluster inventory and lowering boundary
- loci-derived carrier-tree and child-item resolution table
- `implements` interface-bundle and composability table
- AST envelope for memetic-wikitext and admitted guest grammars
- execution/widget graph contract
- deterministic closure algorithm
- `lares/`-native read-only carrier spine
- submodule adapter contract
- compiled artifacts:
  - minimal hydration packet
  - full hydration packet
  - boot receipt
  - closure trace / diff
  - carrier tree index
  - invariant/core pressure index
  - `implements` interface-bundle index
  - `lar:` -> filepath/resource namespace map
  - all-caps virtual namespace reads such as `lar:///INDEXES/**`

Exit signal:
- same entry point yields the same hydration packet and the same submodule attachment set under fixtures
- source -> AST -> execution lowering appears as an explicit contract instead of implied prose
- high-manaoio core actions close before lower-yield remote ornament

### Phase 2 — Local stdio MCP slice

Sequence slot: **Phase 2 / closed local slice**

Deliverables:
- local stdio server
- `resources/list` + `resources/read`
- `prompts/list` + `prompts/get`
- tool façade for portability
- first-class submodule resources and tools
- sandbox-friendly local launch configuration

Exit signal:
- VS Code / Copilot Agent mode can consume Lararium + submodule MCP locally

### Phase 3 — Three-surface local integration

Sequence slot: **Phase 3 / closed local slice**

Deliverables:
- `.vscode/mcp.json` path
- `.mcp.json` / Claude Code path
- Codex config examples
- submodule-aware prompt and tool naming
- per-client constraints documented

Exit signal:
- Copilot, Claude Code, and Codex can consume the same local hydration semantics and the same submodule corpus

### Phase 4 — Remote read-only surface

Sequence slot: **Phase 4 / remote-readiness lane**

Deliverables:
- streamable HTTP or SSE adapter
- auth and scope model
- remote tool filtering and approvals strategy
- remote read-only hydration path for Lararium + submodules
- OpenAI and Anthropic remote notes

Exit signal:
- remote MCP deployment can serve read-only hydration and submodule inspection safely

### Phase 5 — Hardening and operations

Sequence slot: **Phase 5 / hardening lane**

Deliverables:
- security review
- roots / scope / sandbox guidance
- eval suite for hydration drift and degraded states
- observability and logs
- release checklist

Exit signal:
- maintainers can trust the service under ordinary repo evolution and submodule updates

---

## Milestone table

| Milestone | Sequence | Success marker |
|---|---|---|
| M0 — Crucible reset | closed | narrowed program docs and submodule matrix committed |
| M1 — Hydration + submodule contract alpha | closed/contracting | boot packet from `lar:///AGENTS` includes stable submodule attachment model |
| M2 — Local MCP alpha | closed | VS Code can read Lararium and submodule resources locally |
| M3 — Three-client local demo | closed | Copilot + Claude Code + Codex consume the same local MCP |
| M4 — Remote read-only beta | next remote lane | remote server answers hydration and submodule inspection calls |
| M5 — Hardening gate | follow-on | evals, security review, and rollout checklist pass |

---

## Epic lanes

- `MCP-EPIC-01` — Hydration Core, Graph Compiler, and Submodule Contract
- `MCP-EPIC-02` — Local STDIO MCP Server and Adapters
- `MCP-EPIC-03` — Remote HTTP/SSE Connector Surface
- `MCP-EPIC-04` — Client Integrations and UX
- `MCP-EPIC-05` — Security, Evals, and Operations

---

## Known open questions

- Which submodule contribution types should count as mandatory in v1: runtime, schema, UI, fixture, or all of the above?
- How much of the current `pranala` grammar should compile directly into resources, prompts, and tools?
- Which meme copy-shape surfaces should remain carrier-law checks versus lower into explicit AST metadata?
- Which invariant surfaces should remain cache-stable carrier law versus lower into reusable compiler validations?
- Which memetic-wikitext boot primitives should lower directly into host AST node families, and which should remain parser/plugin surfaces?
- Which TiddlyWiki Filter Language features belong in the boot-preserved set for v1?
- Which AST node families belong in the host core, and which should remain guest-grammar extensions?
- Which `pranala` families lower into owned hierarchy, and which remain parallel graph lanes?
- How much of `loci` derivation should surface as MCP resources/templates versus remain internal resolver law?
- How should truthful `implements` bundles compile into capability surfaces, validation, and routing without collapsing interface distinctions?
- Which artifacts should remain generated caches versus live reads?
- Which submodule update events should trigger cache invalidation or hydration recompilation?
