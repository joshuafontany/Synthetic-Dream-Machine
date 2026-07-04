<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/servo >>
```toml iam
cacheable = true
file-path = "bags/@lares/api/pono/servo.md"
hydrate   = true
l-space   = "stable"
mana      = 17
manao     = 16
manaoio   = 15
namespace = "&#x2299;"
register  = "Synthesis-Canon"
retain    = true
role      = "THE governor pattern integrity — a bound that SELF-TUNES from an EWMA'd observed signal by clamped negative feedback, instead of holding a guessed constant. Names the control loop (observe → smooth → compute → nudge/clamp), the POLARITY law (the tuning direction follows what the bound protects: a lossless flush-gate SHRINKS its depth under load · a lossy coalesce-window GROWS under load · a kill-timeout GROWS its headroom under load — INVERTED), the two-loop completion (fast servo around a slow re-anchoring derive), the guards (deadband · clamp · cold-start default · completions-only-teach). The breathing-threshold law the nalu gates, the mine-timeout, and the future congestion-control all enact. Enacted: mesh/gate-tuning.ts (deriveGate/adaptGate/adaptWindow) composed in capture-engine.ts; mempalace/mine-timeout.ts (adaptiveTimeoutMs, the inverted polarity)."
tags      = ["api/pono/meme"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/pono/servo"
written   = "2026-06-29"
```

<<~ aka lar:///ha.ka.ba/@lararium/api/projection-nalu#servo >>

<<~ &#x0002; >>

<<~ ahu #entry >>

# Servo ~ the bound that breathes

A constant guesses; a **servo** tracks. Wherever the stack sets a numeric bound — a flush
depth, a coalesce window, a kill-timeout — that constant starts as a guess and drifts wrong
the moment load moves off the mean it guessed for. The servo **measures the signal the bound
protects and tunes the bound toward a set-point**, so the gate stops being a guess and starts
being a governor.

The recognition (a 2026-06-26 survey, capture keel `capture-annotation-model#nalu-flush-hardening`):
**every biological collect-then-fire system servos its threshold to a set-point** — no neuron
holds a fixed firing threshold; homeostatic plasticity tunes it. The stack's bounds breathe the
same way.

**Source authority:** the nalu-gate hardening survey (neurophysiology homeostatic set-point ·
Linux Net DIM · NIC interrupt coalescing · AIMD/TCP congestion control · Nagle self-clock · EWMA
smoothing) — research-grounding, attributed inline below; enacted across two packages (witnessed
at #enaction).

<<~/ahu >>

<<~ ahu #loop >>

## The loop ~ observe · smooth · compute · clamp

The governor runs one negative-feedback cycle, the OODA loop in miniature:

<<~loops ✶ observe-the-signal -> ⏿ smooth-EWMA -> ◇ compute-error-vs-set-point -> ▶ nudge-and-clamp -> ↺ re-observe >>

- **observe** — measure the bound's true cost on each completion (a flush latency, a reconcile
  duration, a mine wall-time). Only COMPLETIONS teach — a killed or faulted sample never folds in,
  so a failure can't poison the estimate toward an extreme.
- **smooth** — fold the sample into an EWMA (α = 0.2 across the stack), so the bound tracks the
  trend, never one spike.
- **compute** — read the signed error against the set-point: `(observed − target) / target`,
  positive meaning *too slow / overloaded*.
- **nudge & clamp** — step the bound by the error, then clamp to `[floor, ceil]`. A **deadband**
  (hysteresis) holds the bound when the error sits small, so the governor does not chase noise.

