/**
 * LarDiskProjector — bag-aware unidirectional projection: store → disk.
 *
 * Co-projection model (operator ruling 2026-06-11): the operator's mind
 * originates; the disk carrier and the CRDT record-set both PROJECT that
 * origin, each in its native grain — disk holds whole markdown memes, the
 * doc holds tid-sized records, the VM decomposes for transclusion. Merge
 * authority routes through the CRDT alone; this projector renders the disk
 * co-projection and NEVER reads from disk — that direction belongs to the
 * ingest path (file watcher → store.put).
 *
 * Bag-aware: each writable bag may opt into a filesystem mirror via
 * BagMirrorConfig. Bags without a mirror config never write to disk. The two
 * projection surfaces split by bag role (see api/lararium/disk-projection):
 *   - wiki content (@<slug>)      → `wikis/{slug}/...`   (projection / output)
 *   - seed/canon (@lares/@lararium/@sdm) → `bags/@NAME/v0.1/...` (seed / canon)
 * State/runtime bags (@personal/@draft/@temp/@admin) carry no mirror.
 * A residency MOVE (the canon ACTION verb — the "promotion ceremony" is retired)
 * that relocates a tiddler between bags has the disk side effect of a file move
 * between surfaces; the git diff IS the operator's signature on the change.
 *
 * Projection law (Fontany-Fuller-Zelenka):
 *   Disk projection is a RENDER operation, not a string copy.
 *   The renderFn recomposes the whole carrier from its normalized tiddler
 *   records inside the island VM (exportMemeText → expandMemeRefs).
 *
 * Group routing (carrier-whole at rest, disk-projection#projection-routing):
 *   memetic-wikitext records form a tiddler-group keyed by the carrier root.
 *   A child change climbs `fragment-parent` to the root; debounce keys per
 *   (bag, root); the flush renders the ROOT — one carrier, one file. A
 *   fragment URI never owns a disk path (bag-paths returns null for them).
 *
 * Echo suppression ranks (§6): the CONTENT-HASH gates carry the law —
 * ingest drops disk-hash == synced-hash; projection skips byte-identical
 * writes. The `writing` Set survives beneath them as a latency
 * optimization only (skip re-statting our own in-flight writes); no
 * correctness rests on it.
 */

import { writeFileSync, mkdirSync, unlinkSync, existsSync, readFileSync, renameSync } from "fs";
import { dirname } from "path";
import { confineMirrorWrite } from "./bag-paths.js";
import { contentHash, syncedTreeKey, type SyncedTree } from "./synced-tree.js";
import { isEffectRecordUri } from "@lararium/mesh";
import type { ReadinessMap } from "@lararium/mesh";
import type { TW5Engine } from "@lararium/tw5";
import type { BagMirrorConfig } from "./bag-paths.js";

export interface LarDiskProjectorOptions {
  /** Bag mirrors. Bags absent from this list never write to disk. */
  readonly mirrors: readonly BagMirrorConfig[];
  /** Render a carrier-root URI to its canonical text. Null skips the write. */
  readonly renderFn: (tiddlerUri: string) => Promise<string | null>;
  /** Debounce delay in ms (default 1000). */
  readonly debounceMs?: number;
  /** Fired on every disk-ward refusal — the island routes it to the admin VM. */
  readonly onRefusal?: (info: { bagId: string; uri: string; reason: string }) => void;
  /** Optional readiness map — lights `disk-projector` after first flush. */
  readonly readinessMap?: ReadinessMap;
  /** Write a .json sidecar next to each .md for peek debugging. */
  readonly debugJson?: boolean;
  /**
   * The Synced tree (§6 merge base): records the content hash of every
   * projected carrier; arms the projection-side hash gate — a write whose
   * bytes match disk skips silently (no event, no churn).
   */
  readonly syncedTree?: SyncedTree;
}

export class LarDiskProjector {
  /**
   * URIs currently being written to disk.
   * File watcher MUST check writing.has(uri) before ingesting — skip own writes.
   */
  readonly writing = new Set<string>();

