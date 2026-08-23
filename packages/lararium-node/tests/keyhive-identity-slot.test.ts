/**
 * keyhive-identity-slot.test.ts — the pono IdentitySlot against the real WASM.
 *
 * KeyhiveIdentitySlot routes verifyCapability through a real KeyhiveProvider's
 * accessForDoc barrier. These four cases are the proof the OpenIdentitySlot stub
 * could NEVER give (it returns `true` unconditionally):
 *   · granted-valid — a delegated presenter clears.
 *   · denied-forged — a DID never delegated is denied (the crypto floor).
 *   · revoked       — a revoked delegation loses access.
 *   · edit⇒admin    — a read-only delegation does not satisfy an "edit" ask.
 *
 * Mirrors delegate-revoke.test.ts: two real KeyhiveProviders exchange contact
 * cards, party A grants, the slot for party B verifies. In-process, real
 * keyhive 0.1.0 WASM — no crypto stubbed.
 */

import { describe, test, expect } from "vitest";
import { KeyhiveProvider, KeyhiveIdentitySlot } from "@lararium/keyhive";

const memStore = () => ({ put: async () => {}, list: async () => [] });
const BAG = "lar:///ha.ka.ba/bags/test/keyhive-identity-slot";

describe("KeyhiveIdentitySlot — real capability barrier behind the IdentitySlot interface", () => {
  test("granted delegation clears; forged/never-granted DID denied", async () => {
    const A = new KeyhiveProvider();  // grantor
    const B = new KeyhiveProvider();  // delegated audience
    const C = new KeyhiveProvider();  // known agent, NEVER delegated (the forge)
    await A.init({ seed: new Uint8Array(32).fill(7), eventStore: memStore() });
    await B.init({ seed: new Uint8Array(32).fill(9), eventStore: memStore() });
    await C.init({ seed: new Uint8Array(32).fill(11), eventStore: memStore() });
    try {
      const { id: bId } = await A.receiveContactCard(await B.contactCard());
      const { id: cId } = await A.receiveContactCard(await C.contactCard());
      await A.registerBag(BAG);
      await A.delegate({ audience: bId, bagUrl: BAG, access: "read" });

      const slotB = new KeyhiveIdentitySlot({ provider: A, did: bId });
      const slotC = new KeyhiveIdentitySlot({ provider: A, did: cId });

      // granted-valid: the delegated audience clears the real barrier.
      expect(await slotB.verifyCapability(BAG, "read")).toBe(true);

      // denied-forged: a known agent that was never delegated is denied.
      expect(await slotC.verifyCapability(BAG, "read")).toBe(false);
    } finally {
      await A.dispose();
      await B.dispose();
      await C.dispose();
    }
  });

  test("a revoked delegation loses verifyCapability", async () => {
    const A = new KeyhiveProvider();
    const B = new KeyhiveProvider();
    await A.init({ seed: new Uint8Array(32).fill(7), eventStore: memStore() });
    await B.init({ seed: new Uint8Array(32).fill(9), eventStore: memStore() });
    try {
      const { id: bId } = await A.receiveContactCard(await B.contactCard());
      await A.registerBag(BAG);
      const { delegationId } = await A.delegate({ audience: bId, bagUrl: BAG, access: "read" });

      const slotB = new KeyhiveIdentitySlot({ provider: A, did: bId });
      expect(await slotB.verifyCapability(BAG, "read")).toBe(true);

      await A.revoke(delegationId);
      expect(await slotB.verifyCapability(BAG, "read")).toBe(false);
    } finally {
      await A.dispose();
      await B.dispose();
    }
  });

  test("edit ⇒ admin: a read-only delegation does not satisfy an edit ask", async () => {
    const A = new KeyhiveProvider();
    const B = new KeyhiveProvider();
    await A.init({ seed: new Uint8Array(32).fill(7), eventStore: memStore() });
    await B.init({ seed: new Uint8Array(32).fill(9), eventStore: memStore() });
    try {
      const { id: bId } = await A.receiveContactCard(await B.contactCard());
      await A.registerBag(BAG);
      await A.delegate({ audience: bId, bagUrl: BAG, access: "read" });

      const slotB = new KeyhiveIdentitySlot({ provider: A, did: bId });
      // read clears...
      expect(await slotB.verifyCapability(BAG, "read")).toBe(true);
      // ...but the same read grant does NOT satisfy "edit" (→ admin rung).
      expect(await slotB.verifyCapability(BAG, "edit")).toBe(false);
    } finally {
      await A.dispose();
      await B.dispose();
    }
  });
});
