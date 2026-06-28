/**
 * astpalace — the `.astpalace` AST store, now a SECOND mempalace instance (same ChromaDB engine,
 * a separate palace dir) reached through ONE persistent python holder. Asserts against a REAL
 * temp-dir palace: store→read by structural hash; identical structures collide to one hash (the
 * recurrence/frequency signal); the binding navigates BOTH ways (drawer→AST · AST→drawer); the
 * routing split routes the AST out and leaves the drawer with verbatim + lar_ast_hash; and ONE
 * holder serves a palace dir, never a pile (the reap-don't-pile invariant).
 *
 * These tests drive the live helper (venv python + chromadb). Each test opens its own temp palace
 * and closes it (killing the holder) so vitest exits clean. First call per palace pays a one-time
 * chroma open, so timeouts are generous.
 */

import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CaptureRecord } from "@lararium/mesh";
import { afterEach, describe, expect, test } from "vitest";

import { makeAstPalace, _liveHolderCount, type AstPalace } from "../src/astpalace.js";
import { makeAstSplitFlush } from "../src/node-capture-engine.js";

const TEST_TIMEOUT = 60_000;

const tree = { kind: "meme", uri: "lar:///turn", body: [{ kind: "sigil", word: "lares", args: "aim" }] };
// SAME structure, keys in a DIFFERENT order — canonical-JSON must hash them identically.
const sameTreeReordered = { body: [{ args: "aim", word: "lares", kind: "sigil" }], uri: "lar:///turn", kind: "meme" };
const otherTree = { kind: "meme", uri: "lar:///turn", body: [{ kind: "sigil", word: "hud", args: "Aperture(10)" }] };

// Every palace opened in a test is registered here and closed after, so no holder process lingers.
const opened: AstPalace[] = [];
function openPalace(dir: string): AstPalace {
  const pal = makeAstPalace(dir);
  opened.push(pal);
  return pal;
}
async function palaceDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "astpalace-"));
}
afterEach(async () => {
  await Promise.all(opened.splice(0).map((p) => p.close()));
});

