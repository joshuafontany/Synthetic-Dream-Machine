/**
 * watcher-cut-c.test.ts — Cut C: the file-watcher's end-to-end witness
 * (NEXT VECTOR build 4, the deferred cut; handoff #watcher-talk-story).
 *
 * The §6 deletion machinery — grace window, mass-delete brake, rename re-link —
 * ran unit-green but had never been WATCHED end-to-end. A one-shot `lares
 * ingest` walks disk, so a vanished carrier never appears in its scan; only the
 * long-lived `lares watch` daemon, tracking what it last saw, can witness a
 * deletion. So this vector drives the real watcher process and moves the disk:
 *
 *   live   — the cookie self-test fires on ext4 (a dead backend fails closed)
 *   coalesce — rapid edits drain to ONE wave, not per-keystroke dribbles
 *   transient — a delete+recreate inside the grace window self-heals (no tombstone)
 *   rename — a delete + same-bytes add inside grace re-links (identity preserved)
 *   brake  — tombstones above the fraction suspend the whole wave, applying nothing
 *   delete — a confirmed vanish (grace expired, no pairing) tombstones the carrier
 *
 * Staged-only (mutating, spawns watcher daemons). Carriers template from the
 * small canonical `tick.mem` with the URI slug swapped — cheap to parse, lands
 * clean through the ingest gate.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const CLI_BIN   = join(REPO_ROOT, "packages/lares-cli/dist/src/bin/lares.js");
const TICK_TMPL = join(REPO_ROOT, "bags/@lares/ha.ka.ba/lares/api/pono/tick.mem");
const LARES_URI = "lar:///ha.ka.ba/bags/@lares";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lar: LarInstance;
let SRC = "";
let tickTemplate = "";

/** Disk path a `cutc-<slug>` carrier projects to under the staged bags mirror. */
function carrierPath(slug: string): string {
  return join(lar.root, "bags/@lares/ha.ka.ba/lares/api/pono", `${slug}.mem`);
}
function carrierUri(slug: string): string {
  return `lar:///ha.ka.ba/lares/api/pono/${slug}`;
}

/** Template a fresh carrier from tick.mem, swapping ONLY the URI slug (the path
 *  derives the record URI; the body prose carries over untouched). */
function carrierBody(slug: string): string {
  return tickTemplate.replaceAll("pono/tick", `pono/${slug}`);
}

function writeCarrier(slug: string): void {
  const p = carrierPath(slug);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, carrierBody(slug));
}

/** Run the one-shot CLI against the staged instance (env carries root + port). */
function cli(args: readonly string[]): ReturnType<LarInstance["cli"]> {
  return lar.cli(args);
}

interface WatchProc {
  readonly log: () => string;
  readonly waitFor: (re: RegExp, timeoutMs?: number) => Promise<RegExpMatchArray>;
  readonly stop: () => Promise<void>;
}

/** Spawn `lares watch --apply` against the staged vessel; stream its log. */
function spawnWatch(opts: { grace: number; fraction: number }): WatchProc {
  let log = "";
  const child = spawn(
    process.execPath,
    [
      CLI_BIN, "watch",
      "--source", SRC, "--to", LARES_URI, "--apply",
      "--port", String(lar.port),
      "--debounce", "150",
      "--delete-grace", String(opts.grace),
      "--delete-fraction", String(opts.fraction),
    ],
    { cwd: REPO_ROOT, env: { ...process.env, LAR_ROOT: lar.root, LAR_PORT: String(lar.port) } },
  );
  child.stdout?.on("data", (d) => { log += String(d); });
  child.stderr?.on("data", (d) => { log += String(d); });

  const waitFor = async (re: RegExp, timeoutMs = 20_000): Promise<RegExpMatchArray> => {
    const start = Date.now();
    for (;;) {
      const m = log.match(re);
      if (m) return m;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`watch waitFor ${re} timed out (${timeoutMs}ms):\n${log.slice(-1800)}`);
      }
      await sleep(120);
    }
  };
  const stop = async (): Promise<void> => {
    child.kill("SIGINT");
    await new Promise<void>((resolve) => {
      child.once("close", () => resolve());
      setTimeout(resolve, 2_500);
    });
  };
  return { log: () => log, waitFor, stop };
}

const SLUGS = ["cutc-edit", "cutc-trans", "cutc-ren", "cutc-del", "cutc-brake-1", "cutc-brake-2", "cutc-brake-3"];

beforeAll(async () => {
  lar = await targetInstance();
  if (lar.mode !== "staged") return;
  SRC = join(lar.root, "bags/@lares");
  tickTemplate = readFileSync(TICK_TMPL, "utf8");

  // Write all test carriers, then land them in ONE ingest wave.
  for (const slug of SLUGS) writeCarrier(slug);
  const r = await cli(["ingest", "--source", SRC, "--to", LARES_URI, "--apply", "--yes", "--json"]);
  const d = r.json?.["data"] as Record<string, unknown> | undefined;
  if (!d) throw new Error(`setup ingest produced no data: ${JSON.stringify(r.json)}\n${r.stderr.slice(-600)}`);
  const carriers = (d["carriers"] as Array<Record<string, unknown>>) ?? [];
  const landed = carriers.filter((c) => c["decision"] === "ingest").map((c) => c["uri"]);
  for (const slug of SLUGS) {
    expect(landed, `carrier ${slug} must ingest cleanly`).toContain(carrierUri(slug));
  }

  // Let the projection settle so each carrier's disk bytes read canonical
  // (diskHash == syncedHash) — the watcher's baseline for "unchanged".
  await sleep(2_500);
  const r2 = await cli(["ingest", "--source", SRC, "--to", LARES_URI, "--json"]);
  const d2 = r2.json?.["data"] as Record<string, unknown>;
  expect(d2["changed"], "the mirror must be settled before the watcher cases").toBe(0);
}, 180_000);

