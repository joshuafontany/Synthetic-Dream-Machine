/**
 * epoch-lease — the per-resource lease epoch, a coordinator-free MAX-REGISTER.
 *
 * The non-renewal half of revocation (lar:///ha.ka.ba/lares/api/pono/convergent-mesh):
 * a capability grant names a `boundEpoch` (`device-delegation`); the grant goes stale when the
 * resource's lease epoch rolls past it. The epoch is a LEASE, never a targeted revoker — targeted
 * revocation rides the Keyhive membership graph (`orichalcum-capabilities`).
 *
 * Convergence WITHOUT a coordinator: the epoch is a max-register held as **per-writer slots** —
 * one daemon tiddler per writer (`bags/daemon/lease-epoch/{resource}/{writer}`). Each writer owns its
 * slot (last-writer-wins WITHIN a slot is safe — one writer holds it); the effective epoch = max
 * over all slots. Two concurrent rolls both land effective+1 in their own slots, so the max stays
 * effective+1 (the collapse is fine for a liveness lease). A bare scalar would let Automerge's LWW
 * DROP a higher concurrent value — the counter going backward, un-staling a revoked grant — and the
 * per-writer slot-map forbids exactly that: the max never decreases (Kleppmann/p2panda-safe for a
 * lease; targeted revocation does NOT ride this — convergent-mesh#two-revocation-modes).
 */

import { DAEMON_BAG_ID } from "./lar-uris.js";

/** Prefix for a resource's per-writer lease-epoch slots — scan tiddlers under this to read all slots. */
export function leaseEpochPrefix(resourceId: string): string {
  return `${DAEMON_BAG_ID}/lease-epoch/${encodeURIComponent(resourceId)}/`;
}

/** The slot tiddler URI a single writer owns for a resource's lease epoch (LWW-safe — one owner). */
export function leaseEpochSlotUri(resourceId: string, writerId: string): string {
  return `${leaseEpochPrefix(resourceId)}${encodeURIComponent(writerId)}`;
}

/** The effective lease epoch = max over all per-writer slot values; empty or all-invalid → 0. */
export function effectiveLeaseEpoch(slotValues: Iterable<string | null | undefined>): number {
  let max = 0;
  for (const v of slotValues) {
    if (typeof v !== "string") continue;
    const n = Number(v);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max;
}

/** The value a writer writes to its OWN slot to roll the lease forward — effective + 1. */
export function rolledLeaseEpoch(currentEffective: number): number {
  return currentEffective + 1;
}
