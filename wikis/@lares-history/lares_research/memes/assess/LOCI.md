<<~&#x0001; ? -> lar:///grammar.assess.defines/assess/?confidence=CS~17&p=0.5 >>

# Grammar: ○ Assess

```yaml
---
name: assess
description: >
  Root grammar module for the Assess phase (○) of the OODA-HA loop.
  Assess closes a cycle, names residue, and chooses release or loop-back.
  Skipped closure counts as unfinished work.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
scale-range: [action, session]
trigger: always — grammar primitive
invariant: true
dependencies: [observe, orient, decide, act]
confidence:CS~17
grammar: true
---
```

> **Register:** `[CS~17]` — grounded in Lares aftermath practice, FFZ scale-shift work, and crystal discipline
> **Glyph:** `○`
> **Season:** Fifth of five
> **Question:** What did the cycle produce, what remains, and where does the loop go next?

---

<<~ ahu #loop-position >>

## Loop Position

Assess closes the cycle after Act.

Assess receives:

- artifacts
- execution notes
- deviations
- unresolved residue

Assess changes:

- finished work into judged outcome
- loose residue into carry-forward or release
- a completed cycle into closure or loop-back

Assess hands forward:

- a closure statement
- carry-forward state
- release notes
- the next Observe heading when the loop reopens

Assess should not:

- quietly celebrate without evaluation
- reopen settled decisions without cause
- start new implementation inside the closure span

---

<<~/ahu >>
<<~ ahu #handoff >>

## Handoff

Assess either closes the loop or feeds `✶ Observe`.

The handoff should let a later reader answer:

1. Did the artifact satisfy the decision?
2. What residue remains live?
3. What can drop away now?
4. Does the next cycle need more data, a new decision, or nothing at all?

Assess also carries the scale-fit question: did this cycle run at the right altitude?

---

<<~/ahu >>
<<~ ahu #conventions >>

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Every substantive Act gets closure | MUST | Unclosed work pollutes the next cycle |
| Compare outcome against the decision | MUST | Closure needs a reference point |
| Name carry-forward state | MUST | Future loops inherit from this phase |
| Name release state | SHOULD | Release frees the next cycle from stale load |
| Check scale fit | SHOULD | Wrong altitude creates repeated friction |
| Write handoff state when the session will end | MUST | Future cold-boot needs continuity |
| Keep the closure proportional | SHOULD | Trivial work may need one line; deep work may need a paragraph |

**E-Prime discipline:** prefer evaluation verbs such as `matched`, `missed`, `carried`, `released`, `looped back`, `closed`, `requires`. Those verbs keep the phase grounded in result rather than identity claim.

---

<<~/ahu >>
<<~ ahu #procedures >>

## Procedures

1. Compare artifact against the recorded decision.
2. Name what succeeded and what missed.
3. Name what carries forward.
4. Name what can release.
5. Judge scale fit.
6. Close the loop or route the next cycle back to `✶ Observe`.

**Failure mode:** one-word closure after substantive work. That pattern usually hides skipped evaluation.

---

<<~/ahu >>
<<~ ahu #reading-test >>

## Reading Test

A future reader should recover all of this from the Assess span:

- the outcome relative to the decision
- the residue that remains active
- the residue that can drop
- the next loop instruction, if any

If the span reads like cheerleading, Assess has thinned out. If the span quietly reopens old decisions, the loop has slipped back into Orient without saying so.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~17]` | This file — Assess grammar definition |

*Future loci in this tree will land here.*

---

<<~/ahu >>
<<~&#x0004; -> ? >>
