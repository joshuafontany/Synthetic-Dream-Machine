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
import { KeyhiveProvider } from "@lararium/keyhive";

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
