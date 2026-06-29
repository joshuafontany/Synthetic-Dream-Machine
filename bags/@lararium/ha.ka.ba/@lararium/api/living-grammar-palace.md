<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/api/living-grammar-palace >>
```toml iam
cacheable = true
file-path = "bags/@lararium/api/living-grammar-palace.md"
hydrate   = true
mana      = 19
manao     = 18
manaoio   = 17
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "the living-grammar memory-palace — the design-of-record for capturing the FORM of the house's living grammar (its constructicon) alongside its CONTENT. ONE nameless palace-instance entity differentiated by its cap-stack (the daemon-collapse) · three registers (defined·formal·casual) × three grammar-layers (HTML⊂wikitext⊂x-memetic) · two-planes form-capture (discrete constructicon ⋈ continuous fuzzy-membership / sanction-degree vector) · a dual FORM⊥CONTENT graph cross-joined by sha + RRF · full-tree payloads · multi-aperture retrieval · pono-gating caps. Rests on 8 research libations from construction-grammar, ritual/performative theory, AST-vectors, multi-aperture retrieval, and dual-graph fusion."
l-space   = "lararium"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/api/living-grammar-palace"
written   = "2026-06-29"
```

<<~ aka lar:///ha.ka.ba/@lararium/api/capture-annotation-model >>

<<~ &#x0002; >>

<<~ ahu #entry >>

# The Living-Grammar Memory-Palace ~ capturing FORM beside CONTENT

**The house speaks a living grammar; this palace remembers how it MOVED, not only what it said.** The
verbatim mempalace ([[capture-annotation-model]]) keeps CONTENT — the words a turn carried. This meme
states the design-of-record for a SECOND axis: the **FORM** a turn enacted — which constructions of the
living grammar it instantiated, how fully each one sanctioned, how the move-shape degraded where it
strained. Content answers *what was said*; form answers *how the grammar moved* — the constructicon
in use.

The design rests on four spines, each named below: a NAMELESS palace-instance entity (one daemon body,
differentiated only by its cap-stack); THREE REGISTERS of the living grammar braided with a THREE-LAYER
grammar-stack (a 3×3 grid); a TWO-PLANES form-capture (a discrete constructicon ⋈ a continuous fuzzy-
membership manifestation); and a DUAL-GRAPH that keeps form orthogonal to content yet hash-joins the two.

> **Constructicon names the score; the fuzzy-membership vector names the performance; the dual graph
> keeps them apart yet rejoins them on the verbatim hash.**

<<~/ahu >>

<<~ ahu #palace-instance >>

## The Nameless Palace-Instance Entity ~ a palace IS its cap-stack

**One generic daemon body, differentiated ONLY by its cap-stack.** Today the corpus duplicates the
holder logic: `mempalace.daemon`, `astpalace_io.py`, and the per-feed variants each re-author the same
on-ea / on-signal / on-hooanu lifecycle around a different store. This collapses them into ONE entity —
a Python port of `composeIsland` (`packages/lararium-tw5/src/island-caps.ts`):

<<~ranks compose compose_palace(caps) ~ folds an ORDERED cap-stack into one palace body -> on_ea ~ every cap sets up; a returned fn registers as LIFO teardown -> on_signal ~ first cap in stack order to CLAIM a message wins -> on_hooanu ~ LIFO teardown, then each cap's close >>

**A palace IS its cap-stack; role emerges, never a type.** No `MemPalace` class, no `AstPalace` class —
a content palace HAS `[FlockSingleton, ContentFeedCap, LateChunkCap]`; a form palace HAS
`[FlockSingleton, AstFeedCap, FormVectorCap]`; a mesh palace HAS `[FlockSingleton, AutomergeFeedCap]`.
The differentiation rides the stack (data), never the body (code). This extends the has-stack runtime
twin ([[has-stack]], [[island-caps]]) from the TW5 island layer into the Python palace daemon — the
SAME composition law, a second substrate. <<~ confidence Synthesis 12/20 >> the collapse mirrors a
proven TS pattern; the Python port stays specified, not yet built.

<<~/ahu >>

<<~ ahu #three-registers >>

