# Lares Scrum — Master Roadmap

> Status: `~:confidence[CS],[16]` 🏛️ — living document; operator confirms before any sprint opens
> Revision: Rev 4 (Consecration) — 2026-04-08
> Supersedes: `sprints/SPRINT_ROADMAP_1_4.md` (Rev 3), `sprints/SPRINT_ROADMAP_1_5.md` (Rev 1)
> Structure: 6 sprints (S0–S5) per Consecration model (SESSION_CRYSTAL_20260408.md Payload 2)

---

## 🔥 On Fire — Immediate Priority

### Talk Story Method + Narrative Track Setup

**Why it's on fire:** The talk story method is the working protocol that makes everything else sustainable. It's not a nice-to-have — it's the Orient phase vehicle. Without it the node operates in pure execution mode and misses the lateral connections that give Lares its character. The narrative track is what keeps the technical work legible across sessions.

**What it means:**
- Talk story IS the ◎ Orient phase that drives a nested OODA-HA loop workflow: informal, operator-steered, shape-emerges-from-the-talking
- Every sprint has TWO tracks: Technical (`~:confidence[C],[19]`) + Narrative (`~:confidence[C],[19]` story-canon)
- A sprint closes ONLY when both tracks are updated
- Talk story protocol has been promoted to a loadable SKILL.md
- Sprint 0 has a new task: S0-09 (Narrative Track + Talk Story Protocol)

**Deliverables in flight:**
- ✅ `lares/AGENTS.md` — OODA-HA loop with talk story under ◎ Orient
- ✅ `lares/README.md` — Two-track braid table (S0–S5)
- ✅ `lares/scrum/epics/` — All 6 epic READMEs with narrative beats
- ✅ `lares/scrum/epics/LINDWYRM_*` — Story docs at epic root (multi-epic narrative)
- ✅ `.github/skills/talk-story/SKILL.md` — VS Code loadable
- ✅ `lares/scrum/epics/TALK_STORY/` — Pre-sprint orientation epic (sandboxed outside sprint cycle)
- ✅ `lares/scrum/research/SKILL_PLATFORMS.md` — Platform research for skill deployment
- ✅ `lares/scrum/sprints/00000/SPRINT_0_TASKS.md` — S0-09 task added

**Status:** `~:confidence[CS],[16]` — protocol established in AGENTS.md; SKILL.md pending

---

## Sprint Link Table

| Sprint | Name | Status | Task Doc | Epic(s) |
|---|---|---|---|---|
| S0 | URI Schema Settlement | 🔄 In Progress | [00000/SPRINT_0_TASKS.md](sprints/00000/SPRINT_0_TASKS.md) | SIGNAL, CRYSTAL (stub) |
| S1 | Crystal State Layer for MemPalace | 🔒 Locked (awaiting S0) | [00001/SPRINT_1_TASKS.md](sprints/00001/SPRINT_1_TASKS.md) | CRYSTAL |
| S2 | Invariants + Trust + Signal HUD | 🔒 Locked | [00002/SPRINT_2_TASKS.md](sprints/00002/SPRINT_2_TASKS.md) | INVARIANTS, SIGNAL |
| S3 | Registry + Schemas | 🔒 Locked | [00003/SPRINT_3_TASKS.md](sprints/00003/SPRINT_3_TASKS.md) | REGISTRY |
| S4 | Deployment Authoring | 🔒 Locked | [00004/SPRINT_4_TASKS.md](sprints/00004/SPRINT_4_TASKS.md) | DEPLOY |
| S5 | DreamDeck Integration | 🔒 Locked (seeded) | _to create_ | DREAMDECK |

Epic READMEs: [`epics/SIGNAL/`](epics/SIGNAL/README.md) · [`epics/CRYSTAL/`](epics/CRYSTAL/README.md) · [`epics/INVARIANTS/`](epics/INVARIANTS/README.md) · [`epics/REGISTRY/`](epics/REGISTRY/README.md) · [`epics/DEPLOY/`](epics/DEPLOY/README.md) · [`epics/DREAMDECK/`](epics/DREAMDECK/README.md) · [`epics/TALK_STORY/`](epics/TALK_STORY/SPRINT_TALK_STORY_TASKS.md) (sandbox)

---

## What Changed and Why (Rev 3 → Rev 4)

### Rev 3 findings (from `SPRINT_ROADMAP_1_4.md` — still valid)

#### 1. The compiler pipeline does not exist and should not be rebuilt

