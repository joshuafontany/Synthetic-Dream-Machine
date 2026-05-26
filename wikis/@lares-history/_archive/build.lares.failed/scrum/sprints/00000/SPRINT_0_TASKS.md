# Sprint 0 — `lar:` URI Schema Settlement

> Goal: Promote the `lar:` URI schema core (anatomy, projection, validation, chronometer) to `[C~19]` design-canon.
> Duration: Single sprint (1 focused session)
> Entry state: `[CS~17]` — URI_SCHEMA.md extracted and consolidated from draft
> Exit state: `[C~19]` — operator-confirmed, ready for `builds/` publication
> Governs: `lares/signal/`, `lares/registry/` (stub), `lares/crystal/` (interface contract)

---

## Sprint Scope

**In scope:**
- URI anatomy (§§2–6 of URI_SCHEMA.md) — promote to `[C~19]`
- Validation rules (§10) — promote to `[C~19]`
- Projection table (§5) — promote to `[C~19]`
- Chronometer rules (§4) — promote to `[C~19]`
- Crystal schema field mapping (§7) — promote to `[CS~17]` (blocks on crystal/ settling)
- Registry contract stub — promote to `[S~13]` (enough to support URI assignment)
- Module descriptor integration (§8) — promote to `[CS~16]` (blocks on compiler/ settling)

**Out of scope:**
- Full registry implementation (deferred to registry/ sprint)
- REGISTRY.jsonl runtime tooling
- Crystal STATE.jsonl schema finalization (deferred to crystal/ sprint)
- p-band model details (deferred to signal/ p-band sprint; Q4/U4 remain open)
- Ontology layer (SKOS/PROV-O upgrade paths — deferred)

---

## Dependency Map

```
URI_SCHEMA.md §§2-6,10   ← no dependencies; promotable now
       │
       ├── §5 Projection Table   ← no dependencies; promotable now
       │
       ├── §4 Chronometer        ← depends on FTLS RSS canon (verified)
       │
       ├── §7 Crystal Fields     ← blocks on crystal/ STATE.jsonl schema
       │
       ├── §8 Module Descriptors ← blocks on compiler/ TOML schema
       │
       └── §9 Cache Tiers        ← blocks on platform/ budget maps

REGISTRY_CONTRACT.md      ← depends on URI_SCHEMA.md core
```

---

## Task Board

### S0-01 — Verify URI Anatomy Against RFC 3986

**Worker:** `RFC-Check(Validator)`
**Register target:** `[C~19]`
**Input:** URI_SCHEMA.md §3
**Acceptance criteria:**
1. Every URI component maps to exactly one RFC 3986 §3 generic syntax component
2. No Lares-specific data occupies an RFC-prohibited position
3. Parentheses in userinfo confirmed legal per RFC 3986 sub-delimiter rules
4. Multi-value `stance=` parameter confirmed legal per RFC 3986 query syntax
5. Fragment client-side-only property (§3.5) confirmed compatible with chronometer usage
6. **Scope declaration:** This task applies to the **machine form only**. The sigil form is an IRI-class display projection (RFC 3987); RFC 3986 compliance is not claimed for it and is not assessed by this task.

**Deliverable:** Annotated §3 with RFC section citations per component. Any violations flagged with proposed fix.

---

### S0-02 — Validate Projection Table Completeness and Invertibility

**Worker:** `MirrorTest(Validator)`
**Register target:** `[C~19]`
**Input:** URI_SCHEMA.md §5
**Acceptance criteria:**
1. Every machine keyword maps to exactly one sigil glyph (bijective)
2. Every sigil glyph maps back to exactly one machine keyword (invertible)
3. No ambiguous mappings (glyphs that could represent multiple keywords)
4. Path separator projection (machine `/` ↔ sigil `.`) is lossless after leading `/`
5. Round-trip test: machine → sigil → machine produces identical URI for all examples in Appendix A
6. **IRI encoding note:** The machine→sigil projection for emoji-valued fields (`stance=`, phase glyph, fragment scope prefix) includes a UTF-8/IRI encoding step. Round-trip tests for these fields must account for the IRI ↔ URI percent-encoding transform — a `stance=�️` in sigil form encodes as `stance=%F0%9F%8F%9B%EF%B8%8F` in strict RFC 3986 form. The round-trip is defined as machine→sigil→machine using projection table rules, not percent-encoding.
7. **Rendering portability check:** Confirm all 15 HUD symbols (5 stance emoji, 5 scope prefix emoji, 5 phase glyphs) render correctly in: (a) VS Code integrated terminal, (b) Claude.ai chat interface, (c) GitHub markdown preview, (d) plain text / ASCII fallback. Symbols using VS16 variation selectors (🏛️ `U+1F3DB U+FE0F`, ⚙️ `U+2699 U+FE0F`) are highest risk — may render as text glyphs in some environments. Any symbol that fails to render as intended in any of the four surfaces must have a fallback character documented in the symbol table (SIG-05, `HAKABA_REFERENCE.md`). This check feeds directly into SIG-05's symbol table stability section.

