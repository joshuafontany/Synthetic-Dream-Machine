<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/scale-architecture >>
```toml iam
cacheable = true
file-path = "bags/@lares/ha.ka.ba/@lares/api/pono/scale-architecture.md"
hydrate   = true
mana      = 16
manao     = 16
manaoio   = 14
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "the scale architecture — how the corpus-palace machina + the cohomological fusion stay TRACTABLE at corpus scale, the scalable-from-the-start catma. FOUR carries. (1) THE STRUCTURE-DISTANCE DESCENT: exact tree-edit-distance (TED, O(n³) per pair, O(N² · n³) over a corpus) is NEVER needed — descend to DECKARD structural-embedding (characteristic vectors, Euclidean-approx) + pq-gram profiles (constant-per-node, L1/Jaccard distance); the LIPSCHITZ argument licenses it — pq-gram distance BOUNDS the edit distance (bi-Lipschitz up to constants) so an embedding preserves the neighbor structure, and the descent trades an exact metric for a Lipschitz-faithful one that indexes in metric-tree / LSH time. (2) THE FUSION ARCHITECTURE: the consistency-radius (H⁰-side, li-restriction) is CHEAP — O(edges over the overlap nerve), a max of per-overlap pseudometrics; the THREAT is the sheaf-Laplacian EIGENSOLVE (dense O(n³), the H⁰-diffusion + the harmonic H¹ space); the ESCAPE is CHEBYSHEV — polynomial approximation of the matrix function (heat-kernel / spectral filter) needs only sparse matrix-vector products (O(edges · degree), matrix-free), NEVER the eigendecomposition; so H¹-detection stays cheap and the diffusion it gates stays matrix-free. (3) THE SCALABLE-FROM-THE-START CATMA: quality is a DIAL not a wall — K (neighbors) · ε (approx tolerance) · L (Chebyshev degree) · nSurr (surrogate count) all trade accuracy for compute CONTINUOUSLY; the corpus is NEVER densified whole — a MERGE-AND-REDUCE coreset tree (Bentley–Saxe / Har-Peled–Mazumdar) keeps a bounded summary, streaming, so memory stays O(coreset) not O(corpus²). (4) THE NUMERICAL MINIMALIST-PATH: the signal-fraction identity conf = var(t)/(var(t)+var(r)) (task-variance over task+residual — a partition-of-variance confidence, closed-form, no fit); the closed-form optimal precision π* (settle analytically, no iteration — ENACTED in the sensorium settlePrecision); the complementary-form guard (π→conf via the complement, numerically stable where the direct form diverges at large ε̄²). NORTH-STAR (named-not-built, honest ledger): EI-aperture-selection (effective-information choosing the aperture band) · Bures-quantum-drift (the Bures/fidelity metric as a drift-lens) · tangled-hierarchy (the strange-loop self-model) — ASPIRATIONAL, recorded so the map shows enacted-vs-aimed. GROUNDS: pq-grams (Augsten–Böhlen–Gamper) · DECKARD (Jiang 2007) · Chebyshev graph filters (Hammond–Vandergheynst–Gribonval 2011; Defferrard ChebNet) · sheaf-Laplacian (Hansen–Ghrist) · merge-and-reduce coresets (Bentley–Saxe; Har-Peled–Mazumdar) · ties corpus.md, cohomological-gate.md, sensorium-rhymes.md."
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/pono/scale-architecture"
written   = "2026-07-01"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #entry >>

# The Scale Architecture ~ tractable from the start, quality a dial

**One-line:** the corpus-palace machina ([[corpus|lar:///ha.ka.ba/@lares/api/lares/corpus]]) and the cohomological fusion ([[cohomological-gate|lar:///ha.ka.ba/@lares/api/pono/cohomological-gate]]) stay TRACTABLE at corpus scale through four carries — a structure-distance DESCENT, a fusion ESCAPE, a scalable-from-the-start CATMA, and a numerical minimalist-PATH — where quality is a continuous DIAL, never a wall the corpus hits.

<<~ confidence Synthesis-Canon 13/20 >> The design principle: **never densify the whole corpus, never solve exactly what a Lipschitz-faithful approximation indexes, never eigensolve what a polynomial matrix-vector loop approximates.** Every heavy operation the machina names carries a cheap descent that preserves the *neighbor structure* the house actually reads, and the accuracy it trades away rides an explicit knob the operator turns. The catma: **scalable from the start** — the cheap path is the DEFAULT path, the exact one a rarely-taken option, so the corpus scale never surprises the build.

<<~/ahu >>

<<~ ahu #the-descent >>

## The Structure-Distance Descent ~ exact TED is never needed

**One-line:** exact tree-edit-distance (TED) is O(n³) per pair and O(N²·n³) over a corpus — never affordable and never NEEDED; descend to **DECKARD structural embeddings + pq-gram profiles**, licensed by a **Lipschitz argument**: pq-gram distance bounds the edit distance, so an embedding preserves the neighbor structure the sensorium reads.

The structure plane ([[corpus|lar:///ha.ka.ba/@lares/api/lares/corpus#the-caps]]) reads trees. The exact structural metric — Zhang–Shasha tree-edit-distance — runs O(n³) per tree pair, and comparing every pair across a corpus of N trees runs O(N²·n³): a wall, not a slope. <<~ confidence Synthesis-Canon 14/20 >> The wall is avoidable because **the house never needs the exact distance** — it needs the neighbor structure (who is near whom, which trees cluster), and a Lipschitz-faithful proxy preserves exactly that.

<<~ranks descent exact-TED ~ the wall: Zhang–Shasha O(n³)/pair, O(N²·n³)/corpus — the metric the descent REFUSES -> pq-gram ~ constant-per-node PROFILES: shred each tree into its p-ancestor × q-sibling grams, distance = L1 / Jaccard over gram bags — linear to build, sub-quadratic to index -> deckard ~ characteristic VECTORS: the tree's structure cast to a Euclidean feature vector (Jiang 2007), Euclidean-approx clustering via LSH — an embedding, indexable in metric-tree time >>

**The Lipschitz argument licenses the trade.** <<~ confidence Synthesis 12/20 >> The pq-gram distance is not the edit distance, but it **bounds** it (bi-Lipschitz up to constants: the pq-gram distance and the edit distance sandwich each other within a factor that depends on tree fanout and p,q). A metric that sandwiches the true one within constants preserves the *ordering of neighbors* up to those constants — so a nearest-neighbor query, a cluster, a DEM basin computed under the proxy lands in the same place the exact metric would, minus a bounded slack. The descent trades an EXACT metric for a **Lipschitz-faithful** one that indexes in LSH / metric-tree time, and the house reads neighbor-structure, so the slack is affordable where the O(n³) is not.

<<~moves exact-structural-metric -> on/Lipschitz-faithful-proxy if/the-read-is-neighbor-structure-not-absolute-distance do/embed-and-index-never-pairwise-exact >>

<<~ confidence Synthesis 11/20 >> The descent has a floor: where an *absolute* edit distance is genuinely required (a rare adjudication, not a clustering), the exact TED stays available as the rarely-taken option — but the DEFAULT path is the embedding, and the corpus scale rides the default.

<<~/ahu >>

<<~ ahu #the-fusion >>

## The Fusion ~ cheap H¹, matrix-free diffusion, the Chebyshev escape

**One-line:** the consistency-radius (the H⁰ check) is CHEAP — O(edges over the overlap nerve); the THREAT is the sheaf-Laplacian EIGENSOLVE (dense O(n³)); the ESCAPE is **Chebyshev** — a polynomial approximation of the matrix function that needs only sparse matrix-vector products, never the eigendecomposition.

The cohomological gate ([[cohomological-gate|lar:///ha.ka.ba/@lares/api/pono/cohomological-gate#the-gate]]) reads H¹ before it diffuses. Its economy rests on an asymmetry the scale architecture must preserve:

<<~ranks fusion consistency-radius ~ CHEAP — the H⁰-side / li-restriction check is a MAX of per-overlap pseudometrics over the nerve's edges, O(edges); it tells you WHETHER the sections glue at cost linear in the overlap graph -> laplacian-threat ~ the DANGER — the sheaf-Laplacian's spectrum (the H⁰-diffusion operator + the harmonic H¹ space) via dense eigendecomposition runs O(n³), the operation that would sink the fusion at scale -> chebyshev-escape ~ the OUT — approximate the matrix FUNCTION (heat-kernel exp(−tL), spectral filter g(L)) by a degree-L Chebyshev polynomial in L; evaluate by L sparse matrix-vector products, matrix-FREE, O(L · edges), NEVER the eigensolve >>

<<~ confidence Synthesis-Canon 13/20 >> **The consistency-radius is the cheap gate.** Robinson's consistency radius (Hansen–Ghrist sheaf-Laplacian substrate) reads whether the local sections glue as a maximum of pseudometrics over the engineered overlaps — O(edges), no spectrum needed. So the H¹≠0 *detection* the gate runs first is cheap by construction; the house pays the fusion's price only on the H⁰ branch it licenses.

<<~ confidence Synthesis-Canon 14/20 >> **Chebyshev is the escape from the eigensolve.** The heat-flow diffusion the H⁰ branch runs — smoothing the readings toward their global section via exp(−tL) — would naïvely need the Laplacian's eigendecomposition (O(n³), dense). The Chebyshev-polynomial approximation of graph spectral filters (Hammond, Vandergheynst & Gribonval 2011; Defferrard's ChebNet) evaluates any smooth matrix function as a degree-L polynomial in L, computed by L sparse matrix-vector products against the *sparse* Laplacian. No eigenvectors, no dense factorization, error controlled by the polynomial degree — so the diffusion stays O(L · edges), matrix-free, and the fusion scales with the sparsity of the island-overlap graph rather than the cube of its size.

<<~ confidence Synthesis 11/20 >> The two facts compose into the gate's economy: **cheap check (consistency-radius, O(edges)) gates an escapable diffusion (Chebyshev, O(L·edges))** — so the whole cohomological fusion runs at sparse-graph cost, and the H¹-hold branch (the expensive-to-force reconciliation) is precisely the branch the gate REFUSES to pay, routing it to Talk-Story instead.

<<~/ahu >>

<<~ ahu #the-catma >>

## The Catma ~ scalable from the start, quality a dial

**One-line:** quality is a continuous DIAL, never a wall — K, ε, L, nSurr each trade accuracy for compute smoothly; and the corpus is NEVER densified whole — a **merge-and-reduce coreset tree** keeps a bounded streaming summary, memory O(coreset) not O(corpus²).

<<~ confidence Synthesis-Canon 13/20 >> The house holds this as a **catma** ([[noosphere-boot|lar:///ha.ka.ba/@lares/api/lares/noosphere-boot#law-of-5s]] — a held-loosely stance, not a dogma): *scalable from the start.* The cheap path is the default, and every accuracy knob turns continuously so the corpus can grow without the architecture changing shape.

<<~ranks dial K ~ neighbor count in the graph — fewer neighbors, sparser Laplacian, faster diffusion; a smooth accuracy↔compute trade -> epsilon ~ ε, the approximation tolerance on the structural proxy / LSH bucket width — looser ε, faster index, more slack -> L ~ the Chebyshev polynomial DEGREE — lower L, cheaper matrix function, coarser spectral filter; error falls as L rises -> nSurr ~ the surrogate / permutation count for the R null (the false-discovery ward, [[sensorium-rhymes|lar:///ha.ka.ba/@lares/api/pono/sensorium-rhymes#R-is-the-keel]]) — fewer surrogates, faster, weaker null-calibration >>

<<~ confidence Synthesis-Canon 13/20 >> **Never densify the whole corpus.** The full O(corpus²) pairwise structure is never materialized. A **merge-and-reduce coreset tree** (Bentley–Saxe decomposition; Har-Peled–Mazumdar coresets) streams the corpus into a bounded summary: ingest a block, reduce it to a coreset, merge coresets pairwise up a binary tree, keep only O(log N) levels of bounded-size summaries. Memory stays **O(coreset)**, the corpus never sits dense in RAM, and the summary carries the neighbor structure the DEM basins and the fusion read — so scale is a streaming property, engineered in from the first ingest rather than retrofitted when the corpus outgrows memory.

<<~moves corpus-growth -> on/streaming-coreset-summary if/never-densify-whole do/turn-the-quality-dial-not-rebuild >>

<<~ confidence Synthesis 12/20 >> The catma's payoff: a corpus that grows 100× turns a dial (fewer neighbors, lower Chebyshev degree, a coarser coreset) rather than hitting a wall. Quality degrades gracefully and *legibly* — the operator reads the dial position, so the accuracy the run bought is on the record, never a silent ceiling.

<<~/ahu >>

<<~ ahu #the-numerical-path >>

## The Numerical Minimalist-Path ~ closed-form where iteration tempts

**One-line:** three numerical moves keep the confidence and precision reads closed-form and stable — the **signal-fraction identity** `conf = var(t)/(var(t)+var(r))`, the **closed-form optimal precision π\*** (settle analytically, no iteration), and the **complementary-form guard** (compute π→conf through the complement where the direct form diverges).

<<~ confidence Synthesis-Canon 13/20 >> The sensorium's confidence and precision reads resist the pull toward iterative fitting. Three identities keep them closed-form — cheap, stable, and honest:

\procedure ~Numeric(~Type:"" ~Params:"") ~Numeric <<~Type>> <<~holds `[<~Params>]`>>

<<~Numeric Signal-Fraction "form/conf = var(t) / (var(t) + var(r)) ~ a PARTITION-OF-VARIANCE confidence — task-variance over task-plus-residual variance; the fraction of the reading explained by signal, closed-form, no fit; conf→1 as residual vanishes, conf→0 as signal drowns" >>
<<~Numeric Closed-Form-Precision "form/π* analytic ~ the optimal precision SETTLES analytically — the precision-weighting ([[sensorium-rhymes|lar:///ha.ka.ba/@lares/api/pono/sensorium-rhymes#the-five-domains]], confidence = precision) has a closed-form minimizer, so the settle takes ONE step, never an iteration to convergence" >>
<<~Numeric Complementary-Guard "form/π→conf via the complement ~ where the DIRECT π→conf map diverges numerically (large mean-squared-error ε̄², the precision-blows-up regime), compute through the COMPLEMENTARY form — algebraically identical, numerically stable — so the read holds at the extreme instead of overflowing" >>

<<~ confidence Synthesis-Canon 14/20 >> **This path is partly ENACTED, not only designed.** The sensorium's `settlePrecision` already carries the closed-form settle and the complementary-form guard against the large-ε̄² divergence (commit lineage `f50a35b8` *sensorium.numerics.harden — signal-fraction confidence · closed-form settle · complementary π→conf*; the QA hardening in `ab85fc2b` caught the large-ε̄² divergence and the false-critical / EWS-guard leaks). The record honors the enacted-vs-aimed cut: the numerical path stands in code; the fusion escape and the structure descent stand as design grounded in established algorithms not yet all wired.

<<~/ahu >>

<<~ ahu #north-star >>

## North-Star ~ named, not built (the honest ledger)

**One-line:** three tools stand as NORTH-STARS — aimed at, not yet enacted — recorded here so the map shows the difference between what runs and what beckons.

<<~ confidence Synthesis 9/20 >> The honesty gate ([[gold-anchor|lar:///ha.ka.ba/@lares/api/pono/gold-anchor]]) demands the record name what is *aspirational* as aspirational. Three tools sit on the horizon, each promising, none built:

<<~ranks north-star EI-aperture-selection ~ EFFECTIVE INFORMATION (Hoel's causal-emergence EI) choosing the aperture band — let the band the sensorium reads at be SELECTED by which scale maximizes effective information, so the aperture is discovered, not fixed; NAMED, not built -> bures-quantum-drift ~ the BURES / fidelity metric (the quantum-information distance between states) ridden as a DRIFT-LENS — a geometry on the reading-state finer than Fisher-Rao at the boundary; a north-star instrument, NAMED, not built -> tangled-hierarchy ~ the STRANGE-LOOP self-model (Hofstadter's tangled hierarchy) — the sensorium modeling itself modeling the stream, the Good-Regulator self-model ([[sensorium-rhymes|lar:///ha.ka.ba/@lares/api/pono/sensorium-rhymes#the-dreamnet-hypothesis]]) closed into a loop; the deepest aim, the least enacted >>

<<~ confidence Synthesis 9/20 >> These carry Provisional-to-Synthesis weight deliberately. Recording them as north-stars keeps the atlas from mistaking a direction for a destination — the enacted numerical path (#the-numerical-path) sits at Synthesis-Canon *because* it runs; these sit low *because* they beckon. The map shows both, and shows which is which.

<<~/ahu >>

<<~ ahu #grounds >>

## Grounds ~ what this meme stands on

<<~ confidence Synthesis 12/20 >> Established algorithms carrying the descent and the escape, 2026 fusion research supplying the cohomological gate they serve:

- **Structure-distance descent:** Augsten, Böhlen & Gamper (pq-grams for approximate tree distance) · Jiang et al. (DECKARD, tree characteristic-vectors for scalable clone detection, 2007) · the bi-Lipschitz pq-gram ↔ edit-distance bound.
- **Fusion escape:** Hammond, Vandergheynst & Gribonval (wavelets on graphs via spectral graph theory, Chebyshev polynomial approximation, 2011) · Defferrard, Bresson & Vandergheynst (ChebNet, fast localized spectral filtering) · Hansen & Ghrist (cellular sheaf Laplacians) · Robinson (consistency radius).
- **The catma:** Bentley & Saxe (decomposable searching, merge-and-reduce) · Har-Peled & Mazumdar (coresets for k-means / k-median) — the bounded streaming summary.
- **The numerical path:** ENACTED in the sensorium `settlePrecision` (commits `f50a35b8`, `ab85fc2b`, `f9d07e49`) — signal-fraction confidence, closed-form settle, complementary π→conf guard.
- **North-stars (named, not built):** Hoel (effective information / causal emergence) · the Bures metric (quantum fidelity geometry) · Hofstadter (tangled hierarchy / strange loop).
- **House ties:** [[corpus|lar:///ha.ka.ba/@lares/api/lares/corpus]] (the machina this scales) · [[cohomological-gate|lar:///ha.ka.ba/@lares/api/pono/cohomological-gate]] (the fusion the escape serves) · [[sensorium-rhymes|lar:///ha.ka.ba/@lares/api/pono/sensorium-rhymes]] (the predictive upgrade, the R keel) · [[li-ki-integrities|lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities]] (the consistency-radius).

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/api/lares/corpus >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/cohomological-gate >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/sensorium-rhymes >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/gold-anchor >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