  /** Timer key = the carrier root URI — debounce + coalesce per root, so a MOVE's
   *  source-tombstone and destination-add settle into ONE level-triggered reconcile. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private _firstFlushDone = false;

  private _tw5: TW5Engine | null = null;

  private readonly mirrors: readonly BagMirrorConfig[];
  private readonly renderFn: (tiddlerUri: string) => Promise<string | null>;
  private readonly debounceMs: number;
  private readonly onRefusal: ((info: { bagId: string; uri: string; reason: string }) => void) | undefined;
  private readonly readinessMap: ReadinessMap | undefined;
  private readonly debugJson: boolean;
  private readonly syncedTree: SyncedTree | undefined;

  constructor(opts: LarDiskProjectorOptions) {
    this.mirrors      = opts.mirrors;
    this.renderFn     = opts.renderFn;
    this.debounceMs   = opts.debounceMs ?? 1000;
    this.onRefusal    = opts.onRefusal;
    this.readinessMap = opts.readinessMap;
    this.debugJson    = opts.debugJson ?? false;
    this.syncedTree   = opts.syncedTree;
  }

  /**
   * Subscribe to TW5 wiki change events and begin projecting.
   *
   * Architecture law (TW5 VM Primacy): only the IslandAdaptor subscribes
   * to Automerge stores. The disk projector subscribes to TW5 wiki change
   * events — the same surface that drives in-browser render. Bag provenance
   * reaches TW5 via the `bag` field that IslandAdaptor stamps on each
   * tiddler it loads; the projector reads it from the TW5 tiddler directly.
   *
   * Returns an unsubscribe fn.
   */
  start(tw5: TW5Engine): () => void {
    this._tw5 = tw5;
    const wiki = tw5.$tw.wiki;
    // Group routing: a fragment record's change belongs to its carrier root.
    // Climb `fragment-parent` one hop at a time (the field points one level
    // up); for a deleted record the chain is gone, so fall back to the URI
    // fragment-path law (`root#a/b` → `root`).
    const routeToRoot = (title: string): string => {
      let cur = title;
      for (let hops = 0; hops < 32; hops++) {
        const parent = (wiki.getTiddler?.(cur)?.fields as Record<string, unknown> | undefined)?.["fragment-parent"];
        if (typeof parent !== "string" || parent.length === 0) break;
        cur = parent;
      }
      const hash = cur.indexOf("#");
      return hash > 0 ? cur.slice(0, hash) : cur;
    };

    const handler = (changes: Record<string, unknown>) => {
      for (const title of Object.keys(changes)) {
        if (!title.startsWith("lar:")) continue;
        const rootUri = routeToRoot(title);
        // LEVEL-TRIGGERED (K8s reconciliation; prior-art 2026-06-19): every
        // change is a NUDGE to reconcile this carrier root against the CURRENT
        // settled VM state — never an edge that licenses a destructive action
        // off a transient view. Debounce per ROOT (not per bag+root) so a MOVE's
        // source-tombstone and destination-add COALESCE into ONE reconcile that
        // sees the final owner — closing the unlink/write race structurally
        // (the old per-(bag,root) flush + immediate gone-unlink never coalesced).
        const key = rootUri;
        const existing = this.timers.get(key);
        if (existing) clearTimeout(existing);
        this.timers.set(key, setTimeout(() => {
          this.timers.delete(key);
          void this.reconcile(rootUri);
        }, this.debounceMs));
      }
    };
    wiki.addEventListener?.("change", handler);
    return () => { wiki.removeEventListener?.("change", handler); this.stop(); };
  }

  stop(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.writing.clear();
    // Shutdown grace: pending coalesced observations land before the
    // island unmounts. (Un-rendered debounced flushes lawfully die — the
    // records hold truth; the next change or the ingest gesture's full
    // scan re-projects. Losing an OBSERVATION costs a fresh-adoption
    // decision; losing a render costs nothing durable.)
    this.syncedTree?.flush();
  }

  /**
   * Level-triggered reconcile of ONE carrier root against the settled VM state
   * (the projector's authoritative view, per VM-Primacy). Live (a `bag` field
   * naming a mirror) → flush that owner (render + write + cross-mirror cleanup).
   * Gone → unlink from every mirror (a true delete; a MOVE shows its new owner
   * here, the add having merged within the debounce). Idempotent: a later nudge
   * re-reconciles, so a transient "gone" self-heals when the destination lands —
   * the destructive unlink can never be the final word for a live carrier.
   */
  private async reconcile(rootUri: string): Promise<void> {
    const tiddler = this._tw5?.$tw.wiki.getTiddler?.(rootUri);
    if (!tiddler) {
      this._scheduleUnlinkByTitle(rootUri);
      return;
    }
    const fields = tiddler.fields as Record<string, string | string[] | undefined>;
    if (fields["disk-projection"] === "no") return;
    const bagId = typeof fields["bag"] === "string" ? fields["bag"] : undefined;
    if (!bagId || !this.mirrors.some((m) => m.bagId === bagId)) return;
    await this.flush(bagId, rootUri);
  }

