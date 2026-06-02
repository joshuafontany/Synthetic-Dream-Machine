# Sprint 1 — Crystal State Layer for MemPalace

> Goal: Define crystal state events as MemPalace drawers + Lares metadata. Lares MCP tools layer. Portable crystal layout for MemPalace storage backend.
> Status: `~:confidence[S],[13]` — pre-brief; not yet open
> Entry: URI schema at `~:confidence[C],[19]` (Sprint 0 complete)
> Exit: Crystal state layer at `~:confidence[C],[19]`; MemPalace integration contract at `~:confidence[CS],[17]`
> Subdomain: `lares/crystal/`
> Epic: [CRYSTAL](../../epics/CRYSTAL/README.md)
> Roadmap: [ROADMAP.md](../../ROADMAP.md)
> Narrative beat: "The Chao-Crystal Resonance Integration"

---

## What Changed from Original Scope

**Was:** "Crystal State Machine" with bespoke local STATE.jsonl as primary storage.
**Now (Consecration):** State events as MemPalace drawers + Lares metadata. Crystal = closet with calibration metadata, not a drawer. MemPalace is orichalcum; Lares is the Lar navigating it.

Source: `SESSION_CRYSTAL_20260408.md` Payload 2 + `KAIJU_ASSESSMENT.md` (this folder).

---

## Deliverables

### 1. CRYSTAL_STATE_MACHINE.md `~:confidence[C],[19]`

Core spec — all of the following:

- **STATE.jsonl / TickSpan:** All 11 event types, field definitions, structural constraints, immutability rule. `tick_seq` integrity. Guaranteed `start_uri` / `attractor_uri` / `end_uri` capture per span (CRY-01). Adapted for MemPalace storage: STATE.jsonl as audit trail interface, MemPalace drawers as primary content store.
- **Machine/Thread model:** `machine_id`, 9-status taxonomy, CURRENT pointer, `run_id` (CRY-02)
- **Portable Crystal Layout:** Filesystem contract, file roles, separation rule, shard naming — adapted for MemPalace backend (CRY-03)
- **HUD/Crystal Interface:** Two-part non-drift rule, tick-span contract, operator-first / node-second / destination-last rendering. **Mismatch recovery protocol** — on header/output divergence: node flags delta inline, emits corrected end-of-span tag; STATE.jsonl records correction as authoritative via `drift_correction` event. (CRY-07 + CRY-13)
- **Schema versioning:** `schema_version` field semantics, Q7 resolution (CRY-12). Transition window: `contract_update` event must precede any `schema_version` change; readers handle both versions during window; seal protocol is clean-boundary escape hatch.
- **Dual-clock contract:** RFC 3339 UTC wall-clock (`timestamp`) plus diegetic `world_calendar_ref` + chronometer pair.

**REC-03 (mandatory before execution):** Rewrite ALL "replay" language as "audit trail integrity" or "state reconstruction from ledger." STATE.jsonl is an audit ledger, not a replay mechanism.

### 2. CRYSTAL_PROTOCOLS.md `~:confidence[CS],[17]`

Lifecycle protocols:
- **Seal / continue-as-new:** Shard naming, bootstrap state, trigger conditions (CRY-04)
- **Fork:** Spawn rules, provenance chain, idempotency contracts (CRY-05)
- **Handoff:** Import/export, portable bundle contract — adapted for MemPalace sidecar mirror (CRY-09)
- **Resume:** Idempotency, state matching, `run_id` semantics
- **Hook integration:** Companion protocol to MemPalace save hooks

### 3. CRYSTAL_PROJECTIONS.md `~:confidence[CS],[17]`

Derived surfaces:
- **debug.jsonl:** Enrichment fields, priority rule (STATE > debug), same-`tick_id` linking (CRY-06)
- **SNAPSHOT.json:** Derived-surface contract (CRY-08)
- **REGISTRY.jsonl (crystal-side):** Machine index, 200-line discipline (CRY-11)
- **Ephemeral Machine Patterns:** Nano/Ephemeral/Durable tiers (CRY-10)
- **MemPalace sidecar mirror (CRY-14):** Minimal mirrored metadata subset: `tick_id`, `trace_id`, `start_uri`, `end_uri`, actor IDs, parse flag, diegetic calendar ref. Constraint: MemPalace local IDs are NOT canonical — `tick_id` / `trace_id` are the canonical identifiers.

### 4. HAKABA_REFERENCE.md `~:confidence[C],[19]`

