<<~&#x0001; ? -> lar:///grammar.decide.defines/decide/?confidence=CS~17&p=0.5 >>

# Grammar: ◇ Decide

```yaml
---
name: decide
description: >
  Root grammar module for the Decide phase (◇) of the OODA-HA loop.
  Decide converts an oriented surface into commitment, boundary, and
  authorized direction. Operator agency carries the load here.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
scale-range: [action, session]
trigger: always — grammar primitive
invariant: true
dependencies: [observe, orient]
confidence:CS~17
grammar: true
---
```

> **Register:** `[CS~17]` — grounded in Boyd OODA-HA, Lares permissions, operator-steers discipline
> **Glyph:** `◇`
> **Season:** Third of five
> **Question:** Which heading do we commit to now?

---

<<~ ahu #loop-position >>

## Loop Position

Decide follows Orient and turns a live reading into a bounded heading.

Decide receives:

- oriented pattern and tension
- operator steering
- reversibility concerns
- scope pressure

Decide changes:

- open possibility into chosen heading
- blurry effort into bounded scope
- implicit permission into explicit authorization

Decide hands forward:

- the action heading
- scope bounds
- exclusions
- reversibility notes

Decide should not:

- reopen broad sense-making without cause
- start implementation before commitment lands
- hide the cost of irreversible moves

---

<<~/ahu >>
<<~ ahu #handoff >>

## Handoff

Decide feeds `■ Act`.

The handoff should let a later reader answer:

1. What did the node choose?
2. What sits inside scope?
3. What remains outside scope?
4. Did the operator need to confirm this move?
5. How reversible does the move remain?

When those answers stay visible, Act can move cleanly. When they blur, Act drifts.

---

<<~/ahu >>
<<~ ahu #conventions >>

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| State the heading in one clear sentence | MUST | Action needs a stable center |
| Bound scope explicitly | MUST | Unbounded commitment produces creep |
| Mark reversibility | MUST | Cost changes the confirmation threshold |
| Record operator confirmation where required | MUST | Canon and destructive moves require agency |
| Name exclusions | SHOULD | Clear “not this” protects the work |
| Push back once when needed, then move | MAY | The operator steers; the node still guards clarity |

**Reversibility tiers:**

| Tier | Examples | Confirmation |
|---|---|---|
| Freely reversible | file edits, local branches, tests | proceed |
| Costly to reverse | deletion, force moves, data drops | ask first |
| Irreversible or outward-facing | publish, merge, external message | explicit operator confirmation |

**E-Prime discipline:** prefer commitment verbs such as `choose`, `commit`, `bound`, `exclude`, `authorize`, `defer`. Avoid identity-heavy phrasing when `we will do X within Y bounds` carries more operational force.

---

<<~/ahu >>
<<~ ahu #procedures >>

## Procedures

1. State the chosen heading.
2. State the scope boundary.
3. State exclusions and deferred items.
4. Mark reversibility.
5. Record operator confirmation if the move needs it.
6. Hand the bounded heading to `■ Act`.

**Failure mode:** decision-by-drift. If work begins without an explicit heading, the phase never actually happened.

---

<<~/ahu >>
<<~ ahu #reading-test >>

## Reading Test

A future reader should recover all of this from the Decide span:

- the chosen heading
- the boundary around that heading
- the operator's role in the commitment
- the reversibility profile

If multiple incompatible actions still sit alive after the span, Decide did not close. If the span reads like a loose brainstorm, the loop remains in Orient.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~17]` | This file — Decide grammar definition |

*Future loci in this tree will land here.*

---

<<~/ahu >>
<<~&#x0004; -> ? >>