  /** Unlink by trying all mirrors whose path strategy resolves the URI. */
  private _scheduleUnlinkByTitle(title: string): void {
    for (const mirror of this.mirrors) {
      const relPath = mirror.toRelPath(title);
      if (!relPath) continue;
      const gate = confineMirrorWrite(mirror.mirrorRoot, relPath, mirror.allowBagsRootFiles);
      if (!gate.ok) {
        console.error(`[disk-ward] unlink refused (${mirror.bagId}): ${gate.reason}`);
        this.onRefusal?.({ bagId: mirror.bagId, uri: title, reason: gate.reason });
        continue;
      }
      const candidate = gate.path;
      try {
        if (existsSync(candidate)) {
          this.writing.add(title);
          try { unlinkSync(candidate); } finally { this.writing.delete(title); }
        }
        this.syncedTree?.delete(syncedTreeKey(mirror.bagId, title));   // the observation leaves with the file
      } catch { /* best-effort — operator can clean up manually */ }
    }
  }

  private async flush(bagId: string, tiddlerUri: string): Promise<void> {
    const mirror = this.mirrors.find((m) => m.bagId === bagId);
    if (!mirror) return;

    // Projection FILTER ⊥ siting (lar-uri #five-planes): the siting function
    // carries every name; WHAT projects = carriers only. Ledger/observation
    // records (residency effect log) stay off disk — audit data, never
    // carrier surface. (The general type-filter — project only
    // text/x-memetic-wikitext — arrives with the migration wave.)
    if (isEffectRecordUri(tiddlerUri)) return;

    const relPath = mirror.toRelPath(tiddlerUri);
    if (!relPath) return;

    // The disk ward — sovereign-island write confinement (bag-paths). Cascade
    // output counts as untrusted; refusals surface LOUDLY, never silently.
    const gate = confineMirrorWrite(mirror.mirrorRoot, relPath, mirror.allowBagsRootFiles);
    if (!gate.ok) {
      console.error(`[disk-ward] write refused (${mirror.bagId} <- ${tiddlerUri}): ${gate.reason}`);
      this.onRefusal?.({ bagId: mirror.bagId, uri: tiddlerUri, reason: gate.reason });
      return;
    }
    const candidate = gate.path;

    const output = await this.renderFn(tiddlerUri);
    if (output === null) return;

    // Projection-side hash gate (§6): bytes already on disk == would-write
    // bytes → skip the write entirely (no event for any watcher, no mtime
    // churn) — but still record the observation in the Synced tree.
    const outputHash = contentHash(output);
    try {
      if (existsSync(candidate) && contentHash(readFileSync(candidate, "utf-8")) === outputHash) {
        this.syncedTree?.set(syncedTreeKey(bagId, tiddlerUri), outputHash);
        return;
      }
    } catch { /* unreadable existing file — fall through to the write */ }

    this.writing.add(tiddlerUri);
    try {
      mkdirSync(dirname(candidate), { recursive: true });
      // Atomic write (§2 law): temp in the SAME dir + rename — no watcher or
      // editor ever observes a torn carrier; a crash leaves only a temp file.
      const tmp = `${candidate}.lar-tmp-${process.pid}`;
      writeFileSync(tmp, output, "utf-8");
      renameSync(tmp, candidate);
      this.syncedTree?.set(syncedTreeKey(bagId, tiddlerUri), outputHash);
      if (this.debugJson && this._tw5) {
        const jsonStr = (this._tw5.$tw.wiki as { getTiddlerAsJson?: (t: string) => string })
          .getTiddlerAsJson?.(tiddlerUri);
        if (jsonStr) {
          const jsonPath = candidate.replace(/\.md$/, "") + ".json";
          writeFileSync(jsonPath, jsonStr, "utf-8");
        }
      }
      if (!this._firstFlushDone) {
        this._firstFlushDone = true;
        this.readinessMap?.mark("disk-projector");
      }
    } finally {
      this.writing.delete(tiddlerUri);
    }

    // After writing to the current mirror, unlink stale files from all OTHER
    // mirrors that would host this URI. This handles bag promotion: when a
    // tiddler moves from wiki-bag → lares-bag, the old wiki mirror file is
    // cleaned up on the first flush to the new mirror. One gate, one
    // choke-point: the unlink path routes through the ward like every other
    // mirror touch — never an inline confinement check.
    for (const otherMirror of this.mirrors) {
      if (otherMirror.bagId === bagId) continue;
      const staleRel = otherMirror.toRelPath(tiddlerUri);
      if (!staleRel) continue;
      const staleGate = confineMirrorWrite(otherMirror.mirrorRoot, staleRel, otherMirror.allowBagsRootFiles);
      if (!staleGate.ok) {
        console.error(`[disk-ward] stale-unlink refused (${otherMirror.bagId}): ${staleGate.reason}`);
        this.onRefusal?.({ bagId: otherMirror.bagId, uri: tiddlerUri, reason: staleGate.reason });
        continue;
      }
      try {
        if (existsSync(staleGate.path)) {
          this.writing.add(tiddlerUri);
          try { unlinkSync(staleGate.path); } finally { this.writing.delete(tiddlerUri); }
        }
      } catch { /* best-effort */ }
    }
  }
}
