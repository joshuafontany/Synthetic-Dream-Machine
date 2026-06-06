<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/sigil-kind >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/docs/pono/sigil-kind"
file-path = "bags/@lares/v0.1/docs/pono/sigil-kind.md"
type      = "text/x-memetic-wikitext"
tagspace  = "stable"
register  = "Synthesis-Canon"
manaoio   = 17
mana      = 18
manao     = 18
role      = "lar-kind taxonomy: all SharktoothSigil kind values, dispatch behavior, grammar-cache classification, family rule properties"
cacheable = true
retain    = true
```

<<~ &#x0002; >>

<<~ ahu #head >>

# Sigil Kind Taxonomy

Every SharktoothSigil tiddler carries a `lar-kind` field.
`grammar-cache.ts` reads `lar-kind` to classify each tiddler as a `SigilRule` or `FamilyRule`.
`lar-sigil.ts` uses the resulting `GrammarRules` to drive dispatch at parse time.

The `lar-kind` value determines:
- whether the sigil becomes a `SigilRule` or a `FamilyRule`
- what dispatch path claims it in `lar-sigil.ts`
- what render behavior and template cascade apply

<<~/ahu >>

<<~ ahu #kind-table >>

## Kind Table

```
lar-kind        Rule type    Dispatch path                  Render
────────        ─────────    ─────────────                  ──────
child-slot      SigilRule    compound with closeKey          template cascade; produces child tiddler
edge-sugar      SigilRule    compound leaf or compound block template cascade; no child tiddler
edge            SigilRule    permanent JS exception          template cascade; FROM -> TO arrow syntax
header          SigilRule    permanent JS exception          template cascade; <<~ ? -> uri >>
guest-grammar   SigilRule    compound block                  delegates body to guest interpreter
query           SigilRule    compound leaf                   TW5 filter eval; $list over p1
query-alias     SigilRule    compound leaf                   same render as query; aliasFor points to target
family          FamilyRule   not dispatched                  no render; governs edge validation only
```

<<~/ahu >>

<<~ ahu #child-slot >>

## child-slot

Child-slot sigils produce addressable child tiddlers during deserializer expansion.

Live sigils: `ahu`, `kau`

Properties used by grammar-cache:
- `lar-open-pattern` — opener regex
- `lar-close-pattern` — closer regex

Dispatch: `compound` path with `closeKey = sigil.name`. Body captured between opener and `<<~/SIGIL >>`. In the live wiki, the parent tiddler holds the compound form (`<<~ kahea ahu #slot >>`); the deserializer has already split the body into a child tiddler.

Three render modes participate: HTML (transclude child), carrier (emit inline definition sigil), projection (emit `aka` frozen sigil).

New child-slot sigils require:
1. A SharktoothSigil tiddler with `lar-kind: child-slot`
2. A `\widget ~<name>(p1:"")` definition in the tiddler body
3. A template tiddler tagged `lar:///ha.ka.ba/tags/<name>-template`

No JS change needed.

<<~/ahu >>

<<~ ahu #edge-sugar >>

## edge-sugar

Edge-sugar sigils wrap common edge forms as compact authoring sugar. They lower to `pranala` semantics without requiring the full `FROM -> TO` arrow syntax.

Live sigils: `kahea`, `loulou`, `aka`, `kapu`

Properties:
- `lar-pattern` or `lar-open-pattern` / `lar-close-pattern`
- `lar-default-family` — pranala family applied when no explicit `family:` attr appears
- `lar-alias-for` (optional) — delegates to another sigil's procedure

`kapu` carries `lar-kind: edge-sugar` and operates at compile layer only. It emits no render output — it marks a threshold, restriction, or qualification in the graph edge. Whether `kapu` gains render presence in the HTML mode remains an open question pending mesh network testing.

<<~/ahu >>

<<~ ahu #edge >>

## edge

The `pranala` sigil uses `lar-kind: edge`. It receives its own permanent dispatch path in `lar-sigil.ts` — the `FROM -> TO` arrow syntax cannot generalise into the compound `<<~ WORD ARGS >>` pattern without losing the named keyword pairs (`family:`, `role:`, `slot:`).

Inline form: `<<~ pranala FROM -> TO [family:f] [role:r] >>`
Block form: `<<~ pranala FROM -> TO >>body<<~/pranala >>`

Both forms share opener parsing; closer presence distinguishes them.

<<~/ahu >>

<<~ ahu #header >>

## header

The `pranala-header` sigil uses `lar-kind: header`. It receives its own permanent dispatch path — the `?` self-reference token is not a sigil keyword and cannot generalise into compound.

Form: `<<~ ? -> uri >>`

Appears near the document top, declaring the canonical address of this carrier. `?` marks "this carrier itself." Parser claims pranala-header before any other path.

<<~/ahu >>

<<~ ahu #guest-grammar >>

## guest-grammar

`hana` carries `lar-kind: guest-grammar`. It produces a compound block whose body contains foreign grammar selected by a grammar key in the priming TOML payload.

```text
<<~ hana #work >>
```toml
grammar = "wikitext-filter"
```
[tag[active]] [sort[title]]
<<~/hana >>
```

The body does not parse as TW5 wikitext — it delegates to the interpreter registered for the declared grammar key. In the live TW5 VM, full native filter access renders `hana` unnecessary for simple filter work. `hana` holds its place for:
- Verse scripting (when a Verse grammar key lands)
- TOML block payloads and other structured foreign bodies
- External grammar integrations not natively available in TW5

Registered guest grammars (from `memetic-wikitext.tid`):
- `wikitext-filter` — active; native lararium filter dialect
- `x-tiddlywiki-filter` — legacy/import; deprecated for new authoring

<<~/ahu >>

<<~ ahu #query >>

## query

`ui` carries `lar-kind: query`. It evaluates a TW5 filter expression and renders results.

Form: `<<~ ui FILTER_EXPR >>`

The filter expression runs as `$list filter=<<p1>>` inside the TW5 VM. Full native filter access applies — no sub-grammar isolation.

`query` (`lar-kind: query-alias`) aliases `\query` to the same procedure. `lar-alias-for` points to the target sigil.

<<~/ahu >>

<<~ ahu #family >>

## family

Tiddlers with `lar-kind: family` produce `FamilyRule` objects — not `SigilRule`. They do not participate in dispatch. They govern edge validation for `pranala` edges.

Live families and their properties:

```
Family      dag-required  role-recommended  confidence-bounded
──────      ────────────  ────────────────  ──────────────────
control     true          true              false
dataflow    false         true              false
message     false         true              false
reaction    false         true              false
relation    false         false             false
observe     false         false             true
constraint  false         false             false
spatial     false         true              false
```

- `dag-required` — edges of this family MUST form a DAG; cycles fail validation
- `role-recommended` — a `role:` attribute appears in most well-formed edges of this family
- `confidence-bounded` — edge confidence MUST stay ≤ source node confidence (`observe` family: read edges cannot amplify)

The TypeScript validator `validatePranalaEdge` (in `@lararium/mesh`) enforces these constraints at parse time.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/parser >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala-families >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>
<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>

<<~/ahu >>

<<~ &#x0003; >>
<<~ &#x0004; -> ? >>
