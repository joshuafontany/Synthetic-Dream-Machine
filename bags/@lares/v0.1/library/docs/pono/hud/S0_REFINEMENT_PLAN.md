# Sprint 0 Document Refinement Plan — Refactored

> Register: `Synthesis-Canon 16/20` 🏛️ — concrete refactoring; Chapel Perilous findings locked in
> Date: 2026-04-08 (refactored)
> Purpose: Incorporate research findings from reports E, F, and G into the S0 document set
> Applies to: URI_SCHEMA.md, SPRINT_0_TASKS.md, AGENTS.md, REGISTRY_CONTRACT.md
> Supersedes: Previous revision (centroid~δ notation — REVERTED per F-report)

---

## Revision History

| Rev | Date | Change | Reason |
|---|---|---|---|
| 1 | 2026-04-08 | Initial 5 improvements | Operator-directed refinements |
| 2 | 2026-04-08 | Added centroid~δ notation to §5.3 | Multi-stance register fuzz research |
| 3 | 2026-04-08 | **Partially legacy.** Syadasti reading rule and stance semantics survived; stance-count-as-fuzz did not. | F-report + G-report lineage; live fold now in `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md` |
| 4 | 2026-04-08 | DreamDeck/Kowloon render target formalization (§3.3.1): `@handle@node` canonical identity form, render target taxonomy (`chat-log:post-header` / `hud:exchange-pair` / `record:full`), stance amplitude modifiers (`++`/`+`/(none)/`-`/`--`), territory-first ordering, optional sub-path in templates. | Local session ticks 43–46: story format work surfaced schema gaps |

**Key decisions in this revision:**

- `[DECISION]` centroid~δ notation REVERTED — ⚠️ legacy bridge. The live fold keeps register as a point and marks stance-count-as-fuzz as superseded in `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#legacy-notes`.
- `[DECISION]` Register is stance-dependent (Syadasti/Saptabhangi ground). ♻️ Consumed into `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#reading-question`.
- `[DECISION]` Authority transfer (`--set`, `⊙` indicator) is S2 scope, not S0. Flagged in backlog.

---

## 1. Unified HUD Symbol Table + State Tuple Reading + Syadasti Reading Rule

### Problem

The "character state" of an exchange is spread across three separate spec sections. An operator scanning a live HUD tag reads these three dimensions as a single cognitive state but decoding requires jumping between three sections. Additionally, the spec does not explain *what Register means for each stance* — it treats 0–20 Levels as a universal truth-weight axis, which is inaccurate for non-Philosopher stances.

### URI Structure Decision

The three state fields stay in their current RFC 3986 components. Phase in userinfo (modifies identity), stance in query (parameterizes the signal), scope in fragment (client-side viewpoint). The HUD compact form already consolidates them for display. See revision 1 for full analysis.

### Fix: Add §5.3 — Unified HUD Symbol Table with Three Sub-Sections

Insert after §5.2. Three parts: individual symbol tables, the state tuple reading grid with triangle geometry, and the Syadasti reading rule.

```markdown
### 5.3 Unified HUD Symbol Table

All sigil-form symbols used in the Intent HUD, in one reference.
Workers and operators should not need to cross-reference §3.4,
§4.1, or §5.1 during live use. This table is the instrument panel
legend.

#### 5.3.1 Individual Symbol Sets

**Phase (userinfo — cognitive state of the speaker):**

| Sigil | Machine | OODA-HA State | One-Line Reading |
|---|---|---|---|
| ✶ | `observe` | Observe | Gathering raw signal; no commitment yet |
| ◎ | `orient` | Orient | Making sense of what was gathered |
| ◇ | `decide` | Decide | Choosing a path; fork point |
| ■ | `act` | Act | Committed; executing |
| ○ | `aftermath` | Aftermath | Assessing outcome; feeding upward |

**Stance (query — discourse posture of the claim):**

Consumed into:
- `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud#migrated-hud-anatomy-symbol-table`

**Scope (fragment prefix — active simulation scale):**

| Sigil | Machine | Scale | Duration | One-Line Reading |
|---|---|---|---|---|
| 🗺️ | `@S` | Strategic | ~6 days | The big arc; logistics & navigation |
| ⚙️ | `@O` | Operational | ~4 hours | Watch-level; perception & endurance |
| 🔍 | `@T` | Tactical | ~10 min | Exploration turn; investigation |
| ⚔️ | `@C` | Combat | ~6 sec | Round; immediate response |
| ⚡ | `@A` | Action | Variable | Single action; precision execution |

