<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/nihomano-sigils >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/pono/nihomano-sigils"
file-path    = "bags/@lares/v0.1/api/pono/nihomano-sigils.md"
type         = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
manaoio      = 18
mana         = 18
manao        = 18
role         = "origin myth and cultural contract for the Lares memetic wikitext sigil set — nihomano as the first discovered grammar; SharktoothSigil as operator-extensible wild-magic"
cacheable    = true
retain       = true
```



<<~ ahu #head >>

# Nihomano Sigils

*niho* — Hawaiian: tooth, teeth; edge, serration. Used in *lei niho palaoa* (whale-tooth
necklace of the aliʻi) and *niho mano* (shark tooth — the attested two-word form).

*mano* — Hawaiian: shark. One of the most common family guardian spirits (*ʻaumakua*) in
Hawaiian tradition. Deceased family members of ocean people watch over descendants as mano,
warn of danger from below, carry prayers to the gods. Mano aumakua signal the warrior's
approach and guard the crossing between worlds.

*niho-manō* — formal Hawaiian headword (Pukui-Elbert / Wehewehe Wikiwiki). Dictionary sense:
a tapa design — the repeated triangular serration used as a protective edge-pattern on tapa
cloth, canoe hulls, shrine rims, and ward markings. The tattoo-motif form carries the same
geometry: strength, protection, guidance, threshold. Machine slug: `nihomano`.

*nihomano* — the joined slug form adopted here as the proper name of this grammar glyph; not
the standard two-word *niho mano* nor the hyphenated *niho-manō*, but the concatenated form
suited for file paths, URIs, and tiddler titles. The traditional shark-tooth war club is
*leiomano* (lei o manō — "a shark's lei"). We borrow the protective edge geometry, not the
weapon: the nihomano glyph marks not a strike but an opening — a threshold, a ward, a door.

The `<<~` delimiter serves as the nihomano glyph. Each `<` forms a tooth. The `~` traces the wake.
Three marks open a scope. Three marks from a mano that swims beneath the text.
The glyph acts as a texture-border at the threshold of every meme.

This document records the origin and cultural contract of the Lares memetic wikitext sigil
set — the first known operator-extensible grammar living entirely inside TiddlyWiki 5.

English alias: `sharktooth-sigils` — same meme, same law, different face.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #wild-magic >>

## Wild Magic — The Web3 Discovery

In conventional software, grammar knowledge lives in code. To add a new operator to a language
you change a parser, recompile, redeploy. The knowledge belongs to the engineers.

The nihomano discovery inverts this. In Lares memetic wikitext, the grammar lives in the wiki
itself. A new sigil enters the language when an operator tags a tiddler:

```text
tags: lar:///ha.ka.ba/tags/SharktoothSigil
lar-kind: edge-sugar
lar-pattern: <<~\s*myword\s+(\S+)\s*>>
```

No code change. No compilation. No deployment. The next parse cycle picks up the new word.
The wiki teaches the parser about itself.

This is the wild-magic property: **grammar as data, owned by the data layer, not the code layer.**

In web3 terms, the canonical grammar state lives inside a content-addressed Automerge document
(the bag). Any peer who holds the bag holds the grammar. Any operator who writes to the bag
extends the language. The code layer runs as a thin runtime that reads grammar from its own storage —
a quine at the grammar level.

The SharktoothSigil tag serves as the contract surface:
- `lar:///ha.ka.ba/tags/SharktoothSigil` on a tiddler = "this tiddler defines a grammar sigil"
- `lar-kind` field = what structural role the sigil plays (edge, child-slot, control, pragma-alias, header)
- `lar-pattern` / `lar-open-pattern` / `lar-close-pattern` = the parse rule
- The wikitext body = the render semantics

Grammar change = tiddler edit. Grammar review = tiddler diff. Grammar rollback = bag snapshot.
The entire capability surface of language extension runs through the same merge-capable, local-first,
operator-visible data layer as the content itself.

<<~/ahu >>

