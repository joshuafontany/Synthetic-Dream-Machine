/**
 * content-palace — the content plane for non-memory targeted content, driven LIVE end-to-end
 * (TS facade → content_io.py → chroma): put/get round-trip · search-nearest · one-holder-per-palace.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { makeContentPalace, _liveContentHolderCount, type ContentPalace } from "../src/sensorium.js";

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
    // RELATIVE, never absolute: the registry behind this counter is a module-global Map that
    // no reset clears, so an absolute `toBe(1)` reads the whole WORKER rather than this test.
    // It holds today only because vitest's default `isolate: true` hands each file a fresh
    // module registry — an inherited default, not a stated one. The delta is what the
    // reap-don't-pile invariant actually claims: two opens on one key add ONE holder.
    const before = _liveContentHolderCount();
    openPalace(dir); openPalace(dir);
    expect(_liveContentHolderCount()).toBe(before + 1);
  }, TEST_TIMEOUT);

  test("taxonomy aggregates wings/rooms/entities across drawers (the status read)", async () => {
    const pal = openPalace(await palaceDir());
    await pal.put("d1", "a", [0.1, 0.2], { wing: "w1", room: "r1", entities: "alice;bob" });
    await pal.put("d2", "b", [0.3, 0.4], { wing: "w1", room: "r2", entities: "alice;carol" });
    const tax = await pal.taxonomy();
    expect(tax.total).toBe(2);
    expect(tax.wings).toEqual(["w1"]);
    expect(tax.rooms).toEqual(["r1", "r2"]);
    expect(tax.entities["alice"]).toBe(2);
  }, TEST_TIMEOUT);
});