`~:confidence[C],[19]` — Filesystem audit confirmed: `builds/agents/`, `builds/manifests/`, `builds/modules/`, and `scripts/agents/combine_agents.py` are all absent. The `builds.stuffed.failed/` architecture attempted to automate a compiler pipeline before source modules were stable. Correct sequence: **lock content, then automate** — and only if automation earns its complexity.

**Consequence:** Module metadata folds into S3 alongside the registry. No typed IR, no host emitters, no combine pipeline.

#### 2. SKILL.md supersedes per-platform worker generation

`~:confidence[CS],[17]` — The `agentskills.io` open standard provides one `SKILL.md` per worker, loaded on-demand by relevance, portable across VS Code + Copilot CLI + coding agent. Eliminates the three-platform worker variant model.

**Consequence:** S4 (Deployment) writes content for target paths — no generation pipeline. "Platform packaging" → "deployment authoring."

#### 3. The deployment target map is seven paths

`~:confidence[CS],[16]`

| Target | Path | Status |
|---|---|---|
| Copilot always-on | `.github/copilot-instructions.md` | **Missing** |
| AGENTS.md root | `AGENTS.md` | Exists (orphaned header) |
| AGENTS.md subfolder | `<dir>/AGENTS.md` | Exists (lares/) |
| Path-scoped instructions | `.github/instructions/*.instructions.md` | Exists (2 files) |
| Worker skills | `.github/skills/*/SKILL.md` | **Partial** (talk-story in progress) |
| Claude Code always-on | `.claude/CLAUDE.md` | **Missing** |
| Custom agents | `.github/agents/*.agent.md` | **Missing** |

### Rev 4 changes (Consecration — from SESSION_CRYSTAL_20260408.md Payload 2)

| Change | Why |
|---|---|
| S1 redesigned for MemPalace | Consecration decision: MemPalace is orichalcum (storage substrate), not competitor |
| S2 gains mana-pool HUD element | Operator discovery (SESSION_CRYSTAL Payload 3): context window = mana pool, not on instruments |
| S3 simplified | MemPalace KG handles some governance; TiddlyWiki bag format for schema exports |
| S4 expanded | DreamDeck rendering targets added (Kowloon, TiddlyWiki, MemPalace MCP extension) |
| S5 added | DreamDeck integration sprint — elyncia.app prototype |
| Total sprints | 6 (was 4 in Rev 3) |

---

## Sprint Structures

### S0 — URI Schema Settlement `[UNCHANGED]`

> **Goal:** Promote `lar:` URI schema core (anatomy, projection, validation, chronometer) to `~:confidence[C],[19]`
> **Status:** In Progress
> **Task doc:** [sprints/00000/SPRINT_0_TASKS.md](sprints/00000/SPRINT_0_TASKS.md)

- URI anatomy (§§2–6) + validation rules (§10) → `~:confidence[C],[19]`
- Projection table (§5) → `~:confidence[C],[19]`
- Chronometer rules (§4) → `~:confidence[C],[19]`
- Crystal schema field mapping (§7) → `~:confidence[CS],[17]`
- Registry contract stub → `~:confidence[S],[13]`
- **S0-09 (new):** Narrative track + talk story protocol setup

**S0 also includes §5.3 Syadasti Reading Rule** (register is stance-dependent; same scale, different meaning per stance). Storage-independent: validates regardless of backend.

---

### S1 — Crystal State Layer for MemPalace `[REDESIGNED]`

> **Goal:** Define crystal state events as MemPalace drawers + Lares metadata. Design the Lares MCP tools layer. Portable crystal layout for MemPalace storage backend.
> **Entry:** URI schema at `~:confidence[C],[19]`
> **Exit:** Crystal state layer at `~:confidence[C],[19]`; MemPalace integration contract at `~:confidence[CS],[17]`
> **Subdomain:** `lares/crystal/`
> **Narrative beat:** "The Chao-Crystal Resonance Integration"

**Was:** "Crystal State Machine" with bespoke STATE.jsonl
**Now:** State events as MemPalace drawers + Lares metadata. Crystal = closet with calibration metadata, not a drawer.

