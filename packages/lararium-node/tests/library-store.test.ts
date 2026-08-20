/**
 * library-store — the ACQUIRED tier: readable, verifiable, and out of every tracked tree.
 *
 * These hold the properties the tier exists for:
 *   · it homes in the SHRINE, a house no wipe names — the whole reason it stands apart from the CAS,
 *   · a body keeps its REAL FILENAME inside a cid-named directory, so the store reads as a library,
 *   · acquiring MOVES by default, because leaving the original where it was cures nothing,
 *   · verify re-digests the BYTES and checks them against the DIRECTORY — never against the sidecar,
 *   · a reference NAMES a collection and refuses anything that could walk out of the tier.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  larLibraryHome, libraryCollectionDir, resolveLibraryRef, acquireIntoLibrary,
  listCollections, listCollection, verifyCollection, writeLibraryIndex, readLibraryMeta,
} from "../src/library-store.js";
import { larDataDir, larStateHome, laresDataHome, larariumDataHome } from "../src/vessel-paths.js";

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};
const sha = (s: string): string => createHash("sha256").update(Buffer.from(s)).digest("hex");

describe("the acquired tier", () => {
  let root: string;
  let src: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-library-"));
    setEnv("LAR_ROOT", root);
    setEnv("XDG_STATE_HOME", join(root, "xdgstate"));
    setEnv("XDG_DATA_HOME", join(root, "xdgdata"));
    setEnv("LAR_LIBRARY", undefined);
    src = join(root, "incoming");
    mkdirSync(src, { recursive: true });
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("★ it homes in the HOUSE, not the spirits — belonging, and the structure that follows ★", () => {
    // THE CRITERION IS WHOSE IT IS. A shelf is the LARARIUM's — a family's books outlast whoever reads
    // them — so it stands in the house's home rather than the one the Lares carry.
    //
    // LARES PASS; THE LARARIUM ABIDES, and the wipe-safety follows: `reset` pares <data>/vessel on the
    // premise that its blobs rebuild from the bags carriers, and an acquired book rebuilds from nothing.
    // A sibling subdirectory stays safe until someone widens a wipe by one path segment; a separate
    // home has no such edge to widen.
    expect(larLibraryHome()).toBe(join(larariumDataHome(), "library"));
    expect(larLibraryHome().startsWith(laresDataHome())).toBe(false);    // not the spirit's home at all
    expect(larLibraryHome().startsWith(larDataDir())).toBe(false);     // and nowhere near the vessel store
    expect(larLibraryHome().startsWith(larStateHome())).toBe(false);   // watermarks live there, not books
  });

  test("LAR_LIBRARY re-sites it — a shelf outgrows its default disk before anything else here does", () => {
    setEnv("LAR_LIBRARY", "/mnt/shelf");
    expect(larLibraryHome()).toBe("/mnt/shelf");
  });

  test("★ a body keeps its REAL FILENAME inside a cid-named directory ★", () => {
    const file = join(src, "The Fly by Mark Twain.txt");
    writeFileSync(file, "a body", "utf8");
    const out = acquireIntoLibrary(file, { collection: "mark-twain", origin: "Project Gutenberg" });

    // The directory name IS the digest — auditable with sha256sum and no tooling of ours.
    expect(out.dir).toBe(join(libraryCollectionDir("mark-twain"), sha("a body")));
    // …and the filename inside is what a human reads.
    expect(out.path.endsWith("The Fly by Mark Twain.txt")).toBe(true);
    expect(readFileSync(out.path, "utf8")).toBe("a body");
    expect(out.meta.integrity.startsWith("ni:///sha-256;")).toBe(true);
    expect(out.meta.origin).toBe("Project Gutenberg");
  });

  test("★ acquiring MOVES — leaving the original where it was cures nothing ★", () => {
    const file = join(src, "book.txt");
    writeFileSync(file, "bytes", "utf8");
    const out = acquireIntoLibrary(file, { collection: "c" });
    expect(out.moved).toBe(true);
    expect(existsSync(file)).toBe(false);            // the source left the tree it was harming
    expect(existsSync(out.path)).toBe(true);          // after the body stood safely, never before
  });

  test("--keep copies, for a source the operator does not own", () => {
    const file = join(src, "borrowed.txt");
    writeFileSync(file, "bytes", "utf8");
    const out = acquireIntoLibrary(file, { collection: "c", keep: true });
    expect(out.moved).toBe(false);
    expect(existsSync(file)).toBe(true);
  });

  test("★ IDEMPOTENT BY CONTENT — the same bytes land the same directory and rewrite nothing ★", () => {
    for (const name of ["first.txt", "second.txt"]) writeFileSync(join(src, name), "identical", "utf8");
    const a = acquireIntoLibrary(join(src, "first.txt"), { collection: "c" });
    // A different NAME with identical BYTES lands the same cid dir; the content address decides identity.
    const b = acquireIntoLibrary(join(src, "second.txt"), { collection: "c" });
    expect(b.dir).toBe(a.dir);
    expect(readdirSync(libraryCollectionDir("c"))).toHaveLength(1);
  });

  test("the sidecar makes a body self-describing IN ISOLATION", () => {
    const file = join(src, "x.txt");
    writeFileSync(file, "bytes", "utf8");
    const out = acquireIntoLibrary(file, { collection: "c", origin: "somewhere", licence: "public domain", note: "why" });
    const meta = readLibraryMeta(out.dir);
    // A blob needing an index to say what it is cannot be audited alone, and audit alone is the point.
    expect(meta).toMatchObject({ name: "x.txt", collection: "c", origin: "somewhere", licence: "public domain", note: "why" });
    expect(meta?.mediaType).toContain("text");
  });
});

describe("verify reads BYTES, never records", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-libverify-"));
    setEnv("LAR_ROOT", root);
    setEnv("XDG_STATE_HOME", join(root, "xdgstate"));
    setEnv("XDG_DATA_HOME", join(root, "xdgdata"));
    setEnv("LAR_LIBRARY", undefined);
    mkdirSync(join(root, "in"), { recursive: true });
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("an intact body verifies", () => {
    writeFileSync(join(root, "in", "b.txt"), "good", "utf8");
    acquireIntoLibrary(join(root, "in", "b.txt"), { collection: "c" });
    expect(verifyCollection("c").every((v) => v.ok)).toBe(true);
  });

  test("★ TAMPERED BYTES fail, even with a sidecar that still agrees with the directory ★", () => {
    writeFileSync(join(root, "in", "b.txt"), "good", "utf8");
    const out = acquireIntoLibrary(join(root, "in", "b.txt"), { collection: "c" });
    writeFileSync(out.path, "tampered", "utf8");     // the record is untouched; only the body moved
    const [v] = verifyCollection("c");
    expect(v?.ok).toBe(false);
    expect(v?.why).toMatch(/bytes digest/);
  });

  test("a sidecar that disagrees with its own directory fails", () => {
    writeFileSync(join(root, "in", "b.txt"), "good", "utf8");
    const out = acquireIntoLibrary(join(root, "in", "b.txt"), { collection: "c" });
    const meta = readLibraryMeta(out.dir)!;
    writeFileSync(join(out.dir, "meta.json"), JSON.stringify({ ...meta, cid: "f".repeat(64) }), "utf8");
    expect(verifyCollection("c")[0]?.why).toMatch(/sidecar claims/);
  });

  test("a body with no sidecar reads as un-auditable rather than as fine", () => {
    mkdirSync(join(libraryCollectionDir("c"), "a".repeat(64)), { recursive: true });
    const [v] = verifyCollection("c");
    expect(v?.ok).toBe(false);
    expect(v?.why).toMatch(/cannot describe itself/);
  });
});

describe("a reference NAMES, and refuses what could walk out of the tier", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-libref-"));
    setEnv("XDG_STATE_HOME", join(root, "xdgstate"));
    setEnv("XDG_DATA_HOME", join(root, "xdgdata"));
    setEnv("LAR_LIBRARY", undefined);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("library:<collection> resolves to that collection's directory", () => {
    expect(resolveLibraryRef("library:mark-twain")).toBe(libraryCollectionDir("mark-twain"));
  });

  test("★ a TRAVERSING or foreign reference resolves to NULL — never to a path of its own ★", () => {
    // A caller that resolves nothing must not fall back; that fallback is how a corpus lands somewhere
    // nobody chose.
    for (const bad of ["library:../escape", "library:a/b", "library:", "bags/@lares", "/abs/path"]) {
      expect(resolveLibraryRef(bad), bad).toBeNull();
    }
  });

  test("the index carries names, digests and anchors — and NO path", () => {
    mkdirSync(join(root, "in"), { recursive: true });
    writeFileSync(join(root, "in", "b.txt"), "body", "utf8");
    acquireIntoLibrary(join(root, "in", "b.txt"), { collection: "c", origin: "somewhere" });
    const out = join(root, "c.index.mem");
    writeLibraryIndex("c", out);
    const wire = readFileSync(out, "utf8");
    expect(wire).toContain("b.txt");
    expect(wire).toContain("ni:///sha-256;");
    expect(wire).toContain("library:c");
    expect(wire).not.toContain(larLibraryHome());     // the index travels; a path would not
  });

  test("an empty shelf lists nothing rather than throwing", () => {
    expect(listCollections()).toEqual([]);
    expect(listCollection("nope")).toEqual([]);
    expect(verifyCollection("nope")).toEqual([]);
  });
});
