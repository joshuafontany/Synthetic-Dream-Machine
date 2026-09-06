/**
 * tree-sitter-lar-sigil — a thin tree-sitter grammar for the house's OWN
 * `<<~ …>>` sharktooth / ahu-block / sigil-row forms (memetic-wikitext's
 * CODE-mode), so a meme parses into a REAL sigil AST rather than the generic
 * wikitext grammar.
 *
 * THE READ-SIDE TWIN. The WRITE side lives in the TW5 wikirules
 * (packages/lararium-tw5/src/wikirules/lar-sigil*.ts) — block + inline rules that
 * CLAIM these forms while authoring. This grammar RE-PARSES the same surface for
 * the structure plane; its node TYPES match the runnable twin
 * `structure_router.parse_sigils` (Python), so the two agree on the AST:
 *
 *   source_file · doctype_comment · pranala_header · pranala · ahu_block ·
 *   sharktooth_sigil(→ sigil_name, arg*) · text
 *
 * Build (when a tree-sitter CLI + cc are present — NOT required for the structure
 * plane, which uses the Python twin):
 *   cd grammars/tree-sitter-lar-sigil && tree-sitter generate && tree-sitter test
 *
 * Grammar form-spec referenced from lar-sigil-shared.ts:
 *   - COMPOUND_OPEN_RE   <<~ WORD [child-slot WORD2] ARGS>>
 *   - PRANALA_OPEN_RE    <<~ pranala [#slot] FROM -> TO [k:v]*>>
 *   - PRANALA_HEADER_RE  <<~ ? -> uri>>
 *   - BLOCK_CLOSERS      ahu · pranala · kahea  (closed by <<~/word>>)
 */

const SIGIL_WORD = /\\?[A-Za-z?][A-Za-z0-9_-]*/;

module.exports = grammar({
  name: "lar_sigil",

  extras: ($) => [/\s/],

  rules: {
    // A meme is a run of sigil forms, ahu blocks, and prose text.
    source_file: ($) => repeat($._item),

    _item: ($) =>
      choice(
        $.doctype_comment,
        $.ahu_block,
        $.pranala_header,
        $.pranala,
        $.sharktooth_sigil,
        $.text,
      ),

    // <!-- <<~ !DOCTYPE = lar:///…>> -->  (the meme's opening doctype edge)
    doctype_comment: ($) =>
      seq("<<~", optional("!"), "!DOCTYPE", field("sigil_name", alias("DOCTYPE", $.sigil_name)), /[^\n>]*/, ">>"),

    // <<~ ? -> lar:///…>>  (the carrier→canonical edge; ? is a special self-token)
    pranala_header: ($) => seq("<<~", field("sigil_name", alias("?", $.sigil_name)), "->", /[^\n>]+/, ">>"),

    // <<~ pranala [#slot] FROM -> TO [k:v]*>>  (+ optional block body … <<~/pranala>>)
    pranala: ($) =>
      seq(
        "<<~",
        field("sigil_name", alias("pranala", $.sigil_name)),
        optional(seq("#", /[\w-]+/)),
        /[^\n>]*?/,
        "->",
        /[^\n>]+/,
        ">>",
        optional(seq(repeat($._item), $._pranala_close)),
      ),
    _pranala_close: ($) => seq("<<~/", "pranala", ">>"),

    // <<~ ahu #slot>> … <<~/ahu>>  — the container that NESTS inner sigils.
    ahu_block: ($) =>
      seq(
        "<<~",
        field("sigil_name", alias("ahu", $.sigil_name)),
        /[^\n>]*/,
        ">>",
        repeat($._item),
        seq("<<~/", "ahu", ">>"),
      ),

    // <<~ WORD ARGS>>  — the general sharktooth leaf (lares · hud · ward · confidence
    // · syad · mu · Mu · Voice · ranks · loops · …). Args ride as counted leaves.
    sharktooth_sigil: ($) =>
      seq(
        "<<~",
        field("sigil_name", alias(SIGIL_WORD, $.sigil_name)),
        repeat($.arg),
        ">>",
      ),

    arg: ($) => /[^\s>][^\s]*/,

    sigil_name: ($) => SIGIL_WORD,

    // prose / non-sigil text between forms
    text: ($) => prec(-1, /[^<]+|</),
  },
});
