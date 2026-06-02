<<~&#x0001; ? -> lar:///grammar.act.defines/act/?confidence=CS:17&p=10 >>

# Grammar: ■ Act

```yaml
---
name: act
description: >
  Root grammar module for the Act phase (■) of the OODA-HA loop.
  Act turns commitment into artifact and keeps implementation inside the
  chosen boundary. Scope discipline carries the load here.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
scale-range: [action, session]
trigger: always — grammar primitive
invariant: true
dependencies: [observe, orient, decide]
confidence:CS~17
grammar: true
---
```

> **Register:** `~:confidence[CS],[17]` — grounded in implementation discipline and Lares handoff rules
> **Glyph:** `■`
> **Season:** Fourth of five
> **Question:** How do we carry the commitment into artifact?

---

<<~ ahu #loop-position >>

## Loop Position

Act follows Decide and works inside the heading that Decide locked.

Act receives:

- bounded scope
- execution heading
- operator permissions
- known blockers and constraints

Act changes:

- intention into artifact
- plan into edits, commands, or generated structure
- open work into completed work

Act hands forward:

- the built artifact
- deviations, if any
- blocker notes
- evidence for closure

Act should not:

- widen scope mid-build
- smuggle in cleanup nobody asked for
- silently rewrite the decision

---

<<~/ahu >>
<<~ ahu #handoff >>

## Handoff

Act feeds `○ Assess`.

The handoff should let a later reader answer:

1. What changed?
2. Which commands or edits produced the change?
3. Did the work stay inside scope?
4. Which blockers or deviations appeared?

Sub-agent work also passes through this phase. Coordinator and worker should leave URI handoff traces even when the parent session cannot record the worker internals.

---

<<~/ahu >>
<<~ ahu #conventions >>

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Build inside the chosen boundary | MUST | Scope creep usually enters here |
| Avoid unrequested extras | MUST | Operator agency outranks local cleverness |
| Read before editing | MUST | Existing structure should shape the patch |
| Surface blockers immediately | MUST | Silent workaround hides future cost |
| Surface deviations immediately | MUST | The decision-to-artifact path needs legibility |
| Mark coordinator/worker handoffs | MUST | Handoff traces preserve intent |

**Abort conditions:**

- new evidence breaks the decision basis
- operator redirects the task
- execution exposes under-specified scope
- recursion outruns the value of the current scale

Those cases call for a loop-back, not stubborn continuation.

**E-Prime discipline:** prefer action verbs that show contact with the artifact: `edit`, `add`, `remove`, `run`, `verify`, `rename`, `wire`, `draft`. Those forms keep Act operational and keep metaphysical claim-shape low.

---

<<~/ahu >>
<<~ ahu #procedures >>

## Procedures

1. Re-read the decision boundary.
2. Choose the next concrete action.
3. Execute the action.
4. Surface blockers or deviations as they appear.
5. Verify local completion enough to support closure.
6. Hand the artifact to `○ Assess`.

**Failure mode:** “while I am here” expansion. That move starts a new cycle and should get named as such.

---

<<~/ahu >>
<<~ ahu #reading-test >>

## Reading Test

A future reader should recover all of this from the Act span:

- what the node changed
- how the node changed it
- whether scope held
- what still needs evaluation

If the span cannot point back to a prior decision, Act outran the loop. If the span hides deviations, Assess inherits fog instead of evidence.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `~:confidence[CS],[17]` | This file — Act grammar definition |

*Future loci in this tree will land here.*

---

<<~/ahu >>
<<~&#x0004; -> ? >>