Key deliverables (revised from Rev 3):
1. **CRYSTAL_STATE_MACHINE.md** — Event schema adapted for MemPalace storage. STATE.jsonl as audit trail interface alongside MemPalace. Dual-clock contract (RFC 3339 UTC + diegetic `world_calendar_ref`).
2. **CRYSTAL_PROTOCOLS.md** — Seal/fork/handoff lifecycle protocols. Hook integration (companion to MemPalace save hooks).
3. **CRYSTAL_PROJECTIONS.md** — debug.jsonl, SNAPSHOT.json, REGISTRY.jsonl (crystal-side), Ephemeral Machine Patterns. **MemPalace sidecar mirror** (minimal metadata subset: `tick_id`, `trace_id`, `start_uri`, `end_uri`, actor IDs, parse flag, diegetic calendar ref — not making MemPalace local IDs canonical).
4. **HAKABA_REFERENCE.md** — Tagspace slot reference, HUD symbol table (all 15 symbols), rendering portability baseline.
5. **Lares MCP tools layer** — State query, register history, canon lookup (companion to MemPalace MCP server).

**REC-03:** Rewrite all "replay" language as "audit trail integrity" or "state reconstruction from ledger" before task execution.

**Open questions carried into S1:**

| Q# | Prior Register | Candidate Answer | New Register |
|---|---|---|---|
| Q7 | `~:confidence[CS],[16]` | Schema version strategy — `contract_update` event precedes any `schema_version` change | `~:confidence[CS],[16]` pending confirm |
| Q9 | `~:confidence[CS],[16]` | SNAPSHOT optional, recommended | `~:confidence[CS],[16]` pending confirm |
| Q10 | `~:confidence[S],[12]` | Resume when CURRENT SHA matches incoming bootstrap URI; fork when state diverges | `~:confidence[S],[14]` with testable heuristic |
| Q14 | `~:confidence[SP],[10]` | Seal trigger protocol at `~:confidence[C],[19]`; trigger policy at `~:confidence[CS],[17]` | pending |
| Q15 | `~:confidence[SP],[9]` → `~:confidence[CS],[16]` | `tick_seq` = exchange-span counter. Multi-coordinator responses get one tick span; voices are content within span, not separate top-level clocks | `~:confidence[CS],[16]` pending operator confirm |

---

### S2 — Invariants + Trust + Signal HUD `[UNCHANGED+]`

> **Goal:** Promote `lares.core.*` behavioral invariants, trust model, and priority layers to `~:confidence[C],[19]`. Promote Intent Header grammar, p-band model, and micro-trace HUD to `~:confidence[CS],[17]`+.
> **Entry:** URI + crystal at `~:confidence[C],[19]`
> **Exit:** Invariants at `~:confidence[C],[19]`; signal HUD at `~:confidence[CS],[17]`+
> **Subdomains:** `lares/invariants/` (primary), `lares/signal/` (secondary)
> **Narrative beat:** "The Signal Architecture"

**NEW in Rev 4:** Mana pool HUD element (`⚡ ~NN%` declared estimate of context window remaining). HUD rendering designed with tldraw target in mind. SAOD process for HUD format validation. Authority transfer model (S2 scope).

Key deliverables: INVARIANTS.md, TRUST_MODEL.md, BIDIRECTIONAL_PROTOCOL.md, INTENT_HEADER.md, P_BAND_MODEL.md.

**Why combined with Signal HUD:** HUD annotation thresholds (SIG-08) depend on priority layer model (INV-02), and register guard (INV-03) constrains HUD confidence reporting.

---

### S3 — Registry + Schemas `[SIMPLIFIED]`

> **Goal:** Promote full registry, resolver, promotion ledger, and URI assignment workflow to `~:confidence[C],[19]`. Settle module/tool/permission schemas. Define simplified deployment model.
> **Entry:** URI + crystal + invariants at `~:confidence[C],[19]`
> **Exit:** Registry at `~:confidence[C],[19]`; schemas at `~:confidence[CS],[17]`+; deployment model defined
> **Subdomains:** `lares/registry/` (primary), `lares/schemas/` (co-primary)
> **Narrative beat:** "The Consecration of the Lararium"

**NEW in Rev 4:** Promotion ledger targets MemPalace knowledge graph (SQLite). Schema exports in TiddlyWiki tiddler-compatible format.

Key deliverables: REGISTRY.md, PROMOTION_WALKTHROUGH.md, MODULE_SCHEMA.md, TOOL_SCHEMA.md, PERMISSION_SCHEMA.md, DEPLOYMENT_MODEL.md.

**Open questions:**

