/**
 * compose-follow.test.ts — the IoC follow braids the THREE LOCAL stores into one gesture, and leaves NO
 * central trace.
 *
 * Proven:
 *   · composeFollow RECOGNISES a nym (TOFU-admits a carried card, or requires an already-known nym), SETS the
 *     private petname on the handle-book, and ADDS the nym to the LOCAL circle — three local writes, one call,
 *   · NEVER-FEDERATES — the only shores composeFollow touches are the HandleBook (I/O-free) + an injected
 *     CircleStore (local); a spy CircleStore records the ONLY writes, and NOTHING else is reachable. The result
 *     reads `federated:false` at the type level,
 *   · FAIL-CLOSED — following an UNMET nym with no card REFUSES (FollowRefused/unknown-nym), and a card whose
 *     nym mismatches / fails the book rule REFUSES (card-rejected) — never a silent add,
 *   · composeUnfollow drops the edge (the book memory stays); listFollows reads members under the OWN names.
 */
import { describe, test, expect } from "vitest";
import {
  HandleBook, signHandleCard, ed25519SignerFromSeed,
  composeFollow, composeUnfollow, listFollows, FollowRefused,
  type CircleStore, type HandleCard,
} from "../src/index.js";
import * as ed from "@noble/ed25519";
import { hex } from "../src/crypto.js";

/** A spy CircleStore over an in-memory map — records EVERY write so a test can prove the ONLY writes a follow
 *  makes are local circle adds/removes (no board, no announce; none is even injectable). */
function spyCircleStore() {
  const map = new Map<string, Set<string>>();
  const writes: Array<{ op: "add" | "remove"; circleId: string; nym: string }> = [];
  const store: CircleStore = {
    add(circleId, nym) { (map.get(circleId) ?? map.set(circleId, new Set()).get(circleId)!).add(nym); writes.push({ op: "add", circleId, nym }); },
    remove(circleId, nym) { map.get(circleId)?.delete(nym); writes.push({ op: "remove", circleId, nym }); },
    members(circleId) { return [...(map.get(circleId) ?? [])].sort(); },
    circles() { return [...map.keys()].sort(); },
  };
  return { store, writes, map };
}

async function makeCard(seed: Uint8Array, glamour: string): Promise<{ nym: string; card: HandleCard }> {
  const nym = await ed.getPublicKeyAsync(seed).then(hex);
  const card = await signHandleCard(
    { nym, glamour, version: 1, prev: null, expiry: Date.now() + 86_400_000, standing: null },
    ed25519SignerFromSeed(seed),
  );
  return { nym, card };
}

describe("composeFollow — the three local stores, one gesture, no trace", () => {
  test("TOFU-admits a carried card, sets the private petname, adds to the circle — federated:false", async () => {
    const book = new HandleBook();
    const { store, writes } = spyCircleStore();
    const { nym, card } = await makeCard(new Uint8Array(32).fill(3), "Discordia");

    const result = await composeFollow({ book, circles: store, nym, circleId: "following", petname: "my-eris", card });

    expect(result.federated).toBe(false);         // the never-federates proof at the type + value level
    expect(result.recognized).toBe(true);
    expect(result.petname).toBe("my-eris");
    // The book learned the nym (TOFU) + kept the PRIVATE label; the circle holds the edge.
    expect(book.get(nym)?.petname).toBe("my-eris");
    expect(store.members("following")).toEqual([nym]);
    // The ONLY store write was the local circle add — no board/announce write exists to make.
    expect(writes).toEqual([{ op: "add", circleId: "following", nym }]);
  });

  test("an already-known nym follows with NO card (recognition stands from the book)", async () => {
    const book = new HandleBook();
    const { store } = spyCircleStore();
    const { nym, card } = await makeCard(new Uint8Array(32).fill(7), "known");
    await book.ingest(card);                       // met before, out of band

    const result = await composeFollow({ book, circles: store, nym, circleId: "circles" });
    expect(result.recognized).toBe(true);
    expect(result.federated).toBe(false);
    expect(store.members("circles")).toEqual([nym]);
  });

  test("FAIL-CLOSED — an UNMET nym with no card REFUSES (unknown-nym), writes nothing", async () => {
    const book = new HandleBook();
    const { store, writes } = spyCircleStore();
    await expect(composeFollow({ book, circles: store, nym: "ab".repeat(32), circleId: "following" }))
      .rejects.toMatchObject({ name: "FollowRefused", reason: "unknown-nym" });
    expect(writes).toEqual([]);                    // nothing landed — fail-closed
  });

  test("FAIL-CLOSED — a card whose nym mismatches the followed nym REFUSES (card-rejected)", async () => {
    const book = new HandleBook();
    const { store, writes } = spyCircleStore();
    const { card } = await makeCard(new Uint8Array(32).fill(5), "someone");
    await expect(composeFollow({ book, circles: store, nym: "cd".repeat(32), circleId: "following", card }))
      .rejects.toBeInstanceOf(FollowRefused);
    expect(writes).toEqual([]);
  });

  test("composeUnfollow drops the edge; the book memory stays; listFollows reads under OWN names", async () => {
    const book = new HandleBook();
    const { store } = spyCircleStore();
    const { nym, card } = await makeCard(new Uint8Array(32).fill(9), "GlamourName");
    await composeFollow({ book, circles: store, nym, circleId: "following", petname: "pal", card });

    const view = await listFollows(book, store, "following");
    expect(view).toEqual([{ nym, petname: "pal", glamour: "GlamourName" }]);

    const un = await composeUnfollow({ circles: store, nym, circleId: "following" });
    expect(un.federated).toBe(false);
    expect(store.members("following")).toEqual([]);   // the edge lifted
    expect(book.get(nym)).toBeDefined();               // the recogniser still knows the key it met
  });
});
