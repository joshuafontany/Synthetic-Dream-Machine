> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# TiddlyWiki AST Mapping into the Lararium Envelope

Status date: **April 23, 2026**
Source of truth: `tiddlywiki5/core/modules/parsers/wikiparser/wikiparser.js`, `wiki.js`, `wikify.js`
Research backing: `research/TIDDLYWIKI_AST_AND_MCP_PARALLELS_2026-04-23.md`

Deliverable for: `MCP-TASK-016`

---

## Purpose

This doc maps TiddlyWiki's parse-tree and filter-grammar structures into Lararium AST envelope slots.
It does not import TiddlyWiki internals into the Lararium constitutional center.
It supplies the comparative table that lets the Lararium parser consume TW parse-node families
as guest-grammar input while keeping host law intact.

---

## TiddlyWiki parse-tree node families

From `wikiparser.js` and the TW wiki module, the current parse-tree node family set includes:

| TW node type | Description | TW source module |
|---|---|---|
| `text` | plain text leaf | wikiparser |
| `element` | HTML element node with tag and children | wikiparser |
| `link` | wikilink to a tiddler | wikiparser |
| `transclude` | transclusion of another tiddler | wikiparser |
| `macrocall` | macro invocation with parameters | wikiparser |
| `set` | set-widget or variable scope | wikiparser / widget |
| `importvariables` | import a tiddler's variable definitions | wikiparser / widget |
| `filteredtransclude` | transclusion filtered by a filter expression | wikiparser |
| `codeblock` | fenced code block | wikiparser |
| `image` | image reference | wikiparser |
| `entity` | HTML entity | wikiparser |
| `raw` | raw HTML passthrough | wikiparser |

These are TW internal labels, not Lararium labels.
The mapping below uses Lararium envelope slots with `grammar: "x-tiddlywiki-filter"` or `grammar: "host"` as appropriate.

---

## TiddlyWiki parse-node → Lararium AST envelope mapping

| TW node type | Lararium `type` | Lararium `grammar` | Lowering hint | Notes |
|---|---|---|---|---|
| `text` | `ahu` or inline child | `host` | `view-frame` | bare text content inside a host `ahu` section |
| `element` | `ui` | `host` | `ui-widget` | maps to Lararium `ui` primitive when structure matches |
| `link` | `loulou` | `host` | `composition-frame` | wikilink maps to Lararium transclusion reference |
| `transclude` | `loulou` | `host` | `composition-frame` | transclusion maps directly to Lararium `loulou` |
| `macrocall` | `hana` (host body) | `host` | `guest-grammar-frame` | macro invocation is a bounded worksite |
| `set` / `importvariables` | `kahea` or execution node | `host` | `overlay-frame` | variable scope maps to Lararium overlay context |
| `filteredtransclude` | `hana` | `x-tiddlywiki-filter` | `x-tiddlywiki-filter-frame` | filter expression enters as guest-grammar body |
| `codeblock` | `ahu` with `type: codeblock` | `host` | `view-frame` | preserved as literal; lowering-hint signals no execution |
| `image` | `ui` with `type: image` | `host` | `ui-widget` | maps to Lararium UI primitive |
| `entity` | `ahu` with `type: entity` | `host` | `view-frame` | character entity preserved in source span |
| `raw` | `ahu` with `type: raw` | `host` | `view-frame` | raw HTML preserved; lowering does not execute |

---

## TiddlyWiki Filter Language → Lararium AST node families

From the filter grammar and `x-tiddlywiki-filter` invariant, filter expressions parse into:

| Filter component | Lararium AST type | Notes |
|---|---|---|
| filter expression (whole string) | `hana` outer node with `grammar: "x-tiddlywiki-filter"` | the full expression is the guest body payload |
| run (sequence of steps, possibly prefixed) | guest-grammar child node type `filter-run` | prefix: `+`, `-`, `~`, or empty |
| step (function-sigil with optional suffix) | guest-grammar child node type `filter-step` | one function sigil per step |
| literal string | guest-grammar leaf type `filter-literal` | quoted or unquoted string |
| variable reference | guest-grammar leaf type `filter-variable` | `{varName}` or `<varName>` |

Guest-grammar node types live in the `"x-tiddlywiki-filter"` grammar namespace.
They do not appear as host primitive types (`ahu`, `pranala`, etc.).
The host AST only holds the outer `hana` wrapper; the guest parse tree hangs under it.

---

## Host-side term translation in the AST

The `tiddlywiki-filter.md` invariant law names these mandatory translations.
They apply at the AST boundary, not after lowering.

| TW term in guest body | Lararium translation at AST layer | AST field affected |
|---|---|---|
| `tiddler` (as concept) | `sigil` | `attributes.context`, `payload` annotations |
| `currentTiddler` | `+currentMeme` | `attributes.context` |
| `operator` (function role) | `function-sigil` | type labels in guest AST |

The raw guest body text stays untranslated in `payload`.
Translation applies to the `attributes.context` field and to lowering metadata.
The parser records the translation in `attributes.context_translation` if a substitution occurs.

---

## Widget-tree mapping

TiddlyWiki widget objects correspond to Lararium execution-graph nodes, not AST nodes.
Execution-graph schema lives in `MCP-TASK-017`.

The comparison remains useful:

| TW widget lifecycle | Lararium execution-graph parallel |
|---|---|
| widget constructor (`new $tw.Widget`) | execution node instantiation |
| `initialise(parseTreeNode, options)` | node seed from AST node |
| `computeAttributes()` | attribute resolution pass |
| `execute()` | activation / binding pass |
| `render(parent, nextSibling)` | render projection pass |
| `refresh(changedTiddlers)` | selective refresh from dependency graph |
| `message bubbling` | `message`-family pranala propagation |

The Lararium execution graph should replicate **the separation**, not the TW API surface.
Host primitives (`kahea`, `ui`, `hana`) seed execution nodes.
Execution nodes then receive scope, hooks, and dependency edges.

---

## Boot-preserved filter feature family

From `TW_FILTER_BOUNDARY.md`:

| Feature | Maps to | AST node |
|---|---|---|
| `all[sigils]` | all-sigil traversal | `filter-step` with type `all-source` |
| `links:to[+currentMeme]` | relation query | `filter-step` with type `field-filter` |
| `tag[X]` | tag-based filter | `filter-step` with type `tag-filter` |
| `get[field]` | field extraction | `filter-step` with type `field-get` |
| `!` (negation prefix) | negative filter | `filter-step` with type `negation-prefix` |
| `-` (exclusion run prefix) | exclusion run | `filter-run` with prefix `"-"` |

These are the boot-phase node types.
Full legality tables (all function sigils) belong in later parser work outside this envelope.

---

## Residue

- Widget lifecycle detail belongs in the execution-graph contract (MCP-TASK-017).
- Full TiddlyWiki filter operator legality belongs in a post-v1 parser story.
- TiddlyWiki raw HTML node lowering into render projection belongs in MCP-TASK-018.
- The `x-tiddlywiki-filter` guest-grammar AST parser is SPRINT-02 implementation work.
