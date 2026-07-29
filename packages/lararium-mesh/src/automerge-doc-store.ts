/**
 * AutomergeDocStore — the one LarTiddlerStore for every vessel: the SHORE where LarDoc meaning
 * crosses into Automerge's medium.
 *
 * The store SHAPE crosses unchanged: browser, Node, and worker vessels all instantiate this
 * directly, and platform differences (IndexedDB vs fs vs memory) live in the Repo's storage/network
 * adapters — never in the store. Relay-as-vessel doctrine. The medium varies; the shape does not.
 *
 * LarDoc alignment (M24): the Automerge doc carries a `tiddlers` submap.
 *   doc.tiddlers[title] = LarTiddlerRecord
 *
 * Automerge patches arrive with path = ["tiddlers", title, fieldName]. AutomergeDocStore strips the
 * leading "tiddlers" segment before handing patches to MemeProvider so the provider stays
 * path-agnostic — the foreign medium's addressing stops at this shore and never travels inward.
 *
 * FPI-3 (synergy): same mutation/subscription API runs on every vessel.
 * Local-first Ideal 1 (fast): get/listVisible read from the in-memory doc.
 */

import type { DocHandle } from "@automerge/automerge-repo";
import { getHeads as automergeGetHeads } from "@automerge/automerge";
import type { LarTiddlerRecord, LarTiddlerStore, LarTiddlerChange, ChangeOrigin } from "./tiddler-store.js";
import type { MemeProjection } from "./meme-provider.js";
import { MemeProvider } from "./meme-provider.js";
import type { LarDoc } from "./base-doc.js";

type MutableLarTiddlerRecord = {
  tiddler: Record<string, unknown> & { title: string };
  meta?: {
    deleted?: boolean;
    sourceUri?: string;
    contentHash?: string;
    authority?: string;
    recipe?: string;
  };
};

function _contentEquals(cur: LarTiddlerRecord, rec: LarTiddlerRecord): boolean {
  return JSON.stringify(cur) === JSON.stringify(rec);
}

function _mergeRecord(target: MutableLarTiddlerRecord, record: LarTiddlerRecord): void {
  const t = target.tiddler;
  for (const key of Object.keys(t)) {
    if (!(key in record.tiddler)) delete t[key];
  }
  for (const [key, value] of Object.entries(record.tiddler)) {
    t[key] = value instanceof Date ? value.toISOString() : value;
  }

  const nextMeta = record.meta ?? {};
  if (!target.meta) target.meta = {};
  const m = target.meta;
  for (const key of Object.keys(m) as (keyof typeof m)[]) {
    if (!(key in nextMeta)) delete m[key];
  }
  Object.assign(m, nextMeta);
  if (Object.keys(m).length === 0) delete target.meta;
}

function _cloneRecord(record: LarTiddlerRecord): LarTiddlerRecord {
  const { created: rawCreated, modified: rawModified, ...rest } = record.tiddler;
  const created = rawCreated instanceof Date ? rawCreated.toISOString() : rawCreated;
  const modified = rawModified instanceof Date ? rawModified.toISOString() : rawModified;
  return {
    tiddler: {
      ...rest,
      ...(created !== undefined ? { created } : {}),
      ...(modified !== undefined ? { modified } : {}),
    },
    ...(record.meta !== undefined ? { meta: { ...record.meta } } : {}),
  };
}

function _isDeleted(record: LarTiddlerRecord): boolean {
  return record.meta?.deleted === true;
}

function _titleOf(record: LarTiddlerRecord): string {
  return record.tiddler.title;
}

function _freezeRecord(raw: LarTiddlerRecord): LarTiddlerRecord {
  return Object.freeze({
    tiddler: Object.freeze({ ...raw.tiddler }),
    ...(raw.meta !== undefined ? { meta: Object.freeze({ ...raw.meta }) } : {}),
  });
}

function _tombstoneRecord(title: string): LarTiddlerRecord {
  return Object.freeze({ tiddler: { title }, meta: { deleted: true } });
}

export class AutomergeDocStore implements LarTiddlerStore {
  protected readonly handle: DocHandle<LarDoc>;
  readonly provider: MemeProvider;
  readonly bagId: string | undefined;