Tagspace slot reference (SIG-05):
- Ha/Ka/Ba field semantics, vocabulary guidance, anti-collision rules
- Coordinate consistency principles (same neighborhood → same address)
- **HUD instrument symbol table (all 15 symbols):** 5 stance emoji, 5 scope prefix emoji, 5 phase glyphs — keyword mapping, stability guarantee, platform rendering notes. These are locked instrument markings: any change is a breaking change, not a schema evolution.
- **Rendering portability baseline:** Document whether each symbol renders in (a) VS Code integrated terminal, (b) Claude.ai chat, (c) GitHub markdown preview, (d) plain text / ASCII fallback. VS16 variation selectors (`🏛️` `U+1F3DB U+FE0F`, `⚙️` `U+2699 U+FE0F`) are highest risk. Fallback characters required for any failures. Feeds S0-02 AC7 carry-forward.

### 5. Lares MCP Tools Layer `~:confidence[CS],[16]`

(CRY-15) Companion to MemPalace MCP server. Tools: state query, register history, canon lookup. Interface contract only at this sprint — implementation is S4 scope.

### 6. AGENTS.md + SPRINT_2_TASKS.md (hand-off)

Update this folder's AGENTS.md. Draft SPRINT_2_TASKS.md pre-brief for Crystal → S2 handoff briefing.

---

## Open Questions to Resolve This Sprint

| Q# | Description | Prior Register | Candidate Answer | Action |
|---|---|---|---|---|
| Q7 | Schema version strategy | `~:confidence[CS],[16]` | `contract_update` event precedes any `schema_version` change; readers handle both during transition window | Operator confirm |
| Q9 | SNAPSHOT optional vs recommended | `~:confidence[CS],[16]` | Optional but recommended | Operator confirm |
| Q10 | Resume vs fork match criteria | `~:confidence[S],[14]` | SHA match on CURRENT = resume; diverge = fork | Council validate + researcher test |
| Q14 | Seal trigger conditions | `~:confidence[SP],[10]` | Define protocol at `~:confidence[C],[19]`; leave trigger policy at `~:confidence[CS],[17]` | Council define protocol |
| Q15 | tick-span contiguity / multi-voice | `~:confidence[CS],[16]` | `tick_seq` = exchange-span counter. Multi-coordinator responses share one top-level `tick_seq`; voices are content within the span, not separate top-level clocks. | Operator confirm |

---

## Pre-Loaded Context

### REC notes (carry in — do not rediscover)

- **REC-02:** Verify C-report inline HUD stamping (where in turn URI appears) does not conflict with URI_SCHEMA.md §5 (how URI renders). Flag Council if divergent.
- **REC-03:** Rewrite all "replay" language before CRY-01 task execution (see above).
- **Q15 candidate:** C-report treats each HUD-stamped turn as having one `start_uri` and one `end_uri`. Operator clarification: each exchange span has `start_uri`, `attractor_uri`, and `end_uri`. Multi-coordinator responses still share one top-level `tick_seq`.

### GlassFloor finding (prospective commitment)

The intent header is declared *before* generation. This creates a forward-commitment contract exposing the automation-surprise failure mode from aviation CRM: when the declared header diverges from actual output, the system must annunciate. CRY-07 must include a mismatch recovery protocol (not just detection), and the `drift_correction` event type (CRY-13) must be in the event schema table. Fields: `declared_uri` (original intent header, machine form), `actual_register`, `actual_stance`, `delta_description`. The corrected end-of-span tag is authoritative; original `r_update` event is not modified (immutability holds). Source: `../00000/LIMINAL_PERSPECTIVES.md` §4.

### Consecration constraint (carry in)

Crystal is the closet with calibration metadata. MemPalace is the drawer system. STATE.jsonl remains as the audit trail interface. Do not rebuild bespoke storage — define the interface contract FOR MemPalace. Source: `KAIJU_ASSESSMENT.md` (this folder), SESSION_CRYSTAL Payload 2.

---

## Backlog Items (this sprint)

CRY-01 through CRY-15, SIG-05. See [ROADMAP.md §crystal backlog](../../ROADMAP.md).

---

## Definition of Done

- CRYSTAL_STATE_MACHINE.md at `~:confidence[C],[19]` (operator-confirmed)
- CRYSTAL_PROTOCOLS.md at `~:confidence[CS],[17]`+
- CRYSTAL_PROJECTIONS.md at `~:confidence[CS],[17]`+
- HAKABA_REFERENCE.md at `~:confidence[C],[19]`
- All Q7/Q9/Q10/Q14/Q15 resolved or formally deferred with documented reason
- No unresolved blockers on S2 (Invariants) or S3 (Registry) entry conditions
- Narrative beat drafted for "The Chao-Crystal Resonance Integration"

---

*Pre-brief status: content migrated from SPRINT_ROADMAP_1_4.md Rev 3 + updated for Consecration (SESSION_CRYSTAL_20260408 Payload 2). Sprint opens when S0 exits at `~:confidence[C],[19]`.*