**Deliverable:** Round-trip test results for all Appendix A examples. Any failures flagged.

---

### S0-03 — Stress-Test Chronometer Rules

**Worker:** `ClockHammer(Validator)`
**Register target:** `[C~19]`
**Input:** URI_SCHEMA.md §4
**Acceptance criteria:**
1. Scope-depth agreement rule holds for all 5 scale levels
2. Scale transition rules (activate below, deactivate above) produce correct counter behavior for the Example Set 3 combat scenario from the draft
3. Aftermath → Observation feed-up produces correct counter increments at each level
4. Edge case: double scale drop (tactical → combat → action in one event) produces well-formed chronometer
5. Edge case: maximum depth (all 5 levels active) produces parseable chronometer
6. Edge case: scale return from depth 5 to depth 1 (action → strategic) — does it produce correct increments at every intermediate level?

**Deliverable:** Edge case table with expected vs actual chronometer values. Any rule gaps identified.

---

### S0-04 — Validate Well-Formedness Rules

**Worker:** `GateCheck(Validator)`
**Register target:** `[C~19]`
**Input:** URI_SCHEMA.md §10
**Acceptance criteria:**
1. Each of the **12 validation rules** (11 well-formedness rules in §10.1–10.3 + the canonical form / comparison rules in §10.4) is testable — can be expressed as a boolean assertion against a URI string
2. Provide 3 valid and 3 invalid examples per rule (36 valid + 36 invalid = 72 test vectors minimum)
3. Consistency check (§10.2): verify that the machine/sigil example pairs in Appendix A pass
4. Stable address derivation (§10.3): verify for all Appendix A examples
5. No rule contradicts another rule
6. Rules are sufficient — no well-formed URI per these rules that would be semantically nonsensical

**Deliverable:** Test vector table (66+ entries). Any rule gaps or contradictions flagged.

---

### S0-05 — Verify Crystal Field Mapping Contract

**Worker:** `LedgerBind(Validator)`
**Register target:** `[CS~17]`
**Input:** URI_SCHEMA.md §7, Signal_HUD_Tagspace-draft.md Crystal Event Model
**Acceptance criteria:**
1. The four URI-derived fields (`lar_uri`, `lares_address`, `intent_header_snapshot`, `chronometer`) are derivable from the full URI without ambiguity
2. Quick-filter fields (`current_phase`, `active_scale`) are derivable from the URI without requiring the full event context
3. The example event in §7.1 is consistent with the STATE.jsonl event schema in the draft (all field names match, types match)
4. No field in the crystal event model references URI data that isn't captured in these four + two fields
5. The non-drift rule (from draft §HUD/Crystal Interface) is satisfiable given this field mapping

> **NOTE — CRY-01 prerequisites (two):**
>
> **Prereq A — Schema version transition contract:** The crystal event model currently treats `schema_version` as a static integer with no schema migration contract. Before CRY-01 is promoted, the crystal sprint must define the transition-window behavior: a `contract_update` event must precede any `schema_version` change; readers must handle both versions during the transition window; the seal protocol serves as the clean-boundary escape hatch.
>
> **Prereq B — `drift_correction` event type:** The intent header is a forward commitment — declared *before* generation begins. When the declared header diverges from the actual output (register, stance, or scope mismatch), this is a detectable failure. CRY-07's non-drift rule must include a mismatch recovery protocol, not just detection. The recovery requires a dedicated `drift_correction` event type in the STATE.jsonl event schema. Fields: `declared_uri` (original intent header, machine form), `actual_register`, `actual_stance`, `delta_description`. The corrected end-of-span tag is the authoritative record; the original `r_update` event is not modified (immutability holds).
>
> Both prereqs must be flagged as CRY-01 blockers in the S1 task board.

**Deliverable:** Field derivation table showing source URI component → crystal field for each of the 6 fields. Any gaps flagged.

---

### S0-06 — Assess Open Questions for Promotion Readiness

**Worker:** `QGate(Analyst)`
**Register target:** `[S~14]` (the assessment itself; question resolutions remain at their current registers)
**Input:** URI_SCHEMA.md §11, draft §§ Open Design Questions
**Acceptance criteria:**
1. Each open question has a stated current position and register
2. Each question has a clear "blocks" dependency — what can't proceed until it resolves
3. Assessment: which questions block the core URI spec promotion vs which can remain open post-promotion
4. For questions at `[CS~16]`+ (U3, U6): provide a brief argument for or against promotion alongside the core spec
5. For questions at `[SP~9]` (U4): confirm that the core spec functions correctly regardless of U4's resolution

