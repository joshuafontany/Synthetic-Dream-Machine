/**
 * LarDiskProjector — bag-aware unidirectional projection: store → disk.
 *
 * Co-projection model: the operator's mind
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
 *   - seed/canon (@lares/@lararium/@sdm) → `bags/@NAME/...` (seed / canon)
 * State/runtime bags (@personal/@draft/@temp/@daemon) carry no mirror.
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
import { confineMirrorWrite, carrierBaseRelPath } from "./bag-paths.js";
import { contentHash, syncedTreeKey, type SyncedTree } from "./synced-tree.js";
import { isEffectRecordUri, KeyedCoalesceGate, stripMemeExt } from "@lararium/mesh";
import type { ReadinessMap, WindowServo } from "@lararium/mesh";
import type { TW5Engine, CarrierFile } from "@lararium/tw5";
import type { BagMirrorConfig } from "./bag-paths.js";

export interface LarDiskProjectorOptions {
  /** Bag mirrors. Bags absent from this list never write to disk. */
  readonly mirrors: readonly BagMirrorConfig[];
  /** Render a carrier-root URI to its canonical text. Null skips the write.
   *  Memetic-only fallback: used when `carrierFileFn` is absent (tests, hosts
   *  without a native file-info bridge). Sites the carrier as `.mem`. */
  readonly renderFn: (tiddlerUri: string) => Promise<string | null>;
  /**
   * Render a carrier-root URI to ITS OWN filetype — the native-aware seam. A
   * memetic carrier recomposes to `.mem`; any other TW5 filetype rides the VM's
   * file-info cascade to its native file (+ a `.meta` sidecar where the type
   * needs one). Present → the projector sites at `<uri-path><ext>` and writes
   * the sidecar; absent → falls back to `renderFn` (`.mem` only). Null skips.
   */
  readonly carrierFileFn?: (tiddlerUri: string) => Promise<CarrierFile | null>;
  /**
   * Report every bag that currently HOLDS a carrier (`composite.listBagsHolding`).
   * Gates the cross-mirror stale-unlink: a carrier still living in a bag — a
   * working edit SHADOWING its canon copy — keeps its file in that bag's mirror.
   * The stale-unlink fires ONLY where the carrier has genuinely LEFT the bag (a
   * true MOVE/promotion). Absent → the unlink clears every other mirror by path.
   */
  readonly bagsHolding?: (tiddlerUri: string) => Promise<readonly string[]>;
  /** Debounce delay in ms (default 1000). */
  readonly debounceMs?: number;
  /** Fired on every disk-ward refusal — the island routes it to the daemon VM. */
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
  /**
   * Self-regulation for the reconcile gate (the COALESCE servo), OPT-IN. The disk reconcile is
   * variable-cost + bursty with no natural clock — exactly where a window servo pays (unlike a
   * display gate, which stays frame-pinned). When set, the gate self-clocks on each reconcile's
   * completion and grows/shrinks `debounceMs` toward `targetMs` (adaptWindow). `targetMs` is a
   * reconcile-COST set-point (ms above which the window WIDENS) — NOT the window length; `minMs`/
   * `maxMs` bound the window. Absent → fixed debounce (the proven default; the capability ships
   * inert until an operator calibrates a real cost target).
   */
  readonly servo?: WindowServo;
}

/** Read a file and compare it byte-for-byte against `body`; a missing or
 *  unreadable file reads as unequal (the caller then writes). */
function safeReadEquals(path: string, body: string): boolean {
  try { return existsSync(path) && readFileSync(path, "utf-8") === body; }
  catch { return false; }
}

export class LarDiskProjector {
  /**
   * URIs currently being written to disk.
   * File watcher MUST check writing.has(uri) before ingesting — skip own writes.
   */
  readonly writing = new Set<string>();

  /** The keyed coalesce gate (mesh/projection-nalu) — debounce per carrier-root URI, so a MOVE's
   *  source-tombstone and destination-add settle into ONE level-triggered reconcile. Born in start(). */
  private gate: KeyedCoalesceGate<string> | null = null;
  private _firstFlushDone = false;

  private _tw5: TW5Engine | null = null;

  private readonly mirrors: readonly BagMirrorConfig[];
  private readonly renderFn: (tiddlerUri: string) => Promise<string | null>;
  private readonly carrierFileFn: ((tiddlerUri: string) => Promise<CarrierFile | null>) | undefined;
  private readonly bagsHolding: ((tiddlerUri: string) => Promise<readonly string[]>) | undefined;
  private readonly debounceMs: number;
  private readonly onRefusal: ((info: { bagId: string; uri: string; reason: string }) => void) | undefined;
  private readonly readinessMap: ReadinessMap | undefined;
  private readonly debugJson: boolean;
  private readonly syncedTree: SyncedTree | undefined;
  private readonly servo: WindowServo | undefined;