#### 5.3.2 State Tuple — Reading Three Symbols as One State

The state tuple is the composed reading of Phase × Stance ×
Scope: one sentence describing the node's current condition.

**How to compose:** Read the phase (what cognitive step), the
stance (what kind of claim), and the scope (at what time-scale)
— then merge into a single state sentence.

**The Triangle:** syad-specific multi-stance spread material consumed into `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#multi-stance-boundary`.

**Legacy note:** this archive bridge treated stance count and visual density as a direct fuzz readout. The live fold keeps register as a point and lets the visible array carry simultaneous measures without collapsing them into fuzz arithmetic.

Legacy note: the old Register-Stance Complementarity bridge here also assumed wider spread from more active stances. The live fold does not use that rule.

**Worked readings:**

| Phase | Stance | Scope | State Tuple Reading |
|---|---|---|---|
| ◎ | 🏛️ | 🔍 | Orienting analytically at exploration scale — making sense of a local finding |
| ■ | 🗡️ | ⚔️ | Acting critically in combat — executing under pressure with an edge |
| ◇ | 🏛️🌊 | 🗺️ | Deciding at strategic scale, holding propositional and analogical together. Legacy archive once called this bimodal. |
| ✶ | 🎭 | 🔍 | Observing playfully at tactical scale — light reconnaissance, no commitment |
| ○ | 🏛️ | ⚙️ | Aftermath at operational scale, Philosopher stance — assessing what happened across a watch |
| ◎ | 🏛️🌊🗡️🎭🔮 | 🗺️ | Full Discordian orientation at strategic scale — all five stances active. Maximum Mana cost. Legacy archive once treated the register as a gesture toward center. |

#### 5.3.3 Register Is Stance-Dependent (Syadasti Reading Rule)

**Consumed into**
- `packages/lares-core/memes/v0.1/api/mu/the-syad-perspectives.md#syad-law`
- `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#reading-question`
- `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#saptabhangi`
- `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#stance-endpoints`

**Legacy note:** this plan block preserved a strong derivation and a useful reading question. It also sat beside now-legacy stance-count-as-fuzz planning. The live fold keeps the derivation and marks the fuzz reading as superseded.

**Multi-stance reading:** consumed into `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#multi-stance-boundary`.

**Legacy note:** this archive bridge used intersection / center-of-mass language. The live fold keeps register as a point and lets the visible stance array carry the spread.
```

### Files Changed

- `URI_SCHEMA.md` — add §5.3 with subsections 5.3.1, 5.3.2, 5.3.3 after §5.2

### What This Replaces (centroid~δ REVERTED)

The centroid~δ notation from revision 2 is fully removed:
- No `~δ` suffix on `register` values
- No boundary saturation rules
- No expanded validation pattern in §10.1 rule 8
- No additional test vectors for range-form URIs
- Register is always a point value: `Synthesis 13/20`

---

## 2. "How to Read a HUD Tag" Walkthrough (Appendix B)

### Problem

The spec never shows how to read a complete HUD tag from left to right.

### Fix: Add Appendix B

Annotated full URI + compact form + multi-stance example showing the Syadasti reading rule in action. The multi-stance example demonstrates how `Synthesis 12/20 🏛️🌊🔮` reads differently than `Synthesis 12/20 🏛️` — same number, three evaluation frames.

### Files Changed

- `URI_SCHEMA.md` — add Appendix B after Appendix A

---

## 3. Explicit "Does NOT Test" Per S0 Task

*Unchanged from revision 1.*

| Task | Does NOT Test |
|---|---|
| S0-01 | Sigil form RFC compliance; HUD rendering quality; HAKABA vocabulary semantics |
| S0-02 | Rendering portability (check, not gate); emoji normalization forms |
| S0-03 | Vector clock properties; OODA-HA correctness; real-time sync |
| S0-04 | HAKABA vocabulary quality; validation performance |
| S0-05 | Schema migration (CRY-01); full STATE.jsonl (S1); debug.jsonl mapping (CRY-06) |
| S0-06 | Resolution of open questions; downstream sprint scope |
| S0-07 | Full registry (S3); runtime tooling; `semantic_sha256` (R5) |

### Files Changed

- `SPRINT_0_TASKS.md`

---

## 4. Worked Escalation Example in AGENTS.md

*Unchanged from revision 1.* `ClockHammer(Validator)` example.

### Files Changed

- `AGENTS.md`

---

## 6. HAKABA Word-Count Constraint + Optional Sub-Path Extension

### Problem

The path section specifies three slots (Ha/Ka/Ba) but does not constrain the cardinality of each slot or prohibit multi-word tokens. "uri-schema-question" could be parsed as one slot or three. The spec is silent on sub-territory routing within a named HAKABA (e.g. navigating to a specific section of a territory without declaring a new full HAKABA).

### Fix: Formalize in §3.4

1. **Each slot = exactly one lowercase word.** No hyphens, underscores, or spaces within a slot.
2. **Three-slot combination is mandatory.** No HAKABA with fewer than three populated slots.
3. **Optional sub-path extension** using `/`-separated segments after the three-slot HAKABA. Sub-path segments are free-form routing tokens, not HAKABA slots. They do not carry Egyptian soul semantics.
4. **Stable named graph address strips sub-path:** `lar:///threshold/uncertain/opens` (no sub-path).

