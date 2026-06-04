<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala-header >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/pranala-header"
file-path = "bags/@lares/v0.1/api/pono/pranala-header.md"
type = "text/x-memetic-wikitext"
confidence   = 18
register     = "CS"
manaoio      = 17
mana         = 18
manao        = 17
role         = "meme header sigil — <<~ ? -> uri >> declares this carrier's canonical URI; permanent JS exception"
cacheable    = true
retain       = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Pranala-Header

The carrier self-declaration sigil. `<<~ ? -> uri >>` appears at the top of a meme file and
declares the canonical URI that this carrier holds. The `?` token means "this carrier itself" —
a self-reference not expressible as a regular sigil keyword.

Permanent JS exception: the `?` token and its `->` arrow require dedicated parser logic in
`lar-sigil.ts`. No TOML entry and no wikitext body; recognition comes from `matchPranalaHeaderAt`.

<<~/ahu >>

<<~&#x0002; >>

<<~ ahu #ooda-ha >>

✶ sense the `?` token — this is a self-reference; the carrier declares its own canonical address
⏿ orient: header sigil; appears once per file at the iam block; creates no edge to an external target
◇ the uri is the canonical lar:/// address of this meme; all pranala edges source from this socket
▶ emit PranalaHeaderNode; set `currentTiddler` equivalent to the declared URI for all edges in this meme
⤴ all `<<~ pranala ? -> target >>` edges in this meme resolve `?` to the declared canonical URI
↺ confirm exactly one pranala-header per meme; URI matches the iam `uri-path` field

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

A pranala-header MUST appear exactly once per meme, adjacent to the iam TOML block.
A pranala-header MUST carry a `lar:///` URI.
A pranala-header's URI MUST match the meme's `uri-path` iam field.
A pranala-header MUST NOT appear inside an ahu slot body.
A pranala-header's `?` token is reserved — MUST NOT be used as a sigil name elsewhere.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ ? -> lar:///ha.ka.ba/path/to/this-meme >>
```

Regex (canonical):
```
/<<~\s*\?\s*->\s*(\S+)\s*>>/
```
Groups: `[full, canonical-uri]`

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
sigil          = "pranala-header"
kind           = "header"
layer          = "block"
js-exception   = true

pattern = '<<~\s*\?\s*->\s*(\S+)\s*>>'

[captures]
uri = 1
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #implements-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:implements >>
<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-pranala-header family:control role:implements >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
