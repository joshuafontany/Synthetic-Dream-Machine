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
