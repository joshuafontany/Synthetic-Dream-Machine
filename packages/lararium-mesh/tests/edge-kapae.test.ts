/**
 * edge-kapae — the marker raised over a RELATIONSHIP, and what that dissolves.
 *
 * Every comparable system raises its tombstone on a THING, so the marker needs global agreement and races
 * the writes it should outrank. Raised over an EDGE it needs none: the shadow scopes to one relationship,
 * and two edges tombstone concurrently WITHOUT racing, because they name different objects.
 *
 * The arms that carry weight: REMOVE-WINS on a same-version tie (an eviction never quietly reverses when a
 * partition heals) · MUTUAL revocation converging to "both aside" with no winner needed · a forged act
 * failing to lower somebody else's shadow · and a shadowed edge standing aside even when its own signature
 * verifies perfectly, which is the whole difference between a kāpae and an expiry.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/kapae
 */
import { EDGE_KAPAE_DOMAIN } from "../src/domains.js";
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  signEdgeKapae, edgeKapaeBytes, edgeKapaeKey, writeEdgeKapae, edgeKapaeActsFromBoard,
  foldEdgeKapae, verifiedShadowSet, shadowSetFromBoard, edgeKapaeBoardDocUrl, type EpochOrder,
  emptyLarDoc, type EdgeKapae,
} from "../src/index.js";
import { hex, hexToBytes } from "../src/crypto.js";

const A_SEED = new Uint8Array(32).fill(11);   // admin A
const B_SEED = new Uint8Array(32).fill(12);   // admin B
const EPOCH  = "epoch0-aaa";
/** The chain these witnesses walk — one minted epochCid, so they order WITHIN it, which is what they test. */
const ONE: EpochOrder = (e) => (e === EPOCH ? 0 : null);

const signer = (s: Uint8Array) => (b: Uint8Array) => ed.signAsync(b, s).then(hex);
const pubOf  = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);
const verify = (b: Uint8Array, sig: string, did: string) =>
  ed.verifyAsync(hexToBytes(sig), b, hexToBytes(did)).catch(() => false);

const act = (edgeId: string, raised: boolean, version: number, seed: Uint8Array) =>
  signEdgeKapae({ edgeId, raised, version, epochCid: EPOCH }, signer(seed));

describe("remove-wins — the asymmetry that carries the guarantee", () => {
  test("★ a same-version RAISE and LOWER leave the shadow UP ★", async () => {
    const raise = await act("edge-1", true,  1, A_SEED);
    const lower = await act("edge-1", false, 1, B_SEED);
    // both orders, because a merge offers no canonical one
    expect(foldEdgeKapae([raise, lower], ONE).has("edge-1")).toBe(true);
    expect(foldEdgeKapae([lower, raise], ONE).has("edge-1")).toBe(true);
  });

  test("a HIGHER-version lower does take the shadow down — deliberate, and it supersedes", async () => {
    const raise = await act("edge-1", true,  1, A_SEED);
    const lower = await act("edge-1", false, 2, A_SEED);
    expect(foldEdgeKapae([raise, lower], ONE).has("edge-1")).toBe(false);
  });

  test("a STALE act cannot roll a standing decision back", async () => {
    const lower = await act("edge-1", false, 3, A_SEED);
    const stale = await act("edge-1", true,  1, A_SEED);
    expect(foldEdgeKapae([lower, stale], ONE).has("edge-1")).toBe(false);
  });

  test("the board keys by edge, GESTURE and version, so a raise and a lower BOTH survive the merge", async () => {
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true,  1, A_SEED));
    writeEdgeKapae(doc, await act("edge-1", false, 1, B_SEED));
    expect(Object.keys(doc.tiddlers)).toHaveLength(2);          // nothing overwrote anything
    expect(edgeKapaeKey("edge-1", true, 1)).not.toBe(edgeKapaeKey("edge-1", false, 1));
    expect(foldEdgeKapae(edgeKapaeActsFromBoard(doc), ONE).has("edge-1")).toBe(true);
  });
});

