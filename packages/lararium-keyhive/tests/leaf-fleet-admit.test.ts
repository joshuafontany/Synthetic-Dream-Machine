/**
 * leaf-fleet-admit — an END-USER's fleet, which holds no node at all.
 *
 * Every join proven so far ran with a node vessel as the hearth. An end-user's fleet is browsers and phones:
 * leaves only. One of them holds the face and seats the others, and the word "isomorphic" is either true here
 * or it was decoration.
 *
 * TWO PROPERTIES SEPARATE THIS FLEET FROM AN OPERATOR'S.
 *
 * First, a self-stood leaf is HEARTH-AGNOSTIC — it founds with `hearthTrueName: ""`, because a vessel that
 * binds to no engine CID has no place to name. So the gate's hearth check compares "" against "" for every
 * leaf on earth and separates NOTHING. In an operator's fleet the hearth true-name is a second wall; here the
 * ROOT SIGNATURE carries the whole weight, and the cross-fleet vector below is the one that proves it.
 *
 * Second, a leaf fleet has no always-on hearth and no filesystem. The vessel holding the face must be AWAKE to
 * seat anyone, and no archive persists — so the recovery keel an operator's node provides is simply absent,
 * and a leaf that loses its store returns as a new device rather than a restorable one. Its device key lives
 * in the same store, so nothing survives to restore INTO; the loss is total by construction, never partial.
 */
import { describe, test, expect } from "vitest";
import { buildDeviceDelegation } from "@lararium/mesh";
import { KeyhiveProvider } from "../src/keyhive-provider.js";
import { runFaceJoin, type FaceJoinContext } from "../src/face-join.js";

const noopStore = { put: async () => {}, list: async () => [] };
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);
const b64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));
const NOW = Date.parse("2026-08-17T12:00:00.000Z");

/** A leaf: its own device key, its own keyhive. A browser or a phone, never a node. */
async function leaf(fill: number): Promise<KeyhiveProvider> {
  const p = new KeyhiveProvider();
  await p.init({ seed: seedOf(fill), eventStore: noopStore });
  return p;
}
const rawKeyOf = async (p: KeyhiveProvider) => (await p.whoami()).replace(/^0x/, "");

/** HEARTH-AGNOSTIC by construction — a self-stood leaf binds to no engine CID, so its edges name no place. */
async function leafEdge(rootSeed: Uint8Array, joinee: KeyhiveProvider) {
  return buildDeviceDelegation({
    personaRootSeed:    rootSeed,
    deviceVerifyingKey: await rawKeyOf(joinee),
    hearthTrueName:     "",
    issuedAt:           "2026-08-17T11:00:00.000Z",
    expiresAt:          "2026-09-17T11:00:00.000Z",
    boundEpoch:         0,
  });
}

/** Stand a leaf's own face: its PersonaGroup, with itself seated. */
async function faceOf(hearth: KeyhiveProvider, uri: string) {
  const pg = await hearth.createSentinelDoc(uri);
  await hearth.addSentinelMember(await hearth.vesselIdentifierHex(), pg.docIdHex);
  return pg;
}

const ctxFor = (rootDid: string, pg: { docIdHex: string; agentIdHex: string }): FaceJoinContext => ({
  personaRootDid:         rootDid,
  hearthTrueName:         "",          // the fleet names no place
  personaGroupDocIdHex:   pg.docIdHex,
  personaGroupAgentIdHex: pg.agentIdHex,
  leaseEpoch:             0,
  now:                    NOW,
});

/** Take a grant and become a member — what a leaf's own boot does with an outcome it reads back. */
async function absorb(joinee: KeyhiveProvider, grant: { founderCard: string; capEvents: readonly string[] }) {
  await joinee.receiveContactCard(new TextEncoder().encode(grant.founderCard));
  await joinee.ingestPeerEvents(grant.capEvents.map(b64));
}

