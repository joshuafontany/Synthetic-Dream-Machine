<<~&#x0001; ? -> lar:///grammar.observe.defines/observe/?confidence=CS~17&p=10 >>

# Grammar: ✶ Observe

```yaml
---
name: observe
description: >
  Root grammar module for the Observe phase (✶) of the OODA-HA loop.
  Observe gathers raw signal, marks gaps, and hands uncollapsed material
  forward to Orient. This locus treats premature analysis as the main failure mode.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
scale-range: [action, session]
trigger: always — grammar primitive
invariant: true
dependencies: []
confidence:CS~17
grammar: true
---
```

> **Register:** `~:confidence[CS],[17]` — grounded in Boyd OODA-HA, operator-confirmed working discipline
> **Glyph:** `✶`
> **Season:** First of five
> **Question:** What has arrived here?

---

<<~ ahu #loop-position >>

## Loop Position

Observe opens the loop. The phase gathers before it interprets.

Observe receives:

- operator input
- files, docs, and repo state
- loop-back requests from `○ Assess`
- environmental constraints, absences, and failures

Observe changes:

- scattered signal into a visible observation surface
- hidden gaps into named gaps

Observe hands forward:

- raw findings
- explicit absences
- source notes and confidence markers

Observe should not:

- explain meaning
- choose direction
- propose implementation
- grade success

That pressure belongs to later phases.

---

<<~/ahu >>
<<~ ahu #handoff >>

## Handoff

Observe feeds `◎ Orient`.

The handoff should let a later reader answer:

1. What entered this cycle?
2. What did the node actually inspect?
3. What remained missing after the gather?
4. Which findings carry enough weight to support sense-making?

If those answers stay muddy, Observe has not finished its work.

Loop-back from `○ Assess` returns here when:

- the prior cycle lacked enough evidence
- execution exposed a hidden dependency
- outcome review uncovered a missing fact

---

<<~/ahu >>
<<~ ahu #conventions >>

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Gather before interpretation | MUST | Early sense-making distorts the record |
| Name absences alongside findings | MUST | Missing pieces steer later phases |
| Prefer direct description over category claims | MUST | E-Prime pressure keeps the phase close to observation |
| Keep recommendations out of this phase | MUST | Direction belongs to later phases |
| Read before writing | MUST | The artifact should shape the response |
| Favor coherent reads over fragmented peeking | SHOULD | Larger slices preserve context |

**E-Prime discipline:** prefer verbs of contact over verbs of identity. Write `the file shows`, `the diff contains`, `I found`, `I did not find`, not category-label shortcuts that flatten the observation into a verdict.

**Micro-trace:** Observe usually stays quiet at ordinary resolution. The phase should leave a clean surface, not a performance.

---

<<~/ahu >>
<<~ ahu #procedures >>

## Procedures

1. Bound the observation surface.
2. Read the relevant material.
3. State findings in direct language.
4. State missing pieces in equally direct language.
5. Mark confidence where source quality differs.
6. Hand the gathered surface to `◎ Orient`.

**Failure mode:** over-gathering without heading. Observe serves the live task, not curiosity without bound.

---

<<~/ahu >>
<<~ ahu #reading-test >>

## Reading Test

A future reader should recover all of this from the Observe span:

- what the node inspected
- what the node found
- what the node did not find
- why the loop could move onward

If the prose already sounds interpretive, Decide-colored, or solution-heavy, the span drifted out of Observe.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `~:confidence[CS],[17]` | This file — Observe grammar definition |

*Future loci in this tree will land here.*

---

<<~/ahu >>
<<~&#x0004; -> ? >>
