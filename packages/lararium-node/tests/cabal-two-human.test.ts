/**
 * cabal-two-human.test.ts — the LAN case: two DIFFERENT humans (Josh ⊥ Freyja), each its own node vessel,
 * no shared metal-surface, sharing content through a CABAL.
 *
 * This is the boundary the-veil-ladder flags: CGKA fits one human's own devices (one ordering authority);
 * a multi-principal cabal is the no-global-now case. Does BeeKEM stretch to two humans? Two probes:
 *   1. ONE-WAY — Josh founds a cabal, admits Freyja, encrypts; Freyja reads. (the easy direction)
 *   2. CONCURRENT — both members encrypt WITHOUT seeing each other first, then reconcile. The no-global-now
 *      stress: does BeeKEM converge so each reads the OTHER's concurrent content?
 */
import { describe, test, expect } from "vitest";
import { KeyhiveProvider } from "@lararium/keyhive";

const noopStore = { put: async () => {}, list: async () => [] };
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);
async function makeHuman(fill: number): Promise<KeyhiveProvider> {
  const p = new KeyhiveProvider();
  await p.init({ seed: seedOf(fill), eventStore: noopStore });
  return p;
}
const BAG = "lar:///ha.ka.ba/bags/@cabal/shared-thread";

describe("two humans, one cabal, no shared metal", () => {
  test("ONE-WAY: Josh founds a cabal, admits Freyja, shares content she reads", async () => {
    const josh   = await makeHuman(20);
    const freyja = await makeHuman(120);

    const { id: freyjaAgentId } = await josh.receiveContactCard(await freyja.contactCard());
    await freyja.receiveContactCard(await josh.contactCard());

    const cabal = await josh.createSentinelDoc("lar:///ha.ka.ba/sentinel/amorphous-dreams");
    await josh.addSentinelMember(freyjaAgentId, cabal.docIdHex);       // admit Freyja BEFORE encrypt
    const { docId } = await josh.registerBag(BAG);
    await josh.delegate({ bagUrl: BAG, audience: cabal.agentIdHex, access: "read" });
    const ct = await josh.encryptContent(BAG, new TextEncoder().encode("Josh posts to the cabal"));

    freyja.adoptBag(BAG, docId);
    await freyja.ingestPeerEvents(await josh.eventsForPeer(freyjaAgentId));
    expect(new TextDecoder().decode(await freyja.decryptContent(BAG, ct))).toContain("Josh");
  });

  test("CONCURRENT: both post WITHOUT seeing each other first — do they converge? (no-global-now stress)", async () => {
    const josh   = await makeHuman(21);
    const freyja = await makeHuman(121);

    const { id: freyjaAgentId } = await josh.receiveContactCard(await freyja.contactCard());
    const { id: joshAgentId }   = await freyja.receiveContactCard(await josh.contactCard());

    // Josh founds the cabal + admits Freyja; both hold membership before either posts.
    const cabal = await josh.createSentinelDoc("lar:///ha.ka.ba/sentinel/amorphous-dreams-2");
    await josh.addSentinelMember(freyjaAgentId, cabal.docIdHex);
    const { docId } = await josh.registerBag(BAG);
    await josh.delegate({ bagUrl: BAG, audience: cabal.agentIdHex, access: "read" });
    // Freyja adopts + ingests membership so she can also write to the cabal bag.
    freyja.adoptBag(BAG, docId);
    await freyja.ingestPeerEvents(await josh.eventsForPeer(freyjaAgentId));

    // CONCURRENT posts — neither has seen the other's op yet (two causal islands).
    const joshCt   = await josh.encryptContent(BAG, new TextEncoder().encode("Josh concurrent"));
    const freyjaCt = await freyja.encryptContent(BAG, new TextEncoder().encode("Freyja concurrent"));

    // Reconcile: each ingests the other's events, then tries to read the other's content.
    await josh.ingestPeerEvents(await freyja.eventsForPeer(joshAgentId));
    await freyja.ingestPeerEvents(await josh.eventsForPeer(freyjaAgentId));

    const joshReadsFreyja = await josh.decryptContent(BAG, freyjaCt).then(b => new TextDecoder().decode(b)).catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);
    const freyjaReadsJosh = await freyja.decryptContent(BAG, joshCt).then(b => new TextDecoder().decode(b)).catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);
    // Report both — this test DOCUMENTS BeeKEM's concurrency behavior for the cabal boundary.
    console.log(`[cabal-concurrent] josh reads freyja: ${joshReadsFreyja}`);
    console.log(`[cabal-concurrent] freyja reads josh: ${freyjaReadsJosh}`);
    expect(joshReadsFreyja).toContain("Freyja");
    expect(freyjaReadsJosh).toContain("Josh");
  });

  test("CONCURRENT MEMBERSHIP: both admit a THIRD human at once — BeeKEM's hard case (conflicted root)", async () => {
    const josh   = await makeHuman(22);
    const freyja = await makeHuman(122);
    const guest  = await makeHuman(222);   // a third human both try to admit concurrently

    const { id: freyjaAgentId } = await josh.receiveContactCard(await freyja.contactCard());
    const { id: joshAgentId }   = await freyja.receiveContactCard(await josh.contactCard());
    // both learn the guest
    const { id: guestForJosh }   = await josh.receiveContactCard(await guest.contactCard());
    const { id: guestForFreyja } = await freyja.receiveContactCard(await guest.contactCard());
    await guest.receiveContactCard(await josh.contactCard());

    const cabal = await josh.createSentinelDoc("lar:///ha.ka.ba/sentinel/amorphous-dreams-3");
    await josh.addSentinelMember(freyjaAgentId, cabal.docIdHex);
    const { docId } = await josh.registerBag(BAG);
    await josh.delegate({ bagUrl: BAG, audience: cabal.agentIdHex, access: "read" });
    // Freyja catches up to co-manage the cabal.
    freyja.adoptBag(BAG, docId);
    await freyja.ingestPeerEvents(await josh.eventsForPeer(freyjaAgentId));

    // CONCURRENT ADDS: Josh and Freyja each add the guest to the SAME cabal, neither seeing the other's add.
    const addA = await josh.addSentinelMember(guestForJosh, cabal.docIdHex).then(() => "ok").catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);
    const addB = await freyja.addSentinelMember(guestForFreyja, cabal.docIdHex).then(() => "ok").catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);
    console.log(`[cabal-concurrent-add] josh-adds-guest: ${addA} · freyja-adds-guest: ${addB}`);

    // Reconcile, then Josh posts and the guest tries to read — proving the cabal converged after the double-add.
    await josh.ingestPeerEvents(await freyja.eventsForPeer(joshAgentId));
    await freyja.ingestPeerEvents(await josh.eventsForPeer(freyjaAgentId));
    const ct = await josh.encryptContent(BAG, new TextEncoder().encode("post after the double-add"));
    guest.adoptBag(BAG, docId);
    await guest.ingestPeerEvents(await josh.eventsForPeer(guestForJosh));
    const guestRead = await guest.decryptContent(BAG, ct).then(b => new TextDecoder().decode(b)).catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);
    console.log(`[cabal-concurrent-add] guest reads after double-add: ${guestRead}`);
    // We ASSERT the adds themselves survive; the guest-read is DOCUMENTED (may need conflict-key retry).
    expect(addA).toBe("ok");
    expect(addB).toBe("ok");
  });

  test("AUTHORITY blocks the leak upward: a member cannot revoke its own delegator (the founder)", async () => {
    // FINDING: keyhive refuses an unauthorized revoke. Freyja, whom Josh delegated in, has NO authority to
    // revoke Josh — "Proof missing to authorize revocation." The delegation graph prevents revoking UP the
    // chain, which forecloses one whole class of add-while-remove leak at the authority layer, not the crypto.
    const josh   = await makeHuman(24);
    const freyja = await makeHuman(124);
    const { id: freyjaAgentId } = await josh.receiveContactCard(await freyja.contactCard());
    const { id: joshAgentId }   = await freyja.receiveContactCard(await josh.contactCard());

    const cabal = await josh.createSentinelDoc("lar:///ha.ka.ba/sentinel/amorphous-dreams-auth");
    await josh.addSentinelMember(freyjaAgentId, cabal.docIdHex);
    await freyja.ingestPeerEvents(await josh.eventsForPeer(freyjaAgentId));

    const freyjaRevokesJosh = await freyja.revokeSentinelMember(joshAgentId, cabal.docIdHex).then(() => "ok").catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);
    expect(freyjaRevokesJosh).toMatch(/THREW|Proof missing|authorize/);
  });

  test("ADD-WHILE-REMOVE (authorized): Josh revokes Freyja while she adds a guest — does removed Freyja read?", async () => {
    // The real leak window: the AUTHORIZED revoker (Josh, the founder) revokes Freyja concurrently with
    // Freyja adding a guest. Can removed Freyja read content encrypted AFTER her removal? A clean revoke
    // throws; a leak reads the new content. This REVEALS BeeKEM's accept-and-heal behavior for the canon seat.
    const josh   = await makeHuman(25);
    const freyja = await makeHuman(125);
    const guest  = await makeHuman(225);

    const { id: freyjaAgentId }  = await josh.receiveContactCard(await freyja.contactCard());
    const { id: joshAgentId }    = await freyja.receiveContactCard(await josh.contactCard());
    const { id: guestForFreyja } = await freyja.receiveContactCard(await guest.contactCard());
    await guest.receiveContactCard(await freyja.contactCard());

    const cabal = await josh.createSentinelDoc("lar:///ha.ka.ba/sentinel/amorphous-dreams-5");
    await josh.addSentinelMember(freyjaAgentId, cabal.docIdHex);
    const { docId } = await josh.registerBag(BAG);
    await josh.delegate({ bagUrl: BAG, audience: cabal.agentIdHex, access: "read" });
    freyja.adoptBag(BAG, docId);
    await freyja.ingestPeerEvents(await josh.eventsForPeer(freyjaAgentId));

    // CONCURRENT: Josh (authorized) REVOKES Freyja; Freyja ADDS a guest — neither has seen the other's op.
    const revoke = await josh.revokeSentinelMember(freyjaAgentId, cabal.docIdHex).then(() => "ok").catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);
    const add    = await freyja.addSentinelMember(guestForFreyja, cabal.docIdHex).then(() => "ok").catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);

    await josh.ingestPeerEvents(await freyja.eventsForPeer(joshAgentId));
    await freyja.ingestPeerEvents(await josh.eventsForPeer(freyjaAgentId));

    // Josh (the surviving admin) posts AFTER revoking Freyja.
    const postRevoke = await josh.encryptContent(BAG, new TextEncoder().encode("after Freyja was removed"));
    const removedFreyjaRead = await freyja.decryptContent(BAG, postRevoke).then((b) => new TextDecoder().decode(b)).catch((e) => `THREW: ${e instanceof Error ? e.message : e}`);

    expect(revoke).toBe("ok");   // Josh HAS authority to revoke Freyja
    // Assert the CLEAN outcome: removed Freyja cannot read post-revoke content. A failure prints the leak.
    expect(removedFreyjaRead, `removed Freyja read: ${removedFreyjaRead}`).toMatch(/THREW/);
  });
});