describe("mutual revocation converges without a winner", () => {
  test("★ A sets B aside while B sets A aside — BOTH stand aside, and the split reads LEGIBLE ★", async () => {
    const aOut = await act("edge-B", true, 1, A_SEED);   // A shadows B's edge
    const bOut = await act("edge-A", true, 1, B_SEED);   // B shadows A's edge, concurrently

    const shadowed = foldEdgeKapae([aOut, bOut], ONE);
    expect(shadowed.has("edge-A")).toBe(true);
    expect(shadowed.has("edge-B")).toBe(true);
    // No tiebreak ran, because none was needed — two edges, two shadows, no contention between them.
    expect(shadowed.size).toBe(2);
  });

  test("two DIFFERENT edges never contend — the whole reason the thing-grained systems raced", async () => {
    const one = await act("edge-1", true, 1, A_SEED);
    const two = await act("edge-2", true, 1, B_SEED);
    const shadowed = foldEdgeKapae([one, two], ONE);
    expect([...shadowed].sort()).toEqual(["edge-1", "edge-2"]);
  });
});

describe("an unverified act carries no authority", () => {
  test("★ a FORGED lower cannot take somebody else's shadow down ★", async () => {
    const authority = await pubOf(A_SEED);
    const raise  = await act("edge-1", true,  1, A_SEED);
    const forged = await act("edge-1", false, 2, B_SEED);   // B signs a lower over A's edge

    const shadowed = await verifiedShadowSet([raise, forged], () => authority, verify, ONE);
    expect(shadowed.has("edge-1")).toBe(true);              // the forgery dropped; the shadow held
  });

  test("an act on an edge with NO known authority drops", async () => {
    const raise = await act("edge-1", true, 1, A_SEED);
    expect((await verifiedShadowSet([raise], () => undefined, verify, ONE)).size).toBe(0);
  });

  test("a tampered field breaks the signature — the bytes bind edge, gesture, version and epochCid", async () => {
    const authority = await pubOf(A_SEED);
    const raise = await act("edge-1", true, 1, A_SEED);
    const moved: EdgeKapae = { ...raise, edgeId: "edge-2" };
    expect((await verifiedShadowSet([moved], () => authority, verify, ONE)).size).toBe(0);

    const a = hex(edgeKapaeBytes({ kind: EDGE_KAPAE_DOMAIN, edgeId: "e", raised: true, version: 1, epochCid: "x" }));
    expect(a).not.toBe(hex(edgeKapaeBytes({ kind: EDGE_KAPAE_DOMAIN, edgeId: "e", raised: false, version: 1, epochCid: "x" })));
    expect(a).not.toBe(hex(edgeKapaeBytes({ kind: EDGE_KAPAE_DOMAIN, edgeId: "e", raised: true, version: 2, epochCid: "x" })));
    expect(a).not.toBe(hex(edgeKapaeBytes({ kind: EDGE_KAPAE_DOMAIN, edgeId: "e", raised: true, version: 1, epochCid: "y" })));
  });

  test("a torn or foreign tiddler drops, and an absent board shadows nothing", async () => {
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true, 1, A_SEED));
    doc.tiddlers["lar:///junk"] = { id: "lar:///junk", tiddler: { text: "not json" } } as never;
    doc.tiddlers["lar:///half"] = {
      id: "lar:///half", tiddler: { text: JSON.stringify({ kind: EDGE_KAPAE_DOMAIN, edgeId: "x" }) },
    } as never;
    expect(edgeKapaeActsFromBoard(doc)).toHaveLength(1);
    expect(edgeKapaeActsFromBoard(null)).toEqual([]);
    expect(foldEdgeKapae([], ONE).size).toBe(0);
  });

  test("a version below one refuses — a monotone counter starts where the law starts it", async () => {
    const doc = emptyLarDoc();
    const bad = { ...(await act("edge-1", true, 1, A_SEED)), version: 0 };
    const key = edgeKapaeKey("edge-1", true, 0);
    doc.tiddlers[key] = { id: key, tiddler: { text: JSON.stringify(bad) } } as never;
    expect(edgeKapaeActsFromBoard(doc)).toEqual([]);
  });
});

