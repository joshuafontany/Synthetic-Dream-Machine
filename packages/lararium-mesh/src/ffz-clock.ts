/**
 * ffz-clock — Fontany-Fuller-Zelenka 5-level bounded hierarchical logical clock.
 *
 * FfzClock operates at the application layer ABOVE Automerge.
 * It encodes rhythmic position (WHERE in session/day/epoch) — not causal total order.
 * Automerge's internal `<counter, actorId>` OpId handles causal ordering;
 * FfzClock rides alongside as semantic annotation on tiddlers and session events.
 *
 * Five levels (L0→L4): sub-action → action → session → day → epoch
 * L4 (epoch) carries no upper bound — prevents epoch aliasing when lower levels roll.
 * Comparison: lexicographic from L4 downward (epoch dominates).
 * Merge (CRDT LWW): dominant epoch wins; sub-epoch levels merge only within same epoch.
 *
 * Prior art survey: no prior formalization combines bounded multi-level
 * cyclic hierarchy with unbounded epoch guard for CRDT ordering. Closest adjacent:
 *   - HLC (Kulkarni 2014): two-level, both unbounded, no cycling
 *   - ITC (Almeida 2008): tree for identity management, flat event counter
 *   - ERA (arXiv:2601.22963, Jan 2026): epoch events as irregular external arbitration
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/ffz-clock
 * Law of Fives: L0–L4 map onto OODA_HA_5 stances (PENTA_2_CLOCK_ALIGNMENT).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Five-element tuple: [L0:sub-action, L1:action, L2:session, L3:day, L4:epoch].
 * L4 carries no practical upper bound (use Infinity or a very large integer).
 */
export type FfzLevel = [number, number, number, number, number];

/**
 * Default bounds: stub values that match session rhythms at human scale.
 * L0–L3 are bounded (periodic); L4 is effectively unbounded.
 *
 * Coprime-prime candidates for collision resistance: [59, 251, 1021, 367, Infinity]
 * These stubs remain as [64, 256, 1024, 365, Infinity] until real rhythm data arrives.
 */
export const FFZ_DEFAULT_BOUNDS: FfzLevel = [64, 256, 1024, 365, Infinity];

/** Canonical register names for the five attention-scale bands (Pulse/Beat/Measure/Arc/Theme). */
export const FFZ_REGISTER_NAMES = [
  "Pulse",   // L0 — sub-perceptual; operator-invisible system tick
  "Beat",    // L1 — operator perceptual grain; the anchor level
  "Measure", // L2 — session-length arc; coherent working window (DEFAULT)
  "Arc",     // L3 — day/cycle arc; recurrent cadence
  "Theme",   // L4 — epoch; anti-aliasing guard; unbounded by invariant
] as const;

/**
 * FfzClockProfile — a named bound set with a documented L1-grain annotation.
 *
 * A profile declares what ONE Beat (L1 tick) means in a given domain context.
 * The `bounds` field on FfzClock carries the numeric bounds; the profile carries
 * the semantic annotation so operators and tools can reason about the clock.
 *
 * Profiles do NOT require a new FfzClock type — they annotate an existing instance.
 * Select the active profile via the session tiddler's `clock-context` field.
 *
 * Built-in profile names: "session" | "diegetic" | "world-time"
 * Tool adapters may register additional profiles (e.g., "daw-bar", "market-trade").
 */
export interface FfzClockProfile {
  /** Short machine-readable name, e.g. "session", "diegetic", "world-time". */
  readonly name:       string;
  /** Human description of what one Beat (L1 tick) means in this profile. */
  readonly l1Grain:    string;
  /** Bounds tuple for this profile. L4 MUST remain Infinity. */
  readonly bounds:     FfzLevel;
}

/** Built-in profiles. Bounds remain stubs until real rhythm data arrives. */
export const FFZ_PROFILES: Record<string, FfzClockProfile> = {
  "session": {
    name:    "session",
    l1Grain: "one operator-agent exchange turn (grounded)",
    bounds:  [64, 256, 1024, 365, Infinity],
  },
  "diegetic": {
    name:    "diegetic",
    l1Grain: "one FTLS combat round (~6 seconds in-world)",
    bounds:  [16, 8, 12, 6, Infinity],
  },
  "world-time": {
    name:    "world-time",
    l1Grain: "one in-world month (4 weeks)",
    bounds:  [4, 3, 4, 100, Infinity],
  },
} as const;

/**
 * LarTickCounter — the Lararium node's monotonic sequence number.
 *
 * Distinct from FfzClock: carries NO bounded-cyclic semantics.
 * Serves as the causal join key across event sources:
 * "TW5 recipe X ran during tick 47291, at session exchange turn 8."
 *
 * Driven by the unified tick loop (Verse-style event bus).
 * NOT an application-layer rhythmic position marker — that role belongs to FfzClock.
 */
export type LarTickCounter = number & { readonly __brand: "LarTickCounter" };

