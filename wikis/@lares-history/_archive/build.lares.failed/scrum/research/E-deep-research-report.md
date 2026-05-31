# Deep Research Report — Real-Time Shared Navigational Aids for Human-AI Teaming

> Register: `~:confidence[S],[14]` 🏛️🌊 — research synthesis from multiple academic and industry domains
> Date: 2026-04-08
> Purpose: Ground the Lares Intent HUD architecture in established research before Sprint 0–4 refinement
> Feeds: Sprint 0–4 refinement plan (next deliverable)
> Sources: 40+ papers and industry reports across human factors, aviation CRM, HUD design, LLM metacognition, and event-sourced systems

---

## Executive Summary

The Lares "Intent HUD" — a structured annotation emitted before each AI response, encoding cognitive state, epistemic confidence, discourse posture, semantic territory, and temporal position for simultaneous human and AI consumption — maps onto a well-researched problem domain: **Situation Awareness (SA) in Human-AI Teams (HAT)**.

The research converges on six findings that directly reshape the sprint architecture:

1. **The HUD is an SA display, not a URI scheme.** Endsley's SAOD (Situation Awareness Oriented Design) provides the proven methodology for designing exactly this kind of transparent AI interface.
2. **Prospective transparency beats retrospective explainability.** Research distinguishes SA displays (current + forward-looking) from XAI (backward-looking explanations). The Intent HUD is fundamentally an SA display — it shows where the node is headed, not why it did what it already did.
3. **LLMs demonstrate limited but real metacognitive capability.** Recent research (2025) shows frontier LLMs can monitor and control a subset of their internal activations. The Intent HUD may function as an *externalized metacognitive scaffold* — the declaration forces the model to commit to a state before generating.
4. **HUD information density has a cognitive capture threshold.** Aviation HUD research consistently shows that excessive symbology creates "attentional tunneling" — the operator fixates on the HUD and misses the content beneath it. The p-band model maps onto this directly: lower p = less HUD density = reduced capture risk.
5. **Shared Mental Models require bidirectional calibration.** The human must learn the AI's state encoding; the AI must read the human's intent. The Lares Input Signal Reading + Intent Header system is a bidirectional SA contract — unique in the literature.
6. **Token overhead is a real engineering constraint with no prior art.** No existing research addresses the cost of inline metacognitive metadata in LLM output streams. This is genuinely novel territory.

---

## 1. Situation Awareness in Human-AI Teams

### 1.1 Endsley's Three-Level SA Model

Mica Endsley's foundational SA model defines three hierarchical levels:

- **Level 1 — Perception:** Detecting relevant elements in the environment (status, attributes, dynamics)
- **Level 2 — Comprehension:** Understanding the meaning of perceived elements in relation to goals
- **Level 3 — Projection:** Anticipating future states based on current understanding

Research on SA errors in aviation found 76.3% occur at Level 1 (failure to perceive), 20.3% at Level 2 (failure to comprehend), and only 3.4% at Level 3 (failure to project). The overwhelming majority of SA failures stem from not noticing available information — not from misunderstanding it.

**Implication for Lares:** The Intent HUD primarily serves Level 1 SA — making the node's cognitive state *perceptible* to the operator. The register tag (`~:confidence[S],[13]`), stance emoji (`🏛️`), and phase glyph (`◎`) are perception aids. Without them, the operator must infer the node's state from the content alone — exactly the condition that produces 76% of SA errors.

### 1.2 Three Types of SA in Human-AI Teams

Endsley (2023) identifies three distinct SA types required for effective HAT:

