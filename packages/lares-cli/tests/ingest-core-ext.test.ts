/**
 * ingest-core-ext — the READ shore carries every filetype + its extension.
 *
 * The scan lists ALL real files (a `.meta` sidecar rides with its content file,
 * never a carrier of its own) and stamps each row's `ext`, so the island routes
 * by TW5's own filetype registry — the Node gesture never decides the filetype.
 */

import { describe, test, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { listCarriers, scanFiles } from "../src/ingest-core.js";
import { SyncedTree, bagsFileToUri } from "@lararium/node";

let root = "";
afterEach(() => { if (root) { rmSync(root, { recursive: true, force: true }); root = ""; } });

function seed(): { root: string; bagDir: string } {
  root = mkdtempSync(join(tmpdir(), "ingest-ext-"));
  const bagDir = join(root, "bags", "@x", "ha.ka.ba", "lares", "api");
  mkdirSync(bagDir, { recursive: true });
  writeFileSync(join(bagDir, "a.tid"),      "title: a\n\nwikitext body\n");
  writeFileSync(join(bagDir, "a.tid.meta"), "type: application/x-tiddler\n");   // sidecar
  writeFileSync(join(bagDir, "b.mem"),      "<<^ ⊙&#x0001; ? -> lar:///x >>\n");
  writeFileSync(join(bagDir, "c.md"),       "# a markdown carrier\n");
  writeFileSync(join(bagDir, "d.json"),     "[{\"title\":\"d\"}]\n");
  return { root, bagDir };
}

describe("ingest-core READ shore — filetype-native listing + ext carry", () => {
  test("listCarriers lists every real file and skips the .meta sidecar", () => {
    const { root: r } = seed();
    const files = listCarriers(join(r, "bags", "@x"))!;
    const names = files.map((f) => f.split("/").pop()).sort();
    expect(names).toEqual(["a.tid", "b.mem", "c.md", "d.json"]);
    expect(names).not.toContain("a.tid.meta");
  });

  test("scanFiles stamps ext on every row and derives a URI per filetype", () => {
    const { root: r } = seed();
    const files = listCarriers(join(r, "bags", "@x"))!;
    const tree  = new SyncedTree(join(r, "synced.json"), 0);
    const { rows, skipped } = scanFiles(r, files, "lar:///bag", tree, bagsFileToUri);
    expect(skipped).toEqual([]);
    // every row carries its own extension, matching the file it read
    for (const row of rows) expect(row.ext).toBe(extname(row.file));
    const byExt = new Map(rows.map((row) => [row.ext, row] as const));
    expect([...byExt.keys()].sort()).toEqual([".json", ".md", ".mem", ".tid"]);
    // a non-.mem carrier derives its lar: URI exactly as a .mem carrier does
    expect(byExt.get(".tid")!.uri).toBe("lar:///ha.ka.ba/lares/api/a");
    expect(byExt.get(".md")!.uri).toBe("lar:///ha.ka.ba/lares/api/c");
    // never-projected → status "new"
    expect(byExt.get(".tid")!.status).toBe("new");
    // the `.tid`'s paired `.meta` sidecar rides WITH the carrier row (fields kept
    // across a body edit); a carrier with no sidecar carries none.
    expect(byExt.get(".tid")!.meta).toContain("application/x-tiddler");
    expect(byExt.get(".md")!.meta).toBeUndefined();
  });
});
