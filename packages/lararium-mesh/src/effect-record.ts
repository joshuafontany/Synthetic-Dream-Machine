/**
 * effect-record — archival audit-trail layer for the Residency Model.
 *
 * Every ACTION verb (residency-actions.ts) writes one or more indelible
 * EffectRecord tiddlers tagged with the matching archival verb. The records
 * live IN the bags they describe and travel with those bags through CRDT
 * federation. **The artifact may leave; the record of its prior presence
 * here, and of its leaving, never does** — Society of American Archivists
 * professional discipline applied to a CRDT mesh.
 *
 * The dual-surface design from residency-model.md:
 *   - ACTION verbs (lar URIs, ALL CAPS, SPARQL Update derivation) — gesture
 *   - Effect-record annotations (tiddler tags, archival profession derivation) — audit
 *
 * Effect-record URI shape (a bag's indelible residency ledger):
 *   lar:///ha.ka.ba/bags/@<bag>/ledger/residency/<event-id>
 *
 * Each effect record carries a `tags` field including `LARES_EFFECT_RECORD_TAG`,
 * an `archival-verb` field with one of ARCHIVAL_VERBS, and the linking fields
 * that name which ACTION caused it.
 *
 * Meme:    lar:///ha.ka.ba/lararium/api/residency-model
 * Source:  packages/lararium-mesh/src/effect-record.ts
 */

import type { ResidencyAction, ActionVerb } from "./residency-actions.js";
import { stableTagUri } from "./lar-uris.js";
import type { LarTiddlerRecord, LarTiddlerStore, ChangeOrigin } from "./tiddler-store.js";

// ── Archival verb vocabulary ────────────────────────────────────────────────

/**
 * Archival profession verb vocabulary — SAA / IFLA LRM lineage. Each effect
 * record carries exactly one archival verb in its `archival-verb` field.
 *
 *   accession    tiddler entered this bag (audit for ADD / COPY / MOVE-dest / LOAD)
 *   deaccession  tiddler removed from this bag with disposition (CLEAR / DROP / MOVE-source)
 *   transfer     pairing marker — accession+deaccession share a transferId
 *   withdrawal   single replica removed while title persists in union catalog
 *   loan         time-bounded read residency (TTL-pending)
 *   holdings     per-bag manifest snapshot (MARC MFHD analog)
 *   reappraisal  operator-recorded justification preceding a deaccession
 *   disposition  final state of a deaccessioned item (where/when/why)
 */
export const ARCHIVAL_VERBS = [
  "accession",
  "deaccession",
  "transfer",
  "withdrawal",
  "loan",
  "holdings",
  "reappraisal",
  "disposition",
  "creation",
] as const;
export type ArchivalVerb = typeof ARCHIVAL_VERBS[number];

const ARCHIVAL_VERB_SET: ReadonlySet<string> = new Set(ARCHIVAL_VERBS);
export function isArchivalVerb(verb: string): verb is ArchivalVerb {
  return ARCHIVAL_VERB_SET.has(verb);
}

/** Tag carried by every effect-record tiddler in the bag's residency ledger. */
export const LARES_EFFECT_RECORD_TAG = stableTagUri("lares-effect-record");

// ── URI shape ───────────────────────────────────────────────────────────────

/** `lar:///ha.ka.ba/bags/@<bag>/ledger/residency/` — residency-ledger prefix for one bag. */
export function effectLedgerPrefix(bagUri: string): string {
  return `${bagUri}/ledger/residency/`;
}

/** `lar:///ha.ka.ba/bags/@<bag>/ledger/residency/<event-id>` — one effect-record tiddler. */
export function effectRecordUri(bagUri: string, eventId: string): string {
  return `${effectLedgerPrefix(bagUri)}${eventId}`;
}

/** True when a title sits in any bag's or slot's residency ledger. */
export function isEffectRecordUri(title: string): boolean {
  // The `/ledger/residency/<event-id>` TAIL marks an effect record; the prefix
  // that holds the ledger varies — `bags/@<bag>`, `wikis/@<slug>/working`, a bare
  // `@<bag>`. Match on the tail after any holding path, so the projector skips an
  // audit record on every plane (it is audit data, never a carrier surface). A
  // narrower prefix pattern leaks a ledger record held by a per-wiki slot to disk.
  return /^lar:\/\/\/[^/]+\/.+\/ledger\/residency\/[^/]+$/.test(title);
}

