/**
 * guest-import — the one-way backfill Act driven LIVE end-to-end: a source content palace (seeded
 * caller-vector, standing in for a mine-built sidecar) copied into a fresh target, store-compatibly
 * (cid + embedding + document + metadata preserved, no re-embed), idempotent on re-run.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { makeContentPalace, type ContentPalace } from "../src/content-palace.js";
import { importGuestPalace } from "../src/guest-import.js";

const TEST_TIMEOUT = 60_000;

const opened: ContentPalace[] = [];
function open(dir: string): ContentPalace {
  const pal = makeContentPalace(dir);
  opened.push(pal);
  return pal;
}
const palaceDir = (): Promise<string> => mkdtemp(join(tmpdir(), "guest-"));
afterEach(async () => { await Promise.all(opened.splice(0).map((p) => p.close())); });

describe("importGuestPalace (source → owned content palace, store-compatible)", () => {
  test("copies every record with its vector; is idempotent on re-run", async () => {
    const source = open(await palaceDir());
    const target = open(await palaceDir());
    // seed the source (stands in for a mine-built sidecar) — caller-vector puts with embeddings.
    for (let i = 0; i < 7; i++) await source.put(`d-${i}`, `drawer ${i}`, [Math.cos(i), Math.sin(i)], { n: i });

    const r1 = await importGuestPalace(source, target, { pageSize: 3 });
    expect(r1).toEqual({ imported: 7, skipped: 0, total: 7 });

    // the vectors + docs + metadata rode across verbatim
    const got = await target.get("d-3");
    expect(got).not.toBeNull();
    expect(got!.document).toBe("drawer 3");
    expect(got!.metadata["n"]).toBe(3);
    // recall works on the target (the vector landed, searchable)
    const near = await target.search([Math.cos(3), Math.sin(3)], { k: 1 });
    expect(near[0]!.cid).toBe("d-3");

    // idempotent: a second import upserts the same cids, no duplication
    const r2 = await importGuestPalace(source, target, { pageSize: 3 });
    expect(r2.imported).toBe(7);
    expect((await target.scan({ limit: 100 })).total).toBe(7);   // still 7, not 14
  }, TEST_TIMEOUT);

  test("an empty source imports nothing", async () => {
    const r = await importGuestPalace(open(await palaceDir()), open(await palaceDir()));
    expect(r).toEqual({ imported: 0, skipped: 0, total: 0 });
  }, TEST_TIMEOUT);
});
