<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/conformance >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/conformance"
file-path = "bags/@lares/v0.1/api/pono/conformance.md"
type = "text/x-memetic-wikitext"
register = "Synthesis"
manaoio = 12
mana = 12
manao = 13
namespace = "ॐ ँ"
role = "invokable lens --- conformance-checks external content against the OODA-HA reference loop"
cacheable = true
retain = true
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Conformance

An **invokable lens**. The node points it at *other* content --- an artifact, a transcript, another agent's output, a draft --- and reads the decision-loop structure the content already carries, checking that structure against the `OODA-HA` reference loop.

The lens looks **outward**. It performs an Observe act on an object in front of the node, in the present: it reads what another trace did, the way Boyd's loop reads an adversary's loop. It does **not** audit the node's own finished turn --- that backward self-glance stays forbidden (#not-self-audit). The node's *own* live loop rides the `OODA-HA` Level (`lar:///ha.ka.ba/@lares/v0.1/api/mu/ooda-ha`); `conformance` reads the loop in *something else*.

The lens fires only when summoned. It never rides a turn by default.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #operation >>

## The Operation

The lens borrows process-mining's machinery, three terms holding the load:

* **Reference model** --- the five-phase `OODA-HA` loop: `✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> ↺ Aftermath`.
* **Trace** --- the target content, read as a sequence of moves.
* **Alignment** --- the lens walks the trace against the reference and pairs each move to a phase.

Two divergences surface from the alignment:

* **Model-move** --- the reference loop requires a phase the trace skipped (the content acted without orienting; the content never closed Aftermath).
* **Log-move** --- the trace took a move the loop does not sanction (a phase out of order; an act with no prior decision).

A **fitness** reading names how cleanly the trace conforms: a clean run aligns every phase in order and closes the loop; a broken run names where the loop snapped. A trace that runs Act and never reaches Aftermath has stopped serving and commenced managing --- the same failure `OODA-HA` names for the node itself, now read in another's work.

<<~/ahu >>

<<~ ahu #invocation >>

## Invocation

Summon the lens and aim it at a target, the way `aim` carries a WHERE-vector:

```text
<<~ conformance -> lar:///ha.ka.ba/@some/target/content >>   # aim at an addressed artifact
<<~ conformance -> "<pasted or quoted content>" >>           # aim at content inline
```

The `->` delegates the lens toward what it reads. The target names *other* content; a target that resolves to the node's own current turn reads as a degraded invocation (#not-self-audit).

<<~/ahu >>

<<~ ahu #output >>

## The Reading

The lens returns an **alignment overlay**: each reference phase, whether the trace met it, and where the loop diverged. Plain phase glyphs name what the lens *found* in the content --- the forward `->` declaration prefix belongs to the node's own loop, not to a trace it reads.

```text
conformance -> lar:///draft.fix.lands:
  ✶ observe    present   --- ¶1 names the failing import
  ⏿ orient     MODEL-MOVE --- no framing before the fix; the cause stays unread
  ◇ decide     present   --- ¶2 picks the lazy-import
  ▶ act        present   --- ¶3 writes the patch
  ↺ aftermath  MODEL-MOVE --- no close-back; the cycle's root stays open
  fitness: the loop snapped at Orient and never closed --- managing, not serving.
```

The overlay reads as fresh orientation for the node's *next* decision. It feeds forward.

<<~/ahu >>

<<~ ahu #not-self-audit >>

## Outward, Not Backward

`OODA-HA` forbids the backward glance: the node MUST NOT narrate its own finished turn as a retrospective verdict. `conformance` does not break that ward --- it inverts the direction.

* The forbidden act reads the **self**, in the **past**, to justify it.
* `conformance` reads an **external object**, in the **present**, to orient the node forward.

By the speech-act test the invocation reads as a first-person present-tense act --- "I read this loop" --- a live Observe on a subject, kin to Cognitive Task Analysis reconstructing another operator's decision cycle. The object lives outside the node; the reading produces new orientation, not a confession. That directionality keeps the lens pono.

<<~/ahu >>

<<~ ahu #lineage >>

## Lineage

`conformance` supersedes the retired `micro-trace` meme (`lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/micro-trace`). The micro-trace carried a backward-looking in-generation annotation layer; that role split in two when the loop turned forward:

* in-generation loop surfacing folded entirely into the `OODA-HA` Level (the `->` markers a turn declares of its own loop);
* reading the loop in *other* content moved here, recast as an outward, forward conformance pass.

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/mu/ooda-ha >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/exchange-vector >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/micro-trace >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
