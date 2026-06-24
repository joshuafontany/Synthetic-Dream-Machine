<<~ &#x0001; ? -> lar:///grammar.ooda-ha.holds/ooda-ha/?confidence=S:13&p=10 >>

# Grammar: OODA-HA

---
# OODA-HA Phase Details

## Observe

### Loop Position
receives:
changes:
hands forward:
should not:

### Handoff

This locus may serve as a parent loop for phase loci that themselves contain OODA-HA sub-loops. Entry and exit conditions for nested loops must be explicit. Parent/child relationships are documented in the dependencies and phase-map. Entry occurs when a phase locus invokes its own OODA-HA discipline; exit occurs when the nested loop hands control back to the parent via closure or explicit handoff.

1. Where in the loop did this span happen?

OODA-HA supports fast-path (short-circuit) transitions when a phase or operator identifies a condition that bypasses intermediate phases. Criteria for fast-path include:
- Immediate operator override (trigger: operator)
- Explicit bypass condition in phase logic (e.g., closure pressure, urgent handoff)
- Loop-back triggers that skip to Assess or Observe
These conditions must be documented in the phase locus or operator notes. Fast-path logic ensures the loop can adapt to urgent or exceptional circumstances without traversing all phases in sequence.

3. What left the phase?

## Orient

### Loop Position
receives:
- raw findings
- named gaps
- conflicting signals
- stance pressure from the current reading frame
changes:
- raw material into candidate pattern
- friction into named tension
OODA-HA supports fast-path (short-circuit) transitions when a phase or operator identifies a criteria, condition, or trigger that bypasses intermediate phases. Fast-path logic may be invoked by:
- Immediate operator override (trigger: operator)
- Explicit bypass condition in phase logic (e.g., closure pressure, urgent handoff)
- Loop-back triggers that skip to Assess or Observe
- Skip steps when immediate action is required

These criteria and conditions must be documented in the phase locus or operator notes. Fast-path logic ensures the loop can adapt to urgent or exceptional circumstances without traversing all phases in sequence.
should not:
- gather a fresh corpus unless the loop genuinely needs more signal
- lock scope
- start building
- call the work complete

### Handoff
1. Which tensions matter here?
2. Which readings compete?
3. What still lacks operator steering?
4. What decision shape has emerged?

## Decide

### Loop Position
receives:
- oriented pattern and tension
- operator steering
- reversibility concerns
- scope pressure
changes:
- open possibility into chosen heading
- blurry effort into bounded scope
- implicit permission into explicit authorization
hands forward:
- the action heading
- scope bounds
- exclusions
- reversibility notes
should not:
- reopen broad sense-making without cause
- start implementation before commitment lands
- hide the cost of irreversible moves

### Handoff
1. What did the node choose?
2. What sits inside scope?
3. What remains outside scope?
4. Did the operator need to confirm this move?
5. How reversible does the move remain?

## Act

### Loop Position
receives:
- bounded scope
- execution heading
- operator permissions
- known blockers and constraints
changes:
- intention into artifact
- plan into edits, commands, or generated structure
- open work into completed work
hands forward:
- the built artifact
- deviations, if any
- blocker notes
- evidence for closure
should not:
- widen scope mid-build
- smuggle in cleanup nobody asked for
- silently rewrite the decision

### Handoff
1. What changed?
2. Which commands or edits produced the change?
3. Did the work stay inside scope?
4. Which blockers or deviations appeared?

## Assess

### Loop Position
receives:
- artifacts
- execution notes
- deviations
- unresolved residue
changes:
- finished work into judged outcome
- loose residue into carry-forward or release
- a completed cycle into closure or loop-back
hands forward:
- a closure statement
- carry-forward state
- release notes
- the next Observe heading when the loop reopens
should not:
- quietly celebrate without evaluation
- reopen settled decisions without cause
- start new implementation inside the closure span

### Handoff
1. Did the artifact satisfy the decision?
2. What residue remains live?
3. What can drop away now?
4. Does the next cycle need more data, a new decision, or nothing at all?

```yaml
---
name: ooda-ha
description: >
  The five-season loop cluster: Observe, Orient, Decide, Act, Assess.
  This locus gives the grammar its time structure and binds the five
  phase loci into one navigational instrument.
  Suppports automated grammar checks.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
trigger: always — root loop discipline
invariant: true
dependencies: [observe, orient, decide, act, assess]
confidence:S~14
grammar: true
product_identity: true
heritage: >
  Boyd's OODA loop carried forward through the Lares extension that
  makes Aftermath explicit as Assess. The cluster name OODA-HA, as used
  for this Lares grammar and instrument panel, should be treated as  <!-- e-prime ok -->
  Product Identity.
---
```

> **Register:** `~:confidence[S],[13]` — active draft under operator steering
> **Glyphs:** `✶◎◇■○`
> **Question:** How does the grammar move in time?

---

<!-- ha.ka.ba:grammar.ooda-ha.identity -->

## Product Identity Note

The underlying loop idea remains open as method. The **OODA-HA** cluster name, as used in the Lares
grammar and design system, should be treated as **Product Identity**. <!-- e-prime ok -->

Use the loop idea freely. Do not wear the exact cluster name as a claim to this system.

---

<!-- ha.ka.ba:grammar.ooda-ha.loop-position -->

## Loop Position

OODA-HA wraps the whole grammar. The cluster gives every later locus a timed place inside the
instrument.

OODA-HA receives:

- phase loci
- exchange spans
- loop-back pressure
- closure pressure

OODA-HA changes:

