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
 *   Disk projection RENDERS, never string-copies. The ONE render seam
 *   (`carrierFileFn`, the VM's `exportCarrierFile`) hands back the carrier's own
 *   filetype: a memetic carrier recomposes to `.mem` (expandMemeRefs over its
 *   group), any other TW5 filetype rides the file-info cascade to its native
 *   file (+ a `.meta` sidecar where the type needs one). The VM registry decides
 *   type + extension + bytes; the projector only sites at `<uri-path><ext>`.
 *
 * Group routing (carrier-whole at rest, disk-projection#projection-routing):
 *   memetic-wikitext records form a tiddler-group keyed by the carrier root.
 *   A child change climbs `fragment-parent` to the root; debounce keys per
 *   (bag, root); the flush renders the ROOT — one carrier, one file. A
 *   fragment URI never owns a disk path (bag-paths returns null for them).
 *
 * Echo suppression ranks (Confluence): the CONTENT-HASH gates carry the law —
 * ingest drops disk-hash == synced-hash; projection skips byte-identical
 * writes. The `writing` Set survives beneath them as a latency
 * optimization only (skip re-statting our own in-flight writes); no
 * correctness rests on it.
 */

import { writeFileSync, mkdirSync, unlinkSync, existsSync, readFileSync, readdirSync, renameSync } from "fs";
import { dirname, basename } from "path";
import { confineMirrorWrite, carrierBaseRelPath } from "./bag-paths.js";
import { contentHash, syncedTreeKey, type SyncedTree } from "./synced-tree.js";
import { isEffectRecordUri, KeyedCoalesceGate, carrierHash } from "@lararium/mesh";
import type { ReadinessMap, WindowServo } from "@lararium/mesh";
import type { TW5Engine, CarrierFile } from "@lararium/tw5";
import type { BagMirrorConfig } from "./bag-paths.js";

export interface LarDiskProjectorOptions {
  /** Bag mirrors. Bags absent from this list never write to disk. */
  readonly mirrors: readonly BagMirrorConfig[];
  /**
   * Render a carrier-root URI to ITS OWN filetype — the ONE render seam. A
   * memetic carrier recomposes to `.mem`; any other TW5 filetype rides the VM's
   * file-info cascade to its native file (+ a `.meta` sidecar where the type
   * needs one). The VM registry decides type + bytes for both; the projector
   * only sites at `<uri-path><ext>` and writes the sidecar. Null skips the write.
   */
  readonly carrierFileFn: (tiddlerUri: string) => Promise<CarrierFile | null>;
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
   * The Synced tree (Confluence merge base): records the content hash of every
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

/** Escape a filename stem for a literal match inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve a carrier's ACTUAL on-disk files from its confined absolute base
 * (extension-less). A carrier owns exactly one content file at `<stem><ext>`
 * plus an optional `<stem><ext>.meta` sidecar — the extension varies by filetype
 * (the ruling), so the deletion/unlink side cannot assume `.mem`. The match binds
 * the WHOLE stem then a single extension segment (+ optional `.meta`), so a
 * sibling carrier whose stem merely shares a prefix never gets swept. Returns
 * absolute paths; a missing directory reads as no files.
 */
export function carrierDiskFiles(absBase: string): string[] {
  const dir  = dirname(absBase);
  const stem = basename(absBase);
  const re   = new RegExp(`^${escapeRegExp(stem)}\\.[^.]+(?:\\.meta)?$`);
  try {
    return readdirSync(dir).filter((n) => re.test(n)).map((n) => `${dir}/${n}`);
  } catch { return []; }
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
  private readonly carrierFileFn: (tiddlerUri: string) => Promise<CarrierFile | null>;
  private readonly bagsHolding: ((tiddlerUri: string) => Promise<readonly string[]>) | undefined;
  private readonly debounceMs: number;
  private readonly onRefusal: ((info: { bagId: string; uri: string; reason: string }) => void) | undefined;
  private readonly readinessMap: ReadinessMap | undefined;
  private readonly debugJson: boolean;
  private readonly syncedTree: SyncedTree | undefined;
  private readonly servo: WindowServo | undefined;

  constructor(opts: LarDiskProjectorOptions) {
    this.mirrors      = opts.mirrors;
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

  /**
   * Resolve a carrier's confined on-disk file(s) within ONE mirror — the
   * native-aware seam globs the actual `<stem><ext>` (+ `.meta`) so a
   * `.tid`/`.md`/`.json` carrier resolves its real files (the ruling: the
   * extension varies); the memetic fallback resolves the single `.mem` path.
   * Returns null to SKIP (unresolvable name, or a ward refusal already surfaced);
   * an empty array means the name resolved but no file sits on disk.
   */
  private mirrorCarrierFiles(mirror: BagMirrorConfig, uri: string): string[] | null {
    const base = carrierBaseRelPath(uri);
    if (!base) return null;
    const gate = confineMirrorWrite(mirror.mirrorRoot, base, mirror.allowBagsRootFiles);
    if (!gate.ok) {
      console.error(`[disk-ward] unlink refused (${mirror.bagId}): ${gate.reason}`);
      this.onRefusal?.({ bagId: mirror.bagId, uri, reason: gate.reason });
      return null;
    }
    return carrierDiskFiles(gate.path);
  }

  /** Unlink by trying all mirrors whose path strategy resolves the URI — but a
   *  mirror whose bag STILL HOLDS the carrier keeps its file (a carrier hidden
   *  from the resolved view by a shadowing tombstone still lives in its lower
   *  bag; each mirror reflects its OWN bag's content, never the resolved view). */
  private async _scheduleUnlinkByTitle(title: string): Promise<void> {
    const holdingBags = this.bagsHolding ? new Set(await this.bagsHolding(title)) : null;
    for (const mirror of this.mirrors) {
      if (holdingBags?.has(mirror.bagId)) continue;
      const files = this.mirrorCarrierFiles(mirror, title);
      if (files === null) continue;
      try {
        for (const f of files) {
          if (existsSync(f)) {
            this.writing.add(title);
            try { unlinkSync(f); } finally { this.writing.delete(title); }
          }
        }
        this.syncedTree?.delete(syncedTreeKey(mirror.bagId, title));   // the observation leaves with the file(s)
      } catch { /* best-effort — operator can clean up manually */ }
    }
  }

  /** Write bytes atomically: a temp file in the SAME dir, then rename over the
   *  target — a watcher or editor never observes a torn file, and a crash leaves
   *  only a stray temp. */
  private atomicWrite(candidate: string, body: string | Buffer): void {
    const tmp = `${candidate}.lar-tmp-${process.pid}`;
    if (typeof body === "string") writeFileSync(tmp, body, "utf-8");
    else writeFileSync(tmp, body);
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

    // Site the carrier by its own filetype — ONE render seam. The VM registry
    // hands back the chosen extension + bytes + any `.meta` sidecar, so a
    // memetic carrier sites `.mem` and a `.tid`/`.json`/`.md` record projects
    // back as its OWN file. The VM decides the type; the projector only sites.
    const base = carrierBaseRelPath(tiddlerUri);
    if (!base) return;
    const file = await this.carrierFileFn(tiddlerUri);
    if (file === null) return;
    const relPath  = base + file.ext;
    const output   = file.body;
    const metaBody = file.metaBody;
    // A binary filetype (image/PDF) carries base64 text in `body`; the raw bytes
    // land on disk. The Synced-tree observation + the ingest gesture BOTH hash the
    // base64 string form (the carrier text), so the echo gate compares like with
    // like; only the physical file holds decoded bytes.
    const isBinary  = file.encoding === "base64";
    const writeBytes: string | Buffer = isBinary ? Buffer.from(output, "base64") : output;

    // The disk ward — sovereign-island write confinement (bag-paths). Cascade
    // output counts as untrusted; refusals surface LOUDLY, never silently.
    const gate = confineMirrorWrite(mirror.mirrorRoot, relPath, mirror.allowBagsRootFiles);
    if (!gate.ok) {
      console.error(`[disk-ward] write refused (${mirror.bagId} <- ${tiddlerUri}): ${gate.reason}`);
      this.onRefusal?.({ bagId: mirror.bagId, uri: tiddlerUri, reason: gate.reason });
      return;
    }
    const candidate = gate.path;

    // Projection-side hash gate (Confluence): bytes already on disk == would-write
    // bytes → skip the write entirely (no event for any watcher, no mtime
    // churn) — but still record the observation in the Synced tree. The gate
    // reads the MAIN body per-file; the Synced-tree OBSERVATION folds the `.meta`
    // in (the echo gate keys on the whole carrier, body + live metadata).
    const outputHash = contentHash(output);                       // body-only, for the per-file skip
    const obsHash    = carrierHash(output, metaBody);             // whole-carrier, for the Synced tree
    const metaPath   = metaBody !== undefined ? candidate + ".meta" : null;
    const metaInSync = metaPath === null || (existsSync(metaPath) && safeReadEquals(metaPath, metaBody!));
    try {
      // The body-skip reads BYTES for a binary file (a utf8 read would mangle the
      // raw bytes and never match), else hashes the utf8 text against the carrier.
      const bodyInSync = existsSync(candidate) && (isBinary
        ? readFileSync(candidate).equals(writeBytes as Buffer)
        : contentHash(readFileSync(candidate, "utf-8")) === outputHash);
      if (bodyInSync && metaInSync) {
        this.syncedTree?.set(syncedTreeKey(bagId, tiddlerUri), obsHash);
        return;
      }
    } catch { /* unreadable existing file — fall through to the write */ }

    this.writing.add(tiddlerUri);
    try {
      mkdirSync(dirname(candidate), { recursive: true });
      // Atomic write (§2 law): temp in the SAME dir + rename — no watcher or
      // editor ever observes a torn carrier; a crash leaves only a temp file.
      this.atomicWrite(candidate, writeBytes);
      // The `.meta` sidecar carries the tiddler's fields for a content filetype;
      // it lands beside the body, atomic too, so a reader never pairs a fresh
      // body with a stale sidecar.
      if (metaPath !== null) this.atomicWrite(metaPath, metaBody!);
      this.syncedTree?.set(syncedTreeKey(bagId, tiddlerUri), obsHash);
      if (this.debugJson && this._tw5) {
        const jsonStr = (this._tw5.$tw.wiki as { getTiddlerAsJson?: (t: string) => string })
          .getTiddlerAsJson?.(tiddlerUri);
        if (jsonStr) {
          // Ride as a `.json` AFTER the full filename (`base.mem.json`), not
          // `base.json` — a bare-stem sibling would be a carrier of stem `base`,
          // and the straggler sweep would delete it every flush. The double
          // extension keeps it OUT of `carrierDiskFiles`' single-segment match.
          const jsonPath = candidate + ".json";
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

    // Same-mirror straggler sweep: a FILETYPE change re-sites the carrier at a
    // NEW extension (`.md` → `.tid`), so the old-extension file (+ its `.meta`)
    // would orphan beside the fresh one. Remove any sibling of THIS carrier's
    // base that the current write did not produce — the extension moved, the
    // name did not.
    for (const f of this.mirrorCarrierFiles(mirror, tiddlerUri) ?? []) {
      if (f === candidate || (metaPath !== null && f === metaPath)) continue;
      try {
        if (existsSync(f)) {
          this.writing.add(tiddlerUri);
          try { unlinkSync(f); } finally { this.writing.delete(tiddlerUri); }
        }
      } catch { /* best-effort */ }
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
      const staleFiles = this.mirrorCarrierFiles(otherMirror, tiddlerUri);
      if (staleFiles === null) continue;
      for (const stale of staleFiles) {
        // Never unlink what THIS flush just wrote. Path identity — not bag
        // identity — marks the live file: the base derives from the URI alone,
        // so the current bag, AND any mirror sharing this mirrorRoot, resolves to
        // the SAME files. The path guard closes the co-rooted self-deletion
        // structurally — no mirror config can trigger it (the `.meta` sidecar
        // rides beside the body under the same guard).
        if (stale === candidate || (metaPath !== null && stale === metaPath)) continue;
        try {
          if (existsSync(stale)) {
            this.writing.add(tiddlerUri);
            try { unlinkSync(stale); } finally { this.writing.delete(tiddlerUri); }
          }
        } catch { /* best-effort */ }
      }
    }
  }
}
