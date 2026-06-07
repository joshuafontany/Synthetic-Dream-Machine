<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heihei >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/heihei"
file-path = "bags/@lares/v0.1/api/pono/heihei.md"
type = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
manaoio      = 16
mana         = 16
manao        = 16
role         = "wikispace conditional block-container — first non-empty filter renders its body; the TW5 `\\if` cascade (with kahawai=`\\elseif`, mukuwai=`\\else`); content selection on the document surface"
cacheable    = true
retain       = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Heihei

*heihei* — Hawaiian: race, competition; a structured contest where candidates run until one resolves.

The **wikispace conditional**. A block-container holds candidate bodies, each guarded by a TW5 filter; the **first body whose filter resolves non-empty renders**, the rest skip. With `kahawai` (`\elseif`) and `mukuwai` (`\else`) it forms the conditional cascade (if / elseif / else) — serial filter-evaluation, content selection on the Story-River surface. English alias: `\if` (TW5 `<%if filter%>…<%endif%>`, 5.3+).

**Not a concurrency race, and not the canvas conditional.** `heihei` tests filters to *select content* in the wiki (serial, by filter-match). `holo` (`\race`) races *parallel flows* on the canvas (parallel, by completion-time), cancelling losers — concurrency, not conditional. And the **Verse visual-scripting conditional** (a flow-branch on the canvas) reads as a **separate principle**: the same conditional shape, but it branches *execution flow* on the TLDraw surface rather than selecting *content* in the document. Three distinct principles; only the surface word "first" ever made them look alike.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ sense the filter expression — what condition does this candidate test?
⏿ orient: heihei = first-match wins; evaluate filter; non-empty result = this body renders; else skip
◇ filter runs in currentTiddler context; boolean = at least one result; imperative-conditional intuition misleads here
▶ emit conditional block node; render body when filter passes; skip body when filter empty
↺ no output when filter fails; output is body content when filter passes; confirm filter semantics correct; TW5 filters produce result sets — they do not short-circuit as booleans

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

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-heihei family:control role:has >>
<<~ pranala #tiddler-sigil-if ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-if family:control role:alias >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
