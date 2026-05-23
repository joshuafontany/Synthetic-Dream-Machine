<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heihei >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/heihei"
file-path = "bags/@lares/v0.1/api/pono/heihei.md"
type = "text/x-memetic-wikitext"
confidence   = 0.82
register     = "CS"
manaoio      = 0.80
mana         = 0.82
manao        = 0.80
role         = "race/compete block-container sigil — multiple candidate bodies, first match wins; Hawaiian alias for \\if"
cacheable    = true
retain       = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Heihei

*heihei* — Hawaiian: race, competition (foot race, canoe race); to race, to compete.
General competitive racing — a structured contest where candidates run and the outcome depends
on who resolves the condition. Until resolved, uncertainty holds. The competition's outcome reads
purposeful and ordered.

A block-container sigil with competitive conditional semantics. Multiple candidate bodies
enter the race; the first body whose filter condition resolves non-empty shapes the output.
English alias: `\if` (TW5 filter-conditional form).

Implements TW5's `<%if filter%>...<%endif%>` shortcut (TW5 5.3+) at the sigil grammar level.
The `\race` concurrency sigil carries the parallel execution posture; `heihei` carries the
competitive-filter selection posture (serial evaluation, first non-empty result wins).

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #ooda-ha >>

✶ sense the filter expression — what condition does this candidate test?
⏿ orient: heihei = first-match wins; evaluate filter; non-empty result = this body renders; else skip
◇ filter runs in currentTiddler context; boolean = at least one result; imperative-conditional intuition misleads here
▶ emit conditional block node; render body when filter passes; skip body when filter empty
⤴ no output when filter fails; output is body content when filter passes
↺ confirm filter semantics correct; TW5 filters produce result sets — they do not short-circuit as booleans

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

A heihei block MUST carry a filter expression as its first argument.
A heihei block MUST close with `<<~/ heihei >>` (or `<<~/ \if >>`).
A heihei block body MUST render only when the filter yields a non-empty result.
A heihei filter MUST be a valid TW5 filter expression.
A heihei block MUST NOT carry mode= — control flow has no projection posture.

TW5 filter semantics: `[<variable>match[value]]` for equality, `[has[field]]` for field existence.
`[all[tiddlers]tag[MyTag]]` yields the set of matching tiddlers (truthy if non-empty).

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

Hawaiian form:
```text
<<~ heihei [filter-expression] >>
body rendered when filter passes
<<~/ heihei >>
```

English alias form (identical semantics):
```text
<<~ \if [filter-expression] >>
body rendered when filter passes
<<~/ \if >>
```

TW5 shortcut expansion:
```text
<%if [filter-expression]%>
body
<%endif%>
```

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
sigil          = "heihei"
kind           = "control"
layer          = "block"
alias          = ["\\if"]

open-pattern  = '<<~\s*heihei\s+([^>]+?)\s*>>'
close-pattern = '<<~\/heihei\s*>>'

[alias-map]
"\\if" = "heihei"
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-wehe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wehe family:relation >>
<<~ pranala #to-huli ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/huli family:relation >>
<<~ pranala #to-kahawai ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahawai family:relation >>
<<~ pranala #to-mukuwai ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/mukuwai family:relation >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/wai-retired >>
<!-- wai (TOML: conditional alias) retired; heihei carries the conditional-filter semantics -->

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-heihei family:control role:implements >>
<<~ pranala #tiddler-sigil-if ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-if family:control role:alias >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
