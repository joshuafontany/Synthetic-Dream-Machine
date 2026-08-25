/**
 * bundle-tracks-source — the packed plugin must still read the grammar `src/` writes.
 *
 * TWO BUILDS SHARE THIS SUITE. Wiki-level tests dispatch through `plugins/lares-memetic-wikitext.json`;
 * unit tests import `src/` directly. That split is deliberate — a door loading the source JSON would
 * test away the drift it watches for — but nothing local ever asked whether the two AGREE.
 *
 * `plugin-artifact-parity` compares the two committed artifacts to EACH OTHER, so it stays green while
 * both lag source together, and its own header defers staleness to CI. With the build down, the bundle
 * can trail `src/` indefinitely with every local gate green.
 *
 * What that cost: a round-trip gate that parsed through the bundle and emitted through source reported
 * 600 carriers as a corpus-wide meta rewrite. The number was the distance between two builds, and it
 * moved whenever source moved while the bundle stood still — a measurement of the instrument, read as a
 * property of the corpus.
 *
 * So this asks the one question those gates assume: given the same carrier, does the packed reader
 * produce what the source reader produces? A red here means REBUILD — never that the corpus moved.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TW5Engine } from "../src/tw5-vm.js";
import { bootTestWiki, wikiSkip, skipNote, REPO } from "./test-wiki.js";
import { memeticWikitextDeserializer } from "../src/deserializer.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";

describe.skipIf(wikiSkip)(`the packed plugin tracks src/${skipNote}`, () => {
  let engine: TW5Engine;
  beforeAll(async () => { engine = await bootTestWiki(); });

  test("the packed reader and the source reader produce the same records", () => {
    // A carrier with the shapes that exercise the carriage: a prologue, an meta, ahu fragments, a frame.
    const file = "bags/lares/ha.ka.ba/lares/api/pono/ahu.mem";
    const src = readFileSync(path.join(REPO, file), "utf8");
    const uri = `lar:///${/^uri-path\s*=\s*"([^"]+)"/m.exec(src)![1]!}`;

    const packed = (engine.$tw.wiki.deserializeTiddlers(CARRIER_TYPE, src, { title: uri }) ?? []) as Array<Record<string, unknown>>;
    const source = memeticWikitextDeserializer.call(
      { wiki: engine.$tw.wiki } as never, src, { title: uri }, CARRIER_TYPE,
    ) as Array<Record<string, unknown>>;

    // Compare as DATA, keyed by title — record order carries no meaning and a positional diff would
    // report a reordering as a staleness it is not.
    const view = (rs: Array<Record<string, unknown>>) =>
      Object.fromEntries(rs.map((r) => [String(r["title"]), Object.keys(r).sort().join(",")]));
    expect(view(packed), "the packed plugin lags src/ — run: pnpm --filter @lararium/tw5 build")
      .toEqual(view(source));
  });
});
