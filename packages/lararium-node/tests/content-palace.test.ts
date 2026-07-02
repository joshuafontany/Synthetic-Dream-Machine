/**
 * content-palace — the content plane for non-memory targeted content, driven LIVE end-to-end
 * (TS facade → content_io.py → chroma): put/get round-trip · search-nearest · one-holder-per-palace.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { makeContentPalace, _liveContentHolderCount, type ContentPalace } from "../src/content-palace.js";

const TEST_TIMEOUT = 60_000;

const opened: ContentPalace[] = [];
function openPalace(dir: string): ContentPalace {
  const pal = makeContentPalace(dir);
  opened.push(pal);
  return pal;
}
const palaceDir = (): Promise<string> => mkdtemp(join(tmpdir(), "content-"));
afterEach(async () => { await Promise.all(opened.splice(0).map((p) => p.close())); });

describe("makeContentPalace (non-memory targeted content, driven live)", () => {
  test("put → get round-trips a content record", async () => {
    const pal = openPalace(await palaceDir());
    await pal.put("c-1", "Call me Ishmael.", [0.1, 0.2, 0.3], { source: "twain", chap: 1 });
    const got = await pal.get("c-1");
    expect(got).not.toBeNull();
    expect(got!.cid).toBe("c-1");
    expect(got!.document).toBe("Call me Ishmael.");
    expect(got!.metadata["source"]).toBe("twain");
  }, TEST_TIMEOUT);

  test("get absent → null", async () => {
    expect(await openPalace(await palaceDir()).get("nope")).toBeNull();
  }, TEST_TIMEOUT);

  test("search returns k matches over the content (the search wire, live)", async () => {
    const pal = openPalace(await palaceDir());
    for (let i = 0; i < 5; i++) await pal.put(`c-${i}`, `line ${i}`, [Math.cos(i), Math.sin(i)], { chap: i });
    const near = await pal.search([1, 0], { k: 3 });
    expect(near).toHaveLength(3);
    expect(near.every((m) => m.cid.startsWith("c-"))).toBe(true);
    expect(near.every((m) => typeof m.distance === "number")).toBe(true);
  }, TEST_TIMEOUT);

  test("one holder per palace, never a pile", async () => {
    const dir = await palaceDir();
    openPalace(dir); openPalace(dir);
    expect(_liveContentHolderCount()).toBe(1);
  }, TEST_TIMEOUT);
});
