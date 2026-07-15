/**
 * L5b — the store integrity gate must accept REAL automerge bytes (no false-condemn of a
 * healthy doc) and reject the torn-length class that aborts the WASM runtime. The healthy
 * case pins the checksum coverage empirically against automerge's own output.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { from as automergeFrom, save } from "@automerge/automerge";
import { describe, expect, test } from "vitest";

import { precheckChunkBytes } from "@lararium/mesh";
import { precheckDocStore } from "../src/store-integrity.js";

function realDocBytes(): Uint8Array {
  const doc = automergeFrom({ tiddlers: { a: { text: "hello" }, b: { text: "world" } } });
  return save(doc);
}

describe("precheckChunkBytes", () => {
  test("accepts real automerge bytes (magic + bounds + checksum all correct)", () => {
    const v = precheckChunkBytes(realDocBytes());
    expect(v.ok).toBe(true);
    expect(v.chunks).toBeGreaterThanOrEqual(1);
    expect(v.checksumMismatch).toBeFalsy();
  });

  test("condemns a truncated tail (the disk-full torn write)", () => {
    const bytes = realDocBytes();
    const torn = bytes.subarray(0, bytes.length - 5); // lop the last bytes off the contents
    const v = precheckChunkBytes(torn);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/overrun|torn/i);
  });

  test("condemns a garbled length prefix (capacity_overflow class)", () => {
    const bytes = Uint8Array.from(realDocBytes());
    // The length varint sits just after magic(4)+checksum(4)+type(1) = offset 9.
    // Force every continuation bit so the declared length balloons past the buffer.
    bytes[9] = 0xff; bytes[10] = 0xff; bytes[11] = 0xff; bytes[12] = 0xff; bytes[13] = 0x7f;
    const v = precheckChunkBytes(bytes);
    expect(v.ok).toBe(false);
  });

  test("condemns empty (zero-byte) files", () => {
    expect(precheckChunkBytes(new Uint8Array(0)).ok).toBe(false);
  });

  test("condemns bad magic", () => {
    const bytes = Uint8Array.from(realDocBytes());
    bytes[0] = 0x00;
    expect(precheckChunkBytes(bytes).ok).toBe(false);
  });
});

describe("precheckDocStore", () => {
  test("clean store dir reports ok; a torn incremental is surfaced", () => {
    const root = mkdtempSync(join(tmpdir(), "lares-store-integrity-"));
    const docId = "44u4T4NwgkkCoBdze4gyY8pFSNQC";
    const base = join(root, docId.slice(0, 2), docId.slice(2));
    mkdirSync(join(base, "snapshot"), { recursive: true });
    mkdirSync(join(base, "incremental"), { recursive: true });
    writeFileSync(join(base, "snapshot", "head0"), realDocBytes());

    const clean = precheckDocStore(root, docId);
    expect(clean.ok).toBe(true);
    expect(clean.snapshots).toBe(1);
    expect(clean.torn).toHaveLength(0);

    // now drop a torn incremental beside it
    const torn = realDocBytes().subarray(0, 6);
    writeFileSync(join(base, "incremental", "changeX"), torn);
    const report = precheckDocStore(root, docId);
    expect(report.ok).toBe(false);
    expect(report.torn.some((t) => t.kind === "incremental")).toBe(true);
  });
});