export interface FfzClock {
  /** Current level values: [L0, L1, L2, L3, L4]. */
  readonly levels:  FfzLevel;
  /**
   * Upper bound per level (exclusive) before rollover ticks the level above.
   * L4 bound MUST be Infinity (or Number.MAX_SAFE_INTEGER) to prevent epoch aliasing.
   * Typically shared as a deployment-wide constant; embedded here for self-describing wire format.
   */
  readonly bounds:  FfzLevel;
  /**
   * The worldline IDENTITY this clock ticks for — the logical lineage-path HANDLE,
   * NOT the Automerge actor (agents hold none; the daemon owns the sole replica, so
   * keying on its actorId would collapse every worldline into one clock). ITC-style:
   * the ticking identity stays decoupled from the persisting replica (Almeida/Baquero,
   * Interval Tree Clocks 2008). Also the tie-breaker when two clocks carry identical
   * level tuples. Named `actorId` for wire-compat; reads as the worldline handle.
   */
  readonly actorId: string;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/**
 * Create a zero clock for the given worldline handle (the `actorId` slot — the
 * lineage-path identity, NOT an Automerge actor), using default bounds.
 * Pass custom `bounds` to override (e.g., coprime-prime set).
 */
export function ffzZero(actorId: string, bounds: FfzLevel = FFZ_DEFAULT_BOUNDS): FfzClock {
  return { levels: [0, 0, 0, 0, 0], bounds, actorId };
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Tick the clock at `level` (default L0).
 * Carries upward: if level `i` reaches its bound, reset to 0 and tick `i+1`.
 * L4 (epoch) carries no bound — it grows unbounded.
 */
export function ffzTick(clock: FfzClock, level = 0): FfzClock {
  const lv: number[] = Array.from(clock.levels);
  const bv: number[] = Array.from(clock.bounds);
  let i = level;
  while (i < 5) {
    lv[i] = (lv[i] ?? 0) + 1;
    if (i < 4 && (lv[i] ?? 0) >= (bv[i] ?? Infinity)) {
      lv[i] = 0;
      i++;
    } else {
      break;
    }
  }
  return { ...clock, levels: lv as unknown as FfzLevel };
}

/**
 * The RHYTHMIC read — a lexicographic total-order LWW from L4 downward (epoch dominates),
 * actorId breaking ties within identical level tuples. Returns -1 | 0 | 1.
 *
 * This is the GRAIN, never the causal verdict. By construction it can never say
 * "concurrent" — a total order can't (canon flags exactly this: agent-worldline #time,
 * #open). The PATH-B cut holds: causality does NOT ride the FfzClock; it rides the
 * worldline ITC stamp / the edge-DAG. For the concurrent-capable causal read use
 * `itcCompare` (itc.ts) / `worldlineCompare` (worldline-causal.ts) on the two worldlines'
 * ITC stamps. Two reads, one cut: this one paces the rhythm, those order the history.
 */
export function ffzCompare(a: FfzClock, b: FfzClock): -1 | 0 | 1 {
  const al = a.levels as readonly number[];
  const bl = b.levels as readonly number[];
  for (let i = 4; i >= 0; i--) {
    if (al[i] !== bl[i])
      return (al[i] as number) < (bl[i] as number) ? -1 : 1;
  }
  return a.actorId < b.actorId ? -1 : a.actorId > b.actorId ? 1 : 0;
}

/**
 * CRDT merge: dominant epoch wins.
 * Sub-epoch levels merge (max per level) only when both clocks share the same epoch.
 * The merged clock retains `a.actorId` and `a.bounds` — caller provides the local actor.
 */
export function ffzMerge(a: FfzClock, b: FfzClock): FfzClock {
  const epochA = a.levels[4];
  const epochB = b.levels[4];
  const dominantEpoch = Math.max(epochA, epochB);
  const bl = b.levels as readonly number[];
  const levels = (a.levels as readonly number[]).map((v, i): number => {
    if (i === 4) return dominantEpoch;
    return epochA === epochB ? Math.max(v, bl[i] as number)
         : epochA > epochB  ? v
         :                    bl[i] as number;
  }) as unknown as FfzLevel;
  return { levels, bounds: a.bounds, actorId: a.actorId };
}

// ---------------------------------------------------------------------------
// ExchangeState — lifecycle FSM for operator-agent exchange turns
// ---------------------------------------------------------------------------

/**
 * ExchangeState encodes the lifecycle of one operator-agent exchange turn.
 *
 * Lives as a separate field on PresenceSlot — NOT inside FfzClock coordinates.
 * The L1 clock tick fires on transition to "grounded", not on response delivery.
 *
 * During async wait (operator offline for hours): state holds "agent-responded",
 * clock stays stable, no phantom ticks. On operator return: L1 ticks exactly once
 * (the grounded transition), state resets to "idle".
 *
 * Grounded in: Clark-Brennan (1991) grounding model; Ginzburg DGB PENDING queue;
 * MCP SEP-1686 `input_required`; A2A Protocol v0.3 `input-required` state.
 */
export type ExchangeState =
  | "idle"              // no active exchange; awaiting operator intent
  | "operator-sent"     // operator presented intent; agent not yet responded
  | "agent-working"     // agent processing; L0 ticking (sub-steps in flight)
  | "agent-responded"   // response delivered; awaiting operator grounding
  | "grounded"          // both parties accepted; L1 tick fires, then → "idle"
  | "blocked";          // agent waiting for operator input (MCP input_required)

// ---------------------------------------------------------------------------
// Serialization — compact 6-integer wire form for DocHandle.broadcast()
// ---------------------------------------------------------------------------

/**
 * Compact wire encoding: `"L0:L1:L2:L3:L4:actorHash"`.
 * actorHash = first 8 hex chars of actorId (collision-tolerant for broadcast).
 * Full actorId stored in PresenceSlot — not repeated in every clock tick.
 */
export function ffzSerialize(clock: FfzClock): string {
  const hash = clock.actorId.slice(0, 8);
  return `${clock.levels.join(":")}:${hash}`;
}

/**
 * Deserialize from wire form; requires full actorId and bounds from the surrounding context.
 * Returns null on parse failure.
 */
export function ffzDeserialize(
  wire: string,
  actorId: string,
  bounds: FfzLevel = FFZ_DEFAULT_BOUNDS,
): FfzClock | null {
  const parts = wire.split(":");
  if (parts.length !== 6) return null;
  const nums = parts.slice(0, 5).map(Number);
  if (nums.some(isNaN)) return null;
  const levels = nums as unknown as FfzLevel;
  return { levels, bounds, actorId };
}
