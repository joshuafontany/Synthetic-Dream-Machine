

<a id="abstract"></a>

# TiddlyWiki 5 Wikitext — the base syntax

This document DESCRIBES an existing format: the wikitext dialect TiddlyWiki 5 parses, authored by
Jeremy Ruston and the TiddlyWiki community, defined today by its implementation. It claims no change
control — that belongs upstream — and it defines nothing the implementation does not already do. Its
office follows the `text/markdown` precedent [RFC7763]: a registration-grade description of a format a
community already writes, so that a structured-syntax suffix (`+tiddlywiki`, [RFC6839]) gains the
normative reference every registration template demands.

<a id="status"></a>

## Status

A draft, enumerated against the implementation (TiddlyWiki 5.5.0-prerelease). The rule inventory
stands complete; the per-rule grammar productions fill in against the rule modules. The finished draft
goes to the TiddlyWiki core maintainers for review before any registration cites it — nothing here
binds anyone until it has.

<a id="the-load-bearing-property"></a>

## The load-bearing property

One property of this syntax carries every dialect that rides it, and this document exists first to
state it precisely:

**An unrecognised form degrades to inert text.** A macro call whose name binds no definition parses —
the parser accepts the surface — and renders as its own text, injuring nothing around it. Extension
dialects (memetic-wikitext among them) ride the base as supersets BECAUSE of this: a receiver holding
only the base parser processes a superset document usefully, every foreign sigil an unbound call. The
`+tiddlywiki` suffix earns its RFC 6839 place — generic processing of the underlying representation —
on this property alone.

<a id="terminology"></a>

## Terminology

| term | reading |
|---|---|
| --- | --- |
| **tiddler** | the unit of storage and addressing: a titled record of named fields, one of which (`text`) carries content. |
| **field** | a named scalar on a tiddler; `title`, `text`, `type`, and `tags` carry conventional weight. |
| **wikitext** | the markup dialect this document describes, carried in a tiddler's `text` under `text/vnd.tiddlywiki`. |
| **rule** | one parser module recognising one construct; the parser composes its grammar from the rule set active for a parse. |
| **pragma** | a rule that runs in the prologue, before body content, shaping the parse that follows (`\define`, `\rules`, …). |
| **macro** | a named, parameterised text substitution invoked as `<<name args>>`. |
| **widget** | a runtime rendering node invoked as `<$name … />`; wikitext constructs compile into a widget tree. |
| **transclusion** | inclusion of one tiddler's content in another's rendering, `{{title}}` and its variants. |
| **filter** | the query sub-language (`[tag[x]sort[title]]`) that selects tiddlers; opaque to this grammar, defined by its own. |

<a id="lexical-structure"></a>

## Lexical Structure

A parse runs in one of two modes. **Block mode** recognises constructs that open at the start of a
line and may span lines; **inline mode** recognises constructs within a line's run of text. A block
construct's interior generally re-enters inline mode. Ahead of both stands the **pragma prologue**:
pragma rules match only at the top of the text, each consuming its construct and the whitespace after
it, until the first non-pragma content ends the prologue.

The parser composes its grammar from **rules** — one module per construct, each declaring the modes it
serves. The `\rules` pragma narrows or reorders the active set for the remainder of a parse, which
makes the rule inventory below the dialect's true surface: a conforming description enumerates rules,
never a fixed grammar, because the grammar of any given parse follows from the rules active in it.

<a id="rule-inventory"></a>

## Rule Inventory

Enumerated from the implementation (TiddlyWiki 5.5.0-prerelease, `core/modules/parsers/wikiparser/rules/`),
each rule under the mode(s) its module declares. One line each; the per-rule grammar fills in against
the modules.

### Pragma rules

| rule | construct |
|---|---|
| --- | --- |
| `macrodef` | `\define name(params) … \end` — macro definition. |
| `fnprocdef` | `\function` · `\procedure` · `\widget` definitions, `\end`-terminated. |
| `parameters` | `\parameters(…)` — formal parameters for a procedure body. |
| `import` | `\import <filter>` — pull definitions from the selected tiddlers. |
| `rules` | `\rules only | except <names>` — narrow the active rule set. |
| `parsermode` | `\parsermode block | inline` — set the mode the body parses in. |
| `commentblock` | `<!-- … -->` at prologue or block position; consumed, renders nothing. |
| `whitespace` | `\whitespace trim | notrim` — whitespace handling directive. |

