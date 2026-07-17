/**
 * read-carrier-binary — the read side detects binary without a registry.
 *
 * Bytes that survive a utf8 round-trip ARE text (read verbatim); bytes that do
 * not ARE binary, and ride as base64 — no extension list, no registry reach.
 */

import { describe, test, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCarrierText } from "../src/ingest-core.js";

let root = "";
afterEach(() => { if (root) { rmSync(root, { recursive: true, force: true }); root = ""; } });

describe("readCarrierText — text stays utf8, binary rides base64", () => {
  test("a utf8 carrier reads verbatim", () => {
    root = mkdtempSync(join(tmpdir(), "lar-readc-"));
    const f = join(root, "a.md");
    writeFileSync(f, "# a markdown carrier\n\nprose ✶ with unicode\n", "utf8");
    const { text, binary } = readCarrierText(f);
    expect(binary).toBe(false);
    expect(text).toContain("markdown carrier");
    expect(text).toContain("✶");
  });

  test("a binary carrier reads as base64 that decodes byte-identically", () => {
    root = mkdtempSync(join(tmpdir(), "lar-readc-"));
    const raw = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0xfe, 0x80, 0x01]);
    const f = join(root, "pic.png");
    writeFileSync(f, raw);
    const { text, binary } = readCarrierText(f);
    expect(binary).toBe(true);
    expect(Buffer.from(text, "base64").equals(raw)).toBe(true);
    // base64 carries no SOH heading → the island routes it to the native path
    expect(text).not.toContain("&#x0001;");
  });
});