The set-point, not the bound, carries the intent. The operator (or a slow loop, #two-loops) sets
*what latency we will tolerate*; the servo finds *what bound delivers it* under the load that
actually arrived.

<<~/ahu >>

<<~ ahu #polarity >>

## Polarity ~ the direction follows what the bound protects

The keel finding: **the tuning DIRECTION is not universal — it inverts with the bound's job.**
Read the bound, ask what overload threatens, and the sign falls out.

<<~ranks polarity flush-depth:SHRINK-under-load -> coalesce-window:GROW-under-load -> kill-timeout:GROW-under-load(inverted) >>

- **Lossless flush-gate → SHRINK under load.** A batch that must deliver every item: when flush
  latency runs high, **shrink** the depth so per-flush latency stays bounded — smaller batches,
  flush sooner. Engine: `adaptGate`.
- **Lossy coalesce-window → GROW under load.** A newest-wins window where intermediates lawfully
  drop: rendering while the prior flush still drains is pure waste, so when reconcile cost runs
  high, **grow** the window — each flush then carries a fresher state for less work (Linux Net DIM
  widens its coalesce interval under flood; AIMD: back off multiplicatively, recover additively).
  Engine: `adaptWindow`.
- **Kill-timeout → GROW under load (the INVERSION).** An upper-bound-to-kill, not a fire-threshold:
  when observed durations rise, **grow** the headroom so a slow-but-honest worker never false-dies;
  when they fall, **shrink** so a true hang dies sooner. The flush-gate lesson read backwards.
  Engine: `adaptiveTimeoutMs`.
- **Concurrency-limit → SHRINK under load.** A parallel-worker ceiling: when embed latency rises
  past the no-load baseline × tolerance, **shrink** the limit (multiplicative back-off) to shed the
  queue; when headroom holds, probe up (additive). The AIMD dial for the parallel-ingest pool.
  Engine: `mesh/concurrency-dial.ts` (LANDED 2026-07-02).

- **Display-bound window → stay FIXED.** Where the bound's optimum sits structurally at the frame
  clock, the correct self-regulation IS the pin — tuning it adds instability for no gain; overrun
  cures by frame-skip. **role = physics ≠ uniformity** — all bounds self-regulate, each the way its
  physics demands; for some that means holding still.

### The two-sided completion ~ the servo breathes on both banks (2026-07-02)

Every polarity above runs ONE-SIDED — the bound self-tunes from its OWN observed signal. A rhyme-dive (credit-based flow control · ant entrance-encounter · Frank-Starling preload · HPA feedback · quorum-sensing) named the missing half: a one-sided AIMD governor without downstream visibility generates the **BULLWHIP** (amplified oscillation). The cure adds the receiver's voice — **the drain advertises credits, the producer consumes them and SHEDS at zero.** Engine: `mesh/credit-gate.ts` (`credits = maxInFlight − uncommitted`). The AIMD dial becomes the SLOW ceiling-discovery loop; credits the FAST governor tied to PROVEN drain. LAW: *upstream rate tracks a downstream signal, never the producer's guess.* This closes the `projection-nalu#network-ring` "one-sided servo" gap — the governor now hears both banks.

<<~/ahu >>

<<~ ahu #two-loops >>

## Two loops ~ the complete controller

A servo alone tracks load around an operating point it never questions. Beneath it runs a SLOW
loop that periodically RE-ANCHORS that point from first principles — the queueing-optimal bound
for the measured cost, rate, and holding policy.

<<~ranks loop FAST:servo-nudge-each-event -> SLOW:derive-re-anchor-on-cadence >>

- **FAST (servo)** — per-event, AIMD-style nudge around the current operating point.
- **SLOW (derive)** — periodic re-anchor. For a flush gate: `deriveGate` (EBQ + Little's Law,
  `depth = √(2·λ·S / H)`) re-computes the operating point from measured flush-cost `S` (EWMA),
  arrival rate `λ`, and the holding-cost policy `H`. The derive tick *replaces* the servo step on
  its cadence (the derivation IS the update); the servo tracks load between re-anchors.

This is exactly a transport controller's shape — **derive ≈ slow-start / BDP estimate, servo ≈
AIMD around it**. Both run FLOW(liveness)-side, never AUTHORITY (a governor paces *how much · how
often*; it never decides *who may*).

<<~/ahu >>

<<~ ahu #guards >>

## Guards ~ what keeps the governor honest

- **Clamp** ~ a `[floor, ceil]` bounds the bound. The floor keeps responsiveness (never starve a
  fast path); the ceil keeps the staleness/latency budget (never let a runaway estimate buy latency
  for no throughput, never let a kill-timeout grow toward hours).
- **Deadband** ~ a small error HOLDS the bound. Without it the governor chases sensor noise and
  oscillates.
- **Cold-start default** ~ until `minSamples` land, a sane guessed constant holds. A one-sample EWMA
  earns no trust; a cold servo stays safe by falling back, never by acting on noise.
- **Completions-only-teach** ~ a failure, kill, or fault NEVER records. Only a clean completion folds
  into the EWMA, so a string of timeouts can't drag the estimate toward the ceiling and lock the
  governor there.

<<~/ahu >>

<<~ ahu #enaction >>

## Enaction ~ where the governor lives in code

WITNESSED across two packages:

- **`mesh/gate-tuning.ts`** — `deriveGate` (the slow loop, EBQ `depth = √(2λS/H)`) · `adaptGate`
  (the lossless flush-depth servo, SHRINK-under-load) · `adaptWindow` (the lossy coalesce-window
  servo, GROW-under-load, AIMD + deadband + clamp). Composed in **`mesh/capture-engine.ts`** as the
  accumulate cell's own two loops (`COST_EWMA_ALPHA = 0.2`); `H` stays vessel-set policy. The
  `WindowServo` config rides opt-in on `KeyedCoalesceGate` (`mesh/projection-nalu.ts`), self-clocking
  on the prior flush's completion (Nagle/triple-buffer — never reconcile a key while its prior
  reconcile drains).
- **`mempalace/mine-timeout.ts`** — `adaptiveTimeoutMs` / `recordMineDuration`, the INVERTED polarity:
  a kill-timeout that GROWS headroom under load and SHRINKS when mines run fast, `α = 0.2` mirroring
  `capture-engine`'s `COST_EWMA_ALPHA`, clamped `[15 s, 300 s]`, cold-start default until
  `minSamples = 3`. Only completions teach; a killed mine never poisons the EWMA toward the ceiling.
  It bounds a wedged mine to ≤ ceil while never false-killing a slow-but-honest one.

The network ring lifts the same two-loop to the wire — **the servo becomes congestion control**,
the receiver's gate signalling the sender (the one piece the intra-island governor lacks today). Held
for the ring, not built here (`projection-nalu#network-ring`).

**The governor rides py/R too.** <<~ confidence Synthesis 12/20 >> The same servo law that breathes the TS
gates — the main↔worker↔main message-passing and the CRDT⟷TW5 projection-nalu — governs the **py/R
sensorium stream-gates**: the bands and coupling breathing-thresholds self-tune py-side, the FFZ-paced gate
finding its bound from the observed stream cost. One governor pattern-integrity, three homes across the
TS/py membrane; the polarity law and the two-loop shape hold identically wherever the bound breathes.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/api/projection-nalu >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/capture-annotation-model#nalu-flush-hardening >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/causal-islands >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
