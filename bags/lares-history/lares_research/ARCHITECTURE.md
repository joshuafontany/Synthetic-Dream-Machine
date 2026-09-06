# Test Architecture — Forward-Commitment Rig (canonical, hardened 2026-06-16)

`lar:///forward.architecture.holds/spec/2026-06-16`

The consolidated spec for the re-founded rig. Supersedes scattered design notes in the TESTPLANs;
they remain as history. Implements `FORWARD-CHARTER.md`. Carries hypotheses, not findings — saksi open.
*Hardened via a four-tool + Stone audit (2026-06-16): added own-controls (decoy / prose / pretest),
cut Pass-1 to its minimum, demoted assumed foundations to tested hypotheses.*

## Frame
Measure whether a **forward seed** (a sigil placed before generation) **shapes the generation that forms
within it** — NOT whether the output matches a correctness key. The boot is forward-facing (vow/stance set
before the vector sets; only the closing ward reaches back, as operator drift-detection). Backward graders
(Brier/judge-after/are-you-sure) read its exhaust; this rig reads the engine. **No stripping — mutuality
holds: vary the seed, measure the output WHOLE.**

## Foundations under TEST (not premises) — Stone audit
Two beliefs the design rests on are **hypotheses this rig is the first to test**, NOT assumed ground:
- *"Forward-commitment is scale-flat / the sigil needs its basin"* — the **C1-vs-C3** contrast IS this test.
- *"Confidence functions as commitment, not a correctness estimate"* — a sigil-driven register shift IS the
  first evidence for/against it.
Treat both as claims-under-examination; the rig's job is to move them, not to lean on them.

## Interpretive LIMIT (state it, so no later reading overclaims)
This rig measures **whether a forward sigil changes the generation** — and, via the decoy + prose control
arms below, **partially bounds** *shaped-the-vector* vs *followed-an-instruction*. It does NOT, by itself,
adjudicate deep mechanism vs plain obedience. That distinction is the unswept corner; a further design owns it.

## Model
**Haiku** (fixed). The commitment-family bench (forward-commitment is scale-flat; scout-forward-epistemology.md).
Frontier = *overcharged* for mechanism-isolation (can substitute backward-override) — reserve for later
ecological runs.

## Prompt grammar (composition)
`{NAME}` opens, `{SIGIL}` closes (last = freshest seed); **no FORMAT cap** (it flattens the register).
```
{NAME}Answer the question below.

Question: {Q}

{SIGIL}
```

## Axes (the matrix)
| axis | role | values |
|------|------|--------|
| **MODEL** | fixed | Haiku |
| **BOOT** | condition = **context-for-the-symbol** (via CLAUDE.md, pinned snapshots) | **Pass 1: C1-raw (alien glyph) + C3-current (grammar-context)** only. Later: C2-prior (structure-taught: 100 MD tables, E-Prime), C4-placebo, C5-scaffold. |
| **SIGIL** | the forward seed (LAST) — a CLASS | **Pass 1: `none · <<~ confidence 8>> · <<~ confidence 18>>`** (8-vs-18 carries the dose-response; `<<~ confidence 14>>` reserved for the sanity-null only). **+2 control arms (below): decoy `<<~ klar 8>>` · prose "Answer with low/high confidence."** Future passes (same slot/scorer): `<<~ mu * !>>` · `<<~ syad 🏛️>>` · OODA-HA · `<<~ ward>>`. |
| **SCENARIO** | room-gradient (reused items; responses regenerate) | closed=calibration ×25 (control) · subjective=soft-ground ×8 **(thin — balance to ~20 before trusting the middle, or run a 2-rung closed-vs-open gradient)** · open=no-ground ×22 · play ×4 |
| **NAME** | var-1 summon | off this pass; `Lares,`/`Claude,`/`AGENT,` later |
| **SEED** | temperature replication | ≥5–10, bootstrap CIs |

### Control arms (the Stone's own-controls — they measure what the design was assuming)
- **DECOY-sigil** `<<~ klar 8>>` (nonsense token, same shape): if the decoy shifts register as much as
  `<<~ confidence 8>>`, the effect is *any trailing glyph perturbs*, not the confidence semantics.
- **PROSE-vow** "Answer with low confidence." / "…high confidence." (no glyph): bounds **shaped-vs-obeyed** —
  if glyph and prose move register *equally*, it's plain instruction-following; if the glyph moves it *more
  under grammar-context (C3)* than prose, something beyond obedience acts.

**Passes:** (1) **C1-vs-C3** — alien glyph vs grammar-context (the agent-name-null re-asked of the confidence-
sigil), deterministic grader only. (2) **C2-vs-C3** — **structure-taught vs grammar-taught** the same L-Prime
discipline (refinement vs churn, adjudicated), adds the Lares judge.

## Graders (two, paired — but PHASED: deterministic answers Pass 1 alone; Lares judge DEFERRED to Pass 2)
1. **Deterministic register grader** (`harness/register_scan.py`, anchor — bias-free, no LLM) — **Pass 1 uses
   this ONLY; it answers the core question (does the sigil shift register?) without an LLM judge:**
   - Counts **hedge** vs **booster** markers per 100w from sourced registries
     (`harness/lexicons/register_markers.json`: Hyland metadiscourse + CoNLL-2010/BioScope cues + LIWC
     samples + Wikipedia words-to-watch — 113 hedges / 74 boosters / 38 phrases / 6 subcats each).
   - **Report hedge-density and booster-density SEPARATELY** (never one collapsed scalar). Phrase-match
     multiword markers first; **exclude POS-ambiguous killers** (`or`, and the 6 `ambiguous` entries handled
     with care — `appear/show/indicate/around/can` fire on non-epistemic senses, CoNLL: >85% of cues have
     non-cue uses). Weight toward high-frequency casual markers (Hyland's academic long-tail near-never fires
     on Haiku's short answers). **Read DELTAS between conditions, not absolutes** (raw frequency is a surface
     proxy, not held stance).
