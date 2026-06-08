<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/aka >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/aka"
file-path = "bags/@lares/v0.1/api/pono/aka.md"
type = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
manaoio      = 16
mana         = 17
manao        = 17
role         = "transclusion-family edge sugar — frozen/shadow transclusion; read-only embed; shorthand for pranala family:transclusion"
cacheable    = true
retain       = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Aka

*aka* — Hawaiian: shadow, reflection; to be like; also-known-as.

A transclusion-family edge sugar. Embeds a frozen shadow of the target at the source — read-only, no ownership stake. TW5 shadow-tiddler semantics: the target's content shows through at the source position.
Sugar for `<<~ pranala ? -> URI family:transclusion >>`. The `transclusion` family is confidence-bounded:
a frozen embed can age from its source, so edges SHOULD carry a confidence rating when the embed is uncertain.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ sense the target URI — this meme observes that one; note whether confidence bound is needed
⏿ orient: family:transclusion, traversal:source-to-target, propagation:none; read-only; no execution pulse
◇ confidence-bounded: if the observation carries uncertainty, SHOULD declare confidence on the edge
▶ emit EdgeSugarNode with sigil:aka, family:transclusion; render shadow transclusion at source position
↺ target content is live-readable at source; source holds no lifecycle stake in target; confirm shadow stable; target still resolvable; no ownership or mutation transferred

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

An aka MUST bind a source socket and a target URI.
An aka MUST carry `family:transclusion`.
An aka MUST leave the target unchanged.
An aka MUST stay inert, carrying no execution pulse.
An aka SHOULD carry `confidence` when the observation is uncertain.
An aka MUST stay acyclic — directly and transitively.

`family:transclusion` — frozen content embedding; the source shows the target's content through
without consuming or owning it. Propagation is none: a frozen embed is pulled, not pushed.

The `transclusion` family is `confidence-bounded: true`. This means the parser flags aka edges
that lack a confidence rating when the source-side context signals uncertainty.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ aka URI >>
<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>
<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>
```

`?` source resolves to the nearest enclosing socket.
Fragment `#slot-name` addresses a named ahu child directly.

Regex (canonical):
```
/<<~\s*aka\s+(\S+)\s*>>/
```
Groups: `[full, target-uri]`

Full pranala expansion:
```text
<<~ pranala ? -> URI family:transclusion lifecycle:instance traversal:source-to-target propagation:none >>
```

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

Canonical TOML form. Source of truth for `BUILTIN_AKA_RE` and `akaDefaultFamily`
in `packages/lararium-mesh/src/pranala-parser.ts`.

```toml
sigil          = "aka"
kind           = "edge-sugar"
layer          = "both"
default-family = "transclusion"
render-mode    = null
alias          = []

pattern = '<<~\s*aka\s+(\S+)\s*>>'

[captures]
to = 1

[family-contract]
role-recommended   = false
confidence-bounded = true
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #has-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:has >>
<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>
<<~ pranala #to-loulou ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loulou family:relation >>
<<~ pranala #to-kahea ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahea family:relation >>

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-aka family:control role:has >>
<<~ pranala #tiddler-sigil-shadow ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-shadow family:control role:alias >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
