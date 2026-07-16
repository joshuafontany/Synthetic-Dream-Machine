/**
 * L3 — the tail-move ACTUATOR: relocate a doc's torn tail files into a dated
 * `quarantine-torn-tail-<day>/` folder (rename, never delete) so the store keeps only its
 * verified clean prefix. The move preserves the poisoned bytes for forensics; a collision
 * suffixes; a file already gone is skipped.
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { moveTornTailAside } from "../src/doc-load-probe.js";
import { docStorePath } from "../src/store-integrity.js";

const DOC = "44u4T4NwgkkCoBdze4gyY8pFSNQC";

function seedIncremental(root: string, name: string, bytes: Uint8Array): string {
  const dir = join(docStorePath(root, DOC), "incremental");
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, bytes);
  return p;
}

describe("moveTornTailAside", () => {
  test("moves the named torn files aside — gone from the store, present in quarantine", () => {
    const root = mkdtempSync(join(tmpdir(), "lares-clean-tail-"));
    const keep = seedIncremental(root, "i0", Uint8Array.from([1, 2, 3]));
    const tornA = seedIncremental(root, "i1", Uint8Array.from([9]));
    const tornB = seedIncremental(root, "i2", Uint8Array.from([9]));

    const moved = moveTornTailAside(root, DOC, [tornA, tornB]);

    expect(moved).toHaveLength(2);
    expect(existsSync(tornA)).toBe(false);       // torn tail left the store
    expect(existsSync(tornB)).toBe(false);
    expect(existsSync(keep)).toBe(true);         // clean prefix stayed
    for (const dest of moved) expect(existsSync(dest)).toBe(true); // preserved, not deleted
    const qroot = readdirSync(root).find((n) => n.startsWith("quarantine-torn-tail-"));
    expect(qroot).toBeDefined();
  });

  test("a file already gone is skipped, never throws", () => {
    const root = mkdtempSync(join(tmpdir(), "lares-clean-tail-"));
    const moved = moveTornTailAside(root, DOC, [join(root, "vanished")]);
    expect(moved).toHaveLength(0);
  });

  test("a name collision in the quarantine suffixes rather than clobbers", () => {
    const root = mkdtempSync(join(tmpdir(), "lares-clean-tail-"));
    const a = seedIncremental(root, "dup", Uint8Array.from([1]));
    const firstMoved = moveTornTailAside(root, DOC, [a]);
    const b = seedIncremental(root, "dup", Uint8Array.from([2])); // same basename, second tear
    const secondMoved = moveTornTailAside(root, DOC, [b]);
    expect(firstMoved[0]).not.toEqual(secondMoved[0]); // distinct destinations, no clobber
    expect(existsSync(firstMoved[0]!)).toBe(true);
    expect(existsSync(secondMoved[0]!)).toBe(true);
  });
});
