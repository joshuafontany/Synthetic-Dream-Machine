# Sprint 2 — Invariants + Trust + Signal HUD

> Goal: Promote `lares.core.*` behavioral invariants, trust model, and priority layers to `~:confidence[C],[19]`. Promote Intent Header grammar, p-band model, and micro-trace HUD to `~:confidence[CS],[17]`+.
> Status: `~:confidence[S],[13]` — pre-brief; not yet open
> Entry: URI + crystal at `~:confidence[C],[19]` (Sprints 0 + 1 complete)
> Exit: Invariants at `~:confidence[C],[19]`; Signal HUD at `~:confidence[CS],[17]`+
> Subdomains: `lares/invariants/` (primary), `lares/signal/` (secondary)
> Epics: [INVARIANTS](../../epics/INVARIANTS/README.md), [SIGNAL](../../epics/SIGNAL/README.md)
> Roadmap: [ROADMAP.md](../../ROADMAP.md)
> Narrative beat: "The Signal Architecture"

---

## Why Combined

The HUD's annotation thresholds (SIG-08) depend on the priority layer model (INV-02), and the register guard (INV-03) constrains HUD confidence reporting. Same sprint prevents cross-sprint stall.

**New in Rev 4 (Consecration):** Mana pool HUD element (`⚡ ~NN%` declared estimate of context window remaining — SIG-09). HUD rendering designed with tldraw target in mind. SAOD process as formal design methodology. Authority transfer model.

---

## Deliverables

### 1. INVARIANTS.md `~:confidence[C],[19]`

- `lares.core.*` behavioral invariant registry — 8 invariants from D-report TOML. Workers **validate against Kernel `~:confidence[C],[20]` tags; do not derive from scratch**.
- Priority layer model (INV-02): 7-layer table from D-report
- Register guard: Canon Promotion gate as formal invariant (INV-03)
- Reality Anchor (INV-07): subsumed into Input Signal Reading per EP-RA-001 v3 — consequence of register calibration on factual claims, not a separate check
- **REC-01 reconciliation:** C-report `canon` field (0.0–10.0 scale) vs D-report priority layer names — resolve mapping before SCH-01 promotes. Two representations, same concept.

### 2. TRUST_MODEL.md `~:confidence[C],[19]`

- Four-tier model: `user(anon)` → `user` → `operator` → `operator(admin)`
- UCAN capability model: additive authority, attenuation, time-bounded
- Trust gate as permission pipeline
- `contract_update` carries authorization tier

### 3. BIDIRECTIONAL_PROTOCOL.md `~:confidence[CS],[17]`

- EP-RA-001 v3: Input Signal Reading + output calibration as paired contract
- Mechanical grounding (all testable assertions):
  - Input register → output register ceiling
  - Input stance → response stance calibration (🏛️ → propositional; 🎭 → shorter, lower-commitment)
  - Verbosity scales inversely with input uncertainty
- Fiction Escalation Gate (US-003v3): one-line Provisional input ≠ ontological elaboration warrant
- Degraded-node detection: testable assertions per failure mode
- Frame-Uncertainty Protocol: three-move invariant chain (INV-08)
- **ATSA model (Gao 2023):** Cite as grounding framework — the Lares dual-tag system is a concrete ATSA (Agent Teaming SA) implementation. No existing deployed system found in literature that does real-time text interaction ATSA. Source: `../research/E-deep-research-report.md` §5.2.

### 4. INTENT_HEADER.md `~:confidence[CS],[17]`

- Format and forward-commitment semantics
- **SA display framing (not XAI):** Header is prospective — declares what the node will do. `--verbose` + STATE.jsonl audit trail are the retrospective XAI layer. Design methodology: Endsley's SAOD, not SHAP/LIME.
- **SAOD three-phase methodology (RES-01):** (1) SA Requirements Analysis via GDTA; (2) SA-Oriented Design Principles (present Level 2 directly; support Level 3 projection; organize by goals; support global SA); (3) SA Measurement and Validation. Reverse-map current HUD through GDTA to verify coverage before finalizing.
- Header Field Taxonomy: per-field thresholds keyed to p-band (SIG-08)
- Forward vs backward trace contract (SIG-07)
- **Channel fidelity note:** Register and stance (semantically interpretable) → higher declaration reliability. Phase and chronometer (procedural/structural) → higher confabulation risk. Source: Ji-An 2025 restricted metacognitive space finding (§3.3 of E-report).
- **SA type coverage:** The Lares HUD covers all three SA types simultaneously (Taskwork SA / Agent SA / Teamwork SA). Most existing AI transparency tools cover only Agent SA. State this explicitly as a design goal.

### 5. P_BAND_MODEL.md `~:confidence[CS],[17]`