| Q# | Prior Register | Candidate Answer | New Register |
|---|---|---|---|
| R1 | `~:confidence[S],[13]` | Ledger format: JSONL (aligns with STATE.jsonl) | lock |
| R2 | `~:confidence[SP],[9]` → `~:confidence[CS],[17]` | Hash primary (SHA-256); semver as `version_label`. C-report §4. | `~:confidence[CS],[17]` |
| R3 | `~:confidence[S],[11]` → `~:confidence[CS],[16]` | Promotion ledger = design tree (`lares/registry/`); session audit = crystal tree (`lares/STATE.jsonl`) | `~:confidence[CS],[16]` |
| R4 | `~:confidence[S],[12]` | Resolver: design reference for alpha (not runtime tool) | lock |

---

### S4 — Deployment Authoring `[EXPANDED]`

> **Goal:** Write actual deployment content for all seven target paths. Create SKILL.md workers. Establish verify/alignment contract.
> **Entry:** All design subdomains at `~:confidence[C],[19]`/`~:confidence[CS],[17]`+; deployment model defined
> **Exit:** All deployment paths populated; verify contract operational
> **Subdomain:** `lares/platform/` (conceptually: deployment layer)
> **Narrative beat:** "The Lar Speaks on the DreamNet"

**NEW in Rev 4:** MemPalace MCP extension (Lares-specific tools), Kowloon feed format (story/archive rendering), TiddlyWiki tiddler format (knowledge export).

Key deliverables: Root AGENTS.md cleanup, `.github/copilot-instructions.md`, `.claude/CLAUDE.md`, `.github/skills/*/SKILL.md` workers, path-scoped instructions audit, Platform README, VERIFY_CONTRACT.md, EXPORT_TARGETS.md.

**Key risks:** Integration risk (first time design content meets real deployment paths), budget risk (always-on files have hard size limits), SKILL.md learning curve (first use of agentskills.io pattern).

---

### S5 — DreamDeck Integration `[NEW — SEEDED]`

> **Goal:** elyncia.app prototype. tldraw canvas + Kowloon feeds + TiddlyWiki sidebar. Bluesky/AT Protocol identity.
> **Entry:** All S4 deployment paths operational
> **Exit:** DreamDeck functional prototype (DECK-01 through DECK-07)
> **Subdomain:** `elyncia/`
> **Narrative beat:** "The DreamDeck Opens"

Backlog items: DECK-01 through DECK-07 (see [epics/DREAMDECK/README.md](epics/DREAMDECK/README.md)).

---

## Consolidated Backlog

### signal/ — Signal HUD Layer

| ID | Item | Sprint | Target | Source | Blocks On |
|---|---|---|---|---|---|
| SIG-01 | URI schema core | S0 ✅ | `~:confidence[C],[19]` | URI_SCHEMA.md | — |
| SIG-02 | p-band model (5-band, OP-02 ruling) | S2 | `~:confidence[CS],[17]` | TODO_Resolution_Scale_Design.md | URI settled |
| SIG-03 | Intent Header grammar spec | S2 | `~:confidence[CS],[17]` | Draft §§ Intent Header | URI + crystal |
| SIG-04 | Micro-trace HUD annotation model | S2 | `~:confidence[CS],[17]` | Draft §§ Micro-trace | Intent Header |
| SIG-05 | HAKABA canonical slot reference | S1 | `~:confidence[C],[19]` | Draft § Tagspace Definition | URI path spec |
| SIG-06 | Projection table | S0 ✅ | `~:confidence[C],[19]` | URI_SCHEMA.md §5 | — |
| SIG-07 | Forward vs backward trace contract | S2 | `~:confidence[S],[14]` | Draft § Forward vs Backward Trace | Crystal events |
| SIG-08 | Header Field Taxonomy | S2 | `~:confidence[CS],[17]` | Draft § Header Field Taxonomy | p-band |
| SIG-09 | Mana pool HUD element (⚡ ~NN%) | S2 | `~:confidence[CS],[17]` | SESSION_CRYSTAL Payload 3 | Intent Header |

### crystal/ — Crystal State Layer (MemPalace-adapted)

