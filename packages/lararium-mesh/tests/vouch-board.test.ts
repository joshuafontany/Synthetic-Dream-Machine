/**
 * vouch-board — the JOIN axis's board, and the reason its only read verifies.
 *
 * Every invite that reaches the lineage becomes a VOUCH EDGE, and a vouch has no second gate downstream the
 * way a carriage entry has its quorum fold. So the load-bearing test here drives the FORGERY DROP: a well-formed
 * tiddler naming a real voucher with a signature that does not verify must never become mass. The rest —
 * accretion of distinct vouchers, idempotence of one voucher re-minting, realm-scoping — guards the shape of
 * the DAG the price walks.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage#the-standing
 */
import { CABAL_INVITE_DOMAIN } from "../src/domains.js";
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  writeVouch, verifiedVouchesFromBoard, vouchEntryKey,
  signCabalInvite, vouchDagFromInvites, vouchEdgeId, emptyLarDoc, type CabalInvite, type LarDoc,
} from "../src/index.js";
import { hex, hexToBytes } from "../src/crypto.js";

const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const verify = (bytes: Uint8Array, sigHex: string, voucherDid: string) =>
  ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(voucherDid)).catch(() => false);

const ALICE = new Uint8Array(32).fill(3);
const BOB   = new Uint8Array(32).fill(4);
const REALM = "a".repeat(64);
const OTHER = "e".repeat(64);
const LATER = "2026-08-01T00:00:00Z";

async function vouch(seed: Uint8Array, joiner: string, realm = REALM): Promise<CabalInvite> {
  return signCabalInvite({
    realmDocIdHex: realm, joinerIdentityHex: joiner,
    voucherDid: await pubOf(seed), expiresAt: LATER,
  }, signer(seed));
}

/** A board carrying the given invites, written the way a minting verb writes them. */
function boardOf(invites: readonly CabalInvite[]): LarDoc {
  const doc = emptyLarDoc();
  for (const i of invites) writeVouch(doc, i);
  return doc;
}

describe("vouch-board — an unverified vouch is an unbounded one", () => {
  test("★ a FORGED signature is dropped — it never becomes lineage mass ★", async () => {
    const real  = await vouch(ALICE, "b".repeat(64));
    // Same well-formed shape, same real voucherDid, a signature that simply does not verify. If this
    // survived, anyone able to write the board could mint vouch mass and price their crossing to nothing.
    const forged: CabalInvite = { ...real, joinerIdentityHex: "c".repeat(64), sig: "00".repeat(64) };

    const kept = await verifiedVouchesFromBoard(boardOf([real, forged]), REALM, verify);

    expect(kept).toHaveLength(1);
    expect(kept[0]!.joinerIdentityHex).toBe(real.joinerIdentityHex);
    // and the DAG it feeds carries only the honest edge
    expect(vouchDagFromInvites(kept).edges).toHaveLength(1);
  });

  test("a torn or foreign tiddler is skipped, never guessed", async () => {
    const real = await vouch(ALICE, "b".repeat(64));
    const doc  = boardOf([real]);
    doc.tiddlers["lar:///unrelated"]      = { id: "lar:///unrelated", tiddler: { text: "not json at all" } } as never;
    doc.tiddlers["lar:///half-an-invite"] = {
      id: "lar:///half-an-invite", tiddler: { text: JSON.stringify({ kind: CABAL_INVITE_DOMAIN, realmDocIdHex: REALM }) },
    } as never;

    expect(await verifiedVouchesFromBoard(doc, REALM, verify)).toHaveLength(1);
  });

  test("TWO vouchers for one joiner accrete as two edges; one voucher re-minting stays ONE", async () => {
    const joiner = "b".repeat(64);
    const fromAlice = await vouch(ALICE, joiner);
    const fromBob   = await vouch(BOB,   joiner);
    expect(await verifiedVouchesFromBoard(boardOf([fromAlice, fromBob]), REALM, verify)).toHaveLength(2);

    // Alice re-mints to the same joiner: same key, one edge. Re-minting must not buy out-degree — that would
    // let a voucher inflate its own branching for free, diluting its other children at no cost to itself.
    const again = await vouch(ALICE, joiner);
    expect(vouchEntryKey(REALM, await pubOf(ALICE), joiner))
      .toBe(vouchEntryKey(again.realmDocIdHex, again.voucherDid, again.joinerIdentityHex));
    expect(await verifiedVouchesFromBoard(boardOf([fromAlice, again]), REALM, verify)).toHaveLength(1);
  });

  test("the fold scopes to ONE realm — a vouch into somewhere else is not evidence here", async () => {
    const here      = await vouch(ALICE, "b".repeat(64), REALM);
    const elsewhere = await vouch(ALICE, "c".repeat(64), OTHER);
    const kept = await verifiedVouchesFromBoard(boardOf([here, elsewhere]), REALM, verify);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.realmDocIdHex).toBe(REALM);
  });

  test("an absent board yields NO lineage — fail-closed, never an empty-means-open read", async () => {
    expect(await verifiedVouchesFromBoard(null, REALM, verify)).toEqual([]);
    expect(await verifiedVouchesFromBoard(emptyLarDoc(), REALM, verify)).toEqual([]);
  });
});

describe("a withdrawn vouch stands aside, and its mass leaves the lineage", () => {
  test("★ a shadowed vouch drops though its signature verifies ★", async () => {
    const kept  = await vouch(ALICE, "b".repeat(64));
    const gone  = await vouch(ALICE, "c".repeat(64));
    const board = boardOf([kept, gone]);

    expect(await verifiedVouchesFromBoard(board, REALM, verify)).toHaveLength(2);
    const stood = await verifiedVouchesFromBoard(board, REALM, verify, new Set([vouchEdgeId(gone)]));
    expect(stood.map((i) => i.joinerIdentityHex)).toEqual([kept.joinerIdentityHex]);
  });

  // The lineage price walks these edges, so a withdrawn vouch must stop lending its mass — otherwise
  // standing a voucher deliberately took back would keep discounting a crossing forever.
  test("the withdrawn edge leaves the DAG the price walks", async () => {
    const kept = await vouch(ALICE, "b".repeat(64));
    const gone = await vouch(ALICE, "c".repeat(64));
    const stood = await verifiedVouchesFromBoard(boardOf([kept, gone]), REALM, verify,
      new Set([vouchEdgeId(gone)]));
    expect(vouchDagFromInvites(stood).edges).toHaveLength(1);
  });

  test("the edge id binds realm, voucher AND joiner — a shadow never spills onto a sibling", async () => {
    const a = await vouch(ALICE, "b".repeat(64));
    const b = await vouch(BOB,   "b".repeat(64));          // same joiner, different voucher
    const c = await vouch(ALICE, "b".repeat(64), OTHER);   // same pair, different realm
    expect(new Set([vouchEdgeId(a), vouchEdgeId(b), vouchEdgeId(c)]).size).toBe(3);
  });
});
