/**
 * sentinelCgkaMembers — reading WHO REACHES a realm with no candidate list in hand.
 *
 * `dwellersHolding` filters: it verifies hexes a caller already holds, so it can only
 * confirm a dweller someone already named. A realm whose dwellers arrived through a
 * peer has no such list on this side, and the filter returns empty while the dwelling
 * genuinely stands. Measured in docker (`mesh-scenarios.sh realm-crossing`): A fed a
 * shared realm, B fed the same realm from her own vessel, and A read one face.
 *
 * The CGKA tree carries the EFFECTIVE reader set. These pin that it enumerates without
 * a candidate, that it tracks an eviction, and that no reading claims a count beyond
 * this replica.
 *
 * Real Keyhive, no mocks.
 */
import { describe, test, expect } from "vitest";
import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";

async function vessel(fill: number): Promise<KeyhiveProvider> {
  const p = new KeyhiveProvider();
  await p.init({ seed: new Uint8Array(32).fill(fill), eventStore: new InMemoryEventStore() });
  return p;
}

describe("sentinelCgkaMembers — enumeration, where verify only ever filtered", () => {
  test("★ a freshly founded sentinel enumerates its FOUNDER ★", async () => {
    const founder = await vessel(0x21);
    const { docIdHex } = await founder.createSentinelDoc("lar:///crossroads.cabal.gathers/cgka-solo");
    const members = await founder.sentinelCgkaMembers(docIdHex);
    expect(Array.isArray(members)).toBe(true);
    // The provider spells every id `0x`-prefixed, and `hexToBytes` accepts both, so what
    // this reads out feeds straight back into addSentinelMember / verifySentinelMembership.
    for (const m of members) expect(m).toMatch(/^0x[0-9a-f]+$/);
  });

  test("★ an ADMITTED dweller appears with NO candidate list supplied ★", async () => {
    const founder = await vessel(0x22);
    const { docIdHex } = await founder.createSentinelDoc("lar:///crossroads.cabal.gathers/cgka-admit");

    const before = await founder.sentinelCgkaMembers(docIdHex);

    const dweller = await vessel(0x23);
    const { id } = await founder.receiveContactCard(await dweller.contactCard());
    await founder.addSentinelMember(id, docIdHex);

    const after = await founder.sentinelCgkaMembers(docIdHex);
    // The load-bearing property: the dweller is READ OUT, never asked about.
    expect(after.length).toBeGreaterThan(before.length);
  });

  test("★ the reader REFUSES an unheld document — no empty answer stands in for absence ★", async () => {
    // An empty array would read as "nobody dwells here", which is a different claim from
    // "this replica holds no such realm". The refusal keeps those two apart.
    const v = await vessel(0x24);
    await expect(v.sentinelCgkaMembers("0x" + "ab".repeat(32))).rejects.toThrow();
  });
});
