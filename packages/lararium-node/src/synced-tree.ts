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
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly filePath: string,
    /**
     * Persist coalesce window (ms). A flush wave (a corpus feed = hundreds
     * of observations in seconds) collapses into one atomic write per
     * quiet window instead of one per observation. 0 = persist immediately
     * (tests). A crash inside the window forgets at most the last few
     * observations — which degrade to fresh-adoption decisions, never
     * corruption (the §6 recovery law).
     */
    private readonly coalesceMs = 250,
  ) {
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

  /** Record a projection observation; persistence coalesces per quiet window. */
  set(uri: string, hash: string): void {
    this.map.set(uri, hash);
    this.schedulePersist();
  }

  delete(uri: string): void {
    if (this.map.delete(uri)) this.schedulePersist();
  }

  get size(): number {
    return this.map.size;
  }

  /** Force any pending coalesced write to land now (shutdown hook, tests). */
  flush(): void {
    if (this.persistTimer) { clearTimeout(this.persistTimer); this.persistTimer = null; }
    this.persist();
  }

  private schedulePersist(): void {
    if (this.coalesceMs <= 0) { this.persist(); return; }
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => { this.persistTimer = null; this.persist(); }, this.coalesceMs);
    // Never hold the process open just to remember faster.
    (this.persistTimer as { unref?: () => void }).unref?.();
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.synced-tree.${process.pid}.tmp`);
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.map), null, 1), "utf-8");
    renameSync(tmp, this.filePath);
  }
}
