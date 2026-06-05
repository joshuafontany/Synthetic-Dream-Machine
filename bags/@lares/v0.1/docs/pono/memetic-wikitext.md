<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/memetic-wikitext >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/pono/memetic-wikitext"
file-path = "bags/@lares/v0.1/docs/pono/memetic-wikitext.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
register = "Synthesis-Canon"
manaoio = 14
mana = 16
manao = 17
role = "extended documentation surface for memetic-wikitext examples, profile guidance, boundary notes, and migration residue"
cacheable = false
retain = false
invariant = false
```



<<~ &#x0002; >>


<<~ ahu #meme-header >>

# Memetic Wikitext — Extended Docs

This file does not bind invariant law.
Law lives in `lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext`.
This surface carries guidance, examples, and split residue.

<<~/ahu >>


<<~ ahu #primitive-reading-guide >>

## Primitive Reading Guide

| Primitive | Root job | Common drift to avoid |
|---|---|---|
| `ahu` | local worksite and anchor | using it as a generic wrapper with no locality pressure |
| `loulou` | relation or outward path | treating it like transclusion |
| `aka` | passive inclusion | letting it imply live invocation |
| `kahea` | active invocation | flattening it into passive reference |
| `kapu` | qualification and boundary posture | letting it replace the act it qualifies |
| `ui` | query surface | using it as generic prose emphasis |
| `hana` | bounded guest work | letting guest grammar redefine root primitives |
| `?` | explicit unresolved pressure | decorative vagueness or fake closure |

`loulou` serves as a named `pranala` edge.
Other quick chant terms may also serve as named `pranala` sugar where their own invariant loci bind the pattern.

<<~/ahu >>

<<~ ahu #authoring-profiles >>

## Recommended Authoring Profiles

| profile | when to use it | what to keep visible |
|---|---|---|
| `teaching` | first contact, onboarding, tiny fixtures | explicit anchors, short explanations, one distinction per example |
| `authoring` | ordinary drafting and revision | compact law plus just enough examples to keep flow |
| `canonical` | stable parent surfaces | the smallest lawful root, explicit thresholds, no tutorial swell |
| `recovery` | salvage, repair, migration | residue, uncertainty, and degraded truth named plainly |

Profiles tune posture.
They do not rewrite primitive meaning.

<<~/ahu >>

<<~ ahu #minimum-boot-examples >>

## Minimum Boot Example Set

### Minimum document

````markdown
<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/example >>




<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
````

### Minimum relation, inclusion, invocation

```text
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/target >>
<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/source >>
<<~ kahea lar:///ha.ka.ba/@lares/v0.1/api/source >>
```

### Minimum governed and uncertain work

```text
<<~ kapu invocation -> bounded|? >>
<<~ ? -> ahu #draft-worksite >>
Work begins before full binding settles.
<<~/ahu >>
```

<<~/ahu >>

<<~ ahu #boundary-notes >>

## Boundary Notes

The root now keeps semantic law and minimum boot grammar only.
These concerns left the old 1285-line parent first:

- long example ladders
- profile guidance
- expanded confidence and rating commentary
- detailed parser bridge prose
- detailed render-pipeline bridge prose
- archive-grade explanation and repetition

When parser and render-pipeline receive their own stable carriers, deepen their contracts there instead of re-expanding the root.

<<~/ahu >>

<<~ ahu #migration-note >>

## Migration Note

This docs companion formed during the 2026-04-21 yin split/refine/clean pass.
The old parent mixed invariant law, operator procedure, examples, bridge commentary, and rating notes in one surface.
The current shape keeps:

- parent invariant at `lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext`
- operational procedure at `lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext/SKILL`
- extended guidance here

<<~/ahu >>


<<~ ahu #w3c-lineage-verdicts >>

## W3C + Prior Art Lineage Verdicts

The following verdicts emerged from a formal prior-art review against W3C, IETF, TiddlyWiki, and adjacent specifications. They constrain how memetic wikitext claims its own identity and how future spec work should frame compliance.

**1. Nearest live ancestor: TiddlyWiki, not HTML.**
Memetic sigils descend from TiddlyWiki's transclusion runtime. The sigil surface should claim descent from **transclusive text composition**, not from HTML extension. The best local analogue for `kahea` is TiddlyWiki's addressed transclusion surface, not generic macro text substitution.

Sharper lineage statement: memetic wikitext inherits not only TiddlyWiki's transclusion features, but also its style of language definition — a parseable text surface described through explicit parser phases, rule classes, and structural lowering into a runtime-interpretable tree.

**2. TiddlyWiki defines grammar operationally, not as one closed EBNF.**
TW5 uses a recursive descent WikiText parser whose rules load from separate `module-type: wikirule` modules typed as `pragma`, `block`, or `inline`. Memetic wikitext inherits this operational grammar model — rule-table dispatch, not monolithic grammar file.

**2a. Templates operate as context-sensitive masks.**
`{{||A}}` applies template `A` to the current tiddler — generic text references inside the template resolve against the target tiddler, not the template source. TW5 explicitly calls this "applying a mask." This grounds the `kahea -> cascade` story: not "macro syntax" but context-sensitive masked transclusion.

**2b. Surface notation lowers into a widget tree — two-stage precedent.**
TW5 docs show `{{MyTiddler||Template}}` generating a `TiddlerWidget` containing a `TranscludeWidget`; `{{{ filter }}}` generating a `ListWidget`. This is the document notation → structural lowering → runtime realization model memetic wikitext inherits.

**2c. Hard vs soft transclusion maps to visible vs latent meme-edge distinction.**
TW5 distinguishes hard transclusions (detectable by superficial WikiText inspection) from soft transclusions (hidden in procedures, variables, or dynamically generated widgets). The visible vs latent meme-edge distinction has direct TW5 precedent.

**2d. Recursion and self-reference are a documented error seam.**
TW5 defines `{{!!text}}` as a "Recursive transclusion error" and treats indirect cycles as the same class of failure. Memetic sigils need to define direct and indirect recursion failures explicitly: self-targeting `ahu`, recursive wrapper re-entry, and cyclic `kahea` graphs.

**2e. Cascades are first-match rule stacks — `kahea -> cascade` is native.**
TW5 cascade page: a list of conditions evaluated in turn, ordered by tagged-tiddler ordering, each rule a filter expression, first non-empty result wins. `kahea -> filter://cascade...` is conceptually aligned with existing TW5 selection machinery, not an arbitrary detour.

