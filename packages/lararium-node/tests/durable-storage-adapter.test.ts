/**
 * L5 — the store's persistence writes land durably and atomically. `atomicWriteFile` (async)
 * writes bytes and strands no temp; `DurableNodeFSStorageAdapter` overrides save() to route
 * through it while keeping the base's write-through read cache coherent — a load-after-save
 * (and a load-after-overwrite) returns the FRESH bytes, never a torn or stale read.
 */
import { mkdtempSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { atomicWriteFile } from "../src/fs-atomic.js";
import { DurableNodeFSStorageAdapter } from "../src/durable-storage-adapter.js";

describe("atomicWriteFile (async)", () => {
  test("writes the bytes and leaves no temp behind", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lares-atomic-"));
    const target = join(dir, "chunk.bin");
    await atomicWriteFile(target, Uint8Array.from([1, 2, 3, 4]));
    expect([...readFileSync(target)]).toEqual([1, 2, 3, 4]);
    expect(readdirSync(dir).filter((n) => n.includes(".tmp"))).toHaveLength(0);
  });

  test("overwrites atomically (whole new bytes, no tear)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lares-atomic-"));
    const target = join(dir, "chunk.bin");
    await atomicWriteFile(target, Uint8Array.from([9, 9]));
    await atomicWriteFile(target, Uint8Array.from([7, 7, 7]));
    expect([...readFileSync(target)]).toEqual([7, 7, 7]);
  });
});

describe("DurableNodeFSStorageAdapter", () => {
  const KEY = ["44u4T4NwgkkCoBdze4gyY8pFSNQC", "snapshot", "head0"];

  test("save lands on disk and load returns it (round-trip)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lares-durable-"));
    const a = new DurableNodeFSStorageAdapter(dir);
    const bytes = Uint8Array.from([0x85, 0x6f, 0x4a, 0x83, 1, 2, 3]);
    await a.save(KEY, bytes);
    const back = await a.load(KEY);
    expect(back && [...back]).toEqual([...bytes]);
    // shard path exists on disk: dir / id[:2] / id[2:] / snapshot / head0
    const shard = join(dir, KEY[0]!.slice(0, 2), KEY[0]!.slice(2), "snapshot", "head0");
    expect(existsSync(shard)).toBe(true);
  });

  test("load-after-overwrite returns FRESH bytes (cache stays coherent, not stale)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lares-durable-"));
    const a = new DurableNodeFSStorageAdapter(dir);
    await a.save(KEY, Uint8Array.from([1, 1, 1]));
    await a.load(KEY);                                // prime the read cache with the old bytes
    await a.save(KEY, Uint8Array.from([2, 2]));       // overwrite
    const back = await a.load(KEY);
    expect(back && [...back]).toEqual([2, 2]);        // fresh, not the primed [1,1,1]
  });

  test("strands no temp file in the shard dir after a save", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lares-durable-"));
    const a = new DurableNodeFSStorageAdapter(dir);
    await a.save(KEY, Uint8Array.from([5]));
    const shardDir = join(dir, KEY[0]!.slice(0, 2), KEY[0]!.slice(2), "snapshot");
    expect(readdirSync(shardDir).filter((n) => n.includes(".tmp"))).toHaveLength(0);
  });
});
