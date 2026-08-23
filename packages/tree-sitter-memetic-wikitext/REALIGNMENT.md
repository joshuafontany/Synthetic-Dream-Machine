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
| bags/elyncia | 2 | ~51 lines | none (gate covers @lares only) | ✅ 2026-07-14 (51 headings · 95 lists) |
| bags/sdm | 42 | ~295 files·lines | none | ✅ 2026-07-14 (294 headings · 188 lists) |
| bags/lares-history | 20 | ~656 lines | none | ✅ 2026-07-14 (656 headings · 1,527 lists · 134 indented-ul deferred) |
| bags/lararium | 210 | ~1,022 | none | ✅ 2026-07-14 (968 headings · 938 lists · 65 indented-ul deferred) |
| bags/lares (api/, docs/, cli/ — library/ excluded) | 239 of 249 | ~2,181 | RE-BAKE golden-corpus.json same commit | ✅ 2026-07-14 (2,181 headings · 2,265 lists · 239 hashes re-baked = files touched · 14 tests green) |
| bags/lares library/ (framing only) | 10 | 62 framing headings | sectioner keys live INSIDE source-text → UNTOUCHED | ✅ 2026-07-14 (62 headings · 48 lists · 50 bold · 4 links · 19,220 source-text lines held) |
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

**THE CLEAN CARRIER SEATED (2026-07-14, ships as 0.0.1 — unpublished, the clean version starts the line):** `!{1,6}` headings beside `#` (the dual
window holds while library/ speaks md) + the stricter `^\*+[ \t]` list rule;
`meme.list` joins the MemeAst; the LSP strips both heading marks. STILL
AHEAD: the next minor drops `#`-heading + seats `#`-ordered-list in ONE breath with
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
- 2026-07-14 — THE CLEAN CARRIER SEATS (version RESET to 0.0.1 on operator word — unpublished, the clean version starts the line): dual-window headings (`!`+`#`) + the
  strict `*`-list rule; meme.list enters memeast.scm/highlights.scm/fold;
  LSP strips both marks; canon witness 524/524 at 0.0000% ERROR coverage,
  4,438 heading + 5,427 list nodes now read as STRUCTURE; golden re-baked
  (240 movers, INTENDED); 15 tests green.
- 2026-07-14 — the library rung crosses: FRAMING prose only (62 headings, 48
  lists, 50 bold, 4 links) while 19,220 source-text lines held; the sectioner
  keys (`## The First Era` era/chant markers) live INSIDE source-text and
  never moved — kumulipo_sections stays untouched, its 11 tests green; fold
  10/10 clean; golden re-baked (5 movers ≤ 10 walked); script gains
  --walk-library (explicit, loud; source-text exemption holds regardless).
- 2026-07-14 — the source-text dialect DECLARES ITSELF IN-BAND (operator
  ruling): all six source-text ahus gain a slot-level `toml iam` fence
  (`type = "text/markdown"`) — TW5's deserializer already reads slot iam, so
  every reader parses the interior under its true dialect regardless of the
  carrier's line grammar; extract_source_text SHEDS the leading iam fence
  (metadata never pollutes the beds; test added, sectioner 12 green);
  roundtrip lens-law suite 2/2 green; golden re-baked (6 movers = 6 declared).
  THE v0.1 BREATH UNBLOCKS: #-heading may now drop without a quoted-ground
  misread — the interiors carry their own dialect.
- 2026-07-14 — the mixing census (operator question): FIVE of six interiors
  hold pure (zero memetic forms inside; text/markdown declarations true).
  common-sense-tarot exposed as a STRUCTURED PORT mis-wrapped in
  #source-text: its interior carries the whole ahu-chapter tree + a
  working-notes ahu, AND two closers had gone missing (#chapter-16 +
  #source-text unclosed since before this arc — depth 2 at EOF). REPAIRED:
  both closers seated (balance restored, span now (30, 3239)); its slot iam
  re-declared text/x-memetic-wikitext (what the interior factually speaks).
  FORK RESOLVED (operator): the memetic-wikitext #source-text reads pono —
  the first whole-book conversion attempt keeps its shape and its
  text/x-memetic-wikitext declaration; only its interior md remnants
  (154 headings · TOC links) stay on the hand-review tail. All gates green: fold 0.0000%, golden 1 mover (tarot),
  sectioner 12, host-py 15, roundtrip 2/2.
- 2026-07-14 — THE WINDOW CLOSES (the v0.1 breath, one commit): corpus
  `1. `→`# ` lands first (1,080 lines across all bags + library framing;
  67 indented-ol deferred loud; source-text held), then the grammar drops
  `#`-heading and seats `[*#]+` lists (TW5 mixable markers, strict space).
  Canon witness 524/524 at 0.0000% — 4,218 headings + 6,776 list nodes;
  golden re-baked (79 movers, INTENDED); host-py 15 + sectioner 12 +
  roundtrip 2/2 green. The carrier now speaks TW5 line forms with NO md
  window; remaining md in the corpus = the hand-review tail only.
- 2026-07-14 — multi-line bold SPLITS at the newline (operator: cross-line
  '' spans = the exact bug class just cured in the TW5 submodule feature
  branch — never re-introduce it): pass 4 rewrites each wrapped `**` span
  into balanced single-line `''` spans, paragraph-buffered, unprovable
  paragraphs held loud (11). 471 lines split. THE RE-RUN BUG CAUGHT AT THE
  EYEBALL: the retired md-heading rule re-fired on TW5 `# ` ordered lists
  (uncommitted damage, reverted whole); the heading transform now stands
  RETIRED in the tool with the lesson inline. Canon 524/524 clean · golden
  23 movers · host-py 15 · roundtrip 2/2 · ruff clean.
- 2026-07-14 — the 67 indented ordered-lists cross (two @lares-history
  files): THREE passes to get the parent rule honest — v1 deepened siblings
  (each converted line fed back as parent), v2 inherited STALE parents from
  long-gone lists (the scout itself had the same staleness), v3 lands: a
  converted sibling never parents, blanks keep the chain, any other content
  BREAKS it. Ground truth: every item follows a prose label, so all 67 seat
  top-level #. The 4 survivors live inside a code fence — held by law.
- 2026-07-14 — italics cross under the full ward set (pass 5): 2,045 spans
  *x*→//x// (boundary + code-span + sigil-span + interior-// + interleaved-
  quote guards; the 60-char inner cap proved the false ceiling — full-
  sentence italics are real, cap raised to 200); 8 guarded-span defers +
  100 dangling-* lines held loud (multi-line italics, CSS comment marks,
  strays). Canon 524/524 clean; golden 151 movers; suites green.
