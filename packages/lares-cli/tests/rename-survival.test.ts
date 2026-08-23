/**
 * rename-survival (R2) — a carrier that MOVES with byte-identical content keeps its
 * Synced observation, so the Confluence echo gate reads the move as a NOOP, never a
 * fresh re-land (which would duplicate records + reset the change-id) and never a
 * phantom conflict. The observation is content-addressed (the rename-invariant handle
 * is `carrierHash`, agile-tagged post-#46), so a full scan recovers the moved
 * observation by CONTENT and the CLI moves it on the island's confirmed rename.
 *
 * The ruling under proof (parent GO, R2):
 *   - a renamed carrier echo-NOOPs — recognized as `renamed`, its gone source rides
 *     as a rename-deletion, the observation survives; the NEXT scan reads `unchanged`
 *     and never re-lands (the concrete one-shot G0 bug).
 *   - an in-place EDIT still re-lands (`changed`) — never swallowed as a rename.
 *   - a COPY (source stays live) never mis-reads as a rename — it lands as new.
 */

import { describe, test, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanSource, candidatesOf, applyConfirmedRenames } from "../src/ingest-core.js";
import { SyncedTree, syncedTreeKey } from "@lararium/node";

const TO_BAG = "lar:///ha.ka.ba/bags/x/notes";
const uriOf = (stem: string) => `lar:///ha.ka.ba/lares/api/${stem}`;

let root = "";
afterEach(() => { if (root) { rmSync(root, { recursive: true, force: true }); root = ""; } });

/** A bags/ source dir + its Synced tree, seeded with one landed carrier. */
function seed(name: string, body: string): { src: string; bagDir: string; tree: SyncedTree; landedHash: string } {
  root = mkdtempSync(join(tmpdir(), "rename-"));
  const bagDir = join(root, "bags", "@x", "ha.ka.ba", "lares", "api");
  mkdirSync(bagDir, { recursive: true });
  writeFileSync(join(bagDir, name), body);
  const tree = new SyncedTree(join(root, "synced.json"), 0);
  const src = join(root, "bags", "@x");
  // first scan → the carrier is new; record the landed observation as the projector would
  const scan = scanSource(root, src, TO_BAG, tree)!;
  const stem = name.replace(/\.[^.]+$/, "");
  const row = scan.rows.find((r) => r.uri === uriOf(stem))!;
  expect(row.status).toBe("new");
  tree.set(syncedTreeKey(TO_BAG, uriOf(stem)), row.diskHash);
  return { src, bagDir, tree, landedHash: row.diskHash };
}

describe("rename-survival — the observation moves with the carrier (R2)", () => {
  test("a renamed carrier echo-noops — observation survives, next scan does NOT re-land", () => {
    const body = "# a stable note\n\nunchanged across the move\n";
    const { src, bagDir, tree, landedHash } = seed("old.md", body);

    // rename on disk — byte-identical content, new location
    rmSync(join(bagDir, "old.md"));
    writeFileSync(join(bagDir, "new.md"), body);

    // scan → RENAME recognized, never a fresh "new"
    const scan2 = scanSource(root, src, TO_BAG, tree)!;
    const row2 = scan2.rows.find((r) => r.uri === uriOf("new"))!;
    expect(row2.status).toBe("renamed");
    expect(row2.renameFrom).toBe(uriOf("old"));
    // the gone source rides the wave as a rename-deletion (so the island re-links records)
    expect(scan2.renameDeletions).toEqual([{ uri: uriOf("old"), syncedHash: landedHash }]);
    // and it rides as a candidate (an ADD) — the island returns `rename-target`, never a re-land
    expect(candidatesOf(scan2.rows).map((c) => c.uri)).toContain(uriOf("new"));

    // the island confirms the rename → the CLI moves the observation to the new location
    const moved = applyConfirmedRenames(tree, TO_BAG, candidatesOf(scan2.rows), {
      decision: "apply",
      renames: [{ fromUri: uriOf("old"), toUri: uriOf("new") }],
    });
    expect(moved).toBe(1);

    // NEXT scan → the moved carrier reads UNCHANGED (echo-noop); nothing to submit
    const scan3 = scanSource(root, src, TO_BAG, tree)!;
    const row3 = scan3.rows.find((r) => r.uri === uriOf("new"))!;
    expect(row3.status).toBe("unchanged");
    expect(scan3.renameDeletions).toBeUndefined();
    expect(candidatesOf(scan3.rows)).toEqual([]);
    // the stale source observation is gone; the new one carries the (identical) hash
    expect(tree.get(syncedTreeKey(TO_BAG, uriOf("old")))).toBeNull();
    expect(tree.get(syncedTreeKey(TO_BAG, uriOf("new")))).toBe(landedHash);
  });

  test("a suspended wave (mass-delete brake) moves NO observation", () => {
    const body = "# a note\n\nbody\n";
    const { src, bagDir, tree } = seed("old.md", body);
    rmSync(join(bagDir, "old.md"));
    writeFileSync(join(bagDir, "new.md"), body);
    const scan2 = scanSource(root, src, TO_BAG, tree)!;
    // the island suspended → nothing applied → the observation must NOT move
    const moved = applyConfirmedRenames(tree, TO_BAG, candidatesOf(scan2.rows), {
      decision: "suspend", reason: "mass-delete brake", wouldTombstone: [uriOf("old")],
    });
    expect(moved).toBe(0);
    expect(tree.get(syncedTreeKey(TO_BAG, uriOf("old")))).not.toBeNull();
  });

  test("an in-place EDIT still re-lands (changed) — never swallowed as a rename", () => {
    const { src, bagDir, tree } = seed("note.md", "# v1\n\nfirst body\n");
    writeFileSync(join(bagDir, "note.md"), "# v2\n\nedited body\n");   // same location, new content
    const scan = scanSource(root, src, TO_BAG, tree)!;
    const row = scan.rows.find((r) => r.uri === uriOf("note"))!;
    expect(row.status).toBe("changed");
    expect(row.renameFrom).toBeUndefined();
    expect(scan.renameDeletions).toBeUndefined();
    expect(candidatesOf(scan.rows).map((c) => c.uri)).toContain(uriOf("note"));
  });

  test("a COPY (source stays live) is NOT a rename — it lands as new, source untouched", () => {
    const body = "# shared body\n\nidentical content\n";
    const { src, bagDir, tree, landedHash } = seed("orig.md", body);
    // a COPY: same content at a new name, the source STILL on disk
    writeFileSync(join(bagDir, "copy.md"), body);
    const scan = scanSource(root, src, TO_BAG, tree)!;
    const copyRow = scan.rows.find((r) => r.uri === uriOf("copy"))!;
    expect(copyRow.status).toBe("new");            // a fresh landing, never a rename
    expect(copyRow.renameFrom).toBeUndefined();
    expect(scan.renameDeletions).toBeUndefined();  // the live source is never a deletion
    // the source observation stays put
    expect(tree.get(syncedTreeKey(TO_BAG, uriOf("orig")))).toBe(landedHash);
  });
});
