/**
 * synced-tree — the per-carrier merge base (handoff §6, the Nucleus
 * triangle's third leg).
 *
 * For every carrier the projector writes, this tree persists the content
 * hash of the last-projected canonical bytes. The ingest gate compares a
 * disk read and the records' current render against THIS hash to decide
 * noop / ingest / conflict — three-way diffs, never timestamps, never
 * event windows (state-match law; Dropbox Nucleus, Syncthing #10351).
 *
 * Law: persist OBSERVATIONS, never work-queues — crash recovery = full
 * scan + re-diff against this tree; no journal replay. Writes go atomic
 * (temp + rename, same dir) so a crash never leaves a torn tree; a
 * missing or corrupt tree degrades to "never projected" (fresh-adoption
 * ingest decisions), which converges, never corrupts.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { createHash } from "crypto";

export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export class SyncedTree {
  private map = new Map<string, string>();   // carrier-root URI → sha256 of last-projected bytes

  constructor(private readonly filePath: string) {
    try {
      if (existsSync(filePath)) {
        const raw = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, string>;
        this.map = new Map(Object.entries(raw));
      }
    } catch {
      // Corrupt tree = forgotten observations: every carrier reads as
      // never-projected, the gate falls back to fresh-adoption — safe.
      this.map = new Map();
    }
  }

  get(uri: string): string | null {
    return this.map.get(uri) ?? null;
  }

  /** Record a projection observation and persist atomically. */
  set(uri: string, hash: string): void {
    this.map.set(uri, hash);
    this.persist();
  }

  delete(uri: string): void {
    if (this.map.delete(uri)) this.persist();
  }

  get size(): number {
    return this.map.size;
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.synced-tree.${process.pid}.tmp`);
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.map), null, 1), "utf-8");
    renameSync(tmp, this.filePath);
  }
}
