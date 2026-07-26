/**
 * vouch-board — the JOIN axis's board, and the reason its only read verifies.
 *
 * Every invite that reaches the lineage becomes a VOUCH EDGE, and a vouch has no second gate downstream the
 * way a carriage entry has its quorum fold. So the load-bearing test here is the FORGERY DROP: a well-formed
 * tiddler naming a real voucher with a signature that does not verify must never become mass. The rest —
 * accretion of distinct vouchers, idempotence of one voucher re-minting, place-scoping — guards the shape of
 * the DAG the price walks.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage#the-standing
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  writeVouch, verifiedVouchesFromBoard, vouchEntryKey,
  signCabalInvite, vouchDagFromInvites, emptyLarDoc, type CabalInvite, type LarDoc,
} from "../src/index.js";
import { hex, hexToBytes } from "../src/crypto.js";

const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const verify = (bytes: Uint8Array, sigHex: string, voucherDid: string) =>
  ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(voucherDid)).catch(() => false);

const ALICE = new Uint8Array(32).fill(3);
const BOB   = new Uint8Array(32).fill(4);
const PLACE = "a".repeat(64);
const OTHER = "e".repeat(64);
const LATER = "2026-08-01T00:00:00Z";

async function vouch(seed: Uint8Array, joiner: string, place = PLACE): Promise<CabalInvite> {
  return signCabalInvite({
    placeDocIdHex: place, joinerIdentityHex: joiner,
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

    const kept = await verifiedVouchesFromBoard(boardOf([real, forged]), PLACE, verify);

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
      id: "lar:///half-an-invite", tiddler: { text: JSON.stringify({ kind: "lar-cabal-invite/v1", placeDocIdHex: PLACE }) },
    } as never;

    expect(await verifiedVouchesFromBoard(doc, PLACE, verify)).toHaveLength(1);
  });

  test("TWO vouchers for one joiner accrete as two edges; one voucher re-minting stays ONE", async () => {
    const joiner = "b".repeat(64);
    const fromAlice = await vouch(ALICE, joiner);
    const fromBob   = await vouch(BOB,   joiner);
    expect(await verifiedVouchesFromBoard(boardOf([fromAlice, fromBob]), PLACE, verify)).toHaveLength(2);

    // Alice re-mints to the same joiner: same key, one edge. Re-minting must not buy out-degree — that would
    // let a voucher inflate its own branching for free, diluting its other children at no cost to itself.
    const again = await vouch(ALICE, joiner);
    expect(vouchEntryKey(PLACE, await pubOf(ALICE), joiner))
      .toBe(vouchEntryKey(again.placeDocIdHex, again.voucherDid, again.joinerIdentityHex));
    expect(await verifiedVouchesFromBoard(boardOf([fromAlice, again]), PLACE, verify)).toHaveLength(1);
  });

  test("the fold scopes to ONE place — a vouch into somewhere else is not evidence here", async () => {
    const here      = await vouch(ALICE, "b".repeat(64), PLACE);
    const elsewhere = await vouch(ALICE, "c".repeat(64), OTHER);
    const kept = await verifiedVouchesFromBoard(boardOf([here, elsewhere]), PLACE, verify);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.placeDocIdHex).toBe(PLACE);
  });

  test("an absent board yields NO lineage — fail-closed, never an empty-means-open read", async () => {
    expect(await verifiedVouchesFromBoard(null, PLACE, verify)).toEqual([]);
    expect(await verifiedVouchesFromBoard(emptyLarDoc(), PLACE, verify)).toEqual([]);
  });
});