- 2026-07-14 — THE STRANGLE: the migration tool retires (build-new-then-
  retire; its last living version rides git history at a18d3a34). The
  corpus now speaks TW5 whole — every mechanical class crossed; the
  hand-review tail (180 lines, four classes) lives in REVIEW-RESIDUE.md
  beside this ledger. This document stands as the arc record.
- 2026-07-14 — the residue floor resolves three of four clusters: A = the
  meme-provider QUINE (operator: the quine-all-code intent lives; cleaned
  to pono — the whole TS body fenced as code, ~15 lines strike) · C = nine
  hand-fixes (two kapae bold-in-italic inversions, one mangled list line,
  six nested-legal conversions the guard over-held — TW5 nests bold inside
  italic legally) · D = the honest tick counter (double-tick + tick-inside-
  double aware). Sheet: 180 → 147; guarded + odd-bold classes EMPTY.
  Cluster B (91 multi-line italics, split-at-newline one-shot) awaits the
  operator nod — it cuts after the strangle.
- 2026-07-14 — cluster B enacts after the TW5 scout confirmed the ground:
  the submodule feature branch (wikitext-parser-recovery) terminates
  emphasis at the mark OR a blank line, and recovers unterminated marks as
  literal + diagnostic — cross-line spans within a paragraph parse, but the
  house law (split at the newline, rely on recovery never) holds uniform
  with bold. One-shot (dies with the run, tool stays strangled): 138 lines
  split, 9 unprovable paragraphs held. The eyeball then surfaced the HIDDEN
  class — bold around code spans (segment-odd, line-even, invisible to both
  the converter and the counter): 612 pairs crossed with code spans opaque.
  Canon 524/524 clean · golden 18 movers · suites green.
- 2026-07-14 — the tarot interior CURATES to pono (operator word): the
  Jekyll front-matter fences as yaml (its # comments protected), then the
  full transform set walks the port — 152 headings, 453+131 lists (TOC ol
  chapters # with #* nested questions), 149 anchor links [[t|#chapter-N]],
  23 bold, 7 italics. The first whole-book conversion now reads TW5-whole:
  153 headings + 601 list nodes + 154 ahu blocks as STRUCTURE. Golden 1
  mover; 15 green.
- 2026-07-14 — THE RESIDUE RESOLVES TO ZERO ACTIONABLES (operator + node,
  together): the deep-list-marker bold class cured (23 pairs — the balanced
  pass had never stripped markers) · 14 same-line italic asides/witness
  notes converted (the 200-char cap hid them) · the indented-fence audit
  found NO damage (interiors carried nothing transformable; TW5 has no
  indented fences — archival md artifacts, left) · cross-line inline code
  = LEGAL (codeinline scans to its end-marker across newlines; left) ·
  linguistic \*balay + sigil-body globs = notation (left forever) ·
  ahu-styles.mem = CORRECT BY CONSTRUCTION (\$:/tags/Stylesheet + rules-only
  pragma: no emphasis rule ever runs; raw CSS is the pattern). REVIEW-
  RESIDUE.md DELETED per its own law. Sole remainder: the boot-seed italic
  quote (noosphere-boot.mem:144) — folded into the standing boot-seed
  dialect fork @operator. The corpus migration closes WHOLE.

## CLOSED — 2026-07-14

**RULED (operator): .mem = FULL memetic-wikitext · .md stays md until the
lares daemon seeds context at session start.** The boot seed .mem converts
its last italic (the Law-of-5s Canon quote); noosphere-boot.md holds md by
design, not debt. FINAL witness: 524/524 memes · 0 errors · 4,370 headings ·
7,291 list nodes as structure · golden 1 mover (the boot seed) · host-py 15 ·
sectioner 12 · roundtrip 2/2 · ruff clean. The realignment arc rests.
- 2026-07-15 — THE GRAMMAR PHASE CROSSES (38f235f9): artifact 0.1.0 seats the
  TW5 rich-form inventory (transclusions · macrocalls · tables · pragmas
  paired-by-form · quote/style/typed/hardbreak fences · html lines · .tid
  top-anchored fields · full list-marker class · rules). .tid coverage
  81.4% → 38.3% text_line at zero ERROR; canon census exact (sigil 7807 ·
  ahu 3255). Inline forms stay below the carrier by design.