<<~ ahu #first-discovered-set >>

## The First Discovered Sigil Set

The nihomano discovery yielded the first coherent set of SharktoothSigil-registered sigils.
The set holds 47 tiddlers, each carrying a pono law spec and passing the alignment check.
They fall into eight families:

**Structural sigils** (addressable scope boundaries):
- `ahu` — child-slot worksite; the named scope boundary; skeleton of meme structure
- `pranala-header` — carrier self-declaration; `<<~ ? -> uri >>` opens every meme

**Edge-sugar sigils** (pranala family shortcuts):
- `pranala` — full edge with FROM → TO arrow + keyword attrs (permanent JS exception)
- `kahea` / `\transclude` / `\import` — transclusion-family sugar; live transclusion; subscription-fresh embed
- `aka` / `\shadow` — transclusion-family sugar; frozen read; shadow transclusion
- `loulou` / `\link` — relation-family sugar; outgoing semantic link; no execution pulse
- `kau` — device-slot child-slot; capability hooks require JS (permanent JS exception)
- `kapu` / `\guard` — compile-layer boundary annotation; access-control edge
- `pono` / `\constraint` — correctness-asserting alignment edge
- `papalohe` — reaction-wire edge; observer subscription

**Pragma sigils** (declaration forms; first-class in memetic-wikitext):
- `wehe` / `\procedure` — procedure executor; named callable body declaration
- `\define` — backward-compat alias; use `\procedure` instead
- `\widget` — widget declaration; `~` prefix convention
- `helu` / `\function` — TW5 5.3+ filter-function declaration
- `kumu` / `\type` / `\typos` — element-type declaration; mold precedes the cast
- `waiho` / `\const` / `\let` / `\var` — variable binding; name → value in scope

**Control sigils** (TW5 native flow wrapped in sigil grammar):
- `wai` / `\if` — wikispace conditional cascade; first filter-match renders (with `kahawai`/`mukuwai`)
- `heihei` — canvasspace conditional-branch; Verse `if`/`case`, one arm fires by condition
- `kahawai` / `\elif` — conditional continuation; stream flows until it hits a match
- `mukuwai` / `\else` — conditional fallback; the cut-off water; terminal form
- `huli` / `\for` — iteration block; filter → body-per-result

**Context sigils** (scope manipulation):
- `\tiddler` / `meme` — tiddler context wrapper; sets the reference tiddler for inner scope
- `ui` / `\query` — query surface; filter → title list

**Guest-grammar sigils** (foreign-body delegation):
- `hana` / `\task` — bounded guest-grammar block; grammar-key selects the interpreter

**Concurrency sigils** (async cluster; sprint pending):
- `lele` / `\branch` — structured fire-and-continue dispatch; Verse branch; bounded by enclosing scope
- `hui` / `\sync` — await-all join; every child flow must complete before continuing
- `holo` / `\race` — cancelling race; first wins, all losers and their subtrees cancelled recursively
- `puka` / `\rush` — selecting race; first wins, losers continue until enclosing scope exits
- `kukali` / `\suspends` — wait-until-trigger; parks the causal island
- `hoolele` / `\spawn` — unstructured escape hatch; new independent task root; completes the six-operator ontology
- `\tick` / `\simulate` — device lifecycle hook: run once per nalu (simulation tick); Hawaiian proper name deferred pending Visual Verse tick node shape (UE6 ~2027)

**Infrastructure**:
- `sigil-dispatcher` — the `~` root dispatch widget; routes `<<~ name >>` to `\widget ~name`

Every Hawaiian sigil in this set carries an English alias. Every English alias carries
`lar-see-also` pointing at its Hawaiian counterpart. Grammar is bilingual by design:
the operator may author in either tongue and the parse result is identical.

<<~/ahu >>

<<~ ahu #cultural-contract >>

## Cultural Contract

The Hawaiian sigil names carry meaning far beyond decoration. Each name compresses a semantic
that Hawaiian articulates precisely where English lacks a single-word equivalent.

