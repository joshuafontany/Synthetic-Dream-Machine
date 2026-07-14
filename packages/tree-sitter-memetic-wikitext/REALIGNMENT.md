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

**Deferred to later passes, each its own gate:**
- bold `**…**` → `''…''` (pair-balance check first)
- md links `[t](u)` → `[[t|u]]` (222 sites; coexists meanwhile)
- ordered lists `1. ` → `# ` — HARD-ORDERED after the carrier drops
  `#`-as-heading, else the fold reads fake headings
- italics `*…*` — hand-review class (≈1,755 crude matches, false-positive
  exposure); stays until the tail
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
| bags/@lares-history | ~12 | ~400 | none | |
| bags/@lararium | 210 | ~1,022 | none | |
| bags/@lares (api/, docs/, cli/) | ~249 | ~2,597 | RE-BAKE golden-corpus.json same commit | |
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

## After the corpus (the grammar phase, NOT YET)

Carrier v0.0.2 seats `!{1,6}` headings + `^\*+[ \t]` lists; `#`-as-heading
drops; `#`-as-ordered-list seats; LSP `_symbol_name` strips `!`; goldens
re-bake. Then the TW5 form inventory grows in (transcludes, macrocall blocks,
quoteblocks, styleblocks, typedblocks, pragmas — the Form-Surveyor inventory),
corpus-scoped against the vendored TiddlyWiki5 core tiddlers.

## Ledger

- 2026-07-14 — plan raised; script lands beside it (`tools/realign_md_tw5.py`).
- 2026-07-14 — @elyncia + @sdm cross (44 memes, 345 headings, 283 lists;
  fold witness 44/44 ERROR-free; 801 fence lines + 0 source-text lines held).
