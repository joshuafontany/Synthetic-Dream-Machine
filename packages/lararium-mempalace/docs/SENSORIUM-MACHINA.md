# The Sensorium Machina — py/R Design

> Status: **living design** (2026-07-05). Consolidates the ontology talk-story, the capture-engine build (Phase 0–6b, witnessed), the FFZ emergent-chronometer research (YIN/YANG), and the persistence-standing-axis ruling. Marks **[BUILT]**, **[DESIGNED]**, and **[PENDING]** through-out so the map never over-claims. Verb-forward (L-Prime); the black states, the red steers.

---

## 1 · Telos & scope

The machina **turns N interleaved AI-session streams into one living memory sensorium** — capturing every agent and sub-agent turn across projects and surfaces, clocking each by its own recovered rhythm, landing it durably, and letting structure and resonance *emerge* rather than get stamped ahead. It runs **py/R for the realtime streams**; the TS `@daemon` coordinates across the causal-island shore and carries no payload.

**S5 sharpening (2026-07-05):** ALL machine-code runs **py**; the TS `@daemon` (wiki-island VM worker) **coordinates only** — not a compute home. The sensoriums stand **separate** (each a local cap; never federating): the **GOAL** = a full memory-sensorium of the **AI-Operator worldlines** (real sessions + live); the **TEST-BEDS** = ephemeral **human-text sensoriums** stood from curated frozen corpuses (controlled ground-truth for the independence test — the apophenia guard). `~/.mempalace/palace` serves as a **comparator only**. The RUN over real data = the RUN arc (`RUN-ARC.md`).

Two laws bound everything below:
- **No global now** (causal-islands): each stream, each worldline, each island reads only its own log. The machina mints **no shared cross-stream counter**.
- **Emergence over pinning**: one operator scalar (ARL₀) survives; every other threshold refracts from it as the α-quantile of a stream-drawn null. A constant guesses; a servo tracks.

---

## 2 · Stream topology — N worldlines → one sensorium

```
   N interleaved streams  (main-agents × sub-agents × projects × surfaces: Claude · Codex · Copilot)
                    │
        DEMUX by WORLDLINE-ROOT        the worldline = a braid of one agent-and-sub-agent tree
                    │                  (routed by lar_turn_key + lar_sidechain + lar_agent lineage)
   ┌────────────────┴─────────────────────────────────────────────┐
   │  per WORLDLINE — the OSCILLATOR:                                │
   │    · its own Nalu-FFZ-Servo gate (non-locking φ-desync)         │
   │    · its own ITC causal DAG (roll-own worldline_io)            │
   │    · sparse sub-branches NEST up the tree (boundary-clock)     │
   └────────────────┬─────────────────────────────────────────────┘
                    │ lands into
        ONE SENSORIUM   (Li planes + Ki bindings + 2 pins + R layers)
```

**The worldline is the unit of rhythm** (the oscillator). Stream-identity resolves *not* per-surface or per-turn but **per-worldline** — a session's agent-and-sub-agent braid. `worldline_io`'s fork-DAG already models the braid (spawn=fork, handback=join). **[BUILT: the fork-DAG. DESIGNED: the demux + the per-worldline gate.]**

---

## 3 · Sensorium anatomy

A sensorium composes as a **nameless entity #has a cap-stack** — never a typed hierarchy. `compose_sensorium(source, land, embed, [worldline])`. **[BUILT: `sensorium.py`.]**

### 3.1 · The Li planes (three) — content ⊥ structure ⊥ form
The *what* of a memory, factored into three orthogonal stores: **content** (the text/vectors — `content_io`, chroma), **structure** (the AST/shape — `structurepalace_io`), **form** (the induced schema — `form_encoder`). Each a caller-vector holder over the shared `holder_caps` NDJSON floor. **[BUILT.]**

