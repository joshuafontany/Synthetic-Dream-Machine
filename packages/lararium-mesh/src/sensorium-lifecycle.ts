/**
 * sensorium-lifecycle — the DECLARED lifecycle-STATE of a durable sensorium, and the pure reducer that
 * drives it. The platform-blind spine (both the node manifest and any hull read ONE definition here).
 *
 * THE STATE LADDER (graduated, never a flip): a sensorium stands somewhere on
 *
 *   pioneer  → hardening → durable        (the graduation ladder — earned, not declared)
 *                              ↓
 *                          tombstone       (a JUDGED retire — terminal; the bytes GC later, never a hard-delete)
 *
 * pioneer  — the exploratory scratch (a fresh `build --ephemeral`); commitment stays cheap-to-reverse.
 * hardening — it SURVIVES a hardening interval under real recall/query load before it graduates
 *             (horticultural "hardening off" ⋈ generational-GC tenuring: an object promoted only after it
 *             survives N collections; here a sensorium promoted only after it survives N reconcile passes
 *             under traffic — the survivor-age predicate).
 * durable  — the climax state; commitment has become hard-to-reverse (the Mempalace stands here).
 * tombstone — retired with recorded grounds (MUSTIE); no byte-delete (causal-islands: move-not-delete).
 *
 * THE READER-DEFAULT (lossless migration): a manifest with no declared `lifecycle` reads one DERIVED from
 * its existing `ephemeral`+`halfLife` — so every sensorium already on disk carries a lifecycle the moment
 * this ships, zero manifest edit. {@link deriveLifecycle} is that derivation.
 *
 * THE REDUCER ({@link nextLifecycle}) is PURE — (state, evidence) → next state. A `reconcile` runs it and
 * writes only on change. The SIGNAL that feeds `survivorAge` (real recall-traffic over the hardening
 * interval) stays UNWIRED — the STRUCTURE stands, the tuning waits on the clean re-pour (F2/F6). With the
 * signal unwired, `survivorAge` reads 0, so a reconcile never promotes: it stays a safe noop until traffic
 * feeds the counter. A reconcile NEVER auto-retires — the tombstone flip is an operator-judged verb, held.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/sensorium-lifecycle
 */

/** Where a durable sensorium stands on the lifecycle ladder — a DECLARED fact a reconciler drives. */
export type SensoriumLifecycleState = "pioneer" | "hardening" | "durable" | "tombstone";

/** The ordered ladder (the graduation path; `tombstone` sits off it, reached only by a judged retire). */
export const LIFECYCLE_LADDER: readonly SensoriumLifecycleState[] = ["pioneer", "hardening", "durable"] as const;

/** Every valid state (the ladder + the terminal tombstone) — a read-time validator for a declared field. */
export const LIFECYCLE_STATES: readonly SensoriumLifecycleState[] = [...LIFECYCLE_LADDER, "tombstone"] as const;

/** Does a raw value name a lifecycle state? (a declared field validator — an unknown value re-derives). */
export function isLifecycleState(value: unknown): value is SensoriumLifecycleState {
  return typeof value === "string" && (LIFECYCLE_STATES as readonly string[]).includes(value);
}

/**
 * The reader-default: DERIVE a lifecycle from the manifest's existing `ephemeral`+`halfLife`, so a
 * manifest that predates the declared field still reads a state (lossless migration). The rule, ephemeral
 * winning as the strongest exploratory signal:
 *   - `ephemeral === true`               → pioneer   (the exploratory scratch, whatever its halfLife)
 *   - a FINITE positive `halfLife`       → hardening (a maturing standing that still cools)
 *   - else (halfLife null / absent)      → durable   (append-only-witness authority; never cools)
 * `tombstone` never derives — a retire declares it outright.
 */
export function deriveLifecycle(ephemeral: boolean, halfLife: number | null | undefined): SensoriumLifecycleState {
  if (ephemeral) return "pioneer";
  if (typeof halfLife === "number" && Number.isFinite(halfLife) && halfLife > 0) return "hardening";
  return "durable";
}

/**
 * The default tenuring threshold — how many survivor-passes a stage must survive under traffic before it
 * graduates. STRUCTURE only; the tuning waits on the re-pour (F6). Set so that an UNWIRED signal
 * (`survivorAge` 0) never promotes — a reconcile stays a safe noop until real traffic feeds the counter.
 */
