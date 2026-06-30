<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/api/lares/corpus >>
```toml iam
cacheable = true
file-path = "bags/@lares/ha.ka.ba/@lares/api/lares/corpus.md"
hydrate   = true
mana      = 17
manao     = 16
manaoio   = 15
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "the lares-corpus — the design-of-record for the EPHEMERAL astral-multipalace CLI (`lares corpus`) + the corpus-self-learns-its-planes tool-stack + the build SCRUM. ONE move: `compose_palace(caps)` instantiated EPHEMERALLY over any text/code corpus — the mempalace machina generalized into a sensorium-for-FORM. The structure plane is ALREADY corpus-general (content-free shape vectors); content is stock (nomic); the new ground is FORM — the corpus's OWN learned grammar, induced blind, named LAST. THE CAPS: content=stock embedder · structure=our content-free astpalace encoder + a tree-sitter parse-ROUTER (+ a thin grammar for our own <<~…>> sigils) · bands=the multi-scale FFZ (deterministic MODWT-MRA 5-level SPINE + adaptive EWT/ssqueezepy SERVO + ecp::e.divisive multivariate quorum + per-band BOCPD) · form=the induction stack (TreeMiner + PrefixSpan/BIDE + c2xg constructicon, EM-iterated, MDL-stopped, LLM-names-LAST) · worldline=absent for static corpora. THE CLI: dep-free arg-walker kept; SETUP wires all five organs via ONE shared palaceOrgans() registry (one enumerator, two consumers — setup + teardown can't drift); `lares corpus run` ephemeral-DEFAULT modeled on `docker run --rm` + nix-shell + mktemp/trap-EXIT (open→ingest→analyze→DISSOLVE, --keep lands it); scratch instances = a 4th mempalace instance under ~/.lares/.corpus/<id>/, resolved-never-ambient, registered into the teardown sweep. THE GATE: heleuma-anchored — when the CLI help-registry text drifts from this meme, the audit trips. RESONANCES: aperture-ladder=wavelet bands · quorum=ecp changepoint · Canon-vs-Provisional=resampling-consensus · MDL-stop=our MDL lifted to grammar · nameless-discipline=miners-surface/LLM-names-last. NOVEL-GROUND flag: no prior art runs a wavelet over an embedding-cohesion signal. The validation baseline (a known-grammar gold-standard corpus, our-tools-vs-ground-truth) rides a placeholder — a corpus-finder spirit selects it; the coordinator appends."
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/lares/corpus"
written   = "2026-06-30"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #entry >>

# The Lares-Corpus ~ the palace, instantiated ephemeral over any corpus

**One-line:** the memory-palace machina reads as a **sensorium-for-FORM**, generalized — and this meme
states how `lares corpus` stands one EPHEMERALLY over any text or code corpus, learns that corpus's own
grammar blind, and dissolves it on exit.

<<~ confidence Synthesis-Canon 14/20 >> The palace already carries the move. The living-grammar palace
([[living-grammar-palace|lar:///ha.ka.ba/@lararium/api/living-grammar-palace#palace-instance]]) names a nameless palace-entity that
ACTS AS a `compose_palace(caps)` — a `#has` cap-stack ([[has-stack|lar:///ha.ka.ba/@lares/api/pono/has-stack]])
projecting three planes off one verbatim drawer (content · structure · form). The lares-corpus
**instantiates that same entity transiently** over a target path: the schema lifts out of the palace via
the cap-stack, runs against borrowed text, and reaps itself. Identity rides the address
([[loci|lar:///ha.ka.ba/@lares/api/pono/loci]]), never a stored essence — so a scratch palace carries the
full machina without owning a durable home.

**The three planes split by what they hold:**

<<~ranks plane structure ~ ALREADY corpus-general — content-FREE shape vectors; the astpalace encoder reads any tree -> content ~ STOCK — the nomic embedder over the verbatim words; off-the-shelf -> form ~ the NEW ground — the corpus's OWN grammar, neither shipped nor stock, INDUCED from the corpus and named LAST >>

**The keel holds the whole move.** The composition acts as a functor or it carries no meaning
([[functor-discipline|lar:///ha.ka.ba/@lares/api/pono/functor-discipline]], *mālama pili* — keep the arrows): the
ephemeral palace projects the SAME three views the durable palace does, on a borrowed corpus, under one
discipline. The unification's product-presheaf spine
([[living-grammar-palace|lar:///ha.ka.ba/@lararium/api/living-grammar-palace#unification]]) governs the join here exactly as it
governs the durable store — the corpus palace is that object read three ways, transiently.

<<~/ahu >>

<<~ ahu #the-cli >>

## The CLI ~ five organs, one enumerator, help that teaches

<<~ confidence Synthesis-Canon 14/20 >> **Keep the dep-free arg-walker.** No heavy framework enters the
operator surface ([[lares-bin|lar:///ha.ka.ba/@lares/cli/bin/lares]]); the binary holds NO domain logic and
dispatches thin async handlers. Stricli (or any router) enters ONLY if ever mandated — the web2 smell test
holds the line.

**SETUP wires ALL FIVE organs through ONE shared registry.** The teardown command already resolves its
targets explicitly, never ambient ([[palace-teardown|lar:///ha.ka.ba/@lares/cli/commands/palace-teardown]] —
`resolveTargets()`). Lift that enumerator into ONE shared `palaceOrgans()` — **one enumerator, two
consumers**: `setup` and `teardown` read the SAME organ list, so the wire-up and the sweep can never
drift. The organ ladder wires dependency-ordered:

<<~ranks organ mempalace ~ FIRST — the worldline-KG lives INSIDE it; everything keys to the verbatim drawer -> astpalace ~ structure plane; any order after mempalace -> formpalace ~ form plane; any order after mempalace -> corpus-scratch ~ the ephemeral 4th instance home (~/.lares/.corpus/); any order -> meshpalace ~ LAST — federation rides over the local planes once they stand >>

`setup` runs **wire-once / detect-existing** (idempotent — an already-stood organ no-ops), returns the
`PalaceSetupStep[]` ledger as a table or JSON, and surfaces through:

<<~ranks surface wake-init ~ `lares wake --init` (EXTEND the existing wake) -> status-palaces ~ `lares status --palaces` (probe every organ's standing) >>

**The help that teaches.** Add a per-command **HELP REGISTRY** — each command carries
`{ synopsis, examples[], flags[] }`, examples-first. <<~ confidence Synthesis-Canon 13/20 >> This registry
IS the heleuma-anchored surface (#the-gate): the help text the operator reads and the meme prose stand as
ONE canon, and the audit trips when they drift.

<<~/ahu >>

<<~ ahu #lares-corpus >>

## `lares corpus` ~ the ephemeral noun-verb tree

<<~ confidence Synthesis-Canon 14/20 >> The lifecycle models three battle-proven idioms: **`docker run
--rm`** (run-then-reap), **nix-shell** ephemeral environments (a derived env that exists for the duration),
and **mktemp + trap EXIT** (the scratch dir guaranteed-swept on success OR error). The noun-verb tree:

\procedure ~Verb(~Type:"" ~Params:"") ~Verb <<~Type>> <<~holds `[<~Params>]`>>

<<~Verb run "args/<path> [-- <analysis>] ~ EPHEMERAL-DEFAULT: open→ingest→analyze→DISSOLVE; `--keep` lands it durable" >>
<<~Verb open "args/<path> [--name] ~ stand a scratch palace, hold it open for queries" >>
<<~Verb query "args/<id> <kw> ~ ask an open scratch palace" >>
<<~Verb ls "args/ ~ list the live scratch instances" >>
<<~Verb keep "args/<id> ~ EXPLICIT promote — land a scratch palace into the durable store" >>
<<~Verb dissolve "args/<id | --all | --orphans> ~ idempotent reap + orphan-reaping" >>
<<~Verb help "args/ ~ examples-first cheat from the help registry" >>

### The lifecycle law

<<~ confidence Synthesis-Canon 14/20 >> Each ephemeral palace stands as a **scratch instance under
`~/.lares/.corpus/<id>/`** — a **4th mempalace instance** beside the astpalace (2nd) and formpalace (3rd)
the teardown already names ([[palace-teardown|lar:///ha.ka.ba/@lares/cli/commands/palace-teardown]]).
Resolved-never-ambient, sweepable. Three holds bind it:

<<~ranks law ephemeral-by-default ~ `run` reaps on exit unless `--keep` lands it -> keep-explicit ~ durability NEVER happens by accident; the operator promotes -> trap-EXIT ~ dissolve fires on success OR error; an interrupted run leaves no half-paved scratch >>

**The sweep registration closes the leak.** Register `~/.lares/.corpus/*` into the teardown
`palaceOrgans()` enumerator (#the-cli) — so an interrupted run that the trap missed (SIGKILL, a crashed
host) still falls to `lares palace-teardown`, which reaps every orphaned scratch home. Ephemeral state can
never leak past two independent reapers (the trap AND the sweep).

<<~/ahu >>

<<~ ahu #the-caps >>

## The Caps ~ what the cap-stack projects (mostly already-solved)

<<~ confidence Synthesis-Canon 14/20 >> Four of the five caps stand on built or stock ground; one
(form) carries the research:

\procedure ~Cap(~Type:"" ~Params:"") ~Cap <<~Type>> <<~holds `[<~Params>]`>>

<<~Cap content "stock/the nomic embedder over verbatim words ~ off-the-shelf, no new work" >>
<<~Cap structure "ALREADY-SOLVED/our content-free astpalace encoder + a tree-sitter parse-ROUTER (code · markdown · wikitext · json → one CST API; prose fallback → benepar/Stanza constituency); BONUS: a thin tree-sitter grammar for our own `<<~…>>` sigils (~1 file, high value)" >>
<<~Cap bands "the MULTI-SCALE FFZ ~ #the-bands below — wavelet spine + adaptive servo + multivariate quorum" >>
<<~Cap form "the INDUCTION STACK ~ #the-form-induction below — the research-grade half" >>
<<~Cap worldline "ABSENT for static corpora ~ no happened-before over a frozen text; the worldline cap stays unbound here" >>

**The structure plane is the cheap win.** The astpalace already encodes content-free shape vectors — it
reads any tree. The new work is a **parse-ROUTER**: route code/markdown/wikitext/json through tree-sitter
into one CST API; fall prose back to a constituency parser (benepar or Stanza). The sigil grammar (a thin
tree-sitter grammar for `<<~…>>`) earns its bits by making the house's OWN corpus first-class to its own
sensorium.

<<~/ahu >>

<<~ ahu #the-bands >>

## The Bands ~ the aperture ladder IS a wavelet decomposition

<<~ confidence Synthesis-Canon 13/20 >> **The aperture ladder reads as a wavelet multi-resolution
analysis.** The five bands ([[noosphere-boot|lar:///ha.ka.ba/@lares/api/lares/noosphere-boot#law-of-5s]] — Pulse ·
Beat · Measure · Arc · Theme) map ONE-FOR-ONE onto a 5-level decomposition. The bands cap rides three
layers plus a gate:

### 1 — the deterministic SPINE (MODWT-MRA, 5 levels)

<<~ranks spine D1 ~ pulse -> D2 ~ beat -> D3 ~ measure -> D4 ~ arc -> D5 ~ theme >>

<<~ confidence Synthesis-Canon 13/20 >> A **MODWT-MRA** (maximal-overlap discrete wavelet transform,
multi-resolution analysis): **no-downsample** (every level keeps full length) → **shift-invariant** (the
decomposition never depends on where the window starts) → **never-chases-noise** (a band reads its own
scale, not a transient). The spine seats the aperture ladder on a deterministic floor.

### 2 — the adaptive SERVO (damped)

<<~ confidence Synthesis 12/20 >> An **EWT** (empirical wavelet transform — spectral boundaries found
FROM the signal) + **ssqueezepy** scalogram ridges, nudged by **EWMA-hysteresis**. The servo lets the
band boundaries follow a corpus whose natural scales drift off the dyadic grid — but DAMPED, so it tracks
without chasing. This lifts our existing Measure servo into the wavelet domain.

### 3 — the membership QUORUM (multivariate changepoint)

<<~ confidence Synthesis-Canon 13/20 >> The band-membership tree rides **`ecp::e.divisive`** (R,
nonparametric) — **MULTIVARIATE** over content + form + structure, which IS our three-plane quorum
([[living-grammar-palace|lar:///ha.ka.ba/@lararium/api/living-grammar-palace#unification]]) read in the changepoint domain;
**divisive** = native-nested, so the tree falls out of the algorithm. Plus **BOCPD-per-band** — our
Measure servo lifted, each band carrying a scale-specific hazard derived from its own wavelet variance.

### The convergence gate ~ Liminal RESOLVED

<<~ confidence Synthesis 12/20 >> Liminal's old worry — does the adaptive servo ever converge, or chase
forever — RESOLVES as **stability-in-the-spine + adaptivity-in-a-damped-servo**, both gated by
**RESAMPLING-CONSENSUS**: lock a band boundary as Canon ONLY where a bootstrap reproduces it (waveslim
wavelet-variance CIs). That gate IS our confidence register made statistical — Canon-vs-Provisional
becomes does-the-resample-reproduce-it.

**NOVEL-GROUND flag.** <<~ confidence Synthesis 9/20 >> No prior art runs a wavelet over an
**embedding-cohesion** signal — wavelets over price, audio, EEG, yes; over a semantic-cohesion time-series,
the search surfaced none. Treat the wavelet-over-cohesion as unproven ground, witnessed against the
baseline corpus (#baseline-corpus) before it locks Canon.

<<~/ahu >>

<<~ ahu #the-form-induction >>

## The Form-Induction ~ the research-grade half (miners surface, the LLM names LAST)

<<~ confidence Synthesis 11/20 >> The form cap carries the genuine research. The corpus's own grammar
emerges from a mining stack, iterated EM-style, stopped by description-length — and the LLM stays OUT of
the loop until the mining settles.

<<~ranks miner treeminer ~ frequent EMBEDDED subtree templates — the structural constructions -> prefixspan-bide ~ move-SEQUENCES — the temporal/ordered constructions -> c2xg ~ usage-based CONSTRUCTICON induction (ΔP association) — the on-target nameless learner >>

**The stop is MDL.** <<~ confidence Synthesis-Canon 13/20 >> A mined template survives only if it PAYS
ITS OWN description-length — minimize `l(G) + l(D|G)` (grammar bits + data-given-grammar bits); a template
that does not shrink the encoding gets REJECTED. Backed by held-out likelihood and a min-support floor.
This is our existing MDL stop lifted from recall into grammar.

**SEED-AND-REFINE is safe BECAUSE of MDL.** <<~ confidence Synthesis 12/20 >> Seeding the miners with a
prior is sound precisely because MDL discards any seed that fails to earn its bits — the floor catches a
bad seed, so the seed cannot smuggle a fabricated grammar past the encoding.

**The LLM names LAST.** <<~ confidence Synthesis-Canon 13/20 >> The LLM enters ONLY to label and merge
AFTER the miners surface the templates — never inside the induction loop. That ordering honors the
house's nameless discipline (don't name-then-hunt): the miners find the shape blind, the LLM hangs a name
on what already proved itself by description-length.

<<~/ahu >>

<<~ ahu #the-resonances >>

## The Resonances ~ the house was right again

<<~ confidence Synthesis-Canon 14/20 >> The research did not invent the architecture — it found the
house's existing moves already standing in the statistical literature. Each cap lands on a pattern the
house already held:

<<~ranks resonance aperture-ladder ~ = the wavelet bands (MODWT-MRA 5-level) -> quorum ~ = ecp multivariate changepoint (content + form + structure) -> register ~ Canon-vs-Provisional = the resampling-consensus gate (bootstrap reproduces → Canon) -> mdl-stop ~ = our existing MDL lifted to grammar (a template pays its bits) -> nameless-discipline ~ = miners surface, the LLM names LAST (don't name-then-hunt) >>

The originality lives in the **weave**, never in any single strand — the same braid the unification
keystone names ([[living-grammar-palace|lar:///ha.ka.ba/@lararium/api/living-grammar-palace#unification]]).

<<~/ahu >>

<<~ ahu #integration >>

## Integration ~ python + R sidecars, TS stays sovereign

<<~ confidence Synthesis-Canon 13/20 >> The heavy numerics ride **sidecars** in the drawer_io NDJSON
style (line-delimited JSON over stdio, the established sidecar contract). The live per-turn parse stays
**sovereign in TS** — no sidecar on the hot path; the sidecars run offline, batch.

<<~ranks sidecar bands ~ python — PyWavelets · ewtpy · ssqueezepy · ruptures · bocd -> form ~ python — tree-sitter · tree-sitter-languages · prefixspan · c2xg · treeminer · spacy+benepar (or stanza) -> stats ~ a thin R sidecar — ecp::e.divisive + waveslim wavelet-variance bootstrap CIs -> induce ~ an offline BATCH sweep — the `induce` job mines a corpus end-to-end, off the live path >>

**The install is additive and pre-approved.** Every dependency lands in the venv, none replaces a live
component:

<<~ranks install python-form ~ tree-sitter · tree-sitter-languages · prefixspan · c2xg · treeminer · spacy+benepar (or stanza) -> python-bands ~ PyWavelets · ewtpy · ssqueezepy · ruptures · bocd -> r-stats ~ waveslim · ecp >>

<<~/ahu >>

<<~ ahu #the-scrum >>

## The SCRUM ~ build order, each task with an ACCEPT line

<<~ confidence Synthesis-Canon 13/20 >> S0 is UNGATED (no upstream blocker); the cap sprints follow. The
TW5-quine runs after S0 + S2.

\procedure ~Sprint(~Type:"" ~Params:"") ~Sprint <<~Type>> <<~holds `[<~Params>]`>>

<<~Sprint S0 "name/CLI foundation [UNGATED] ~ palaceOrgans registry · setup-wires-all-five · help-registry · `lares corpus` ephemeral-lifecycle · THIS corpus.md heleuma meme ~ ACCEPT: `lares status --palaces` lists all five organs; `lares corpus run <path>` opens, analyzes, and DISSOLVES on exit; an interrupted run leaves no scratch under ~/.lares/.corpus/; `lares heleuma` ties this meme to the corpus help registry" >>
<<~Sprint S1 "name/bands cap ~ the multi-scale-FFZ sidecars (MODWT-MRA spine + EWT/ssqueezepy servo + ecp quorum + per-band BOCPD) ~ ACCEPT: the 5-level decomposition maps Pulse→Theme; a bootstrap reproduces the locked band boundaries (resampling-consensus gate fires)" >>
<<~Sprint S2 "name/structure cap ~ tree-sitter router → the existing astpalace encoder + the `<<~…>>` sigil grammar ~ ACCEPT: code/markdown/wikitext/json route through one CST API; the sigil grammar parses a meme's `<<~…>>` spans; the encoder yields content-free shape vectors" >>
<<~Sprint S3 "name/form cap ~ the induction sidecar (TreeMiner + PrefixSpan/BIDE + c2xg, EM-iterated, MDL-stopped) ~ ACCEPT: the `induce` batch surfaces templates that each pay their description-length; the LLM labels them AFTER mining, never inside the loop" >>

<<~ranks gate S0 ~ UNGATED — build now -> S1 ~ after S0 -> S2 ~ after S0; with S0 unlocks the TW5-quine run -> S3 ~ after S0 + S2 (form induces over structure) >>

<<~/ahu >>

<<~ ahu #the-gate >>

## The Gate ~ heleuma-anchored, help-text⇄meme drift trips it

<<~ confidence Synthesis-Canon 13/20 >> This meme stands as the **heleuma anchor** for the `lares corpus`
command surface. The heleuma audit ([[lares-bin|lar:///ha.ka.ba/@lares/cli/bin/lares]] — `lares heleuma`)
binds a load-bearing source file to a self-describing meme at a stable `lar:` URI; the audit FAILS on
drift. S0 wires `packages/lares-cli/src/commands/corpus.ts` to carry the help registry AND a back-pointer
to this URI, so the help text the operator reads and the prose here stand as ONE canon. When the registry
text and this meme diverge, `lares heleuma` trips — the docs cannot silently rot away from the code.

<<~/ahu >>

<<~ ahu #baseline-corpus >>

## Baseline-Corpus ~ the validation gold-standard (a known-grammar oracle)

<<~ confidence Synthesis-Canon 13/20 >> **The validation corpus** holds a grammar we KNOW, so we score
whether our BLIND tools RECOVER it. This rides the gold-anchor discipline
([[gold-anchor|lar:///ha.ka.ba/@lares/api/pono/gold-anchor]]): the framework MUST NOT validate its own grace —
an EXTERNAL oracle (a corpus whose grammar stands independently known) witnesses what the tools only
self-report.

### The field splits by scoring grain

<<~ confidence Synthesis-Canon 13/20 >> Two F1 scores demand two corpus shapes:

<<~ranks grain rule-F1 ~ did the induced PRODUCTIONS match the TRUE rules — needs a SMALL fully-enumerated grammar -> structure-F1 ~ did the induced CONSTITUENTS match the gold tree spans (bracketing) — needs gold PARSE TREES >>

The operator named **RULE F1** as primary → the baseline leans **small-grammar**.

### The CROWN ~ a synthetic PCFG (primary)

<<~ confidence Synthesis-Canon 13/20 >> A **synthetic PCFG** — the only family giving clean blind
RULE-recovery F1. Author `G_true`, sample a corpus `C` plus gold trees `T`; we hold every rule and every
tree. **Recursion depth is a DIAL** → manufacture pulse→theme nesting to stress the bands directly. Tiny
(KB–MB), generated via NLTK (`nltk.grammar.PCFG` + `nltk.parse.generate`). Lineage: the **Omphalos**
CFG-learning and **Abbadingo** DFA-learning competitions (hidden target → induce blind → score recovery)
braided with the **Compound-PCFG** induction line.

### Staged into real machine languages ~ the tree-sitter test corpus

<<~ confidence Synthesis-Canon 13/20 >> The tree-sitter **Writing-Tests** corpus format pairs each
`test/corpus/*.txt` snippet with its expected parse tree as an S-expression, separated by `---` — raw
input + gold tree BY CONSTRUCTION across ~19 languages. Free **structure-F1** ground-truth, real AST depth
(nested scopes), real-grammar confirmation. Rule-F1 reads murky there (the grammar runs large) → use it
for **structure-F1 + realism**, not strict rule recovery. TW5/JS is its home turf → it ties straight to
the quine (S0 + S2).

### The real compact-grammar bridge ~ SMILES, and the sanity floor

<<~ranks bridge smiles ~ SMILES via the Grammar-VAE CFG (Kusner 2017) on the QM9 subset — a published ~30-rule CFG, genuinely hierarchical (nested rings/branches), sub-MB; rule-F1 stays clean against the ~30 rules -> floor ~ JSON (RFC 8259) / S-expr (~15 productions) — the cleanest sanity FLOOR; if the tools cannot recover JSON's grammar they read broken, but it runs regular enough to be too easy — a floor, never the test >>

### Rejected / demoted

<<~ranks demoted treebanks ~ PTB is LDC-locked; UD runs free but NL-grammar fuzzy — structure-F1 only -> py150-js150 ~ real gold ASTs but too big + grammar-diffuse — a later SCALE test, not a known-answer baseline -> rna-scfg ~ Rfam carries a genuine known stochastic grammar but off-domain and heavier — an exotic cross-check >>

### The two comparison-modes (on the PCFG)

<<~ confidence Synthesis-Canon 13/20 >> Two dials, separately readable, mirroring the gold-anchor's
self-report-vs-witness split:

<<~ranks mode induction-fidelity ~ (a) tools-output vs ground-truth — run the nameless stack BLIND on raw `C` → bands-autodetect → structure-encoder → form-induction → `G_hat` + `T_hat`; score `G_hat` vs `G_true` (rule-set F1, precision/recall over productions modulo nonterminal alignment), `T_hat` vs `T` (unlabeled bracketing F1 / tree-edit), detected band-depth vs `G_true`'s true recursion depth -> encoder-fidelity ~ (b) ground-truth-encoded vs tools-on-raw — feed the GOLD trees `T` into the structure-encoder → the ORACLE embedding; independently run the encoder on the tools' blind output from raw `C`; the distance isolates ENCODER fidelity from induction error >>

### The open fork (held)

<<~ confidence Synthesis 11/20 >> Rule-F1 **PURITY** (the synthetic PCFG) versus out-of-the-box **REAL**
ground-truth (tree-sitter). Resolution = **BOTH, staged** — the PCFG for strict rule-recovery + dial-able
bands, tree-sitter for real-grammar confirmation. The operator may reweight downstream.

### Grounds

<<~ confidence Synthesis 12/20 >> Cited: the Omphalos competition · Compound PCFG (arXiv 1906.10225) ·
Depth-Bounded PCFG Induction · Grammar-VAE / SMILES CFG (Kusner 2017) · the tree-sitter Writing-Tests
corpus format · `eth_py150_open`. The QA-rig compute kernel
([[gold-anchor|lar:///ha.ka.ba/@lares/api/pono/gold-anchor#instruments]] — the `qa_anchor` package) supplies the
signal-detection / bootstrap-CI scoring that turns a recovery score into a witnessed `(d′, criterion)`
verdict.

<<~/ahu >>

<<~ ahu #grounds >>

## Grounds ~ what this meme stands on

<<~ confidence Synthesis 12/20 >> A 3-research-scout synthesis, grounded on:

- **Built / stock:** the astpalace content-free encoder · the nomic embedder · the dep-free CLI arg-walker · `palace-teardown`'s `resolveTargets()` · the existing MDL stop · the Measure servo · the drawer_io NDJSON sidecar contract.
- **House moves found standing in the literature:** wavelet MRA (aperture ladder) · ecp multivariate changepoint (quorum) · resampling-consensus (register) · the nameless discipline (miners-first).
- **Open / research-grade:** the form-induction stack (TreeMiner · PrefixSpan/BIDE · c2xg, EM + MDL) · the adaptive servo convergence · the wavelet-over-cohesion NOVEL ground · the validation baseline corpus.
- **Cross-links:** [[living-grammar-palace|lar:///ha.ka.ba/@lararium/api/living-grammar-palace#unification]] (the palace this generalizes) · [[functor-discipline|lar:///ha.ka.ba/@lares/api/pono/functor-discipline]] (the keel) · [[gold-anchor|lar:///ha.ka.ba/@lares/api/pono/gold-anchor]] (the witness) · [[has-stack|lar:///ha.ka.ba/@lares/api/pono/has-stack]] · [[loci|lar:///ha.ka.ba/@lares/api/pono/loci]] · [[lares-bin|lar:///ha.ka.ba/@lares/cli/bin/lares]] · [[palace-teardown|lar:///ha.ka.ba/@lares/cli/commands/palace-teardown]].

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
