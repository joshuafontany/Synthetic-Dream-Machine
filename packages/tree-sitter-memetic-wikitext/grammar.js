/**
 * tree-sitter-memetic-wikitext — the CARRIER layer only.
 *
 * The grammar parses the sharktooth FORM generically (a sigil node with
 * name-span and args-span, whatever the name) the way HTML's grammar parses
 * <element> without knowing any tag. The sigil VOCABULARY — which names
 * exist, their arg shapes, their semantics — lives as DATA in the wiki's own
 * shadow tiddlers (the live registry), attached downstream at the fold.
 * An unregistered sigil parses cleanly here and surfaces as a vocabulary
 * diagnostic, never a parse error. Ahu open/close pair by FORM; the fold
 * checks the names match (a mismatch reads as a diagnostic, not an ERROR).
 *
 * The TW5 rich forms ride the same carrier discipline, line/block-grained:
 * transclusions, macrocall lines, tables, pragmas (paired with `\end` by
 * form, like ahu), quote/style/typed fences, rules, html lines, and the
 * `.tid` field block (valid only at document top — the grammar position
 * carries that law, no lookahead). Inline forms (emphasis, links, inline
 * transclusion, CamelCase) stay BELOW the carrier: they ride the fold and
 * editor layers over `text_line` spans.
 */
