/**
 * synced-tree — vectors for the Confluence merge base: atomic persistence, corrupt
 * recovery, and the projector's hash-gate contract.
 */

import { describe, test, expect } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SyncedTree, contentHash, syncedTreeKey } from "../src/synced-tree.js";
import { carrierHash } from "@lararium/mesh";

describe("synced-tree — observations persist atomically", () => {
  test("set → reload reads the same observation", () => {
    const dir = mkdtempSync(join(tmpdir(), "synced-"));
    const p = join(dir, "state", "synced-tree.json");
    const t1 = new SyncedTree(p, 0);
    t1.set("lar:///a", contentHash("alpha"));
    const t2 = new SyncedTree(p, 0);
    expect(t2.get("lar:///a")).toBe(contentHash("alpha"));
    expect(t2.get("lar:///missing")).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });

  test("delete removes the observation durably", () => {
    const dir = mkdtempSync(join(tmpdir(), "synced-"));
    const p = join(dir, "synced-tree.json");
    const t = new SyncedTree(p, 0);
    t.set("lar:///a", "h1");
    t.delete("lar:///a");
    expect(new SyncedTree(p, 0).get("lar:///a")).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });

  test("corrupt tree degrades to never-projected, never throws", () => {
    const dir = mkdtempSync(join(tmpdir(), "synced-"));
    const p = join(dir, "synced-tree.json");
    writeFileSync(p, "{ torn json", "utf-8");
    const t = new SyncedTree(p, 0);
    expect(t.size).toBe(0);
    expect(t.get("lar:///a")).toBeNull();
    t.set("lar:///a", "h1");                       // heals by re-persisting
    expect(JSON.parse(readFileSync(p, "utf-8"))["lar:///a"]).toBe("h1");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("synced-tree — deleteBag/countForBag (the L4 per-bag watermark scalpel)", () => {
  const A = "lar:///ha.ka.ba/bags/@sdm";
  const B = "lar:///ha.ka.ba/bags/@elyncia";
  const freshTree = () => new SyncedTree(join(mkdtempSync(join(tmpdir(), "synced-")), "synced-tree.json"), 0);

  test("forgets ONLY the target bag's observations; siblings stay put", () => {
    const t = freshTree();
    t.set(syncedTreeKey(A, "lar:///a.b.c"), "h1");
    t.set(syncedTreeKey(A, "lar:///a.b.d"), "h2");
    t.set(syncedTreeKey(B, "lar:///x.y.z"), "h3");
    expect(t.countForBag(A)).toBe(2);
    expect(t.deleteBag(A)).toBe(2);
    expect(t.countForBag(A)).toBe(0);
    expect(t.get(syncedTreeKey(A, "lar:///a.b.c"))).toBeNull();
    // the sibling bag survives untouched — the scalpel, not the sledgehammer
    expect(t.countForBag(B)).toBe(1);
    expect(t.get(syncedTreeKey(B, "lar:///x.y.z"))).toBe("h3");
  });

  test("the clear persists (a re-read reads the bag virgin, siblings intact)", () => {
    const dir = mkdtempSync(join(tmpdir(), "synced-"));
    const p = join(dir, "synced-tree.json");
    const t = new SyncedTree(p, 0);
    t.set(syncedTreeKey(A, "lar:///a.b.c"), "h1");
    t.set(syncedTreeKey(B, "lar:///x.y.z"), "h3");
    t.deleteBag(A);
    t.flush();
    const reread = new SyncedTree(p, 0);
    expect(reread.countForBag(A)).toBe(0);
    expect(reread.get(syncedTreeKey(B, "lar:///x.y.z"))).toBe("h3");
    rmSync(dir, { recursive: true, force: true });
  });

  test("deleteBag on a bag with no observations answers 0 (idempotent)", () => {
    const t = freshTree();
    t.set(syncedTreeKey(B, "lar:///x.y.z"), "h3");
    expect(t.deleteBag(A)).toBe(0);
    expect(t.countForBag(B)).toBe(1);
  });

  test("a bag whose id prefixes another is NOT over-matched (NUL boundary)", () => {
    const t = freshTree();
    // @sdm and @sdm-history share a textual prefix; the NUL separator keeps them distinct
    const SDM_HIST = "lar:///ha.ka.ba/bags/@sdm-history";
    t.set(syncedTreeKey(A, "lar:///a.b.c"), "h1");
    t.set(syncedTreeKey(SDM_HIST, "lar:///h.i.j"), "h9");
    expect(t.deleteBag(A)).toBe(1);
    expect(t.countForBag(SDM_HIST)).toBe(1);   // the prefix-sharing sibling survives
  });
});

describe("synced-tree — the R2 content-addressed rename-index", () => {
  const BAG = "lar:///ha.ka.ba/bags/@daemon/notes";
  const OTHER = "lar:///ha.ka.ba/bags/@daemon/other";
  const freshTree = () => new SyncedTree(join(mkdtempSync(join(tmpdir(), "synced-")), "synced-tree.json"), 0);

  test("resolves the UNIQUE live carrier observing a given content in a bag", () => {
    const t = freshTree();
    const h = carrierHash("the body of a note", undefined);
    t.set(syncedTreeKey(BAG, "lar:///a.b.c"), h);
    expect(t.renameSourceUri(BAG, h)).toBe("lar:///a.b.c");
    expect(t.renameSourceUri(BAG, carrierHash("different body", undefined))).toBeNull();
  });

  test("is bag-scoped — the same content in another bag never matches", () => {
    const t = freshTree();
    const h = carrierHash("shared body", undefined);
    t.set(syncedTreeKey(OTHER, "lar:///x.y.z"), h);
    expect(t.renameSourceUri(BAG, h)).toBeNull();        // different bag
    expect(t.renameSourceUri(OTHER, h)).toBe("lar:///x.y.z");
  });

  test("declines on ambiguity — two carriers sharing content resolve to null (no guess)", () => {
    const t = freshTree();
    const h = carrierHash("identical twins", undefined);
    t.set(syncedTreeKey(BAG, "lar:///twin.one"), h);
    t.set(syncedTreeKey(BAG, "lar:///twin.two"), h);
    expect(t.renameSourceUri(BAG, h)).toBeNull();        // >1 live carrier — decline
    // remove one → the collision clears, the survivor resolves uniquely
    t.delete(syncedTreeKey(BAG, "lar:///twin.two"));
    expect(t.renameSourceUri(BAG, h)).toBe("lar:///twin.one");
  });

  test("a content EDIT re-keys the index — the old content no longer resolves", () => {
    const t = freshTree();
    const key = syncedTreeKey(BAG, "lar:///a.b.c");
    const h1 = carrierHash("first body", undefined);
    const h2 = carrierHash("edited body", undefined);
    t.set(key, h1);
    t.set(key, h2);                                       // an edit at the same location
    expect(t.renameSourceUri(BAG, h1)).toBeNull();        // stale content drops out
    expect(t.renameSourceUri(BAG, h2)).toBe("lar:///a.b.c");
  });

  test("delete drops the content from the index", () => {
    const t = freshTree();
    const h = carrierHash("body", undefined);
    t.set(syncedTreeKey(BAG, "lar:///a.b.c"), h);
    t.delete(syncedTreeKey(BAG, "lar:///a.b.c"));
    expect(t.renameSourceUri(BAG, h)).toBeNull();
  });

  test("tag-agnostic — a stored BARE hex resolves against a freshly TAGGED query (agile seam)", () => {
    const t = freshTree();
    const bareHex = "a".repeat(64);                        // a pre-agile stored value
    t.set(syncedTreeKey(BAG, "lar:///a.b.c"), bareHex);
    expect(t.renameSourceUri(BAG, `sha256:${bareHex}`)).toBe("lar:///a.b.c");   // tagged query lands
    expect(t.renameSourceUri(BAG, bareHex)).toBe("lar:///a.b.c");               // bare query too
  });

  test("the index rebuilds from disk on reload (derived, never persisted)", () => {
    const dir = mkdtempSync(join(tmpdir(), "synced-"));
    const p = join(dir, "synced-tree.json");
    const h = carrierHash("persisted body", undefined);
    const t1 = new SyncedTree(p, 0);
    t1.set(syncedTreeKey(BAG, "lar:///a.b.c"), h);
    const t2 = new SyncedTree(p, 0);                       // cold reload
    expect(t2.renameSourceUri(BAG, h)).toBe("lar:///a.b.c");
    // the on-disk shape stays the flat primary map — no index leaks into the file
    const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, string>;
    expect(Object.keys(raw)).toEqual([syncedTreeKey(BAG, "lar:///a.b.c")]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("a rename retarget (delete old + set new) leaves only the new location indexed", () => {
    const t = freshTree();
    const h = carrierHash("moved unchanged", undefined);
    t.set(syncedTreeKey(BAG, "lar:///old.name"), h);
    // the R2 retarget: drop the stale source observation, record the moved carrier
    t.delete(syncedTreeKey(BAG, "lar:///old.name"));
    t.set(syncedTreeKey(BAG, "lar:///new.name"), h);
    expect(t.renameSourceUri(BAG, h)).toBe("lar:///new.name");
    expect(t.get(syncedTreeKey(BAG, "lar:///old.name"))).toBeNull();
    expect(t.get(syncedTreeKey(BAG, "lar:///new.name"))).toBe(h);
  });
});
