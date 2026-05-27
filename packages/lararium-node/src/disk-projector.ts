/**
 * LarDiskProjector — bag-aware unidirectional projection: store → disk.
 *
 * The Automerge store functions as the mind. Disk files project from it.
 * This projector NEVER reads from disk — that direction belongs to the ingest
 * path (file watcher → store.put).
 *
 * Bag-aware (S5.5+): each writable bag may opt into a filesystem mirror via
 * BagMirrorConfig. Bags without a mirror config never write to disk. Edits in
 * the wiki bag mirror to `wikis/{slug}/...`; canonical bags mirror to
 * `packages/...`. Promotion is a deliberate ceremony that moves a tiddler
 * between bags, with the disk side effect of a file move — the git diff IS
 * the operator's signature on canon.
 *
 * Projection law (Fontany-Fuller-Zelenka):
 *   Disk projection is a RENDER operation, not a string copy.
 *   The TW5 VM (with fakeDOM) re-renders the carrier from its normalized
 *   tiddler records — the same pipeline used to bootstrap the browser client.
 *
 * Projection triggers:
 *   Any tiddler change → debounce → flush that tiddler (renderFn)
 *
 * The writing Set guards against ingest echo:
 *   file watcher MUST check writing.has(uri) before ingesting a change.
 */

import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "fs";
import { join, resolve as resolvePath, dirname } from "path";
import type { ReadinessMap } from "@lararium/mesh";
import type { TW5Engine } from "@lararium/tw5";
import type { BagMirrorConfig } from "./bag-paths.js";

export class LarDiskProjector {
  /**
   * URIs currently being written to disk.
   * File watcher MUST check writing.has(uri) before ingesting — skip own writes.
   */
  readonly writing = new Set<string>();

  /** Timer key shape: `${bagId}\0${tiddlerUri}` — debounce per (bag, tiddler). */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private _firstFlushDone = false;

  private _tw5: TW5Engine | null = null;

  constructor(
    /** Bag mirrors. Bags absent from this list never write to disk. */
    private readonly mirrors: readonly BagMirrorConfig[],
    /**
     * Render a parent URI to its carrier text string.
     * Called after debounce. Returns null to skip writing.
     */
    private readonly renderFn: (tiddlerUri: string) => Promise<string | null>,
    /** Debounce delay in ms. */
    private readonly debounceMs = 1000,
    /** Optional readiness map — lights `disk-projector` after first flush. */
    private readonly readinessMap?: ReadinessMap,
    /** Write a .json sidecar next to each .md for peek debugging. */
    private readonly debugJson = false,
  ) {}

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
    const handler = (changes: Record<string, unknown>) => {
      for (const title of Object.keys(changes)) {
        if (!title.startsWith("lar:")) continue;
        const tiddler = wiki.getTiddler?.(title);
        if (!tiddler) {
          // Deleted — try all mirrors for unlink.
          this._scheduleUnlinkByTitle(title);
          continue;
        }
        const fields = tiddler.fields as Record<string, string | string[] | undefined>;
        if (fields["disk-projection"] === "no") continue;
        const bagId = typeof fields["bag"] === "string" ? fields["bag"] : undefined;
        if (!bagId) continue;
        if (!this.mirrors.some((m) => m.bagId === bagId)) continue;

        const key = `${bagId}\0${title}`;
        const existing = this.timers.get(key);
        if (existing) clearTimeout(existing);
        this.timers.set(key, setTimeout(() => {
          this.timers.delete(key);
          void this.flush(bagId, title);
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
  }

  /** Unlink by trying all mirrors whose path strategy resolves the URI. */
  private _scheduleUnlinkByTitle(title: string): void {
    for (const mirror of this.mirrors) {
      const relPath = mirror.toRelPath(title);
      if (!relPath) continue;
      const root      = resolvePath(mirror.mirrorRoot);
      const candidate = resolvePath(join(root, relPath));
      if (!candidate.startsWith(root + "/") && candidate !== root) continue;
      try {
        if (existsSync(candidate)) {
          this.writing.add(title);
          try { unlinkSync(candidate); } finally { this.writing.delete(title); }
        }
      } catch { /* best-effort — operator can clean up manually */ }
    }
  }

  private async flush(bagId: string, tiddlerUri: string): Promise<void> {
    const mirror = this.mirrors.find((m) => m.bagId === bagId);
    if (!mirror) return;

    const relPath = mirror.toRelPath(tiddlerUri);
    if (!relPath) return;

    const root      = resolvePath(mirror.mirrorRoot);
    const candidate = resolvePath(join(root, relPath));
    // Path-traversal guard.
    if (!candidate.startsWith(root + "/") && candidate !== root) return;

    const output = await this.renderFn(tiddlerUri);
    if (output === null) return;

    this.writing.add(tiddlerUri);
    try {
      mkdirSync(dirname(candidate), { recursive: true });
      writeFileSync(candidate, output, "utf-8");
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
    // cleaned up on the first flush to the new mirror.
    for (const otherMirror of this.mirrors) {
      if (otherMirror.bagId === bagId) continue;
      const staleRel = otherMirror.toRelPath(tiddlerUri);
      if (!staleRel) continue;
      const staleRoot = resolvePath(otherMirror.mirrorRoot);
      const stalePath = resolvePath(join(staleRoot, staleRel));
      if (!stalePath.startsWith(staleRoot + "/") && stalePath !== staleRoot) continue;
      try {
        if (existsSync(stalePath)) {
          this.writing.add(tiddlerUri);
          try { unlinkSync(stalePath); } finally { this.writing.delete(tiddlerUri); }
        }
      } catch { /* best-effort */ }
    }
  }
}
