/**
 * carrier-disk-files — the deletion/unlink resolver for a filetype-native mirror.
 *
 * A carrier owns exactly one content file at `<stem><ext>` plus an optional
 * `<stem><ext>.meta` sidecar — the extension varies by filetype (the ruling), so
 * the deletion side globs the real files rather than assuming `.mem`. The stem is
 * bound WHOLE, so a sibling carrier sharing a prefix never gets swept.
 */

import { describe, test, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { carrierDiskFiles } from "../src/disk-projector.js";

let root = "";
afterEach(() => { if (root) { rmSync(root, { recursive: true, force: true }); root = ""; } });

describe("carrierDiskFiles — resolve a carrier's on-disk files by stem", () => {
  test("globs the content file + its .meta, never a prefix-sibling", () => {
    root = mkdtempSync(join(tmpdir(), "carrier-files-"));
    const dir = join(root, "ha.ka.ba", "lares", "api");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "a.md"),       "# body\n");
    writeFileSync(join(dir, "a.md.meta"),  "type: text/markdown\n");
    writeFileSync(join(dir, "abc.tid"),    "title: abc\n");   // prefix sibling — must NOT sweep
    writeFileSync(join(dir, "a.mem"),      "<<~ x >>\n");      // a co-stem carrier of another filetype

    const files = carrierDiskFiles(join(dir, "a")).map((f) => f.split("/").pop()).sort();
    expect(files).toEqual(["a.md", "a.md.meta", "a.mem"]);
    expect(files).not.toContain("abc.tid");
  });

  test("a stem carrying regex metacharacters matches literally", () => {
    root = mkdtempSync(join(tmpdir(), "carrier-files-"));
    const dir = join(root, "d");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "a.b.c.tid"),  "x\n");            // the base "a.b.c", ext ".tid"
    writeFileSync(join(dir, "axbxc.tid"),  "y\n");            // dots-as-any would falsely match

    const files = carrierDiskFiles(join(dir, "a.b.c")).map((f) => f.split("/").pop());
    expect(files).toEqual(["a.b.c.tid"]);
  });

  test("a missing directory reads as no files", () => {
    expect(carrierDiskFiles("/no/such/dir/stem")).toEqual([]);
  });
});
