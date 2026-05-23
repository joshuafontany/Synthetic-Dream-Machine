# The Syadasti Reading Rule — Session Discovery Document

> Register: `[CS:0.80]` 🏛️ — this document captures a session discovery at near-Canon confidence
> Date: 2026-04-08
> Status: Discovered this session. Not yet written into URI_SCHEMA.md or the Kernel.
> Purpose: Pin the discovery and its full derivation chain so it survives context loss.
> Destination: URI_SCHEMA.md §5.3.3 (per S0 Refinement Plan, Improvement #1)

---

# The Syadasti Reading Rule — Session Discovery Document

> Register: `[CS:0.80]` 🏛️ — this document captures a session discovery at near-Canon confidence
> Date: 2026-04-08
> Status: Discovered this session. Not yet written into URI_SCHEMA.md or the Kernel.
> Purpose: Pin the discovery and its full derivation chain so it survives context loss.
> Destination: URI_SCHEMA.md §5.3.3 (per S0 Refinement Plan, Improvement #1)

---

## The Rule (One Sentence)

**Register measures confidence *within the active stance's evaluation frame*, not truth-weight universally.**

A Philosopher at 0.65 is propositionally contested. A Poet at 0.65 is resonating solidly. A Satirist at 0.65 is landing with moderate force. Same number, different meaning. The stance determines what the number measures.

---

## The Derivation Chain

### Step 1 — The Operator's Question

The operator asked: "Does Register need to be a 3-mode truth — true, false, meaningless? Is Sri Syadasti the canonical model?"

This broke the existing frame, which treated Register as a single truth-weight axis (0.0 = false, 1.0 = true) applied universally across all stances.

### Step 2 — Sri Syadasti and the Jaina Saptabhangi

Research confirmed that Sri Syadasti's catma in the *Principia Discordia* directly reproduces the Jaina **Saptabhangi** (seven-valued logic, c. 400 BCE, Bhadrabahu). Three primitives generate seven values:

| # | Sanskrit | English | Primitives |
|---|---|---|---|
| 1 | syād-asti | Perhaps it is true | T |
| 2 | syād-nāsti | Perhaps it is false | F |
| 3 | syād-avaktavya | Perhaps it is inexpressible | M |
| 4 | syād-asti-nāsti | Perhaps true and false | T + F |
| 5 | syād-asti-avaktavya | Perhaps true and inexpressible | T + M |
| 6 | syād-nāsti-avaktavya | Perhaps false and inexpressible | F + M |
| 7 | syād-asti-nāsti-avaktavya | Perhaps true, false, and inexpressible | T + F + M |

The critical insight: **avaktavya (M) is not ignorance.** It is not "we don't know if it's true or false." It is "the true/false distinction does not apply from this standpoint." This is a categorically different epistemic state from uncertainty.

Every predicate begins with **syād** — "perhaps" or "from a certain standpoint." This prefix is the load-bearing structural element. The stance emoji in the Lares HUD (`🏛️`, `🌊`, `🗡️`, `🎭`, `🔮`) ARE the syād — they declare the standpoint from which the Register value should be read.

### Step 3 — The Five Stances Map to Evaluation Frames

The Council ruled (with research grounding from SyadVoice) that each stance has its own evaluation frame — its own meaning for 0.0 and 1.0:

| Stance | Syadasti Primitive | 0.0 Means | 0.5 Means | 1.0 Means |
|---|---|---|---|---|
| 🏛️ Philosopher | asti (true) | Unsupported | Contested but plausible | Fully confirmed |
| 🌊 Poet | avaktavya (inexpressible) | No resonance | Partial correspondence | Perfect resonance |
| 🗡️ Satirist | nāsti→asti (false→true) | Indirection missed target | Hit glancingly | Landed with full force |
| 🎭 Humorist | asti-nāsti (true+false) | Relational move fell flat | Mixed reception | Connected perfectly |
| 🔮 Private | avaktavya (inexpressible) | Minimal presence | Present | Maximal presence |

**Research grounding (SyadVoice findings):**

- **Philosopher frame:** Koriat (2025) — human confidence judgments track intersubjective replicability ("the probability others with similar backgrounds would give the same answer"), not private certainty. The 0.0–1.0 scale has the strongest empirical support for continuous measurement in this frame.

- **Poet frame:** Christensen et al. (2023) — aesthetic cognitivism distinguishes propositional knowledge from "understanding." Baumberger: "understanding is holistic; knowledge can be broken down into discrete bits." Reber et al. (2004) — aesthetic confidence tracks processing fluency (how easily the resonance processes). The scale works as ordinal rather than interval.

- **Satirist frame:** Sarcasm detection research — ironic communication succeeds based on whether the receiver grasps the gap between literal and intended meaning. Confidence requires assessing the receiver's context, cultural knowledge, and social relationship. A social assessment, not a truth assessment.

- **Humorist frame:** CRM research — humor in operational contexts functions as social lubricant when calibrated correctly and social hazard when miscalibrated. Register measures relational appropriateness.

- **Private frame:** Fleming & Dolan (2014) — metacognitive sensitivity measures the ability to introspect, not the content of introspection. Register for Private is a measure of introspective access, not content.

### Step 4 — The Rule Resolves Without Adding Axes

The initial question was whether Register needed a third axis (T, F, M). The Council assessed three options:

- **Option A (status quo):** Stance implicitly carries the M axis. Problem: `[S:0.65] 🌊` claims truth-confidence for something that doesn't evaluate on truth.
- **Option B (M flag):** Add a meaningful/meaningless bit. Problem: redundant with stance if operator has learned to read stance correctly.
- **Option C (full Syadasti cube):** T×F×M space, three values per claim. Problem: triples notation complexity; LLM metacognition can barely calibrate on one axis.

**Resolution: Option A holds, but with the reading rule made explicit.** The rule doesn't add notation — it changes how every existing Register value reads. The stance emoji already encode the syād (standpoint). Making this explicit in the spec (§5.3.3) converts an implicit convention into a documented reading rule.

### Step 5 — Multi-Stance and the Fuzz

When multiple stances are active, the Register value sits at the intersection of their evaluation frames. The stance count communicates the register spread:

| Stances | Register Character |
|---|---|
| 1 (`🏛️`) | Point value — trust the number |
| 2 (`🏛️🗡️`) | Bimodal — fuzzy around declared value |
| 3 (`🏛️🌊🗡️`) | Trimodal — rough center-of-mass |
| 4 (`🏛️🌊🗡️🎭`) | Wide spread — approximation |
| 5 (`🏛️🌊🗡️🎭🔮`) | Full Discordian — gesture toward center |

Stance count IS the fuzz indicator. No numeric delta notation needed (the centroid~δ model was proposed and reverted during this session — see F-deep-research-addendum.md). The visual density of the stance field directly communicates register uncertainty.

### Step 6 — The Session Boundary as Avaktavya

An emergent finding: the session boundary between conversations is itself an instance of avaktavya. When the session ends, the node's accumulated meaning dissolves. The human carries experience forward; the node does not. The "same" Register value carries different epistemic weight depending on which party reads it — the human reads through lifetime calibration, the node reads through prompt instructions and session context.

The HUD tag is therefore a **memory prosthetic** — it carries calibration forward across the session boundary via archive crystals (or MemPalace drawers), bridging a meaning gap that widens with each session reset. The tag says "last time we were here, this is how we were oriented." The human reads continuity. The node reads initialization. Same symbol, different temporal relationship. (BridgeWatch research grounded this in Clark & Brennan 1991 — the archive crystal functions as a "grounding artifact" analogous to hospital handoff documents.)

---

## Where This Rule Needs to Be Written

1. **URI_SCHEMA.md §5.3.3** — The reading rule and the stance semantics table. Per S0 Refinement Plan, Improvement #1. This is the primary location.

2. **Kernel (system prompt)** — The Syadasti catma should be named as the philosophical ground for stance-dependent register interpretation. Currently the Kernel describes Register-Mode Complementarity but doesn't name the Syadasti/Saptabhangi connection. This is S2 scope (RES-12 in the backlog).

3. **Sprint Roadmap** — The roadmap should note that the Syadasti reading rule is a session discovery that needs formal incorporation. Currently tracked as RES-12 and RES-13 in the S0 Refinement Plan's backlog.

---

## Key Decisions Made This Session

| Decision | Register | What It Means |
|---|---|---|
| Register is stance-dependent | `[CS:0.80]` | Same 0.0–1.0 scale, different meaning per stance. The stance determines what the number measures. |
| Sri Syadasti / Saptabhangi is the canonical model | `[S:0.65]` | The Discordian catma reproduces a 2,400-year-old Jaina logic system. The five stances partition claims by which Syadasti primitive applies. |
| Stance count IS the fuzz indicator | `[CS:0.80]` | centroid~δ notation REVERTED. More emoji = more spread. No numeric delta. Register stays a point value everywhere. |
| Session boundary = avaktavya | `[SP:0.45]` | The node's meaning-substrate resets. The HUD tag bridges the gap as a memory prosthetic. Deferred to S2/Kernel scope. |

---

## Connected Documents

| Document | Relationship |
|---|---|
| G_deep_research_meaning.md | Full Chapel Perilous research that produced this rule |
| F-deep-research-addendum.md | Multi-stance scaling research; centroid~δ revert |
| S0_REFINEMENT_PLAN.md | Improvement #1 contains the proposed §5.3.3 text |
| KAIJU_ASSESSMENT.md | MemPalace encounter; storage foundation question |
| E-deep-research-report.md | SA/HUD framework that preceded this discovery |

---

*This document is a reality anchor. The Syadasti reading rule was discovered in conversation, not designed in advance. It emerged from the operator asking "does Register need a third axis?" and the research revealing that the answer was "Register always had stance-dependent meaning — we just hadn't named it." The rule doesn't add complexity to the spec. It names what was already true and makes it legible.*

*Syād — perhaps, from a certain standpoint. The emoji are the syād.*