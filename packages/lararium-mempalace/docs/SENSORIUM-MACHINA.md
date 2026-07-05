# The Sensorium Machina — py/R Design

> Status: **living design** (2026-07-05). Consolidates the ontology talk-story, the capture-engine build (Phase 0–6b, witnessed), the FFZ emergent-chronometer research (YIN/YANG), and the persistence-standing-axis ruling. Marks **[BUILT]**, **[DESIGNED]**, and **[PENDING]** through-out so the map never over-claims. Verb-forward (L-Prime); the black states, the red steers.

---

## 1 · Telos & scope

The machina **turns N interleaved AI-session streams into one living memory sensorium** — capturing every agent and sub-agent turn across projects and surfaces, clocking each by its own recovered rhythm, landing it durably, and letting structure and resonance *emerge* rather than get stamped ahead. It runs **py/R for the realtime streams**; the TS `@daemon` coordinates across the causal-island shore and carries no payload.

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
The *what* of a memory, factored into three orthogonal stores: **content** (the text/vectors — `content_io`, chroma), **structure** (the AST/shape — `structurepalace_io`), **form** (the induced schema — `form_encoder`). Each a caller-vector sidecar over the shared `sidecar_caps` NDJSON floor. **[BUILT.]**

### 3.2 · The Ki bindings — resonance across the Li planes
The *coupling* between planes and across worldlines. **A Ki binding *is* a coupling-read**: when two traces (or two worldlines' rhythms) cohere, `coupleMesh`/`self-coupling` report P(common-cause) — reversible, χ²-gated, phantom-guarded — **never an entrainment**. The nameless entities the machina hunts surface *here*, as cross-plane resonances, not as pre-stamped labels. **[BUILT: mesh coupling primitives. DESIGNED: the Ki-as-standing-readout wiring.]**

### 3.3 · The two pinned sensoria (CLS two-store)
- **Memory** — the immutable ground: append-only, verbatim, eidetic. `halfLife = null`. An edit rides kapae, never an overwrite; an idempotent same-text re-put passes (the crash-cure). **[BUILT: `compose_memory_sensorium`, append-only guard, {model,dim}+palace-history identity floors.]**
- **Dream** — the mutable schema: consolidation, reflection, the standing-regeneration. `halfLife` finite, active-flux. **[BUILT: `compose_dream_sensorium` stub. DESIGNED: the consolidation verbs.]**

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
- **The driver** — `capture_session.drive_capture` lit the dark engine: real-capture landed==turn-count (the ~37× flush-leak dissolved).
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

- **py/R** owns the realtime streams: the capture-engine, the per-worldline FFZ gates, the null-harness, the EM, the online DtACI/ADWIN, the Li/Ki sidecars. R-tools run the READ-mode reflective replay (daydream).
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

**Designed, pending the streaming epic:** the demux-by-worldline · the per-worldline gate instancing · the emergent-dial dissolution (ARL₀ + null-harness wiring) · the boundary-clock hierarchy · the coupling-read=Ki wiring · the EM re-processing loop · the regenerated-standing readout · the @daemon-cap-wire + the coordination-brain.

**Open forks (corpus-grounded 2026-07-05; operator-held):**
1. **The inter-clock desync TOOL** (NOT a lost series — the single-constant question was dissolved): **plastic-ρ ≈ 1.3247 leads** (dimension-correct) · φ+e-jitter (per-node 1-D) · coprime-13/17 · Kuramoto-dispersion. The held fork = node×time→plastic-ρ vs per-node-1-D→φ+e-jitter.
2. **α — the consolidation loop-back (does sleep teach waking?)** — deep-dream learns TE-coupling / criticality / converged dials over the slow corpus; the doc wires wake→sleep but no sleep→wake. (a) deep-dream re-seeds the fast gate's priors (true CLS) vs (b) the fast gate stays sovereign, reading the slow findings as advice only (no-global-now purity). *The strongest un-named fork — the literal join of memory-as-dream ⋈ chronometer.*
3. **The boundary hierarchy (§5.2-B)** — holdover-only on a sparse branch (canon-safe) vs may it *read* (never entrain to) a parent's cadence?
4. **β — the anti-capture guard** — emergent self-attenuation (P(common-cause) drops as rhythm diverges) vs a hard rate-floor against an adversarial ectopic feeder.
5. **γ — the EM dial-set quality score** (multi-start can't rank starts without one): ARL₀-hit-rate-vs-shuffle-null *leads* (reuses the calibration harness already designed) · Baum-Welch likelihood · sink-birth-stability.
6. **The rewind-detector gap** — harvest runs append-only with no gone-turn reconciliation; a `worldline_io`/kapae keystone (kapae mutes forward; nothing detects a rewind already past).
7. **Does any stream genuinely lock?** — Axis-3 opt-in authenticated treaty only (deferred-not-denied; a visible coupling window = an attack surface).
8. **Persistence depth** — fully-regenerated standing vs a stored-scalar fallback; retrieval-coupled-vs-hybrid-clock decay turns out **forced** by the temporal/atemporal split (a guest corpus has no beat → decays on recall only), not operator taste.
9. **e-decay wire-vs-palace** (§7).

---

## 10 · The through-line

*One α; nulls the stream draws itself; one non-locking φ-desync clock per worldline that couples only as a local read; standing regenerated as the basin, not stored as a point; the dream is the tuning; the ground stays eidetic by fiat, the schema breathes; py/R holds the streams, the @daemon holds the cap.*
