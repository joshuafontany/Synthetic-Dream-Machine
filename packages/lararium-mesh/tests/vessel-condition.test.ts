/**
 * THE READINESS CONTRACT — the shape a vessel's standing reports in, everywhere it reports.
 *
 * ── WHY THIS FILE DECLARES A SHAPE THAT DID NOT EXIST ────────────────────────────────────────────────────
 * A boolean `up` carried the whole reading, and a boolean holds two states where a booting process passes
 * through four. So the honest detail went somewhere a boolean could not contradict it — a free-text note —
 * and the two disagreed in the operator's terminal: `up: false` beside "attested vessel-ready". A caller
 * reading the flag saw a broken boot; a human reading the note saw a healthy one. Both were reading the
 * same vessel.
 *
 * The art settles this the same way from three directions, and the agreement is the point:
 *
 *   · systemd `Type=notify` — READY fires LAST, from the process that bound the socket. A service manager
 *     that reports on `exec` alone "will report success even if the service's binary cannot be invoked".
 *     Readiness is a claim only the binder may make, and only after binding.
 *   · Kubernetes conditions — `True | False | Unknown` plus a machine `reason` and a human `message`, with
 *     `Ready` and `Progressing` held as SEPARATE conditions so "coming up healthily" never collapses into
 *     "up". `Unknown` is the state a boolean cannot spell.
 *   · Health Check RFC (draft-inadarei-api-health-check) — `pass | warn | fail`, where `warn` returns a
 *     SUCCESS status and carries additional information. Serving-but-impaired is its own verdict.
 *
 * ── THE FOUR STATES, AND WHY EACH EARNS ITS NAME ─────────────────────────────────────────────────────────
 * `standing`  — the socket accepts. The only state that may claim ready.
 * `rising`    — started, no fault, not yet accepting. Kubernetes' `Unknown`; systemd's window before READY.
 * `degraded`  — serving, but impaired in a named way. The RFC's `warn`: a vessel whose verb socket refused
 *               to bind still carries, routes, and serves the public shelf. Reporting it `down` would tell
 *               an operator to restart a vessel that is doing most of its job.
 * `down`      — not serving.
 *
 * ── THE LAW THIS FILE ENFORCES ───────────────────────────────────────────────────────────────────────────
 * `ok` is DERIVED, never written. The bug was possible only because two hands wrote two fields; a reading
 * that computes `ok` from `state` cannot contradict itself, whatever the message says.
 */

import { describe, test, expect } from "vitest";
import {
  vesselCondition, conditionOk, conditionExit,
  type VesselCondition, type VesselState,
} from "../src/vessel-condition.js";

describe("the readiness contract — four states, one derived verdict", () => {
  test("every state names itself, and `ok` derives from the state alone", () => {
    const states: VesselState[] = ["standing", "rising", "degraded", "down"];
    // VACUITY GATE FIRST. An assertion over a set the module does not carry would pass by iterating nothing.
    expect(states.length).toBe(4);
    for (const state of states) {
      const c = vesselCondition({ state, reason: "probe", message: "m" });
      expect(c.state).toBe(state);
      // The ONE claim: ok is a function of state. Never a field a caller may set.
      expect(conditionOk(c)).toBe(state === "standing");
    }
  });

  test("a caller CANNOT write `ok` — the field the bug needed does not exist", () => {
    const c = vesselCondition({ state: "rising", reason: "socket-silent", message: "still binding" });
    expect((c as unknown as Record<string, unknown>)["ok"]).toBeUndefined();
    expect(Object.isFrozen(c)).toBe(true);
  });

  test("RISING reads apart from DOWN — the state a boolean could not spell", () => {
    const rising = vesselCondition({ state: "rising",   reason: "socket-silent",  message: "attested, not yet accepting" });
    const down   = vesselCondition({ state: "down",     reason: "never-started",  message: "nothing answered" });
    expect(conditionOk(rising)).toBe(false);
    expect(conditionOk(down)).toBe(false);
    // ...and a caller can still tell them apart, which is the whole reason the state exists.
    expect(rising.state).not.toBe(down.state);
    expect(conditionExit(rising)).not.toBe(conditionExit(down));
  });

  test("DEGRADED serves — a refused verb socket must not read as a dead vessel", () => {
    const c = vesselCondition({
      state: "degraded", reason: "uds-refused",
      message: "listen EINVAL — the socket path exceeds the platform budget",
    });
    expect(conditionOk(c)).toBe(false);        // not ready for a verb
    expect(c.state).toBe("degraded");          // ...but distinctly not `down`
    expect(conditionExit(c)).toBe(EXIT_PARTIAL);
  });

  test("every condition carries a MACHINE reason and a HUMAN message, kept apart", () => {
    const c = vesselCondition({ state: "degraded", reason: "uds-refused", message: "listen EINVAL: path too long" });
    // The reason is what a caller BRANCHES on: stable, lowercase, hyphenated, no prose, no punctuation.
    expect(c.reason).toMatch(/^[a-z][a-z0-9-]*$/);
    // The message is what a human READS: free text, and never the thing code keys on.
    expect(c.message.length).toBeGreaterThan(0);
    expect(c.reason).not.toBe(c.message);
  });

  test("a reason that would be read as prose REFUSES — the branch surface stays stable", () => {
    for (const bad of ["UDS Refused", "uds refused", "uds_refused", "listen EINVAL: nope", ""]) {
      expect(() => vesselCondition({ state: "down", reason: bad, message: "m" })).toThrow(/reason/i);
    }
  });
});