  constructor(handle: DocHandle<LarDoc>, bagId?: string) {
    this.handle  = handle;
    this.bagId   = bagId;
    // MemeProvider gets the tiddlers submap — keeps MemeProvider path-agnostic.
    this.provider = new MemeProvider(
      () => (handle.doc()?.tiddlers ?? {}) as Record<string, unknown>,
      () => this.bagId,
    );

    const remoteOrigin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: bagId ?? "automerge" };
    handle.on("change", ({ patches }) => {
      // Re-map ["tiddlers", title, ...] → [title, ...] before fan-out.
      // Patches that touch doc-level fields (schemaVersion, etc.) are dropped here
      // since MemeProvider only tracks tiddler-keyed URIs.
      const remapped = (patches ?? [])
        .filter((p) => Array.isArray(p.path) && p.path[0] === "tiddlers")
        .map((p) => ({ ...p, path: (p.path as unknown[]).slice(1) }));
      this.provider.handleChange(remapped, remoteOrigin);
    });
  }

  addProjection(p: MemeProjection): () => void {
    return this.provider.addProjection(p);
  }

  markSyncComplete(): void {
    this.provider.markSyncComplete(this.bagId ?? "automerge");
  }

  /**
   * Drive the current doc state through the projection bus as a series of
   * crdt-remote changes. Called once per bag after `addProjection()` registers
   * the adaptor + accumulator and before `markSyncComplete()` fires.
   *
   * The adaptor's pre-sync buffer collects these; onSyncComplete flushes them
   * in one `wiki.transact()` per bag during initial replay. The accumulator
   * drops them (syncReady still false). Live patches after markSyncComplete
   * flow through the standard handleChange() path into the shared accumulator.
   */
  emitInitialReplay(): void {
    const tiddlers = this.handle.doc()?.tiddlers;
    if (!tiddlers) return;
    const origin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: this.bagId ?? "automerge" };
    for (const raw of Object.values(tiddlers) as LarTiddlerRecord[]) {
      if (!raw || !raw.tiddler?.title) continue;
      const title = raw.tiddler.title;
      this.provider.fireImmediate({
        title,
        record: _freezeRecord(raw),
        origin,
        ...(this.bagId !== undefined ? { bag: this.bagId } : {}),
      });
    }
  }

  async listVisible(): Promise<string[]> {
    const tiddlers = this.handle.doc()?.tiddlers;
    if (!tiddlers) return [];
    return (Object.values(tiddlers) as LarTiddlerRecord[])
      .filter((r) => r?.tiddler && !_isDeleted(r) && _titleOf(r) && !_titleOf(r).startsWith("$:/temp/"))
      .map((r) => _titleOf(r));
  }

  async get(title: string): Promise<LarTiddlerRecord | null> {
    const raw = this.handle.doc()?.tiddlers?.[title];
    return raw ? _freezeRecord(raw) : null;
  }

  /**
   * Residency Model: current Automerge Heads for this bag's doc.
   * Returns null when the doc has not yet hydrated (DocHandle.doc() returns
   * undefined). Used by CompositeStore.auditEpochs() to detect bag-epoch drift.
   */
  async getHeads(): Promise<readonly string[] | null> {
    const doc = this.handle.doc();
    if (!doc) return null;
    return automergeGetHeads(doc) as readonly string[];
  }

  async put(record: LarTiddlerRecord, origin: ChangeOrigin): Promise<void> {
    const title = record.tiddler.title;
    const existing = this.handle.doc()?.tiddlers?.[title];
    if (existing && _contentEquals(existing, record)) return;

    this.handle.change((doc) => {
      const tiddlers = doc.tiddlers as Record<string, MutableLarTiddlerRecord>;
      const current = tiddlers[title];
      if (current) {
        _mergeRecord(current, record);
        return;
      }
      tiddlers[title] = _cloneRecord(record) as MutableLarTiddlerRecord;
    });
    this.provider.fireImmediate({ title, record, origin, ...(this.bagId !== undefined ? { bag: this.bagId } : {}) });
  }

  async tombstone(title: string, origin: ChangeOrigin): Promise<void> {
    this.handle.change((doc) => {
      const tiddlers = doc.tiddlers as Record<string, MutableLarTiddlerRecord>;
      const existing = tiddlers[title];
      if (existing) {
        if (!existing.meta) existing.meta = {};
        existing.meta.deleted = true;
      } else {
        tiddlers[title] = { tiddler: { title }, meta: { deleted: true } };
      }
    });
    this.provider.fireImmediate({ title, record: _tombstoneRecord(title), origin, ...(this.bagId !== undefined ? { bag: this.bagId } : {}) });
  }

  /** HARD-remove: delete the key so `get` returns null (ABSENT — falls through
   *  the cascade), never a kāpae tombstone. The MOVE/promotion source retract. */
  async remove(title: string, origin: ChangeOrigin): Promise<void> {
    this.handle.change((doc) => {
      const tiddlers = doc.tiddlers as Record<string, MutableLarTiddlerRecord>;
      delete tiddlers[title];
    });
    // Fire record:null — absence; the adaptor's cross-bag resolution surfaces
    // whatever lower-bag copy now resolves beneath (vs a kāpae stop).
    this.provider.fireImmediate({ title, record: null, origin, ...(this.bagId !== undefined ? { bag: this.bagId } : {}) });
  }

  subscribe(fn: (change: LarTiddlerChange) => void): () => void {
    return this.provider.addProjection({ onUriChanged: fn });
  }

}
