/**
 * synced-tree — the per-carrier merge base (the Confluence's third leg; handoff
 * #pattern-integrities §6, the Nucleus triangle).
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
import { tagDigest } from "@lararium/mesh";

export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** The canonical Synced-tree key: bag-id + carrier-root URI, NUL-joined.
 *  ONE source of truth — readers (ingest) and writers (projector) MUST call
 *  this, never hand-build the key (a separator drift silently reads every
 *  carrier as `new`, breaking ingest quiescence). */
export function syncedTreeKey(bagId: string, uri: string): string {
  return `${bagId}\0${uri}`;
}

export class SyncedTree {
  private map = new Map<string, string>();   // `${bagId}\0${carrier-root URI}` → sha256 of last-projected bytes (a carrier may project to multiple mirrors)
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * R2 rename-index — the CONTENT-addressed reverse view: `${bagId}\0${canonical-hash}`
   * → the set of carrier URIs in that bag currently observing that exact content.
   * MIRRORS `map` exactly (every live primary observation appears here), so a lookup
   * answers "which live carrier(s) in this bag hold this content right now". A rename
   * keeps the whole-carrier `carrierHash` identical while the location (uri) moves, so
   * this index recovers the moved observation by CONTENT before the echo gate mis-reads
   * the new location as `new` and re-lands it (#46 content-addressing, deferred R2).
   *
   * DERIVED, never persisted: rebuilt from `map` on load, so the on-disk format stays
   * byte-identical (no migration) and a torn/absent tree degrades to fresh-adoption
   * exactly as before. The hash normalizes through `tagDigest` (the agile-digest seam),
   * so a STORED bare-hex value and a freshly-tagged query land on the SAME index key.
   */
  private byHash = new Map<string, Set<string>>();

  constructor(
    private readonly filePath: string,
    /**
     * Persist coalesce window (ms). A flush wave (a corpus feed = hundreds
     * of observations in seconds) collapses into one atomic write per
     * quiet window instead of one per observation. 0 = persist immediately
     * (tests). A crash inside the window forgets at most the last few
     * observations — which degrade to fresh-adoption decisions, never
     * corruption (the Confluence's recovery law).
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
    this.rebuildIndex();
  }

  get(uri: string): string | null {
    return this.map.get(uri) ?? null;
  }

  /** Record a projection observation; persistence coalesces per quiet window. */
  set(uri: string, hash: string): void {
    const prev = this.map.get(uri);
    if (prev !== undefined) this.indexRemove(uri, prev);   // the old content leaves the reverse view
    this.map.set(uri, hash);
    this.indexAdd(uri, hash);                              // the new content enters it
    this.schedulePersist();
  }

  delete(uri: string): void {
    const prev = this.map.get(uri);
    if (this.map.delete(uri)) {
      if (prev !== undefined) this.indexRemove(uri, prev);
      this.schedulePersist();
    }
  }

  /**
   * Forget every observation belonging to ONE bag — the L4 per-bag scalpel. Where
   * `lares reset` wipes the whole projection dir (the all-bags rebirth), a targeted
   * single-bag regenesis clears just this bag's carrier keys (`${bagId}\0…`) so its
   * re-feed reads every carrier as `new` (a surviving watermark would read them all
   * `unchanged` and leave the freshly-cleared doc empty — the same poison the whole-tree
   * guard names, scoped down). Returns the count removed. Siblings' observations stay put.
   */
  deleteBag(bagId: string): number {
    const prefix = `${bagId}\0`;
    let removed = 0;
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) { this.delete(key); removed++; }
    }
    return removed;
  }

  /** Count the observations one bag still carries — the per-bag virgin assertion the L4
   *  conductor runs after `deleteBag` (mirrors regenesis's whole-tree zero-check). */
  countForBag(bagId: string): number {
    const prefix = `${bagId}\0`;
    let n = 0;
    for (const key of this.map.keys()) if (key.startsWith(prefix)) n++;
    return n;
  }

  /**
   * R2 rename resolution — given a bag and a carrier's whole-carrier hash, answer the
   * UNIQUE live carrier URI currently observing that exact content in that bag, else
   * null. Null on no match OR an AMBIGUOUS match (>1 live carrier shares the content —
   * two-carriers-same-content; the caller MUST NOT guess, mirroring the delete-gate's
   * decline-on-collision). Tag-agnostic: a stored bare hash and a freshly-tagged query
   * normalize to one index key, so the lookup straddles the agile-digest boundary.
   * A rename is confirmed by the CALLER (the moved uri differs AND the source file is
   * gone from disk — a copy leaves the source live and never resolves here).
   */
  renameSourceUri(bagId: string, hash: string): string | null {
    const ik = this.hashIndexKey(bagId, hash);
    if (ik === null) return null;
    const bucket = this.byHash.get(ik);
    if (!bucket || bucket.size !== 1) return null;         // unseen or ambiguous → decline, never guess
    return bucket.values().next().value ?? null;
  }

  /** Split a primary key `${bagId}\0${uri}` back into its two terms (NUL never
   *  appears inside a bagId or a lar: uri, so the first NUL is the sole boundary). */
  private splitKey(key: string): { bagId: string; uri: string } {
    const i = key.indexOf("\0");
    return i < 0 ? { bagId: "", uri: key } : { bagId: key.slice(0, i), uri: key.slice(i + 1) };
  }

  /** The reverse-index key for a (bagId, hash) pair — the hash canonicalized so a
   *  bare-hex stored value and a tagged fresh value collapse together. A malformed
   *  hash returns null (that observation simply stays out of the rename-index — it
   *  degrades to a fresh-adoption decision, never a crash). */
  private hashIndexKey(bagId: string, hash: string): string | null {
    try { return `${bagId}\0${tagDigest(hash)}`; } catch { return null; }
  }

  private indexAdd(key: string, hash: string): void {
    const { bagId, uri } = this.splitKey(key);
    const ik = this.hashIndexKey(bagId, hash);
    if (ik === null) return;
    let bucket = this.byHash.get(ik);
    if (!bucket) { bucket = new Set(); this.byHash.set(ik, bucket); }
    bucket.add(uri);
  }

  private indexRemove(key: string, hash: string): void {
    const { bagId, uri } = this.splitKey(key);
    const ik = this.hashIndexKey(bagId, hash);
    if (ik === null) return;
    const bucket = this.byHash.get(ik);
    if (!bucket) return;
    bucket.delete(uri);
    if (bucket.size === 0) this.byHash.delete(ik);
  }

  /** Rebuild the reverse index from the primary map (load-time; the index never
   *  persists, so the on-disk shape stays byte-identical across the R2 change). */
  private rebuildIndex(): void {
    this.byHash.clear();
    for (const [key, hash] of this.map) this.indexAdd(key, hash);
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
