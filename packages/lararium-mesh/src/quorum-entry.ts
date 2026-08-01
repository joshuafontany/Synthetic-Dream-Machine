/**
 * quorum-entry — the ONE canonical byte-image every quorum-signed steward entry signs over.
 *
 * THE SUBTRACTION. The Kapae antigen (`kapae-antigen.ts`) and the members set (`membership-registry.ts`) stand the
 * SAME structure: a monotone per-nym CRDT of quorum-signed steward acts. Their signed bytes carry the identical five
 * fields in the identical order — only the `kind` DOMAIN separates them. This module holds that common image once, so
 * the two boards can never drift a field apart while both claiming a quorum verified them.
 *
 * THE DOMAIN STAYS FIRST AND STAYS REQUIRED. `kind` rides as the first canonical field and every caller supplies its
 * own domain constant — that value IS the cross-board separation. An antigen signature and a membership signature
 * cover different bytes because they cover different domains, so no signature raised on one board can ever be
 * re-presented on the other. A shared image with an optional or defaulted domain would dissolve exactly that
 * guarantee; this signature keeps it un-defaultable.
 *
 * WHAT THIS MODULE REFUSES. It carries the BYTES ONLY — never a verdict. The two boards gate differently on purpose:
 * the members set additionally requires the operator's OWN accepts-carriage contract token (`carriageContractBytes`),
 * and the antigen requires no such consent. A shared verifier that forgot that token would turn admission into
 * conscription. The fold and the quorum verdicts stay board-local, deliberately.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/quorum-entry
 */

import { canonicalJsonBytes } from "./crypto.js";

/** The steward act every quorum board carries — the shape shared beneath the antigen's and the members set's acts. */
export interface QuorumEntryFields {
  /** The signing DOMAIN — the board's own constant. Required: it alone separates one board's signatures from another's. */
  readonly kind:            string;
  /** The subject's ed25519 verifying-key hex — an identity, never a doc. */
  readonly nym:             string;
  /** The board-local act (`kapae`/`un_kapae`, `admit`/`revoke`). Monotone per nym by `version`. */
  readonly action:          string;
  /** The monotone per-nym version — a higher verified version supersedes a lower. */
  readonly version:         number;
  /** The charter epoch this act roots on — an entry citing an unknown epoch is IGNORED. */
  readonly sealEpochCid: string;
}

/**
 * The canonical bytes a quorum signs over — everything but the signatures, which ride OUTSIDE the signed content so
 * re-carrying an entry never re-signs it. Sorted-key stable via `canonicalJsonBytes`.
 */
export function quorumEntryBytes(fields: QuorumEntryFields): Uint8Array {
  return canonicalJsonBytes({
    kind:            fields.kind,
    nym:             fields.nym,
    action:          fields.action,
    version:         fields.version,
    sealEpochCid: fields.sealEpochCid,
  });
}