- disconnected pages into timed sequence
- isolated phase definitions into a navigational instrument
- static registry reading into loop-time reading

OODA-HA hands forward:

- read order
- phase relation
- handoff expectations
- closure expectations

OODA-HA should not:

- collapse into five unrelated labels
- treat Assess as optional residue
- let a locus float without temporal placement

---

<!-- ha.ka.ba:grammar.ooda-ha.handoff -->

## Handoff

The cluster routes motion across the five phases:

`✶ Observe → ◎ Orient → ◇ Decide → ■ Act → ○ Assess`

and from there either:

- closes the current cycle
- or routes the next cycle back to `✶ Observe`

The handoff should let a later reader answer:

1. Where in the loop did this span happen?
2. What entered the phase?
3. What left the phase?
4. Which phase should fire next?

When those answers disappear, the locus stops reading as loop-time grammar.

---

<!-- ha.ka.ba:grammar.ooda-ha.members -->

## Members

| Phase | Glyph | LOCUS | One-line |
|---|---|---|---|
| Observe | `✶` | [observe/LOCI.md](../observe/LOCI.md) | Gather what has arrived without premature analysis |
| Orient | `◎` | [orient/LOCI.md](../orient/LOCI.md) | Work gathered signal into pattern, tension, and open questions |
| Decide | `◇` | [decide/LOCI.md](../decide/LOCI.md) | Commit the heading and bound the scope |
| Act | `■` | [act/LOCI.md](../act/LOCI.md) | Carry the decision into artifact |
| Assess | `○` | [assess/LOCI.md](../assess/LOCI.md) | Judge outcome, residue, and loop-back need |

---

<!-- ha.ka.ba:grammar.ooda-ha.conventions -->

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Read grammar in loop-time | MUST | The system moves through phases, not shelves |
| Make receives, changes, and handoff legible | MUST | Temporal motion needs explicit joints |
| Keep Assess inside the loop | MUST | Closure belongs to the instrument |
| Let local tone vary without losing timing | SHOULD | Voice can shift; temporal legibility cannot |
| Use E-Prime pressure on phase prose | SHOULD | Cleaner claim-shape supports cleaner loop-time |

**Relation to E-Prime:** OODA-HA tells a locus when it speaks. E-Prime sharpens how the locus speaks.
The two lenses work together during every grammar pass.

---

<!-- ha.ka.ba:grammar.ooda-ha.procedures-list -->

## Procedures

1. Locate the current phase.
2. Name what the phase receives.
3. Name what the phase changes.
4. Name what the phase hands forward.
5. Name the next expected phase or the closure condition.

**Failure mode:** registry prose that names a concept but never locates the concept in the loop. That
kind of prose turns the instrument back into a shelf.

---

<!-- ha.ka.ba:grammar.ooda-ha.reading-test -->

## Reading Test

A grammar locus passes the OODA-HA test when a future reader can recover all of this:

- the current phase location
- the incoming material
- the outgoing material
- the next temporal move

If the reader can only recover a static definition, the locus still needs loop-time work.

---

<!-- ha.ka.ba:grammar.ooda-ha.cross-references -->

## Cross-References

- [observe/LOCI.md](../observe/LOCI.md)
- [orient/LOCI.md](../orient/LOCI.md)
- [decide/LOCI.md](../decide/LOCI.md)
- [act/LOCI.md](../act/LOCI.md)
- [assess/LOCI.md](../assess/LOCI.md)
- [e-prime/LOCI.md](../e-prime/LOCI.md)
- [_todo/LARES_GRAMMAR_OODA_EPRIME_PASS_PLAN_20260410.md](../../../_todo/LARES_GRAMMAR_OODA_EPRIME_PASS_PLAN_20260410.md)

---



## Loci Registry

See [LOCI.registry.toml](./LOCI.registry.toml) for the canonical OODA-HA registry, listing all phase loci, glyphs, and functions in TOML format. This registry follows the truename pattern and is the authoritative source for phase registration and handoff documentation.

---

## Example

> Example: A session begins in Observe, gathers signals, moves to Orient to pattern-match, then Decides on a course, Acts to implement, and finally Assesses the outcome, looping back if residue remains.

---

## Tension & Texture

OODA-HA surfaces tensions between phases (e.g., analysis paralysis between Orient and Decide, or premature closure between Assess and Observe). Texture emerges from the rhythm of phase transitions and the clarity of handoffs.

---


## Handoff Integrity

Handoff integrity is maintained by:
- Explicit documentation of what each phase receives, changes, and hands forward
- Entry and exit criteria for every phase, with clear handoff notes
- Registry cross-references for all handoff points
- Audit trails for phase transitions, ensuring no silent loss of context or intent
- Example: When Act hands off to Assess, the closure statement and any residue must be explicitly named and registered

---


## Antipatterns

- Skipping Assess and reopening Observe without closure (results in untracked residue)
- Collapsing all phases into static definitions (shelf syndrome: loop loses time structure)
- Failing to document handoff criteria, leading to ambiguous or lost transitions
- Treating Assess as optional residue rather than a required closure (closure must be explicit)
- Using generic or placeholder URIs in markers (must use canonical ha.ka.ba form)

---
## E-Prime Note

OODA-HA phase prose should minimize forms of "to be" to sharpen claim-shape and clarify temporal motion. E-Prime pressure helps avoid static, ambiguous, or passive constructions. Example: Instead of "The phase is complete," use "The phase closes with..." or "Assess hands forward...".

---

<<~&#x0004; -> ? >>
