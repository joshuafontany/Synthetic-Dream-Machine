/**
 * promotion-ceremony — local-first CRDT promotion receipt law.
 *
 * Promotion is not a Node RPC and not a disk operation. Any lawful vessel may
 * promote by writing target-bag records, tombstoning source-bag records, and
 * emitting a receipt record into the CRDT. Hostful vessels may observe those records
 * and project to disk when their local mirror config says to do so.
 */

import { PROMOTION_RECEIPT_TAG, stableLarUri } from "./lar-uris.js";

export interface PromotionReceiptInput {
  readonly receiptId?: string;
  readonly actor: string;
  readonly sourceBag?: string;
  readonly targetBag: string;
  readonly promoted: readonly string[];
  readonly tombstoned: readonly string[];
  readonly skipped?: readonly string[];
  readonly childrenPromoted?: readonly string[];
  readonly promotedAt?: string;
  readonly vesselId?: string;
  readonly intent?: string;
}

export interface PromotionReceiptFields extends Record<string, string | string[]> {
  title: string;
  tags: string;
  type: string;
  text: string;
}

function shortRandom(): string {
  return Math.random().toString(32).slice(2, 10).padEnd(8, "0");
}

/** Sortable enough for CRDT audit browsing; receipt content, not id, carries authority. */
export function newPromotionReceiptId(now = Date.now()): string {
  return `${now.toString(32).padStart(9, "0")}-${shortRandom()}`;
}

export function promotionReceiptUri(targetBag: string, receiptId: string): string {
  const base = targetBag.startsWith("lar:///") ? targetBag : stableLarUri(targetBag);
  return `${base}/promotion-receipts/${encodeURIComponent(receiptId)}`;
}

export function buildPromotionReceiptFields(input: PromotionReceiptInput): PromotionReceiptFields {
  const promotedAt = input.promotedAt ?? new Date().toISOString();
  const receiptId = input.receiptId ?? newPromotionReceiptId(Date.parse(promotedAt) || Date.now());
  const title = promotionReceiptUri(input.targetBag, receiptId);
  const body = {
    format: "lararium-promotion-receipt/v1",
    receiptId,
    actor: input.actor,
    sourceBag: input.sourceBag ?? "",
    targetBag: input.targetBag,
    promoted: [...input.promoted],
    tombstoned: [...input.tombstoned],
    skipped: [...(input.skipped ?? [])],
    childrenPromoted: [...(input.childrenPromoted ?? [])],
    promotedAt,
    vesselId: input.vesselId ?? "",
    intent: input.intent ?? "promote",
  };

  return {
    title,
    tags: PROMOTION_RECEIPT_TAG,
    type: "application/json",
    text: JSON.stringify(body, null, 2),
    "receipt-id": receiptId,
    actor: input.actor,
    "source-bag": input.sourceBag ?? "",
    "target-bag": input.targetBag,
    promoted: input.promoted.join(" "),
    tombstoned: input.tombstoned.join(" "),
    skipped: (input.skipped ?? []).join(" "),
    "children-promoted": (input.childrenPromoted ?? []).join(" "),
    "promoted-at": promotedAt,
    "vessel-id": input.vesselId ?? "",
    intent: input.intent ?? "promote",
    // Projection is a local vessel side effect. Receipts sync but do not render as markdown files.
    "disk-projection": "no",
  };
}
