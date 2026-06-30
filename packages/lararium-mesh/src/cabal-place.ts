/**
 * cabal-place — the platform-blind mesh FLOOR for a CabalGroup modeled as a
 * virtual PLACE: named-not-ruled (content-addressed), LIVED by its own
 * epoch-lease, DISSOLVED by cooling to anu when the members stop feeding it.
 *
 * Canon: lar:///ha.ka.ba/@lares/api/pono/cabal-place — "a hearth beside, not a
 * category above." A group is not a container you are IN (a noun, a
 * membership-list needing a root admitter) but a thing you continuously DO (a
 * verb): members do not BELONG to the cabal, they MAINTAIN it. The place is
 * defined by the relationships and dissolves if they break.
 *
 * THIS CUT (Epic 2, cut 1) — PURE COMPOSITION of the EXISTING primitives only:
 *   · epoch-lease.ts      — the place's OWN liveness lease (coordinator-free
 *                           max-register), keyed by the place's sentinel DocId.
 *   · bag-residency.ts    — the place's substrate doc cools to anu when unfed;
 *                           feeding it (touch / hoʻowela) keeps it alive.
 * It builds the seam and NOTHING more. It does NOT call Keyhive, does NOT run
 * the found/join/evict CGKA ceremony, and does NOT bake any legitimacy answer.
 *
 * TWO-EPOCH DISTINCTION (canon #the-tie-break) — do not fuse these:
 *   · THIS lease (epoch-lease)  — LIVENESS. The collective-maintenance
 *                                 heartbeat: rolls forward on churn, heals
 *                                 honest re-key, guards no authority.
 *   · Keyhive CGKA / BeeKEM re-key — the AUTHORITY tie-break (concurrent
 *                                 add-while-remove, remove-wins by
 *                                 blank-on-merge). NOT here — that rides the
 *                                 Keyhive membership graph, cut 2 (gated on the
 *                                 operator's forks). Malice rides Plane-B
 *                                 convergent-removal, also not here.
 *
 * THE UNSWEPT CORNER (canon #the-unswept-corner) — persistence ≠ legitimacy.
 * Soft-state rewards whoever keeps feeding, NOT who legitimately holds the
 * place; a small hostile faction can out-maintain an apathetic majority. The
 * cure (a quorum-of-vouchers / fork-and-leave) stays the operator's OPEN seam.
 * The join seam below is INERT by design — it bakes no legitimacy signal.
 *
 * Platform-blind: rides ./epoch-lease + ./bag-residency only. NO node: imports.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import { leaseEpochSlotUri } from "./epoch-lease.js";
import type { BagResidencyManager, ResidencyTemperature } from "./bag-residency.js";

/**
 * A cabal-place — a virtual PLACE three primitives co-define:
 *   · a Keyhive SENTINEL identity (the place's content-addressed name — a
 *     docId/agentId pair; knowing it grants no authority — #the-place NAMED-not-ruled
 *     — though it does leak metadata via the public pointer, crucible-corrected).
 *     THIS CUT only TYPES this half — it does not mint or call Keyhive.
 *   · an Automerge SUBSTRATE doc (the shared content that the members maintain
 *     and that COOLS to anu when unfed — the residency-tracked half).
 *   · a semantic lar: LABEL (genesisUri — the place's bearing in l-space).
 */
export interface CabalPlace {
  /** The place's Keyhive sentinel DocId, hex — the content-addressed NAME, used
   *  as the lease resourceId. Knowing it grants no authority (#the-place). */
  readonly placeDocIdHex: string;
  /** The place's Keyhive sentinel AgentId, hex — the membership-graph anchor a
   *  later cut (cut 2, gated) ties the CGKA ceremony to. Inert here. */
  readonly placeAgentIdHex: string;
  /** The Automerge substrate doc URL — the shared content that cools to anu when
   *  the members stop feeding it (the LIVED / DISSOLVED half). */
  readonly substrateUrl: string;
  /** The place's semantic lar: bearing — its label in l-space (#the-place). */
  readonly genesisUri: string;
}

/**
 * The place's LIVENESS lease slot a single writer owns — = the epoch-lease slot
 * keyed by the place's sentinel DocId as the resourceId. Coordinator-free
 * max-register (effectiveLeaseEpoch = max over slots); the place's own
 * collective-maintenance heartbeat, NOT an authority epoch (#the-tie-break).
 */
export function cabalPlaceLeaseSlot(placeDocIdHex: string, writerId: string): string {
  return leaseEpochSlotUri(placeDocIdHex, writerId);
}

/**
 * The place's liveness, read FROM the residency temperature of its substrate:
 *   · wela ("hot")  → "alive"      — fed, humming.
 *   · anu  ("cold") → "dissolved"  — cooled, unfed; re-warmable, never deleted
 *                                    (#the-place DISSOLVED-by-cooling).
 *
 * "cooling" rides the type as the future intermediate, but the residency engine
 * exposes only the two settled states through its public surface (the `warm`
 * middle tier was CUT in the 2026-06-01 YIN pass, and the transient `evicting`
 * flag stays private to BagResidencyManager). So this pure function maps the two
 * derivable states only; a higher layer that can observe an in-flight cool may
 * report "cooling" itself. Keeping it a pure total function of the public tier.
 */
export type CabalPlaceLiveness = "alive" | "cooling" | "dissolved";

export function deriveCabalPlaceLiveness(temp: ResidencyTemperature): CabalPlaceLiveness {
  return temp === "wela" ? "alive" : "dissolved";
}

/**
 * Feed the place — member maintenance warms its substrate (touch / hoʻowela),
 * keeping it alive and resetting its cooling clock. This is the "commoning" that
 * defines the place: drop it and the place cools to anu and dissolves.
 *
 * WHAT member-activity COUNTS as a feed (a post, a sync, a presence pulse, and
 * how it composes with P2 "benefit ∝ maintenance") stays a higher-layer wiring
 * choice (P2/P4, canon #governance) — NOT decided here. This seam only carries
 * the warming through to the residency engine.
 */
export function feedCabalPlace(
  mgr: BagResidencyManager,
  place: CabalPlace,
): Promise<void> {
  return mgr.touch(place.substrateUrl);
}

/**
 * The JOIN seam — INERT. A joiner presents an identity; today this passes it
 * THROUGH unchanged and does nothing else.
 *
 * INERT BY DESIGN: the Ostrom-P1 cost-dial / capture-answer (the voucher quorum,
 * fork-and-leave — the legitimacy signal beyond raw maintenance) mounts HERE in
 * a later cut. That is the operator's OPEN seam (canon #the-unswept-corner:
 * persistence ≠ legitimacy). Do NOT bake a legitimacy signal into this function
 * — a baked-in answer would close the unswept corner silently and wrong. The
 * actual Keyhive admission ceremony (found/join/evict CGKA) is cut 2, gated.
 */
export function cabalPlaceJoinGate(joinerIdentityHex: string): string {
  return joinerIdentityHex;
}
