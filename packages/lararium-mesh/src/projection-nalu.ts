/**
 * projection-nalu — the pattern integrity behind the three nalus.
 *
 * A sovereign SOURCE's state, carried by a gated wave, FLUSHED to a substrate SINK:
 *   `SOURCE → forward-pass → NALU gate → SINK`
 * `role = capability ≠ platform` — the engine is fixed; the SINK is the injected capability.
 * Three live instances: node lararium → disk · browser lararium → DOM · chat → mempalace.
 *
 * TWO GATE-FAMILIES — CONSERVED, not arbitrary. A three-domain rhyme survey (2026-06-26 —
 * physiology · earth-systems · human-systems) found both families running TOGETHER in one
 * substrate everywhere: a neuron is graded(coalesce) on its dendrites + spiking(accumulate) on its
 * axon; a hydrograph is baseflow(coalesce) + stormflow(accumulate); a ledger zeroes its temporary
 * accounts(coalesce) while rolling permanent ones forward(accumulate). KEEP THEM DISTINCT:
 *
 *   • ACCUMULATE (durable) — heterogeneous, every item conserved, buffer → batch-flush, durable
 *     RESERVE under load, a refractory lockout buying ordering + no-backflow. Biology's name:
 *     "integrate-and-fire". Engine: {@link CaptureNalu} (capture-nalu.ts) — ceiling + spill-to-
 *     reserve + backoff + dead-letter + RRP←reserve refill (latched, demand-mobilized — the
 *     synaptic vesicle-pool rhyme). LAW: whoever holds the reserve holds the backpressure risk.
 *   • COALESCE (transient) — homogeneous frames, NEWEST supersedes, the unflushed FADES (the
 *     decay-envelope — the bell), no reserve (a dropped intermediate is the correct dual of
 *     accumulate's every-one-delivered, NOT a weakness). The refractory lockout must NOT apply
 *     here — it would stall the freshest frame. Engine: {@link CoalesceGate} (below).
 *
 * FACETS the survey named — held as shared vocabulary, NOT all built (YIN; grow on demand):
 *   - flush-REDUCER: deliver | fold/net (settlement netting) | zero (the accounting close) |
 *     supersede-decay (the bell).
 *   - flush-TRIGGER: threshold/pressure | periodic | nested-periodic (= the Aperture ladder, a
 *     colotomic hierarchy of flush-clocks) | incremental/min-viable-chunk | event | deferred-low-load
 *     (sleep consolidation = off-peak compaction).
 *   - fill-adaptive batch (Frank–Starling) · deferral-is-a-priced-trade · negotiated-schedule-
 *     under-contention (subak water-temple — local-first, no global valve).
 * Guards the rhymes named: SUPERCOOLING (full buffer, no nucleation trigger → metastable, work
 * undrained — a gate needs an explicit trigger, never just a full buffer) · HIATUS (the sink is a
 * lossy projection — dropped writes are intrinsic, surface them).
 *
 * Spine vocabulary (biogeochem): pool · flux · reservoir · residence-time (τ = X/I fixes latency).
 *
 * Canon: lar:///ha.ka.ba/@lararium/v0.1/api/lararium/projection-nalu
 */

// The accumulate-family engine + its gate live in capture-nalu.ts (the accumulate sibling of
// CoalesceGate below); both are exported from the mesh barrel alongside this module.

/** Which family a projection's gate belongs to — the conserved dichotomy. */
export type GateFamily = "accumulate" | "coalesce";

/**
 * The one thing every projection-nalu gate shares — its family discriminant. A MARKER only: no
 * base class, no shared behavior (the engines stay distinct — accumulate's `enqueue(value)` + WAL
 * reserve vs coalesce's valueless `mark()` + decay are the correct duals, never to be force-merged).
 * The tag lets a holder reason about the dichotomy in types rather than only in canon prose.
 */
export interface ProjectionGate {
  readonly family: GateFamily;
}

type TimerHandle = ReturnType<typeof setTimeout>;

/**
 * The COALESCE-family gate. A burst of `mark()`s within a small window collapses to ONE flush;
 * the newest SOURCE state wins and intermediates fade. The flush reads the live source lazily
 * (snapshot at crest), so `mark()` carries no value — it only says "the source moved". No reserve,
 * no backoff, no dead-letter: a dropped intermediate frame is correct, not a loss. `rev` is a
 * monotone frame counter so a SINK can drop a stale frame that overtakes a newer one.
 *
 * This is the DOM projection's gate, extracted from its open-coded timer/dirty/rev. The trigger
 * here is `periodic` (a coalesce window); the trigger taxonomy's other shapes grow on demand.
 */
