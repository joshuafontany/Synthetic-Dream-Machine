/**
 * handle-announce.test.ts — a Handle announces onto a synced doc and a peer recognises it off that doc.
 *
 * The bridge claims: a card written to a LarDoc round-trips through REAL Automerge save/load (the sync
 * substrate), a peer reading the doc into its HandleBook recognises the Handle, a newer card supersedes in the
 * doc's single slot while the book still refuses a rollback, cards namespace apart from other tiddlers, and a
 * malformed tiddler never throws the reader. Each is a test — proven over `Automerge.save`/`load`, not a plain
 * object, so it stands on the transport a relay actually carries.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { from, save, load, change, type Doc } from "@automerge/automerge";
import { signHandleCard, handleCardId, type HandleCard } from "../src/handle-card.js";
import { HandleBook } from "../src/handle-book.js";
import {
  writeHandleAnnounce, readHandleAnnounces, ingestAnnounceDoc, handleAnnounceKey,
} from "../src/handle-announce.js";
import { emptyLarDoc, mutableLarRecord, type LarDoc } from "../src/base-doc.js";
import { hex } from "../src/crypto.js";

const FASTJACK_SEED = new Uint8Array(32).fill(9);
const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

async function publish(seed: Uint8Array, glamour: string, over: Partial<HandleCard> = {}): Promise<HandleCard> {
  const nym = await pubOf(seed);
  return signHandleCard({
    nym, glamour, version: 1, prev: null, expiry: 4_000_000_000_000, standing: null, ...over,
  }, signer(seed));
}

/** Emulate the sync hop: serialise the doc and load a fresh copy, the way a peer receives it over the wire. */
function overTheWire(doc: Doc<LarDoc>): Doc<LarDoc> {
  return load<LarDoc>(save(doc));
}

describe("a Handle announces onto a synced doc and a peer recognises it", () => {
  test("a card written to the doc survives a real Automerge round-trip and the peer's book knows it", async () => {
    const nym = await pubOf(FASTJACK_SEED);
    const card = await publish(FASTJACK_SEED, "FastJack");

    // publisher writes its card into the announce doc (inside a change, as a caller would)
    let doc = from<LarDoc>(emptyLarDoc());
    doc = change(doc, (d) => writeHandleAnnounce(d, card));

    // peer receives the doc over the wire, ingests it
    const received = overTheWire(doc);
    const book = new HandleBook();
    const verdicts = await ingestAnnounceDoc(book, received);

    expect(verdicts.get(nym)?.ok).toBe(true);
    expect(book.get(nym)?.card.glamour).toBe("FastJack");
  });

  test("a newer card supersedes the doc's slot, and the peer's book still refuses a rollback", async () => {
    const nym = await pubOf(FASTJACK_SEED);
    const v1  = await publish(FASTJACK_SEED, "FastJack", { version: 1 });
    const v2  = await publish(FASTJACK_SEED, "FastJack the Healer", { version: 2, prev: await handleCardId(v1) });

    let doc = from<LarDoc>(emptyLarDoc());
    doc = change(doc, (d) => writeHandleAnnounce(d, v1));
    const book = new HandleBook();
    await ingestAnnounceDoc(book, overTheWire(doc));

    // publisher announces v2 — same nym, so it overwrites the single slot
    doc = change(doc, (d) => writeHandleAnnounce(d, v2));
    expect(readHandleAnnounces(overTheWire(doc))).toHaveLength(1);            // one slot per nym
    expect(readHandleAnnounces(overTheWire(doc))[0]!.version).toBe(2);

    await ingestAnnounceDoc(book, overTheWire(doc));
    expect(book.get(nym)?.highWaterVersion).toBe(2);

    // a doc that tries to re-announce the OLD v1 (a rollback) is refused by the book
    let rollbackDoc = change(doc, (d) => writeHandleAnnounce(d, v1));
    const verdicts = await ingestAnnounceDoc(book, overTheWire(rollbackDoc));
    expect(verdicts.get(nym)?.reject).toBe("rollback");
    expect(book.get(nym)?.highWaterVersion).toBe(2);                          // held face untouched
  });

  test("handle-cards namespace apart from a doc's other content", async () => {
    const card = await publish(FASTJACK_SEED, "FastJack");
    let doc = from<LarDoc>(emptyLarDoc());
    doc = change(doc, (d) => {
      d.tiddlers["lar:///ha.ka.ba/@oracle/some-post"] = mutableLarRecord(
        "lar:///ha.ka.ba/@oracle/some-post", { text: "a public post, not a card" }, "author",
      );
      writeHandleAnnounce(d, card);
    });
    // the reader picks out ONLY the handle-card tiddler, never the sibling content
    const cards = readHandleAnnounces(overTheWire(doc));
    expect(cards).toHaveLength(1);
    expect(cards[0]!.glamour).toBe("FastJack");
    expect(doc.tiddlers[handleAnnounceKey(card.nym)]).toBeDefined();
  });

  test("a malformed handle-card tiddler is skipped, never thrown", async () => {
    const good = await publish(FASTJACK_SEED, "FastJack");
    let doc = from<LarDoc>(emptyLarDoc());
    doc = change(doc, (d) => {
      writeHandleAnnounce(d, good);
      // a corrupt entry parked under the announce prefix (truncated JSON) — must not break the reader
      const badKey = `${handleAnnounceKey("f".repeat(64))}`;
      d.tiddlers[badKey] = mutableLarRecord(badKey, { text: "{not-json" }, "attacker");
    });
    const cards = readHandleAnnounces(overTheWire(doc));
    expect(cards).toHaveLength(1);                     // the good card survives; the bad one is skipped
    expect(cards[0]!.glamour).toBe("FastJack");
  });
});
