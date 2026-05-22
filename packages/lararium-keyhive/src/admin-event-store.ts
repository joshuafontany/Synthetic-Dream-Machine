/**
 * AdminEventStore — persist Keyhive events as tiddlers in the admin Automerge doc.
 *
 * Implements the EventStore interface against a CompositeStore writable layer
 * (the admin VM's composite). Each Keyhive event becomes one tiddler:
 *
 *   title:    lar:///ha.ka.ba/@lararium/@admin/cap/<eventHash>
 *   tag:      $:/tags/CapEvent (sub-tags by variant: .../Prekey, .../Cgka,
 *             .../Delegation, .../Revocation)
 *   fields:   variant, hash, bytes-len, is-delegated, is-revoked
 *   text:     base64-encoded `event.toBytes()` payload
 *
 * Scope (D.4 minimum-viable). All events route to the admin doc, regardless
 * of their semantic scope (operator-principal vs document vs group-CGKA).
 * The admin doc is operator-private, which keeps routing simple and leaks no
 * metadata. Per-bag routing per the D4.a decision in HANDOFF.md remains a
 * known future refinement; this store will fan out across multiple writable
 * layers when that lands.
 *
 * Hash: a content hash of `event.toBytes()` keyed via sha256. Used as the
 * tiddler title suffix and as a stable de-dup key — the same event ingested
 * twice produces the same tiddler title.
 */

import {
  ADMIN_BAG_ID, type CompositeStore,
} from "@lararium/mesh";
import { type ChangeOrigin, type LarTiddlerRecord, toLarTiddlerRecord } from "@lararium/mesh";
import type { EventStore, EventRecord } from "./event-store.js";

const CAP_EVENT_TAG_BASE = "$:/tags/CapEvent";

/** Map a Keyhive event variant to its sub-tag — empty when the variant is
 *  unknown to us; the base tag still applies for filter-all queries. */
function subTagFor(variant: string): string | null {
  switch (variant) {
    case "PREKEY_ROTATED":  return `${CAP_EVENT_TAG_BASE}/Prekey`;
    case "CGKA_OPERATION":  return `${CAP_EVENT_TAG_BASE}/Cgka`;
    case "DELEGATED":       return `${CAP_EVENT_TAG_BASE}/Delegation`;
    case "REVOKED":         return `${CAP_EVENT_TAG_BASE}/Revocation`;
    default:                return null;
  }
}

/** Title for a cap-event tiddler under the admin doc. */
export function capEventTitle(hash: string): string {
  return `${ADMIN_BAG_ID}/cap/${hash}`;
}

/** Base64-encode bytes for tiddler `text` storage (tiddler.text is string). */
function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/** Compute a stable hash for an event payload. SHA-256, hex-encoded. */
async function hashBytes(bytes: Uint8Array): Promise<string> {
  // .slice() copies into a fresh ArrayBuffer-backed Uint8Array — avoids the
  // SharedArrayBuffer-vs-ArrayBuffer typing conflict crypto.subtle.digest
  // imposes in strict mode.
  const buf = await crypto.subtle.digest("SHA-256", bytes.slice());
  const arr = new Uint8Array(buf);
  let s = "";
  for (const b of arr) s += b.toString(16).padStart(2, "0");
  return s;
}

export interface AdminEventStoreOptions {
  /** Composite store with the admin bag as its writable layer. */
  readonly admin: CompositeStore;
}

export class AdminEventStore implements EventStore {
  constructor(private readonly opts: AdminEventStoreOptions) {}

  async put(rec: EventRecord): Promise<void> {
    const hash    = rec.hash || (await hashBytes(rec.bytes));
    const title   = capEventTitle(hash);
    // Skip de-dup: composite.get is cheap; avoid re-writing identical events.
    const existing = await this.opts.admin.get(title);
    if (existing && existing.meta?.deleted !== true) return;

    const subTag = subTagFor(rec.variant);
    const tags   = subTag ? `${CAP_EVENT_TAG_BASE} ${subTag}` : CAP_EVENT_TAG_BASE;

    const record: LarTiddlerRecord = toLarTiddlerRecord(
      {
        title,
        text: bytesToBase64(rec.bytes),
        tags,
        variant:    rec.variant,
        hash,
        "bytes-len": String(rec.bytes.length),
      },
      { authority: "lares-keyhive" },
    );
    const origin: ChangeOrigin = { kind: "lares-job", requestId: `cap-event-${hash.slice(0, 8)}` };
    await this.opts.admin.put(record, origin, { bag: ADMIN_BAG_ID });
  }

  async list(): Promise<readonly EventRecord[]> {
    const out: EventRecord[] = [];
    const titles = await this.opts.admin.listVisible();
    for (const title of titles) {
      if (!title.startsWith(`${ADMIN_BAG_ID}/cap/`)) continue;
      const rec = await this.opts.admin.get(title);
      if (!rec || rec.meta?.deleted) continue;
      const fields = rec.tiddler as Record<string, string>;
      const variant = fields["variant"];
      const hash    = fields["hash"];
      const text    = rec.tiddler.text;
      if (!variant || !hash || !text) continue;
      try {
        out.push({ hash, variant, bytes: base64ToBytes(text) });
      } catch {
        // Malformed payload — skip; log via console for operator visibility.
        console.warn(`[admin-event-store] skipped malformed cap event ${title}`);
      }
    }
    return out;
  }
}