// ── EffectRecord shape ─────────────────────────────────────────────────────

/**
 * Parsed archival audit record. Fields use camelCase in TypeScript; the
 * tiddler-field encoding (kebab-case) lives in buildEffectRecordTiddler /
 * parseEffectRecord.
 *
 * One ResidencyAction produces ONE-or-MORE EffectRecords (e.g. MOVE produces
 * two — accession in dest-bag + deaccession in source-bag, paired by transferId).
 */
export interface EffectRecord {
  readonly eventId:       string;
  readonly archivalVerb:  ArchivalVerb;
  /** The ACTION verb that caused this effect. */
  readonly actionVerb:    ActionVerb;
  /** request-id of the originating ResidencyAction. */
  readonly requestId:     string;
  /** Bag URI this effect record describes. The tiddler lives in this bag. */
  readonly bag:           string;
  /** PersonaGroup / operator id from the action's requested-by. */
  readonly actor:         string;
  /** ISO 8601 timestamp. */
  readonly timestamp:     string;
  /** Tiddler-title affected. Absent for bag-level verbs (DROP). */
  readonly tiddlerTitle?: string;
  /** Tiddler-content identity, preserved across transfer (ADD/COPY/MOVE/LOAD). */
  readonly changeId?:     string;
  /** Pairing key for transfer accession+deaccession from a single MOVE. */
  readonly transferId?:   string;
  /** Source bag for transfer pairs. */
  readonly sourceBag?:    string;
  /** Destination bag for transfer pairs. */
  readonly destBag?:      string;
  /** Disposition string for deaccession / disposition records (where it went). */
  readonly disposition?:  string;
  /** Operator-recorded reason / reappraisal justification. */
  readonly reason?:       string;
  /** External source URI for LOAD operations. */
  readonly sourceUri?:    string;
}

// ── Factories ──────────────────────────────────────────────────────────────

/** Mint a fresh event-id. Same base-32 format as request-id / change-id. */
export function newEventId(): string {
  const ms = Date.now().toString(32).padStart(9, "0");
  let rand = "";
  for (let i = 0; i < 8; i++) rand += Math.floor(Math.random() * 32).toString(32);
  return `${ms}-${rand}`;
}

/** Build a LarTiddlerRecord for writing an EffectRecord into a bag. */
export function buildEffectRecordTiddler(effect: EffectRecord): LarTiddlerRecord {
  return {
    tiddler: {
      title:           effectRecordUri(effect.bag, effect.eventId),
      tags:            LARES_EFFECT_RECORD_TAG,
      "event-id":      effect.eventId,
      "archival-verb": effect.archivalVerb,
      "action-verb":   effect.actionVerb,
      "request-id":    effect.requestId,
      bag:             effect.bag,
      actor:           effect.actor,
      timestamp:       effect.timestamp,
      ...(effect.tiddlerTitle !== undefined && { "tiddler-title": effect.tiddlerTitle }),
      ...(effect.changeId    !== undefined && { "change-id":     effect.changeId }),
      ...(effect.transferId  !== undefined && { "transfer-id":   effect.transferId }),
      ...(effect.sourceBag   !== undefined && { "source-bag":    effect.sourceBag }),
      ...(effect.destBag     !== undefined && { "dest-bag":      effect.destBag }),
      ...(effect.disposition !== undefined && { disposition:     effect.disposition }),
      ...(effect.reason      !== undefined && { reason:          effect.reason }),
      ...(effect.sourceUri   !== undefined && { "source-uri":    effect.sourceUri }),
    },
    meta: { authority: "lares-effect-recorder" },
  };
}