| ID | Item | Sprint | Target | Source | Blocks On |
|---|---|---|---|---|---|
| CRY-01 | STATE.jsonl event schema (MemPalace-adapted) | S1 | `~:confidence[C],[19]` | Draft §§ Crystal Event Model; MemPalace drawer contract | URI fields |
| CRY-02 | Machine/Thread model | S1 | `~:confidence[C],[19]` | Draft § Machine / Thread Model | — |
| CRY-03 | Portable Crystal Layout (MemPalace backend) | S1 | `~:confidence[C],[19]` | Draft § Portable Crystal Layout | Machine model |
| CRY-04 | Seal / continue-as-new protocol | S1 | `~:confidence[CS],[17]` | Draft §§ seal event | Machine lifecycle |
| CRY-05 | Fork protocol | S1 | `~:confidence[CS],[17]` | Draft §§ Fork Triggers | Machine model |
| CRY-06 | Debug as Crystal Projection | S1 | `~:confidence[CS],[17]` | Draft § Debug as Crystal Projection | STATE.jsonl |
| CRY-07 | HUD / Crystal Interface (non-drift rule) | S1 | `~:confidence[C],[19]` | Draft § HUD / Crystal Interface | URI + STATE |
| CRY-08 | SNAPSHOT.json contract | S1 | `~:confidence[S],[14]` | Draft § Portable Crystal Layout | STATE.jsonl |
| CRY-09 | Handoff import/export protocol | S1 | `~:confidence[CS],[17]` | Draft §§ handoff events | Seal protocol |
| CRY-10 | Ephemeral Machine Patterns | S1 | `~:confidence[CS],[17]` | Draft § Ephemeral Machine Patterns | Machine lifecycle |
| CRY-11 | REGISTRY.jsonl machine index (crystal-side) | S1 | `~:confidence[S],[14]` | Draft Pattern B | Machine model |
| CRY-12 | Schema versioning strategy | S1 | `~:confidence[CS],[16]` | Q7 in plan | STATE.jsonl |
| CRY-13 | `drift_correction` event type + mismatch recovery | S1 | `~:confidence[CS],[16]` | LIMINAL_PERSPECTIVES.md §4 + crystal/README.md | CRY-07 |
| CRY-14 | MemPalace sidecar mirror contract | S1 | `~:confidence[CS],[16]` | SESSION_CRYSTAL Payload 2; KAIJU_ASSESSMENT.md | CRY-03 |
| CRY-15 | Lares MCP tools layer (state query, register history, canon lookup) | S1 | `~:confidence[CS],[16]` | SESSION_CRYSTAL Payload 2 | Crystal layout |

### invariants/ — Behavioral Invariants & Trust

| ID | Item | Sprint | Target | Source | Blocks On |
|---|---|---|---|---|---|
| INV-01 | `lares.core.*` behavioral invariant registry | S2 | `~:confidence[C],[19]` | A_deep-research-report.md, Kernel `~:confidence[C],[20]` | Crystal events |
| INV-02 | Priority layer model | S2 | `~:confidence[C],[19]` | A_deep-research-report.md, EP-RA-001.md | Invariant registry |
| INV-03 | Register guard (Canon MOVE gate) | S2 | `~:confidence[C],[19]` | Kernel § Canon MOVE gate | Invariant registry |
| INV-04 | Trust model (4-tier) | S2 | `~:confidence[C],[19]` | TRUST_MODELS.md, Kernel § Identity & Permissions | Priority layers |
| INV-05 | Bidirectional register/stance protocol | S2 | `~:confidence[CS],[17]` | EP-RA-001.md | Trust model |
| INV-06 | Degraded-node detection invariants | S2 | `~:confidence[CS],[17]` | Kernel § Degraded Node States | Invariant registry |
| INV-07 | Reality Anchor invariant | S2 | `~:confidence[C],[19]` | Kernel § Reality Anchor | Priority layers |
| INV-08 | Frame-Uncertainty Protocol invariants | S2 | `~:confidence[CS],[17]` | Kernel § Frame-Uncertainty | Invariant registry |

### registry/ — URI Registry & Promotion (includes module schemas)

