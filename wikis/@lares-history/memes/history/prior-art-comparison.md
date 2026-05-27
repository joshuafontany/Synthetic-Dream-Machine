<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares-history/memes/history/prior-art-comparison >>
```toml iam
uri-path  = "ha.ka.ba/@lares-history/memes/history/prior-art-comparison"
file-path = "wikis/@lares-history/memes/history/prior-art-comparison.md"
type      = "text/x-memetic-wikitext"
tagspace  = "archive"
confidence = 18
register  = "S"
manaoio   = 17
mana      = 18
manao     = 17
role      = "historical record of the 8-system prior-art comparison battery and 7 open design tests that shaped kahea/ahu/loulou design pressure and the W3C lineage verdict"
cacheable = false
retain    = false
```

<<~&#x0002;>>

<<~ ahu #head >>

# Prior Art Comparison Battery (2026-04-12)

Historical record of the formal prior-art review that produced the W3C lineage verdicts now in `lar:///ha.ka.ba/@lares/docs/pono/memetic-wikitext#w3c-lineage-verdicts`.

Source files: `wikis/@lares-history/lares_research/memetic-wikitext/sigil-research.md` and `w3c-spec-research-v01.md` (both deleted 2026-05-16 after consume pass).

The verdicts landed in live docs. This record preserves the per-system reasoning that produced them.

<<~/ahu >>

<<~ ahu #comparison-axes >>

## Comparison Axes

Seven axes guided each system comparison:

1. **Address form** — direct name, path, URI, fragment, key, or query
2. **Inclusion type** — static inclusion, parameterized inclusion, template masking, active transformation, or late-bound indirection
3. **Processing stage** — preprocessor, parser, tree transformation, template runtime, or post-parse rendering
4. **Context behavior** — whether included content keeps its own context, inherits the caller's context, or receives explicitly passed context
5. **Range/partial selection** — whole object only, lines, tagged regions, fragments, element ranges, or filtered selections
6. **Error behavior** — unresolved target, recursion loop, duplicate IDs, invalid scope, missing permissions
7. **Security / authority** — restriction by safe mode, namespace, map scope, or processor configuration

<<~/ahu >>

<<~ ahu #per-system >>

## Per-System Findings

**TiddlyWiki** — nearest live ancestor; strongest precedent for transclusion, templates, cascades, callable `<< >>` objects, and parser-driven lowering. Direct transclusion and transclusion-through-template are distinct. Filters form a pipeline algebra. Parser modes and rule modules define the language operationally. Recursion errors are first-class.
→ *Design pressure:* `kahea` bare form maps to TW5 direct transclusion; `kahea -> procedure/cascade` maps to template masking and callable object flow.

**MediaWiki** — very mature transclusion culture; clear distinction between inclusion, substitution, and parser-function evaluation. `{{#function: ...}}` is visibly distinct from plain transclusion. Substitution (`subst:`) exists as a one-time copy, not live transclusion.
→ *Design pressure:* active `kahea` should remain visibly distinct from static `aka`, the way MediaWiki separates plain transclusion from parser functions. The system should stay more explicit than MediaWiki's collapsing-into-one-brace-family.

**XInclude** — canonical W3C inclusion mechanism; strongest prior art for direct-reference inclusion with an explicit processing model and fallback behavior. `xi:fallback` gives explicit unresolved-target fallback. Defined as infoset-to-infoset transformation, not parser behavior.
→ *Design pressure:* does `kahea` need an explicit fallback surface? Should body inclusions be described as tree transformation rather than parser behavior? Good lower bound for "static `aka` only."

**DITA conref/conkeyref/keyref** — strongest industrial prior art for structured content reuse, partial range inclusion, late binding, and validity-preserving reuse. Direct content reference and key-based indirection are distinct. Processors compare restrictions to ensure reused content remains valid in the new context.
→ *Design pressure:* `ahu` as reusable internal target vs conref element targeting; `kahea` bare vs key-indirected targeting; whether memetic sigils need a `conrefend`-like range form for multi-node inclusion. Best prior art for proving inclusion can remain structured and valid under aggressive reuse.

