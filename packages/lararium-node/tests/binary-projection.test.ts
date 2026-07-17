/**
 * binary-projection — a binary filetype (image/PDF) lands as RAW bytes on disk.
 *
 * The carrier holds base64 text (the tiddler `text` field); the render seam marks
 * `encoding: "base64"`; the projector DECODES it and writes the real bytes, so a
 * `.png` on disk opens as an image — not as its base64 text. The Synced-tree
 * observation still hashes the base64 string (the carrier form), so the echo gate
 * compares like with like.
 */

import { describe, test, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LarDiskProjector } from "../src/disk-projector.js";

let root = "";
afterEach(() => { if (root) { rmSync(root, { recursive: true, force: true }); root = ""; } });

describe("binary projection — base64 body decodes to raw bytes on disk", () => {
  test("a base64 carrier writes the decoded image bytes + a .meta sidecar", async () => {
    root = mkdtempSync(join(tmpdir(), "lar-binproj-"));
    // A tiny PNG-ish byte sequence (a real signature + noise) — the point is that
    // it is NOT valid utf8, so a utf8 write would mangle it.
    const rawBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00, 0xfe, 0x01]);
    const b64 = rawBytes.toString("base64");

    const projector = new LarDiskProjector({
      mirrors: [{ bagId: "@lares", mirrorRoot: root }],
      carrierFileFn: async () => ({ ext: ".png", body: b64, metaBody: "type: image/png\n", encoding: "base64" }),
      debounceMs: 1,
    });
    await (projector as unknown as { flush: (b: string, u: string) => Promise<void> })
      .flush("@lares", "lar:///ha.ka.ba/lares/api/pic");

    const file = join(root, "ha.ka.ba/lares/api/pic.png");
    expect(existsSync(file)).toBe(true);
    // the file holds the RAW decoded bytes — byte-identical to the source
    expect(readFileSync(file).equals(rawBytes)).toBe(true);
    // and the .meta sidecar carries the fields as utf8
    expect(existsSync(file + ".meta")).toBe(true);
    expect(readFileSync(file + ".meta", "utf8")).toContain("image/png");
  });
});