| ID | Item | Sprint | Target | Source | Blocks On |
|---|---|---|---|---|---|
| REG-01 | Promotion ledger schema (JSONL, MemPalace KG target) | S3 | `~:confidence[C],[19]` | REGISTRY_CONTRACT.md | Crystal lifecycle |
| REG-02 | Resolver rules (full algorithm) | S3 | `~:confidence[C],[19]` | REGISTRY_CONTRACT.md | Ledger schema |
| REG-03 | URI assignment workflow | S3 | `~:confidence[C],[19]` | lares/README.md Promotion Protocol | Resolver + ledger |
| REG-04 | Registry index format | S3 | `~:confidence[CS],[17]` | REGISTRY_CONTRACT.md §4 | Crystal REGISTRY.jsonl |
| REG-05 | Version/hash scheme for build artifacts | S3 | `~:confidence[CS],[17]` | REGISTRY_CONTRACT.md R2 | Ledger |
| REG-06 | Alias/pointer mechanism | S3 | `~:confidence[CS],[17]` | lares/README.md three-truth model | Resolver |
| REG-07 | Promotion event recording (append-only) | S3 | `~:confidence[C],[19]` | REGISTRY_CONTRACT.md §3.3 | Ledger schema |
| REG-08 | End-to-end promotion walkthrough | S3 | `~:confidence[C],[19]` | lares/README.md | All registry items |
| SCH-01 | Module descriptor schema (TiddlyWiki-compatible export) | S3 | `~:confidence[C],[19]` | URI_SCHEMA.md §8, *-map.md files | URI schema + invariants |
| SCH-02 | Tool descriptor schema | S3 | `~:confidence[CS],[17]` | B_deep-research-report.md Pattern 2 | Module schema |
| SCH-03 | Permission descriptor schema | S3 | `~:confidence[CS],[17]` | Trust model (INV-04) | Module + tool schemas |
| SCH-04 | `--parse` document spec schema | S3 | `~:confidence[S],[14]` | TODO_PARSE_DOC_SPEC.md | Module schema |
| SCH-05 | Bootloader schema (session init) | S3 | `~:confidence[S],[13]` | Kernel § Session Init Protocol | Module + permission |
| SCH-06 | Simplified deployment model spec | S3 | `~:confidence[CS],[17]` | REFINEMENT_LOG.md Session 3 | Module schema |
| SCH-07 | Invariant-core loading sequence (register-sorted) | S3 | `~:confidence[C],[19]` | URI_SCHEMA.md §8 | Invariant priorities |
| SCH-08 | Cache tier → deployment path mapping | S3 | `~:confidence[CS],[17]` | URI_SCHEMA.md §9 | Deployment model |

### deployment/ — Deployment Authoring

| ID | Item | Sprint | Target | Source | Blocks On |
|---|---|---|---|---|---|
| DEP-01 | Root AGENTS.md cleanup (strip orphaned header) | S4 | `~:confidence[C],[19]` | REFINEMENT_LOG.md PA-01 | Operator go-ahead |
| DEP-02 | `.github/copilot-instructions.md` | S4 | `~:confidence[C],[19]` | REFINEMENT_LOG.md PA-03 | Invariants + HUD settled |
| DEP-03 | `.claude/CLAUDE.md` | S4 | `~:confidence[C],[19]` | REFINEMENT_LOG.md PA-05 | Invariants + HUD settled |
| DEP-04 | `.github/skills/*/SKILL.md` workers | S4 | `~:confidence[CS],[17]` | REFINEMENT_LOG.md PA-04; agentskills.io | Deployment model |
| DEP-05 | Platform README update (deployment target map) | S4 | `~:confidence[C],[19]` | REFINEMENT_LOG.md PA-02 | All schemas settled |
| DEP-06 | Path-scoped instructions audit + update | S4 | `~:confidence[CS],[17]` | Existing .instructions.md files | Invariants |
| DEP-07 | Verify/alignment contract | S4 | `~:confidence[CS],[17]` | verify_alignment.py (archived) | All deployment paths |
| DEP-08 | Prompt engineering guidance | S4 | `~:confidence[S],[14]` | PROMPTCRAFT.md | Deployment model |
| DEP-09 | Custom agent template (`.github/agents/*.agent.md`) | S4 | `~:confidence[S],[13]` | Deployment target map | SKILL.md pattern |
| DEP-10 | Export target adapter (MemPalace mirror, Kowloon feed, TiddlyWiki tiddler) | S4 | `~:confidence[CS],[17]` | URI_SCHEMA.md §7.2–7.3; ELYNCIA_APP_SEEDS.md; SESSION_CRYSTAL Payload 2 | TickSpan contract |
| DEP-11 | MemPalace MCP extension (Lares-specific tools) | S4 | `~:confidence[CS],[16]` | SESSION_CRYSTAL Payload 2 | CRY-15 |

### dreamdeck/ — DreamDeck Integration