describe("the board — where a shadow becomes RAISABLE, not merely readable", () => {
  test("★ the board round-trips: raise, read back, fold, and the shadow stands ★", async () => {
    const authority = await pubOf(A_SEED);
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true, 1, A_SEED));

    const shadowed = await shadowSetFromBoard(doc, () => authority, verify, ONE);
    expect(shadowed.has("edge-1")).toBe(true);
  });

  test("a later LOWER on the board takes it back down — a deliberate gesture, and it lands", async () => {
    const authority = await pubOf(A_SEED);
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true,  1, A_SEED));
    writeEdgeKapae(doc, await act("edge-1", false, 2, A_SEED));

    expect((await shadowSetFromBoard(doc, () => authority, verify, ONE)).size).toBe(0);
    expect(Object.keys(doc.tiddlers)).toHaveLength(2);   // and BOTH acts survive as the record
  });

  test("★ a forged LOWER written straight onto the board cannot free the edge ★", async () => {
    const authority = await pubOf(A_SEED);
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true,  1, A_SEED));
    writeEdgeKapae(doc, await act("edge-1", false, 2, B_SEED));   // B has no authority over edge-1

    expect((await shadowSetFromBoard(doc, () => authority, verify, ONE)).has("edge-1")).toBe(true);
  });

  // The honest floor: an absent board means nothing was set aside, never that everything is permitted.
  // The readers that consult this still verify every edge they admit, so an empty shadow set opens nothing.
  test("an ABSENT board yields no shadows, which reads as a floor rather than a permission", async () => {
    expect((await shadowSetFromBoard(null, () => "x", verify, ONE)).size).toBe(0);
    expect((await shadowSetFromBoard(emptyLarDoc(), () => "x", verify, ONE)).size).toBe(0);
  });

  test("the board address derives deterministically per Nexus, and differs across them", () => {
    expect(edgeKapaeBoardDocUrl("aa".repeat(16))).toBe(edgeKapaeBoardDocUrl("aa".repeat(16)));
    expect(edgeKapaeBoardDocUrl("aa".repeat(16))).not.toBe(edgeKapaeBoardDocUrl("bb".repeat(16)));
  });
});

describe("the epochCid bounds the ceiling grab a scalar cannot", () => {
  // A chain the reader can walk. `null` reads unknown — an epochCid nobody has minted, or one from elsewhere.
  const chain = (m: Record<string, number>) => (e: string) => m[e] ?? null;
  const at = (edgeId: string, raised: boolean, version: number, epochCid: string, seed: Uint8Array) =>
    signEdgeKapae({ edgeId, raised, version, epochCid }, signer(seed));

  test("★ an absurd version on an OLD epochCid loses to a modest one on a NEW epochCid ★", async () => {
    // The grab: mint a lower at a version no future act can reach, and hold the edge open forever.
    const grab  = await at("edge-9", false, Number.MAX_SAFE_INTEGER, "e1", B_SEED);
    const raise = await at("edge-9", true,  1,                       "e2", A_SEED);
    const order = chain({ e1: 1, e2: 2 });
    // Version alone hands the edge to the grab; the chain refuses it, because nobody runs ahead of an
    // epochCid that has not been minted.
    expect(foldEdgeKapae([grab, raise], ONE).has("edge-9")).toBe(false);           // scalar: the grab wins
    expect(foldEdgeKapae([grab, raise], order).has("edge-9")).toBe(true);     // chain: it does not
    expect(foldEdgeKapae([raise, grab], order).has("edge-9")).toBe(true);     // and order of arrival never matters
  });

  test("an UNKNOWN epochCid ranks below every known one — a chain we cannot walk lowers nothing", async () => {
    const raise   = await at("edge-8", true,  1,    "e1",      A_SEED);
    const foreign = await at("edge-8", false, 9_999, "unknown", B_SEED);
    expect(foldEdgeKapae([raise, foreign], chain({ e1: 1 })).has("edge-8")).toBe(true);
  });

  test("within ONE epochCid the version still orders, and a same-version tie still leaves the shadow up", async () => {
    const order = chain({ e1: 1 });
    const raise = await at("edge-7", true,  1, "e1", A_SEED);
    const lower = await at("edge-7", false, 2, "e1", B_SEED);
    expect(foldEdgeKapae([raise, lower], order).has("edge-7")).toBe(false);   // higher version supersedes
    const tie = await at("edge-6", false, 1, "e1", B_SEED);
    const up  = await at("edge-6", true,  1, "e1", A_SEED);
    expect(foldEdgeKapae([tie, up], order).has("edge-6")).toBe(true);         // remove-wins survives
  });
});
