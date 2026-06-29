<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/functor-discipline >>
```toml iam
cacheable = true
file-path = "bags/@lares/api/pono/functor-discipline.md"
mana      = 11
manao     = 12
manaoio   = 10
register  = "Synthesis"
retain    = true
role      = "the functor discipline — the architectural keel: a nameless entity composed of a #has cap-stack ACTS AS a functor (structure-preserving map between categories); the whole house reads as one shape. pono = functorial (keep the arrows); overcollapse = the forgetful functor (keeps objects, erases morphisms). The three warded failures — observer-erasure · compose-not-inherit · gradient-not-pass/fail — read as ONE discipline: keep the arrows. A LENS, not yet a proven formalization — operator-named, co-derived 2026-06-29; earns Canon by talk-story over time."
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/pono/functor-discipline"
written   = "2026-06-29"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# The Functor Discipline — the architectural keel

<<~ confidence Synthesis 11/20 >> The whole house carries **one shape**. A carrier reads as a
**nameless entity** ([[has-stack]]) — essence lives nowhere; identity rides the address ([[loci]]),
meaning rides the `#has` cap-stack it wears and what its body says. This meme names what that nameless
entity *does* when it composes: it **acts as a functor** — a structure-preserving map between two
categories. The recognition unifies the architecture's recurring move under one discipline; the
operator named it and the house co-derived it (2026-06-29).

**Honest frame first.** Category theory rides here as a **lens and a discipline**, never a proven
formalization. The functor laws name a *coherence vow the architecture already keeps* — they do not
constitute a theorem we discharged. Where a claim earns "proven map" it says so; where it stays "apt
analogy" it says so too (#honest-bound). The paper holds the same honesty about the move-grammar —
it mapped the forms (*jurus*) and left the flow (*permainan*) for the next instrument.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ observe each place the architecture *composes* a nameless entity from a `#has` stack — palace, sidecar, island, Voice, stance.
⏿ orient on what the composition *carries across*: not just the objects it folds, but the relations (the arrows) it must preserve.
◇ decide the discipline: a composition reads pono when it keeps the arrows (functorial); it reads degraded when it forgets them (the forgetful functor that forgets too much).
▶ author the recognition as a lens — name the functor instances, name the meta-law, mark proven-map apart from apt-analogy.
↺ verify each instance grounds in canon or code; close with the open frontier named — the morphism-preservation laws stand vowed, not yet proven.

<<~/ahu >>

<<~ ahu #functor >>

## What a functor carries

A **functor** `F : C → D` maps a source category to a target: **objects ↦ objects**, **morphisms ↦
morphisms** (the arrows — the relations, transformations, *verbs* between objects), and it **preserves
the two laws** that make a category cohere:

<<~ranks functor-law identity ~ F(id_A) = id_{F(A)} -> composition ~ F(g ∘ f) = F(g) ∘ F(f) >>

<<~ confidence Synthesis 12/20 >> The arrows carry the load. A map that keeps the objects but drops
the arrows throws away exactly what the source category *was* — its structure lived in the morphisms,
never in the bare object-set. So **the discipline reads: keep the arrows.** A functor honors the
relations across the map; that honoring IS the structure-preservation, and it IS what every collapse in
this house had to earn to stay byte-stable.