  constructor(opts: LarDiskProjectorOptions) {
    this.mirrors      = opts.mirrors;
    this.renderFn     = opts.renderFn;
    this.carrierFileFn = opts.carrierFileFn;
    this.bagsHolding  = opts.bagsHolding;
    this.debounceMs   = opts.debounceMs ?? 1000;
    this.onRefusal    = opts.onRefusal;
    this.readinessMap = opts.readinessMap;
    this.debugJson    = opts.debugJson ?? false;
    this.syncedTree   = opts.syncedTree;
    // The reconcile gate's COALESCE servo is OPT-IN — absent leaves the proven fixed debounce
    // untouched (no default-on adaptive window; a guessed cost-target would silently mutate the
    // proven path). The capability (self-clock + adaptWindow) is ready when an operator passes a
    // servo with a real reconcile-cost `targetMs`.
    this.servo = opts.servo;
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

    // LEVEL-TRIGGERED (K8s reconciliation prior-art): every change is a NUDGE to
    // reconcile this carrier root against the CURRENT settled VM state — never an edge that
    // licenses a destructive action off a transient view. The keyed gate debounces per ROOT (not
    // per bag+root) so a MOVE's source-tombstone and destination-add COALESCE into ONE reconcile
    // that sees the final owner — closing the unlink/write race structurally (the old per-(bag,root)
    // flush + immediate gone-unlink never coalesced).
    const gate = new KeyedCoalesceGate<string>({
      debounceMs: this.debounceMs,
      // Return the reconcile PROMISE (not void) so the servo can self-clock on its completion +
      // measure its true async cost (the sync-trigger/async-cost gap, closed Nagle-style).
      onFlush: (rootUri) => this.reconcile(rootUri),
      ...(this.servo ? { servo: this.servo } : {}),
    });
    this.gate = gate;
    const handler = (changes: Record<string, unknown>) => {
      for (const title of Object.keys(changes)) {
        if (!title.startsWith("lar:")) continue;
        gate.mark(routeToRoot(title));
      }
    };
    wiki.addEventListener?.("change", handler);
    return () => { wiki.removeEventListener?.("change", handler); this.stop(); };
  }