**AsciiDoc/Asciidoctor** — very clear documentation of preprocessing vs parsing. Include directive is a preprocessor directive, not a block macro — processing stage matters. Partial inclusion by line range or tagged regions. Includes restricted by safe mode and URI-read settings. Repeated inclusion can create duplicate IDs.
→ *Design pressure:* whether `kahea` should be parser-level or post-parse runtime; how duplicate target collisions should be handled; how security settings should constrain remote inclusion. "include" and "macro" should NOT be collapsed into one processing stage.

**Jekyll + Liquid** — compact, widely used include model. Good prior art for parameterized snippets and relative include scoping. `include_relative` narrows scope to current file subtree and forbids `../` escapes upward. Custom Liquid tags provide a separate active execution surface.
→ *Design pressure:* whether `kahea` target resolution should support relative and bounded local scopes; whether active behavior should remain visibly distinct from passive inclusion; whether path ascent and external escape should be forbidden by default.

**Hugo Partials and Shortcodes** — strong prior art for the split between layout-level includes and content-level invocation. Partials are template includes with explicitly passed context. Shortcodes are content-surface invocation objects. Context rebinding is explicit and central. Templates can return rendered output or values.
→ *Design pressure:* whether `ahu` body-local `kahea` should distinguish layout-level vs content-level invocation; whether active `kahea` should explicitly pass context rather than silently inherit it; whether procedure/function targets should support returning data as well as rendered output.

**XSLT** — strongest prior art for transform-oriented rendering through template application, override precedence, and import/include layering. `xsl:include` preserves semantics; `xsl:import` introduces precedence and override. `xsl:apply-templates` processes a node through the active template system. Modes let the same node render multiple ways.
→ *Design pressure:* whether `kahea -> target` should behave more like include, import, or apply-templates; whether memetic sigils need a concept analogous to XSLT modes; whether wrapper/inner precedence should be formalized the way import precedence is formalized in XSLT.

<<~/ahu >>

<<~ ahu #highest-value-table >>

## Highest-Value Prior Art by Spec Seam

| Seam | Best prior art |
|---|---|
| Nearest lineage | TiddlyWiki |
| Strict inclusion processing | XInclude |
| Structured reuse with validity constraints | DITA |
| Preprocessor-stage inclusion and security gating | AsciiDoc |
| Parameterized site-template inclusion | Jekyll |
| Content-surface render invocation | Hugo |
| Transform modes and precedence | XSLT |
| Broad public familiarity with live transclusion | MediaWiki |

<<~/ahu >>

<<~ ahu #design-tests >>

## Open Design Tests for v5 Spec

The prior-art review produced seven design tests. These remain unresolved as of the consume pass (2026-05-16) and drive the v5 spec rebuild:

1. Does bare `kahea` inhabit: pre-parse inclusion, parse-time lowering, or runtime transclusion?
2. Does arrowed `kahea` receive caller context explicitly, or only by ambient inheritance?
3. Can `kahea` target partial body ranges, or only whole named memes and `ahu` worksites?
4. What is the exact behavior for: unresolved source, unresolved target, recursion cycle, permission attenuation failure?
5. Do we need a one-time substitution mode separate from live transclusion?
6. Do we need mode-like rendering, similar to XSLT modes or template views?
7. Do remote or cross-system calls require explicit opt-in, the way AsciiDoc gates URI includes?

The W3C research additionally identified: the grammar still lacks its own canonical media type, so fragment semantics can only be recommended, not yet fully registered. No standards body currently defines the memetic meaning of the local Devanagari authority layer.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/docs/pono/memetic-wikitext#w3c-lineage-verdicts >>
<<~ loulou lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >>
<<~ loulou lar:///ha.ka.ba/@lares-history/memes/history/genesis-sharktooth-chatlog >>

<<~/ahu >>

<<~&#x0003;>>
<<~&#x0004; -> ? >>