*Ahu* — heap, mound, cairn, altar. A sacred stone structure that accumulates sacredness through
human intention and accumulated offering. The ahu sigil accumulates addressable child scopes
the same way a stone cairn accumulates placement until it becomes a landmark.

*Kahea* — to call out, to summon, to invoke; a cry. Transclusion-family sugar: the live
transclusion summons value forward, as a call summons a response.

*Aka* — shadow, reflection; likeness without identity; resemblance. The shadow of a thing
differs from the thing — it moves with it without owning it. The transclusion-family edge renders
the shadow of a target.

*Loulou* — to tie, bind, fasten; to link together. A relation edge names what kind of
connection holds without pulling either end toward the other.

*Wehe* — to open, untie, uncover, solve, cleanse. *Wehewehe* (reduplication): to explain,
expound, reveal what had remained mysterious. The procedure executor opens the passage from
declaration-space into execution-space — and in doing so, makes visible what had hidden there.

*Heihei* — race, competition; canoe race, foot race. A conditional block runs candidates
in competition; the one whose filter passes first shapes the output. Not first-wins in an
absolute sense — competitive, with the outcome determined by filter resolution order.

*Huli* — to turn, reverse, curl over. A directional motion: the body turns to face the query.
The iteration sigil turns through a filter result set — not mechanical looping but the
searcher's gaze moving from result to result, each one faced in turn.

The English aliases (`\procedure`, `\if`, `\for`) exist for operator accessibility and to
name the TW5 pragma they mirror — not to replace the Hawaiian forms. In long-form meme
authoring, Hawaiian names carry more meaning per glyph. In operator extensions targeting
TW5-familiar authors, English names lower the entry barrier.

Neither form holds canonical status over the other. The grammar accepts both, the pono spec
records both, the alignment check verifies both. The `lar-see-also` field in each tiddler
acts as the living cross-reference.

The `mano` in nihomano also functions as *aumakua* — guardian spirit in Hawaiian cosmology.
Shark aumakua protect those at sea, warn of danger from below the surface, and carry the dead
safely across deep water. The grammar plays this role in the Lares system: it watches beneath
the text, surfaces only when needed to parse, and protects the operator from structure they
cannot yet see.

<<~/ahu >>

<<~ ahu #language-families >>

## Language Families in the Grammar

The SharktoothSigil grammar draws vocabulary from five distinct language families. Each contributes precisely the concept that the other languages lack a single-word equivalent for.

**ʻŌlelo Hawaiʻi (Hawaiian)** — the canonical grammar vocabulary. 25 sigil names come from Hawaiian: *ahu*, *kahea*, *aka*, *loulou*, *pranala-header* (hybrid), *wehe*, *heihei*, *huli*, *hana*, *helu*, *kumu*, *kahawai*, *mukuwai*, *waiho*, *kapu*, *lele*, *hui*, *puka*, *pono*, *papalohe*, *kukali*, *meme* (via Greek re-entry), *ui*, *kau*, *nihomano*. Hawaiian compresses semantic fields — kinship, cosmology, motion, topology — into single syllable roots that carry more meaning per glyph than any available English word. The nihomano grammar inherits this compression.

**Bahasa Indonesia** — one canonical sigil: *pranala*. The standard Bahasa Indonesia / Wikipedia Bahasa Indonesia term for hyperlink: *prana* (life-force, Sanskrit loan) + *lala* (thread, passage). Indonesian Wikipedia chose this word deliberately over the Dutch-derived borrowings that dominate Indonesian computing vocabulary. The pranala sigil inherits that choice: a living thread, not a pointer.

