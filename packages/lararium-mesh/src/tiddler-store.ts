/**
 * LarTiddlerStore — TW5-neutral tiddler store contract.
 *
 * Owned by @lararium/mesh. No tiddlywiki runtime import.
 * Implemented by @lararium/tw5 (CrdtTiddlerStore, CanonTiddlerStore, MemoryTiddlerStore).
 *
 * Bags/layers model:
 *   core   — TW5 core / plugin / shadow tiddlers
 *   canon  — hostless lares/ carriers (resident in canon, long-lived)
 *   wiki   — shared live wiki edits (CRDT-backed)
 *   user   — operator private notes and personal overlays
 *   session — drafts, focus state, $:/temp/*, cursors (personal)
 *
 * Priority order: core < canon < wiki < user < session
 *
 * Hard rules:
 *   - wiki layer may override canon for live view; must not mutate canon.
 *   - session layer must not leak $:/temp/* or "Draft of ..." into shared state.
 *   - canon promotion is disabled until a Keyhive-backed proposal/receipt graph
 *     exists; store.put() never writes to lares/.
 *   - tombstone() marks deletion in live wiki state; no hard delete by default.
 */

// ---------------------------------------------------------------------------
// MemeProjection — typed slot for a downstream CRDT integration
// ---------------------------------------------------------------------------

export interface MemeProjection {
  onUriChanged(change: LarTiddlerChange): void;
  onChangeset?(uris: ReadonlySet<string>, origin: ChangeOrigin): void;
  onSyncComplete?(islandId: string): void;
}

// Minimal Automerge patch shape — only path[0] (the top-level doc key) is needed.
export interface RawPatch {
  path: unknown[];
}

/**
 * Raw/open field bag accepted by `new $tw.Tiddler(...)`, deserializers, and
 * `wiki.addTiddler(...)`.
 */
export interface ITW5TiddlerInputFields {
  title?:    string;
  text?:     string;
  tags?:     string | string[];
  type?:     string;
  created?:  Date | string;
  modified?: Date | string;
  creator?:  string;
  modifier?: string;
  list?:     string | string[];
  [field: string]: unknown;
}

export type TW5TiddlerInputFields = ITW5TiddlerInputFields;

/** Helper for boundaries that require a TW5 input bag with a concrete title. */
export type TW5TiddlerInputFieldsWithTitle = TW5TiddlerInputFields & { title: string };

/**
 * Materialized/frozen runtime field bag exposed on `tiddler.fields` after TW5
 * field-module parsing.
 */
export interface ITW5TiddlerFields extends Omit<ITW5TiddlerInputFields, "title" | "tags" | "list" | "created" | "modified"> {
  title:     string;
  tags?:     readonly string[];
  type?:     string;
  created?:  Date;
  modified?: Date;
  list?:     readonly string[];
  [field: string]: unknown;
}

export type TW5TiddlerFields = ITW5TiddlerFields;

// ---------------------------------------------------------------------------
// LarTiddlerRecord — host-envelope entry in a bag doc
// Schema: lar:///ha.ka.ba/lares/api/lararium/schema/tiddler-record
// ---------------------------------------------------------------------------

export interface LarTiddlerMeta {
  readonly deleted?:       boolean;
  readonly sourceUri?:     string;
  readonly contentHash?:   string;
  readonly authority?:     string;
  readonly recipe?:        string;
  /**
   * Residency Model schema-version tag — Anti-pattern #2 defense (schema drift
   * across multi-bag residency). Records carry their schema-version so the
   * recipe's lens registry can project them into the consumer's expected shape
   * via `lensFor(recipe, record)`. Absent = no migration needed; identityLens
   * applies. Convention: short stable string (e.g. "v1", "lore-2", "2026-05").
   */
  readonly schemaVersion?: string;
  /**
   * Residency Model change-id — Anti-pattern #1 defense (causal-history
   * severance on copy). When an ACTION verb (ADD / COPY / MOVE / LOAD)
   * transfers a tiddler between bags, the handler MUST preserve the
   * change-id from the source record onto the destination record. Downstream
   * tooling (operator queries, audit replay) recognizes "same change,
   * different bag" by comparing change-ids across bag-Manifestations of
   * one tiddler-title.
   *
   * Convention: opaque string, typically minted by `newChangeId()` on
   * first-write or LOAD; preserved across subsequent transfers.
   */
  readonly changeId?: string;
}

export interface LarTiddlerRecord {
  readonly tiddler: TW5TiddlerInputFieldsWithTitle;
  readonly meta?:  LarTiddlerMeta;
}

export interface LarWriteOptions {
  readonly bag?: string;
}

// ---------------------------------------------------------------------------
// Canonical record ↔ TW5 input shore
// ---------------------------------------------------------------------------