describe("makeAstPalace (mempalace-instance-backed)", () => {
  test("store an AST → read it back by its structural hash", async () => {
    const pal = openPalace(await palaceDir());
    const { hash } = await pal.put(tree, { source_file: "nalu://run/1", content: "the verb leads" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    const got = await pal.get(hash);
    expect(got).not.toBeNull();
    expect(got!.hash).toBe(hash);
    expect(got!.ast).toEqual(tree);
    expect(got!.count).toBe(1);
    expect(got!.provenance[0]).toEqual({
      source_file: "nalu://run/1",
      verbatim_sha: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  }, TEST_TIMEOUT);

  test("identical structures collide to ONE hash and bump count (the recurrence signal)", async () => {
    const pal = openPalace(await palaceDir());
    const { hash: h1 } = await pal.put(tree, { source_file: "nalu://run/1", content: "first" });
    const { hash: h2 } = await pal.put(sameTreeReordered, { source_file: "nalu://run/2", content: "second" });
    expect(h2).toBe(h1); // canonical-JSON: key order does not change the structural hash
    const entry = await pal.get(h1);
    expect(entry!.count).toBe(2);
    expect(entry!.provenance).toHaveLength(2); // distinct verbatim turns both bound to the one structure

    // A DIFFERENT structure lands a DIFFERENT hash (a second drawer in the store).
    const { hash: h3 } = await pal.put(otherTree, { source_file: "nalu://run/3", content: "third" });
    expect(h3).not.toBe(h1);
  }, TEST_TIMEOUT);

  test("a repeated verbatim does not double-count provenance", async () => {
    const pal = openPalace(await palaceDir());
    const { hash: h } = await pal.put(tree, { source_file: "nalu://run/1", content: "same" });
    await pal.put(tree, { source_file: "nalu://run/1", content: "same" });
    const entry = await pal.get(h);
    expect(entry!.count).toBe(2); // recurrence still tallies
    expect(entry!.provenance).toHaveLength(1); // but the identical link is not re-appended
  }, TEST_TIMEOUT);

  test("get on an unknown/malformed hash returns null", async () => {
    const pal = openPalace(await palaceDir());
    expect(await pal.get("not-a-hash")).toBeNull(); // bad format — short-circuits, no holder call
    expect(await pal.get("a".repeat(64))).toBeNull(); // well-formed but absent
  }, TEST_TIMEOUT);

  test("the binding navigates BOTH ways: drawer→AST and AST→drawer", async () => {
    const pal = openPalace(await palaceDir());
    const source_file = "nalu://session/42";
    const content = "Lares (Artificer): the verb leads";
    // Forward: a drawer holding lar_ast_hash resolves its AST entry.
    const { hash, verbatimSha } = await pal.put(tree, { source_file, content });
    const drawer = { lar_ast_hash: hash, lar_verbatim_sha: verbatimSha }; // what the verbatim drawer carries
    const entry = await pal.get(drawer.lar_ast_hash);
    expect(entry).not.toBeNull();
    expect(entry!.ast).toEqual(tree);
    // Back: the AST entry resolves its source_file + verbatim_sha (the drawer it unfolded from),
    // and they AGREE with the drawer's own keys — the join closes the loop.
    expect(entry!.provenance[0]!.source_file).toBe(source_file);
    expect(entry!.provenance[0]!.verbatim_sha).toBe(verbatimSha);
    expect(entry!.provenance[0]!.verbatim_sha).toBe(drawer.lar_verbatim_sha);
  }, TEST_TIMEOUT);
});

describe("makeAstSplitFlush — the routing split (over the live store)", () => {
  test("routes AST → .astpalace, leaves drawer with verbatim + lar_ast_hash (inline lar_ast gone)", async () => {
    const pal = openPalace(await palaceDir());
    let filed: CaptureRecord[] = [];
    const inner = async (batch: readonly CaptureRecord[]): Promise<number> => {
      filed = [...batch];
      return batch.length;
    };
    const split = makeAstSplitFlush(inner, pal);

    const rec: CaptureRecord = {
      content: "the verb leads",
      source_file: "nalu://run/1",
      metadata: { lar_band: "synthesis", lar_ast: JSON.stringify(tree) },
    };
    const n = await split([rec]);
    expect(n).toBe(1);

    // The drawer that reached the (external) mempalace: verbatim intact, lar_ast STRIPPED, hash left.
    const out = filed[0]!;
    expect(out.content).toBe("the verb leads");
    expect(out.metadata!["lar_ast"]).toBeUndefined();
    expect(out.metadata!["lar_band"]).toBe("synthesis"); // sibling metadata untouched
    const hash = out.metadata!["lar_ast_hash"] as string;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(out.metadata!["lar_verbatim_sha"]).toMatch(/^[0-9a-f]{64}$/); // the deterministic back-key flows through at flush

    // The structure is recoverable from .astpalace by that hash — the two stores joined by the hash.
    const entry = await pal.get(hash);
    expect(entry!.ast).toEqual(tree);
    expect(entry!.provenance[0]!.source_file).toBe("nalu://run/1");
  }, TEST_TIMEOUT);

  test("a record without inline lar_ast passes straight through", async () => {
    const pal = openPalace(await palaceDir());
    let filed: CaptureRecord[] = [];
    const split = makeAstSplitFlush(async (b) => { filed = [...b]; return b.length; }, pal);
    const rec: CaptureRecord = { content: "x", source_file: "s/1", metadata: { lar_band: "raw" } };
    await split([rec]);
    expect(filed[0]).toEqual(rec); // untouched
  }, TEST_TIMEOUT);

  test("a malformed inline lar_ast never sinks the capture (rides through intact)", async () => {
    const dir = await palaceDir();
    const pal = openPalace(dir);
    let filed: CaptureRecord[] = [];
    const split = makeAstSplitFlush(async (b) => { filed = [...b]; return b.length; }, pal);
    const rec: CaptureRecord = { content: "x", source_file: "s/1", metadata: { lar_ast: "{not json" } };
    await split([rec]);
    expect(filed[0]!.metadata!["lar_ast"]).toBe("{not json"); // kept — capture conserved (drop-honesty)
    expect(filed[0]!.metadata!["lar_ast_hash"]).toBeUndefined();
    // The parse failed before put() — no holder ever spawned, the palace dir stays untouched.
    await expect(readdir(dir)).resolves.toEqual([]);
  }, TEST_TIMEOUT);
});

describe("the reap-don't-pile invariant — ONE holder per palace dir", () => {
  test("two makeAstPalace on the SAME dir share ONE holder process (never a pile)", async () => {
    const dir = await palaceDir();
    const before = _liveHolderCount();
    const a = openPalace(dir);
    const b = openPalace(dir); // a SECOND opener on the same palace dir
    // Concurrent first writes through both facades: only ONE holder spawns and serves both.
    const [ra, rb] = await Promise.all([
      a.put(tree, { source_file: "nalu://a", content: "from a" }),
      b.put(otherTree, { source_file: "nalu://b", content: "from b" }),
    ]);
    expect(ra.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rb.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(_liveHolderCount()).toBe(before + 1); // exactly one new holder, not two — no pile
    // Both writes landed in the one shared palace, reachable from either facade.
    expect((await a.get(rb.hash))!.ast).toEqual(otherTree); // b's write, read through a
    expect((await b.get(ra.hash))!.ast).toEqual(tree);      // a's write, read through b

    // Closing the first reference keeps the holder alive (b still holds it); closing the last frees it.
    await a.close();
    expect(_liveHolderCount()).toBe(before + 1);
    await b.close();
    expect(_liveHolderCount()).toBe(before);
    opened.length = 0; // both already closed
  }, TEST_TIMEOUT);
});