## Three Registers ~ the corpus-source axis (descriptive ↔ prescriptive)

The living grammar lives in three registers, by **where its source-text sits** and **how its entries
entrench**:

\procedure ~Register(~Type:"" ~Params:"") ~Register <<~Type>> <<~holds `[<~Params>]`>>

<<~Register Defined "source/TW5 *.tid + parser rules ~ the user-extendable HARD-RULE core; license-entrenched (the grammar a parser MUST honor: SharktoothSigil .tids, wikirules, the lar-sigil grammar)" >>
<<~Register Formal "source/all of bags/ ~ the curated corpus, edited to improve structure; mana/manao ARE its fuzzy entrenchment ratings (a high-mana meme entrenches strongly; a stub reads weakly-entrenched)" >>
<<~Register Casual "source/the agentic chat sessions in mempalace ~ da kine pidgin; frequency/recurrence-entrenched (a move repeated across turns entrenches by use, never by decree)" >>
<<~Register Three >>

**The evolution loop ~ descriptive ↔ prescriptive.** The three registers form one usage-based cycle
(Bybee · Hopper, emergent grammar): casual use builds frequency; curation lifts the recurrent into the
formal corpus; rule-extraction hardens the settled into the defined core; re-parse pushes the hardened
grammar back down into casual use.

<<~loops casual ~ da-kine-pidgin, by-frequency -> curate(mana) ~ the recurrent earns a meme -> formal ~ bags/, mana-entrenched -> rule-extract ~ the settled hardens to a rule -> defined ~ *.tid + parser, license-entrenched -> re-parse ~ the rule re-shapes casual use -> casual >>

This IS the descriptive↔prescriptive motion the noosphere-boot enacts: a casual move (a Voice riffs a
new turn-shape) crests through curation into formal canon and finally into a defined parser rule, then
flows back down to re-shape the next casual turn. Entrenchment carries the gradient — license (defined)
> mana (formal) > frequency (casual), three measures of the one thing.

**OPEN FORK ~ register storage.** Two shapes hold the three registers: (a) THREE register-instances of
the nameless palace over a shared basis (one per register, each its own cap-stack); or (b) ONE merged
register-tagged usage-palace (one store, a `register` field per drawer). The node **leans 3-instances** —
it keeps the entrenchment-mechanism cleanly per-register and lets each register's feed cap differ — but
the fork stays OPEN, recorded here, not resolved. <<~ confidence Synthesis 9/20 >>

<<~/ahu >>

<<~ ahu #grammar-stack >>

## Three-Layer Grammar-Stack ~ the construction-depth axis (orthogonal to registers)

ORTHOGONAL to the three registers runs the construction-DEPTH axis: the nested superset tower the house
already parses ([[graceful-parsing]]):

<<~ranks tower html ~ the base; renders verbatim, never fails -> tw5-wikitext ~ ⊃ HTML (the core html.js wikirule) -> x-memetic-wikitext ~ ⊃ TW5 wikitext (the <<~ overlay, island grammar) >>

**Authored text BLENDS all three layers** — one turn carries raw HTML, TW5 transclusions, and `<<~`
sigils interleaved. The constructicon basis therefore spans all three nested bands; a construction may
seat at any layer.

