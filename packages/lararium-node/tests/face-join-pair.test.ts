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

  test("a WIPED joinee recovers from its ARCHIVE — never from a re-summons, forced or not", async () => {
    // Case 3 of the repeat scenarios: browser storage evicted (Safari's 7-day rule, an OPFS sweep) while the
    // device key survives in IndexedDB. A seat is NOT enough to heal it, and no summons is either.
    //
    // Keyhive mints fresh prekeys on every init, and the group's material stays sealed to the prekeys the
    // vessel held when it was seated. Re-presenting a card with NEW prekeys does not re-point that material:
    // the default repeat hands the seat back unchanged, and even `force` — which does re-key — leaves the
    // already-sealed chunks answering to prekeys this vessel no longer carries. The ARCHIVE holds those
    // secrets, and restoring from it is the recovery keel (`keyhive-provider` init: RESTORE-OR-FRESH).
    //
    // This vector exists because the opposite reads so plausibly. A summons that returns capEvents and a
    // seat looks like recovery from every angle except the one that matters — whether anything opens.
    const founder = await makeVessel(17);
    const joinee  = await makeVessel(118);

    const pg = await founder.createSentinelDoc("lar:///ha.ka.ba/sentinel/pg-wiped");
    await founder.addSentinelMember(await founder.vesselIdentifierHex(), pg.docIdHex);

    const edge = await buildDeviceDelegation({
      personaRootSeed: ROOT_SEED, deviceVerifyingKey: await rawKeyOf(joinee), hearthTrueName: HEARTH,
      issuedAt: "2026-08-16T11:00:00.000Z", expiresAt: "2026-09-16T11:00:00.000Z", boundEpoch: 0,
    });
    const ctx: FaceJoinContext = {
      personaRootDid: edge.personaRootDid, hearthTrueName: HEARTH,
      personaGroupDocIdHex: pg.docIdHex, personaGroupAgentIdHex: pg.agentIdHex, leaseEpoch: 0, now: NOW,
    };
    const cardOf = async (v: KeyhiveProvider) => new TextDecoder().decode(await v.contactCard());

    const first = await runFaceJoin(founder, { kind: "face-join/v1", contactCard: await cardOf(joinee), deviceEdge: edge }, ctx);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const BAG = "lar:///ha.ka.ba/bags/@catalog/wiped-store";
    const { docId } = await founder.registerBag(BAG);
    await founder.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });
    await joinee.receiveContactCard(new TextEncoder().encode(first.grant.founderCard));
    await joinee.ingestPeerEvents(first.grant.capEvents.map(b64));
    await joinee.ingestPeerEvents(await founder.eventsForPeer(first.grant.joineeAgentIdHex));
    joinee.adoptBag(BAG, docId);
    const sealed = await founder.encryptContent(BAG, new TextEncoder().encode("survives the wipe"));
    await joinee.ingestPeerEvents(await founder.eventsForPeer(first.grant.joineeAgentIdHex));
    // The seated vessel opens it — the control, so every refusal below reads as the wipe and nothing else.
    expect(new TextDecoder().decode(await joinee.decryptContent(BAG, sealed))).toBe("survives the wipe");

    // What a durable vessel keeps: the prekey secrets and its stable card, exported before the loss.
    const archive = await joinee.exportArchive();

    // THE WIPE — same seed (the device key survived), no archive (the store did not).
    const wiped = await makeVessel(118);
    const wipedCard = await cardOf(wiped);

    // The default repeat hands the seat back; nothing re-keys, and nothing opens.
    const plain = await runFaceJoin(founder, { kind: "face-join/v1", contactCard: wipedCard, deviceEdge: edge }, ctx);
    expect(plain.ok).toBe(true);
    if (!plain.ok) return;
    expect(plain.grant.reKeyed).toBe(false);
    await wiped.receiveContactCard(new TextEncoder().encode(plain.grant.founderCard));
    await wiped.ingestPeerEvents(plain.grant.capEvents.map(b64));
    wiped.adoptBag(BAG, docId);
    await expect(wiped.decryptContent(BAG, sealed)).rejects.toThrow();

    // FORCE re-keys the group — and STILL nothing opens. A seat is not a key.
    const forced = await runFaceJoin(founder, { kind: "face-join/v1", contactCard: wipedCard, deviceEdge: edge, force: true }, ctx);
    expect(forced.ok).toBe(true);
    if (!forced.ok) return;
    expect(forced.grant.reKeyed).toBe(true);
    await wiped.ingestPeerEvents(forced.grant.capEvents.map(b64));
    await expect(wiped.decryptContent(BAG, sealed)).rejects.toThrow();

    // THE KEEL — restore from the archive, and the same ciphertext opens with no summons at all.
    const restored = new KeyhiveProvider();
    await restored.init({ seed: seedOf(118), eventStore: noopStore, archiveBytes: archive });
    restored.adoptBag(BAG, docId);
    expect(new TextDecoder().decode(await restored.decryptContent(BAG, sealed))).toBe("survives the wipe");
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

describe("the hearth's door — kept where a joinee always reads it", () => {
  test("an applied admit lands the door on the joinee's OWN @daemon, and returns it", async () => {
    const { Repo } = await import("@automerge/automerge-repo");
    const { runApplyAdmitPayload } = await import("@lararium/keyhive");
    const { HEARTH_DAEMON_URL_TIDDLER } = await import("@lararium/mesh");

    const HEARTH_DOOR = "automerge:2fakeHearthDoorUrl000000000";
    const joinee = await makeVessel(72);
    const edge = await buildDeviceDelegation({
      personaRootSeed: ROOT_SEED, deviceVerifyingKey: await rawKeyOf(joinee), hearthTrueName: HEARTH,
      issuedAt: "2026-08-16T11:00:00.000Z", expiresAt: "2026-09-16T11:00:00.000Z", boundEpoch: 0,
    });
    const repo = new Repo({});
    const applied = await runApplyAdmitPayload({
      repo,
      vesselSeed:         new Uint8Array(32).fill(71),
      vesselVerifyingKey: await rawKeyOf(joinee),
      vesselDisplayName:  "a joining leaf",
      nexusPubkey:        "8".repeat(64),
      payload: {
        kind: "device-admit/v1",
        signerDid:              edge.personaRootDid,
        personaKelPrefix:       "persona-probe",
        deviceEdge:             edge,
        hearthTrueName:         HEARTH,
        personaGroupDocIdHex:   "ab".repeat(16),
        personaGroupAgentIdHex: "cd".repeat(16),
        meshCabalDocIdHex:      "ef".repeat(16),
        syncUrl:                null,
        hearthDaemonUrl:        HEARTH_DOOR,
      },
    });

    // The RESULT carries it into this boot's bootstrap …
    expect(applied.hearthDaemonUrl).toBe(HEARTH_DOOR);

    // … and the joinee's OWN @daemon keeps it for every boot after, the payload long since spent.
    const { DocHandle } = await import("@automerge/automerge-repo");
    void DocHandle;
    const daemon = await repo.find(applied.daemonUrl as never);
    const held = (daemon.doc() as { tiddlers?: Record<string, { tiddler?: { text?: string } }> })
      ?.tiddlers?.[HEARTH_DAEMON_URL_TIDDLER]?.tiddler?.text;
    expect(held).toBe(HEARTH_DOOR);
  }, 60_000);
});
