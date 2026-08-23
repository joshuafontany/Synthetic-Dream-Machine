/**
 * vessel-condition — the shape a vessel's standing reports in, on every surface that reports it.
 *
 * ── WHY A CONDITION AND NOT A BOOLEAN ────────────────────────────────────────────────────────────────────
 * A booting vessel passes through four states and a boolean spells two. So the states a boolean cannot hold
 * go somewhere it cannot contradict them — a free-text note — and the two disagree in the same breath:
 * `up: false` beside "attested vessel-ready". A caller branching on the flag reads a broken boot; a human
 * reading the note reads a healthy one; both read the same vessel, and neither is wrong about what they
 * were handed.
 *
 * Three bodies of practice answer this identically, which is the reason to trust the answer:
 *
 *   · systemd `Type=notify` — READY is the BINDER's claim, made after the bind. A manager reporting on exec
 *     alone "will report success even if the service's binary cannot be invoked successfully".
 *   · Kubernetes conditions — `True | False | Unknown`, a machine `reason` beside a human `message`, and
 *     `Ready` held APART from `Progressing` so coming-up-healthily never collapses into up.
 *   · Health Check RFC — `pass | warn | fail`, where `warn` returns success and carries the impairment.
 *
 * ── THE LAW ──────────────────────────────────────────────────────────────────────────────────────────────
 * `ok` DERIVES from `state`. The bug needed two hands writing two fields; one reading computed from one
 * field cannot contradict itself however the prose reads. Nothing here exposes an `ok` to write.
 *
 * The constructor REFUSES the two shapes that let the fault back in: a reason a caller cannot branch on,
 * and a message claiming readiness on a state that has not earned it. A fault that cannot be constructed
 * needs no discipline to avoid.
 */

/** The `pass`/`warn`/`fail` ladder, widened by one: the state a boolean cannot spell. */
export type VesselState =
  /** The socket accepts. The only state that may claim ready. */
  | "standing"
  /** Started, no fault, not yet accepting — Kubernetes' `Unknown`, systemd's pre-READY window. */
  | "rising"
  /** Serving, impaired in a named way. The RFC's `warn`: still carrying, still routing. */
  | "degraded"
  /** Not serving. */
  | "down";

/**
 * Machine envelope version, carried from the first day rather than retrofitted.
 *
 * Terraform's two rules ride with it: ignore unknown properties within a major, reject an unsupported
 * major. A payload two independent readers already parse costs an order of magnitude more to version later.
 */
export const CONDITION_FORMAT_VERSION = "1.0";

/** Partial success — the vessel moved, and did not arrive. Distinct from both 0 and 1. */
export const EXIT_PARTIAL = 3;

/** A reason names a BRANCH, so it stays a stable token: lowercase, hyphen-joined, no prose, no punctuation. */
const REASON_FORM = /^[a-z][a-z0-9-]*$/;

/** Prose that claims readiness. Only `standing` earns it. */
const CLAIMS_READY = /\bready\b/i;

export interface VesselCondition {
  readonly state:         VesselState;
  /** What a caller BRANCHES on — stable across wordings. */
  readonly reason:        string;
  /** What a human READS. Never the thing code keys on. */
  readonly message:       string;
  readonly formatVersion: string;
}

/**
 * Mint a condition, refusing the two shapes that let the contradiction back in.
 *
 * A reason carrying prose would push callers onto the message, and a message is where wording drifts — so
 * the branch surface would rot silently. A ready-claiming message on a not-standing state IS the original
 * bug, so it refuses at the only moment anything can still be done about it.
 */
export function vesselCondition(
  input: { state: VesselState; reason: string; message: string },
): VesselCondition {
  if (!REASON_FORM.test(input.reason)) {
    throw new Error(
      `vessel-condition: reason "${input.reason}" must read as a branch token (lowercase, hyphen-joined) — `
      + "prose belongs in the message, where no caller keys on it",
    );
  }
  if (input.state !== "standing" && CLAIMS_READY.test(input.message)) {
    throw new Error(
      `vessel-condition: a "${input.state}" condition may not carry a message claiming ready `
      + `("${input.message}") — a note that outranks its verdict is the fault this type exists to refuse`,
    );
  }
  return Object.freeze({
    state:         input.state,
    reason:        input.reason,
    message:       input.message,
    formatVersion: CONDITION_FORMAT_VERSION,
  });
}

/** Ready, derived. The one question every surface asks, answered from `state` and nothing else. */
export function conditionOk(c: VesselCondition): boolean {
  return c.state === "standing";
}

/** The same four states, carried outward to a shell: arrived · moved-but-not-arrived · absent. */
export function conditionExit(c: VesselCondition): number {
  if (c.state === "standing") return 0;
  if (c.state === "down")     return 1;
  return EXIT_PARTIAL;
}

/**
 * Read a standing from what the supervisor actually observed.
 *
 * ORDER CARRIES THE MEANING. A NAMED REFUSAL OUTRANKS PATIENCE: a bind that answered EINVAL is a verdict,
 * never a slow success, and waiting on it spends a cold-boot-generous deadline against an answer already
 * given. That single inversion turned a 120-second silence into a 3-second cure.
 *
 * A vessel that never started reads `down`, never `degraded` — kubelet suppresses its log-scrape for
 * ContainerCannotRun and systemd carves out 203/EXEC for the same reason: a process that never ran holds no
 * impairment to report, only an absence.
 *
 * `attested && accepting` earns `standing`, and neither alone does. An attestation before the bind attests
 * a lie; a socket accepting before the vessel said it was up has not yet claimed anything.
 */
export function readVesselStanding(
  obs: { started: boolean; attested: boolean; accepting: boolean; refusal: string | null },
): VesselCondition {
  if (!obs.started) {
    return vesselCondition({ state: "down", reason: "never-started", message: "nothing answered, and nothing was spawned" });
  }
  if (obs.refusal) {
    return vesselCondition({ state: "degraded", reason: "uds-refused", message: `the verb socket refused to bind: ${obs.refusal}` });
  }
  if (obs.attested && obs.accepting) {
    return vesselCondition({ state: "standing", reason: "accepting", message: "attested vessel-ready, and the verb socket answers" });
  }
  return vesselCondition({
    state: "rising", reason: "socket-silent",
    message: obs.attested
      ? "attested, and the verb socket has not answered yet — read again"
      : "started, and no attestation has landed yet — read again",
  });
}
