/**
 * plane-seal — the ENCRYPT-FIRST guard on the carry-split: which planes are PROVABLY sealed, so a member
 * relay may blind-transit their bytes and hand the member nothing readable?
 *
 * THE SEAL-STATUS FINDING (surfaced fork, fail-closed). Only a plane whose bytes are CIPHERTEXT (BeeKEM-
 * sealed) or IMMUTABLE (content-addressed CID) may blind-transit — carrying a cleartext plane would leak
 * plaintext and breach the read-lane denial the split MUST keep absolute. TODAY the automerge sync wire
 * carries CLEARTEXT documents: the private planes rest on random-16-byte doc-id obscurity, not per-doc
 * crypto (federation-gate's own HONEST BOUND; the BeeKEM/CGKA read-floor is design-intent, not yet enforced
 * on the sync wire). So NO private plane is provably sealed, and the correct floor is DENY-CARRY of every
 * plane: the member blind-transit lane stands ready but stays INERT until a sealed plane type lands.
 *
 * WHEN a sealed plane type stands — the `@cad` ciphertext-addressed CAS (`cid = BLAKE3(ciphertext)`, verify-
 * cap ⊥ read-cap) or BeeKEM-on-the-sync-wire — register its docIds here (a set / a predicate over the doc's
 * seal marker), and the carry-split blind-transits exactly those. The gate and its fail-closed discipline
 * stay put; only the oracle's affirmative set grows.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#carry-read-contract
 */

import type { DocumentId } from "@automerge/automerge-repo";
import type { PlaneSeal } from "@lararium/mesh";

/**
 * The fail-closed floor: NO plane is provably sealed, so nothing blind-transits (the whole private surface
 * deny-carries to a cross-operator). This is the correct plane-seal oracle while the automerge sync wire
 * carries cleartext — the carry-split's member lane is present and tested, but inert until a sealed plane
 * type registers its docIds through a widened oracle.
 */
export const DENY_ALL_PLANE_SEAL: PlaneSeal = {
  isSealedPlane(_documentId: DocumentId): boolean { return false; },
};

/**
 * Build a plane-seal oracle over an EXPLICIT sealed-plane doc-id set — the shape a future `@cad` / BeeKEM-
 * on-wire plane registers through. Fail-closed by construction: a docId absent from the set reads unsealed
 * (deny-carry). An empty set is exactly `DENY_ALL_PLANE_SEAL`.
 */
export function makeSealedPlaneSet(sealedDocIds: Iterable<DocumentId>): PlaneSeal {
  const sealed = new Set<DocumentId>(sealedDocIds);
  return {
    isSealedPlane(documentId: DocumentId): boolean { return sealed.has(documentId); },
  };
}
