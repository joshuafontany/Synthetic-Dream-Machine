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

<<~ ahu #the-tower >>

## The superset tower ~ HTML ⊂ TW5 wikitext ⊂ memetic-wikitext

The grammar is a NESTED SUPERSET TOWER — each layer a strict superset of the one below — and the
WHOLE stack degrades on the same gradient:

- **HTML** — the base. TW5 wikitext parses raw HTML inline (VERIFIED: the core `html.js` · `entity.js`
  · `commentblock.js` · `commentinline.js` wikirules), so **TW5 wikitext ⊃ HTML**.
- **TW5 wikitext** ⊃ HTML — and memetic INHERITS it: the `MemeticParser` subclass filters the core
  rule arrays by a deny-list that defaults EMPTY (`memetic-parser.ts:88`), so every core rule (incl.
  `html`) fires in a memetic doc.
- **memetic-wikitext** ⊃ TW5 wikitext (lock 10: the `<<~` overlay, disjoint-match) — an ISLAND
  GRAMMAR that panics-to-water.

**The never-fail FLOOR (the deep elegance).** Panic-to-water at the memetic layer yields VERBATIM
TEXT; verbatim text renders as escaped HTML text; **HTML text always renders.** So water falls all the
way down the tower to HTML-text, which cannot fail — the tower has a GUARANTEED never-fail ground.
Every malformation, however severe, degrades to "verbatim bytes shown as text," never a crash. The
gradient and its floor are now structural, not aspirational.

**HTML5 is the canonical exemplar.** The HTML5 parsing algorithm (tag-soup → a valid DOM, explicit
error-recovery for every malformation, the browser NEVER fails to parse) is THE gold-standard
never-fail parser — the property our whole tower emulates upward. We make TW5 wikitext + memetic match
the never-fail guarantee HTML already holds at the base.

**The floor becomes LITERAL — adopt parse5 (research-locked, spirit a95eec97).** We make the base the
*real* WHATWG algorithm instead of an exemplar: **parse5** (v8.0.1, pure-JS WHATWG-compliant, isomorphic
ESM — the engine under jsdom/Angular/Cheerio; fits Vite/worker/browser/edge). DOMParser (browser-only,
absent in worker_threads/CLI/edge), jsdom (heavy, edge-hostile), htmlparser2 (forgiving but NO real
tree-construction) all disqualified for the base. parse5 is a PURE PARSING SUBSTRATE (string→AST, no
network/accounts/ontology) — same class as Automerge/keyhive → PONO, sits inside the stack, no
causal-island boundary.

**Integration — parse5 at the FLOOR, NOT a wholesale `html`-rule replacement.** Load-bearing reason
(from the code): TW5's `html` wikirule is WIKITEXT-AWARE — it parses an element's children as wikitext
(`html.js:59` `parseBlocks`, `:62` `parseInlineRun`), so `<div>''bold'' and a <$widget/></div>`
interleaves HTML + wikitext + widgets. A whole-subtree parse5 pass would swallow that interior as opaque
HTML and DESTROY widget invocation. parse5 governs the HTML LAYER, never the layer above. So:
- PRIMARY: parse5 IS the never-fail FLOOR — the water→verbatim-text→HTML path + any pure-HTML fragment
  ingest route through parse5's fragment parser (at the floor you've panicked OUT of wikitext → pure
  HTML → no interleaving to preserve → tag-soup→valid-DOM is the never-fail guarantee). Bridge = a
  post-parse TRANSFORM (parse5 AST → TW5 `{type:"element",tag,attributes,children}` nodes), NOT a custom
  tree-adapter (version-stable + gives the sanitizer one clean walk). Plugin-override (`module-type`,
  last-wins, like `memetic-parser.ts`); isomorphic (fakeDocument only, no `window.document`).
- SECONDARY (optional, later): upgrade ONLY the wikirule's tag SCANNER (`html.js:93,103,161` — the thin
  `reTagName` regex = the "TW5-era HTML" surface) with parse5's tokenizer, keeping TW5's wikitext
  child-recursion. HTML5 attribute/error-recovery without touching interleaving.

**Sanitize seam (CRITICAL) — allowlist tree-walk IN the transform, NOT DOMPurify.** A spec parser parses
`<script>`/`onerror=`/`javascript:`/`<iframe srcdoc>` faithfully → XSS surface. DOMPurify needs a real
DOM/`window` (not Worker-safe; `isomorphic-dompurify` drags jsdom = heavy + a 2nd redundant parser). The
parse5→TW5 transform ALREADY walks every node → fold an allowlist sanitizer into that one walk (tag
allowlist + per-tag attribute allowlist + URL-protocol check dropping `javascript:`/`data:` except image
data-URLs + drop `on*`), seeded from sanitize-html's default set but as our own pure function over the
AST (zero DOM, zero extra parser, isomorphic). KEEP TW5's existing render gate as layer 2 (`element.js:31`
script-neuter · `widget.js:521` `on*`-strip · `config.js:36`); the allowlist closes TW5's open holes
(`javascript:`/`data:` URLs, `iframe`/`object`/`embed`, `srcdoc`, `form action`, SVG/MathML script vectors).

**Modern HTML5 gained** (TW5's `html.js` has NO insertion-mode state machine): real tag-soup recovery
(insertion modes + adoption agency), foreign content (inline SVG/MathML namespaces), `<template>` ·
`<slot>` · custom elements (TW5 rejects leading-dash `html.js:187` + strips non-alphanumeric tag names
`element.js:34`), raw-text/RCDATA elements (`<style>`/`<textarea>`/`<title>`).

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

<<~ ahu #recovery-policy >>

## Recovery policy ~ RESOLVED: water-floor, repair-as-gated-upgrade (2026-06-27)

The fork was never water VS repair — it's **water as the floor, repair as a per-construct upgrade.**

**LOCK — the WRAP guard ships PANIC-TO-WATER first.** On any malformed span: catch, wrap the VERBATIM
bytes in a graded `Error` node (`recoveredAs: "water"`, low/raw confidence), parse cleanly around it.
Four reasons it's the floor: (1) it CAN'T regress — water is never a wrong tree (verbatim preserved,
zero fabricated structure); (2) it keeps the gradient HONEST — it marks "structure unknown," it
cannot lie, where a mis-repair claims structure it guessed wrong (the confidently-incorrect-tree
failure this whole epic kills); (3) it COMPOSES — repair is purely additive on top; (4) it's the cheap
ship (a catch + downgrade vs the per-construct repair tail). This is already `lar-sigil.ts`'s
`__literal__` move, scaled to the parser boundary.

**Repair is the GATED follow-on.** Add phrase-level repair (insert the MISSING token, resync to a
recovery-set, re-parse) ONLY per-construct, ONLY where the fix is UNAMBIGUOUS and FREQUENT — an
unclosed `}}}` / `<<~ >>` is a safe insert; a broken table row is a risky guess that stays water. A
repaired node carries `recoveredAs: "repaired"` at MID (synthesis) confidence — honestly weaker than a
clean parse, honestly stronger than water. The `Error` node's `recoveredAs` field is the seam: `"water"`
ships now, `"repaired"` lands per-construct later. The gradient stays truthful end to end: clean=canon
· repaired=synthesis · water=raw.

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
