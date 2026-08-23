/**
 * who-face.test.ts — resolve the per-Nexus WHO board through crossroads, then announce onto it.
 *
 * Proven over a real Automerge Repo: first resolve MINTS the board and writes its pointer into crossroads;
 * a second resolve READS the same pointer (idempotent, no re-mint); an announced card is recognised off the
 * resolved board; and a different nexus resolves a DISTINCT board (island scoping). This is the founding
 * wiring's core, provable in-process before any node/relay HTTP.
 */
import { describe, test, expect } from "vitest";
import { Repo, type AutomergeUrl, type DocHandle } from "@automerge/automerge-repo";
import * as ed from "@noble/ed25519";
import { resolveWhoFace, announceToWhoFace } from "../src/who-face.js";
import { ingestAnnounceDoc } from "../src/handle-announce.js";
import { HandleBook } from "../src/handle-book.js";
import { signHandleCard, type HandleCard } from "../src/handle-card.js";
import { emptyLarDoc, tiddlerText, type LarDoc } from "../src/base-doc.js";
import { nexusHandlesUri } from "../src/lar-uris.js";
import { hex } from "../src/crypto.js";

const FASTJACK_SEED = new Uint8Array(32).fill(9);
const NEXUS = "abcdef0123456789";
const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

async function publish(seed: Uint8Array, glamour: string): Promise<HandleCard> {
  return signHandleCard({
    nym: await pubOf(seed), glamour, version: 1, prev: null, expiry: 4_000_000_000_000, standing: null,
  }, signer(seed));
}

/** The platform repo strategy resolveOracleDoc splits on — open the pointer's doc, or mint a blank one. */
function makeResolve(repo: Repo) {
  return async (url: string | null): Promise<DocHandle<LarDoc>> =>
    url ? await repo.find<LarDoc>(url as AutomergeUrl) : repo.create<LarDoc>(emptyLarDoc());
}

describe("resolve the per-Nexus WHO board through crossroads", () => {
  test("first resolve mints the board and writes its pointer onto crossroads", async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const crossroads = repo.create<LarDoc>(emptyLarDoc());
    const who = await resolveWhoFace(crossroads, NEXUS, makeResolve(repo), "test");

    // crossroads now advertises the board's URL at the nexusHandlesUri key
    const pointer = tiddlerText(crossroads.doc()?.tiddlers?.[nexusHandlesUri(NEXUS)]);
    expect(pointer).toBe(who.url);
  });

  test("a second resolve reads the SAME pointer — idempotent, never a re-mint", async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const crossroads = repo.create<LarDoc>(emptyLarDoc());
    const first  = await resolveWhoFace(crossroads, NEXUS, makeResolve(repo), "test");
    const second = await resolveWhoFace(crossroads, NEXUS, makeResolve(repo), "test");
    expect(second.url).toBe(first.url);   // resolved the existing board, minted nothing new
  });

  test("a card announced onto the resolved board is recognised off it", async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const crossroads = repo.create<LarDoc>(emptyLarDoc());
    const who = await resolveWhoFace(crossroads, NEXUS, makeResolve(repo), "test");

    const card = await publish(FASTJACK_SEED, "FastJack");
    announceToWhoFace(who, card);

    const book = new HandleBook();
    await ingestAnnounceDoc(book, who.doc()!);
    expect(book.get(await pubOf(FASTJACK_SEED))?.card.glamour).toBe("FastJack");
  });

  test("a different Nexus resolves a DISTINCT board — the WHO plane shards per island", async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const crossroads = repo.create<LarDoc>(emptyLarDoc());
    const boardA = await resolveWhoFace(crossroads, "nexusA", makeResolve(repo), "test");
    const boardB = await resolveWhoFace(crossroads, "nexusB", makeResolve(repo), "test");
    expect(boardB.url).not.toBe(boardA.url);
    // and crossroads carries a distinct pointer per nexus
    expect(tiddlerText(crossroads.doc()?.tiddlers?.[nexusHandlesUri("nexusA")])).toBe(boardA.url);
    expect(tiddlerText(crossroads.doc()?.tiddlers?.[nexusHandlesUri("nexusB")])).toBe(boardB.url);
  });
});
