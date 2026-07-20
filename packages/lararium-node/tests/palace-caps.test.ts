/**
 * palace-caps — the UNIFIED cap-stack driven LIVE over ONE palace dir: content · search · kg · graph
 * all compose and operate on the same palace, proving "all caps flow to every palace entity". Pinned
 * to minilm.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeEmbedCap, type EmbedCap } from "../src/embed-cap.js";
import { composePalaceCaps, type PalaceCaps } from "../src/sensorium.js";

const TEST_TIMEOUT = 120_000;

beforeAll(() => { process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm"; });

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((c) => c())); });

describe("composePalaceCaps (the uniform cap-stack over one palace, live)", () => {
  test("content · search · kg · graph all flow over the SAME palace dir", async () => {
    const dir = await mkdtemp(join(tmpdir(), "palacecaps-"));
    const embed: EmbedCap = makeEmbedCap();
    const caps: PalaceCaps = composePalaceCaps(dir);
    closers.push(embed.close, caps.close);

    // content: put two drawers (with structuring metadata) via the caller-vector chain
    for (const [cid, text] of [
      ["d1", "alice and bob built the whale sonar"],
      ["d2", "alice tuned the whale sonar with bob"],
    ] as const) {
      const { vectors } = await embed.embed([text]);
      await caps.content.put(cid, text, vectors[0]!, { wing: "w1", entities: "alice;bob;whale", room: "r1" });
    }

    // search: the consumed hybrid finds a drawer
    const hits = await caps.search.search("a marine mammal detector", { k: 2 });
    expect(hits.results.length).toBeGreaterThanOrEqual(1);

    // kg: add + query a triple over the same palace's kg sqlite
    await caps.kg.addTriple("alice", "collaborates_with", "bob");
    expect(JSON.stringify(await caps.kg.queryEntity("alice")).toLowerCase()).toContain("bob");

    // graph: the entity co-occurrence surfaces a hallway
    const halls = await caps.graph.hallways("w1", 2);
    expect(Array.isArray(halls)).toBe(true);
    expect(halls.length).toBeGreaterThanOrEqual(1);

    // taxonomy (content op): the status read aggregates
    const tax = await caps.content.taxonomy();
    expect(tax.wings).toEqual(["w1"]);
    expect(tax.entities["alice"]).toBe(2);
  }, TEST_TIMEOUT);
});
