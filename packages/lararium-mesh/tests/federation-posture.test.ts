/**
 * federation-posture.test.ts — the open-beta POSTURE outer gate over cross-operator admission.
 *
 * Proven (pure):
 *   · PRIVATE denies a cross-Nexus (non-member) foreign operator; PRIVATE admits a SAME-Nexus member,
 *   · OPEN admits any proof-carrying foreign operator (membership irrelevant to the public tier),
 *   · the classify FLOOR still gates: NO proof-of-possession → DENY in BOTH postures,
 *   · `admitCrossOperatorUnderPosture` composes the posture (outer) with `classifyCrossOperatorAdmission` (inner)
 *     and NEVER upgrades the class beyond the bounded federatable-carry tier (never a private plane).
 */
import { describe, test, expect } from "vitest";
import {
  postureGatesCrossOperator, admitCrossOperatorUnderPosture, classifyCrossOperatorAdmission,
  DEFAULT_FEDERATION_POSTURE,
} from "../src/federation-gate.js";

describe("postureGatesCrossOperator — the outer stance", () => {
  test("PRIVATE admits a member, denies a non-member", () => {
    expect(postureGatesCrossOperator("private", true)).toBe(true);
    expect(postureGatesCrossOperator("private", false)).toBe(false);
  });
  test("OPEN admits regardless of membership", () => {
    expect(postureGatesCrossOperator("open", true)).toBe(true);
    expect(postureGatesCrossOperator("open", false)).toBe(true);
  });
  test("the fail-closed default is PRIVATE", () => {
    expect(DEFAULT_FEDERATION_POSTURE).toBe("private");
  });
});

describe("admitCrossOperatorUnderPosture — compose posture (outer) with classify (inner)", () => {
  test("PRIVATE + non-member → DENY even a valid proof-carrying foreign operator", () => {
    const v = admitCrossOperatorUnderPosture({ proofVerified: true, posture: "private", isNexusMember: false });
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/private/);
  });
  test("PRIVATE + member → admit at the bounded federatable-carry tier", () => {
    const v = admitCrossOperatorUnderPosture({ proofVerified: true, posture: "private", isNexusMember: true });
    expect(v.ok).toBe(true);
    expect(v.peerClass).toBe("cross-operator");   // never a private-plane class
  });
  test("OPEN + non-member → admit (the prior bounded public-carry)", () => {
    const v = admitCrossOperatorUnderPosture({ proofVerified: true, posture: "open", isNexusMember: false });
    expect(v.ok).toBe(true);
    expect(v.peerClass).toBe("cross-operator");
  });

  test("the classify FLOOR still gates: NO proof → DENY in BOTH postures", () => {
    for (const posture of ["private", "open"] as const) {
      for (const isNexusMember of [true, false]) {
        const v = admitCrossOperatorUnderPosture({ proofVerified: false, posture, isNexusMember });
        expect(v.ok).toBe(false);
      }
    }
  });

  test("open + member matches the plain classify verdict's class (never a private-plane upgrade)", () => {
    const posture = admitCrossOperatorUnderPosture({ proofVerified: true, posture: "open", isNexusMember: true });
    const plain   = classifyCrossOperatorAdmission(true);
    expect(posture.peerClass).toBe(plain.peerClass);
  });
});
