/**
 * cabal-place-ceremony — the reusable cabal-place LIFECYCLE TRIO (found / join /
 * evict) over real Keyhive, composed onto cut 1's platform-blind mesh FLOOR
 * (@lararium/mesh: cabal-place.ts + epoch-lease.ts + bag-residency.ts).
 *
 * Epic 2, cut 2. This GENERALIZES the one-off MeshCabal founding block in
 * ceremony-core.ts (~line 161 — createSentinelDoc(MESH_CABAL_SENTINEL_URI) +
 * addSentinelMember) into a primitive any number of cabal-places re-enact: a
 * place is FOUNDED by minting its sentinel Document identity, JOINED by adding a
 * member to that sentinel, EVICTED by convergent-removal. The mesh floor carries
 * the LIVENESS (lease + residency); this carries the AUTHORITY graph (Keyhive).
 *
 * RESOLVED FORKS (operator-seated):
 *   · DOCUMENT-now, not Group. Keyhive's Group is the semantically-correct vehicle
 *     for a membership cabal, but GroupId has a private constructor in alpha (no
 *     round-trip from stored bytes), so it cannot persist hex-in-tiddler. Document
 *     (public DocumentId ctor) is the working skeleton AND partly architecturally
 *     correct — canon #the-place names the place by its content-addressed *doc*
 *     identity. Track the Group subduction for a later cut (provider NOTE ~line 281).
 *   · forward_secrecy STAYS false — ARCHITECTURAL in Keyhive (whole-system FS is not
 *     provided at any alpha version; canon already holds "the substrate has no FS").
 *     This module never touches it (it rides the provider's init choice).
 *   · membership = the Keyhive DOC-ROSTER — a LIST verified per-member against the
 *     sentinel (cabalPlaceRoster below), NOT the closure-query of canon
 *     #RULED-by-the-closure. The closure ("evaluated as a query, never instantiated")
 *     is a later cut.
 *
 * THIN CEREMONY: this calls the provider + the mesh floor and bakes NO legitimacy.
 * The join routes through cabalPlaceJoinGate (INERT — the Ostrom-P1 voucher/capture
 * answer mounts there in a later cut; #the-unswept-corner stays OPEN). The
 * introduction of a member as a known Keyhive agent (receiveContactCard) stays the
 * CALLER's job — mirrors the founding ceremony, whose vessel/PersonaGroup agents are
 * already in-scope before addSentinelMember.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import {
  cabalPlaceJoinGate,
  cabalPlaceLeaseSlot,
  deriveCabalPlaceLiveness,
  projectCabalPlaceCharter,
  type CabalPlace,
  type CabalPlaceLiveness,
  type BagResidencyManager,
  type CabalPlacePublicMeta,
  type CabalPlaceCharter,
} from "@lararium/mesh";
import type { KeyhiveProvider } from "./keyhive-provider.js";

/**
 * Optional founding side-effects — both composed onto cut 1's floor, both inert
 * when omitted (a bare found just mints the sentinel + pairs the substrate):
 *   · residency  — registerCold the substrate (born anu / unfed until the first
 *                  feedCabalPlace warms it — #the-place DISSOLVED-by-cooling).
 *   · leaseWriterId + leaseSlots — REGISTER this writer's liveness lease slot
 *                  (cabalPlaceLeaseSlot) at genesis epoch 0 in the provided
 *                  coordinator-free max-register backing store. In production the
 *                  backing store is a set of @daemon lease-epoch tiddlers; here the
 *                  caller passes a Map so the floor stays storage-blind.
 */
export interface FoundCabalPlaceOpts {
  readonly residency?:     BagResidencyManager;
  readonly leaseWriterId?: string;
  readonly leaseSlots?:    Map<string, string>;
}

/**
 * FOUND a cabal-place — mint its content-addressed sentinel Document identity (the
 * place's NAME; knowing it grants nothing, #the-place NAMED-not-ruled), pair it with
 * its Automerge substrate URL + its semantic lar: bearing (genesisUri = uri).
 *
 * Generalizes ceremony-core's MeshCabal founding: same createSentinelDoc, but for
 * an arbitrary place uri, returned as a mesh-floor CabalPlace ready for join/evict.
 */
export async function foundCabalPlace(
  provider:     KeyhiveProvider,
  uri:          string,
  substrateUrl: string,
  opts:         FoundCabalPlaceOpts = {},
): Promise<CabalPlace> {
  const sentinel = await provider.createSentinelDoc(uri);
  const place: CabalPlace = {
    placeDocIdHex:   sentinel.docIdHex,
    placeAgentIdHex: sentinel.agentIdHex,
    substrateUrl,
    genesisUri:      uri,
  };

  // The substrate is born COLD — it warms only when the members feed it.
  if (opts.residency) opts.residency.registerCold(substrateUrl);

  // Register this writer's liveness lease slot at genesis epoch 0 (max-register).
  if (opts.leaseWriterId && opts.leaseSlots) {
    const slot = cabalPlaceLeaseSlot(place.placeDocIdHex, opts.leaseWriterId);
    if (!opts.leaseSlots.has(slot)) opts.leaseSlots.set(slot, "0");
  }

  return place;
}

