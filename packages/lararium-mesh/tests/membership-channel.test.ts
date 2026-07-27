/**
 * membership-channel — the shore the WHO-plane ceremony crosses. Tests the
 * reference (in-memory) impl's routing contract: address vessel→vessel, deliver-once,
 * broadcast-to-others, never-to-self. The file/WS impls must satisfy the same contract.
 */
import { describe, test, expect } from "vitest";
import {
  InMemoryMembershipChannel, MEMBERSHIP_BROADCAST,
  type MembershipEnvelope,
} from "../src/index.js";

const env = (kind: string, from: string, to: string, payload: unknown = {}): MembershipEnvelope =>
  ({ kind, from, to, payload });

describe("InMemoryMembershipChannel — the deliver-once routing contract", () => {
  test("delivers an addressed envelope to its recipient, once", async () => {
    const ch = new InMemoryMembershipChannel();
    await ch.offer(env("contact-card", "alice", "bob", { card: "A" }));
    const first = await ch.poll("bob");
    expect(first).toHaveLength(1);
    expect(first[0].kind).toBe("contact-card");
    expect((first[0].payload as { card: string }).card).toBe("A");
    // consumed — a second poll sees nothing new
    expect(await ch.poll("bob")).toHaveLength(0);
  });

  test("a sender never receives its own envelope", async () => {
    const ch = new InMemoryMembershipChannel();
    await ch.offer(env("join-request", "alice", "bob"));
    expect(await ch.poll("alice")).toHaveLength(0);
  });

  test("does not deliver an envelope to a third party it was not addressed to", async () => {
    const ch = new InMemoryMembershipChannel();
    await ch.offer(env("admit", "founder", "bob"));
    expect(await ch.poll("carol")).toHaveLength(0);
    expect(await ch.poll("bob")).toHaveLength(1);
  });

  test("broadcast reaches every OTHER participant once, never the sender", async () => {
    const ch = new InMemoryMembershipChannel();
    await ch.offer(env("invite", "founder", MEMBERSHIP_BROADCAST, { place: "cabal" }));
    expect(await ch.poll("bob")).toHaveLength(1);
    expect(await ch.poll("carol")).toHaveLength(1);
    expect(await ch.poll("founder")).toHaveLength(0);   // not to self
    // deliver-once — bob already drained it
    expect(await ch.poll("bob")).toHaveLength(0);
  });

  test("an envelope offered AFTER a poll is caught on the next poll (cursor advances, no loss)", async () => {
    const ch = new InMemoryMembershipChannel();
    await ch.offer(env("contact-card", "alice", "bob"));
    await ch.poll("bob");                               // drains the first
    await ch.offer(env("admit", "founder", "bob"));     // arrives later
    const next = await ch.poll("bob");
    expect(next).toHaveLength(1);
    expect(next[0].kind).toBe("admit");
  });
});