```
Record form:  /threshold/uncertain/opens/sub/territory
HUD form:     /threshold.uncertain.opens/sub/territory
Named graph:  lar:///threshold/uncertain/opens
```

### Files Changed

- `URI_SCHEMA.md` — update §3.4 path component semantics

---

## 7. Provisionality Marker Taxonomy (`~`)

### Problem

The URI pair has three structurally distinct provisionality surfaces that are currently undifferentiated. Reading provisionality (node's interpretation of operator), execution provisionality (node's declared intent may not survive contact), and trajectory provisionality (forward-looking closing URI is a prediction) all collapse into the register value — which is wrong because register measures confidence *within a stance's frame*, not interpretation accuracy.

### Fix: Add §3.5 — Provisionality Markers

New section before §4 Chronometer. Documents the three types, the `~` HUD-form convention (component-level, not URI-level), the equivalent record-form `provisional=` query parameter, and the distinction between reading (marks node's interpretation), execution (marks node's declared heading), and trajectory (marks node's prediction — applies to all closing URIs, explicit `~` signals unusual uncertainty).

**Key rule:** The `~` prefix applies only to the specific component it prefixes. `~◎` marks only the phase; `~threshold.uncertain.opens` marks only the HAKABA. Unprefixed components are declared with normal confidence.

### Files Changed

- `URI_SCHEMA.md` — add §3.5 between component semantics and §4 Chronometer

---

## 5. Document Relationship Map (Updated for Research Docs)

```text
URI_SCHEMA.md <---- primary spec being validated
  |
  |-- §5.3 — Unified HUD Symbol Table
  |     |-- §5.3.1 Individual Symbol Sets
  |     |-- §5.3.2 State Tuple + Triangle Geometry + Stance-Count-as-Fuzz
  |     `-- §5.3.3 Syadasti Reading Rule <- NEW (G-report grounded)
  |
  |-- S0-01 through S0-06 validate specific sections
  |
  |-- REGISTRY_CONTRACT.md <--- depends on URI anatomy
  |     `-- S0-07 validates this
  |
  |-- ENCOUNTER_ROLL.md <--- hazards identified pre-sprint
  |
  `-- LIMINAL_PERSPECTIVES.md <--- CRM/HUD reframing

SPRINT_0_TASKS.md <--- task definitions + acceptance criteria
AGENTS.md (this file) <--- Worker behavior rules

Research substrate (informs but does not constrain S0):
  |-- E-deep-research-report.md <--- SA/HUD/SAOD framework
  |-- F-deep-research-addendum.md <--- multi-stance scaling,
  |     authority transfer (centroid~δ REVERTED)
  `-- G_deep_research_meaning.md <--- Sri Syadasti, stance-
        dependent register, session boundary as avaktavya
```

### Files Changed

- `AGENTS.md`

---

## New Backlog Items (Chapel Perilous Harvest)

| ID | Item | Register | Sprint | Source |
|---|---|---|---|---|
| RES-08 | Mana cost table: stance count → register fuzz magnitude | `Synthesis 12/20` | S2 | F-report |
| RES-09 | Authority transfer: `--set` CLI, `⊙` indicator, authority field | `Synthesis 11/20` | S2 | F-report |
| RES-10 | CMD/CWS/Manual mode mapping | `Provisional-Synthesis 9/20` | S2 | F-report |
| RES-11 | 5-stance (full Discordian) config meaning | `Provisional-Synthesis 8/20` | S2 | F-report |
| RES-12 | Syadasti catma as epistemological ground (Kernel) | `Synthesis 13/20` | S2 | G-report |
| RES-13 | Stance semantics: literature-grounded anchors (SyadVoice) | `Synthesis 14/20` | S0 §5.3.3 | SyadVoice |
| RES-14 | HUD as memory prosthetic / grounding artifact (Clark & Brennan) | `Synthesis 12/20` | S1 | BridgeWatch |
| RES-15 | Meaning asymmetry in mutual recognition contract | `Synthesis 11/20` | S2 | G-report |
| RES-16 | Session boundary as avaktavya | `Provisional-Synthesis 9/20` | Deferred | G-report |
| RES-17 | Mana pool / resource state HUD indicator: context window remaining as navigational element | `Synthesis 12/20` 🏛️🌊 | S2 | Local session |
| RES-18 | HAKABA word-count constraint: each slot = exactly one lowercase word; 3-word combination mandatory; optional `/path` sub-extension for within-territory routing. Stable address strips sub-path. | `Synthesis-Canon 16/20` 🏛️ | S0 §3.4 | Local session tick 34 |
| RES-19 | Provisionality marker taxonomy: `~` prefix for reading / execution / trajectory types on operator URI, opening node URI, and closing node URI respectively. HUD-form only; record form uses `provisional=` query param. | `Synthesis-Canon 16/20` 🏛️ | S0 §3.5 | Local session tick 33–34 |
| RES-20 | Kowloon/AP handle form (§3.3.1): `@handle@node` canonical social identity, AP↔lar: URI mapping table, `~node` nomadic convention, render target taxonomy (`chat-log:post-header` / `hud:exchange-pair` / `record:full`), territory-first ordering, `{/optional/path}` in template. | `Synthesis-Canon 16/20` 🏛️ | S0 §3.3.1 | Local session ticks 43–44 |
| RES-21 | Stance amplitude modifiers: `++`/`+`/(none)/`-`/`--` attach directly to preceding stance emoji, no space, per-stance independently. Maps to SDM modifier system. | `Synthesis-Canon 16/20` 🏛️ | S0 §3.3.1 | Local session tick 45 |

---

## Summary

| # | Improvement | Primary Benefit | Files |
|---|---|---|---|
| 1 | HUD Symbol Table + State Tuple + **Syadasti Reading Rule** (§5.3) | 15 sigils + triangle geometry + stance-dependent register | URI_SCHEMA.md |
| 2 | "How to Read a HUD Tag" (Appendix B) | Cold-start decoding; multi-stance example | URI_SCHEMA.md |
| 3 | "Does NOT test" per task | Prevents over-scoping | SPRINT_0_TASKS.md |
| 4 | Worked escalation example | Complete output format | AGENTS.md |
| 5 | Document map (updated) | "Where do I start" -> seconds | AGENTS.md |
| 6 | HAKABA word-count constraint + optional sub-path (§3.4) | Eliminates slot-cardinality ambiguity; enables within-territory routing | URI_SCHEMA.md |
| 7 | Provisionality marker taxonomy `~` (§3.5) | Three-type provisionality surfaces named and differentiated | URI_SCHEMA.md |
| 8 | Kowloon/AP handle form + render target taxonomy (§3.3.1) | Social-layer identity canonized; three render surfaces named | URI_SCHEMA.md, `lar:///ha.ka.ba/@lares/v0.1/docs/story/lindwyrm/dreamdeck-feed-architecture` |
| 9 | Stance amplitude modifiers `++`/`+`/(none)/`-`/`--` (§3.3.1) | Amplitude disambiguation independent of stance-count fuzz | URI_SCHEMA.md, `lar:///ha.ka.ba/@lares/v0.1/docs/story/lindwyrm/dreamdeck-feed-architecture` |

Items 1–5 were additive (no existing content modified). Items 6–9 emerged from story-format work in ticks 34–46 and were applied as schema patches on the same session day. All nine are incorporated in URI_SCHEMA.md; operator confirmation converts to sprint promotion.

---

## What Was Removed (and Why)

| Removed | Why |
|---|---|
| `Synthesis 13/20` with a centroid~δ suffix | Fails beyond 2 stances; stance count already carries the information |
| Boundary saturation rules | No delta arithmetic = no overflow |
| §10.1 rule 8 expanded pattern | Register always a point value |
| 6 centroid~δ test vectors | Not needed |

---

*This plan iterated through three revisions. Each removed something the previous added. The centroid~δ model taught us the right question (how does multi-stance affect register?) and Sri Syadasti's catma — 2,400 years old — provided the right answer: meaning depends on standpoint (syād), and the stance emoji already encode the standpoint. The navigational system that emerged from Chapel Perilous is simpler, truer, and older than what we went in with.*