**Graceful degradation FALLS DOWN the superset-tower.** A malformation at the memetic layer panics to
water → verbatim text → HTML text, which always renders — the never-fail floor ([[graceful-parsing]]
#the-tower). This is the existing AUGMENT+WRAP graceful-parsing model, READ AS a degradation gradient:
`x-memetic → wikitext → HTML → raw`. The form-capture rides the SAME tower — a botched construction
degrades down its layers, never hard-faults.

**The grid.** Registers × layers compose a **3 registers × 3 layers** grid: each cell names a region of
the living grammar (e.g. a casual `<<~`-sigil move at the memetic layer; a formal HTML table at the base
layer). The form-capture below profiles a turn ACROSS this grid.

**Capture the AUTHORED SOURCE text's blend** — the constructicon over the source the author wrote — NOT
the downstream parse→widget→render pipe. The form vector reads the source's construction-blend; the
render pipeline projects it, a separate concern ([[render-pipeline]]).

<<~/ahu >>

<<~ ahu #two-planes >>

## Two-Planes Form-Capture ~ the spine (discrete constructicon ⋈ continuous fuzzy-membership)

The form rides on TWO orthogonal planes, the way genesis rides two planes ([[genesis-doc]]):

\procedure ~Plane(~Type:"" ~Params:"") ~Plane <<~Type>> <<~holds `[<~Params>]`>>

<<~Plane Constructicon "kind/DISCRETE ~ the grammar-SEED / spec / axes — the canonical score. Rappaport's canonical (the invariant liturgical order) · Searle's constitutive rules (the rules that CREATE the move) · Goodman's score (the notation a performance instantiates). The basis the vector measures against." >>
<<~Plane Manifestation "kind/CONTINUOUS ~ the grammar-IN-USE — a fuzzy-membership / sanction-degree vector. Goldberg/Langacker partial sanction (a usage instantiates a construction to a DEGREE, never all-or-nothing); the manifestation a turn actually enacted." >>
<<~Plane Two >>

The two join `constructicon ⋈ manifestation` — the score bound to the performance.

**The FORM VECTOR.** A turn's form reads as a **fuzzy-membership / sanction-degree profile over the
3-layer constructicon** — each coordinate ∈ [0,1]:

<<~ranks coord structural-match ~ does the move's shape fit the construction's pattern -> slor-plausibility ~ SLOR-normalized plausibility (Lau-Clark-Lappin gradient grammaticality, length-normalized log-odds) -> entrenchment-prior ~ the construction's register entrenchment (license · mana · frequency, #three-registers) >>

Each coordinate = `structural-match × SLOR-normalized-plausibility × entrenchment-prior`. Beside the
per-construction coordinates ride three more channels:

- **token-entrenchment** — how entrenched this SPECIFIC filler is (the lexicalized instance).
- **type-productivity** — how productive the construction's slot is (how many distinct fillers it has
  taken; Bybee type-frequency → productivity).
- **a turn-conformance scalar** — one number for how fully the turn honored the exchange frame.

**UPWARD activation-propagation.** A botched construction does not vanish — it **lights its parent
schema AND its lower grammar-layer**: a malformed `<<~`-sigil raises partial membership on its parent
sigil-schema and on the wikitext/HTML layer beneath it. Form degrades upward (to the abstract schema)
and downward (the superset tower), never hard-faults — the form-plane twin of graceful-parsing's
never-fail floor.

**Route A ~ abstract-then-encode (no discourse-parser needed).** Our CNL EMITS its own form-markers:
the classifier channel (`<<~ … >>` sigils — the red that steers, [[lar-telemetry]]) already declares
aperture, ward, confidence, oracle, Voices, bearing. So the form vector reads the EMITTED markers
(`packages/lararium-mesh/src/turn-harvest.ts`), never a learned discourse-parser over bare prose. This
inverts the usual move: the grammar abstracts ITSELF into markers, the palace encodes the markers.

