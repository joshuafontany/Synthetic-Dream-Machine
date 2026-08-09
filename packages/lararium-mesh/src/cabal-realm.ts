/**
 * cabal-realm — the platform-blind mesh FLOOR for a CabalGroup modeled as a
 * virtual REALM: named-not-ruled (content-addressed), LIVED by its own
 * epoch-lease, DISSOLVED by cooling to anu when the members stop feeding it.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/cabal-realm — "a hearth beside, not a
 * category above." A group never holds you the way a container does (a noun, a
 * membership-list needing a root admitter); it runs as a thing you continuously DO
 * (a verb): members do not BELONG to the cabal, they MAINTAIN it. The relationships
 * define the realm, and it dissolves when they break.
 *
 * THIS MODULE COMPOSES EXISTING PRIMITIVES and mints none of its own:
 *   · epoch-lease.ts      — the realm's OWN liveness lease (coordinator-free
 *                           max-register), keyed by the realm's sentinel DocId.
 *   · bag-residency.ts    — the realm's substrate doc cools to anu when unfed;
 *                           feeding it (touch / hoʻowela) keeps it alive.
 * It builds the shore and NOTHING more. It does NOT call Keyhive, does NOT run
 * the found/join/evict CGKA ceremony, and does NOT bake any legitimacy answer.
 *
 * TWO-EPOCH DISTINCTION (canon #the-tie-break) — do not fuse these:
 *   · THIS lease (epoch-lease)  — LIVENESS. The collective-maintenance
 *                                 heartbeat: rolls forward on churn, heals
 *                                 honest re-key, guards no authority.
 *   · Keyhive CGKA / BeeKEM re-key — the AUTHORITY tie-break (concurrent
 *                                 add-while-remove, remove-wins by
 *                                 blank-on-merge). NOT here — that rides the
 *                                 Keyhive membership graph, which stays gated on
 *                                 the operator's forks. Malice rides Plane-B
 *                                 convergent-removal, also not here.
 *
 * THE UNSWEPT CORNER (canon #the-unswept-corner) — persistence ≠ legitimacy.
 * Soft-state rewards whoever keeps feeding, NOT who legitimately holds the
 * realm; a small hostile faction can out-maintain an apathetic majority. The
 * cure (a quorum-of-vouchers / fork-and-leave) stays the operator's OPEN shore.
 * The join shore below stays INERT by design — it bakes no legitimacy signal.
 *
 * Platform-blind: rides ./epoch-lease + ./bag-residency only. NO node: imports.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { leaseEpochSlotUri } from "./epoch-lease.js";
import type { BagStowage, ResidencyTemperature } from "./bag-residency.js";

/**
 * A cabal-realm — a virtual REALM three primitives co-define:
 *   · a Keyhive SENTINEL identity (the realm's content-addressed name — a
 *     docId/agentId pair; knowing it grants no authority — #the-realm NAMED-not-ruled
 *     — though it does leak metadata via the public pointer).
 *     THIS CUT only TYPES this half — it does not mint or call Keyhive.
 *   · an Automerge SUBSTRATE doc (the shared content that the members maintain
 *     and that COOLS to anu when unfed — the residency-tracked half).
 *   · a semantic lar: LABEL (genesisUri — the realm's bearing in l-space).
 */
export interface CabalRealm {
  /** The realm's Keyhive sentinel DocId, hex — the content-addressed NAME, used
   *  as the lease resourceId. Knowing it grants no authority (#the-realm). */
  readonly realmDocIdHex: string;
  /** The realm's Keyhive sentinel AgentId, hex — the membership-graph anchor a
   *  gated CGKA ceremony will tie to. Inert here. */
  readonly realmAgentIdHex: string;
  /** The Automerge substrate doc URL — the shared content that cools to anu when
   *  the members stop feeding it (the LIVED / DISSOLVED half). */
  readonly substrateUrl: string;
  /** The realm's semantic lar: bearing — its label in l-space (#the-realm). */
  readonly genesisUri: string;
}

