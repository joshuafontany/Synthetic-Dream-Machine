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

(heading) @markup.heading
(comment) @comment
