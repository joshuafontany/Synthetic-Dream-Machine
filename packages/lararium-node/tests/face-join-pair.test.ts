/**
 * face-join-pair.test.ts — the whole join, both live providers, one process.
 *
 * The gate's refusals are cheap to prove and prove nothing about seats. This drives the GRANTING half end to
 * end: a real signed edge licenses a real ContactCard, the founder seats the joinee in its PersonaGroup, and
 * the joinee walks away decrypting content it could not read a moment earlier.
 *
 * It also fences the ORDER. `packPersonaCrossing` carries the rule — delegate and encrypt AFTER the add, never
 * before — because a chunk keyed to an epoch the joinee stood outside of stays shut to it forever. A test that
 * only sealed content after the join would pass while proving that rule not at all, so the sealed-before case
 * runs here too and is expected to STAY shut.
 */
import { describe, test, expect } from "vitest";
import { KeyhiveProvider, runFaceJoin, type FaceJoinContext } from "@lararium/keyhive";
import { buildDeviceDelegation } from "@lararium/mesh";

const noopStore = { put: async () => {}, list: async () => [] };
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);

async function makeVessel(fill: number): Promise<KeyhiveProvider> {
  const p = new KeyhiveProvider();
  await p.init({ seed: seedOf(fill), eventStore: noopStore });
  return p;
}

/** The founder's PersonaGroup ROOT — the two-key atom: a signer distinct from any vessel's device key. */
const ROOT_SEED = seedOf(200);
const HEARTH    = "bafkreift7cvcpxxqusdb4lkxsxnt3mzv5uip6tpytinrh7ibgrvu7ceqwa";
const NOW       = Date.parse("2026-08-16T12:00:00.000Z");
const b64       = (s: string) => new Uint8Array(Buffer.from(s, "base64"));

/** The raw verifying key a vessel's identifier carries — the suffix the gate binds an edge to. */
const rawKeyOf = async (p: KeyhiveProvider) => (await p.whoami()).replace(/^0x/, "");