describe("an end-user's fleet — leaves only, no node anywhere", () => {
  test("a leaf holding the face seats a second leaf, and the second reads what the face shares", async () => {
    const phone  = await leaf(31);      // holds the face
    const laptop = await leaf(32);      // asks to join it
    const ROOT   = seedOf(210);         // the human's persona root — distinct from any device key

    const pg   = await faceOf(phone, "lar:///ha.ka.ba/sentinel/pg-leaf-fleet");
    const edge = await leafEdge(ROOT, laptop);
    expect(edge.hearthTrueName).toBe("");

    const out = await runFaceJoin(phone, {
      kind: "face-join/v1",
      contactCard: new TextDecoder().decode(await laptop.contactCard()),
      deviceEdge: edge,
    }, ctxFor(edge.personaRootDid, pg));

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.grant.reKeyed).toBe(true);
    await absorb(laptop, out.grant);

    const BAG = "lar:///ha.ka.ba/bags/@catalog/leaf-fleet-note";
    const { docId } = await phone.registerBag(BAG);
    await phone.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });
    const sealed = await phone.encryptContent(BAG, new TextEncoder().encode("what the phone knows"));
    await laptop.ingestPeerEvents(await phone.eventsForPeer(out.grant.joineeAgentIdHex));
    laptop.adoptBag(BAG, docId);

    expect(new TextDecoder().decode(await laptop.decryptContent(BAG, sealed))).toBe("what the phone knows");
  }, 60_000);

  test("a THIRD leaf joins the same face, and all three open one chunk", async () => {
    const phone  = await leaf(41);
    const laptop = await leaf(42);
    const tablet = await leaf(43);
    const ROOT   = seedOf(211);

    const pg  = await faceOf(phone, "lar:///ha.ka.ba/sentinel/pg-leaf-three");
    const ctx = (did: string) => ctxFor(did, pg);

    const joined: { v: KeyhiveProvider; agent: string }[] = [];
    for (const v of [laptop, tablet]) {
      const e = await leafEdge(ROOT, v);
      const o = await runFaceJoin(phone, {
        kind: "face-join/v1", contactCard: new TextDecoder().decode(await v.contactCard()), deviceEdge: e,
      }, ctx(e.personaRootDid));
      expect(o.ok).toBe(true);
      if (!o.ok) return;
      await absorb(v, o.grant);
      joined.push({ v, agent: o.grant.joineeAgentIdHex });
    }

    // Seal AFTER the whole fleet stands, so the chunk keys to an epoch every member is inside.
    const BAG = "lar:///ha.ka.ba/bags/@catalog/leaf-fleet-shared";
    const { docId } = await phone.registerBag(BAG);
    await phone.delegate({ bagUrl: BAG, audience: pg.agentIdHex, access: "read" });
    const sealed = await phone.encryptContent(BAG, new TextEncoder().encode("one face, three devices"));

    for (const { v, agent } of joined) {
      await v.ingestPeerEvents(await phone.eventsForPeer(agent));
      v.adoptBag(BAG, docId);
      expect(new TextDecoder().decode(await v.decryptContent(BAG, sealed))).toBe("one face, three devices");
    }
  }, 60_000);

  test("★ ANOTHER human's leaf is refused — with no hearth name, only the root signature keeps fleets apart ★", async () => {
    const mine     = await leaf(51);
    const stranger = await leaf(52);
    const MY_ROOT     = seedOf(212);
    const THEIR_ROOT  = seedOf(213);

    const pg = await faceOf(mine, "lar:///ha.ka.ba/sentinel/pg-leaf-mine");

    // Their fleet's edge is WELL-FORMED and, being hearth-agnostic like every leaf edge, names the same ""
    // place mine does. The hearth check passes it through; the signature is the only wall left standing.
    const theirEdge = await leafEdge(THEIR_ROOT, stranger);
    const myEdge    = await leafEdge(MY_ROOT, stranger);
    expect(theirEdge.hearthTrueName).toBe(myEdge.hearthTrueName);   // "" — the wall an operator's fleet has, gone

    const out = await runFaceJoin(mine, {
      kind: "face-join/v1",
      contactCard: new TextDecoder().decode(await stranger.contactCard()),
      deviceEdge: theirEdge,
    }, ctxFor(myEdge.personaRootDid, pg));

    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toMatch(/pinned root|edge refused/i);
  }, 60_000);

  test("a leaf that re-asks keeps its seat and moves no epoch — the same ruling, no node in sight", async () => {
    const phone  = await leaf(61);
    const laptop = await leaf(62);
    const ROOT   = seedOf(214);

    const pg   = await faceOf(phone, "lar:///ha.ka.ba/sentinel/pg-leaf-repeat");
    const edge = await leafEdge(ROOT, laptop);
    const summons = {
      kind: "face-join/v1" as const,
      contactCard: new TextDecoder().decode(await laptop.contactCard()),
      deviceEdge: edge,
    };
    const ctx = ctxFor(edge.personaRootDid, pg);

    const first = await runFaceJoin(phone, summons, ctx);
    expect(first.ok && first.grant.reKeyed).toBe(true);

    const again = await runFaceJoin(phone, summons, ctx);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.grant.reKeyed).toBe(false);
    expect(again.grant.regranted).toBe(0);
  }, 60_000);
});