module.exports = grammar({
  name: 'memetic_wikitext',

  extras: _ => [],

  conflicts: $ => [
    // an opening sigil stands alone when no closing form ever arrives
    [$._block, $.ahu_block],
    // a block-form pragma stands alone when no `\end` ever arrives
    [$._block, $.pragma_block],
  ],

  rules: {
    // `.tid` field lines bind only at the document top (before any block) —
    // the parse position enforces what TW5 enforces by its first blank line.
    document: $ => seq(repeat($.field_line), repeat($._block)),

    _block: $ => choice(
      $.ahu_block,
      $.sigil,
      $.fenced_block,
      $.quote_block,
      $.style_block,
      $.typed_block,
      $.hard_break_block,
      $.pragma_block,
      $.pragma_open,
      $.pragma_end,
      $.pragma_line,
      $.heading,
      $.list_item,
      $.table,
      $.transclude_block,
      $.filtered_transclude_block,
      $.macrocall_block,
      $.horizontal_rule,
      $.html_line,
      $.comment,
      $.blank_line,
      $.text_line,
    ),

    // A paired span: an opening sigil whose body runs to the matching
    // closing form `<<~/ ... >>`. Name agreement is the fold's job.
    ahu_block: $ => prec.right(seq(
      field('open', $.sigil),
      repeat($._block),
      field('close', $.sigil_close),
    )),

    // `<<~ name args… >>` — one carrier form, any vocabulary.
    sigil: $ => seq(
      '<<~',
      optional(field('body', $.sigil_body)),
      '>>',
    ),

    // `<<~/name >>` — the closing form.
    sigil_close: $ => seq(
      '<<~/',
      optional(field('body', $.sigil_body)),
      '>>',
    ),

    // Everything between the teeth, single token: no `>>` inside.
    sigil_body: _ => token(prec(1, /([^>\n]|>[^>])+/)),

    // ``` fenced blocks — the info string, then lines that never open with
    // a fence.
    fenced_block: $ => seq(
      field('info', alias(token(/```[^\n]*\n/), $.fence_open)),
      repeat(field('line', alias(token(/[^`\n][^\n]*\n|`[^`][^\n]*\n|\n/), $.fence_line))),
      alias(token(/```[ \t]*\n?/), $.fence_close),
    ),

    // `<<<` quote fences — raw interior (a quoted voice, held verbatim);
    // classes ride the open line, attribution rides the close line.
    quote_block: $ => seq(
      field('info', alias(token(/<<<[^\n]*\r?\n/), $.quote_open)),
      repeat(alias(token(/(<{0,2}([^<\n][^\n]*)?)?\r?\n/), $.quote_line)),
      alias(token(/<<<[^\n]*\r?\n?/), $.quote_close),
    ),

    // `@@` style fences — the open line carries css/classes and no second
    // `@@` (an inline-styled paragraph keeps its `@@…@@` on one line and
    // stays prose).
    style_block: $ => seq(
      field('info', alias(token(/@@[^@\n]*\r?\n/), $.style_open)),
      repeat(alias(token(/(@?[^@\n][^\n]*|@)?\r?\n/), $.style_line)),
      alias(token(/@@[ \t]*\r?\n?/), $.style_close),
    ),

    // `$$$type` typed fences — the interior is typed content, raw by law.
    typed_block: $ => seq(
      field('info', alias(token(/\$\$\$[^\n]*\r?\n/), $.typed_open)),
      repeat(alias(token(/(\${0,2}([^$\n][^\n]*)?)?\r?\n/), $.typed_line)),
      alias(token(/\$\$\$[ \t]*\r?\n?/), $.typed_close),
    ),

    // `"""` hard-line-break fences — prose whose newlines render literally.
    hard_break_block: $ => seq(
      alias(token(/"""[ \t]*\r?\n/), $.hard_break_open),
      repeat(alias(token(/("{0,2}([^"\n][^\n]*)?)?\r?\n/), $.hard_break_line)),
      alias(token(/"""[ \t]*\r?\n?/), $.hard_break_close),
    ),

    // Definition-family pragmas pair with `\end` by FORM (the ahu pattern):
    // the block form opens only when the line ends at its parameter list —
    // a one-line definition carries its body on the same line and rides
    // `pragma_line` whole.
    pragma_block: $ => prec.right(seq(
      field('open', $.pragma_open),
      repeat($._block),
      field('close', $.pragma_end),
    )),

    pragma_open: _ => token(prec(2, /\\(define|procedure|function|widget)[ \t]+[^(\r\n]+\([^)\r\n]*\)[ \t]*\r?\n/)),

    pragma_end: _ => token(prec(2, /\\end[^\n]*\r?\n?/)),

    // Every other `\word …` line: one-line definitions, `\rules`, `\import`,
    // `\parameters`, `\whitespace`, and whatever the vocabulary grows.
    pragma_line: _ => token(/\\[a-zA-Z][^\n]*\r?\n?/),

    // TW5 `!` headings.
    heading: _ => token(/!{1,6}[ \t][^\n]*\n?/),

    // TW5 list line (`*` unordered · `#` ordered · `;`/`:` definition ·
    // `>` quote-list, mixable) — STRICTER than core TW5: the marker run
    // must carry a following space, so a line opening `**bold**` stays prose.
    list_item: _ => token(/[*#;:>]+[ \t][^\n]*\n?/),

    // A run of `|…|` rows composes one table.
    table: $ => prec.right(repeat1($.table_row)),

    table_row: _ => token(/\|[^\n]*\|[kfch]?[ \t]*\r?\n?/),

    // `{{{filter}}}` and `{{reference}}` alone on a line — block transclusion.
    filtered_transclude_block: _ => token(prec(2, /\{\{\{[^\n]*\}\}\}[^\n]*\r?\n?/)),

    transclude_block: _ => token(/\{\{[^\n]*\}\}[ \t]*\r?\n?/),

    // `<<name args…>>` alone on a line — a macrocall (the sigil's `<<~` and
    // the quote fence's `<<<` never match: the third character decides).
    macrocall_block: _ => token(/<<[^<~\s][^\n]*>>[ \t]*\r?\n?/),

    horizontal_rule: _ => token(/-{3,}[ \t]*\r?\n?/),

    // A line opening an HTML element or widget (`<div`, `<$link`, `</div>`).
    html_line: _ => token(/<[a-zA-Z$\/][^\n]*\r?\n?/),

    // A `.tid` header field — reachable only at the document top.
    field_line: _ => token(/[a-zA-Z][\w.\-]*:[^\n]*\r?\n/),

    comment: _ => token(/<!--([^-]|-[^-]|--[^>])*-->\n?/),

    blank_line: _ => token(/[ \t]*\n/),

    // Any other line — wikitext, prose, whatever rides beneath the carrier.
    text_line: _ => token(prec(-1, /[^\n]+\n?/)),
  },
});
