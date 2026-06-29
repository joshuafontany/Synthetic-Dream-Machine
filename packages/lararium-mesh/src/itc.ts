/**
 * itc — Interval Tree Clocks (Almeida · Baquero · Fonte, 2008), vendored.
 *
 * The worldline's CAUSAL partial-order carrier for a DYNAMIC spawn/cull set. Plain
 * vector clocks bloat as agents come and go (one slot per actor, forever); ITC reclaims
 * id-space on retire, so a long-running rhizome of spawning/dissolving spirits stays
 * compact. The three operations map onto the worldline (agent-worldline #time):
 *
 *   fork  = spawn   — split the id; both branches inherit the shared event history,
 *                     so the parent happened-before each child (the Delegation edge).
 *   event = inject  — advance one stamp's event (the rhizome's prov:Communication leg;
 *                     FULL ticks — EVERY injection is an event, the operator's D-cut).
 *   join  = handback — sum the ids + max-join the events (the twin-reunion merge; one
 *                     merge among many in the rhizome — merge-where-messages-land).
 *
 * Concurrency is FIRST-CLASS: two stamps that share no merge-ancestry compare
 * "concurrent" — the read the rhythmic FfzClock LWW can never give (the PATH-B cut:
 * causal rides ITC/the edge-DAG, FfzClock stays purely rhythmic). The comparison reads
 * the EVENT trees only (the history); the id trees carry ownership, never order.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#time
 * Standard: Almeida/Baquero/Fonte, "Interval Tree Clocks", OPODIS 2008.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * An id tree — ownership of the [0,1) interval. A leaf `1` owns its whole interval,
 * `0` owns none; a pair `[left,right]` splits it. fork halves it, join sums it.
 */
export type ItcId = 0 | 1 | [ItcId, ItcId];

/**
 * An event tree — the causal history. A leaf `n` means "n events everywhere below me";
 * a node `[n, l, r]` means "n events here, plus l/r more in the two halves". The base
 * (`n`) is the floor; depth records WHERE independent growth happened (so siblings that
 * grow in different id-regions stay distinguishable → concurrent).
 */
export type ItcEvent = number | [number, ItcEvent, ItcEvent];

/** A stamp = (id, event): the ownership share + the causal history it has witnessed. */
export interface ItcStamp {
  readonly id:    ItcId;
  readonly event: ItcEvent;
}

/** The causal verdict — concurrent-capable, unlike the rhythmic LWW. */
export type ItcOrder = "before" | "after" | "concurrent" | "equal";

/**
 * The seed stamp: full ownership (`id=1`), empty history (`event=0`). The root worldline
 * (the operator, the E-cut common cause) starts here; everything else forks from it.
 */
export function itcSeed(): ItcStamp {
  return { id: 1, event: 0 };
}

// ---------------------------------------------------------------------------
// Id algebra — split (fork) · sum (join) · normalize
// ---------------------------------------------------------------------------

/** Collapse a redundant id pair: `[0,0]→0`, `[1,1]→1`. Keeps ids minimal. */
function normId(i: ItcId): ItcId {
  if (i === 0 || i === 1) return i;
  const l = normId(i[0]);
  const r = normId(i[1]);
  if (l === 0 && r === 0) return 0;
  if (l === 1 && r === 1) return 1;
  return [l, r];
}

/** Split an id into two disjoint halves (the fork primitive). */
function splitId(i: ItcId): [ItcId, ItcId] {
  if (i === 0) return [0, 0];
  if (i === 1) return [[1, 0], [0, 1]];
  const [l, r] = i;
  if (l === 0) {
    const [r1, r2] = splitId(r);
    return [[0, r1], [0, r2]];
  }
  if (r === 0) {
    const [l1, l2] = splitId(l);
    return [[l1, 0], [l2, 0]];
  }
  return [[l, 0], [0, r]];
}

/** Sum two disjoint ids back into one (the join primitive on ownership). */
function sumId(a: ItcId, b: ItcId): ItcId {
  if (a === 0) return b;
  if (b === 0) return a;
  if (a === 1 || b === 1) return 1; // overlap (defensive — disjoint joins never hit this)
  return normId([sumId(a[0], b[0]), sumId(a[1], b[1])]);
}

// ---------------------------------------------------------------------------
// Event algebra — lift/sink · min/max · normalize · join · leq · fill · grow
// ---------------------------------------------------------------------------

function liftEvent(e: ItcEvent, m: number): ItcEvent {
  return typeof e === "number" ? e + m : [e[0] + m, e[1], e[2]];
}

function sinkEvent(e: ItcEvent, m: number): ItcEvent {
  return typeof e === "number" ? e - m : [e[0] - m, e[1], e[2]];
}

/** The floor (smallest value) of an event tree — its root base. */
function minEvent(e: ItcEvent): number {
  return typeof e === "number" ? e : e[0];
}

/** The ceiling (largest value) of an event tree. */
function maxEvent(e: ItcEvent): number {
  return typeof e === "number" ? e : e[0] + Math.max(maxEvent(e[1]), maxEvent(e[2]));
}

/** Canonicalize an event tree: collapse equal flat children, sink shared depth into the base. */
function normEvent(e: ItcEvent): ItcEvent {
  if (typeof e === "number") return e;
  const n = e[0];
  const l = normEvent(e[1]);
  const r = normEvent(e[2]);
  if (typeof l === "number" && typeof r === "number" && l === r) return n + l;
  const m = Math.min(minEvent(l), minEvent(r));
  return [n + m, sinkEvent(l, m), sinkEvent(r, m)];
}