describe("the law: a note may never outrank the verdict", () => {
  test("a READY message on a not-standing state REFUSES to mint", () => {
    // THE EXACT BUG, as a gate. `up:false` beside "attested vessel-ready" cannot be constructed here:
    // a condition that is not `standing` may not carry a message claiming readiness.
    for (const state of ["rising", "degraded", "down"] as VesselState[]) {
      expect(() => vesselCondition({ state, reason: "probe", message: "attested vessel-ready" }))
        .toThrow(/ready/i);
    }
    // ...and the same words ride fine on the state that earns them.
    expect(() => vesselCondition({ state: "standing", reason: "accepting", message: "attested vessel-ready" }))
      .not.toThrow();
  });
});

describe("readiness is the BINDER's claim, made after the bind", () => {
  test("attested-but-not-accepting reads RISING, never standing", () => {
    // systemd's whole reason for `Type=notify`: an attestation that precedes the bind attests a lie.
    const c = readVesselStanding({ attested: true, accepting: false, refusal: null, started: true });
    expect(c.state).toBe("rising");
    expect(conditionOk(c)).toBe(false);
  });

  test("accepting AND attested reads STANDING — both, never either", () => {
    expect(readVesselStanding({ attested: true, accepting: true, refusal: null, started: true }).state).toBe("standing");
    // Accepting without an attestation is not readiness either: the vessel never said it was up.
    expect(readVesselStanding({ attested: false, accepting: true, refusal: null, started: true }).state).toBe("rising");
  });

  test("a NAMED refusal outranks patience — it reads DEGRADED at once, carrying the cause", () => {
    // The 120s poll spent its whole deadline against a bind that had already refused. A refusal is a
    // verdict, never a slow success, so it must never wait.
    const c = readVesselStanding({
      attested: true, accepting: false, started: true,
      refusal: "listen EINVAL: invalid argument /very/deep/path/lares.sock",
    });
    expect(c.state).toBe("degraded");
    expect(c.reason).toBe("uds-refused");
    expect(c.message).toContain("EINVAL");
  });

  test("a vessel that never started reads DOWN, and never degraded", () => {
    // kubelet suppresses log-scraping for ContainerCannotRun; systemd carves out 203/EXEC. A process that
    // never ran has no impairment to report — it has an absence.
    const c = readVesselStanding({ attested: false, accepting: false, refusal: null, started: false });
    expect(c.state).toBe("down");
    expect(c.reason).toBe("never-started");
  });
});

describe("exit codes carry the same four states outward", () => {
  test("standing 0 · rising and degraded 3 · down 1", () => {
    expect(conditionExit(vesselCondition({ state: "standing", reason: "accepting",     message: "m" }))).toBe(0);
    expect(conditionExit(vesselCondition({ state: "rising",   reason: "socket-silent", message: "m" }))).toBe(EXIT_PARTIAL);
    expect(conditionExit(vesselCondition({ state: "degraded", reason: "uds-refused",   message: "m" }))).toBe(EXIT_PARTIAL);
    expect(conditionExit(vesselCondition({ state: "down",     reason: "never-started", message: "m" }))).toBe(1);
  });
});

describe("the machine envelope carries a version from its first day", () => {
  test("every condition names a format version", () => {
    // Terraform's two rules, adopted before a second reader exists: ignore unknown properties within a
    // major, reject an unsupported major. Retrofitting this after a browser and an MCP client both parse
    // the payload costs an order of magnitude more than carrying it now.
    const c = vesselCondition({ state: "standing", reason: "accepting", message: "m" });
    expect(c.formatVersion).toMatch(/^\d+\.\d+$/);
  });
});

// Imported below the suites that describe them, so a reader meets the CONTRACT before the machinery.
import { readVesselStanding, EXIT_PARTIAL } from "../src/vessel-condition.js";
export type { VesselCondition };