export function toLarTiddlerRecord(
  fields: TW5TiddlerInputFieldsWithTitle,
  meta?: LarTiddlerMeta,
): LarTiddlerRecord {
  const { created: rawCreated, modified: rawModified, ...rest } = fields;
  const created = rawCreated instanceof Date ? rawCreated.toISOString() : rawCreated;
  const modified = rawModified instanceof Date ? rawModified.toISOString() : rawModified;
  return {
    tiddler: {
      ...rest,
      ...(created !== undefined && { created }),
      ...(modified !== undefined && { modified }),
    },
    ...(meta !== undefined && { meta }),
  };
}

// ---------------------------------------------------------------------------
// ChangeOrigin — audit trail for every store mutation
// ---------------------------------------------------------------------------

/**
 * Carried by every store.put() and store.tombstone() call.
 * Used by LarariumCrdtSyncAdaptor to prevent echo loops:
 *   - TW local edits must not round-trip as remote changes.
 *   - CRDT remote changes must not fire back as local TW edits.
 */
export type ChangeOrigin =
  | { readonly kind: "tw-local";        readonly instanceId: string }
  | { readonly kind: "crdt-remote";     readonly edgeIsland: string }
  | { readonly kind: "canon-hydrate";   readonly receipt:    string }
  | { readonly kind: "mcp-draft";       readonly toolCallId: string }
  | { readonly kind: "operator-import"; readonly sessionId:  string }
  | { readonly kind: "canvas-draft";    readonly shapeId:    string }
  | { readonly kind: "lares-verb";       readonly requestId:  string };

// ---------------------------------------------------------------------------
// LarTiddlerChange — stream unit from store.subscribe()
// ---------------------------------------------------------------------------

export interface LarTiddlerChange {
  readonly title:     string;
  /** null indicates a tombstone (deletion marker). */
  readonly record:    LarTiddlerRecord | null;
  readonly origin:    ChangeOrigin;
  readonly bag?:      string;
}

// ---------------------------------------------------------------------------
// LarTiddlerStore — the canonical store interface
// ---------------------------------------------------------------------------

export interface LarTiddlerStore {
  /**
   * Returns titles of all non-deleted tiddlers visible under current authority.
   * Applies wiki recipe + Orichalcum ability checks.
   * Never returns $:/temp/* (session-local scratch).
   * "Draft of ..." titles get returned — drafts are identity-scoped, not session-scoped.
   */
  listVisible(): Promise<string[]>;

  /**
   * Materialize one authorized tiddler record.
   * Returns null if the title does not exist or the caller lacks read ability.
   */
  get(title: string): Promise<LarTiddlerRecord | null>;

  /**
   * Residency Model: optional heads getter for CRDT-backed stores.
   * Returns the current Automerge Heads when the underlying store carries
   * causal history; returns null for in-memory stores with no Automerge backing.
   *
   * Used by CompositeStore.auditPins() to detect bag-pin drift
   * (Anti-pattern #5 defense). Stores that omit this method behave as if it
   * returned null — they cannot participate in pin checks.
   */
  getHeads?(): Promise<readonly string[] | null>;

  /**
   * Write a record to live wiki state.
   * Must NOT write to lares/ (canon path). Future canon promotion must use a
   * Keyhive-backed proposal/receipt graph outside this store.
   * origin carries the audit trail and echo-loop guard.
   */
  put(record: LarTiddlerRecord, origin: ChangeOrigin, options?: LarWriteOptions): Promise<void>;

  /**
   * Mark a title deleted in live wiki state (a KĀPAE tombstone, meta.deleted).
   * Does not hard-delete. Tombstoned titles disappear from listVisible() by
   * default AND SHADOW lower-priority bags in the cascade (kāpae semantics — a
   * deliberate hide; anti-pattern #3, residency-model). origin carries audit.
   */
  tombstone(title: string, origin: ChangeOrigin): Promise<void>;

  /**
   * HARD-remove a title (delete the record so `get` returns null = ABSENT),
   * distinct from `tombstone`'s kāpae hide. Absent FALLS THROUGH the cascade to
   * a lower bag (vs kāpae, which shadows it). The retract a MOVE/promotion uses
   * on its source so a lower-bag canonical copy surfaces — "tombstone distinct
   * from absent" (residency-model anti-pattern #3). Audit lives in the ledger.
   */
  remove(title: string, origin: ChangeOrigin): Promise<void>;

  /**
   * Subscribe to store changes. Returns an unsubscribe function.
   * Fires for every put() and tombstone() — including remote CRDT changes.
   * Subscribers MUST check change.origin before writing back to avoid echo loops.
   */
  subscribe(fn: (change: LarTiddlerChange) => void): () => void;

  /**
   * Register a typed MemeProjection for coalesced CRDT-aware change delivery.
   *
   * Implementations that wrap a MemeProvider (AutomergeDocStore, CompositeStore)
   * route through the provider's debounce/changeset/onSyncComplete pipeline.
   * Plain stores (MemoryTiddlerStore) may fall back to subscribe().
   *
   * Returns an unsubscribe function.  Optional — stores without MemeProvider
   * support omit this; callers fall back to subscribe() in that case.
   */
  addProjection?(p: MemeProjection): () => void;
}

