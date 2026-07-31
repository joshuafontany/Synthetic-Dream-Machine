/**
 * search-cap — the CONSUMED hybrid search driven LIVE (TS → search_io.py → search_memories) over an
 * owned content palace seeded via the caller-vector chain. Proves the consume end-to-end: their
 * BM25+vector re-rank surfaces the right drawer through the lares cap. Pinned to minilm.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeEmbedCap, type EmbedCap } from "../src/embed-cap.js";
import { makeContentPalace, type ContentPalace } from "../src/sensorium.js";
import { makeSearchCap, _liveSearchHolderCount, type SearchCap } from "../src/search-cap.js";

const TEST_TIMEOUT = 120_000;

beforeAll(() => { process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm"; });

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((c) => c())); });

describe("makeSearchCap (consumed hybrid search over the owned palace, live)", () => {
  test("finds the semantically+lexically right drawer through the consumed search", async () => {
    const dir = await mkdtemp(join(tmpdir(), "searchcap-"));
    const embed: EmbedCap = makeEmbedCap();
    const content: ContentPalace = makeContentPalace(dir);
    closers.push(embed.close, content.close);
    for (const [cid, text] of [
      ["d1", "the whale breached against the grey open sea"],
      ["d2", "she simmered garlic broth with thyme for hours"],
      ["d3", "the rover crossed the red martian dust"],
    ] as const) {
      const { vectors } = await embed.embed([text]);
      await content.put(cid, text, vectors[0]!, {});
    }
    await content.close(); // release the write holder before the read holder opens the same dir

    const search: SearchCap = makeSearchCap(dir);
    closers.push(search.close);
    const res = await search.search("a marine mammal in the ocean", { k: 3 });
    expect(res.results.length).toBeGreaterThanOrEqual(1);
    expect(res.results.some((h) => h.text.includes("whale"))).toBe(true);
  }, TEST_TIMEOUT);

  test("one search holder per palace, never a pile", async () => {
    const dir = await mkdtemp(join(tmpdir(), "searchcap-"));
    // RELATIVE, never absolute: the registry behind this counter is a module-global Map that
    // no reset clears, so an absolute `toBe(1)` reads the whole WORKER rather than this test.
    // It holds today only because vitest's default `isolate: true` hands each file a fresh
    // module registry — an inherited default, not a stated one. The delta is what the
    // reap-don't-pile invariant actually claims: two opens on one key add ONE holder.
    const before = _liveSearchHolderCount();
    const a = makeSearchCap(dir); const b = makeSearchCap(dir);
    closers.push(a.close, b.close);
    expect(_liveSearchHolderCount()).toBe(before + 1);
  }, TEST_TIMEOUT);
});
