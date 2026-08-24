/**
 * nexus-convergence-keyring.test.ts — the per-Nexus convergence-secret SOURCE (fork-② = A2) + the seal proofs.
 *
 * The load-bearing invariants proven against the REAL seal primitive (`sealBodyOnCas` / `openBodyOnCas`):
 *   · same content + same epoch  → same cid (per-Nexus, per-epoch dedup),
 *   · same content + DIFFERENT epoch-secret → DIFFERENT cid (rotation resets the dedup domain; no cross-epoch leak),
 *   · a body round-trips across an epoch boundary — seal at epoch N, seal the SAME body at epoch N+1, both open,
 *   · a member MISSING epoch-N's secret CANNOT re-derive an epoch-N body's read-cap (fail-closed, explicit throw),
 *   · admission delivers the FULL keyring → a fresh member reads a body sealed BEFORE it joined (the read-all invariant),
 *   · an EMPTY keyring fails closed (`current()` throws → no seal), a mis-sized / duplicate secret is refused.
 */
import { describe, test, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { sealBodyOnCas, openBodyOnCas, CONVERGENCE_SECRET_LEN } from "@lararium/mesh";
import {
  mintNexusSecret, makeNexusConvergenceKeyring, readCapForEpoch,
  type NexusEpochSecret,
} from "../src/nexus-convergence-keyring.js";

const enc = (s: string) => new TextEncoder().encode(s);
const body = enc("a private cad body the Nexus dedups within its own epoch");

// A stable two-epoch keyring — epoch 0 (genesis) + epoch 1 (a charter bump). A FULL member holds both.
const e0 = mintNexusSecret(0);
const e1 = mintNexusSecret(1);
const fullKeyring = makeNexusConvergenceKeyring([e0, e1]);

describe("per-Nexus, per-epoch dedup — the salt keys the cid domain", () => {
  test("current() names the NEWEST epoch held", () => {
    expect(fullKeyring.current().epoch).toBe(1);
    expect(fullKeyring.epochs).toEqual([0, 1]);
  });

  test("same content + same epoch → same cid; DIFFERENT epoch-secret → DIFFERENT cid", () => {
    const a = sealBodyOnCas(body, fullKeyring.forEpoch(1)!);
    const b = sealBodyOnCas(body, fullKeyring.forEpoch(1)!);
    expect(b.cid).toBe(a.cid);                                   // deterministic per-Nexus dedup
    const under0 = sealBodyOnCas(body, fullKeyring.forEpoch(0)!);
    expect(under0.cid).not.toBe(a.cid);                          // rotation resets the dedup domain
  });
});

describe("round-trip across an epoch boundary — every held epoch opens", () => {
  test("seal at epoch 0 AND epoch 1; both open with the epoch-matched read-cap", () => {
    const s0 = sealBodyOnCas(body, fullKeyring.forEpoch(0)!);
    const s1 = sealBodyOnCas(body, fullKeyring.forEpoch(1)!);
    expect(new TextDecoder().decode(openBodyOnCas(s0.ciphertext, s0.readCap))).toBe(new TextDecoder().decode(body));
    expect(new TextDecoder().decode(openBodyOnCas(s1.ciphertext, s1.readCap))).toBe(new TextDecoder().decode(body));
    // The epoch-gated re-derivation reproduces the read-cap for a member holding that epoch.
    expect(readCapForEpoch(body, 0, fullKeyring)).toEqual(s0.readCap);
    expect(readCapForEpoch(body, 1, fullKeyring)).toEqual(s1.readCap);
  });
});

describe("FAIL-CLOSED — a missing epoch never silently mis-reads", () => {
  test("a member missing epoch-0's secret CANNOT re-derive an epoch-0 body's read-cap (explicit throw)", () => {
    // A LATE joiner handed only epoch 1 (a torn / partial admission) — it lacks epoch 0.
    const lateKeyring = makeNexusConvergenceKeyring([e1]);
    expect(lateKeyring.forEpoch(0)).toBeUndefined();
    expect(() => readCapForEpoch(body, 0, lateKeyring)).toThrow(/epoch 0/);
  });

  test("an EMPTY keyring fails closed — current() throws, so nothing seals", () => {
    const empty = makeNexusConvergenceKeyring([]);
    expect(empty.epochs).toEqual([]);
    expect(() => empty.current()).toThrow(/EMPTY/);
  });

  test("a mis-sized secret and a duplicate epoch are REFUSED at the boundary", () => {
    const short: NexusEpochSecret = { epoch: 0, secret: new Uint8Array(randomBytes(CONVERGENCE_SECRET_LEN - 1)) };
    expect(() => makeNexusConvergenceKeyring([short])).toThrow(/MUST be exactly/);
    expect(() => makeNexusConvergenceKeyring([e0, mintNexusSecret(0)])).toThrow(/duplicate/);
    expect(() => mintNexusSecret(-1)).toThrow(/non-negative integer/);
  });
});

describe("the READ-ALL invariant — a fresh member reads a body sealed before it joined", () => {
  test("a body sealed at epoch 0 opens for a member handed the FULL {0,1} keyring after epoch 1", () => {
    // The producer sealed at epoch 0 (before the fresh member's admission at epoch 1).
    const sealedOld = sealBodyOnCas(body, e0.secret);
    // Admission delivers the WHOLE keyring — the fresh member holds epoch 0 too (read-all, not forward-only).
    const freshMember = makeNexusConvergenceKeyring([e0, e1]);
    const reDerivedCap = readCapForEpoch(body, 0, freshMember);
    expect(new TextDecoder().decode(openBodyOnCas(sealedOld.ciphertext, reDerivedCap))).toBe(new TextDecoder().decode(body));
  });
});
