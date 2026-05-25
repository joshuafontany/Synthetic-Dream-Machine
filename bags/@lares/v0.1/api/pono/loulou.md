<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loulou >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/loulou"
file-path = "bags/@lares/v0.1/api/pono/loulou.md"
type = "text/x-memetic-wikitext"
confidence   = 17
register     = "CS"
manaoio      = 16
mana         = 17
manao        = 17
role         = "relation-family edge sugar — outgoing semantic link; no execution pulse; shorthand for pranala family:relation"
cacheable    = true
retain       = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Loulou

*loulou* — Hawaiian: to tie, bind, fasten; to link together.

An outgoing relation-family edge sugar. Names what kind of connection holds between two sockets.
Carries no execution pulse. Sugar for `<<~ pranala ? -> URI family:relation >>`.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #ooda-ha >>

✶ sense the target URI at the link mouth — note the destination socket
⏿ orient: family:relation, traversal:source-to-target, propagation:none; no execution pulse
◇ cycles prohibited; target MUST resolve to a known meme or produce a dead-link warning
▶ emit EdgeSugarNode with sigil:loulou, family:relation; render as directed relation arc
⤴ edge registered in pranala graph; traversal queries from source can now reach target
↺ confirm link stable; no ownership or lifecycle stake transferred

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

A loulou MUST bind a source socket and a target URI.
A loulou MUST carry `family:relation`.
A loulou MUST NOT carry an execution pulse.
A loulou MUST NOT form a cycle — directly or transitively.
A loulou MAY carry `role` when the relation encodes a specific semantic.
A loulou SHOULD NOT be used for dataflow, control, or reaction — use the appropriate family sugar for those.

`family:relation` — names an ontological or semantic connection; traversal moves source-to-target;
propagation is none. The edge says what holds between the sockets, not what runs between them.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ loulou URI >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/meme#law >>
```

`?` source resolves to the nearest enclosing socket (ahu fragment or meme URI).
A named `#fragment` anchor SHOULD win socket resolution before the enclosing meme URI.

Regex (canonical):
```
/<<~\s*loulou\s+(\S+)\s*>>/
```
Groups: `[full, target-uri]`

Full pranala expansion:
```text
<<~ pranala ? -> URI family:relation lifecycle:instance traversal:source-to-target propagation:none >>
```

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

Canonical TOML form. Source of truth for `BUILTIN_LOULOU_RE` and `loulouDefaultFamily`
in `packages/lararium-mesh/src/pranala-parser.ts`.

```toml
sigil          = "loulou"
kind           = "edge-sugar"
layer          = "both"
default-family = "relation"
render-mode    = null
alias          = []

pattern = '<<~\s*loulou\s+(\S+)\s*>>'

[captures]
to = 1

[family-contract]
role-recommended   = false
confidence-bounded = false
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #implements-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #to-aka ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/aka family:relation >>
<<~ pranala #to-kahea ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahea family:relation >>
<<~ pranala #to-papalohe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/papalohe family:relation >>

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-loulou family:control role:implements >>
<<~ pranala #tiddler-sigil-link ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-link family:control role:alias >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