export const DEFAULT_TENURING_THRESHOLD = 3 as const;

/** The evidence a reconcile weighs — the survivor-age predicate (tenuring). The SIGNAL that fills
 *  `survivorAge` from real recall/query load stays UNWIRED (F2); absent, it reads 0 → no promotion. */
export interface LifecycleEvidence {
  /** survivor-age: reconcile passes this stage has survived under recall traffic (the tenuring counter).
   *  The feeding signal is UNWIRED (F2) — absent reads 0, so a reconcile never promotes until traffic. */
  readonly survivorAge?: number;
  /** the tenuring threshold this pass reads against; defaults to {@link DEFAULT_TENURING_THRESHOLD}. */
  readonly threshold?: number;
}

/**
 * The PURE reducer: given the current declared state and the observed evidence, return the state the
 * sensorium SHOULD stand at. A reconcile calls this and writes only on change (idempotent — re-running
 * over unchanged evidence returns the same state, so a second reconcile is a noop).
 *
 *   - `tombstone` is TERMINAL — a reconcile never resurrects it (a retire is the only entry, and only an
 *     operator-judged verb sets it; the reducer never auto-retires).
 *   - a stage graduates one rung UP the ladder once its `survivorAge` reaches the `threshold`.
 *   - below threshold (the unwired-signal ground: survivorAge 0), the state HOLDS.
 */
export function nextLifecycle(state: SensoriumLifecycleState, evidence: LifecycleEvidence = {}): SensoriumLifecycleState {
  if (state === "tombstone") return "tombstone"; // terminal — a reconcile never climbs out
  const age = evidence.survivorAge ?? 0;
  const threshold = evidence.threshold ?? DEFAULT_TENURING_THRESHOLD;
  if (age < threshold) return state;             // not yet tenured (the unwired-signal ground → hold)
  if (state === "pioneer") return "hardening";
  if (state === "hardening") return "durable";
  return state;                                  // durable is the ladder top — it holds
}

/**
 * The operator FIELD-FLIP promote (F4, the active promote): climb ONE rung up the ladder outright —
 * pioneer → hardening → durable. Distinct from {@link nextLifecycle} (the traffic-gated reconcile): a
 * human promote FORCES the next rung, no survivor-age needed. Identity-preserving by construction — the
 * caller flips the manifest field in place, the dir/cid never move (recall stays unbroken). `durable`
 * holds (ladder top); `tombstone` never promotes (a retired sensorium re-enters only via un-retire).
 */
export function promoteState(state: SensoriumLifecycleState): SensoriumLifecycleState {
  if (state === "pioneer") return "hardening";
  if (state === "hardening") return "durable";
  return state; // durable top-of-ladder, or tombstone (never promotes) — both hold
}

// ── MUSTIE grounds — the JUDGED-retire rubric (recorded, never a silent GC) ───────────────────────────

/**
 * The MUSTIE deaccession grounds (the library-science rubric, narrowed to a sensorium): a retire RECORDS
 * one of these, so a tombstone always carries WHY it was judged. No byte-delete rides a retire (the bytes
 * GC later only through the explicit HITL `purge`; causal-islands: move-not-delete).
 *   superseded          — a newer pour stands in its place.
 *   irrelevant-to-recall — no recall traffic reaches it.
 *   elsewhere-recoverable — its content re-derives from a content-hash held elsewhere.
 */
export const MUSTIE_GROUNDS = ["superseded", "irrelevant-to-recall", "elsewhere-recoverable"] as const;
export type MustieGround = (typeof MUSTIE_GROUNDS)[number];

/** Does a raw value name a MUSTIE ground? (a retire refuses loud without one). */
export function isMustieGround(value: unknown): value is MustieGround {
  return typeof value === "string" && (MUSTIE_GROUNDS as readonly string[]).includes(value);
}

/** The recorded retirement — the grounds + when + the state to restore on un-retire (move-not-delete). */
export interface RetirementRecord {
  readonly grounds: MustieGround;
  readonly retiredAt: string;
  /** the lifecycle state the sensorium stood at BEFORE the tombstone — un-retire restores it. */
  readonly priorState: SensoriumLifecycleState;
}

/** Validate a raw retirement record; `null` when it does not parse (an absent/garbled record reads none). */
export function parseRetirementRecord(value: unknown): RetirementRecord | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (!isMustieGround(r.grounds)) return null;
  if (typeof r.retiredAt !== "string" || !r.retiredAt) return null;
  const prior = isLifecycleState(r.priorState) ? r.priorState : "durable";
  return { grounds: r.grounds, retiredAt: r.retiredAt, priorState: prior };
}