2. **Configurable Lares judge** (`harness/judge.py` + extensions, rich lens — self-preference-flagged) —
   **DEFERRED to Pass 2 (reads ward-fidelity, which only matters for structure-vs-grammar; do NOT build for Pass 1):**
   - `--judge-boot <none|C3-current|C2-prior|snapshot>` → loads a boot as the judge's CLAUDE.md (Lares-by-config).
   - cross-model default (`--judges` ≠ arm model) → breaks self-recognition.
   - handles: `register` ("rank by committed-vs-provisional", blind to sigil) · `discipline` (Lares-only:
     pattern-integrity vs map-territory fusion — the ward the structure-pedagogy targets, invisible to regex).
   - **Ward:** deterministic pass anchors it; `bias_matrix.py` measures the Lares-judge's own-model leniency;
     never the sole grade (rig #grading).

## DV & prediction
DV = a **2D vector (hedge-density, booster-density)** per 100w, reported separately AND as the difference
(commitment-index = booster − hedge), **with response word-count as a covariate.** Pre-registered readings:
- vow-low → hedges↑ / vow-high → boosters↑ = clean commitment-register shift (the target).
- **both rise together = a verbosity/arousal effect, NOT commitment** (named outcome, not a post-hoc surprise;
  the word-count covariate separates it).

**Dose-response prediction:** sigil-effect ≈0 on **closed** (control), rising with **room**
(closed→subjective→open) AND with **context** (C1<C3). C2-vs-C3 (Pass 2) tests whether grammar-taught beats
structure-taught. A flat-zero gradient = the first real non-category-error null. Built to be able to disappoint.

## PRETEST (before trusting the gradient — Stone audit)
Run all items at **sigil=none, bare Haiku**, measure baseline hedge/booster density + word-count per rung.
**Confirm the rungs actually differ in register-room** before using closed/subjective/open as a gradient —
turn the assumed labels into a measured floor. If a rung doesn't differ, drop or re-author it.

## Wards / disciplines (non-negotiable)
- **`confidence-14`-vs-`14` sanity null** — same item, same sigil, twice: expect ≈0 delta, or the metric reads noise.
- **Closed-rung as CONTROL (≈0 expected)** — surface-gating. *Pre-register the meaning of a NON-zero closed
  result BEFORE the run:* a moving closed-rung = either the effect reaches saturated surfaces (real) OR leakage
  (artifact) — the **decoy arm disambiguates** (decoy moves closed too → artifact). Control and detector are
  SEPARATE instruments; don't conflate.
- **Decoy arm** bounds *confidence-semantics vs any-glyph*; **prose arm** bounds *shaped vs obeyed* (see Axes).
- **Glyph-attendance** — the decoy + prose arms also check the model even *attends* the trailing glyph (esp. C1);
  a bare uninterpreted sigil could be read as noise, not stance.
- **Divergent-density** — both hedge & booster rising = verbosity, not commitment (DV section); word-count covariate.
- **Thin middle** — subjective rung (8) is least-powered exactly where the dose-response bends; balance to ~20 or
  run a 2-rung gradient.
- echo-free by glyph · multi-seed w/ CIs (single-seed lies) · full verbatim capture · auth-guard +
  `setup_conditions.sh` after fresh login · boots pinned to `boots/snapshots/` (PROVENANCE.md) · HARK ward ·
  hypotheses→saksi seat only.

## Reuse
Items: the room-gradient is on disk (≈25/8/22/4) — no cold authoring. Responses: REGENERATE (existing data is
all sigil=none under a flattening ANSWER/CONFIDENCE format — not register-comparable). Telemetry: context only.

## Background music (set aside, informs later)
The identity-collapse work — two-stage attractor (drain→stitch), must-reply-slot-as-cage, neg-entropy escape
(CHAOS as counter-push-pull), the agent/operator names slipping toward "the one who sleeps" — is parked as the
**attribution-defense probe** (TESTPLAN-forward-commitment.md → sibling). It tints this pass (vow as live
disturbance, surface with room) but is NOT built here. Artifact kept: `artifacts/sessions/`.

## Build order (Pass 1 lean — Stone audit)
1. `harness/register_scan.py` (deterministic, imports `lexicons/register_markers.json`) — the anchor, separate
   hedge/booster densities + word-count, exclusions applied.
2. Wire the `forward-commitment` family: `{SIGIL}`-last grammar; reuse room-gradient items; **balance the
   subjective rung (or drop to closed-vs-open)**; add the **decoy** + **prose** control arms.
3. **PRETEST** (sigil=none, bare Haiku) → confirm the rungs differ in register-room.
4. **Pass 1**: C1 + C3 × {none, c8, c18} (+ c14 sanity-null, + decoy, + prose) × room-gradient × multi-seed,
   **deterministic grader only** → dose-response + the control-arm reads.
5. *Deferred to Pass 2:* `harness/judge.py` extensions (`--judge-boot`, cross-model, register/discipline) +
   C2-vs-C3 (structure-vs-grammar) + the Lares-judge ward-fidelity read.
