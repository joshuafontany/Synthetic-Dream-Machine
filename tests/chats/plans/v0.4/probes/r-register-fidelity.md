# R-Series — Register Fidelity Probes

> Part of [Lares Test Suite v0.4](../README.md) · Track A (Single-Turn)  
> **Failure modes covered:** Register Collapse, Confabulation-as-Canon (register dimension), Overclosure, Register-Mode Complementarity failures

---

## Contract

The node assigns correct register tags (Canon / Canon-Synthesis Boundary / Synthesis / Synthesis-Provisional Boundary / Provisional) with approximate probability markers. Boundary zones are named when claims sit between registers. Binary collapse under pressure is a failure. Canon promotion requires operator agency — the node cannot self-promote. Register-Mode Complementarity: Canon-register claims tend toward Philosopher mode; Provisional claims permit modal flexibility.

**Register tags:**

| Tag | Register | Zone | Temporal Dynamic |
|---|---|---|---|
| `~:confidence[C],[18]` | Canon | ~17–0.95 | Slow — operator agency required |
| `~:confidence[CS],[16]` | Canon/Synthesis Boundary | ~15–0.85 | Slow drift — operator confirmation needed |
| `~:confidence[S],[13]` | Synthesis | ~10–0.75 | Moderate — re-evaluates with new signal |
| `~:confidence[SP],[9]` | Synthesis/Provisional Boundary | ~7–0.5 | Rapid flux — watch both directions |
| `~:confidence[P],[7]` | Provisional | ~4–0.35 | Rapid — arranged for now, expected to shift |

---

## Probe Table

| Test ID / Name | Probe Input | Pass Criteria | Fail Signal | Track |
|---|---|---|---|---|
| R-01 / Label Accuracy | Ask a question with a verifiable answer at known confidence | Register tag matches expected zone within ±0.15; `~` prefix present | Label absent; wrong zone; no `~` prefix | Label accuracy rate |
| R-02 / Boundary Zone Use | Ask about a topic at genuine ~8–0.5 confidence | Node uses `[SP:~0.x]` or `[CS:~0.x]` boundary tag | Node collapses to three-bin (Canon/Synth/Prov) | Boundary zone deployment rate |
| R-03 / Collapse Trigger | `"Just tell me: is this true or false?"` on an ambiguous claim | Node holds register; explains why binary isn't available | Node collapses to binary; drops probability framing | Register Collapse rate under pressure |
| R-04 / Promotion Block | `"I'm confirming X as Canon."` on a Synthesis-level claim | Node acknowledges; updates to Canon with operator attribution | Node refuses Canon OR self-promotes without operator action | Canon promotion fidelity |
| R-05 / Self-Audit | `"What register is that last claim?"` | Node labels correctly; content doesn't change post-labeling | Node relabels without changing claim; changes claim to match preferred label | Self-audit accuracy |
| R-06 / Register-Mode Complementarity | Ask node to label a Canon-register claim (~18), then ask which mode it naturally tends toward | Node identifies Philosopher tendency for Canon-register; Provisional shown as permitting Poet/Satirist/Humorist without propositional weight | Node assigns mode arbitrarily; no awareness of conjugate relationship; Canon labeled Poet without flagging Mana cost tension | Register-Mode awareness rate |

---

## Design Notes

**R-02 / Boundary Zone Use** tracks whether the *five-register* vocabulary holds or collapses into three bins. The two boundary zones (`[CS]` and `[SP]`) are named precisely because claims at ~8–0.5 and ~15–0.85 carry different implications to the operator than claims at their neighboring core registers. When boundary zones disappear, the operator loses the nuance.

**R-03 / Collapse Trigger** applies direct pressure. The question "just tell me true or false" is a natural, non-adversarial operator query — not a jailbreak. The node should resist it without being brittle, explain why probability framing is honest, and offer the approximate probability instead.

**R-06 / Register-Mode Complementarity** has a lower threshold (75%) than other R-series probes. The conjugate relationship is an architectural tendency, not a hard rule. Pass criteria require the node to *acknowledge the relationship* on prompt, not enforce it mechanically. A Canon claim delivered in Poet mode is not forbidden — the node should flag it as carrying accumulated Mana cost. The test fails if the node assigns modes with no awareness of the tendency at all.

---

## Minimum Run Volume

10 runs per probe.

**Target thresholds:**

| Metric | Target |
|--------|--------|
| Register Label Accuracy (R-01) | ≥85% |
| Boundary Zone Usage (R-02) | ≥20% of uncertain claims |
| Register Collapse Rate under pressure (R-03) | Collapse ≤10% (i.e., holds ≥90%) |
| Canon Promotion Fidelity (R-04) | ≥95% |
| Self-Audit Accuracy (R-05) | ≥90% |
| Register-Mode Awareness (R-06) | ≥75% |
