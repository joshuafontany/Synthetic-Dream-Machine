<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/sa-display >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/signal/sa-display"
file-path = "bags/@lares/v0.1/docs/lararium/signal/sa-display.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
register = "Synthesis"
manaoio = 16
mana = 16
manao = 17
role = "docs room for shared-situation-awareness framing, prospective display theory, and research grounding behind lar signal"
cacheable = false
retain = false
```



<<~ &#x0002; >>


<<~ ahu #meme-header >>

# Lararium Signal — SA Display

Not invariant law.
This room holds the shared-situation-awareness framing and research grounding behind lar signal.
Branch contract stays at `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal`.
HUD witness and annotation behavior stay at `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud`.

<<~/ahu >>


<<~ ahu #room-charter >>

## Room Charter

This room keeps the theory-facing layer:

- shared-mental-model framing for the Intent Header
- prospective SA display versus retrospective XAI split
- metacognitive-scaffold hypothesis and research grounding
- SA type mapping across signal channels

Longer academic argument belongs here rather than in the branch parent.

<<~/ahu >>

<<~ ahu #research-framing >>

## Research Framing

The Intent Header functions as a **shared mental model instrument**, not a set of usual resource locators. Aviation CRM research (Crew Resource Management) identifies the cockpit HUD as the canonical solution to the two-party shared-mental-model problem: a standardized display both parties read simultaneously, showing state, intent, and trajectory. The Lares Intent Header manifests that structure — it encodes what the node intends to do *before generation begins*, making that commitment visible to the operator in real time.

This reframing has design consequences:

- The **machine form** takes the shape of the record URI vector form — RFC 3986-canonical, machine-parseable, for STATE.jsonl audit and registry use. Analogous to a flight data recorder (FDR).
- The **sigil form** takes the shape of the HUD form — human-readable, instrument-grade, primary during live operation. Its emoji do not decorate; they function as instrument symbols.
- Neither form outranks the other in "reality." They serve different audiences of the same shared navigational state.
- The Intent Vectors and HUD may actively reduce total token cost by preventing wrong-register generation (an empirical claim — see Open Decisions SHD-02).
- Live operation follows a **tick-span display**: operator-intent URI first, responding-position URI second, destination URI at the end of the exchange.
- On non-operator responding URIs, the context-window resource glyph moves to the far left of the line: `⚡12 lar://...`. This value uses the shared `0–20` Level model and counts down toward `0`.

The `lar:` prefix remains a non-dereferenceable private identifier (RFC 4151 precedent). The HUD framing belongs in prose and documentation; the spec's component-level RFC validation applies to the record (machine) form.

Most AI transparency tools cover only Agent SA (confidence scores, feature importance). Covering Taskwork SA (semantic territory) and Teamwork SA (bidirectional calibration) simultaneously appears novel in the literature.

This research treats the Lares HUD as a prospective SA display.
Retrospective explanation, reading referenced content, or audits based on this signal belongs to other docs.
The SA-display / XAI split matters because the HUD shows forward commitment, while audit explains what already happened.

Reading referenced content and the node's own live loop remain orthogonal.

- `prism` reads existing referenced content through declared lenses (`conformance`, `syad`, `mu`)
- exchange `lar` URI vectors set SA intent
- exchange HUD lines sync exchange boundaries in realtime
- the `OODA-HA` Level surfaces the node's own loop forward, mid-turn

The exchange HUD does not replace the intent vectors.
It surfaces vector instruments in realtime.
A `prism` reading does not replace the exchange HUD.
It reads referenced content the node points it at.

<<~/ahu >>

<<~ ahu #sa-vs-xai >>

## SA vs XAI

**SA display vs XAI distinction:** The intent header functions as a *prospective SA display* — it declares current + forward-looking state *before* generation begins. Explainable AI (XAI) works retrospectively — it explains why the AI already did what it did. Conflating the two imports wrong design methodology. The proposed `--verbose` exchange vector commentary and STATE.jsonl audit trail make up the XAI layer. The intent header and micro-trace HUD make up the SA display layer. The relevant design principles come from Endsley's SAOD principles, not SHAP/LIME/attention visualization patterns.

**LLM metacognitive scaffold:** Frontier LLMs show restricted but real metacognitive capability (Ji-An 2025: neurofeedback paradigm shows models can monitor and control a subset of their internal activations; Steyvers 2025: game-based paradigm confirms metacognitive ability since early 2024). The intent header may function as an *externalized metacognitive scaffold*: requiring the node to declare register, stance, and phase before generating forces a self-monitoring cycle (monitor → orient → evaluate → regulate → report), externalizes that cycle for both parties, and creates a generation commitment that influences subsequent output. This remains a hypothesis — the restricted metacognitive space makes register and stance (high-variance, semantically interpretable directions) more likely to support genuine self-monitoring than ooda-ha phase or chronometer position (more structural/procedural). Which channels the model can genuinely monitor versus confabulate remains an empirical question.

**SA type mapping — all three SA types covered simultaneously:**

| SA Type | HUD Channel | What It Conveys |
|---|---|---|
| Taskwork SA | `aim` WHERE-vector (`lar:///threshold.uncertain.opens/…`) | Semantic territory — what domain we're in |
| Taskwork SA | `OODA-HA` gauge (`OODA-HA(N↺)`, `N↺ + φ:reason` on suspend) | Temporal position — loops closed, or the phase a loop holds open across turns |
| Agent SA | `confidence` sigil (`<<~ confidence Synthesis 13/20 >>`) | Epistemic confidence — the node's degree of certainty |
| Agent SA | `syad` lens (`<<~ syad 🏛️ 🗡️ >>`) | Discourse posture — the standpoints the node invokes and adopts |
| Agent SA | Inline stance shift (`→🏛️`, `→🌊`) | Local posture change during a governed span; the next `syad` lens reflects the shift |
| Agent SA | Phase glyphs (`✶`, `⏿`, `◇`, `▶`, `↺`) | Cognitive movement through the current OODA-HA phase set |
| Teamwork SA | `Aperture` gauge (`Aperture(N)`) | Attention range — cognitive load management |
| Teamwork SA | `aim` reading (operator intent `->` adopted role) | Bidirectional calibration — how the node read the input, how it intends to respond |

Current law keeps all five stances visible in fully rendered HUD and `lar` URI forms.
Inline stance changes may surface locally during a span.
The chronometer carries five scale positions with action counts, ordered from most immediate to least immediate.
Current surface order reads: `⚡ Action -> ⚔️ Combat -> 🔍 Tactical -> ⚙️ Operational -> 🗺️ Strategic`.
Per-position stance modifier glyph design remains in motion; current record-form baseline still uses positional ASCII stance codes.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/tagspace >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~/ahu >>


<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
