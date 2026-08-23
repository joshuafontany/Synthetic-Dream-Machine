/**
 * delegate-revoke.test.ts — the concap round-trip: delegate → verify → revoke → denied.
 *
 * Two real KeyhiveProviders (party A = grantor, party B = audience) exchange contact cards,
 * A delegates read on a bag to B, verifies it, then REVOKES it (the D.3 bridge to Keyhive's
 * live revokeMember) and confirms access is gone. Proves both delegate() and the newly-wired
 * revoke() end-to-end against the real keyhive 0.1.0 WASM (the probe pattern, in-process).
 */

import { describe, test, expect } from "vitest";
import { KeyhiveProvider } from "@lararium/keyhive";

const memStore = () => ({ put: async () => {}, list: async () => [] });
const BAG = "lar:///ha.ka.ba/bags/test/delegate-revoke";

describe("keyhive delegate → verify → revoke (concap round-trip)", () => {
  test("a revoked delegation loses access; re-revoke fails loud", async () => {
    const A = new KeyhiveProvider();
    const B = new KeyhiveProvider();
    await A.init({ seed: new Uint8Array(32).fill(7), eventStore: memStore() });
    await B.init({ seed: new Uint8Array(32).fill(9), eventStore: memStore() });
    try {
      // B introduces itself; A learns B's agent.
      const { id: bId } = await A.receiveContactCard(await B.contactCard());
      await A.registerBag(BAG);

      // A delegates read on the bag to B.
      const { delegationId } = await A.delegate({ audience: bId, bagUrl: BAG, access: "read" });
      expect((await A.verify({ presenter: bId, bagUrl: BAG, access: "read" })).ok).toBe(true);

      // A revokes it — the wired revoke() → Keyhive revokeMember.
      const { bytes } = await A.revoke(delegationId);
      expect(bytes.length).toBeGreaterThan(0);

      // Access is gone after revocation.
      expect((await A.verify({ presenter: bId, bagUrl: BAG, access: "read" })).ok).toBe(false);

      // Re-revoke fails loud (local tracking dropped on revoke).
      await expect(A.revoke(delegationId)).rejects.toThrow(/unknown delegationId/);
    } finally {
      await A.dispose();
      await B.dispose();
    }
  });

  test("revoke() of an unknown delegationId fails loud", async () => {
    const A = new KeyhiveProvider();
    await A.init({ seed: new Uint8Array(32).fill(7), eventStore: memStore() });
    try {
      await expect(A.revoke("deadbeef")).rejects.toThrow(/unknown delegationId/);
    } finally {
      await A.dispose();
    }
  });
});
