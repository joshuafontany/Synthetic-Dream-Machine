/**
 * caller-vector-flush — the mine-free capture chain driven LIVE end-to-end: CaptureRecords → embed
 * cap (fan-out) → content palace (single-writer caller-vector put) → get by drawer-id + recall by
 * vector search. Proves S3.1's core without the daemon: the embed→commit split lands real turns.
 * Pinned to minilm (local, deterministic).
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defaultCryptoProvider, sha256Hex, utf8Bytes } from "@lararium/mesh";
import type { CaptureRecord } from "@lararium/mesh";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeEmbedCap, type EmbedCap } from "../src/embed-cap.js";
import { makeContentPalace, type ContentPalace } from "../src/content-palace.js";
import { makeCallerVectorFlush } from "../src/caller-vector-flush.js";

const TEST_TIMEOUT = 120_000;

beforeAll(() => { process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm"; });

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((c) => c())); });

const cidOf = async (r: CaptureRecord): Promise<string> =>
  `${await sha256Hex(utf8Bytes(r.source_file), defaultCryptoProvider)}_${r.chunk_index ?? 0}`;

describe("makeCallerVectorFlush (the mine-free caller-vector capture chain, live)", () => {
  test("flush embeds + commits a batch → turns land caller-vector, recallable", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cvflush-"));
    const embed: EmbedCap = makeEmbedCap();
    const content: ContentPalace = makeContentPalace(dir);
    closers.push(embed.close, content.close);
    const flush = makeCallerVectorFlush(embed, content);

    const batch: CaptureRecord[] = [
      { content: "the whale breached at dawn", source_file: "twain/1", chunk_index: 0, metadata: { src: "twain" } },
      { content: "call me Ishmael", source_file: "twain/1", chunk_index: 1, metadata: {} },
    ];
    expect(await flush(batch)).toBe(2);                       // both embedded + committed

    // landed by drawer-id (deterministic sha256(source_file)_chunk)
    const got = await content.get(await cidOf(batch[0]!));
    expect(got).not.toBeNull();
    expect(got!.document).toBe("the whale breached at dawn");
    expect(got!.metadata["src"]).toBe("twain");

    // RECALL: embed a query, search the owned plane — the whole loop, mine-free
    const q = await embed.embed(["a whale surfaced"]);
    const near = await content.search(q.vectors[0]!, { k: 2 });
    expect(near.length).toBeGreaterThanOrEqual(1);
    expect(near.every((m) => m.cid.includes("_"))).toBe(true);
  }, TEST_TIMEOUT);

  test("an empty batch files nothing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cvflush-"));
    const embed = makeEmbedCap();
    const content = makeContentPalace(dir);
    closers.push(embed.close, content.close);
    expect(await makeCallerVectorFlush(embed, content)([])).toBe(0);
  }, TEST_TIMEOUT);
});
