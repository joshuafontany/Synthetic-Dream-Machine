/**
 * epoch-lease — the coordinator-free max-register lease epoch.
 *
 * Proves the load-bearing safety property: the effective epoch is the MAX over per-writer
 * slots, so it never decreases — a concurrent lower slot cannot pull a revoked grant back to
 * life (the failure a bare Automerge-LWW scalar would allow). Meme:
 * lar:///ha.ka.ba/@lares/v0.1/api/pono/convergent-mesh#two-revocation-modes
 */

import { describe, test, expect } from "vitest";
import {
  leaseEpochPrefix,
  leaseEpochSlotUri,
  effectiveLeaseEpoch,
  rolledLeaseEpoch,
} from "../src/epoch-lease.js";

describe("epoch-lease — coordinator-free max-register", () => {
  test("effectiveLeaseEpoch = max over slots; empty → 0", () => {
    expect(effectiveLeaseEpoch([])).toBe(0);
    expect(effectiveLeaseEpoch(["3", "7", "5"])).toBe(7);
  });

  test("invalid slots are ignored (untrusted CRDT input never throws)", () => {
    expect(effectiveLeaseEpoch(["3", null, undefined, "x", "1.5", "9"])).toBe(9);
    expect(effectiveLeaseEpoch([null, undefined, "nope"])).toBe(0);
  });

  test("max NEVER decreases — a concurrent lower slot can't pull the lease back", () => {
    // writer A rolled to 5; writer B still sits at 3 → effective 5, never 3
    expect(effectiveLeaseEpoch(["5", "3"])).toBe(5);
    // the concurrent-roll collapse is fine: both write 5 in their own slots → still 5
    expect(effectiveLeaseEpoch(["5", "5"])).toBe(5);
  });

  test("rolledLeaseEpoch = effective + 1", () => {
    expect(rolledLeaseEpoch(0)).toBe(1);
    expect(rolledLeaseEpoch(7)).toBe(8);
  });

  test("slot URIs are prefix-scannable + charset-safe (resource/writer may carry slashes)", () => {
    const resource = "lar:///ha.ka.ba/@wiki/foo";
    const prefix = leaseEpochPrefix(resource);
    const slot = leaseEpochSlotUri(resource, "0xabc/def");
    expect(slot.startsWith(prefix)).toBe(true);   // the verb scans the prefix to gather slots
    expect(slot).not.toContain(" ");
    // two writers, distinct slots under one resource prefix
    const slotB = leaseEpochSlotUri(resource, "0x999");
    expect(slotB.startsWith(prefix)).toBe(true);
    expect(slot).not.toBe(slotB);
  });
});