  stop(): void {
    this.gate?.dispose();
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
   * Gone from the resolved view → unlink from every mirror whose bag no longer
   * holds it (a true delete; a bag still holding the carrier keeps its file). A
   * MOVE shows its new owner here, the add having merged within the debounce.
   * Idempotent: a later nudge re-reconciles, so a transient "gone" self-heals
   * when the destination lands — the unlink can never be the final word for a
   * carrier a bag still holds.
   */
  private async reconcile(rootUri: string): Promise<void> {
    const tiddler = this._tw5?.$tw.wiki.getTiddler?.(rootUri);
    if (!tiddler) {
      await this._scheduleUnlinkByTitle(rootUri);
      return;
    }
    const fields = tiddler.fields as Record<string, string | string[] | undefined>;
    if (fields["disk-projection"] === "no") return;
    const bagId = typeof fields["bag"] === "string" ? fields["bag"] : undefined;
    if (!bagId || !this.mirrors.some((m) => m.bagId === bagId)) return;
    await this.flush(bagId, rootUri);
  }

  /** Unlink by trying all mirrors whose path strategy resolves the URI — but a
   *  mirror whose bag STILL HOLDS the carrier keeps its file (a carrier hidden
   *  from the resolved view by a shadowing tombstone still lives in its lower
   *  bag; each mirror reflects its OWN bag's content, never the resolved view). */
  private async _scheduleUnlinkByTitle(title: string): Promise<void> {
    const holdingBags = this.bagsHolding ? new Set(await this.bagsHolding(title)) : null;
    for (const mirror of this.mirrors) {
      if (holdingBags?.has(mirror.bagId)) continue;
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

  /** Write bytes atomically: a temp file in the SAME dir, then rename over the
   *  target — a watcher or editor never observes a torn file, and a crash leaves
   *  only a stray temp. */
  private atomicWrite(candidate: string, body: string): void {
    const tmp = `${candidate}.lar-tmp-${process.pid}`;
    writeFileSync(tmp, body, "utf-8");
    renameSync(tmp, candidate);
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

    // Site the carrier by its own filetype. The native-aware seam
    // (`carrierFileFn`) hands back the VM's chosen extension + bytes + any
    // `.meta` sidecar, so a `.tid`/`.json`/`.md` record projects back as its
    // OWN file; the memetic fallback (`renderFn`) sites `.mem` alone. One
    // authority decides the type — the VM registry — the projector only sites.
    let relPath: string | null;
    let output: string;
    let metaBody: string | undefined;
    if (this.carrierFileFn) {
      const base = carrierBaseRelPath(tiddlerUri);
      if (!base) return;
      const file = await this.carrierFileFn(tiddlerUri);
      if (file === null) return;
      relPath  = base + file.ext;
      output   = file.body;
      metaBody = file.metaBody;
    } else {
      relPath = mirror.toRelPath(tiddlerUri);
      if (!relPath) return;
      const rendered = await this.renderFn(tiddlerUri);
      if (rendered === null) return;
      output = rendered;
    }

    // The disk ward — sovereign-island write confinement (bag-paths). Cascade
    // output counts as untrusted; refusals surface LOUDLY, never silently.
    const gate = confineMirrorWrite(mirror.mirrorRoot, relPath, mirror.allowBagsRootFiles);
    if (!gate.ok) {
      console.error(`[disk-ward] write refused (${mirror.bagId} <- ${tiddlerUri}): ${gate.reason}`);
      this.onRefusal?.({ bagId: mirror.bagId, uri: tiddlerUri, reason: gate.reason });
      return;
    }
    const candidate = gate.path;

    // Projection-side hash gate (§6): bytes already on disk == would-write
    // bytes → skip the write entirely (no event for any watcher, no mtime
    // churn) — but still record the observation in the Synced tree. The gate
    // reads the MAIN body; a `.meta` sidecar rides with it (write-through).
    const outputHash = contentHash(output);
    const metaPath   = metaBody !== undefined ? candidate + ".meta" : null;
    const metaInSync = metaPath === null || (existsSync(metaPath) && safeReadEquals(metaPath, metaBody!));
    try {
      if (existsSync(candidate) && contentHash(readFileSync(candidate, "utf-8")) === outputHash && metaInSync) {
        this.syncedTree?.set(syncedTreeKey(bagId, tiddlerUri), outputHash);
        return;
      }
    } catch { /* unreadable existing file — fall through to the write */ }

    this.writing.add(tiddlerUri);
    try {
      mkdirSync(dirname(candidate), { recursive: true });
      // Atomic write (§2 law): temp in the SAME dir + rename — no watcher or
      // editor ever observes a torn carrier; a crash leaves only a temp file.
      this.atomicWrite(candidate, output);
      // The `.meta` sidecar carries the tiddler's fields for a content filetype;
      // it lands beside the body, atomic too, so a reader never pairs a fresh
      // body with a stale sidecar.
      if (metaPath !== null) this.atomicWrite(metaPath, metaBody!);
      this.syncedTree?.set(syncedTreeKey(bagId, tiddlerUri), outputHash);
      if (this.debugJson && this._tw5) {
        const jsonStr = (this._tw5.$tw.wiki as { getTiddlerAsJson?: (t: string) => string })
          .getTiddlerAsJson?.(tiddlerUri);
        if (jsonStr) {
          const jsonPath = stripMemeExt(candidate) + ".json";
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

    // After writing the current mirror, unlink stale files from OTHER mirrors —
    // but ONLY where the carrier has genuinely LEFT that bag (a true MOVE, e.g.
    // promotion wiki-bag → lares-bag, cleaning the old scratch file). A carrier
    // that STILL LIVES in a bag — a working edit SHADOWING its canon copy — keeps
    // its file there: `bagsHolding` reports every bag holding it, and a bag on
    // that list never gets its file unlinked. Without the callback, the unlink
    // clears every other mirror by path. One gate, one choke-point: the unlink
    // path routes through the ward like every other mirror touch.
    const holdingBags = this.bagsHolding ? new Set(await this.bagsHolding(tiddlerUri)) : null;
    for (const otherMirror of this.mirrors) {
      // The carrier still lives in this bag (shadowed, not moved) → keep its file.
      if (holdingBags?.has(otherMirror.bagId)) continue;
      const staleRel = otherMirror.toRelPath(tiddlerUri);
      if (!staleRel) continue;
      const staleGate = confineMirrorWrite(otherMirror.mirrorRoot, staleRel, otherMirror.allowBagsRootFiles);
      if (!staleGate.ok) {
        console.error(`[disk-ward] stale-unlink refused (${otherMirror.bagId}): ${staleGate.reason}`);
        this.onRefusal?.({ bagId: otherMirror.bagId, uri: tiddlerUri, reason: staleGate.reason });
        continue;
      }
      // Never unlink the path we just rendered. Path identity — not bag
      // identity — marks the live file: toRelPath derives from the URI alone,
      // so the current bag, AND any mirror sharing this mirrorRoot, resolves to
      // the SAME path. The old bagId guard let a co-rooted sibling unlink the
      // file this flush just wrote; the path guard subsumes it and closes that
      // self-deletion structurally — no mirror config can trigger it.
      if (staleGate.path === candidate) continue;
      try {
        if (existsSync(staleGate.path)) {
          this.writing.add(tiddlerUri);
          try { unlinkSync(staleGate.path); } finally { this.writing.delete(tiddlerUri); }
        }
      } catch { /* best-effort */ }
    }
  }
}
