/**
 * astpalace — the LOCAL content-addressed AST store + the routing split. Asserts: store→read by
 * hash; identical structures collide to one hash (the recurrence/frequency signal); the split routes
 * the AST out to .astpalace and leaves the drawer with verbatim + lar_ast_hash (inline lar_ast gone).
 */

import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CaptureRecord } from "@lararium/mesh";
import { describe, expect, test } from "vitest";

import { makeAstPalace } from "../src/astpalace.js";
import { makeAstSplitFlush } from "../src/node-capture-engine.js";

const tree = { kind: "meme", uri: "lar:///turn", body: [{ kind: "sigil", word: "lares", args: "aim" }] };
// SAME structure, keys in a DIFFERENT order — canonical-JSON must hash them identically.
const sameTreeReordered = { body: [{ args: "aim", word: "lares", kind: "sigil" }], uri: "lar:///turn", kind: "meme" };
const otherTree = { kind: "meme", uri: "lar:///turn", body: [{ kind: "sigil", word: "hud", args: "Aperture(10)" }] };

async function palaceDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "astpalace-"));
}

describe("makeAstPalace", () => {
  test("store an AST → read it back by its structural hash", async () => {
    const pal = makeAstPalace(await palaceDir());
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
  });

  test("identical structures collide to ONE hash and bump count (the recurrence signal)", async () => {
    const dir = await palaceDir();
    const pal = makeAstPalace(dir);
    const { hash: h1 } = await pal.put(tree, { source_file: "nalu://run/1", content: "first" });
    const { hash: h2 } = await pal.put(sameTreeReordered, { source_file: "nalu://run/2", content: "second" });
    expect(h2).toBe(h1); // canonical-JSON: key order does not change the structural hash
    const entry = await pal.get(h1);
    expect(entry!.count).toBe(2);
    expect(entry!.provenance).toHaveLength(2); // distinct verbatim turns both bound to the one structure

    // A DIFFERENT structure lands a DIFFERENT hash (a second file in the store).
    const { hash: h3 } = await pal.put(otherTree, { source_file: "nalu://run/3", content: "third" });
    expect(h3).not.toBe(h1);
  });

  test("a repeated verbatim does not double-count provenance", async () => {
    const pal = makeAstPalace(await palaceDir());
    const { hash: h } = await pal.put(tree, { source_file: "nalu://run/1", content: "same" });
    await pal.put(tree, { source_file: "nalu://run/1", content: "same" });
    const entry = await pal.get(h);
    expect(entry!.count).toBe(2); // recurrence still tallies
    expect(entry!.provenance).toHaveLength(1); // but the identical link is not re-appended
  });

  test("get on an unknown/malformed hash returns null", async () => {
    const pal = makeAstPalace(await palaceDir());
    expect(await pal.get("not-a-hash")).toBeNull();
    expect(await pal.get("a".repeat(64))).toBeNull();
  });
});

describe("makeAstSplitFlush — the routing split", () => {
  test("routes AST → .astpalace, leaves drawer with verbatim + lar_ast_hash (inline lar_ast gone)", async () => {
    const dir = await palaceDir();
    const pal = makeAstPalace(dir);
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
    const out = filed[0];
    expect(out.content).toBe("the verb leads");
    expect(out.metadata!["lar_ast"]).toBeUndefined();
    expect(out.metadata!["lar_band"]).toBe("synthesis"); // sibling metadata untouched
    const hash = out.metadata!["lar_ast_hash"] as string;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(out.metadata!["lar_verbatim_sha"]).toMatch(/^[0-9a-f]{64}$/); // the deterministic back-key flows through at flush

    // The structure is recoverable from .astpalace by that hash — the two stores joined by the hash.
    const entry = await pal.get(hash);
    expect(entry!.ast).toEqual(tree);
    expect(entry!.provenance[0].source_file).toBe("nalu://run/1");
  });

  test("a record without inline lar_ast passes straight through", async () => {
    const pal = makeAstPalace(await palaceDir());
    let filed: CaptureRecord[] = [];
    const split = makeAstSplitFlush(async (b) => { filed = [...b]; return b.length; }, pal);
    const rec: CaptureRecord = { content: "x", source_file: "s/1", metadata: { lar_band: "raw" } };
    await split([rec]);
    expect(filed[0]).toEqual(rec); // untouched
  });

  test("a malformed inline lar_ast never sinks the capture (rides through intact)", async () => {
    const dir = await palaceDir();
    const pal = makeAstPalace(dir);
    let filed: CaptureRecord[] = [];
    const split = makeAstSplitFlush(async (b) => { filed = [...b]; return b.length; }, pal);
    const rec: CaptureRecord = { content: "x", source_file: "s/1", metadata: { lar_ast: "{not json" } };
    await split([rec]);
    expect(filed[0].metadata!["lar_ast"]).toBe("{not json"); // kept — capture conserved (drop-honesty)
    expect(filed[0].metadata!["lar_ast_hash"]).toBeUndefined();
    // nothing was written to the store
    await expect(readdir(dir)).resolves.toEqual([]);
  });
});
