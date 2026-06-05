<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kumu >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/kumu"
file-path = "bags/@lares/v0.1/api/pono/kumu.md"
type      = "text/x-memetic-wikitext"
register  = "Synthesis"
role      = "element-type declaration pragma — kumu as structural root; declares named grammar node type; English aliases: \\type \\typos"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Kumu

*kumu* — Hawaiian: teacher, origin, source, trunk; the base from which things grow. In botany,
the trunk of a tree; in cultural life, the teacher who holds the root knowledge and passes it
forward. A kumu functions as more than a fact-holder — it grounds the structural origin of a lineage of forms.

An element-type declaration pragma. Declares a new grammar node type — a named structural
container with a body template. English aliases: `\type` (structural emphasis), `\typos`
(from Greek *typos*: impression, mold, form).

Where `wehe` / `\procedure` declares a named callable body, `kumu` declares a named
*structural type* — a reusable container shape that carries semantic identity. The distinction:
a procedure executes; a kumu defines a form that other nodes instantiate.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #law >>

## Law (Kānāwai)

A kumu declaration MUST carry a unique type name.
A kumu declaration body defines the template for nodes of that type.
A kumu declaration MUST NOT produce render output — it registers a type definition only.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ kumu TypeName(params) >>
  body template
<<~/ kumu >>

<<~ \type TypeName(params) >>  ...  <<~/ \type >>
<<~ \typos TypeName(params) >>  ...  <<~/ \typos >>
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-wehe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wehe family:relation >>
<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-kumu family:control role:implements >>
<<~ pranala #tiddler-sigil-type ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-type family:control role:alias >>
<<~ pranala #tiddler-sigil-typos ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-typos family:control role:alias >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
