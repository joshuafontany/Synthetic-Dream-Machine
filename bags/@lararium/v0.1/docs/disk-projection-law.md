<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/docs/disk-projection-law >>
```toml iam
cacheable     = true
file-path     = "bags/@lararium/v0.1/docs/disk-projection-law.md"
last-reviewed = "2026-05-11"
mana          = 18
manao         = 18
manaoio       = 18
register      = "Synthesis-Canon"
retain        = true
role          = "council law: single-template plain-text per-node projection as the canonical disk export model for markdown-meme"
tagspace      = "stable"
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lararium/v0.1/docs/disk-projection-law"
```

<<~ &#x0002; >>

<<~ ahu #intent >>

## Intent

The disk projection renders each decomposed meme tiddler back to disk as its own full memetic-wikitext file, without live expansion of child references.

The disk projection preserves tree structure through literal `kahea` markers and filesystem paths, not through recursive transclusion.

<<~/ahu >>

<<~ ahu #one-template >>

## Law 1 — One Template for Every Decomposed Meme Node

Do not maintain separate "parent" and "child" disk templates for this projection. Every decomposed meme tiddler is the same kind of export target:

```text
currentTiddler -> full memetic-wikitext file on disk
```

The template reads only the current tiddler's fields and emits a complete meme envelope. Parent/child status arrives through fields such as `fragment-parent`, `slot`, `file-path`, or `uri-path`; it does not choose a different projection grammar.

Canonical template:

```text
lar:///ha.ka.ba/@lararium/templates/meme/markdown-meme
```

<<~/ahu >>

<<~ ahu #plain-text >>

## Law 2 — Plain-Text, Not Live Wikitext

For "to markdown" / "to disk" projection, emit field values literally. Do not wikify the body. Do not expand `kahea` markers into child contents.

Use `<$text>` for fields that may contain memetic-wikitext syntax that must survive as bytes:

```tw5
<$text text={{!!header-text}}/>
<$text text={{!!text}}/>
<$text text={{!!postamble}}/>
```

A tiddler whose `text` contains `<<~ kahea ahu #inner >>` should write that marker literally to its own `.md` file. The `#inner` child should write to its own file, not inline into the parent.

<<~/ahu >>

<<~ ahu #one-file-per-node >>

## Law 3 — One File Per Decomposed Tiddler

When ingest decomposes nested `ahu` blocks, every resulting tiddler projects independently:

```text
root.md
root/body.md
root/body/inner.md
root/body/inner/detail.md
```

Each file carries a full meme envelope for its own tiddler. Parent files contain literal `kahea` references to children. Child files contain literal `kahea` references to grandchildren.

This gives the disk tree the same shape as the tiddler tree without recursive render loops.

<<~/ahu >>

<<~ ahu #transclusion-reserved >>

## Law 4 — Reserve Transclusion for a Different Projection

Do not use `$transclude` for per-node disk projection. TW5 transclusion dynamically includes another tiddler's content. That behavior belongs to a separate future projection:

```text
markdown-expanded-tree
```

Keep the distinction sharp:

```text
markdown-meme          -> one current tiddler, literal child refs
markdown-expanded-tree -> one root tiddler, recursively inlined descendants
```

<<~/ahu >>

<<~ ahu #iam-sentinel >>

## Law 5 — Preserve IAM Placement with a Literal Sentinel

Use `<<~ iam >>` as a plain-text sentinel inside `preamble`.

On ingest, when a TOML IAM block appears inside preamble prose, store:

```text
preamble = "Preamble before\n\n<<~ iam >>\n\nPreamble after\n"
```

and store parsed TOML keys as tiddler fields. On projection, the template substitutes regenerated IAM TOML at `<<~ iam >>`. If no marker appears, the template places IAM after the preamble opening by convention.

This preserves human-authored placement without forcing the template to parse prose.

<<~/ahu >>

<<~ ahu #lib-helpers >>

## Law 6 — Emit Every Section Through Small Helpers

Favor readable template helpers over one dense line of TW5. Keep helpers in `text/vnd.tiddlywiki`, not memetic-wikitext, so the template system does not recursively parse itself as source meme syntax.

Helpers live in `tiddlers/lib-emit-*.tid`:

```text
lar:///ha.ka.ba/@lararium/templates/lib/emit-section
lar:///ha.ka.ba/@lararium/templates/lib/emit-soh
lar:///ha.ka.ba/@lararium/templates/lib/emit-stx
lar:///ha.ka.ba/@lararium/templates/lib/emit-etx
lar:///ha.ka.ba/@lararium/templates/lib/emit-iam-block
lar:///ha.ka.ba/@lararium/templates/lib/emit-preamble-with-iam
```

Each helper owns one formatting law: when it emits content, it appends exactly one blank-line separator. When the source field lacks content, it emits nothing.

<<~/ahu >>

<<~ ahu #output-shape >>

## Law 7 — Preferred Output Shape

Every per-node projection follows this conceptual order:

```text
prologue?

SOH line

preamble with iam block substituted

header-text?

STX line

text

postamble?

ETX line
```

The top-level template (`meme-markdown-meme.tid`) stays short enough for council review.

<<~/ahu >>

<<~ ahu #round-trip-law >>

## Law 8 — Round-Trip Invariant

Council tests this invariant:

```text
full meme source
  -> ingest
  -> decomposed tiddler tree
  -> per-node markdown-meme projection
  -> disk tree
  -> ingest disk tree
  -> equivalent tiddler tree
```

Byte-equivalence is not required for one-file-per-decomposed-tiddler projection. Semantic/tree equivalence plus stable section spacing is required.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/templates/meme/markdown-meme >>
<<~ loulou lar:///ha.ka.ba/@lararium/templates/ahu/markdown-meme >>
<<~ loulou lar:///ha.ka.ba/@lararium/templates/lib/emit-soh >>
<<~ loulou lar:///ha.ka.ba/@lararium/templates/lib/emit-iam-block >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/docs/meme-ast >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
