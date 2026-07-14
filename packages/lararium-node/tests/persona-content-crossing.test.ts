/**
 * persona-content-crossing.test.ts — the @catalog base layer: a human's second vessel reads its
 * PersonaGroup content, end to end through KeyhiveProvider.
 *
 * This is the pono foundation the DreamNet human layer stands on: content encrypted into a PersonaGroup doc
 * is readable by every vessel the human has admitted, decrypting with its OWN prekey secret — nothing secret
 * crosses the wire. The crossing is transport, not crypto. The second test pins the load-bearing discipline:
 * keyhive read is FORWARD-ONLY, so the founder MUST add the reader before encrypting.
 */
import { describe, test, expect } from "vitest";
import { KeyhiveProvider, InMemoryEventStore } from "@lararium/keyhive";

const noopStore = { put: async () => {}, list: async () => [] };
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);

async function makeVessel(fill: number): Promise<KeyhiveProvider> {
  const p = new KeyhiveProvider();
  await p.init({ seed: seedOf(fill), eventStore: noopStore });
  return p;
}

/** Founder learns the device, device learns the founder — returns the device's agent id (founder's view). */
async function introduce(founder: KeyhiveProvider, device: KeyhiveProvider): Promise<string> {
  const { id: deviceAgentId } = await founder.receiveContactCard(await device.contactCard());
  await device.receiveContactCard(await founder.contactCard());
  return deviceAgentId;
}

const BAG = "lar:///ha.ka.ba/bags/@catalog/a-note";