export interface CoalesceGateOptions {
  /** the coalesce window (ms): a burst of marks within it collapses to one flush. */
  readonly windowMs: number;
  /** the crest — snapshot the live SOURCE and deliver it to the SINK. `rev` is monotone. */
  readonly onFlush: (rev: number) => void;
  /** timer seam (deterministic tests); defaults to setTimeout / clearTimeout. */
  readonly setTimer?: (fn: () => void, ms: number) => TimerHandle;
  readonly clearTimer?: (h: TimerHandle) => void;
}

export class CoalesceGate implements ProjectionGate {
  readonly family: GateFamily = "coalesce";
  private dirty = false;
  private rev = 0;
  private timer: TimerHandle | null = null;
  private readonly windowMs: number;
  private readonly onFlush: (rev: number) => void;
  private readonly setTimer: (fn: () => void, ms: number) => TimerHandle;
  private readonly clearTimer: (h: TimerHandle) => void;

  constructor(opts: CoalesceGateOptions) {
    this.windowMs = opts.windowMs;
    this.onFlush = opts.onFlush;
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h));
  }

  /** The SOURCE moved — coalesce: a burst of marks arms a single deferred flush. */
  mark(): void {
    this.dirty = true;
    if (this.timer === null) this.timer = this.setTimer(() => this.fire(), this.windowMs);
  }

  /** Current frame counter (last delivered rev). */
  revision(): number {
    return this.rev;
  }

  private fire(): void {
    this.timer = null;
    if (!this.dirty) return;
    this.dirty = false;
    this.onFlush(++this.rev);
  }

  /** Stop the gate — clears any armed flush; no final frame (teardown). */
  dispose(): void {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    this.dirty = false;
  }
}

/**
 * The COALESCE-family gate, KEYED + DEBOUNCE — the disk projection's gate. Where {@link
 * CoalesceGate} runs one window-from-first-mark over a single source, this runs a DEBOUNCE timer
 * PER KEY: each `mark(key)` resets that key's timer, so a burst of changes to one carrier root
 * settles into ONE flush after the changes stop (the trailing-debounce trigger — it lets a MOVE's
 * source-tombstone and destination-add coalesce into one reconcile that sees the final owner). The
 * flush reconciles the live source for that key lazily, so `mark(key)` carries no value. Same
 * coalesce family: newest-state-per-key wins, intermediates drop, no reserve.
 */
export interface KeyedCoalesceGateOptions<K> {
  /** debounce delay (ms): a key's flush fires this long after its LAST mark (settle, not window). */
  readonly debounceMs: number;
  /** the crest for one key — reconcile/snapshot the live source for `key` against the sink. */
  readonly onFlush: (key: K) => void;
  /** timer seam (deterministic tests); defaults to setTimeout / clearTimeout. */
  readonly setTimer?: (fn: () => void, ms: number) => TimerHandle;
  readonly clearTimer?: (h: TimerHandle) => void;
}

export class KeyedCoalesceGate<K> implements ProjectionGate {
  readonly family: GateFamily = "coalesce";
  private readonly timers = new Map<K, TimerHandle>();
  private readonly debounceMs: number;
  private readonly onFlush: (key: K) => void;
  private readonly setTimer: (fn: () => void, ms: number) => TimerHandle;
  private readonly clearTimer: (h: TimerHandle) => void;

  constructor(opts: KeyedCoalesceGateOptions<K>) {
    this.debounceMs = opts.debounceMs;
    this.onFlush = opts.onFlush;
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h));
  }

  /** The source moved at `key` — DEBOUNCE: reset the key's timer so a burst settles into one flush. */
  mark(key: K): void {
    const existing = this.timers.get(key);
    if (existing !== undefined) this.clearTimer(existing);
    this.timers.set(key, this.setTimer(() => {
      this.timers.delete(key);
      this.onFlush(key);
    }, this.debounceMs));
  }

  /** Count of keys with a flush still armed (in flight). */
  pending(): number {
    return this.timers.size;
  }

  /** Stop the gate — clears every armed flush; pending coalesced flushes lawfully drop (teardown). */
  dispose(): void {
    for (const t of this.timers.values()) this.clearTimer(t);
    this.timers.clear();
  }
}