/**
 * A FOUNDED cabal-place AND its public CHARTER, born together — the place's
 * sovereign identity (members-only substrate + roster + lease) PLUS its
 * veil-public face (the only projection that ever crosses the read-face wire).
 */
export interface FoundedCabalPlace {
  readonly place:   CabalPlace;
  readonly charter: CabalPlaceCharter;
}

/**
 * FOUND a cabal-place AND its veil-public CHARTER in one act — the founding that
 * gives the place its public face. Mints the sentinel + substrate + lease
 * (foundCabalPlace, unchanged) and ALSO projects the place's charter through the
 * pure disclosure membrane (mesh/projectCabalPlaceCharter): the charter carries
 * ONLY the place's content-addressed name + bearing + whatever the founder CHOOSES
 * to advertise (`meta` — title / description / foundedAt; an empty meta founds a
 * name-only place). The members-only substrate + roster NEVER enter the charter —
 * structurally, the membrane reads only {place, meta} (canon #the-veil-public-set).
 *
 * `foundedAt` rides `meta` so the founder stamps the founding MOMENT from its own
 * runtime clock (the ceremony stays a deterministic, clock-free function — a test
 * passes a fixed value, a live founding passes Date.now()). The returned charter is
 * publish-ready: hand it to mesh/cabalPlaceCharterExporter to serve it through the
 * existing @oracle read-face. This founds the charter; SERVING it (mounting the
 * read-face) stays the caller's separate act.
 */
export async function foundCabalPlaceWithCharter(
  provider:     KeyhiveProvider,
  uri:          string,
  substrateUrl: string,
  meta:         CabalPlacePublicMeta = {},
  opts:         FoundCabalPlaceOpts = {},
): Promise<FoundedCabalPlace> {
  const place = await foundCabalPlace(provider, uri, substrateUrl, opts);
  // The membrane reads ONLY {place, meta}; no roster exists yet at founding, and
  // none could cross even if it did (#the-veil — projectCabalPlaceCharter proof).
  const charter = projectCabalPlaceCharter({ place, meta });
  return { place, charter };
}

/**
 * JOIN a member to a cabal-place — route the joiner identity through the INERT
 * cabalPlaceJoinGate (pass-through; bakes no legitimacy — #the-unswept-corner), then
 * add it as a member of the place's sentinel Document (the CGKA group-key add / the
 * maintenance edge of canon #verb-not-noun).
 *
 * `memberIdentifierHex` must already be a KNOWN Keyhive agent to `provider` (the
 * caller exchanges contact cards first — receiveContactCard); addSentinelMember's
 * getAgent throws otherwise. Fail-loud: an unknown member never silently no-ops.
 */
export async function joinCabalPlace(
  provider:            KeyhiveProvider,
  place:               CabalPlace,
  memberIdentifierHex: string,
): Promise<void> {
  const gated = cabalPlaceJoinGate(memberIdentifierHex);   // INERT seam — no legitimacy baked
  await provider.addSentinelMember(gated, place.placeDocIdHex);
}

/**
 * EVICT a member from a cabal-place — convergent-removal on the place's sentinel
 * Document (canon #the-tie-break: "malice rides Keyhive convergent-removal, never
 * the counter"). retain_all_other_members=true revokes ONLY this member; the
 * REVOKED tombstone converges across replicas (eventual, per concap).
 *
 * `memberIdentifierHex` = the audience to drop (its known-agent Identifier hex).
 */
export async function evictMember(
  provider:            KeyhiveProvider,
  place:               CabalPlace,
  memberIdentifierHex: string,
): Promise<void> {
  await provider.revokeSentinelMember(memberIdentifierHex, place.placeDocIdHex);
}

/**
 * READ the place's membership = the Keyhive DOC-ROSTER, as a LIST: each candidate
 * verified against the sentinel via accessForDoc, those that hold access returned.
 *
 * NOT the closure-query (canon #RULED-by-the-closure — "evaluated as a query, never
 * instantiated") — that mutual-maintenance-edge closure is a LATER CUT. The provider
 * exposes only a per-agent access check, so membership reads as a verified roster of
 * KNOWN candidates, never an enumerate-all over the graph.
 */
export async function cabalPlaceRoster(
  provider:          KeyhiveProvider,
  place:             CabalPlace,
  candidateMemberHexes: readonly string[],
): Promise<string[]> {
  const held: string[] = [];
  for (const hex of candidateMemberHexes) {
    const v = await provider.verifySentinelMembership(hex, place.placeDocIdHex);
    if (v.ok) held.push(hex);
  }
  return held;
}

/**
 * READ the place's liveness from the residency temperature of its substrate
 * (alive | dissolved — cut 1's deriveCabalPlaceLiveness; an unknown/never-fed
 * substrate reads anu → "dissolved").
 */
export function cabalPlaceLiveness(
  residency: BagResidencyManager,
  place:     CabalPlace,
): CabalPlaceLiveness {
  return deriveCabalPlaceLiveness(residency.tier(place.substrateUrl) ?? "anu");
}