### 3.2 · The Ki bindings — resonance across the Li planes
The *coupling* between planes and across worldlines. **A Ki binding *is* a coupling-read**: when two traces (or two worldlines' rhythms) cohere, `coupleMesh`/`self-coupling` report P(common-cause) — reversible, χ²-gated, phantom-guarded — **never an entrainment**. The nameless entities the machina hunts surface *here*, as cross-plane resonances, not as pre-stamped labels. **[BUILT: mesh coupling primitives. DESIGNED: the Ki-as-standing-readout wiring.]**

### 3.3 · The two pinned sensoria (CLS two-store)
- **Memory** — the immutable ground: append-only, verbatim, eidetic. `halfLife = null`. An edit rides kapae, never an overwrite; an idempotent same-text re-put passes (the crash-cure). **[BUILT: `compose_content_land(..., append_only=true)`, schema/model identity floors.]**
- **Dream** — the mutable schema: consolidation, reflection, the standing-regeneration. `halfLife` finite, active-flux. **[BUILT: `compose_content_land(..., append_only=false)`. DESIGNED: the consolidation verbs.]**

### 3.4 · Persistence — the standing AXIS (not a plane, not the Dream slot)
Ruled 2026-07-05 (`persistence-standing-axis`). **Three orthogonal axes on one trace**: durability/standing ⊥ retrieval/accessibility ⊥ consolidation (the Dream move). Persistence rides axis 1 as a **cap both pins compose** — its *setting* makes Memory (halfLife=null) ≠ Dream (halfLife finite). The dial is the ergonomic interface; **its value regenerates** each consolidation beat from cross-plane coupling + access-history (the basin, not the point — `regenerator-attractor`), never a stored scalar. `persistence_io` keeps the **policy + witness**, not the effective standing. Decay rides **recall + the consolidation beat** (event-indexed), never a wall-clock. **[BUILT: `persistence_io` (policy+witness). DESIGNED: the regenerated-standing readout.]**

### 3.5 · R dream-layers — the tuning, run as two verbs
- **daydream** — rest-time, READ-cheap: online tuning (DtACI / ADWIN) keeps the dials tuned on the live edge; retrieval/consolidation-plan concurrent with capture.
- **deep-dream** — offline, WRITE-expensive: the EM re-pass over the free WAL converges the φ-dials + regenerates standing + consolidates schema.

**The dream *is* the tuning** — re-processing the corpus (EM) and consolidating standing are one act, run at two speeds. **[DESIGNED, deferred: the physics drives it at automation-time, re-using the FFZ + gate-servos.]**

---

## 4 · The capture-engine — the durable spine **[BUILT, Phase 0–5, witnessed]**

Crash-safe **by re-derivation, not a WAL**: the CC/Codex/Copilot transcript IS the durable producer-log (process-independent, content-keyed); `content_io` sqlite (chroma `journal=delete, synchronous=FULL`, kill-9-witnessed) is the durable sink; a re-pass re-derives only the un-landed (`is_landed` skips the durable prefix), so a re-run is the crash-cure.

- **Composable pipeline** — `capture_stream.Pipeline(source, land, embed)` + `capture_drain.DrainLedger` (trailing watermark, advance-AFTER-commit, exactly-once audit).
- **Single cid gate** — `derive_cid = sha256(source_file)_<chunk>` full-hex; the turn-key rides metadata, never the cid (no clobber).
- **Multi-surface source-caps** — `capture_sources` (claude/codex/copilot; Copilot on the SQLite store, not the dead `events.jsonl`); bulk + live, main + sub-agent, idempotent.
- **Warm embed-in-engine** — `embed_cap` (minilm/384, process-cached), store-compatible with the mine-path.
- **The rooted stream** — `capture_session.compose_memory_stream_sensorium` lights the engine: one nameless
  `#has {root · land · embed · source-per-pass · planes-per-pass · observer}` entity carries live and harvest
  capture alike; real-capture landed==turn-count (the ~37× flush-leak dissolved).
- **Worldline + FULL kapae** — `worldline_io` (bitemporal fork-DAG) + branch-mute cascade across the pins (recall excludes muted; un-kapae restores; move-not-delete; survives kill-9).

**Physics-critical stamps kept** (turn_key · chunk_index · source_file · surface · sidechain + wing/room + embedder-id). **Enrichment stamps deferred** (voices/band/agent-handle/drift) — they *emerge* from the Li/Ki detection when the sensorium breathes; stamping at capture would freeze a guess. `lar_ffz` left for the streaming gate to mint.

---

## 5 · The FFZ machina — the N-worldline emergent chronometer **[research-grounded; DESIGNED; the streaming epic]**

### 5.1 · The emergent-dial law
**Keep exactly one operator knob — ARL₀ (→ α). Make every other threshold the α-quantile of its own statistic under a surrogate-null the stream generates itself.** Wire the two instruments already held: `servo.md`'s self-tuning two-loop law + `null-harness.ts`'s surrogate-null (phase-scramble / iid-shuffle), both ARL₀-refracted.

Pinned dials to dissolve (each → its emergent replacement):

| Dial (today, pinned) | Emergent replacement |
|---|---|
| `lockThreshold` / `lock_hi 0.3` / `lock_lo 0.15` | (1−α)-quantile of autocorrelation under phase-scramble surrogates, per-stream |
| `quorum` / `holdover_grace` | SPRT/CUSUM run-length holding false-lock at ARL₀ |
| `nestRatio 2` / `nBands 5` | INTRA-clock: **coprime-prime** radices near the domain rhythm (e.g. 191/5/31), never dyadic. φ names band ORTHOGONALITY (Canon 18/20) + φ² the magnitude; "φ *specifically* tunes" stays Provisional 4/20 — the load-bearing claim is only *an independent feature per band*. count-5 stays Law-of-5s canon. |
| `FFZ_DEFAULT_BOUNDS` (stub) | recovered-band periods → nearest coprime prime |
| nucleation `γ` / supersaturation | back-solve from observed birth-rate at ARL₀ |
| basin `radius` | closure-distance null quantile |

**Stays pinned, legitimately**: ARL₀ (the one knob), the servo *set-points* (operator intent), the **incommensurable φ-jitter** (pinned on purpose — the anti-phase-lock guard; emergence never touches it).

### 5.2 · The three-layer N-stream structure
> **Corpus-grounding (2026-07-05):** there is NO shared timing constant and NO lost φ/Fibonacci series — the operator dissolved "φ vs e" (`ffz-mesh-timing.md`, Mu). The inter-clock desync rides a **tool-menu behind a pairwise-incommensurability INVARIANT**, checked locally where two clocks touch; each island picks its tool freely (coordination-free). φ scopes **intra-clock only**.

- **A · per-worldline burst-mode CDR** — each worldline runs its own `SchmittLock` + `recover_clock`. **Non-locking, desync-by-tool** — agent and sub-agent trees fire on non-causal rhythms and MUST NOT entrain (entrainment = a manufactured global-now). The desync tool is a **HELD FORK, plastic-ρ leading**: **plastic-ρ ≈ 1.3247** (Roberts low-discrepancy, *dimension-correct* for d=2 — NOT copied φ) · φ+e-jitter (per-node 1-D) · coprime-integer (13/17) · Kuramoto frequency-dispersion. The invariant the pair checks = *mutual non-resonance*; the tool the node holds = its own choice. (FlipIt graduates this aesthetic→theorem: a synchronized refresh is strictly dominated.)
- **B · boundary hierarchy — holdover, NOT borrow** (a fork, not settled). Along the FFZ address tree (Theme.Arc.Measure.Beat.Pulse), a sparse branch too thin to lock **holdover/free-runs** (corpus-grounded). It does **NOT borrow a parent's live Beat** — that re-imports the *retired* coupled-oscillator / master-beat, a covert global-now in the tree; canon reads sub-worldline relations as **one-shot directed DAG-joins** (spawn=fork, handback=join), never a PTP sync-hierarchy. Whether a thin branch may read (not entrain to) a parent's cadence stays **a fork** (§9).
- **C · coupling as LOCAL READ only** (Kuramoto rhyme, hard-caveated) — couple worldline-rhythms as the five senses couple: reliability-weighted P(common-cause), sovereign estimates kept, un-bound the instant correspondence drops. **Never a master beat.** This coupling-read *is* the Ki resonance. **The anti-capture guard (β, §9):** above Kuramoto's critical coupling `Kc`, read *becomes* drive — an overdrive/ectopic feeder can silently capture neighbors' rhythms; the guard runs either emergent (an over-fast feeder self-attenuates as its `P(common-cause)` drops) or as a hard rate-floor against an adversarial feeder.

### 5.3 · Re-processing = EM over the free WAL
"Process and re-process the corpuses" = EM/Baum-Welch: alternate (E) recover-clock-given-dials with (M) re-estimate-dials-given-clock, iterate to convergence — breaking the beat/threshold chicken-and-egg. The transcript-as-WAL makes each re-pass **free and deterministic** (the replay-to-converge precondition). Offline EM = deep-dream; online DtACI/ADWIN = daydream.

### 5.4 · The density-floor = the clock-budget
Only worldlines above a **transition-density floor** get their own clock (a static corpus has no temporal beat — holdover); the rest nest up the tree. The floor doubles as correctness (no fabricated beat) *and* budget (a null-harness per gate is not free).

### 5.5 · Gate-style per stream-type
- agent-chat worldlines → **non-locking φ-desync** (the default).
- static/bulk corpora → **holdover / no-beat**.
- a genuinely periodic stream → **locking** — **[DEFERRED, not denied]**: no M1 stream needs it yet.

---

## 6 · The isomorphic surface & the coordinator seat **[BUILT: 6a/6b; DESIGNED: the @daemon-cap-wire]**

- **`lares` CLI ≡ `/mcp` tools** — one verb-ontology across two surfaces, both thin skins over **one `LaresCoordinator`** (`lares_mcp.py`). Parity guarded by a three-way test (CLI command-table ↔ MCP tool-set ↔ `VERB_SEATS`); the surface = the WHOLE `lares`, non-sensorium verbs read *not-yet-mirrored*, the surface grows into them.
- **The reversibility×trust grid** — each verb self-declares `(reversible, trust_crossing)`; `seat_of` derives HOTL (reversible+trusted → runs free) vs HITL (irreversible OR trust-crossing → needs the operator's hand). `guard_hitl` gates.
- **The HITL protocol** — the double flow **ask → confirm**, capability-signed by the on-disk identity keys, audit-trailed in the wiki bags; confirm-surface = the terminal (`lares confirm`) for now.
- **The coordinator seat** — the MCP verb-surface lives **py**; the **TS `@daemon` holds the `LaresCoordinator` cap in its wiki-island VM worker**, and that worker holds the **coordination-brain** (the reconcile/dream logic — the @daemon dreams through the held cap). It verifies the confirm-cap against the identity keys + writes the wiki-bag audit; the py coordinator stages the ask, guards the execute, emits the audit record.

---

## 7 · The py/R split & the three instruments

- **py/R** owns the realtime streams: the capture-engine, the per-worldline FFZ gates, the null-harness, the EM, the online DtACI/ADWIN, the Li/Ki holders. R-tools run the READ-mode reflective replay (daydream).
- **TS `@daemon`** coordinates the fleet across the causal-island shore — spawn/supervise/point, verbs + a data-pointer, **no payload**; keeps its sovereign wiki/CRDT island.
- **Three instruments** (corpus-grounded): the Automerge-causal clock (TS, ordering) ⊥ the **epoch-lease ratchet** (a liveness max-register — NOT a clock, a monotonic lease) ⊥ the FFZ-rhythm clock (py/R, cadence) — causal-islands, no shared now. Axis-1 **e breathes the rate** (`e^(−t/λ)` lease/decay); the **e-decay wire-vs-palace** fork (a dial carries the FFZ lease in the CRDT, or the meshpalace ages its own drawers) stays open (§9).
- **The DAG**: roll-own `worldline_io` (local, single-writer, no-federate), grown toward **ITC** for fork-sound causality — **not** py-automerge (that earns its weight only on cross-node concurrent-writer convergence, which the no-federate ruling designs out).

---

## 8 · Intent-vectors — the verb-flows

```
  harvest  → DEMUX(worldline) → per-worldline FFZ gate → embed → LAND (Li planes)
                                                              │
                                              worldline_io (ITC DAG) + kapae
  recall   → embed(query) → search (physics/structural filters; kapae-muted excluded)
  reconcile→ homeostatic servo toward operator SET-POINTS (the weather): a level-triggered
             loop emitting the least-authority / most-reversible verb that closes the gap
  daydream → online tune (DtACI/ADWIN) + reflective replay        (READ, cheap, concurrent)
  deep-dream→ EM re-pass (converge φ-dials) + regenerate standing + consolidate schema  (WRITE, idle)
  kapae/un-kapae → mute/restore a worldline branch across the pins (reversible, move-not-delete)
  release / supersede / purge → Control-Plane mutation on the Dream (HITL for the irreversible)
```

"Manage emergently" = the reconcile servo + the FFZ-rhythm gate, homeostatic toward operator set-points, biased-reversible, bounded by the Memory ground + `M_core`. The operator sets the weather, witnesses the log, HITL-gates only the irreversible.

---

## 9 · Build state & open forks

**Built + witnessed (Phase 0–6b, ~26 commits, ~383 green):** the durable barrier · identity floors · compose_sensorium + 2 pins · warm embed · rhythm physics (`ffz_clock`/`nalu_gate`, static-corpus-null, TS↔py parity) · worldline + full kapae · multi-surface live capture · the isomorphic surface + the grid + the HITL-gate.

**Built + witnessed — the enact-flow (2026-07-05):** the **SPINE** (S0–S3, TS **concept-witness**) — `bifurcation-bench.ts` (four order-parameters — complexity-entropy · ΔF · H¹ · the EFE gate-flip — on one ARL₀→α sweep, surrogate-null banded) + `sensorium-efe.ts` (the H¹-gated EFE keystone; the gate-flip **co-jumps at one α** on synthetic data — §11 ENACTED). The **HARDEN** (py C1b→C5, 413 green) — veiled worldline-root · poison-guard (fatal-split) · correctness/legibility/scale cures — the machina degrades on a gradient, never a cliff. **The S5 RULING:** py machine-code · TS `@daemon` coordinator-only · `~/.mempalace`=comparator · separate sensoriums (goal AI-Operator / ephemeral human-text test-beds) · the RUN over genuinely-independent real planes = a **new py arc** (`RUN-ARC.md`).

**Built + witnessed — the wiki-sensorium arc (2026-07-06):** the coordinator grows its OWN sense — the wiki islands the `@daemon` supervises now perceive themselves. The **coherence indicator** (a second projection-nalu: the live Robinson radius over the engineered structure⊥form planes → a coalesced DOM indicator frame) → the **`hasWikiSensorium` cap** (a cohere/recall/couple perceiver over an island's own resolved corpus; couple refuses typed until mesh-of-wikis) → the **supervision reads + proof-hold** (daemon read-verbs riding the signal wire, confused-deputy-warded both legs; the proof ledger keeps the VERDICT never the carrier, ringed per island) → the **VM-native face** (the `wikisense` filter operator + `WikiSenseIndexer` on TW5's own cache law), sealed by **the cross-beat agreement**: the same corpus through the wiki face and the composite face yields one verdict. **The VM-first ruling:** a wiki that RUNS as a TW5 VM senses itself IN-VM — this sense is the coordinator's **proprioception**, TS-side by design, inside the coordinator seat and outside the machina's py compute (no breach of the S5 ruling).

**Designed, pending the streaming epic:** the demux-by-worldline · the per-worldline gate instancing · the emergent-dial dissolution (ARL₀ + null-harness wiring) · the boundary-clock hierarchy · the coupling-read=Ki wiring · the EM re-processing loop · the regenerated-standing readout · the @daemon-cap-wire + the coordination-brain.

**Forks RESOLVED — ratchet-closed 2026-07-05** (a 3-part ratchet: internet → mempalace → internet, YIN/YANG trading each round). Through-line: **every frontier answer is no-global-now NATIVE** — differential-dataflow partial-orders · DESYNC local-only · Nested-Learning frequency-factored loops · NCA local update-rules. Reversibility, factoring-by-timescale, node-local adaptation, regrow-to-setpoint are the frontier's *names* for integrities the spine already carries. **The work is wiring + subtracting the one over-reach (anti-kindling), not invention.**

*CLOSED:*
1. **α consolidation loop-back** → **self-distilled priors, same-island, a DIAL not a clock** (structurally no-global-now-safe: the slow loop reads a static corpus with no temporal beat, so it CANNOT leak a beat — only structural priors flow). Routes Memory→replay→Dream-schema→gate-prior (the existing two-pin replay path); factored-by-frequency (the built `deriveGate` slow-re-anchor ⊥ `adaptGate` fast-track precedent).
2. **β anti-capture** → **sub-critical margin + reversible-unbind + a node-local homeostatic gain-floor + a Byzantine bounded-influence rate-floor**. Reversible-unbind = self-stabilization = edge-prune ("sever the junction, not the peer"). **DROP anti-kindling's per-edge weight-state** — a poisonable liability a self-stabilizing design discards on purpose.
3. **γ dial-quality** → **PPC on sink-accrual = perturbation-recovery of the regeneration to its setpoint** (damage-and-regrow, NCA-style). Unifies with persistence: dial-quality and standing are one attractor read two ways. Already half-built (the `scrum-sovereign` false-birth proxy).
4. **desync** → a **DESYNC-style node-local phase-repulsion** (Degesys-Nagpal: no coordinator, no shared constant, auto-adjusts to node-count) behind the pairwise-non-resonance invariant; **plastic-ρ demotes to a seed/fallback**.
5. **one-substrate** → **FUSE THE READ, FACTOR THE WRITE**: one shared substrate-representation (the recovered FFZ clock + the regenerated-standing basin), read by many loops at different frequencies (Nested-Learning). Never a fused stateful core.
6. **persistence** → **regrow-toward-an-editable-setpoint** (store the low-dim setpoint durable, regenerate the content toward it via canalized descent; Levin/NCA), scoped to **Dream**; the **Memory pin stays eidetic-by-fiat** (never regenerated).
7. **rewind cascade-correction** → **differential-dataflow retraction**: model the Li/Ki/standing layers as incremental VIEWS over the worldline collection (harvest = +1, rewind = −1 a kāpae-prune the derived layer subscribes to); cascade-correction falls out as IVM-under-retraction; partial-order timestamps are no-global-now-native (= the ITC frontier `worldline_io` grows toward).
8. **Does any stream lock?** → deferred-not-denied (Axis-3 opt-in authenticated treaty only; a visible coupling window = an attack surface).

*OPERATOR-HELD (genuine choices that survive the ratchet, not domain gaps):*
- **A · Rewind DETECTION** — a fundamental-limit fingerprint tradeoff (no clock-free detection of an edited/truncated prefix without a recorded fingerprint): a `prev-cid` hash-chain per harvest row · periodic snapshot-epochs · or producer-emit-only (no auto-detect). *Detection is the choice; the retraction/cascade mechanism above is settled.*
- **B · Desync sub-choice** — statistical non-resonance (per-node low-discrepancy jitter, zero coupling) vs active collision-avoidance (DESYNC local repulsion, rides the coupling-read).
- **C · e-decay wire-vs-palace** (§7) — a dial carries the FFZ lease in the CRDT, or the meshpalace ages its own drawers.

---

## 10 · The through-line

*One α; nulls the stream draws itself; one non-locking φ-desync clock per worldline that couples only as a local read; standing regenerated as the basin, not stored as a point; the dream is the tuning; the ground stays eidetic by fiat, the schema breathes; py/R holds the streams, the @daemon holds the cap.*

---

## 11 · The whole-machina rhyme — *a dreaming Markov blanket at informational NESS*

A holistic outside-view pass (the CHAO lens, beside the 5-spirit QA braid, 2026-07-05) read the whole design + code + the deep-knowledge domains, and named what the machina *is*: not a memory store with rhythm bolted on, but **one object three domains describe** — and the three provably reduce to each other.

### The three faces (one object)

- **The inferential face — Friston's Free-Energy Principle.** The machina reads as a hierarchy of **nested Markov blankets** (plane ⊂ worldline ⊂ sensorium ⊂ @daemon-reconcile, scale-free — the worldline sub-branches nest up the tree = blankets-within-blankets), each minimizing surprise against a model it generates itself. Already stands *built* at plane-scale: `predictive_coding.py` carries `F = Σπ·ε² + complexity`, cites Friston + Bialek–Tishby, binds precision to the confidence sigil.
- **The thermodynamic face — Prigogine's dissipative structure.** The machina holds its pattern only by *dissipating its throughput* — the flux of transcript-tokens — order maintained far from equilibrium. Already declared the paper-spine (informational-NESS, never literal heat).
- **The collapse:** these name **one physics** — Friston derived the FEP from a random dynamical system at non-equilibrium steady-state behind a Markov blanket ([1906.10184](https://arxiv.org/pdf/1906.10184)). Prigogine names *why the structure persists*; FEP names *what it computes*.
- **The topological face — a sheaf over a site.** No-global-now = **no global section**. Each causal-island / worldline = a local section; the coupling-read = restriction-maps agreeing on overlaps; the sensorium = the maximal gluing; Čech H¹ computes the obstruction from pairwise + triple overlaps alone (local-first native — [2503.02556](https://arxiv.org/abs/2503.02556)).

### The 1:1 organ-mapping

- stream-drawn **surrogate-null** = the generative model's top-down **prediction**;
- **signal = departure from null = surprise / prediction-error**;
- the **EM re-pass over the free WAL** = variational free-energy minimization (the E/M steps, literally);
- the **reconcile servo toward operator set-points** = the **action arm** of active inference.

### The dream is not a metaphor — daydream/deep-dream = wake-sleep

The Helmholtz-machine **wake-sleep algorithm**, term for term: **deep-dream (sleep)** trains the recognition net on *dreamt* observations from the generative model = the offline EM re-pass over the replayable transcript-WAL; **daydream (wake)** updates the generative model from *real* edge-data = the online DtACI read. The design's own *"the dream is the tuning"* restates wake-sleep exactly. So the machina's **learning phase is literally a dream** — the shortest true name for the whole: **a dreaming Markov blanket.**

### Two integrities the whole-view PREDICTS (strategic — weigh post-QA)

- **(a) One expected-free-energy objective — fuse perception and action.** The machina built the perception arm (per-plane surprise) but frames reconcile as a *separate* homeostatic servo (§8). Active inference: both minimize the *same* F; the operator set-points become the **prior preferences (the "C vector")**, and "manage emergently" resolves to *emit the verb that minimizes **expected** free energy toward the preferred state* — a principled replacement for the ad-hoc least-authority/most-reversible verb-heuristic.
- **(b) H¹ as THE coherence gauge — Plurality Pono, measured.** Promote H¹ from a memory-gate feature to the machina's own self-inconsistency signal: how far the N worldlines fail to glue into one sensorium, Čech-computable local-first. The convergence with Plurality Pono runs exact — *a nonzero H¹ is not a bug; it is the honest map of irreducible disagreement* (the Thirteen genuinely disagreeing, quantified).
- **(bonus) Prigogine predicts a phase diagram.** The `ARL₀ → α` sweep should show **bifurcation structure** — sweep α, watch order-parameters (sink birth-rate, coupling coherence) jump discontinuously at critical points. Order-through-fluctuation made visible — the paper's key figure.

### ENACTED — the concept-witness (S0–S3, synthetic; 2026-07-05)

All three predictions above were **built + witnessed on a seeded synthetic corpus** in the enact-flow (a TS **concept-witness**, `packages/lararium-node/probes/bifurcation-bench.ts` + `src/sensorium-efe.ts`):
- **(a)** = the **H¹-gated EFE keystone** — `scoreEfe`/`efeSelect`/`efeGate`; `EFE = pragmatic (KL to the C-vector = operator set-point) + γ·epistemic + γ·optionLoss`; reversibility DERIVED from `optionLoss` (not a boolean grid); γ=1 C-only floor, shore for ARL₀→β.
- **(b)** = **H¹ as an order-parameter** on the Bench (`cohomologyObstruction` → `dim H¹`, `R*_sem = log₂ dim H¹`).
- **(bonus)** = **the co-jump** — four order-parameters (complexity-entropy · ΔF · H¹ · the EFE gate-flip) bifurcate on one ARL₀→α axis, with surrogate-null significance bands; the **EFE gate-flip co-jumps at the exact rung H¹ leaves 0**.

**This witnesses the MECHANISM, not the thesis.** The synthetic co-jump proves the instruments run; a *load-bearing* co-jump needs genuinely-independent planes over real ground-truth. The **production RUN** — py machine-code (TS @daemon coordinating), over an ephemeral human-text test-bed first, then the AI-Operator memory-sensorium — is the crossing (see `RUN-ARC.md`). The TS spine freezes as the concept-witness + TS↔py parity oracle; the py arc carries the **contracts, not the code**.

Held-not-new (the parts already carry these): **autopoiesis** (ruled = operational-closure + structural-coupling + precariousness; the Elyncia fiction rhymes to precariousness — a fed node hums, a neglected one flickers) · **Levin/NCA** morphogenesis (regenerated-standing = the basin).