/**
 * The realm's LIVENESS lease slot a single writer owns — = the epoch-lease slot
 * keyed by the realm's sentinel DocId as the resourceId. Coordinator-free
 * max-register (effectiveLeaseEpoch = max over slots); the realm's own
 * collective-maintenance heartbeat, NOT an authority epoch (#the-tie-break).
 */
export function cabalRealmLeaseSlot(realmDocIdHex: string, writerId: string): string {
  return leaseEpochSlotUri(realmDocIdHex, writerId);
}

/**
 * The realm's liveness, read FROM the residency temperature of its substrate:
 *   · wela ("hot")  → "alive"      — fed, humming.
 *   · anu  ("cold") → "dissolved"  — cooled, unfed; re-warmable, never deleted
 *                                    (#the-realm DISSOLVED-by-cooling).
 *   · no reading    → "unread"     — THIS vessel has not synced the substrate.
 *
 * ── WHY ABSENCE TAKES ITS OWN STATE ─────────────────────────────────────────
 * Temperature is a fact about a PLACE — whether a bag stands loaded in this vessel's
 * memory. Liveness is a fact about a PRINCIPAL — whether a polity still stands. Reading
 * the second off the first is legitimate only where the vessel HAS a reading; where it
 * has none, "I never fetched it" and "it ended" generate identically under no-global-now,
 * and defaulting the gap to cold answers a question about a polity with a fact about a
 * cache (canon: one-name-one-relation#one-vocabulary-four-axes).
 *
 * So absence rides as its own state rather than as a default, and it names the VESSEL's
 * condition rather than the realm's: `unread` says this replica has not seen it. A caller
 * that must have a verdict decides what to do with that; nothing here decides for them.
 *
 * "cooling" rides the type as the future intermediate, since the residency engine exposes
 * only the two settled states through its public surface (the `warm` middle tier never
 * landed, and the transient `evicting` flag stays private to BagStowage). A higher layer
 * that can observe an in-flight cool may report it.
 */
export type CabalRealmLiveness = "alive" | "cooling" | "dissolved" | "unread";

export function deriveCabalRealmLiveness(temp: ResidencyTemperature | undefined | null): CabalRealmLiveness {
  // Absence arrives as either shape depending on the reader; the point is the absence, never its spelling.
  if (temp === undefined || temp === null) return "unread";
  return temp === "wela" ? "alive" : "dissolved";
}

/** Whether a liveness reading says anything about the REALM at all — `unread` says only that this
 *  vessel has not looked. A caller gating on liveness asks this first, or it treats its own blindness
 *  as the realm's death. */
export function livenessIsAboutTheRealm(l: CabalRealmLiveness): boolean {
  return l !== "unread";
}

/**
 * Feed the realm — member maintenance warms its substrate (touch / hoʻowela),
 * keeping it alive and resetting its cooling clock. This enacts the "commoning" that
 * defines the realm: drop it and the realm cools to anu and dissolves.
 *
 * WHAT member-activity COUNTS as a feed (a post, a sync, a presence pulse, and
 * how it composes with P2 "benefit ∝ maintenance") stays a higher-layer wiring
 * choice (P2/P4, canon #governance) — NOT decided here. This shore only carries
 * the warming through to the residency engine.
 */
export function feedCabalRealm(
  mgr: BagStowage,
  realm: CabalRealm,
): Promise<void> {
  return mgr.touch(realm.substrateUrl);
}

/**
 * The JOIN shore — INERT. A joiner presents an identity; today this passes it
 * THROUGH unchanged and does nothing else.
 *
 * INERT BY DESIGN: the Ostrom-P1 cost-dial / capture-answer (the voucher quorum,
 * fork-and-leave — the legitimacy signal beyond raw maintenance) mounts HERE in
 * elsewhere. That stays the operator's OPEN shore (canon #the-unswept-corner:
 * persistence ≠ legitimacy). Do NOT bake a legitimacy signal into this function
 * — a baked-in answer would close the unswept corner silently and wrong. The
 * actual Keyhive admission ceremony (found/join/evict CGKA) stays gated.
 */
export function cabalRealmJoinGate(joinerIdentityHex: string): string {
  return joinerIdentityHex;
}
