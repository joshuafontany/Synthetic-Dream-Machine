<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/api/graceful-parsing >>
```toml iam
cacheable = true
hydrate   = false
mana      = 18
manao     = 18
manaoio   = 18
register  = "Synthesis-Canon"
retain    = true
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/api/graceful-parsing"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# Graceful Parsing ~ all of TiddlyWiki on a gradient

**The principle (operator, 2026-06-27):** scale "parse on a GRADIENT, degrade GRACEFULLY" to ALL of
TiddlyWiki5 parsing — not just our `<<~` memetic sigils. No parse SHALL break badly: every parse
yields a best-effort tree; malformation rides the tree as graded nodes, never a throw, never a
confidently-wrong structure. Researched by a 5-spirit swarm (2026-06-27); the field converges with
rare unanimity. This is the POST-MARATHON epic — the design is locked here, cold-ready.

We are not inventing — we are NAMING what we already half-do (island grammar + Water) and FINISHING it.

<<~/ahu >>

<<~ ahu #the-model >>

## The model ~ the five production invariants (the keel)

Six production parsers (Roslyn · TypeScript · rust-analyzer · Babel · Lezer · Tree-sitter) converge on
five invariants — independent of hand-written vs table-generated:

<<~Inv 1-always-a-tree "the parse CONTRACT changes from `tree | throw` to `tree + diagnostics[]` (Babel's `errorRecovery`). Never throw, never null. matklad: this is the whole game — every 'break badly' today is a thrown/aborted parse" >>
<<~Inv 2-error-missing-nodes "ERROR + MISSING nodes ARE the gradient primitive — present-but-wrong (ERROR, wraps the unparsable span) vs expected-but-gone (MISSING, zero-width inserted). Everything between clean and garbage is expressible" >>
<<~Inv 3-lossless "lossless / full-fidelity trees — the ERROR node holds the bytes VERBATIM, so concatenating the tree reproduces source. This IS our verbatim+AST drawer; the error span lands in the tree, not the floor" >>
<<~Inv 4-untyped-typed "a homogeneous untyped tree underneath (every node a kind tag) + typed views on top — so error nodes live ANYWHERE without special-casing every rule" >>
<<~Inv 5-bounded-recovery "bounded recovery: recovery-SETS (tokens that signal 'parent resumes here') + the ≥1-char PROGRESS INVARIANT (a skip-loop MUST consume ≥1 char) — kills both hard-fail AND the infinite-loop failure mode" >>

**The theory name (it already exists):** ISLAND GRAMMARS + Water/Lake (Moonen, *Generating Robust
Parsers Using Island Grammars*, WCRE 2001 — "Water" = the non-terminal that swallows non-islands;
arXiv 2010.16306 adds "Lakes" = tolerant regions inside islands). Our `meme-ast` regex-islands +
Text-gap parser IS an island grammar already. Add a per-node parse-CONFIDENCE gradient (0–20, our
`aperture` ladder) + an explicit ErrorNode (à la tree-sitter/Lezer/Roslyn). Diagnostics ride
OUT-OF-BAND, span-keyed (rust-analyzer's model) — exactly our gradient-annotation drawer over verbatim.

<<~/ahu >>

<<~ ahu #engine-verdict >>

## Engine verdict ~ steal the model, don't swap the engine

TW5's parser is HAND-WRITTEN rule recursion — so the generated-GLR families are the wrong SHAPE to
copy; the gold pattern is RESILIENT RECURSIVE DESCENT (Roslyn / rust-analyzer / matklad's *Resilient
LL Parsing Tutorial*, the canonical modern reference).

- **Tree-sitter** — STEAL its `ERROR`/`MISSING`/`error-cost` node model (the cleanest gradient
  formalization, maps 1:1 onto our ladder). REJECT the engine: no TW5-wikitext grammar exists (author
  from zero), markup RESISTS tree-sitter (its own markdown maintainers call it correctness-unsafe +
  needs a C external scanner), recovery is an UN-TUNABLE BLACK BOX (fights "steer the degradation"),
  C toolchain in a TS/WASM shop. (WASM-in-3-runtimes actually PASSES — not the blocker.)
- **Lezer** — adopt the never-fail discipline + `@lezer/markdown`'s hand-written-incremental
  architecture (BlockParser/InlineParser/NodeSpec) as a template IF we ever build editor-grade. NOT a
  render-parser replacement (its CST ≠ TW5's attribute-rich widget tree; error nodes carry NO
  confidence — the gradient stays ours to derive). NOTE: BurningTreeC shipped a WORKING Lezer wikitext
  parser (CM6 plugin, Jan 2026) — reuse it EDITOR-side, don't rebuild.
- **Chevrotain** — the strongest JS-native error-recovery ENGINE (pure-JS, no codegen/WASM, built-in
  recovery; `recoveredNode` + `parser.errors[]` + `recoveryValueFunc` = the graded API) — but adopting
  it = REPLACE (rebuild the widget pipeline). Hold as the escalation option only. (Langium = its LSP
  upgrade; ANTLR loses on Java codegen; nearley/ohm/peggy = weak recovery for MALFORMED input.)

<<~/ahu >>

<<~ ahu #architecture >>

## The lift architecture ~ AUGMENT + WRAP, reject REPLACE

**REJECT REPLACE** (re-host wikitext on Lezer/tree-sitter/Chevrotain): violates plugin-not-fork (TW5's
widget render pipeline is BONDED to the core WikiParser's `{type,attributes,children}` tree shape —
swapping the parser = re-implementing the widget tree = forking `$:/core`) + isomorphism (a WASM/
non-iso dep fights the node/browser/cli/worker quad our island layer runs in) + throws away a working,
already-island-shaped parser.

**AUGMENT** our `meme-ast/` island layer (it's ALREADY an island grammar — purely additive):
1. add an **`Error` node kind** to `MemeAstKind` `{reason, recoveredAs, pos, raw}` — emitted at the
   three silent-loss sites (orphan close `builder.ts:258`, EOF force-close `builder.ts:277-281`,
   dropped near-miss sigils `scanner.ts`).
2. add **`confidence: number`** to `MemeAstBase` (0–20 aperture ladder; reuse the existing edge-
   confidence convention `types.ts:34`) — 20 = clean, lower for force-closed/recovered/Dynamic-unknown.
3. **phrase-level recovery** in `findCloseEnd` (`lar-sigil-shared.ts:202`) + the builder EOF sweep —
   bound a force-closed frame at the next blank line / next opener instead of swallowing to EOF.

**WRAP** for full TW5 core wikitext — **NO FORK NEEDED, plugin-override-preload (VERIFIED).** TW5
builds its parser registry at `wiki.js:1030` via `forEachModuleOfType("parser", … $tw.Wiki.parsers[f]
= module[f])` — **LAST-REGISTERED WINS** on a duplicate content-type, and plugin modules load AFTER
core. So a plugin `module-type: parser` that does `exports["text/vnd.tiddlywiki"] = TolerantWikiParser`
(subclass the core `WikiParser` — `wikiparser.js:494` — and run `parse()` inside a tolerant guard that
catches throws + downgrades the malformed span to a graded `Error`/Text node) **OVERRIDES core for ALL
standard wikitext** — identical to how `memetic-parser.ts:106` already registers ours for
`text/x-memetic-wikitext`, just aimed at the default type. Panic-mode-to-water at the WHOLE-parser
boundary, zero `$:/core` edits. FINER per-rule recovery (recovery-sets in the block/inline rules) is
ALSO plugin-overridable by the same last-wins rule — a `module-type: wikirule` exporting an existing
rule name shadows it. The operator's submodule-fork grant is a held SAFETY-NET, expected UNUSED.

**THE REUSABLE MODULE (the operator's "lift complexity into another module"):** extract a tolerant-
parse substrate — `meme-ast/recover.ts` (or `@lararium/parse-substrate`) — exporting: Water/Island/Lake
segmentation · `ErrorNode` + `confidence` constructors · recovery policies (`syncToNextOpener`,
`boundAtBlankLine`, `forceCloseGraded`) · a **`withRecovery(parseFn)`** guard wrapping any throwing
parser into a graded result. `builder.ts` · `scanner.ts` · the `MemeticParser` wrap all consume this
ONE module. The rule classes NEVER learn recovery — the substrate owns it (matklad: recovery lives in
the driver, not the grammar). Clean upstream-plugin boundary.

<<~/ahu >>

<<~ ahu #tw5-break-modes >>

## TW5's actual break-badly modes (grounded, file:line)

Two layers, failing differently:
- **Layer A — `meme-ast/` (island, regex + Text water):** never throws but SILENTLY LOSSY — orphan
  close discarded (`builder.ts:255-265`), unclosed frame SWALLOWS the rest of the doc then force-closes
  (`builder.ts:277-281` — a *confidently incorrect* tree, the worst break-badly), mis-nesting silent
  re-parent (`builder.ts:256-259`), near-miss sigils vanish with no signal (`scanner.ts:165-191`),
  `safeRegex` swallows bad patterns (`scanner.ts:138`). The one good seed: unknown sigil →
  `Dynamic/unknown` (`builder.ts:123,215`) — already a graded-degrade, just unnamed.
- **Layer B — the wikirule (`lar-sigil.ts`):** unterminated block → bare opener, body lost
  (`:104-118`); generic `<<~` → `__literal__` water (`:125-146`) — panic-mode, the saving grace.
- **The TRUE break-badly = the standard `$:/core` WikiParser** (`memetic-parser.ts:82-104` only filters
  rule arrays; the engine is unchanged): a regex-rule pump, NO error nodes, NO confidence — every parse
  "succeeds" by consuming all input, so an unterminated construct consumes-to-EOF or mis-structures
  silently, failure DEFERRED to a downstream widget-render throw.

Existing hooks: `types.ts:34` already carries `confidence:number|null` on `PranalaEdge` +
`PranalaEdgeViolation{severity}` — the gradient vocabulary exists, just on EDGES not nodes, populated
by nothing. Finish it onto nodes.

<<~/ahu >>

<<~ ahu #open-fork >>

## The one open fork (operator's call)

The WRAP guard over core-wikitext: **phrase-level REPAIR** of malformed spans (more value, more
surface) vs **panic-to-water** them (cheap, safe). The swarm leans panic-to-water FIRST, repair later.

<<~/ahu >>

<<~ ahu #references >>

## Load-bearing references

- matklad, *Resilient LL Parsing Tutorial* (2023) — https://matklad.github.io/2023/05/21/resilient-ll-parsing-tutorial.html
- Roslyn Red-Green Trees — https://github.com/dotnet/roslyn/blob/main/docs/compilers/Design/Red-Green%20Trees.md
- rust-analyzer syntax (lossless + resilient + errors out-of-band) — https://github.com/rust-lang/rust-analyzer/blob/master/docs/book/src/contributing/syntax.md
- Moonen, *Generating Robust Parsers Using Island Grammars* (WCRE 2001) · Lake symbols — https://arxiv.org/pdf/2010.16306
- Lezer System Guide — https://lezer.codemirror.net/docs/guide/ · `@lezer/markdown` — https://github.com/lezer-parser/markdown
- Tree-sitter ERROR/MISSING — https://tree-sitter.github.io/tree-sitter/using-parsers/queries/1-syntax.html
- Chevrotain Fault Tolerance — https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html
- BurningTreeC CM6 wikitext parser (2026) — https://talk.tiddlywiki.org/t/new-codemirror-6-tiddlywiki5-plugin-2026/14689
- Babel `errorRecovery` — https://babeljs.io/blog/2019/11/05/7.7.0

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
