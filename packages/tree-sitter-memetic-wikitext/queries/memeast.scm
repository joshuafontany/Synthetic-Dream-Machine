; memeast.scm — the MemeAst vocabulary AS QUERY CAPTURES.
;
; Capture names ARE the MemeAst node kinds: every host runs this same compiled
; query over the same CST and folds captures to canonical MemeAst JSON under
; the STARVATION RULE — the fold branches only on capture names; any logic
; that would inspect CST structure belongs here or in the grammar, never in
; the fold. This file ships INSIDE the grammar artifact: byte-identical on
; every host, so the extraction vocabulary cannot drift.

(sigil) @meme.sigil
(sigil body: (sigil_body) @meme.sigil.body)

(sigil_close) @meme.sigil.close
(sigil_close body: (sigil_body) @meme.sigil.close.body)

(ahu_block) @meme.ahu
(ahu_block open: (sigil) @meme.ahu.open)
(ahu_block close: (sigil_close) @meme.ahu.close)

(fenced_block) @meme.fence
(fenced_block info: (fence_open) @meme.fence.info)

(heading) @meme.heading
(comment) @meme.comment
(text_line) @meme.text
(blank_line) @meme.blank
