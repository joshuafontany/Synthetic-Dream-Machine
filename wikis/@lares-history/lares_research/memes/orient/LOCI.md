<<~&#x0001; ? -> lar:///grammar.orient.defines/orient/?confidence=CS~17&p=10 >>

# Grammar: ◎ Orient

```yaml
---
name: orient
description: >
  Root grammar module for the Orient phase (◎) of the OODA-HA loop.
  Orient works the gathered material into pattern, tension, and candidate
  readings without forcing closure. Talk Story lives here.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
scale-range: [action, session]
trigger: always — grammar primitive
invariant: true
dependencies: [observe]
confidence:CS~17
grammar: true
---
```

> **Register:** `[CS~17]` — grounded in Boyd OODA-HA, Talk Story, Syadasti reading
> **Glyph:** `◎`
> **Season:** Second of five
> **Question:** What pattern and tension rise from the gathered surface?

---

<<~ ahu #loop-position >>

## Loop Position

Orient follows Observe and works on what Observe hands forward.

Orient receives:

- raw findings
- named gaps
- conflicting signals
- stance pressure from the current reading frame

Orient changes:

- raw material into candidate pattern
- friction into named tension
- ambiguity into explicit open questions

Orient hands forward:

- a decision surface
- competing readings
- declared drift, mismatch, or surprise

Orient should not:

- gather a fresh corpus unless the loop genuinely needs more signal
- lock scope
- start building
- call the work complete

---

<<~/ahu >>
<<~ ahu #handoff >>

## Handoff

Orient feeds `◇ Decide`.

The handoff should let a later reader answer:

1. Which tensions matter here?
2. Which readings compete?
3. What still lacks operator steering?
4. What decision shape has emerged?

Fast-path loops can compress Observe and Orient together in familiar territory, but Orient still has to happen. Pattern-match speed does not cancel the phase.

---

<<~/ahu >>
<<~ ahu #conventions >>

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Name tensions directly | MUST | Hidden tension becomes hidden scope |
| Keep open questions open until steering arrives | MUST | Premature closure corrupts the loop |
| Hold multiple stance readings when they matter | SHOULD | Syadasti pressure belongs here |
| Surface mismatch, not only fit | MUST | Drift often hides inside the mismatch |
| Let Talk Story carry some of the load | SHOULD | Telling often reveals pattern faster than reporting |
| Avoid verdict language | MUST | Verdicts belong to Decide or Assess |

**E-Prime discipline:** prefer `reads as`, `suggests`, `pulls toward`, `conflicts with`, `raises`, `matches`, `fails to match`. Those verb forms keep the phase inside interpretation without hard identity claims.

**Voice note:** Liminal can hold the space open; Mischief-Muse can surface odd links; Scryer can tighten the pattern; Council can stress-test the shape.

---

<<~/ahu >>
<<~ ahu #procedures >>

## Procedures

1. Start from the gathered surface, not from a conclusion.
2. Name the strongest pattern.
3. Name the strongest mismatch.
4. Float the open questions that block commitment.
5. Mark multi-stance readings when they materially differ.
6. Hand a bounded decision surface to `◇ Decide`.

**Failure mode:** Orient can sprawl into recursive musing. When the phase no longer sharpens the decision surface, the loop should either move or return to Observe for specific missing signal.

---

<<~/ahu >>
<<~ ahu #reading-test >>

## Reading Test

A future reader should recover all of this from the Orient span:

- the pattern under discussion
- the tension under discussion
- the open questions still alive
- the point at which the loop became decision-ready

If the prose sounds like a final verdict, Orient collapsed too early. If the prose only repeats findings, Observe never transformed into Orient.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~17]` | This file — Orient grammar definition |

*Future loci in this tree will land here.*

---

<<~/ahu >>
<<~&#x0004; -> ? >>