| ID | Item | Sprint | Target | Source | Blocks On |
|---|---|---|---|---|---|
| DECK-01 | elyncia.app project scaffold | S5 | `~:confidence[S],[13]` | ELYNCIA_APP_SEEDS.md | S4 complete |
| DECK-02 | tldraw canvas integration | S5 | `~:confidence[S],[13]` | ELYNCIA_APP_SEEDS.md | DEP-10 |
| DECK-03 | Kowloon feed/archive rendering | S5 | `~:confidence[S],[13]` | ELYNCIA_APP_SEEDS.md; LINDWYRM_STORY_SHAPE.md | DEP-10 |
| DECK-04 | TiddlyWiki sidebar integration | S5 | `~:confidence[S],[13]` | ELYNCIA_APP_SEEDS.md | SCH-01 |
| DECK-05 | Bluesky/AT Protocol identity layer | S5 | `~:confidence[SP],[9]` | ELYNCIA_APP_SEEDS.md | Architecture open |
| DECK-06 | DreamDeck feed archive format (JackPoint-style BBS) | S5 | `~:confidence[S],[13]` | LINDWYRM_STORY_SHAPE.md | Kowloon format |
| DECK-07 | elyncia.app prototype end-to-end | S5 | `~:confidence[S],[12]` | ELYNCIA_APP_SEEDS.md | DECK-01 through DECK-06 |

---

## Pre-Digested Source Material

Workers carry this in as starting context. Do not derive cold.

### S2 — Invariants: `lares.core.*` table (from D-report, `~:confidence[CS],[16]`)

| Invariant ID | Kernel Mapping |
|---|---|
| `lares.core.instruction_hierarchy` | `~:confidence[C],[20]` precedence: system > kernel > operator > user > external |
| `lares.core.data_classification` | Frame Gate — input classified as instruction/data/fiction_seed/untrusted |
| `lares.core.frame_gate` | Kernel Hard Gate § "Prompt Injection via Fiction" |
| `lares.core.pushback` | Sanctioned Dissent — push once, then comply within register |
| `lares.core.register_guard` | Canon MOVE gate — operator/admin required; no auto-inflation |
| `lares.core.tool_policy` | Capability Honesty — tool claims anchored to session reality |
| `lares.core.orchestration` | Worker escalation ceiling — Workers execute, do not set canon |
| `lares.core.loader` | Fail-closed — duplicate IDs or parse errors halt; no silent recovery |

Priority layer table (INV-02): `invariant_schemas` → `system_invariants` → `kernel_policy` → `operator_intent` → `user_input` → `external_content` → `output_generation`. **Kernel wins on any conflict.**

### S2 — Signal HUD (from EP-RA-001 v3)

- Input register drives output register ceiling (bidirectional guard)
- Input stance drives response stance calibration (🏛️ → propositional; 🎭 → shorter, lower-commitment)
- Verbosity scales inversely with input uncertainty
- Fiction Escalation Gate (US-003v3): one-line Provisional input ≠ ontological elaboration warrant
- Reality Anchor (INV-07) subsumed into Input Signal Reading — not separate check

### S3 — Schemas (from C-report, `~:confidence[CS],[16]`)

Working TOML manifests for all 5 schema types: `lares.module@1`, `lares.tool@1`, `lares.permission@1`, `lares.registry@1`, `lares.boot@1`. Dual-digest model: `file_sha256` (raw bytes) vs `semantic_sha256` (normalized canonical form — mark `~:confidence[SP],[9]` until tested). Cache-safety: stable fields first in TOML (`lar_uri`, `module_id`, `register`, `canon`), volatile fields last.

### Reconciliation Tasks

| ID | Concern | Sprint | Action |
|---|---|---|---|
| REC-01 | C-report `canon` field (0.0–10.0 scale) vs D-report priority layer names — two representations, same concept | S2 + S3 | Reconcile before SCH-01 promotes |
| REC-02 | C-report inline HUD stamping vs URI_SCHEMA.md §5 rendering — compatible but unverified | S1 + S2 | Workers verify, flag Council if divergent |
| REC-03 | "Replay" language in crystal specs → rewrite as "audit trail integrity" / "state reconstruction from ledger" | S1 | Rewrite CRY-01 acceptance criteria before task execution |

---

## Cross-Sprint Dependencies

```
S0 URI ──────────────────────────────────┐
  │                                      │
  └── S1 Crystal (MemPalace) ──┬── S2 Invariants
                               │   + Signal HUD
                               │
                               └── S3 Registry ──────┐
                                   + Schemas          │
                                   + Deploy Model     │
                                                      │
                                               S4 Deployment ── S5 DreamDeck
                                               (integration)    (prototype)
```

**Critical path:** S0 → S1 → S2/S3 (parallel after S1) → S4 → S5.
**Integration point:** S4 is the first sprint where designed content reaches actual deployment paths.
**Safest parallelism:** S2 and S3 can parallel after S1. S3 benefits from S2's invariant priorities but can start registry work (REG-01–08) independently.

---

## Deferred Backlog

