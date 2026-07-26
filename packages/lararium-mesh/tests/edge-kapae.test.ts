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
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  signEdgeKapae, edgeKapaeBytes, edgeKapaeKey, writeEdgeKapae, edgeKapaeActsFromBoard,
  foldEdgeKapae, edgeShadowed, verifiedShadowSet, shadowSetFromBoard, edgeKapaeBoardDocUrl,
  emptyLarDoc, type EdgeKapae,
} from "../src/index.js";
import { hex, hexToBytes } from "../src/crypto.js";

const A_SEED = new Uint8Array(32).fill(11);   // admin A
const B_SEED = new Uint8Array(32).fill(12);   // admin B
const EPOCH  = "epoch0-aaa";

const signer = (s: Uint8Array) => (b: Uint8Array) => ed.signAsync(b, s).then(hex);
const pubOf  = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);
const verify = (b: Uint8Array, sig: string, did: string) =>
  ed.verifyAsync(hexToBytes(sig), b, hexToBytes(did)).catch(() => false);

const act = (edgeId: string, raised: boolean, version: number, seed: Uint8Array) =>
  signEdgeKapae({ edgeId, raised, version, epoch: EPOCH }, signer(seed));

describe("remove-wins — the asymmetry that carries the guarantee", () => {
  test("★ a same-version RAISE and LOWER leave the shadow UP ★", async () => {
    const raise = await act("edge-1", true,  1, A_SEED);
    const lower = await act("edge-1", false, 1, B_SEED);
    // both orders, because a merge offers no canonical one
    expect(foldEdgeKapae([raise, lower]).has("edge-1")).toBe(true);
    expect(foldEdgeKapae([lower, raise]).has("edge-1")).toBe(true);
  });

  test("a HIGHER-version lower does take the shadow down — deliberate, and it supersedes", async () => {
    const raise = await act("edge-1", true,  1, A_SEED);
    const lower = await act("edge-1", false, 2, A_SEED);
    expect(foldEdgeKapae([raise, lower]).has("edge-1")).toBe(false);
  });

  test("a STALE act cannot roll a standing decision back", async () => {
    const lower = await act("edge-1", false, 3, A_SEED);
    const stale = await act("edge-1", true,  1, A_SEED);
    expect(foldEdgeKapae([lower, stale]).has("edge-1")).toBe(false);
  });

  test("the board keys by edge, GESTURE and version, so a raise and a lower BOTH survive the merge", async () => {
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true,  1, A_SEED));
    writeEdgeKapae(doc, await act("edge-1", false, 1, B_SEED));
    expect(Object.keys(doc.tiddlers)).toHaveLength(2);          // nothing overwrote anything
    expect(edgeKapaeKey("edge-1", true, 1)).not.toBe(edgeKapaeKey("edge-1", false, 1));
    expect(foldEdgeKapae(edgeKapaeActsFromBoard(doc)).has("edge-1")).toBe(true);
  });
});

describe("mutual revocation converges without a winner", () => {
  test("★ A sets B aside while B sets A aside — BOTH stand aside, and the split reads LEGIBLE ★", async () => {
    const aOut = await act("edge-B", true, 1, A_SEED);   // A shadows B's edge
    const bOut = await act("edge-A", true, 1, B_SEED);   // B shadows A's edge, concurrently

    const shadowed = foldEdgeKapae([aOut, bOut]);
    expect(edgeShadowed("edge-A", shadowed)).toBe(true);
    expect(edgeShadowed("edge-B", shadowed)).toBe(true);
    // No tiebreak ran, because none was needed — two edges, two shadows, no contention between them.
    expect(shadowed.size).toBe(2);
  });

  test("two DIFFERENT edges never contend — the whole reason the thing-grained systems raced", async () => {
    const one = await act("edge-1", true, 1, A_SEED);
    const two = await act("edge-2", true, 1, B_SEED);
    const shadowed = foldEdgeKapae([one, two]);
    expect([...shadowed].sort()).toEqual(["edge-1", "edge-2"]);
  });
});

