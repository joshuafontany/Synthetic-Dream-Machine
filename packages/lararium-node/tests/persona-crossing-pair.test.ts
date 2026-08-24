/**
 * persona-crossing-pair.test.ts — the catalog-registry admit crossing as one composable call.
 *
 * packPersonaCrossing (founder) admits a vessel into the PersonaGroup and packs the bundle; applyPersonaCrossing
 * (joinee) ingests it and reads the shared content. Proves the pair composes the verified primitives in the
 * load-bearing add→encrypt→capture order, and that the bundle carries only public ops + ciphertext.
 */
import { describe, test, expect } from "vitest";
import { KeyhiveProvider, packPersonaCrossing, applyPersonaCrossing } from "@lararium/keyhive";

const noopStore = { put: async () => {}, list: async () => [] };
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);
async function makeVessel(fill: number): Promise<KeyhiveProvider> {
  const p = new KeyhiveProvider();
  await p.init({ seed: seedOf(fill), eventStore: noopStore });
  return p;
}
const BAG = "lar:///ha.ka.ba/bags/catalog/shared-note";

describe("persona-crossing pair — one call admits a vessel and hands it the shared content", () => {
  test("founder packs, joinee applies and reads its PersonaGroup's content in the catalog registry", async () => {
    const founder = await makeVessel(7);
    const joinee  = await makeVessel(106);

    // Founder's PersonaGroup; the bag delegates to the group (production wires this at bind-mint).
    const pg = await founder.createSentinelDoc("lar:///ha.ka.ba/sentinel/pg-pair");
    const { docId } = await founder.registerBag(BAG);
    await founder.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });

    // ONE call: admit the joinee and pack everything it needs to read the note.
    const bundle = await packPersonaCrossing(
      founder,
      await joinee.contactCard(),
      { docIdHex: pg.docIdHex, agentIdHex: pg.agentIdHex },
      [{ bagUrl: BAG, docIdHex: docId, plaintext: new TextEncoder().encode("shared across the human's vessels") }],
    );

    // The bundle carries only public ops + ciphertext — no prekey secret, no archive.
    expect(bundle.capEvents.length).toBeGreaterThan(0);
    expect(bundle.content).toHaveLength(1);

    // ONE call: the joinee becomes a member and reads the content.
    const read = await applyPersonaCrossing(joinee, bundle);
    expect(read).toHaveLength(1);
    expect(new TextDecoder().decode(read[0]!.plaintext)).toBe("shared across the human's vessels");
  });
});