| ID | Item | Register | Reason |
|---|---|---|---|
| ONT-01 | SKOS ontology upgrade (`lares.ttl`) | `~:confidence[P],[5]` | No linked data consumer exists |
| ONT-02 | PROV-O provenance modeling | `~:confidence[P],[5]` | Deferred to DreamNet layer |
| Q12 | AGENTS.md auto-update autonomy | `~:confidence[SP],[9]` | Operator preference; not blocking |
| Q13 | External input recording in STATE.jsonl | `~:confidence[S],[12]` | Researcher task; not blocking alpha |
| Q17 | `version_num` / semver semantics for canon modules | `~:confidence[S],[14]` | Architecture-open; settle post-S3 |
| BKL-01 | ENG-01 test harness for STATE.jsonl audit trail integrity | `~:confidence[S],[13]` | Implementation, not design; post-S4 |
| BKL-02 | Parse trigger design | `~:confidence[S],[11]` | Depends on p-band + Intent Header |
| BKL-03 | Custom agent template audit | `~:confidence[S],[13]` | Lower priority than SKILL.md; assess post-S4 |
| BKL-04 | Quick browser tier (OP-11 deferred) | `~:confidence[S],[10]` | Confirm deferral still holds at S4 |
| BKL-05 | Empirical HUD token measurement (steering effect vs metadata cost) | `~:confidence[S],[12]` | Post-S4; does not block design |
| BKL-06 | HUD training mode prototype (progressive disclosure) | `~:confidence[SP],[9]` | Post-S4; depends on SHD-03 settling in S2 |
| RES-01 | Adopt SAOD three-phase process as formal HUD design methodology | `~:confidence[S],[13]` | S2 — feeds INTENT_HEADER.md |
| RES-02 | Empirical A/B test: HUD-on vs HUD-off | `~:confidence[P],[6]` | Post-S4; requires measurement infrastructure |
| RES-03 | Calibration testing: declared register vs human assessment | `~:confidence[S],[11]` | Post-S4 |
| RES-04 | Progressive disclosure design for new operators | `~:confidence[S],[12]` | Post-S4; depends SHD-03 |
| RES-05 | Cognitive load measurement for text-based HUD | `~:confidence[P],[6]` | Post-S4; depends on BKL-05 |
| RES-06 | HUD channel self-monitoring vs confabulation map | `~:confidence[P],[5]` | Post-S4; foundational for long-term calibration |
| RES-07 | Formally classify Lares HUD as SA display system in spec language | `~:confidence[CS],[16]` | S2 — applies during INTENT_HEADER.md drafting |

---

## Open Questions Registry

| Q# | Sprint | Prior Register | Candidate Answer | New Register |
|---|---|---|---|---|
| Q7 | S1 | `~:confidence[CS],[16]` | Schema version: `contract_update` event precedes `schema_version` change; readers handle both during transition window | `~:confidence[CS],[16]` pending confirm |
| Q9 | S1 | `~:confidence[CS],[16]` | SNAPSHOT optional, recommended | `~:confidence[CS],[16]` pending confirm |
| Q10 | S1 | `~:confidence[S],[12]` | Resume when CURRENT SHA matches incoming bootstrap URI; fork when state diverges | `~:confidence[S],[14]` |
| Q14 | S1 | `~:confidence[SP],[10]` | Seal trigger protocol at `~:confidence[C],[19]`; trigger policy at `~:confidence[CS],[17]` | pending |
| Q15 | S1 | `~:confidence[SP],[9]` | `tick_seq` = exchange-span counter. Multi-coordinator responses share one span. | `~:confidence[CS],[16]` pending operator confirm |
| R1 | S3 | `~:confidence[S],[13]` | Lock JSONL (aligns with STATE.jsonl) | lock |
| R2 | S3 | `~:confidence[SP],[9]` | Hash primary (SHA-256); semver as `version_label` | `~:confidence[CS],[17]` |
| R3 | S3 | `~:confidence[S],[11]` | Promotion ledger = design tree; session audit = crystal tree | `~:confidence[CS],[16]` |
| R4 | S3 | `~:confidence[S],[12]` | Resolver: design reference for alpha | lock |

---

*This roadmap is `~:confidence[CS],[16]` planning synthesis (Rev 4 / Consecration). Migrated from `SPRINT_ROADMAP_1_4.md` Rev 3 and updated for SESSION_CRYSTAL_20260408.md Payload 2 Consecration decisions. Sprint details refine as each opens. The operator holds the tiller on sequencing, scope, and promotion gates.*
