/**
 * embed-cap — the node embed cap driven LIVE end-to-end (TS → embed_io.py → the ONNX embedder):
 * a real text→vector round-trip, store-compatible 384-dim, one holder per process. Pinned to minilm
 * (local, no 300MB download) via the spawned env.
 */
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeEmbedCap, _liveEmbedHolderCount, type EmbedCap } from "../src/embed-cap.js";

const TEST_TIMEOUT = 120_000;

beforeAll(() => {
  // the spawned embed_io inherits process.env — pin the local, deterministic model (no HF download).
  process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm";
});

const opened: EmbedCap[] = [];
function open(): EmbedCap {
  const cap = makeEmbedCap();
  opened.push(cap);
  return cap;
}
afterEach(async () => { await Promise.all(opened.splice(0).map((c) => c.close())); });

describe("makeEmbedCap (text→vector, driven live)", () => {
  test("embeds a batch → store-compatible 384-dim vectors", async () => {
    const r = await open().embed(["the verb leads", "call me Ishmael"]);
    expect(r.dim).toBe(384);
    expect(r.vectors).toHaveLength(2);
    expect(r.vectors[0]).toHaveLength(384);
    expect(r.model).toBeTruthy();
  }, TEST_TIMEOUT);

  test("an empty batch → no vectors (never crashes the holder)", async () => {
    expect((await open().embed([])).vectors).toEqual([]);
  }, TEST_TIMEOUT);

  test("one holder per process, never a pile", async () => {
    // ABSOLUTE, and deliberately so — unlike the dir-keyed palaces this counter belongs to a
    // LABEL-keyed holder: `composeEncoder` keys by label because the MODEL is the resource, so
    // one holder serves the whole process and `1` IS the contract, not an artifact of counting
    // from zero. A relative `before + 1` states the opposite and fails correctly (proven: with a
    // sibling holding an unclosed encoder, the relative form reads `expected 1 to be 2` while the
    // singleton it should be asserting is intact). The dir-keyed suites read relative; this one
    // must not.
    open(); open();
    expect(_liveEmbedHolderCount()).toBe(1);
  }, TEST_TIMEOUT);
});
