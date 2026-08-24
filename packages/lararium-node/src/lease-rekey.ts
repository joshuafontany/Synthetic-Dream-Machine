/**
 * lease-rekey — roll a resource's LEASE EPOCH forward on the live daemon board, per-writer-slot safe.
 *
 * The NON-RENEWAL half of revocation (lar:///ha.ka.ba/lares/api/pono/convergent-mesh): a grant names a
 * `boundEpoch`; the grant goes cold the moment the resource's lease epoch rolls past it. Rolling the epoch
 * is how a Herm STALES every outstanding grant on a resource at once — the immune keel's RE-KEY tooth at the
 * Herm's own tier. Targeted key-MATERIAL rotation rides keyhive CGKA (`orichalcum-capabilities`), NEVER this
 * lease — the lease stales, it never re-derives a secret.
 *
 * WHY A PER-WRITER SLOT, NEVER A BARE SCALAR. The epoch rides a MAX-REGISTER held as per-writer slots
 * (`epoch-lease`): each writer owns exactly one tiddler (`@daemon/lease-epoch/{resource}/{writer}`), so
 * last-writer-wins WITHIN a slot stays safe (one owner holds it). The effective epoch = max over every slot.
 * Two hearths rolling the SAME resource concurrently each land effective+1 in their OWN slot, so on merge the
 * max only ever climbs. A bare shared scalar would let Automerge's LWW DROP a higher concurrent value — the
 * counter walking backward, un-staling a grant a roll had already cut. The slot-map forbids exactly that.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/lease-rekey
 */

import type { DocHandle } from "@automerge/automerge-repo";
import {
  mutableLarRecord, tiddlerText,
  leaseEpochPrefix, leaseEpochSlotUri, effectiveLeaseEpoch, rolledLeaseEpoch,
  type LarDoc,
} from "@lararium/mesh";

/** The outcome of one rekey roll — the effective epoch read, the epoch written, and the slot it landed in. */
export interface LeaseRekeyResult {
  /** The resource whose lease rolled. */
  readonly resource: string;
  /** The writer whose OWN slot took the roll (the caller's nym). */
  readonly writer:   string;
  /** The effective (max-over-slots) epoch read BEFORE the roll. */
  readonly effective: number;
  /** The epoch written into the writer's own slot — always effective + 1. */
  readonly rolled:    number;
  /** The tiddler URI of the writer's own slot. */
  readonly slot:      string;
}

/**
 * Roll a resource's lease epoch forward on a live board handle, writing ONLY the caller's own per-writer slot.
 * Reads every slot under the resource's prefix → the effective (max) epoch → writes effective+1 to this
 * writer's slot. A live board write: the roll rides WS-sync to every replica. The max never decreases — a
 * concurrent roll on another hearth lands in ITS own slot, so both survive the merge and the max climbs.
 */
export function rollLeaseEpochOnBoard(
  handle:   DocHandle<LarDoc>,
  resource: string,
  writerId: string,
): LeaseRekeyResult {
  const prefix = leaseEpochPrefix(resource);
  const tids   = handle.doc()?.tiddlers ?? {};
  // Read every per-writer slot under the resource prefix (a foreign resource's slot never matches the prefix).
  const slotValues: (string | null | undefined)[] = [];
  for (const key of Object.keys(tids)) {
    if (key.startsWith(prefix)) slotValues.push(tiddlerText(tids[key]));
  }
  const effective = effectiveLeaseEpoch(slotValues);
  const rolled    = rolledLeaseEpoch(effective);
  const slot      = leaseEpochSlotUri(resource, writerId);
  handle.change((doc) => {
    doc.tiddlers[slot] = mutableLarRecord(slot, { text: String(rolled) }, "lease-roll");
  });
  return { resource, writer: writerId, effective, rolled, slot };
}