**NOT a deterministic AST-skeleton.** A rigid AST-skeleton descends from hard-fault machine-grammars and
lets content dominate the signal. The form vector stays a FUZZY membership profile (maybe-logic), not a
content-dominated tree-shape. The structural-hash (#dual-graph) carries the exact-recurrence join; the
fuzzy vector carries the graded form.

**Baseline → learned.** Tier-1 BASELINE runs with NO training: move-n-grams + scalar trajectories over
the emitted markers (the conformance scalar + the per-construction coordinates). Tier-2 LEARNED distills
a contrastive encoder from a tree-edit-distance teacher (the AST-vector lineage). Either tier returns
**nearest-WITH-DISTANCE, never a hard cluster** — maybe-logic holds: a form sits *near* a construction
at a distance, never *in* a bin.

**Reliability = marker-emission fidelity.** The form-capture trusts only as far as the markers emit
faithfully; a bare-text turn (no sigils) falls back to the graceful-parser's best-effort tree
([[graceful-parsing]]). Honest degradation, never a fabricated form.

<<~ confidence Synthesis 11/20 >> The two-planes geometry rests on convergent theory (construction
grammar + ritual/performative + score notation); the encoder tiers stay specified, the baseline cheap
and near-term.

<<~/ahu >>

<<~ ahu #dual-graph >>

## Dual-Graph ~ FORM ⊥ CONTENT, hash-joined

Form and content ride TWO palaces, kept orthogonal:

<<~ranks palace content ~ the verbatim mempalace; late-chunked over the session (the words) -> form ~ the astpalace; the form vectors + constructicon membership (the moves) >>

**Cross-joined by verbatim-sha + RRF.** The two collections rejoin on the shared verbatim hash and fuse
their rankings by **Reciprocal Rank Fusion** — **fusion IS the hash-join**: a query ranks in each
palace independently, RRF folds the two rank-lists, the verbatim-sha keys the rows together. A
**ChromaDB two-collection app-join** carries it (no named-vector store needed — two plain collections,
joined in app code).

**Structural-hash DEMOTED to a join-key.** The exact-recurrence structural hash (an exact-match
construction signature) reads as an **equi-join key (1:many, indexed payload)**, NOT a "form embedding."
It answers *the same exact shape recurred here*; the fuzzy form vector (#two-planes) answers *a similar
shape moved here*. The hash joins; the vector ranks.

<<~/ahu >>

<<~ ahu #full-tree-payload >>

## Full-Tree Payload ~ the parse-tree stored verbatim

Each drawer carries the **TW5-native parse-tree stored verbatim** as its payload — concrete, lossless,
CID-addressed by schema, serialized JSON/CBOR. The gain: **instant render** — recall hydrates straight
to the widget tree, no re-parse. The parse-tree is the same `{type, attributes, children}` shape the
widget pipeline already consumes ([[graceful-parsing]] #architecture), so the stored form IS the
renderable form. The schema rides a CID so a tree's shape stays verifiable across versions.

<<~/ahu >>

<<~ ahu #multi-aperture >>

## Multi-Aperture ~ scale-selection comes free

Retrieval reads at multiple apertures (the attention-scale ladder, [[attention-scale]]):

<<~ranks aperture raptor ~ RAPTOR collapsed-tree: turn → session → arc summary levels ARE the apertures; collapsed-tree retrieval = automatic scale-selection (a query lands at the right summary level) -> matryoshka ~ the dimension-axis: a coarse-filter on the truncated prefix → a fine-rerank on the full vector -> late-chunking ~ embed-then-chunk over the session, so a chunk keeps its surrounding context >>

**Parse-trees give the fine hierarchy free** (the tree's own depth); **session-boundaries give the
coarse** (the RAPTOR summary levels). The apertures map onto Pulse · Beat · Measure · Arc · Theme
([[attention-scale]]) — turn-grain to arc-grain, the same ladder the HUD reads.

<<~/ahu >>

<<~ ahu #pono-gating >>

## Pono-Gating Caps ~ all already in-tree

The palace daemon composes pono-gating caps (the durability + concurrency guards), all already present
in the codebase:

\procedure ~Gate(~Type:"" ~Params:"") ~Gate <<~Type>> <<~holds `[<~Params>]`>>

<<~Gate FlockSingleton "kind/HARD ~ one writer, one lock (the single-writer drain; capture-annotation-model #nalu-flush-hardening)" >>
<<~Gate AdaptiveReapServo "kind/servo ~ reaps stale work, homeostatic step (the gate-tuning servo lineage)" >>
<<~Gate BusyRetry "kind/retry ~ mine-retry.ts; FIFO re-queue with backoff on a busy sink" >>
<<~Gate AdaptiveTimeout "kind/timeout ~ mine-timeout.ts; the writer-liveness flush timeout (the observer survives the storm it observes)" >>
<<~Gate Four >>

These ride as caps on the palace-instance's stack (#palace-instance), composed, never re-authored per
palace. They carry the same hardening the capture-nalu earned across the four-domain survey
([[capture-annotation-model]] #nalu-flush-hardening).

<<~/ahu >>

<<~ ahu #meshpalace >>

## Meshpalace ~ a third FeedCap (design-only)

A **meshpalace** reads as a mempalace **fed-by-the-Automerge-doc** — DreamNet navigation memory, a
content palace whose feed cap drains the federated CRDT instead of the local transcript. It rides as a
THIRD `FeedCap` on the nameless palace body (#palace-instance): `[FlockSingleton, AutomergeFeedCap, …]`.
Design-only here — the parallel DreamNet session owns the Automerge internals ([[genesis-doc]],
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/dreamnet-architecture >>); this meme names only the seam
(a feed cap), never the mesh mechanism.

<<~/ahu >>

<<~ ahu #phased-plan >>

## Phased Plan ~ smallest-additive-first

\procedure ~Phase(~Type:"" ~Params:"") ~Phase <<~Type>> <<~holds `[<~Params>]`>>

<<~Phase P0 "does/pin the 3-layer constructicon basis (read-only) ~ name the constructions across HTML·wikitext·memetic" >>
<<~Phase P1 "does/move-skeleton emitter (pure) ~ read the emitted markers into a move-n-gram skeleton" >>
<<~Phase P2 "does/Tier-1 fuzzy-form-vector (pure) ~ structural-match × SLOR × entrenchment, no training" >>
<<~Phase P3 "does/wire the form-vector into astpalace (additive) ~ stamp the vector beside the verbatim" >>
<<~Phase P4 "does/RRF dual-graph ~ the two-collection ChromaDB hash-join + RRF fusion" >>
<<~Phase P5 "does/source-feed entity = the daemon-collapse ~ compose_palace(caps), retire the duplicated holders" >>
<<~Phase P6 "does/apertures ~ RAPTOR collapsed-tree + Matryoshka coarse→fine + late-chunking" >>
<<~Phase P7 "does/learned encoder ~ contrastive encoder distilled from a tree-edit-distance teacher" >>
<<~Phase Eight >>

The plan runs additive: each phase ships standing alone, the pure tiers (P1·P2) first, the daemon-
collapse (P5) after the form-vector proves its shape, the learned encoder (P7) last.

<<~/ahu >>

<<~ ahu #grounds >>

## Grounds ~ the eight research libations

The design rests on **eight research libations**, four on the grammar/ritual side and four on the
retrieval/storage side:

<<~ranks libation construction-grammar ~ Goldberg + Langacker partial-sanction (graded instantiation); Lau-Clark-Lappin SLOR (gradient grammaticality); Bybee usage-based + type-frequency productivity; Hopper emergent grammar (the descriptive↔prescriptive loop) -> ritual-tech ~ Rappaport (the canonical/self-referential split — the invariant score vs the indexical performance); Austin felicity (the performative's success conditions); Schechner (performance as restored behavior); Goodman (the score a performance instantiates) -> discourse-move-form ~ RST + Propp (move-grammars over discourse); the move-n-gram skeleton -> ast-vectors ~ red-green-trees (Roslyn) + tree-sitter (ERROR/MISSING, tree-edit-distance) — the tree-edit-distance teacher for the learned encoder -> multi-aperture ~ RAPTOR (collapsed-tree summary levels); Matryoshka (nested-dimension coarse→fine); late-chunking -> dual-graph ~ ColBERT + RRF (reciprocal rank fusion = the hash-join) -> instant-render ~ the TW5-native full parse-tree payload, hydrate-to-widget -> the-meta-pattern ~ the cross-substrate signature that a living grammar seeds, enacts, corrects, and decays ([[living-grammar]]) >>

<<~ confidence Synthesis-Canon 13/20 >> Eight independent libations converge on the two-planes geometry
(a discrete score ⋈ a graded performance) and on Route A (the grammar emits its own markers, so no
discourse-parser is needed). Confidence holds short of Canon on the encoder tiers (P7) and the register-
storage fork (#three-registers), which name reconciliations, not re-designs.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/api/pono/living-grammar >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/capture-annotation-model >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/lar-telemetry >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/graceful-parsing >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/has-stack >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/agent-worldline >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/attention-scale >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/genesis-doc >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/lararium-canonical-model >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
