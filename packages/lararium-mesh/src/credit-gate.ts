/**
 * credit-gate — TWO-SIDED (end-to-end) backpressure: the receiver's drain advertises credits, the
 * producer consumes them. Closes the Nalu canon's explicitly-stated gap (`projection-nalu#network-
 * ring`: "the RECEIVER's gate signals the SENDER — our servo is one-sided today") and cures the
 * BULLWHIP the one-sided AIMD dial generates (a producer reacting to a
 * LOCAL signal without end-to-end sink visibility amplifies oscillation).
 *
 * THE LAW (convergent across credit-based flow control · ant entrance-encounter-rate ·
 * Frank-Starling preload · HPA product-feedback · quorum-sensing): the upstream admission rate is a
 * function of a DOWNSTREAM signal measuring PROVEN DRAIN — never the producer's own guess. Here the
 * downstream signal is the drain-ledger's `uncommitted` backlog (staged-but-not-yet-committed); the
 * true sink (the single-writer committer) drains it, and each commit RETURNS a credit.
 *
 *   credits = maxInFlight − uncommitted     (available admission room)
 *   admit while credits > 0; at 0 → SHED    (reject the sender, not merely slow it)
 *
 * The TWO-LOOP composition with the AIMD dial (concurrency-dial):
 *   - SLOW loop = the AIMD dial discovers `maxInFlight` from latency (slow-start/BDP estimate).
 *   - FAST loop = credits gate each admission on the ACTUAL uncommitted backlog (per-cycle).
 * AIMD alone oscillates (bullwhip); credits pin admission to real drain, damping it.
 *
 * THE SHED (Frank-Starling descending-limb guard): matching outflow to inflow works only to a
 * ceiling; past `maxInFlight` uncommitted, a purely-reactive committer decompensates. So credits ≤ 0
 * must BLOCK/reject the producer (the coagulation threshold / credit-zero-blocks), giving an upper
 * safety valve the one-sided dial lacked.
 *
 * PURE: functions over (maxInFlight, uncommitted). The caller reads `uncommitted` from the
 * drain-ledger's `backlog().length` and `maxInFlight` from the dial's `limit`. Meme:
 * lar:///ha.ka.ba/@lararium/mesh/credit-gate · [[main-session-capture-gap]] · api/pono/servo
 */

/**
 * Available admission credits = the receiver's free-buffer room. `maxInFlight` is the dial's
 * discovered ceiling; `uncommitted` is the drain-ledger's real backlog (the downstream signal).
 * Clamped at 0 — never negative (over-full reads as zero room, the shed).
 */
export function availableCredits(maxInFlight: number, uncommitted: number): number {
  return Math.max(0, maxInFlight - uncommitted);
}

/**
 * May the producer admit one more? True iff a credit is free. At zero the answer is a HARD no —
 * the shed: the caller must block/reject, not slow-and-proceed (the Frank-Starling ceiling). This is
 * the two-sided gate: the answer depends on the downstream `uncommitted`, not the producer's state.
 */
export function canAdmit(maxInFlight: number, uncommitted: number): boolean {
  return availableCredits(maxInFlight, uncommitted) > 0;
}

/** The gate's honest state for telemetry/surfacing — credits, whether shedding, and the utilization. */
export interface CreditReading {
  readonly maxInFlight: number;
  readonly uncommitted: number;
  readonly credits: number;
  /** true when credits === 0: the producer is BLOCKED (the shed is engaged), surfaced not hidden. */
  readonly shedding: boolean;
  /** uncommitted / maxInFlight, clamped [0,∞) — >1 means the backlog overran the ceiling (decompensation warning). */
  readonly utilization: number;
}

/** Read the two-sided gate's state (for the servo/telemetry — the shed is an honest surfaced signal, per the hiatus/drop-honesty law). */
export function creditReading(maxInFlight: number, uncommitted: number): CreditReading {
  const credits = availableCredits(maxInFlight, uncommitted);
  return {
    maxInFlight,
    uncommitted,
    credits,
    shedding: credits === 0,
    utilization: maxInFlight > 0 ? uncommitted / maxInFlight : Infinity,
  };
}

/**
 * The CREDIT-CONSERVATION invariant (InfiniBand credit-loop ward): a leaked credit — one that fails
 * to return between land and release (an exception, a dropped callback) — decays the window to 0 and
 * sheds FOREVER, looking exactly like healthy backpressure. So the population MUST conserve:
 * `issued == inFlight + free`. Any drift means a credit went missing (or was double-returned). Read
 * this each cycle; a non-zero `drift` is a silent-deadlock alarm, never a normal state.
 */
export function creditConservation(issued: number, inFlight: number, free: number): { readonly conserved: boolean; readonly drift: number } {
  const drift = issued - (inFlight + free);
  return { conserved: drift === 0, drift };
}

/**
 * The HLL escape (InfiniBand Head-of-queue Lifetime Limit): a staged item that never lands holds its
 * credit hostage. Past `maxAgeTicks` a staged-but-uncommitted item MUST age out (→ the dead-letter
 * anergy lane, returning its credit) rather than freeze the fabric. True = evict-and-return-the-credit.
 * `nowTick`/`stagedAtTick` ride the injected logical clock (no wall-time in the pure core).
 */
export function agedOut(stagedAtTick: number, nowTick: number, maxAgeTicks: number): boolean {
  return nowTick - stagedAtTick >= maxAgeTicks;
}
