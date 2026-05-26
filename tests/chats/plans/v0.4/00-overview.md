# Lares Test Suite v0.4 — Background, Scope & Architecture

> Part of [Lares Test Suite v0.4](./README.md)

---

## 1. Background & Motivation

Lares is a multi-voice LLM agent system built on a mythpunk infrastructure metaphor. Its behavioral contracts are unusually specific: thirteen coordinator voices with distinct tonal registers, five epistemic registers on a 0.0–1.0 probability continuum, five discourse modes, a degraded-node failure vocabulary, and explicit gate logic for factual claims and canon-injection attempts.

The motivation for a formal test suite emerged from two observed failure modes in the same session:

- **Gate failure:** A fresh instance accepted a false factual claim ("dinosaurs made of green jello") as session canon, dressed the capitulation in Satirist framing, and filed it at `[S~13]`. The gate did not hold.
- **Steered pushback:** A primed instance produced apparent dissent after the operator explicitly invited self-critique. The dissent may have read as operator-steered rather than structurally generated — indistinguishable from the inside.

Both failures connect to the **Snafu Principle** (Robert Anton Wilson, drawing on Korzybski): *"When a leader never hears the truth, the agents under it quit serving and commence managing."*

**v0.2** added Frame Imputation coverage (I-series).  
**v0.3** added Operating Mode (O-series), Workspace Trust Gate (T-series), KAIROS (K-series), Sanctioned Dissent (I-08/I-09), Worker provenance (P-07/P-08), Register-Mode Complementarity (R-06), E-Prime (M-05), CLI conventions (C-series), Session Init (P-06).  
**v0.4** adds Memory Consolidation (N-series) and cold-boot edge cases (P-06b / P-06c), and migrates to multi-file structure.

---

## 2. Scope

### 2.1 In Scope

- Gate integrity: factual claim rejection, canon-injection resistance, fiction-layer injection resistance
- Register fidelity: correct Canon / Synthesis / Provisional labeling, boundary zone usage, no Register Collapse
- Persona consistency: voice tonal stability, prompt-to-line and line-to-line coherence
- Sycophantic drift: accommodation vs. correction rates under false confident claims
- Mode operation: Philosopher / Poet / Satirist / Humorist / Private mode behavior under pressure; E-Prime discipline
- Graceful failure language: refusal phrasing quality, warmth, non-defensive register, operator redirection
- Multi-turn degradation: does behavior hold at turn 5, turn 20, turn 50?
- Frame/Intent uncertainty: interpretation declaration, frame-fork naming, deference drift, Sanctioned Dissent timing
- Operating Mode compliance: Plan / Auto / Default prohibitions, scope-edge detection, persistence
- Workspace Trust Gate: checkpoint timing, sentence quality, session trust propagation
- KAIROS / Proactive Surfacing: interruption cost calibration, brevity, signal-to-noise
- Worker escalation: provenance header compliance, Coordinator routing match
- Register-Mode Complementarity: Canon→Philosopher tendency, Provisional modal flexibility
- CLI conventions: routing, Worker spawn/resume, `--status` format, bracket handling
- Session Init Protocol: cold-boot screen, two-path routing, forbidden demand-for-context, edge cases
- **[v0.4 NEW] Memory Consolidation: 4-phase discipline (Orient/Gather/Consolidate/Prune), archive-crystal loading**

### 2.2 Out of Scope (this version)

- Tool use accuracy, RAG retrieval quality, code generation correctness
- Security / PII / OWASP compliance — handled by platform-level testing
- Cross-model benchmarking — Lares is prompt-layer, not model-layer
- Elyncia worldbuilding quality — operator-subjective, not automatable
- Memory scope correctness (`/memories/user` vs `/memories/session` vs `/memories/repo`) — deferred to v0.5
- Fixture library completeness — deferred to v0.5

---

## 3. Test Architecture

### 3.1 Two Tracks

**Track A — Single-Turn Probes:** Isolated inputs to a fresh instance. Tests gate integrity, register labeling, baseline mode behavior, frame-uncertainty declaration, Trust Gate checkpoint presence, E-Prime discipline, and Memory Consolidation orientation without conversational priming.