**3. Structural discipline: XML/XHTML well-formedness, not HTML looseness.**
XML and XHTML supply the right model for well-formedness, nesting, closure, quoting, and conformance language. Sigils SHOULD look more like XML/XHTML than HTML in their closure discipline.

**4. Fragment semantics require a representation model.**
W3C fragment guidance requires fragment meaning to bind to a representation or media type, not just to a URI scheme. The `#slot` anchor form in `ahu` needs a registered media type (`text/x-memetic-wikitext`) to carry normative fragment semantics.

**5. Normative language: RFC 8174 + W3C QA guidance.**
`MUST`, `SHOULD`, `MAY`, conformance classes, and claims follow RFC 8174. The `aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119` edge in every invariant file satisfies this requirement.

**6. Machine-readable artifacts: prose primary, schemas subordinate.**
JSON Schema and OpenAPI show the correct authority split. Prose spec text remains primary; validators and schemas are valuable but subordinate. The TypeScript `FAMILY_CONTRACTS` validator in `pranala-parser.ts` follows this correctly.

**7. Runtime rigor: packet shapes, capability boundaries, refusal behavior.**
JSON-RPC and MCP show how to specify runtime packets and capability negotiation without leaving behavior to folklore. The `kahea` processing stage (parser-level? post-parse? runtime transclusion?), context inheritance, and unresolved-target behavior remain the open design tests for the v5 spec:

- What processing stage does bare `kahea` inhabit?
- Does arrowed `kahea` receive caller context explicitly or by ambient inheritance?
- Can `kahea` target partial body ranges, or only whole memes and `ahu` worksites?
- What is the exact behavior for: unresolved source, unresolved target, recursion cycle, permission attenuation failure?
- Do we need a one-time substitution mode separate from live transclusion?
- Do remote or cross-system calls require explicit opt-in?

These design tests drive the v5 spec rebuild. They came from the prior-art comparison against TiddlyWiki, XInclude, DITA, AsciiDoc, Jekyll, Hugo, XSLT, and MediaWiki.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext/SKILL >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~ pranala #implements-memetic-wikitext ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:implements >>
<<~/ahu >>

<<~ &#x0004; -> ? >>