- Five-band cumulative attention model
- p ↔ chronometer depth interaction (U4 resolution attempt)
- Micro-trace HUD annotation rules per band
- **Mana pool element (SIG-09, NEW Rev 4):** `⚡ ~NN%` declared estimate of context remaining. `~` prefix mandatory (marks approximation, not live readout). ~4 chars/token, 200k token window. Position: after `| p` in HUD compact form.
- **Cognitive load manager framing (primary function) `~:confidence[CS],[16]`:** p-band is first a cognitive load management control. Aviation HUD research (Lee 2024): excessive HUD symbology creates attentional tunneling. Text stream modality: HUD cost is sequential reading time (not visual complexity), but failure mode is structurally identical — operator reads header token-by-token, loses comprehension anchor for following prose. Lower p = simpler annotation = reduced capture risk.
- **Token budget framing (design assertion to test, not assume):** Higher p → denser annotation → more tokens on HUD metadata. Hypothesis: steering effect offsets metadata cost; net token usage lower with HUD than without. State with test criteria. See BKL-05. Mark `~:confidence[SP],[9]` until measured.

### 6. AGENTS.md + SPRINT_3_TASKS.md (hand-off)

Update this folder's AGENTS.md. Draft SPRINT_3_TASKS.md pre-brief.

---

## Pre-Loaded Context from Research (Workers Start Here)

### From E-deep-research-report.md `~:confidence[S],[14]` — 40+ source synthesis

**Start here for P_BAND_MODEL.md and INTENT_HEADER.md.**

Key sections to load:
- **§1.1** — Endsley three-level SA model
- **§1.2** — SA type mapping (all 7 HUD channels)
- **§1.3** — SAOD three-phase process (feeds INTENT_HEADER.md design methodology)
- **§2** — Prospective vs retrospective transparency (SA display / XAI distinction)
- **§3.3** — LLM metacognitive space (restricted; channel fidelity mapping)
- **§4.1 / §4.3** — Cognitive capture / attentional tunneling; text-stream modality differs from graphical HUD — model as reading-time budget, not visual-complexity score
- **§5.2** — ATSA bidirectional contract (feeds BIDIRECTIONAL_PROTOCOL.md; Agent Teaming SA as grounding framework)

**SA type coverage is novel:** Lares simultaneously covers Taskwork + Agent + Teamwork SA. State as design goal in INTENT_HEADER.md.

### From D-deep-research-report.md `~:confidence[CS],[16]`

8 invariants in TOML form + 7-layer priority table. **Start here for INV-01, INV-02.** Workers validate against Kernel; do not derive.

### From EP-RA-001 v3

Mechanical grounding for HUD annotation thresholds. **Start here for all HUD threshold work.** The bidirectional register/stance protocol is the mechanical foundation of SIG-04, SIG-08.

### From LIMINAL_PERSPECTIVES.md `~:confidence[S],[13]` (this folder, Sprint 0)

Three S2 open decisions that this research surfaces (SHD-01 through SHD-03 in `lares/signal/README.md`):
- p-band/token budget relationship as testable design assertion
- Progressive disclosure / HUD onboarding sequence (feeds SIG-05 and INTENT_HEADER.md)
- 7-channel cognitive load on new operators

---

## Key Sources (read before sprint opens)

| Source | Register | Feeds | Priority |
|---|---|---|---|
| `D_deep-research-report.md` | `~:confidence[CS],[16]` | INV-01, INV-02 | **Start here** |
| `EP-RA-001.md` v3 | `~:confidence[CS],[17]` | INV-05, SIG-04, SIG-08 | **Start here for HUD** |
| `E-deep-research-report.md` | `~:confidence[S],[14]` | P_BAND_MODEL.md, INTENT_HEADER.md | **Start here for both** |
| `A_deep-research-report.md` | `[S:]` | Invariant grounding (not canon) | Secondary |
| `C_deep-research-report.md` | `~:confidence[CS],[16]` | TOML manifest examples (informs INV structure) | Secondary |
| `TRUST_MODELS.md` | — | Trust model | Load |
| `TODO_Resolution_Scale_Design.md` | — | p-band model source | Load |
| Kernel `~:confidence[C],[20]` tags | `~:confidence[C],[20]` | Invariant registry must align; **Kernel wins on conflict** | Always-on |
| `../00000/LIMINAL_PERSPECTIVES.md` | `~:confidence[S],[13]` | SHD-01/02/03, progressive disclosure | Supplemental |

---

## Backlog Items (this sprint)

INV-01 through INV-08, SIG-02 through SIG-04, SIG-07, SIG-08, SIG-09. See [ROADMAP.md §invariants + §signal backlogs](../../ROADMAP.md).

---

## Definition of Done

- INVARIANTS.md at `~:confidence[C],[19]` (operator-confirmed); all 8 `lares.core.*` invariants against Kernel
- TRUST_MODEL.md at `~:confidence[C],[19]`
- BIDIRECTIONAL_PROTOCOL.md at `~:confidence[CS],[17]`+
- INTENT_HEADER.md at `~:confidence[CS],[17]`+; SAOD pass completed
- P_BAND_MODEL.md at `~:confidence[CS],[17]`+; mana pool element + token budget framing included
- REC-01 reconciliation documented
- No unresolved blockers on S3 entry
- Narrative beat drafted for "The Signal Architecture"

---

*Pre-brief status: content migrated from SPRINT_ROADMAP_1_4.md Rev 3 + updated for Consecration (SESSION_CRYSTAL_20260408 Payload 2). Sprint opens when S1 exits at `~:confidence[C],[19]`.*