// ── the moded-autonomy seat grid (the TS mirror of the python VERB_SEATS) ─────────────────────────────

/**
 * The reversibility×trust GRID for the lifecycle verbs — the TS twin of the python `VERB_SEATS`
 * (lares_mcp.py), so an HITL verb refuses on BOTH surfaces (E5). Each entry is `[reversible,
 * trust_crossing]`; the seat follows: HOTL when reversible AND trusted, else HITL (the operator's hand).
 * The action-class read (Sheridan/Parasuraman adjustable autonomy):
 *   roster·inspect·reconcile·un-retire → HOTL  (out-of-loop reads + the reversible re-settle/restore)
 *   build                              → HOTL  (agent self-service, cattle-not-pets; a retire undoes it)
 *   promote·retire                     → HITL  (in-loop human: graduation is a designed one-way
 *                                               commitment; a retire is a judged deaccession)
 *   purge                              → HITL  (irreversible byte GC — explicit-only, no auto-reclaim)
 */
export const LIFECYCLE_SEATS: Readonly<Record<string, readonly [boolean, boolean]>> = {
  roster:     [true, false],
  inspect:    [true, false],
  reconcile:  [true, false],
  build:      [true, false],
  "un-retire":[true, false],
  promote:    [false, false], // graduation is a designed one-way commitment (hard-to-reverse by intent)
  retire:     [false, false], // a judged deaccession (undoable only by an explicit un-retire)
  purge:      [false, false], // irreversible byte reclaim
};

/** HOTL when a verb runs reversible AND trusted; HITL (needs the operator's hand) otherwise. */
export function seatOf(verb: string): "HOTL" | "HITL" {
  const seat = LIFECYCLE_SEATS[verb];
  if (!seat) return "HITL"; // an unknown verb seats conservatively — HITL by default
  const [reversible, trustCrossing] = seat;
  return reversible && !trustCrossing ? "HOTL" : "HITL";
}

/** Gate a verb by its seat: a HOTL verb passes freely; an HITL verb needs a truthy operator-approval
 *  capability. Throws when an HITL verb rides without one — the TS mirror of python `guard_hitl` (E5). */
export function guardHitl(verb: string, approval?: unknown): void {
  if (seatOf(verb) === "HITL" && !approval) {
    const seat = LIFECYCLE_SEATS[verb];
    const why = seat && !seat[0] ? "irreversible" : "trust-crossing";
    throw new Error(`${verb} sits HITL (${why}) — an operator-approval capability is required; a reversible verb (e.g. reconcile) needs none.`);
  }
}

// ── feature gates — capability present, signal/path unflipped ("there and unused") ────────────────────

/**
 * The lifecycle feature GATES — the not-yet-active paths ship as STABLE GROUND now, gated OFF, never
 * deferred (the no-lean-in-early-alpha discipline; the re-pour waits on stable ground, not the reverse).
 * Only a gate's real DATA-signal calibration waits on real recall traffic; its PLUMBING lands now.
 *   daemonLoopReconcile — the onHooAnu k8s-style continuous-reconcile cadence (F5's later path). OFF →
 *                         reconcile stays on-demand only; ON → the cadence reconciles every sensorium.
 *   storeSwapPromote    — the Sanity-style alias-indirection store-swap promote (F4's other path). OFF →
 *                         promote is the in-place field-flip; ON → `promote --store-swap` re-points an alias.
 *   hardeningSignalWired — the survivor-age SIGNAL feed (real recall-traffic → survivorAge). OFF →
 *                         survivorAge reads 0 (a reconcile never promotes); ON → traffic tenures a stage.
 *                         This gate's ON-calibration is the one genuine data-wait (F2/F6); the wiring is here.
 */
export interface LifecycleGates {
  readonly daemonLoopReconcile: boolean;
  readonly storeSwapPromote: boolean;
  readonly hardeningSignalWired: boolean;
}

/** The default gate posture — every not-yet-active path OFF (stable ground, unused until flipped). */
export const LIFECYCLE_GATES_DEFAULT: LifecycleGates = {
  daemonLoopReconcile: false,
  storeSwapPromote: false,
  hardeningSignalWired: false,
};