/** Max-join two event histories (the join on history; commutative, idempotent). */
function joinEvent(a: ItcEvent, b: ItcEvent): ItcEvent {
  if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
  if (typeof a === "number") return joinEvent([a, 0, 0], b);
  if (typeof b === "number") return joinEvent(a, [b, 0, 0]);
  if (a[0] > b[0]) return joinEvent(b, a); // ensure a[0] <= b[0]
  const m = b[0] - a[0];
  return normEvent([a[0], joinEvent(a[1], liftEvent(b[1], m)), joinEvent(a[2], liftEvent(b[2], m))]);
}

/** Partial-order on histories: a ≤ b iff every event a knows, b knows. */
function leqEvent(a: ItcEvent, b: ItcEvent): boolean {
  if (typeof a === "number") {
    return typeof b === "number" ? a <= b : a <= b[0];
  }
  if (typeof b === "number") {
    return a[0] <= b && leqEvent(liftEvent(a[1], a[0]), b) && leqEvent(liftEvent(a[2], a[0]), b);
  }
  return (
    a[0] <= b[0] &&
    leqEvent(liftEvent(a[1], a[0]), liftEvent(b[1], b[0])) &&
    leqEvent(liftEvent(a[2], a[0]), liftEvent(b[2], b[0]))
  );
}

function eventEqual(a: ItcEvent, b: ItcEvent): boolean {
  if (typeof a === "number" || typeof b === "number") return a === b;
  return a[0] === b[0] && eventEqual(a[1], b[1]) && eventEqual(a[2], b[2]);
}

/** Fill: where the id owns the whole interval, flatten the event to its max (cost-free growth). */
function fill(i: ItcId, e: ItcEvent): ItcEvent {
  if (i === 0) return e;
  if (i === 1) return maxEvent(e);
  if (typeof e === "number") return e;
  const [il, ir] = i;
  const [n, el, er] = e;
  if (il === 1) {
    const er2 = fill(ir, er);
    return normEvent([n, Math.max(maxEvent(el), minEvent(er2)), er2]);
  }
  if (ir === 1) {
    const el2 = fill(il, el);
    return normEvent([n, el2, Math.max(maxEvent(er), minEvent(el2))]);
  }
  return normEvent([n, fill(il, el), fill(ir, er)]);
}

/** A large constant biasing growth toward shallower (lower-cost) branches. */
const GROW_DEPTH_COST = 1000;

/** Grow: add exactly one event in the id's region, returning the new history + a cost. */
function grow(i: ItcId, e: ItcEvent): [ItcEvent, number] {
  if (i === 1) {
    const leaf = typeof e === "number" ? e : maxEvent(e);
    return [leaf + 1, 0];
  }
  if (typeof e === "number") {
    const [e2, c] = grow(i, [e, 0, 0]);
    return [e2, c + GROW_DEPTH_COST];
  }
  const [il, ir] = i as [ItcId, ItcId];
  const [n, el, er] = e;
  if (il === 0) {
    const [er2, cr] = grow(ir, er);
    return [[n, el, er2], cr + 1];
  }
  if (ir === 0) {
    const [el2, cl] = grow(il, el);
    return [[n, el2, er], cl + 1];
  }
  const [el2, cl] = grow(il, el);
  const [er2, cr] = grow(ir, er);
  return cl <= cr ? [[n, el2, er], cl + 1] : [[n, el, er2], cr + 1];
}

// ---------------------------------------------------------------------------
// The three operations: fork · event · join (+ comparison)
// ---------------------------------------------------------------------------

/** fork = SPAWN — split the id, both halves inherit the shared event (parent → child). */
export function itcFork(s: ItcStamp): [ItcStamp, ItcStamp] {
  const [i1, i2] = splitId(s.id);
  return [{ id: i1, event: s.event }, { id: i2, event: s.event }];
}

/** event = INJECT — advance this stamp's history by one (fill if free, else grow). */
export function itcEvent(s: ItcStamp): ItcStamp {
  const filled = fill(s.id, s.event);
  if (!eventEqual(filled, s.event)) return { id: s.id, event: filled };
  const [grown] = grow(s.id, s.event);
  return { id: s.id, event: grown };
}

/** join = HANDBACK — sum the ids, max-join the histories (the merge). */
export function itcJoin(a: ItcStamp, b: ItcStamp): ItcStamp {
  return { id: normId(sumId(a.id, b.id)), event: joinEvent(a.event, b.event) };
}

/** History order: does `a` causally precede-or-equal `b`? (reads events, never ids) */
export function itcLeq(a: ItcStamp, b: ItcStamp): boolean {
  return leqEvent(a.event, b.event);
}

/**
 * The concurrent-capable causal verdict. Two stamps sharing no merge-ancestry —
 * neither's history ≤ the other's — read "concurrent" (the lightcone "elsewhere").
 */
export function itcCompare(a: ItcStamp, b: ItcStamp): ItcOrder {
  const ab = leqEvent(a.event, b.event);
  const ba = leqEvent(b.event, a.event);
  if (ab && ba) return "equal";
  if (ab) return "before";
  if (ba) return "after";
  return "concurrent";
}
