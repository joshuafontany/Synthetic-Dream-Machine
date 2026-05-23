<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/aka >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/aka"
file-path = "bags/@lares/v0.1/api/pono/aka.md"
type = "text/x-memetic-wikitext"
confidence   = 0.84
register     = "CS"
manaoio      = 0.82
mana         = 0.86
manao        = 0.84
role         = "observe-family edge sugar — shadow transclusion; read-only live embed; shorthand for pranala family:observe"
cacheable    = true
retain       = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Aka

*aka* — Hawaiian: shadow, reflection; to be like; also-known-as.

An observe-family edge sugar. Embeds a shadow of the target at the source — live inspection without
ownership stake. TW5 shadow-tiddler semantics: the target's content shows through without being consumed.
Sugar for `<<~ pranala ? -> URI family:observe >>`. The `observe` family is confidence-bounded:
edges SHOULD carry a confidence rating when the observation is uncertain.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #ooda-ha >>

✶ sense the target URI — this meme observes that one; note whether confidence bound is needed
⏿ orient: family:observe, traversal:source-to-target, propagation:none; read-only; no execution pulse
◇ confidence-bounded: if the observation carries uncertainty, SHOULD declare confidence on the edge
▶ emit EdgeSugarNode with sigil:aka, family:observe; render shadow transclusion at source position
⤴ target content is live-readable at source; source holds no lifecycle stake in target
↺ confirm shadow stable; target still resolvable; no ownership or mutation transferred

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

An aka MUST bind a source socket and a target URI.
An aka MUST carry `family:observe`.
An aka MUST NOT mutate the target.
An aka MUST NOT carry an execution pulse.
An aka SHOULD carry `confidence` when the observation is uncertain.
An aka MUST NOT form a cycle — directly or transitively.

`family:observe` — live inspection, reveal, watch; carries shadow transclusion pressure.
The source sees through to the target. The target does not know it is being watched.
Propagation is none: observation is pull, not push.

The `observe` family is `confidence-bounded: true`. This means the parser flags aka edges
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
<<~ pranala ? -> URI family:observe lifecycle:instance traversal:source-to-target propagation:none >>
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
default-family = "observe"
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

<<~ pranala #implements-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #to-loulou ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loulou family:relation >>
<<~ pranala #to-kahea ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahea family:relation >>

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-aka family:control role:implements >>
<<~ pranala #tiddler-sigil-shadow ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-shadow family:control role:alias >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
