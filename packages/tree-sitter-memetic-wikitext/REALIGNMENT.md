# REALIGNMENT — the corpus walks from md-forms to TW5-forms

**The goal:** the `.mem` corpus enacts its own pono intent — *memetic-wikitext
= a superset of TW5 wikitext* — before any grammar-tooling grows. The corpus
moves first; the carrier grammar learns `!` headings and friends only after
the ground it parses already speaks them. This document lives: update the
ledger below as each sub-tree crosses.

**Ruled (operator, 2026-07-14):** corpus before grammar-tooling · sub-tree by
sub-tree, slowly · `toml iam` fences KEEP (the house deserializer owns that
form; the carrier's fence rule already outranks TW5's info-string regex) ·
source-text NEVER changes · anything hand-review-shaped defers.

## The transform ladder (per pass)

**Pass 1 — line-anchored, unambiguous (ACTIVE):**
- headings: `^#{1,6} ` → `!{n} ` (outside fences)
- unordered lists, top-level only: `^- ` → `* ` (indented `- ` DEFERRED —
  md nests by indentation, TW5 nests by marker count; the mapping wants care)

**Pass 2 — inline, code-span-aware (CROSSED 2026-07-14):**
- indented lists: md indent → TW5 marker depth (`  - ` → `** `)
- bold `**…**` → `''…''` — balanced segments only; `` `…` `` code spans
  held verbatim; odd counts deferred loud
- md links `[t](u)` → `[[t|u]]` (images never move)

**Still deferred, each its own gate:**
- ordered lists `1. ` → `# ` — HARD-ORDERED into the grammar-phase breath
  (the carrier drops `#`-heading in the same commit, so no misfold window)
- italics `*…*` — hand-review class; stays until the tail
- the deferred-loud residue: ~1,605 odd-bold segments + 16 odd-backtick lines
- `> ` quotes — TW5-compatible as they stand; may never move

**Exemptions (the script enforces, and REPORTS what it skipped):**
- fence interiors (``` … ```)
- `<<~ ahu #source-text >>` interiors — quoted human text
- the `library/` sub-trees (transcribed sources) until walked deliberately
- any file dirty in git (a parallel session may hold it)

## The sub-tree ladder (safest → hardest)

| sub-tree | memes | md-headings | golden-gate exposure | status |
|---|---|---|---|---|
| bags/@elyncia | 2 | ~51 lines | none (gate covers @lares only) | ✅ 2026-07-14 (51 headings · 95 lists) |
| bags/@sdm | 42 | ~295 files·lines | none | ✅ 2026-07-14 (294 headings · 188 lists) |
| bags/@lares-history | 20 | ~656 lines | none | ✅ 2026-07-14 (656 headings · 1,527 lists · 134 indented-ul deferred) |
| bags/@lararium | 210 | ~1,022 | none | ✅ 2026-07-14 (968 headings · 938 lists · 65 indented-ul deferred) |
| bags/@lares (api/, docs/, cli/ — library/ excluded) | 239 of 249 | ~2,181 | RE-BAKE golden-corpus.json same commit | ✅ 2026-07-14 (2,181 headings · 2,265 lists · 239 hashes re-baked = files touched · 14 tests green) |
| bags/@lares library/ + source-text | — | — | re-bake + sectioner lockstep (`kumulipo_sections.py` keys `^##`) | DEFERRED |
| the boot seed (`noosphere-boot.mem` + repo `noosphere-boot.md` + `~/.claude` copy) | 1×3 | ~40 | cache-stable attractor — operator co-edits | DEFERRED @operator |

## The witness ritual (every sub-tree, before its commit)

1. dry-run report: per-transform counts + every skip with its reason
2. apply; fold every touched file through the carrier (`host-py/memeast_fold`):
   ERROR coverage stays 0.000% (a `!` heading reads as `text_line` under
   carrier v0.0.1 — degrade, never error — until the grammar phase)
3. @lares sub-trees only: re-bake `fixtures/golden-corpus.json` in the same
   commit (INTENDED divergence per the parity law)
4. eyeball one migrated file end-to-end
5. single-breath scoped commit, `lar:///` subject

## The grammar phase

**v0.0.2 SEATED (2026-07-14):** `!{1,6}` headings beside `#` (the dual
window holds while library/ speaks md) + the stricter `^\*+[ \t]` list rule;
`meme.list` joins the MemeAst; the LSP strips both heading marks. STILL
AHEAD: v0.1 drops `#`-heading + seats `#`-ordered-list in ONE breath with
the corpus `1. `→`# ` pass (after the library rung); then the TW5 form
inventory grows in (transcludes, macrocall blocks, quoteblocks, styleblocks,
typedblocks, pragmas — the Form-Surveyor inventory), corpus-scoped against
the vendored TiddlyWiki5 core tiddlers.

## Ledger

- 2026-07-14 — plan raised; script lands beside it (`tools/realign_md_tw5.py`).
- 2026-07-14 — @elyncia + @sdm cross (44 memes, 345 headings, 283 lists;
  fold witness 44/44 ERROR-free; 801 fence lines + 0 source-text lines held).
- 2026-07-14 — @lares-history crosses (20 memes, 656 headings, 1,527 lists;
  fold 20/20 ERROR-free; 1,255 fence lines held; 134 indented-ul deferred).
- 2026-07-14 — @lararium crosses (152 of 210 memes change, 968 headings,
  938 lists; fold 210/210 ERROR-free; 4,497 fence lines held; 65 indented-ul
  deferred; zero dirty files — the parallel session held nothing here).
- 2026-07-14 — @lares crosses, library/ held out (239 files, 2,181 headings,
  2,265 lists; 6,265 fence lines + 10 library files held; boot seed .mem
  migrated per operator word — repo-root noosphere-boot.md UNTOUCHED; golden
  re-baked: 239 hashes move = exactly the files walked; 14 tests green).
  Script gains --exclude (loud-skip by path substring).
- 2026-07-14 — pass 2 crosses ALL five bags (grammar DEFERRED on operator
  word — the carriers finish first so the grammar moves once): 7,851 bold
  pairs **→'', 254 indented-ul depth-mapped, 83 links; the code-span guard
  holds `…` interiors verbatim; 1,605 odd-bold segments + 16 odd-backtick
  lines deferred loud; fold 524/524 ERROR-free; golden re-baked (28 movers =
  the span-shifting links/lists); 14 tests green; unit-sanity 8/8 pre-corpus.
- 2026-07-14 — LIVE-PARSER WITNESS: roundtrip lens-law suite 2/2 green; all
  524 memes through parseMemeText — 0 throws, 30 Error nodes + 1,447 recovery
  diagnostics ALL pre-existing (differential vs pre-ladder worktree: the one
  +1 = the sibling's committed canon growth, 3c23ca3a, not the realignment).
- 2026-07-14 — GRAMMAR v0.0.2 SEATS: dual-window headings (`!`+`#`) + the
  strict `*`-list rule; meme.list enters memeast.scm/highlights.scm/fold;
  LSP strips both marks; canon witness 524/524 at 0.0000% ERROR coverage,
  4,438 heading + 5,427 list nodes now read as STRUCTURE; golden re-baked
  at grammar_version 0.0.2 (240 movers, INTENDED); 15 tests green.