### Block rules

| rule | construct |
|---|---|
| --- | --- |
| `heading` | `!` to `!!!!!!` opening a line. |
| `list` | `*` `#` `;` `:` `>` runs — unordered, ordered, definition, quote lists; nesting by repetition. |
| `table` | ` | `-delimited rows with alignment, header/footer/caption markers. |
| `quoteblock` | `<<<` fenced block quotation. |
| `codeblock` | ``` fenced verbatim block with optional language. |
| `typedblock` | `$$$type … $$$` — a block parsed under another content type. |
| `styleblock` | `@@` fenced block carrying CSS classes/styles. |
| `horizrule` | `---` horizontal rule. |
| `macrocallblock` | `<<name args>>` standing alone as a block. |
| `transcludeblock` | `{{title | template}}` standing alone as a block. |
| `filteredtranscludeblock` | `{{{ filter }}}` standing alone as a block. |
| `html` | an HTML/widget element at block position (`<$widget>`, `<div>`, …). |
| `conditional` | `<% if … %> … <% endif %>` at block or inline position. |

### Inline rules

| rule | construct |
|---|---|
| --- | --- |
| `emphasis` | `''bold''` · `//italic//` · `__underscore__` · `^^super^^` · `,,sub,,` · `~~strike~~`. |
| `codeinline` | `` `code` `` verbatim span. |
| `styleinline` | `@@…@@` styled span. |
| `wikilink` | a CamelCase bare link; `wikilinkprefix` (`~Word`) suppresses one. |
| `prettylink` | `[[text | target]]` link. |
| `extlink` | a bare external URL; `prettyextlink` its bracketed form. |
| `image` | `[img[…]]` image embed. |
| `transcludeinline` · `filteredtranscludeinline` | `{{…}}` · `{{{…}}}` within a line. |
| `macrocallinline` | `<<name args>>` within a line. |
| `entity` | `&name;` / `&#nnnn;` character reference. |
| `dash` | `--` · `---` typographic dashes. |
| `hardlinebreaks` | `"""…"""` region where line breaks render literally. |
| `commentinline` | `<!-- … -->` within a line. |
| `syslink` | a bare `$:/…` system-title link. |
| `html` · `conditional` | the dual-mode rules, at inline position. |
| `mvvdisplayinline` | a macro/variable/value display form. |

<a id="degradation"></a>

## The Degradation Rule

The property every riding dialect depends on, stated normatively:

''A parser MUST accept a macro call whose name binds no definition, and a renderer MUST render it as
its own text, injuring nothing around it.'' The parse does not fail; the construct does not poison its
neighbours; the call survives round-trip as written. Extension dialects ride the base as supersets on
this rule alone: a receiver holding only the base parser processes a superset document usefully, every
foreign sigil an unbound call. The `+tiddlywiki` structured-syntax suffix [RFC6839] earns its place —
generic processing of the underlying representation — on the same rule.

<a id="conformance"></a>

## Conformance

Two classes conform, on the shape the sibling specifications use. A **conforming document** carries
text the active rule set parses without error — and under the degradation rule, unrecognised macro
calls parse, so the bar sits at well-formedness of the constructs a document does use (closed fences,
terminated definitions, matched element tags). A **conforming parser** accepts every construct in the
rule inventory, honours the pragma prologue, honours `\rules`, and enforces the degradation rule.

<a id="media-type"></a>

## Media Type

TiddlyWiki names its wikitext `text/vnd.tiddlywiki` (`boot.js`, `registerFileType`, extension `.tid`).
The IANA standing of that name wants verification before any registration cites it; the coordination —
whether upstream files the `vnd.` registration or this description serves as its specification
reference — belongs to the TiddlyWiki core maintainers, with whom the finished draft lands first.

<a id="edges"></a>

- `lar:///ha.ka.ba/lares/api/pono/memetic-wikitext`
