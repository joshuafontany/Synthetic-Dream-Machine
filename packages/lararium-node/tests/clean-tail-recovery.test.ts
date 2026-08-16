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

import { moveTornTailAside, resolveChildPath } from "../src/doc-load-probe.js";
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

/**
 * The spawn crosses out of the parent's loader: `spawn(process.execPath, [childPath, …])`
 * starts a bare node, so `childPath` MUST name a real `.js` on disk. Running from the TS
 * SOURCE (`tsx src/main.ts` — the `pnpm dev` / `vessel stand --with-app` path) resolves the
 * sibling under `src/`, where only the `.ts` lives; the compiled twin under `dist/src/` carries
 * the child. A path that misses makes every doc exit 1 and read as `aborted`, condemning sound
 * data — so the resolver either names an existing file or throws a build instruction.
 */
describe("doc-load-probe child resolution", () => {
  test("resolves a child that exists on disk, or throws a build instruction", () => {
    let resolved: string | null = null;
    try {
      resolved = resolveChildPath();
    } catch (e) {
      expect((e as Error).message).toContain("pnpm -r build");
      return;
    }
    expect(existsSync(resolved!)).toBe(true);
    expect(resolved!.endsWith(".js")).toBe(true);
  });
});