describe("@catalog crossing — the human's second vessel reads its PersonaGroup content", () => {
  test("add-before-encrypt: the joinee vessel decrypts content, no secret in transit", async () => {
    const founder = await makeVessel(1);
    const device  = await makeVessel(100);   // the human's second vessel, its own key
    const deviceAgentId = await introduce(founder, device);

    const { docId } = await founder.registerBag(BAG);
    // ADD the reader BEFORE encrypting — forward-only read demands it.
    await founder.delegate({ bagUrl: BAG, audience: deviceAgentId, access: "read" });
    // ENCRYPT after the add — the fresh PCS op keys the content to the device's leaf.
    const PLAINTEXT = new TextEncoder().encode("a note only the human's own vessels may read");
    const ciphertext = await founder.encryptContent(BAG, PLAINTEXT);
    // Capture the public events AFTER the encrypt — they carry the PCS update op.
    const events = await founder.eventsForPeer(deviceAgentId);

    // Joinee adopts the founder's docId (never mints its own), ingests public events, decrypts.
    device.adoptBag(BAG, docId);
    await device.ingestPeerEvents(events);
    const recovered = await device.decryptContent(BAG, ciphertext);

    expect(new TextDecoder().decode(recovered)).toBe(new TextDecoder().decode(PLAINTEXT));
  });

  test("@daemon+hydrate routing: the joinee becomes a member via the event STORE, not a direct array", async () => {
    // The production transport writes the founder's membership events into the joinee's @daemon and
    // `hydrateFromEventStore` ingests them at boot. This proves that store-routed path establishes membership
    // exactly as the peer-to-peer shortcut did — closing the last blast-radius unknown before wiring.
    const founder = await makeVessel(5);
    const joineeStore = new InMemoryEventStore();
    const joinee = new KeyhiveProvider();
    await joinee.init({ seed: seedOf(104), eventStore: joineeStore });

    // Founder learns the joinee (needs its keyhive card to add it to the PersonaGroup).
    const { id: joineeAgentId } = await founder.receiveContactCard(await joinee.contactCard());
    await joinee.receiveContactCard(await founder.contactCard());

    const pg = await founder.createSentinelDoc("lar:///ha.ka.ba/sentinel/pg-hydrate");
    await founder.addSentinelMember(joineeAgentId, pg.docIdHex);
    const { docId } = await founder.registerBag(BAG);
    await founder.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });
    const ciphertext = await founder.encryptContent(BAG, new TextEncoder().encode("read via hydrate from the @daemon store"));

    // Transport: the founder's membership events land in the joinee's event STORE (the @daemon path).
    const memberEvents = await founder.eventsForPeer(joineeAgentId);
    let i = 0;
    for (const bytes of memberEvents) await joineeStore.put({ hash: `evt-${i++}`, variant: "cap", bytes });

    // The joinee hydrates from the store — the production boot path, NOT a direct ingestPeerEvents.
    joinee.adoptBag(BAG, docId);
    // The store also holds the joinee's OWN init events, so it ingests at least the membership ones.
    const { ingested } = await joinee.hydrateFromEventStore();
    expect(ingested).toBeGreaterThanOrEqual(memberEvents.length);
    const recovered = await joinee.decryptContent(BAG, ciphertext);
    expect(new TextDecoder().decode(recovered)).toContain("hydrate");
  });

  test("transitive: a vessel in the PersonaGroup reads a bag the PersonaGroup holds (production topology)", async () => {
    // Production admits vessels into the PersonaGroup and delegates BAGS to the PersonaGroup — not each
    // vessel to each bag. This proves a member of the group-that-holds-the-bag decrypts the bag's content.
    const founder = await makeVessel(4);
    const device  = await makeVessel(103);
    const deviceAgentId = await introduce(founder, device);

    // The PersonaGroup as a sentinel Document; add the device vessel to it BEFORE any encrypt (forward-only).
    const pg = await founder.createSentinelDoc("lar:///ha.ka.ba/sentinel/persona-group-x");
    await founder.addSentinelMember(deviceAgentId, pg.docIdHex);

    // The bag delegates to the PersonaGroup AGENT — the production topology (bag member = the group).
    const { docId } = await founder.registerBag(BAG);
    await founder.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });

    const PLAINTEXT = new TextEncoder().encode("read via PersonaGroup membership, transitively");
    const ciphertext = await founder.encryptContent(BAG, PLAINTEXT);

    device.adoptBag(BAG, docId);
    await device.ingestPeerEvents(await founder.eventsForPeer(deviceAgentId));
    const recovered = await device.decryptContent(BAG, ciphertext);
    expect(new TextDecoder().decode(recovered)).toBe(new TextDecoder().decode(PLAINTEXT));
  });

  test("burning a handle forfeits access to NEW shared docs — ShadowTalk, made cryptographic", async () => {
    // The-veil-ladder #the-price: "a burn forfeits the multi-vessel caps + the published standing." keyhive
    // enforces it: revoke the handle, re-key, and the burned handle reads nothing encrypted after the burn.
    const founder = await makeVessel(3);
    const device  = await makeVessel(102);
    const deviceAgentId = await introduce(founder, device);

    const { docId } = await founder.registerBag(BAG);
    const { delegationId } = await founder.delegate({ bagUrl: BAG, audience: deviceAgentId, access: "read" });

    // Before the burn: the handle reads shared content.
    const before = await founder.encryptContent(BAG, new TextEncoder().encode("v1 — the handle still holds"));
    device.adoptBag(BAG, docId);
    await device.ingestPeerEvents(await founder.eventsForPeer(deviceAgentId));
    expect(new TextDecoder().decode(await device.decryptContent(BAG, before))).toContain("v1");

    // BURN — revoke the handle's membership (a convergent CRDT op).
    await founder.revoke(delegationId);

    // After the burn: new shared content keys to the re-keyed group, WITHOUT the burned handle.
    const after = await founder.encryptContent(BAG, new TextEncoder().encode("v2 — after the burn"));
    await device.ingestPeerEvents(await founder.eventsForPeer(deviceAgentId));
    await expect(device.decryptContent(BAG, after)).rejects.toThrow();
  });

  test("forward-only boundary: content encrypted BEFORE the add stays unreadable (route A owes a re-encrypt)", async () => {
    const founder = await makeVessel(2);
    const device  = await makeVessel(101);
    const deviceAgentId = await introduce(founder, device);

    const { docId } = await founder.registerBag(BAG);
    // Encrypt BEFORE the reader joins — pre-join content.
    const ciphertext = await founder.encryptContent(BAG, new TextEncoder().encode("pre-join secret"));
    await founder.delegate({ bagUrl: BAG, audience: deviceAgentId, access: "read" });
    const events = await founder.eventsForPeer(deviceAgentId);

    device.adoptBag(BAG, docId);
    await device.ingestPeerEvents(events);
    // The device joined AFTER the encrypt — keyhive keeps pre-join content secret from it.
    await expect(device.decryptContent(BAG, ciphertext)).rejects.toThrow();
  });
});
