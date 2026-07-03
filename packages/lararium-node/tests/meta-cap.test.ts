/**
 * meta-cap — the consumed ingest meta-model driven LIVE (TS → meta_io.py → their heuristic
 * extractors), and the caller-vector flush STAMPING that structure (entities + hall) onto drawers so
 * the palace lands structured, not flat. No LLM. Pinned to minilm for the flush's embed leg.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defaultCryptoProvider, sha256Hex, utf8Bytes } from "@lararium/mesh";
import type { CaptureRecord } from "@lararium/mesh";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeMetaCap, _liveMetaHolderCount, type MetaCap } from "../src/meta-cap.js";
import { makeEmbedCap, type EmbedCap } from "../src/embed-cap.js";
import { makeContentPalace, type ContentPalace } from "../src/content-palace.js";
import { makeCallerVectorFlush } from "../src/caller-vector-flush.js";

const TEST_TIMEOUT = 120_000;

beforeAll(() => { process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm"; });

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((c) => c())); });

const cidOf = async (r: CaptureRecord): Promise<string> =>
  `${await sha256Hex(utf8Bytes(r.source_file), defaultCryptoProvider)}_${r.chunk_index ?? 0}`;

describe("makeMetaCap + structured caller-vector flush (live)", () => {
  test("annotate derives entities + hall from content", async () => {
    const meta: MetaCap = makeMetaCap();
    closers.push(meta.close);
    const ann = await meta.annotate("Joshua opened the shrine. Joshua fed the Lares. Joshua closed the loop.");
    expect(ann.entities.toLowerCase()).toContain("joshua");
    expect(typeof ann.hall).toBe("string");
  }, TEST_TIMEOUT);

  test("the flush stamps entities/hall so the drawer lands STRUCTURED", async () => {
    const dir = await mkdtemp(join(tmpdir(), "meta-"));
    const embed: EmbedCap = makeEmbedCap();
    const content: ContentPalace = makeContentPalace(dir);
    const meta: MetaCap = makeMetaCap();
    closers.push(embed.close, content.close, meta.close);

    const flush = makeCallerVectorFlush(embed, content, meta);
    const batch: CaptureRecord[] = [
      { content: "Joshua and Bob built the Lares node. Joshua wrote the keel.", source_file: "sess/1", chunk_index: 0, metadata: {} },
    ];
    expect(await flush(batch)).toBe(1);

    const got = await content.get(await cidOf(batch[0]!));
    expect(got).not.toBeNull();
    expect(typeof got!.metadata["entities"]).toBe("string");   // structure stamped
    expect((got!.metadata["entities"] as string).toLowerCase()).toContain("joshua");
    expect(typeof got!.metadata["hall"]).toBe("string");
  }, TEST_TIMEOUT);

  test("one meta holder per process, never a pile", async () => {
    const a = makeMetaCap(); const b = makeMetaCap();
    closers.push(a.close, b.close);
    expect(_liveMetaHolderCount()).toBe(1);
  }, TEST_TIMEOUT);
});