/** Parse a flat tiddler field bag into an EffectRecord. Returns null when shape mismatches. */
export function parseEffectRecord(fields: Record<string, unknown>): EffectRecord | null {
  const title = typeof fields["title"] === "string" ? fields["title"] : "";
  if (!isEffectRecordUri(title)) return null;

  const archivalVerb = typeof fields["archival-verb"] === "string" ? fields["archival-verb"] : "";
  if (!isArchivalVerb(archivalVerb)) return null;

  const actionVerb = typeof fields["action-verb"] === "string" ? fields["action-verb"] : "";
  if (!actionVerb) return null;

  const str = (k: string): string | null => {
    const v = fields[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  const eventId   = str("event-id");
  const requestId = str("request-id");
  const bag       = str("bag");
  const actor     = str("actor");
  const timestamp = str("timestamp");
  if (!eventId || !requestId || !bag || !actor || !timestamp) return null;

  const opt = (k: string): { [P in string]?: string } => {
    const v = str(k);
    return v ? { [k]: v } : {};
  };

  return {
    eventId,
    archivalVerb,
    actionVerb: actionVerb as ActionVerb,
    requestId,
    bag,
    actor,
    timestamp,
    ...(str("tiddler-title") && { tiddlerTitle: str("tiddler-title")! }),
    ...(str("change-id")     && { changeId:     str("change-id")! }),
    ...(str("transfer-id")   && { transferId:   str("transfer-id")! }),
    ...(str("source-bag")    && { sourceBag:    str("source-bag")! }),
    ...(str("dest-bag")      && { destBag:      str("dest-bag")! }),
    ...(str("disposition")   && { disposition:  str("disposition")! }),
    ...(str("reason")        && { reason:       str("reason")! }),
    ...(str("source-uri")    && { sourceUri:    str("source-uri")! }),
    // Suppress unused-var hints from opt() helper — pattern kept for clarity.
    ...opt(""),
  };
}

// ── Action → Effects mapping ────────────────────────────────────────────────

interface MapOptions {
  /** Override timestamp (tests). Defaults to new Date().toISOString(). */
  readonly now?: string;
  /** Override event-id factory (tests). Defaults to newEventId(). */
  readonly newId?: () => string;
}

/**
 * Pure mapping: ResidencyAction → ordered list of EffectRecords.
 *
 * Mapping table:
 *
 *   ADD    → 1 effect: accession in to-bag
 *   COPY   → 1 effect: accession in to-bag (carries change-id)
 *   MOVE   → 2 effects: accession in to-bag + deaccession in from-bag,
 *                       paired by shared transferId
 *   CLEAR  → 1 effect: disposition at bag-level (per-tiddler deaccessions
 *                       belong to the handler that walks the bag)
 *   DROP   → 1 effect: disposition at bag-level (bag retired entirely)
 *   LOAD   → 1 effect: accession in to-bag with source-uri
 *
 * Handlers call mapActionToEffects() and write each record into the
 * bag named by its `bag` field. CLEAR's per-tiddler audit fans out at the
 * handler when it knows the bag's tiddler set.
 */
export function mapActionToEffects(action: ResidencyAction, opts?: MapOptions): EffectRecord[] {
  const now = opts?.now ?? new Date().toISOString();
  const newId = opts?.newId ?? newEventId;
  const base = {
    actionVerb: action.verb,
    requestId:  action.requestId,
    actor:      action.requestedBy,
    timestamp:  now,
  };

  switch (action.verb) {
    case "ADD":
      return [{
        ...base,
        eventId:      newId(),
        archivalVerb: "accession",
        bag:          action.toBag,
        tiddlerTitle: action.title,
        changeId:     action.changeId,
        sourceBag:    action.fromBag,
      }];
    case "COPY":
      return [{
        ...base,
        eventId:      newId(),
        archivalVerb: "accession",
        bag:          action.toBag,
        tiddlerTitle: action.title,
        changeId:     action.changeId,
        sourceBag:    action.fromBag,
        reason:       "copy-overwrite",
      }];
    case "MOVE": {
      const transferId = newId();
      return [
        {
          ...base,
          eventId:      newId(),
          archivalVerb: "accession",
          bag:          action.toBag,
          tiddlerTitle: action.title,
          changeId:     action.changeId,
          sourceBag:    action.fromBag,
          destBag:      action.toBag,
          transferId,
        },
        {
          ...base,
          eventId:      newId(),
          archivalVerb: "deaccession",
          bag:          action.fromBag,
          tiddlerTitle: action.title,
          changeId:     action.changeId,
          sourceBag:    action.fromBag,
          destBag:      action.toBag,
          transferId,
          disposition:  `transferred-to:${action.toBag}`,
        },
      ];
    }
    case "CLEAR":
      return [{
        ...base,
        eventId:      newId(),
        archivalVerb: "disposition",
        bag:          action.bag,
        disposition:  "bag-cleared",
        reason:       "operator CLEAR action",
      }];
    case "DROP":
      return [{
        ...base,
        eventId:      newId(),
        archivalVerb: "disposition",
        bag:          action.bag,
        disposition:  "bag-retired",
        reason:       "operator DROP action",
      }];
    case "LOAD":
      return [{
        ...base,
        eventId:      newId(),
        archivalVerb: "accession",
        bag:          action.toBag,
        changeId:     action.changeId,
        sourceUri:    action.sourceUri,
        reason:       "external load",
      }];
    case "INGEST":
      return [{
        ...base,
        eventId:      newId(),
        archivalVerb: "accession",
        bag:          action.toBag,
        changeId:     action.changeId,
        sourceUri:    action.sourceUri,
        reason:       "disk ingest (gated)",
      }];
    case "CREATE":
      return [{
        ...base,
        eventId:      newId(),
        archivalVerb: "creation",
        bag:          action.bag,
        reason:       `bag minted in @${action.plane} plane`,
      }];
  }
}

// ── Writer ──────────────────────────────────────────────────────────────────

/**
 * Resolve the writable store for a bag — the access-reach surface. An effect
 * record "lives within each affected bag" (residency-model#effect-record-surface),
 * so the record for an ADD into bag B lands in B's own ledger, MOVE's paired
 * accession/deaccession each in their own bag. The resolver reaches the bag's
 * doc by access (mounting nothing); a bag with no writable store fails loud.
 */
export type EffectStoreResolver = (bag: string) => Promise<LarTiddlerStore | null>;

/**
 * Write a single EffectRecord into its target bag's residency log.
 *
 * The record rides the affected bag's OWN doc, resolved by access — it federates
 * with the bag, survives bag rotation, and persists in perpetuity (per the SAA
 * "deaccession record never leaves" principle). A bag the resolver cannot reach
 * throws loud (no silent unlink, no misroute to the default writable).
 */
export async function writeEffectRecord(
  resolveStore: EffectStoreResolver,
  effect: EffectRecord,
  origin?: ChangeOrigin,
): Promise<void> {
  const store = await resolveStore(effect.bag);
  if (!store) {
    throw new Error(
      `writeEffectRecord: affected bag "${effect.bag}" unreachable — ` +
      `cannot land the ${effect.archivalVerb} ledger record (no silent unlink).`,
    );
  }
  const record = buildEffectRecordTiddler(effect);
  const o: ChangeOrigin = origin ?? { kind: "lares-verb", requestId: effect.requestId };
  await store.put(record, o);
}

/**
 * Higher-order helper — runs `mutate`, then writes every EffectRecord produced
 * by `mapActionToEffects(action)`. The mutate-then-log order means: if the
 * mutation fails, no effect records get written; if the log writes fail after
 * a successful mutation, the error propagates with the mutation result intact.
 *
 * KNOWN GAP: if `mutate` succeeds and a subsequent
 * record-write fails partway through, the bag carries an inconsistent audit
 * trail. Atomic batching (one Automerge change containing both the residency
 * mutation and the effect-record tiddler) awaits a transactional API on the
 * store — the discipline ships now; the atomicity is still owed.
 *
 * Anti-pattern defense: **no silent unlink.** Every ACTION produces an audit
 * trail; failure during logging surfaces to the operator rather than passing.
 */
export async function withEffectRecord<T>(
  action: ResidencyAction,
  resolveStore: EffectStoreResolver,
  mutate: () => Promise<T>,
  opts?: MapOptions,
): Promise<T> {
  const effects = mapActionToEffects(action, opts);
  const result  = await mutate();
  for (const effect of effects) {
    await writeEffectRecord(resolveStore, effect);
  }
  return result;
}