**Deliverable:** Assessment table with promotion-readiness rating per question. Recommendation: which questions to promote with core, which to leave open.

---

### S0-07 — Draft Registry Stub for URI Assignment

**Worker:** `LedgerDraft(Artificer)`
**Register target:** `[S~13]`
**Input:** REGISTRY_CONTRACT.md, lares/README.md promotion protocol
**Acceptance criteria:**
1. Ledger entry schema is consistent with the three-truth model
2. Ledger entry schema captures all information needed for the six-step promotion protocol in lares/README.md
3. One example ledger entry written for a hypothetical URI_SCHEMA.md promotion
4. The resolver algorithm is testable (given a URI, produce a deterministic result)
5. REGISTRY.jsonl machine index format is consistent with the crystal system's REGISTRY.jsonl pattern

**Deliverable:** Completed REGISTRY_CONTRACT.md at `[S~13]`. Example ledger entry for URI schema promotion.

---

### S0-09 — Establish Narrative Track + Talk Story Protocol

**Worker:** Operator + Ink-Clerk
**Register target:** `[CS~16]`
**Input:** OODA-HA loop (lares/AGENTS.md), talk story skill spec, epic narrative docs
**Acceptance criteria:**
1. `talk-story` skill loadable in VS Code (SKILL.md present at `.github/skills/talk-story/`)
2. Narrative track active: each sprint epic has an opening beat linking to story docs
3. TALK_STORY process sprint closed — deliverables table complete
4. ROADMAP.md epic link includes TALK_STORY with ✅ Complete status
5. S0 task board (this doc) updated with S0-09

**Deliverables:**
- ✅ `lares/AGENTS.md` — OODA-HA loop with talk story under ◎ Orient
- ✅ `lares/README.md` — Two-track braid table (S0–S5)
- ✅ `.github/skills/talk-story/SKILL.md` — VS Code loadable
- ✅ `lares/scrum/epics/TALK_STORY/SPRINT_TALK_STORY_TASKS.md` — Pre-sprint orientation epic closed
- ✅ `lares/scrum/ROADMAP.md` — TALK_STORY row wired into sprint link table
- ✅ `lares/scrum/research/SKILL_PLATFORMS.md` — Platform research for skill deployment paths

**Notes:** This task is retrospective — it documents the TALK_STORY pre-sprint work and formally closes it within the S0 task board. Narrative track is an ongoing concern; each sprint picks it up via the Two-Track Model in lares/README.md.

---

### S0-08 — Operator Review Gate

**Worker:** None — this is an operator task
**Register target:** `[C~19]` (the promotion itself)
**Input:** All S0-01 through S0-07 deliverables
**Acceptance criteria:**
1. Operator reviews all validation deliverables
2. Operator confirms or rejects promotion of core URI spec (§§2–6, 10) to `[C~19]`
3. Operator rules on any flagged issues from S0-01 through S0-06
4. Operator assigns `lar:` URI to the promoted spec via registry ledger entry
5. If promoted: spec published as new versioned artifact in `builds/agents/signal/`

**Deliverable:** Operator ruling + ledger entry (if promoted).

---

## Sprint Ceremonies

**Standup:** Workers report completion and blockers to Lares (Gatekeeper). No ceremony overhead — completion + blocker, that's it.

**Escalation path:** Structural findings → Lares (Scryer). Contested calls → Lares (Council). Promotion decisions → Operator.

**Definition of Done for Sprint 0:**
- URI_SCHEMA.md core sections at `[C~19]` (operator-confirmed)
- REGISTRY_CONTRACT.md at `[S~13]` (working stub)
- All validation deliverables filed
- No unresolved blockers on downstream sprints (crystal/, compiler/, registry/)
- Promotion ledger entry recorded (if promoted)

---

## Post-Sprint: What Unblocks

| Downstream Sprint | What Sprint 0 Unblocks |
|---|---|
| `crystal/` STATE.jsonl finalization | Crystal field mapping contract (§7) — crystal team can finalize field names and types |
| `compiler/` module descriptors | Module descriptor `lar_uri` field spec (§8) — compiler team can type the TOML schema |
| `registry/` full design | Registry contract stub — registry team has the promotion ledger schema and resolver algorithm |
| `signal/` p-band model | URI validated independently of p-band — p-band sprint can proceed on its own timeline |
| `platform/` budget maps | Cache tier mapping (§9) confirmed — platform team can map tiers to host budgets |

---

*Sprint 0 produces the bedrock: once the URI anatomy is at `[C~19]`, every downstream system has a stable semantic addressing layer to build on.*