describe("an unverified act carries no authority", () => {
  test("★ a FORGED lower cannot take somebody else's shadow down ★", async () => {
    const authority = await pubOf(A_SEED);
    const raise  = await act("edge-1", true,  1, A_SEED);
    const forged = await act("edge-1", false, 2, B_SEED);   // B signs a lower over A's edge

    const shadowed = await verifiedShadowSet([raise, forged], () => authority, verify);
    expect(shadowed.has("edge-1")).toBe(true);              // the forgery dropped; the shadow held
  });

  test("an act on an edge with NO known authority drops", async () => {
    const raise = await act("edge-1", true, 1, A_SEED);
    expect((await verifiedShadowSet([raise], () => undefined, verify)).size).toBe(0);
  });

  test("a tampered field breaks the signature — the bytes bind edge, gesture, version and epoch", async () => {
    const authority = await pubOf(A_SEED);
    const raise = await act("edge-1", true, 1, A_SEED);
    const moved: EdgeKapae = { ...raise, edgeId: "edge-2" };
    expect((await verifiedShadowSet([moved], () => authority, verify)).size).toBe(0);

    const a = hex(edgeKapaeBytes({ kind: "lar-edge-kapae/v1", edgeId: "e", raised: true, version: 1, epoch: "x" }));
    expect(a).not.toBe(hex(edgeKapaeBytes({ kind: "lar-edge-kapae/v1", edgeId: "e", raised: false, version: 1, epoch: "x" })));
    expect(a).not.toBe(hex(edgeKapaeBytes({ kind: "lar-edge-kapae/v1", edgeId: "e", raised: true, version: 2, epoch: "x" })));
    expect(a).not.toBe(hex(edgeKapaeBytes({ kind: "lar-edge-kapae/v1", edgeId: "e", raised: true, version: 1, epoch: "y" })));
  });

  test("a torn or foreign tiddler drops, and an absent board shadows nothing", async () => {
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true, 1, A_SEED));
    doc.tiddlers["lar:///junk"] = { id: "lar:///junk", tiddler: { text: "not json" } } as never;
    doc.tiddlers["lar:///half"] = {
      id: "lar:///half", tiddler: { text: JSON.stringify({ kind: "lar-edge-kapae/v1", edgeId: "x" }) },
    } as never;
    expect(edgeKapaeActsFromBoard(doc)).toHaveLength(1);
    expect(edgeKapaeActsFromBoard(null)).toEqual([]);
    expect(foldEdgeKapae([]).size).toBe(0);
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

    const shadowed = await shadowSetFromBoard(doc, () => authority, verify);
    expect(edgeShadowed("edge-1", shadowed)).toBe(true);
  });

  test("a later LOWER on the board takes it back down — a deliberate gesture, and it lands", async () => {
    const authority = await pubOf(A_SEED);
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true,  1, A_SEED));
    writeEdgeKapae(doc, await act("edge-1", false, 2, A_SEED));

    expect((await shadowSetFromBoard(doc, () => authority, verify)).size).toBe(0);
    expect(Object.keys(doc.tiddlers)).toHaveLength(2);   // and BOTH acts survive as the record
  });

  test("★ a forged LOWER written straight onto the board cannot free the edge ★", async () => {
    const authority = await pubOf(A_SEED);
    const doc = emptyLarDoc();
    writeEdgeKapae(doc, await act("edge-1", true,  1, A_SEED));
    writeEdgeKapae(doc, await act("edge-1", false, 2, B_SEED));   // B has no authority over edge-1

    expect(edgeShadowed("edge-1", await shadowSetFromBoard(doc, () => authority, verify))).toBe(true);
  });

  // The honest floor: an absent board means nothing was set aside, never that everything is permitted.
  // The readers that consult this still verify every edge they admit, so an empty shadow set opens nothing.
  test("an ABSENT board yields no shadows, which reads as a floor rather than a permission", async () => {
    expect((await shadowSetFromBoard(null, () => "x", verify)).size).toBe(0);
    expect((await shadowSetFromBoard(emptyLarDoc(), () => "x", verify)).size).toBe(0);
  });

  test("the board address derives deterministically per Nexus, and differs across them", () => {
    expect(edgeKapaeBoardDocUrl("aa".repeat(16))).toBe(edgeKapaeBoardDocUrl("aa".repeat(16)));
    expect(edgeKapaeBoardDocUrl("aa".repeat(16))).not.toBe(edgeKapaeBoardDocUrl("bb".repeat(16)));
  });
});
