/**
 * content-recall — owned-plane semantic recall driven LIVE: seed the content palace via the
 * caller-vector chain (embed→put), then recall by a natural-language query — the embed→search
 * composition returns the semantically-nearest drawer, document + metadata in hand. Mine-free,
 * on the sovereign plane. Pinned to minilm.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeEmbedCap, type EmbedCap } from "../src/embed-cap.js";
import { makeContentPalace, type ContentPalace } from "../src/content-palace.js";
import { recallContent } from "../src/content-recall.js";

const TEST_TIMEOUT = 120_000;

beforeAll(() => { process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm"; });

let embed: EmbedCap;
const opened: ContentPalace[] = [];
afterEach(async () => {
  await Promise.all(opened.splice(0).map((p) => p.close()));
  if (embed) await embed.close();
});

describe("recallContent (owned-plane semantic recall, live)", () => {
  test("recalls the semantically-nearest drawer to a natural-language query", async () => {
    embed = makeEmbedCap();
    const content = makeContentPalace(await mkdtemp(join(tmpdir(), "recall-")));
    opened.push(content);

    // seed via the real embed→put chain (store-compatible caller-vector)
    const seed: Array<[string, string]> = [
      ["ocean", "the whale surfaced and breached against the grey sea"],
      ["cooking", "she simmered the broth with garlic and thyme for hours"],
      ["space", "the rover crossed the red dust under a thin martian sky"],
    ];
    for (const [cid, text] of seed) {
      const { vectors } = await embed.embed([text]);
      await content.put(cid, text, vectors[0]!, { topic: cid });
    }

    const hits = await recallContent(embed, content, "a marine mammal in the water", { k: 3 });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]!.cid).toBe("ocean");                    // the whale drawer is nearest
    expect(hits[0]!.document).toContain("whale");          // the document rode back with the hit
    expect(hits[0]!.metadata["topic"]).toBe("ocean");

    // where-filter narrows the structured path
    const filtered = await recallContent(embed, content, "food", { k: 3, where: { topic: "cooking" } });
    expect(filtered.every((h) => h.metadata["topic"] === "cooking")).toBe(true);
  }, TEST_TIMEOUT);

  test("a blank query recalls nothing", async () => {
    embed = makeEmbedCap();
    const content = makeContentPalace(await mkdtemp(join(tmpdir(), "recall-")));
    opened.push(content);
    expect(await recallContent(embed, content, "   ")).toEqual([]);
  }, TEST_TIMEOUT);
});
