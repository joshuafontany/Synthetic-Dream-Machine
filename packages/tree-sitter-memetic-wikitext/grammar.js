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
 */
module.exports = grammar({
  name: 'memetic_wikitext',

  extras: _ => [],

  conflicts: $ => [[$._block, $.ahu_block]],

  rules: {
    document: $ => repeat($._block),

    _block: $ => choice(
      $.ahu_block,
      $.sigil,
      $.fenced_block,
      $.heading,
      $.list_item,
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

    // ``` fenced blocks — v0 approximation without an external scanner:
    // the info string, then lines that never open with a fence.
    fenced_block: $ => seq(
      field('info', alias(token(/```[^\n]*\n/), $.fence_open)),
      repeat(field('line', alias(token(/[^`\n][^\n]*\n|`[^`][^\n]*\n|\n/), $.fence_line))),
      alias(token(/```[ \t]*\n?/), $.fence_close),
    ),

    // TW5 `!` headings — the realignment window closed; `#` now marks lists.
    heading: _ => token(/!{1,6}[ \t][^\n]*\n?/),

    // TW5 list line (`*` unordered · `#` ordered, mixable) — STRICTER than
    // core TW5: the marker run must carry a following space, so a line
    // opening `**bold**` stays prose.
    list_item: _ => token(/[*#]+[ \t][^\n]*\n?/),

    comment: _ => token(/<!--([^-]|-[^-]|--[^>])*-->\n?/),

    blank_line: _ => token(/[ \t]*\n/),

    // Any other line — wikitext, prose, whatever rides beneath the carrier.
    text_line: _ => token(prec(-1, /[^\n]+\n?/)),
  },
});
