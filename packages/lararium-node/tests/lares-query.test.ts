/**
 * lares-query — the verb-first, lens-parameterized surface driven LIVE: search · relate · structure ·
 * status, each with the lens as an argument, dispatching to the per-lens cap-stack. Proves the
 * kupono surface (verb=tool, lens=param). Pinned to minilm.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeEmbedCap, type EmbedCap } from "../src/embed-cap.js";
import { makeContentPalace, type ContentPalace } from "../src/content-palace.js";
import { makeLaresQuery, type LaresQuery } from "../src/lares-query.js";

const TEST_TIMEOUT = 120_000;

beforeAll(() => { process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm"; });

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((c) => c())); });

describe("makeLaresQuery (verb-first, lens-parameterized, live)", () => {
  test("search · relate · structure · status all dispatch by lens over one palace", async () => {
    const dir = await mkdtemp(join(tmpdir(), "laresq-"));
    // seed the "content" lens via the caller-vector chain; KEEP it open — composeHolder ref-counts,
    // so the query surface SHARES the same content holder (closing seed early would race the singleton).
    const embed: EmbedCap = makeEmbedCap();
    const seed: ContentPalace = makeContentPalace(dir);
    closers.push(embed.close, seed.close);
    for (const [cid, text] of [
      ["d1", "alice and bob mapped the whale migration"],
      ["d2", "alice charted the whale migration with bob"],
    ] as const) {
      const { vectors } = await embed.embed([text]);
      await seed.put(cid, text, vectors[0]!, { wing: "w1", entities: "alice;bob;whale", room: "r1" });
    }

    const q: LaresQuery = makeLaresQuery({ content: dir });
    closers.push(q.close);

    // search verb, content lens
    const hits = await q.search("content", "a large marine animal's route", { k: 2 });
    expect(hits.results.length).toBeGreaterThanOrEqual(1);

    // status verb: taxonomy over the lens
    const tax = await q.status("content");
    expect(tax.wings).toEqual(["w1"]);
    expect(tax.entities["alice"]).toBe(2);

    // structure verb: hallways from entity co-occurrence
    const halls = await q.structure("content", "w1", { minCount: 2 });
    expect(Array.isArray(halls)).toBe(true);
    expect(halls.length).toBeGreaterThanOrEqual(1);

    // relate verb (the lens's KG) — no triples seeded, so empty-but-serializable, must not throw
    JSON.stringify(await q.relate("content", "alice"));

    // the surface reports its lenses
    expect(q.lenses()).toEqual(["content"]);
  }, TEST_TIMEOUT);

  test("an unknown lens fails loud", async () => {
    const q = makeLaresQuery({ content: "/tmp/x" });
    closers.push(q.close);
    await expect(q.status("nope")).rejects.toThrow(/unknown lens/);
  }, TEST_TIMEOUT);
});