describe("face-join — the granting half, proven end to end", () => {
  test("a licensed joinee is seated and decrypts content sealed AFTER its add", async () => {
    const founder = await makeVessel(7);
    const joinee  = await makeVessel(106);

    const pg = await founder.createSentinelDoc("lar:///ha.ka.ba/sentinel/pg-face-join");
    await founder.addSentinelMember(await founder.vesselIdentifierHex(), pg.docIdHex);

    const edge = await buildDeviceDelegation({
      personaRootSeed:    ROOT_SEED,
      deviceVerifyingKey: await rawKeyOf(joinee),
      hearthTrueName:     HEARTH,
      issuedAt:           "2026-08-16T11:00:00.000Z",
      expiresAt:          "2026-09-16T11:00:00.000Z",
      boundEpoch:         0,
    });
    const ctx: FaceJoinContext = {
      personaRootDid:         edge.personaRootDid,
      hearthTrueName:         HEARTH,
      personaGroupDocIdHex:   pg.docIdHex,
      personaGroupAgentIdHex: pg.agentIdHex,
      leaseEpoch:             0,
      now:                    NOW,
    };

    const outcome = await runFaceJoin(founder, {
      kind: "face-join/v1",
      contactCard: new TextDecoder().decode(await joinee.contactCard()),
      deviceEdge: edge,
    }, ctx);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.grant.reKeyed).toBe(true);
    expect(outcome.grant.capEvents.length).toBeGreaterThan(0);
    const joineeAgentIdHex = outcome.grant.joineeAgentIdHex;

    // The joinee becomes a member off the grant alone — no seed crossed, only public ops.
    await joinee.receiveContactCard(new TextEncoder().encode(outcome.grant.founderCard));
    await joinee.ingestPeerEvents(outcome.grant.capEvents.map(b64));

    // Seal AFTER the add, so the ciphertext keys to an epoch the joinee stands inside.
    const BAG = "lar:///ha.ka.ba/bags/@catalog/after-the-join";
    const { docId } = await founder.registerBag(BAG);
    await founder.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });
    const sealed = await founder.encryptContent(BAG, new TextEncoder().encode("the face reads this"));

    // THE ONGOING FLOW, stood in by hand. A grant seats the joinee in the GROUP; a bag delegated to that group
    // afterward rides its own events, and in a live vessel those reach the joinee the way every other cap-event
    // does — the founder's event store flushes into @daemon, @daemon fleet-syncs same-operator, and the
    // joinee's `hydrateFromEventStore` ingests them on its next wake. This pair holds a noop store, so the
    // sync gets enacted here rather than assumed.
    await joinee.ingestPeerEvents(await founder.eventsForPeer(joineeAgentIdHex));

    joinee.adoptBag(BAG, docId);
    const read = await joinee.decryptContent(BAG, sealed);
    expect(new TextDecoder().decode(read)).toBe("the face reads this");
  }, 60_000);

  test("content sealed BEFORE the add stays shut — the forward-only boundary holds", async () => {
    const founder = await makeVessel(11);
    const joinee  = await makeVessel(112);

    const pg = await founder.createSentinelDoc("lar:///ha.ka.ba/sentinel/pg-forward-only");
    await founder.addSentinelMember(await founder.vesselIdentifierHex(), pg.docIdHex);

    // Sealed FIRST — the joinee has no seat yet, so this chunk keys to an epoch it never stood in.
    const BAG = "lar:///ha.ka.ba/bags/@catalog/before-the-join";
    const { docId } = await founder.registerBag(BAG);
    await founder.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });
    const sealedEarly = await founder.encryptContent(BAG, new TextEncoder().encode("sealed too soon"));

    const edge = await buildDeviceDelegation({
      personaRootSeed:    ROOT_SEED,
      deviceVerifyingKey: await rawKeyOf(joinee),
      hearthTrueName:     HEARTH,
      issuedAt:           "2026-08-16T11:00:00.000Z",
      expiresAt:          "2026-09-16T11:00:00.000Z",
      boundEpoch:         0,
    });
    const outcome = await runFaceJoin(founder, {
      kind: "face-join/v1",
      contactCard: new TextDecoder().decode(await joinee.contactCard()),
      deviceEdge: edge,
    }, {
      personaRootDid: edge.personaRootDid, hearthTrueName: HEARTH,
      personaGroupDocIdHex: pg.docIdHex, personaGroupAgentIdHex: pg.agentIdHex,
      leaseEpoch: 0, now: NOW,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    await joinee.receiveContactCard(new TextEncoder().encode(outcome.grant.founderCard));
    await joinee.ingestPeerEvents(outcome.grant.capEvents.map(b64));
    await joinee.ingestPeerEvents(await founder.eventsForPeer(outcome.grant.joineeAgentIdHex));
    joinee.adoptBag(BAG, docId);

    // THE RE-DELEGATE. A bag delegated to the group BEFORE this member joined does not see the re-keyed group:
    // the transitive re-key never propagates backward onto an earlier delegation. So the founder delegates it
    // again, and only then does the bag's tree carry an epoch this member stands inside. A face-join that
    // seated a member and stopped here would leave that member reading nothing in every bag the group already
    // held — membership without reach.
    await founder.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });

    // THE CONTROL. A chunk sealed AFTER the add, in the very same bag, opens — which proves the joinee's scope,
    // membership and key material all stand. Without it, the refusal below could read as a doc the joinee never
    // resolved, and the test would pass while proving nothing about ordering.
    const sealedLate = await founder.encryptContent(BAG, new TextEncoder().encode("sealed in time"));
    await joinee.ingestPeerEvents(await founder.eventsForPeer(outcome.grant.joineeAgentIdHex));
    expect(new TextDecoder().decode(await joinee.decryptContent(BAG, sealedLate))).toBe("sealed in time");

    // A seat does NOT reach backward. Same bag, same member, same scope — and the early chunk stays shut.
    await expect(joinee.decryptContent(BAG, sealedEarly)).rejects.toThrow();
  }, 60_000);

  test("a repeat summons returns the seat without moving the group epoch", async () => {
    const founder = await makeVessel(13);
    const joinee  = await makeVessel(114);

    const pg = await founder.createSentinelDoc("lar:///ha.ka.ba/sentinel/pg-repeat");
    await founder.addSentinelMember(await founder.vesselIdentifierHex(), pg.docIdHex);

    const edge = await buildDeviceDelegation({
      personaRootSeed:    ROOT_SEED,
      deviceVerifyingKey: await rawKeyOf(joinee),
      hearthTrueName:     HEARTH,
      issuedAt:           "2026-08-16T11:00:00.000Z",
      expiresAt:          "2026-09-16T11:00:00.000Z",
      boundEpoch:         0,
    });
    const ctx: FaceJoinContext = {
      personaRootDid: edge.personaRootDid, hearthTrueName: HEARTH,
      personaGroupDocIdHex: pg.docIdHex, personaGroupAgentIdHex: pg.agentIdHex,
      leaseEpoch: 0, now: NOW,
    };
    const summons = {
      kind: "face-join/v1" as const,
      contactCard: new TextDecoder().decode(await joinee.contactCard()),
      deviceEdge: edge,
    };

    const first = await runFaceJoin(founder, summons, ctx);
    expect(first.ok && first.grant.reKeyed).toBe(true);

    // The page reloaded, or the summons replayed off @daemon. The seat stands; nothing re-keys.
    const again = await runFaceJoin(founder, summons, ctx);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.grant.reKeyed).toBe(false);
    expect(again.grant.capEvents.length).toBeGreaterThan(0);   // still recovers its material
  }, 60_000);
});
