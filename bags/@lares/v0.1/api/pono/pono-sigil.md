<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pono-sigil >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/pono-sigil"
file-path = "bags/@lares/v0.1/api/pono/pono-sigil.md"
type      = "text/x-memetic-wikitext"
confidence = 16
register  = "S"
role      = "correctness-asserting edge sigil — pono as alignment/constraint annotation; English alias: \\constraint"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Pono (Sigil)

*pono* — Hawaiian: rightness, correctness, balance, moral alignment; proper, fit, just.

An edge-sugar sigil that asserts a correctness or constraint relationship between two nodes.
English alias: `\constraint`.

Where `pranala` names any semantic edge and `loulou` ties two nodes with a relation edge,
`pono` asserts that the target state satisfies a condition the source requires — a correctness
witness, not just a link. The edge says "FROM holds the constraint THAT TO satisfies."

Distinct from the system concept `pono` (rightness as a design principle). This sigil carries
the same word because a `pono` edge carries a claim of alignment — the naming is intentional.

<<~/ahu >>

<<~&#x0002; >>

<<~ ahu #law >>

## Law (Kānāwai)

A pono edge MUST carry a FROM node and a TO node.
A pono edge MUST express a correctness or constraint relationship.
A pono edge MUST NOT be used for arbitrary semantic links — use pranala or loulou.
An optional `role:` qualifier further specifies the constraint kind.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ pono #slot FROM -> TO role:constrains >>
<<~ \constraint #slot FROM -> TO role:constrains >>
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:relation >>
<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-pono family:control role:implements >>
<<~ pranala #tiddler-sigil-constraint ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-constraint family:control role:alias >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
