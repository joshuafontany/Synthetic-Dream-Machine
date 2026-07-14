/**
 * who-plane-announce.test.ts — the ANNOUNCE leg, end to end: two vessels announce onto ONE shared per-nexus
 * WHO face, their concurrent writes CONVERGE, and each recognises the other. This is Leg 2's equivalent of
 * bind-under-handle (Leg 1) — it proves the milestone's "announce themselves on the network" at the library
 * level, short of the two-browser human-loop.
 *
 * The sync model under test is the per-nexus shared board (canon: "one public board per confederation"): both
 * vessels write their card into their own replica of the WHO-face doc, the replicas MERGE (the relay's job in
 * production), and both read the merged board into a HandleBook. Recognition is self-certifying + local
 * petname — never a registry. Proven over real Automerge merge, so it stands on the transport a relay carries.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { from, merge, change, clone } from "@automerge/automerge";
import { signHandleCard, handleCardId, type HandleCard } from "../src/handle-card.js";
import { HandleBook } from "../src/handle-book.js";
import { writeHandleAnnounce, ingestAnnounceDoc } from "../src/handle-announce.js";
import { emptyLarDoc, type LarDoc } from "../src/base-doc.js";
import { nexusHandlesUri } from "../src/lar-uris.js";
import { hex } from "../src/crypto.js";

/** Two of a human's anon vessels — each holds its OWN veiled-user key (the Handle it will announce). */
const VESSEL_A_SEED = new Uint8Array(32).fill(11);
const VESSEL_B_SEED = new Uint8Array(32).fill(22);
/** The nexus scope-id — in production the shared relay's confederation key; here a fixed island id. */
const NEXUS_PUBKEY  = "abcdef0123456789";

const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

async function announce(seed: Uint8Array, glamour: string, over: Partial<HandleCard> = {}): Promise<HandleCard> {
  const nym = await pubOf(seed);
  return signHandleCard({
    nym, glamour, version: 1, prev: null, expiry: 4_000_000_000_000, standing: null, ...over,
  }, signer(seed));
}

describe("two vessels announce onto one shared per-nexus WHO face and recognise each other", () => {
  test("concurrent announces converge on the merged board, and each vessel recognises the other", async () => {
    const nymA = await pubOf(VESSEL_A_SEED);
    const nymB = await pubOf(VESSEL_B_SEED);
    const cardA = await announce(VESSEL_A_SEED, "FastJack");
    const cardB = await announce(VESSEL_B_SEED, "Dodger");

    // Each vessel starts from its OWN replica (clone → shared history, distinct actor) of the shared WHO face
    // and announces its card concurrently.
    const genesis = from<LarDoc>(emptyLarDoc());
    let replicaA = clone(genesis);
    let replicaB = clone(genesis);
    replicaA = change(replicaA, (d) => writeHandleAnnounce(d, cardA));
    replicaB = change(replicaB, (d) => writeHandleAnnounce(d, cardB));

    // The relay merges the replicas (both directions) — the board CONVERGES with BOTH cards, no conflict
    // (each card rides its own nym-keyed slot, so the writes never collide).
    const boardA = merge(clone(replicaA), replicaB);
    const boardB = merge(clone(replicaB), replicaA);

    // Each vessel reads the converged board into its own recogniser book.
    const bookA = new HandleBook();
    const bookB = new HandleBook();
    await ingestAnnounceDoc(bookA, boardA);
    await ingestAnnounceDoc(bookB, boardB);

    // BOUND: each vessel now recognises the OTHER's Handle (and its own).
    expect(bookA.get(nymB)?.card.glamour).toBe("Dodger");     // A recognises B
    expect(bookB.get(nymA)?.card.glamour).toBe("FastJack");   // B recognises A
    expect(bookA.nyms().sort()).toEqual([nymA, nymB].sort());  // the whole island is on A's board

    // The petname is LOCAL — A names B in its own book; the name never rode the wire.
    expect(bookA.setPetname(nymB, "the mover who healed Neo-Thracia")).toBe(true);
    expect(bookB.get(nymA)?.petname).toBeNull();               // B's book knows no such petname
  });

  test("the shared face is nexus-scoped — the same cards on a different island are a distinct board", () => {
    // The doc URI carries the island reach; the tiddler key (the nym) carries the portable identity.
    expect(nexusHandlesUri(NEXUS_PUBKEY)).toContain(NEXUS_PUBKEY);
    expect(nexusHandlesUri("other-nexus")).not.toBe(nexusHandlesUri(NEXUS_PUBKEY));
  });

  test("a re-announced newer card supersedes across the merge; a stale copy cannot roll it back", async () => {
    const nymA = await pubOf(VESSEL_A_SEED);
    const v1 = await announce(VESSEL_A_SEED, "FastJack", { version: 1 });
    const v2 = await announce(VESSEL_A_SEED, "FastJack the Healer", { version: 2, prev: await handleCardId(v1) });

    // The board starts at v1; a straggler replica freezes there while the main board re-announces v2.
    const boardV1 = change(from<LarDoc>(emptyLarDoc()), (d) => writeHandleAnnounce(d, v1));
    const book = new HandleBook();
    await ingestAnnounceDoc(book, boardV1);
    const straggler = clone(boardV1);                                    // a replica still carrying only v1
    const board = change(clone(boardV1), (d) => writeHandleAnnounce(d, v2));   // main advances to v2
    await ingestAnnounceDoc(book, board);
    expect(book.get(nymA)?.highWaterVersion).toBe(2);

    // the straggler merges back in — whichever card wins the nym slot, the book cannot be rolled back
    const merged = merge(clone(board), straggler);
    const verdicts = await ingestAnnounceDoc(book, merged);
    // whichever card won the merge slot: if v1 surfaced, the book refuses it as a rollback; the held face stays v2
    expect(book.get(nymA)?.highWaterVersion).toBe(2);
    if (verdicts.get(nymA)?.ok === false) expect(verdicts.get(nymA)?.reject).toBe("rollback");
  });
});
