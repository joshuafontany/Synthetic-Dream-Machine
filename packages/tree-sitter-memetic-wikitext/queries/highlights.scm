; highlights.scm — the EDITOR vocabulary, shipped inside the grammar artifact.
;
; Capture names follow the tree-sitter highlight convention (Neovim/Helix/Zed
; read this file as-is); the LSP server maps the same captures onto its
; semantic-token legend. One artifact, every surface: the pipe folds via
; memeast.scm, the editors color via this file — neither can drift alone.
; Carrier only: sigil VOCABULARY semantics stay live wiki data downstream.

(sigil) @function.macro
(sigil body: (sigil_body) @string.special)

(sigil_close) @function.macro
(sigil_close body: (sigil_body) @string.special)

(fenced_block info: (fence_open) @punctuation.special)
(fenced_block line: (fence_line) @markup.raw)
(fenced_block (fence_close) @punctuation.special)

(quote_block info: (quote_open) @punctuation.special)
(quote_block (quote_line) @markup.quote)
(quote_block (quote_close) @punctuation.special)

(style_block info: (style_open) @punctuation.special)
(style_block (style_close) @punctuation.special)

(typed_block info: (typed_open) @punctuation.special)
(typed_block (typed_line) @markup.raw)
(typed_block (typed_close) @punctuation.special)

(hard_break_block (hard_break_open) @punctuation.special)
(hard_break_block (hard_break_close) @punctuation.special)

(pragma_open) @keyword
(pragma_end) @keyword
(pragma_line) @keyword

(table_row) @markup.list

(transclude_block) @markup.link
(filtered_transclude_block) @markup.link
(macrocall_block) @function.macro
(horizontal_rule) @punctuation.special
(html_line) @tag
(field_line) @property

(heading) @markup.heading
(list_item) @markup.list
(comment) @comment