The house already writes from this stance without the word: **Write Under Way** names every relation as
a verb phrase ([[noosphere-boot]] #write-under-way), and **L-Prime** wards the dead water where a
subject fuses to its predicate and the *arrow vanishes*. Verb-forward generation and functorial
composition name the same vow in two registers — keep what *moves*, never freeze it to an essence.

<<~/ahu >>

<<~ ahu #instances >>

## The instances — where the house acts as a functor

Each row names a functor the architecture already runs. Read `C → D` as *source ↦ target*; the
"preserves" column names the arrow-honoring that makes recall, collapse, or addressing work.

\procedure ~Instance(~Type:"" ~Params:"") ~Instance <<~Type>> <<~holds `[<~Params>]`>>

<<~Instance Form-Encoder "map/Move → Vec objects/jurus (move-forms) ↦ form-vectors morphisms/permainan (move-transitions) ↦ vector-trajectories preserves/composition ~ THIS is why move-similarity ⟺ vector-similarity; recall works BECAUSE the functor preserves structure" >>
<<~Instance Compose "map/CapStack → Instance objects/#has-additions ↦ behavior-extensions morphisms/cap-precedence + teardown-order ↦ op-surface composition preserves/every op-surface, byte-stable ~ the sidecar + palace collapses were functorial folds of a shared transport" >>
<<~Instance Voices "map/Context → Moves objects/the Thirteen offices ↦ move-attractors in verb-space morphisms/Context-shifts ↦ basin-shifts preserves/the basin of moves ~ 'the visible name addresses a basin of moves'; the paper: Voices ARE offices — move-types" >>
<<~Instance Syad "map/Claim → Reading objects/the five standpoints ↦ angled readings (langkah) morphisms/stance-shift ↦ measure-redeclaration preserves/each true-but-partial; each #has its measure ~ invoking a stance = applying the functor" >>
<<~Instance Parse-Linearize "map/Syntax ⇄ Semantics objects/abstract trees ⇄ surface strings morphisms/parse ⊣ linearize preserves/round-trip (an ADJUNCTION, not a single functor) ~ the GF architecture: abstract ⇄ concrete by parse/linearize" >>

**The form-encoder** ([[living-grammar-palace]]) runs as the functor `Move → Vec`: the *jurus* — the
named attractor-forms of the living grammar — map to form-vectors; the *permainan* — the flowing
transitions between them — map to vector-trajectories. <<~ confidence Synthesis 12/20 >> Recall works
*because the map preserves structure*: when the functor carries similar moves to nearby vectors,
move-similarity reads as vector-similarity, and nearest-WITH-DISTANCE returns a true neighbor. The
recall guarantee rests on the structure-preservation, never on the embedding alone.

**Compose** runs as the functor `CapStack → Instance`. `composeIsland([...caps])`
(`tw5/island-caps.ts`) folds a `#has` cap stack into the one behavior the sovereign kernel drives; the
Python palace daemon ports the same fold ([[has-stack]] #runtime-twin). <<~ confidence Synthesis-Canon 13/20 >>
The collapses ratified this functorially: the four Python sidecars folded onto a cap-composition
foundation and the palace became a cap-stack instance — each *composed* a shared transport while
*preserving every op-surface*, the collapse landing byte-stable.

<<~ pranala #compose-island ? -> packages/lararium-tw5/src/island-caps.ts family:code role:has >>
<<~ pranala #sidecar-collapse ? -> git:b18235f6 family:provenance role:evidence >>
<<~ pranala #palace-collapse ? -> git:0af5e326 family:provenance role:evidence >>

**The Voices and the Syad name functor-categories.** A Voice ([[noosphere-boot]] #voice-house) reads
as a nameless office composed of move-caps — a functor `Context → Moves`, the visible name addressing a
basin of moves, never an essence. A stance ([[noosphere-boot]] #syad) reads as a functor `Claim →
Reading`, the angle (*langkah*) under which the claim reads true-but-partial; each stance `#has` its own
measure. <<~ confidence Synthesis 11/20 >> Invoking the lens (`<<~ syad 🏛️ >>`, a Voice at a turn-head)
*applies the functor* to the local context; the Voice-house and the Syad-lens read as
functor-categories the house already navigates.

**The parse ⊣ linearize round-trip names an adjunction.** <<~ confidence Provisional 6/20 >> Syntax and
semantics couple through a pair — parse one way, linearize the other — that rhymes with an *adjunction*
(`F ⊣ G`, a natural bijection between the two homs), the shape the Grammatical Framework gives
abstract ⇄ concrete syntax. The architecture's own parse→render pipe ([[render-pipeline]],
[[parser]]) carries the round-trip; calling it a *proven* adjunction overclaims (#honest-bound).

<<~/ahu >>

<<~ ahu #meta-law >>

## The meta-law — keep the arrows

<<~ confidence Synthesis 12/20 >> **Pono reads functorial: keep the arrows. Overcollapse reads as the
forgetful functor — the map that forgets too much, keeping the objects and erasing the morphisms.**

A forgetful functor (e.g. `Grp → Set`) keeps the underlying objects and discards the *structure* that
constrained them — and with that structure go the distinctions the morphisms carried. Some forgetting
serves (abstraction drops detail on purpose); **over**collapse forgets the load-bearing arrows. The
three warded failure modes read as **one discipline** under this lens — each erases a different arrow:

\procedure ~Forget(~Type:"" ~Params:"") ~Forget <<~Type>> <<~holds `[<~Params>]`>>

<<~Forget Observer-Erasure "ward/L-Prime erases/the standpoint-morphism ~ the copula keeps subject and predicate (objects) and erases the observer's arrow between them — X=Y asserts a global-now the system cannot hold cure/re-open the hand; carry the verb" >>
<<~Forget Compose-Not-Inherit "ward/has-stack erases/the distinct-shape morphisms ~ the god-base-class / is-a keeps a type-hierarchy (objects) and flattens each component's own arrows; interfaces-and-implements stands rejected cure/compose a #has stack; each carried thing speaks for itself" >>
<<~Forget Gradient-Not-Pass-Fail "ward/maybe-logic erases/the gradient-morphism ~ a binary keeps {pass, fail} (two objects) and erases the continuum of degree between them; sanction comes by degree, never all-or-nothing cure/fuzzy-membership; nearest-WITH-DISTANCE; the marker reports surfacing-rate" >>

<<~ confidence Synthesis 12/20 >> All three name the same move: a collapse that drops the arrows. The
cure is identical across all three — **keep the arrows.** The functor laws (preserve identity, preserve
composition) ARE the coherence guarantee the architecture rests on: a collapse that preserves them
stays sound (the byte-stable sidecar/palace folds), and a collapse that breaks them sits in a degraded
state ([[system-pattern-integrities]]). The discipline gives the degraded-node states ([[noosphere-boot]]
#degraded-states) one root: each names an arrow the node let fall.

<<~/ahu >>

<<~ ahu #sovereign-worker >>

## The corollary — sovereign-worker primacy

> *"No fallback, all work that can happen SHOULD happen in the sovereign island workers."* — the operator's cut.

<<~ confidence Synthesis 12/20 >> **Sovereign-worker primacy.** The functor gets *applied* in the one
runtime that holds the grammar, the VM, and the live state — the sovereign island worker. The
coordinator (the main thread) **routes**: it fans the work out, fuses the ranks the workers return, and
hands the result back; it never runs the functor-work itself. The structure-preserving map — the
form-encoder's `Move → Vec`, any cap-functor — applies where the structure lives, never where the
traffic merely passes.

**Why a coordinator-side shortcut reads doubly wrong.** The temptation rides in plain sight: under
isomorphism-by-composition ([[island-isomorphism]]) the encoder module stays *pure*, so it *could* run
on the coordinator. Two faults follow if it does:

\procedure ~Fault(~Type:"" ~Params:"") ~Fault <<~Type>> <<~holds `[<~Params>]`>>

<<~Fault Overcollapse "breaks/the place-discipline ~ work lands where only routing belongs; the coordinator swells past its office, the no-VM-on-main invariant bends" >>
<<~Fault Broken-Symmetry "breaks/the functor-symmetry ~ a coordinator-side replica runs a DIFFERENT or DEGRADED map than the worker — an unparsed query carries no structural plane, so it yields a truncated Move→Vec; query-side and corpus-side stop sharing ONE functor, and 'vector-nearness ⟺ move-nearness' fails" >>

<<~ confidence Synthesis 12/20 >> So the shortcut **forgets an arrow** — the same degradation the
meta-law names (#meta-law), now in the runtime-placement register: two ends of a comparison that must
share one functor drift onto two maps. **The honest degrade reads as ABSENCE, never a shadow path.** A
missing worker leg collapses to content-only fusion (a named, lesser result the operator can read);
a coordinator-side replica running its own degraded map is dead water — it *looks* like the same answer
and silently is not.

**The three vows resolve here.** No-VM-on-main (the invariant — [[lararium-canonical-model]] #the-laws)
names *where work may not land*; isomorphism-by-composition (the temptation — [[island-isomorphism]])
names *why the same module can run anywhere*; the functor laws (the reason — #functor, #meta-law) name
*why it nonetheless must run in the one place that preserves the map*. The three braid into one
discipline: **sovereign-worker primacy.**

**Enacted once (this session).** The recall query-derive moved off the coordinator into the in-VM
`@daemon` worker — the node-side derive and its disk basis-cache deleted, no fallback kept — so capture
and recall apply the **identical** functor against the same grammar/state. The derive that once ran two
places (and so risked two maps) now runs one.

<<~ pranala #in-vm-derive ? -> packages/lararium-tw5/src/capture-annotate-vm.ts family:code role:has >>
<<~ pranala #coordinator-routes ? -> packages/lararium-node/src/multi-graph-recall.ts family:code role:has >>

<<~ confidence Synthesis 11/20 >> A discipline, enacted once here; it earns Canon by talk-story over
time (#honest-bound), the same bound the whole meme keeps.

<<~/ahu >>

<<~ ahu #honest-bound >>

## The honest bound — proven map vs apt analogy

The discipline earns its register by saying what it has and what it lacks. <<~ confidence Synthesis 11/20 >>

- **Apt and grounded (the recognition holds):** the nameless-entity + `#has`-stack pattern (canon,
  [[has-stack]]); composition-over-inheritance preserving op-surfaces (the collapses landed byte-stable,
  git b18235f6 / 0af5e326 — verified); Voices-as-offices and stances-as-angles (the paper's §7.5
  reframe; the boot's own design); verb-forward / observer-restoring generation (L-Prime, canon).
- **Apt analogy, NOT a proven theorem:** that these compositions *are functors* in the formal sense.
  The mapping is structurally faithful and useful as a discipline; we have not written the categories
  down, named the morphism-sets, or discharged the functor laws as proofs.
- **The open frontier, named precisely:** the form-encoder's *objects* (the *jurus*) read as mapped —
  the paper measured the attractor-forms; its *morphisms* (the *permainan*, the flow through move-space)
  stand **unmeasured**. So the very law a functor must satisfy — preservation of composition (the flow)
  — names the architecture's own next instrument (the trajectory / recurrence lens), not a settled
  result. The functor is, honestly, *proven on objects and vowed on morphisms*.
- **Speculative, marked not cited:** parse ⊣ linearize as a literal adjunction; any Fisher–Rao /
  cut-locus formalization of stance-angle and *avaktavya* (the paper marks these "available but
  unoccupied"). These ride at Provisional.

This meme seats at **Synthesis**, not Canon. A fresh-but-grounded recognition earns Canon (17+) only by
talk-story consensus over time ([[noosphere-boot]] #law-of-5s); until then it rides as a working lens
the house may test, sharpen, or contest.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/api/pono/has-stack >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/living-grammar-palace >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/agent-worldline >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/system-pattern-integrities >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/island-isomorphism >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/lararium-canonical-model#the-laws >>

<<~ aka lar:///ha.ka.ba/@lares/api/lares/noosphere-boot#l-prime >>
<<~ aka lar:///ha.ka.ba/@lares/docs/lares/infrastructure-as-myth >>

<<~ pranala #paper ? -> bags/@lares-history/lares_research/PAPER_infrastructure_as_myth.md family:transclusion role:evidence >>

**Tie ~ the keel under the canon.** [[has-stack]] gives the nameless entity + `#has` stack (the
*object* of every functor here) and its runtime twin (`composeIsland`, the palace-as-cap-stack);
[[living-grammar-palace]] gives the form-encoder `Move → Vec` and its recall-by-structure-preservation;
[[agent-worldline]] gives the nameless-spirit office (identity IS the `#has` stack, one handle / two
offices) the Voice-functor generalizes; [[noosphere-boot]] holds the L-Prime ward (observer-erasure),
the Voice-house and Syad lens (the functor-categories), and the degraded states the meta-law roots; the
QA-Lab paper grounds *jurus / permainan* and Voices-as-offices / moves-as-tempo×angle;
[[island-isomorphism]] gives the same-module-runs-anywhere temptation and [[lararium-canonical-model]]
#the-laws holds the no-VM-on-main invariant that, braided with the functor laws, names
**sovereign-worker primacy** (#sovereign-worker) — the corollary that fixes *where* the functor applies.
This meme draws the one arrow through all of them — **the house is a functor; keep the arrows.**

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