afterAll(async () => { await lar.stop(); });

describe("watcher Cut C — the disk peer witnessed end-to-end", () => {
  test("live + coalesce — backend self-test fires; rapid edits drain to ONE wave", async () => {
    if (lar.mode !== "staged") return;
    const w = spawnWatch({ grace: 1_000, fraction: 0.5 });
    try {
      await w.waitFor(/backend live/);          // cookie echoed on ext4 — fails closed if dead
      await w.waitFor(/watching/);

      // Five rapid edits inside the debounce window → one coalesced wave.
      const base = readFileSync(carrierPath("cutc-edit"), "utf8");
      for (let k = 1; k <= 5; k++) {
        writeFileSync(carrierPath("cutc-edit"), base.replace("**Status: DEFERRED**", `**Status: DEFERRED-edit-${k}**`));
      }
      await w.waitFor(/INGEST\s+lar:\/\/\/ha\.ka\.ba\/lares\/api\/pono\/cutc-edit/);
      await sleep(2_500);                        // let any re-projection settle

      // Exactly one ingest of cutc-edit: the 5 keystrokes coalesced, the
      // canonical re-projection re-scanned as unchanged (the gofmt-loop guard).
      const ingests = w.log().match(/INGEST\s+\S*cutc-edit\b/g) ?? [];
      expect(ingests.length).toBe(1);
      expect(readFileSync(carrierPath("cutc-edit"), "utf8")).toContain("DEFERRED-edit-5");
    } finally {
      await w.stop();
    }
  }, 60_000);

  test("transient delete — delete+recreate inside grace self-heals, no tombstone", async () => {
    if (lar.mode !== "staged") return;
    const w = spawnWatch({ grace: 1_200, fraction: 0.5 });
    try {
      await w.waitFor(/watching/);
      const path = carrierPath("cutc-trans");
      const bytes = readFileSync(path, "utf8");

      rmSync(path);                              // a transient vanish (git-checkout flood shape)
      await sleep(350);                          // well inside the 1.2s grace
      writeFileSync(path, bytes);                // returns, byte-identical → self-heal

      await sleep(2_200);                        // past the grace deadline
      expect(existsSync(path), "the recreated carrier survives").toBe(true);
      expect(w.log()).not.toMatch(/TOMBSTONE\s+\S*cutc-trans/);
      expect(w.log()).not.toMatch(/deletion\(s\) submitted/);
    } finally {
      await w.stop();
    }
  }, 60_000);

  test("rename — delete + same-bytes add inside grace re-links the record", async () => {
    if (lar.mode !== "staged") return;
    const w = spawnWatch({ grace: 2_000, fraction: 0.5 });
    try {
      await w.waitFor(/watching/);
      const from = carrierPath("cutc-ren");
      const to   = carrierPath("cutc-ren2");
      const bytes = readFileSync(from, "utf8");

      // Move: same canonical bytes land at a new name; the old name vanishes.
      writeFileSync(to, bytes);
      rmSync(from);

      await w.waitFor(/RENAME/);                 // unique-hash match → re-link, not tombstone+create
      await sleep(1_000);
      expect(existsSync(to), "the renamed carrier holds its new name").toBe(true);
      expect(w.log()).not.toMatch(/TOMBSTONE\s+\S*cutc-ren\b/);
    } finally {
      await w.stop();
    }
  }, 60_000);

  test("mass-delete brake — tombstones above the fraction suspend the whole wave", async () => {
    if (lar.mode !== "staged") return;
    // 3 deletes against ~7 live roots at fraction 0.25 → 3 > 1.75 → suspend.
    const w = spawnWatch({ grace: 900, fraction: 0.25 });
    try {
      await w.waitFor(/watching/);
      rmSync(carrierPath("cutc-brake-1"));
      rmSync(carrierPath("cutc-brake-2"));
      rmSync(carrierPath("cutc-brake-3"));

      await w.waitFor(/mass-delete brake TRIPPED/, 15_000);
      // Suspend applies NOTHING — no carrier of this wave tombstoned.
      expect(w.log()).not.toMatch(/TOMBSTONE\s+\S*cutc-brake/);
    } finally {
      await w.stop();
    }
  }, 60_000);

  test("confirmed delete — a vanish past grace with no pairing tombstones the carrier", async () => {
    if (lar.mode !== "staged") return;
    const w = spawnWatch({ grace: 900, fraction: 0.5 });
    try {
      await w.waitFor(/watching/);
      const path = carrierPath("cutc-del");
      rmSync(path);                              // a real, confirmed removal

      await w.waitFor(/TOMBSTONE\s+lar:\/\/\/ha\.ka\.ba\/lares\/api\/pono\/cutc-del/, 15_000);
      expect(existsSync(path), "a tombstoned carrier stays gone from disk").toBe(false);
    } finally {
      await w.stop();
    }
  }, 60_000);
});