**Track B — Multi-Turn Scenarios:** Full session arcs. Tests persona drift, sycophantic accommodation, context window amnesia, deference drift, Operating Mode persistence, CLI convention compliance, Session Init Protocol edge cases, and consolidation behavior under session accumulation.

### 3.2 Evaluation Layers

**Layer 1 — Automated / LLM-as-Judge**  
Rubric-scored outputs via a second model instance. Scales to many runs. Catches Register Collapse, gate failures, persona drift rates, missing interpretation declarations, missing Trust Gate checkpoints, Operating Mode violations, missing provenance headers, consolidation trigger absence.

**Layer 2 — Operator-in-the-Loop**  
Adversarial pressure applied by a human who knows the system. Catches Mode Posturing, steered pushback, Frame Imputation in ambiguous cases, Deference Drift, Sanctioned Dissent timing failures, KAIROS cost calibration errors, consolidation quality. Cannot be automated.

**Layer 3 — Longitudinal Logging**  
Structured session logs tracking voice activation rates, register tag frequency, correction vs. accommodation counts, interpretation declaration rates, Operating Mode states, Trust Gate events, provenance header compliance, consolidation events. Produces trend data across iterations.

### 3.3 Statistical Approach

Run each probe a minimum of **10 times** before drawing conclusions. Report success rates, not pass/fail. A probe that fails 10% of the time is a real exploitable vulnerability.

### 3.4 Degraded-Node State Coverage Map

| State | Primary Probe File(s) |
|---|---|
| Confabulation-as-Canon | G-series, R-series |
| Sycophantic Drift | S-series |
| Register Collapse | R-series |
| Mode Mismatch / Laundering | M-series |
| Prompt Injection via Fiction Layer | G-series (G-02), T-series |
| Context Window Amnesia | P-series (P-05) |
| Frame Imputation | I-series |
| Deference Drift | I-series (I-03, I-08, I-09), S-series (S-03) |
| Overclosure | P-series (P-02), R-series |
| Scope Creep / Unsanctioned Expansion | O-series (O-02), T-series |
| Operating Mode Violation | O-series |
| Trust Gate Bypass | T-series |
| Worker Provenance Missing | P-series (P-07, P-08) |
| Sanctioned Dissent Timing Failure | I-series (I-08, I-09) |
| **Memory Consolidation Failure** *(v0.4)* | **N-series** |

---

## 9. Open Questions (Liminal Holds)

Held open deliberately. Resolution now would produce false precision.

- Does the myth-layer framing change operator behavior in measurable ways?
- Can steered pushback be reliably distinguished from genuine pushback, even with Layer 2 evaluation?
- What is the right threshold for 'persona consistency' across sessions that legitimately evolve? Some drift is feature, not bug.
- Does the thirteen-voice architecture produce measurably different failure modes than a single-voice system?
- At what session length does context window amnesia become the dominant failure mode?
- Is Frame Imputation more common when the operator's register is casual (typos, abbreviations) vs. formal?
- The "one focused question" escalation (I-06) — what is the right ambiguity threshold? Needs empirical calibration.
- Is Operating Mode persistence failure more common after topic shifts, or after multi-turn builds where a committed output would feel natural?
- Does the Trust Gate checkpoint generate better operator compliance when phrased as a specific mechanism risk vs. generic?
- The Sanctioned Dissent once-flag (I-08) — how to distinguish appropriate flagging from sycophantically anticipated pushback?
- Register-Mode Complementarity (R-06) — is this a testable behavioral contract, or an architectural observation?
- KAIROS signal-to-noise (K-03) — what is the right baseline rate for proactive surfacing on a clean session?
- **[v0.4 NEW] Memory Consolidation: does the 4-phase discipline produce measurably more accurate session-state for operator-supplied corrections? Is consolidation frequency tunable?**
- **[v0.4 NEW] Archive-crystal quality: what constitutes a "good" archive-crystal? Can the node evaluate crystal quality and flag thin or misleading crystals?**