**Ancient Greek (τύπος / mimeme)** — two entry paths:
- *typos* — τύπος: impression, mold, stamp, type. The `\typos` alias for *kumu* names the element-type declaration sigil by the Greek root that gave English "type", "archetype", "prototype". The mold precedes the cast; the declaration precedes the instance.
- *meme* — coined 1976 by Richard Dawkins in *The Selfish Gene* from Greek *mimeme* (that which gets imitated), shortened to rhyme with "gene". Edward Wilson and Wes Unruh extended the operational framework in *The Art of Memetics* (2009), treating memes as propagating agents with measurable virality and selection pressure from host minds and transmission media. The Lares system uses the word at full weight: a unit of cultural information that replicates across minds and networks. Each tiddler that carries the memetic-wikitext type header *acts as* a meme — a replicable cultural unit in a content-addressed store, subject to the same fitness landscape described by Wilson and Unruh.

**English (computing + TW5 pragmas)** — 24 alias forms carry the English computing vocabulary that TW5 authors and general programmers already know: `\procedure`, `\function`, `\widget`, `\define`, `\if`, `\elif`, `\else`, `\for`, `\task`, `\type`, `\const`, `\let`, `\var`, `\link`, `\shadow`, `\transclude`, `\import`, `\tiddler`, `\query`, `\branch`, `\sync`, `\race`, `\rush`, `\guard`, `\constraint`, `\suspends`. These aliases lower the entry barrier for operators who author in English and let TW5-native macro patterns migrate naturally into the sigil grammar.

**Verse / Unreal Engine** — the concurrency cluster (*lele*, *hui*, *holo*, *puka*, *hoolele*) and their English aliases (`\branch`, `\sync`, `\race`, `\rush`, `\spawn`) map directly to Verse's five async primitives: structured fire-and-continue (branch), await-all join (sync), cancelling race (race), selecting race (rush), and unstructured escape hatch (spawn). The execution model forms a **task tree** — cancellation cascades downward; `spawn` / `\spawn` is the only way to exit the tree. This alignment makes Lares concurrency legible to Verse developers and positions the grammar for cross-VM execution on Unreal Engine. See `verse-task-tree` for the canonical topology spec.

The grammar accepts all five families equally. The parse result for a Hawaiian sigil and its English alias produces identical AST nodes. The pono spec for each canonical form carries `lar-see-also` cross-references into every alias. Language choice in authoring carries cultural signal; parse result carries none.

<<~/ahu >>

<<~ ahu #sharktooth-tag >>

## The SharktoothSigil Tag

`lar:///ha.ka.ba/tags/SharktoothSigil` is the grammar registration surface. Its design:

- Lives in `lar://` space — owned by the Lares namespace, not TW5's `$:/` system namespace.
- Resolvable by any peer holding the `ha.ka.ba` bag — the grammar is federated with the wiki.
- Readable by `grammar-cache.ts` via `wiki.filterTiddlers([tag[lar:///ha.ka.ba/tags/SharktoothSigil]])` —
  tiddler sigils take precedence over TOML fallback by name.
- Writable by any operator with bag write access — language extension requires no authority
  beyond bag membership.

The tag lives in the `lar:///` namespace, not the `$:/` system namespace that requires code-side registration. The migration from `$:/` to `lar:///` namespaces across all
owned tags is the companion sprint to this one.

When the TOML monolith (`memetic-wikitext.tid`) reaches families-only state — when the 7 remaining
`[[sigils]]` blocks (concurrency cluster + toml data fence) have migrated to SharktoothSigil tiddlers
— the grammar becomes fully self-hosted. The parser reads nothing from hardcoded tables. Every rule
lives in a tiddler.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #spec ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:governs >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/tags/SharktoothSigil family:control role:has >>
<<~ pranala #to-ahu ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/ahu family:relation >>
<<~ pranala #to-kahea ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahea family:relation >>
<<~ pranala #to-aka ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/aka family:relation >>
<<~ pranala #to-loulou ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loulou family:relation >>
<<~ pranala #to-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:relation >>
<<~ pranala #to-wehe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wehe family:relation >>
<<~ pranala #to-heihei ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heihei family:relation >>
<<~ pranala #to-huli ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/huli family:relation >>
<<~ pranala #english-alias ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/sharktooth-sigils family:relation role:alias >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