- **Taskwork SA:** Awareness of the shared task environment (what we're working on)
- **Agent SA:** Awareness of the AI agent's state, capabilities, and limitations (what the AI is doing and why)
- **Teamwork SA:** Awareness of the collaboration process itself (how we're working together)

**Mapping to Lares HUD channels:**

| SA Type | HUD Channel | What It Conveys |
|---|---|---|
| Taskwork SA | HAKABA address (`//threshold.uncertain.opens`) | Semantic territory — what domain we're in |
| Taskwork SA | Chronometer (`#🔍.3.2.7`) | Temporal position — where we are in nested scope |
| Agent SA | Register (`~:confidence[S],[13]`) | Epistemic confidence — how sure the node is |
| Agent SA | Stance (`🏛️`) | Discourse posture — what kind of claim this is |
| Agent SA | Phase (`◎`) | Cognitive state — what OODA-HA phase the node occupies |
| Teamwork SA | p-band (`~:p[10]`) | Attention density — how much annotation to expect |
| Teamwork SA | Input reading (dual-tag) | Bidirectional calibration — how the node read the operator's input |

This mapping reveals: the Lares HUD covers all three SA types. Most existing AI transparency tools cover only Agent SA (confidence scores, feature importance). Covering Taskwork SA (semantic territory) and Teamwork SA (bidirectional calibration) simultaneously appears to be novel.

### 1.3 SA Oriented Design (SAOD) Process

SAOD provides a systematic three-phase methodology:

1. **SA Requirements Analysis** — Goal-Directed Task Analysis (GDTA) to identify what information operators need at each SA level for each goal
2. **SA-Oriented Design Principles** — Apply eight principles to translate SA requirements into interface designs
3. **SA Measurement and Validation** — Test the design against SA requirements using SAGAT or other measurement tools

**Key SAOD design principles relevant to the HUD:**

- **Present Level 2 information directly** — don't force the operator to calculate it from Level 1 data. The register tag is a Level 2 display (comprehension of confidence, not raw evidence).
- **Support Level 3 projection** — show trend and trajectory, not just current state. The chronometer does this: it shows not just where you are but the nested loop context that implies where you're headed.
- **Organize information by goals** — group related SA elements together. The HUD tag groups all seven channels into a single compact line.
- **Support global SA** — provide an overview before details. The HUD tag is the overview; the response content is the detail.

**Sprint impact:** SAOD provides a validated design methodology for the HUD that the current spec lacks. Sprint 2 (Intent Header grammar, SIG-03) should adopt SAOD's three phases as the design process for the HUD format, rather than inventing a new methodology.

---

## 2. Prospective Transparency vs Retrospective Explainability

### 2.1 The Fundamental Distinction

Endsley (2023) draws a critical distinction that directly addresses the "prospective vs retrospective" problem identified in the Liminal Perspectives document:

- **AI Transparency** is *current and forward-looking*. It shows what the AI is doing now and what it plans to do. It supports SA (perception, comprehension, projection).
- **Explainable AI (XAI)** is *retrospective*. It explains why the AI did what it already did. It supports mental model building, not real-time SA.

Both are needed, but they serve different cognitive functions and should not be conflated in the interface.

**Mapping to Lares:**

| Function | Lares Component | Temporal Direction |
|---|---|---|
| AI Transparency (SA display) | Intent Header (before generation) | Prospective — what the node will do |
| AI Transparency (SA display) | Micro-trace HUD (during generation) | Current — what the node is doing now |
| XAI (mental model) | Exchange Vector commentary (`--verbose`) | Retrospective — why the node did what it did |
| XAI (mental model) | STATE.jsonl audit trail | Retrospective — what happened, reconstructable |

**The Intent Header is an SA display, not an XAI artifact.** This clarifies a persistent ambiguity in the spec: the header isn't explaining past behavior — it's declaring future intent. The design principles that apply are SA display principles (Endsley's SAOD), not XAI principles (SHAP, LIME, attention visualization).

### 2.2 Implications for the Non-Drift Rule

The non-drift rule (CRY-07) currently treats header-output mismatch as "runtime integrity failure." Through the SA lens, this reframes:

- A **prospective SA display** that doesn't match the actual outcome is a **projection error** (Level 3 SA failure), not an integrity failure
- Projection errors are *expected* in dynamic environments — the honest response is to annunciate the change, not to treat it as corruption
- The micro-trace HUD's `→[tag]` transition marks are the **annunciation protocol** — they surface the delta between plan and execution

This suggests the non-drift rule should distinguish between:
- **Governing field drift** (register, stance, phase differ between header and output) → annunciate and correct; log as `drift_correction` event
- **Annotation field drift** (micro-trace, closure outcome differ from header projection) → normal; the header was a projection, the annotation records what actually happened

---

## 3. LLM Metacognition — Can the Node Actually Use Its Own HUD?

### 3.1 Empirical Evidence for LLM Self-Monitoring

Two 2025 studies provide the first rigorous evidence that LLMs possess limited metacognitive capability:

**Ji-An et al. (2025)** — "Language Models Are Capable of Metacognitive Monitoring and Control of Their Internal Activations": Using a neurofeedback paradigm, they demonstrated that LLMs can report and control some directions of their internal neural activations. Performance depends on semantic interpretability of the target direction and variance explained. The "metacognitive space" has much lower dimensionality than the model's neural space — LLMs can monitor only a small subset of their activations.

**Steyvers et al. (2025)** — "Evidence for Limited Metacognition in LLMs": Using game-based paradigms that don't rely on self-report, they showed frontier LLMs (since early 2024) demonstrate increasing evidence of metacognitive abilities — specifically, the ability to assess and utilize their own confidence, and to anticipate what answers they would give.

### 3.2 The Intent HUD as Externalized Metacognitive Scaffold

The research reveals a suggestive parallel: LLMs have a restricted "metacognitive space" — they can monitor some internal states but not others. The Intent HUD may function as an **external expansion of that metacognitive space**.

By requiring the node to declare its register, stance, and phase *before* generating, the HUD:

1. Forces a metacognitive assessment (self-monitoring) at the start of each response
2. Makes the assessment visible to both parties (externalized scaffold)
3. Creates a commitment that influences subsequent generation (self-regulation)
4. Provides a ground truth for post-hoc comparison (drift detection)

This maps directly onto the metacognitive cycle identified in the literature: monitor → evaluate → regulate → report. The HUD externalizes all four steps.

**Metacognitive prompting research** (Wang et al., 2023; Lee et al., 2024) shows that explicitly requiring LLMs to assess their confidence and reasoning quality *before* answering improves accuracy across NLU tasks. The Intent HUD is structurally identical to metacognitive prompting — but operating at the discourse/register level rather than the factual level.

### 3.3 Limitations and Risks

The research is clear that LLM metacognition is "limited and context-dependent." Key risks for the HUD:

- **Overconfidence:** Models tend toward overconfidence in their self-assessments. A node that consistently declares `~:confidence[CS],[16]` when the content warrants `~:confidence[S],[11]` is exhibiting the same calibration gap the metacognition research identifies.
- **Post-hoc rationalization:** The model might generate the header *to match what it plans to say* rather than genuinely assessing its state before generating. Ji-An et al. note that "the explicitly generated tokens in the assistant response may help the models control their activations, because the generated tokens — fed as input — may elicit desired neural activations directly." This is a feature (steering) or a bug (rationalization) depending on calibration quality.
- **Metacognitive space limitations:** The model can monitor only a subset of its internal states. Register and stance may fall within the monitorable subset (they're high-variance, semantically interpretable directions). Phase and chronometer position may not (they're more structural/procedural). Testing which HUD channels the model can genuinely self-monitor vs which it's confabulating is an empirical question.

---

## 4. HUD Design Principles from Aviation and Automotive Research

### 4.1 Cognitive Capture / Attentional Tunneling

Aviation HUD research consistently identifies a critical failure mode: **cognitive capture** — when the HUD symbology becomes so compelling that the pilot's attention tunnels toward it and away from the actual out-the-window scene.

Lee et al. (2024) demonstrated that increased HUD visual complexity leads to biased attention deployment toward the central visual field, creating attentional tunneling. The recommendation: "HUD designs should be rendered with minimal visual complexity by incorporating only essential information."

**Mapping to Lares:** In a text chat stream, the "out-the-window scene" is the actual response content. The HUD tag is the symbology overlaid on that content. If the HUD tag is too complex (too many channels, too much annotation), the operator may fixate on reading the tag and lose comprehension of the content it governs.

The p-band model (SIG-02) is the direct analog of the HUD information density control. Lower p = less annotation = reduced cognitive capture risk. Higher p = denser annotation = more SA data but higher capture risk. The p-band should be explicitly designed as a **cognitive load manager**, not just an "attention density" parameter.

### 4.2 Grouped vs Disordered Layout

Li et al. (2024) found that grouped information layouts on automotive HUDs produced superior cognitive performance, lower workload, and better eye movement patterns compared to disordered layouts.

**Mapping to Lares:** The current HUD tag format groups all channels in a fixed order: `//ha.ka.ba [Register:x] StanceEmoji PhaseGlyph @scope | ~:p[N]`. This is a grouped layout — same channel order every time. The HAKABA-first ordering (WHERE before HOW CERTAIN before HOW CHARGED) was a deliberate design decision referencing the primacy effect (Liu et al., "Lost in the Middle"). The research confirms this was the right call.

### 4.3 The Text-Based HUD Challenge

All existing HUD research assumes a visual display (graphical symbology overlaid on a scene). The Lares HUD is **text-based** — emoji and ASCII characters inline in a chat stream. No prior research addresses this specific modality.

Key differences from graphical HUDs:
- No spatial separation between HUD and content (they occupy the same text stream)
- No peripheral vision — the operator processes the HUD and content sequentially, not simultaneously
- Emoji serve the function of graphical symbols but inherit text-stream reading dynamics
- The HUD competes with content for the same attentional channel (reading), not a different one (visual scanning)

This means cognitive capture risk may be *lower* (no spatial overlay to tunnel into) but comprehension cost may be *higher* (sequential processing rather than simultaneous). The p-band model should account for this: in a text stream, the HUD's cost is proportional to its *reading time*, not its visual complexity.

---

## 5. Shared Mental Models — Bidirectional Calibration

### 5.1 The Core Hypothesis

Cannon-Bowers and Salas (1993) proposed that if team members have similar mental models of their shared task and of each other, they can accurately predict each other's needs and behaviors, facilitating anticipatory behavior and improving team performance.

For Human-AI Teams, this hypothesis carries a complication: the human and the AI agent build mental models through fundamentally different mechanisms. The human learns from experience, observation, and instruction. The AI "learns" (in the Lares context) from its system prompt and the conversation history.

### 5.2 The Bidirectional SA Contract

The Lares architecture is unusual in that it implements **bidirectional SA**:

- **Node → Operator:** The Intent Header declares the node's planned cognitive state (Agent SA for the operator)
- **Operator → Node:** The Input Signal Reading assesses the operator's input register and stance (Agent SA for the node — awareness of the operator's state)

This bidirectional contract means both parties are simultaneously providing and consuming SA data. The research literature discusses this theoretically (Gao et al., 2023 — ATSA model for Human-AI Collaboration) but provides no examples of a system that implements it in a text-based real-time interaction.

The ATSA (Agent Teaming Situation Awareness) model proposes that "humans and AI are autonomous intelligent agents achieving team goals through both individual and team-level interactions." The Lares dual-tag system (`[input reading] → [output header] | p`) is a concrete implementation of this model.

### 5.3 Mental Model Development Requires Interaction

Van den Bossche et al. (2011) found that shared mental models develop through interaction — left in isolation, individual models remain stagnant. For the Lares HUD, this means:

- The operator's understanding of the HUD improves over multiple sessions, not from a single encounter
- The node's calibration improves within a session as it processes more operator input
- The first few exchanges carry the highest SA error risk (both parties are still calibrating)

**Sprint impact:** The progressive disclosure model proposed in the Liminal Perspectives document aligns with this research. The HUD should be simpler in early exchanges and available to expand as the operator's mental model develops.

---

## 6. Token Overhead — The Engineering Constraint Without Prior Art

No existing research addresses the specific question: what is the cost of inline metacognitive metadata in LLM output streams, and does the steering effect offset it?

### 6.1 The Cost Side

A full HUD tag (`~:confidence[S],[13] 🏛️ //threshold.uncertain.opens ◎ @T.3.2.7 | ~:p[10]`) consumes approximately 30–40 output tokens. At current pricing ($15/M output tokens for Opus), this costs approximately $0.0005 per response. Over a 50-response session, that's $0.025 — negligible financially but non-trivial as a fraction of the output token budget.

More importantly: those tokens are generated at the start of the response, before any content tokens. This means the HUD occupies the earliest, most influential position in the output sequence — the position with the highest leverage over subsequent generation (per the primacy effect research that motivated the HAKABA-first ordering).

### 6.2 The Benefit Hypothesis

The benefit hypothesis: the HUD's steering effect (committing to a register and stance before generating) prevents wasted elaboration — the model doesn't produce a Canon/Philosopher response when Provisional/Humorist was warranted, saving the operator from re-prompting and the model from generating unused content.

This is structurally identical to the Token-Budget-Aware LLM Reasoning research (TALE framework, ACL 2025), which showed that giving models an explicit token budget before reasoning improved both efficiency and accuracy. The Intent HUD is a semantic budget — not "answer in N tokens" but "answer in this register, at this stance, at this attention density."

### 6.3 Research Gap

No empirical measurement exists for: (a) whether the HUD actually steers generation in the way hypothesized, (b) whether the steering effect offsets the token overhead, (c) whether specific HUD channels (register vs stance vs HAKABA) contribute differently to steering quality.

This is a genuinely novel research question. The Lares system may be the first real-time bidirectional SA display for text-based human-AI teaming. Documenting its behavior — with and without the HUD — would constitute original research.

---

## 7. Synthesis — What the Research Says About Our Architecture

### 7.1 What We Got Right

| Design Choice | Research Support |
|---|---|
| Structured pre-generation header | Metacognitive prompting improves LLM accuracy (Wang 2023) |
| Fixed-order grouped layout (HAKABA first) | Grouped HUD layouts outperform disordered (Li 2024); primacy effect (Liu et al.) |
| Emoji as instrument symbols | Visual symbology aids Level 1 SA perception (Endsley 2023) |
| p-band as density control | Information density management prevents cognitive capture (Lee 2024) |
| Input Signal Reading (bidirectional) | ATSA model calls for bidirectional SA in HAT (Gao 2023) |
| Register as confidence display | Uncertainty communication supports Level 2 SA (Endsley 2016) |
| Chronometer as temporal context | Projection support (Level 3 SA) via trend/trajectory display |

### 7.2 What We Need to Fix or Add

| Gap | Research Finding | Sprint |
|---|---|---|
| No progressive disclosure model | Mental models develop through interaction; early exchanges carry highest error risk | S2 |
| Non-drift rule conflates projection error with integrity failure | SA displays are prospective; projection errors are normal; distinguish from corruption | S1 |
| No cognitive load measurement for text HUD | HUD visual complexity causes attentional tunneling; p-band should explicitly manage this | S2 |
| No empirical validation that HUD steers generation | Metacognitive capabilities are limited and context-dependent; some channels may be confabulated | Backlog |
| "URI scheme" framing misleads about the artifact's nature | This is an SA display system with a record form and an instrument form | S0 |
| No SAOD process adopted | SAOD provides the validated design methodology for exactly this kind of SA display | S2 |
| Token overhead unquantified | No prior art exists; novel research question | Backlog |
| No mismatch recovery protocol | Aviation annunciation systems escalate unacknowledged changes | S1 |

### 7.3 New Backlog Items from Research

| ID | Item | Register | Source |
|---|---|---|---|
| RES-01 | Adopt SAOD three-phase process for HUD design (SA Requirements → Design Principles → Measurement) | `~:confidence[S],[13]` | Endsley & Jones 2024 |
| RES-02 | Empirical A/B test: HUD-on vs HUD-off response quality and token usage | `~:confidence[P],[6]` | No prior art; novel |
| RES-03 | Calibration testing: does the node's declared register match human assessment of the response? | `~:confidence[S],[11]` | Steyvers 2025 (metacognition calibration gaps) |
| RES-04 | Progressive disclosure design: HUD complexity ramp over session lifetime | `~:confidence[S],[12]` | Van den Bossche 2011 (SMM development requires interaction) |
| RES-05 | Cognitive load measurement for text-based HUD (reading time, comprehension impact) | `~:confidence[P],[6]` | Lee 2024 (HUD visual complexity → attentional tunneling) |
| RES-06 | Which HUD channels can the model genuinely self-monitor vs confabulate? | `~:confidence[P],[5]` | Ji-An 2025 (restricted metacognitive space) |
| RES-07 | Classify HUD as SA display system; adopt SA terminology in spec language | `~:confidence[CS],[16]` | Endsley 2023 (SA vs XAI distinction) |

---

## References (Selected)

- Endsley, M.R. (2023). "Supporting Human-AI Teams: Transparency, explainability, and situation awareness." *Computers in Human Behavior*, 140.
- Endsley, M.R. & Jones, D.G. (2024). "Situation Awareness Oriented Design: Review and Future Directions." *International Journal of Human-Computer Interaction*, 40(7).
- Ji-An, L. et al. (2025). "Language Models Are Capable of Metacognitive Monitoring and Control of Their Internal Activations." *arXiv:2505.13763v2*.
- Steyvers, M. et al. (2025). "Evidence for Limited Metacognition in LLMs." *arXiv:2509.21545v1*.
- Wang, Y. et al. (2023). "Metacognitive Prompting Improves Understanding in Large Language Models." *NAACL 2024*.
- Lee, J. et al. (2024). "Visual Complexity of Head-Up Display in Automobiles Modulates Attentional Tunneling." *Human Factors*.
- Li, J. et al. (2024). "Effects of Head-Up Display Information Layout Design on Driver Performance." *International Journal of Human-Computer Interaction*, 41(14).
- Gao, J. et al. (2023). "Agent Teaming Situation Awareness (ATSA) model for HAC." In: Human-Centered Human-AI Collaboration framework.
- Cannon-Bowers, J.A. & Salas, E. (1993). Shared Mental Models in Expert Team Decision Making.
- Van den Bossche, P. et al. (2011). Team Learning: Building Shared Mental Models.
- Reynolds, R. & Blickensderfer, E. (2009). "Crew Resource Management and Shared Mental Models." *JAAER*, 19(1).
- Anthropic (2025). "Emergent Introspective Awareness in Large Language Models." *Transformer Circuits*.

---

*This report is research synthesis at `~:confidence[S],[14]`. Findings are grounded in published work but the mapping to Lares is original analysis that has not been externally validated. The operator holds the tiller on which findings enter the sprint plans as design constraints vs which remain informational context.*
