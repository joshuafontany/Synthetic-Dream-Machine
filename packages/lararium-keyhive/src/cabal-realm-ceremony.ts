/**
 * cabal-realm-ceremony — the reusable cabal-realm LIFECYCLE TRIO (found / join /
 * evict) over real Keyhive, composed onto the platform-blind mesh FLOOR
 * (@lararium/mesh: cabal-realm.ts + epoch-lease.ts + bag-residency.ts).
 *
 * This GENERALIZES the one-off MeshCabal founding block in
 * ceremony-core.ts (~line 161 — createSentinelDoc(MESH_CABAL_SENTINEL_URI) +
 * addSentinelMember) into a primitive any number of cabal-realms re-enact: a
 * realm is FOUNDED by minting its sentinel Document identity, JOINED by adding a
 * member to that sentinel, EVICTED by convergent-removal. The mesh floor carries
 * the LIVENESS (lease + residency); this carries the AUTHORITY graph (Keyhive).
 *
 * DESIGN CONSTRAINTS:
 *   · DOCUMENT-now, not Group. Keyhive's Group is the semantically-correct vehicle
 *     for a membership cabal, but GroupId has a private constructor in alpha (no
 *     round-trip from stored bytes), so it cannot persist hex-in-tiddler. Document
 *     (public DocumentId ctor) is the working skeleton AND partly architecturally
 *     correct — canon #the-realm names the realm by its content-addressed *doc*
 *     identity. Track the Group subduction for a later cut (provider NOTE ~line 281).
 *   · forward_secrecy STAYS false — a deliberate THREAT-MODEL CHOICE, not an
 *     architectural impossibility (BeeKEM the substrate DOES keep
 *     FS against a passive adversary; the FS is forgone one layer up, at Keyhive's
 *     whole-DOCUMENT-access — a current member reads the whole doc, so per-chunk FS
 *     buys little, and replayable access lets a later-admitted device derive the key.
 *     See keyhive-provider.ts init `false`). This module never touches it (it rides
 *     the provider's init choice).
 *   · membership = the Keyhive DOC-ROSTER — a LIST verified per-member against the
 *     sentinel (dwellersHolding below), NOT the closure-query of canon
 *     #RULED-by-the-closure. The closure ("evaluated as a query, never instantiated")
 *     is a later cut.
 *
 * THIN CEREMONY: this calls the provider + the mesh floor and bakes NO legitimacy.
 * The join routes through cabalRealmJoinGate (INERT — the Ostrom-P1 voucher/capture
 * answer mounts there in a later cut; #the-unswept-corner stays OPEN). The
 * introduction of a member as a known Keyhive agent (receiveContactCard) stays the
 * CALLER's job — mirrors the founding ceremony, whose vessel/PersonaGroup agents are
 * already in-scope before addSentinelMember.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import {
  cabalRealmJoinGate,
  cabalRealmLeaseSlot,
  deriveCabalRealmLiveness,
  projectCabalRealmCharter,
  type CabalRealm,
  type CabalRealmLiveness,
  type BagStowage,
  type CabalRealmPublicMeta,
  type CabalRealmCharter,
} from "@lararium/mesh";
import type { KeyhiveProvider } from "./keyhive-provider.js";

/**
 * Optional founding side-effects — both composed onto cut 1's floor, both inert
 * when omitted (a bare found just mints the sentinel + pairs the substrate):
 *   · residency  — registerCold the substrate (born anu / unfed until the first
 *                  feedCabalRealm warms it — #the-realm DISSOLVED-by-cooling).
 *   · leaseWriterId + leaseSlots — REGISTER this writer's liveness lease slot
 *                  (cabalRealmLeaseSlot) at genesis epoch 0 in the provided
 *                  coordinator-free max-register backing store. In production the
 *                  backing store is a set of @daemon lease-epoch tiddlers; here the
 *                  caller passes a Map so the floor stays storage-blind.
 */
export interface FoundCabalRealmOpts {
  readonly residency?:     BagStowage;
  readonly leaseWriterId?: string;
  readonly leaseSlots?:    Map<string, string>;
}

/**
 * FOUND a cabal-realm — mint its content-addressed sentinel Document identity (the
 * realm's NAME; knowing it grants nothing, #the-realm NAMED-not-ruled), pair it with
 * its Automerge substrate URL + its semantic lar: bearing (genesisUri = uri).
 *
 * Generalizes ceremony-core's MeshCabal founding: same createSentinelDoc, but for
 * an arbitrary realm uri, returned as a mesh-floor CabalRealm ready for join/evict.
 */
export async function foundCabalRealm(
  provider:     KeyhiveProvider,
  uri:          string,
  substrateUrl: string,
  opts:         FoundCabalRealmOpts = {},
): Promise<CabalRealm> {
  const sentinel = await provider.createSentinelDoc(uri);
  const place: CabalRealm = {
    placeDocIdHex:   sentinel.docIdHex,
    placeAgentIdHex: sentinel.agentIdHex,
    substrateUrl,
    genesisUri:      uri,
  };

  // The substrate is born COLD — it warms only when the members feed it.
  if (opts.residency) opts.residency.registerCold(substrateUrl);

  // Register this writer's liveness lease slot at genesis epoch 0 (max-register).
  if (opts.leaseWriterId && opts.leaseSlots) {
    const slot = cabalRealmLeaseSlot(place.placeDocIdHex, opts.leaseWriterId);
    if (!opts.leaseSlots.has(slot)) opts.leaseSlots.set(slot, "0");
  }

  return place;
}

/**
 * A FOUNDED cabal-realm AND its public CHARTER, born together — the realm's
 * sovereign identity (members-only substrate + roster + lease) PLUS its
 * veil-public face (the only projection that ever crosses the read-face wire).
 */
export interface FoundedCabalRealm {
  readonly place:   CabalRealm;
  readonly charter: CabalRealmCharter;
}

/**
 * FOUND a cabal-realm AND its veil-public CHARTER in one act — the founding that
 * gives the realm its public face. Mints the sentinel + substrate + lease
 * (foundCabalRealm, unchanged) and ALSO projects the realm's charter through the
 * pure disclosure shore (mesh/projectCabalRealmCharter): the charter carries
 * ONLY the realm's content-addressed name + bearing + whatever the founder CHOOSES
 * to advertise (`meta` — title / description / foundedAt; an empty meta founds a
 * name-only realm). The members-only substrate + roster NEVER enter the charter —
 * structurally, the shore reads only {realm, meta} (canon #the-veil-public-set).
 *
 * `foundedAt` rides `meta` so the founder stamps the founding MOMENT from its own
 * runtime clock (the ceremony stays a deterministic, clock-free function — a test
 * passes a fixed value, a live founding passes Date.now()). The returned charter is
 * publish-ready: hand it to mesh/cabalRealmCharterExporter to serve it through the
 * existing @oracle read-face. This founds the charter; SERVING it (mounting the
 * read-face) stays the caller's separate act.
 */
export async function foundCabalRealmWithCharter(
  provider:     KeyhiveProvider,
  uri:          string,
  substrateUrl: string,
  meta:         CabalRealmPublicMeta = {},
  opts:         FoundCabalRealmOpts = {},
): Promise<FoundedCabalRealm> {
  const place = await foundCabalRealm(provider, uri, substrateUrl, opts);
  // The shore reads ONLY {realm, meta}; no roster exists yet at founding, and
  // none could cross even if it did (#the-veil — projectCabalRealmCharter proof).
  const charter = projectCabalRealmCharter({ place, meta });
  return { place, charter };
}

/**
 * OPEN a dwelling — grant one party access to the realm's sentinel, which is the SUBSTRATE half of dwelling.
 *
 * WHAT THIS DOES AND DOES NOT DO. It opens the door; it deposits no standing. Dwelling accrues by the acts a
 * party takes once inside (`nohopapa` — the settling that maintaining deposits), and this ceremony holds none
 * of that: no depth, no rank, no roster entry. A party who opens a dwelling and never acts has exactly the
 * standing they arrived with, which is the model behaving correctly rather than a gap in this function.
 *
 * THE GATE STAYS INERT, deliberately. `cabalRealmJoinGate` bakes no legitimacy — a gate that computed it would
 * BECOME the captured object (`cabal-realm#the-unswept-corner`). Whatever conversion rite a realm runs before
 * opening a dwelling stays that realm's own and never reaches this layer (`the-thing-event#unmodelled`).
 *
 * NO CLOSING PAIR EXISTS, and that reads as the design. A party-level eviction was torn out: a realm holds no
 * container to be put out of, so nothing can be evicted FROM one. Dwelling ends when the dwelling stops, and a
 * hostile hand shadows the RELATION (`edge-kapae`) rather than the party. Where captors must be left behind
 * wholesale, a fork excludes BY OMISSION — the survivors open dwellings in a fresh realm and the captors are
 * simply never opened (`fork-realm-ceremony`).
 *
 * The caller introduces the party as a known Keyhive agent (receiveContactCard) first — this ceremony assumes
 * an in-scope agent, mirroring the founding.
 */
export async function openDwelling(
  provider:            KeyhiveProvider,
  place:               CabalRealm,
  dwellerIdentifierHex: string,
): Promise<void> {
  const gated = cabalRealmJoinGate(dwellerIdentifierHex);   // INERT shore — no legitimacy baked
  await provider.addSentinelMember(gated, place.placeDocIdHex);
}

/**
 * CHECK which named candidates hold a dwelling — each verified against the sentinel, those holding access
 * returned. It answers "does this one hold" and NEVER "who holds", which is the distinction the name carries.
 *
 * INVERSION OF CONTROL, and it rides in the signature. The caller supplies the candidates; this reads no
 * membership list because none exists to read. The provider exposes a per-agent access check alone, so a
 * dwelling reads as VERIFIED-ON-ASK, never enumerated — no roster to seize, no list to delete, and no count
 * that could be presented as total. A realm's dwellers are a closure evaluated as a query, never instantiated.
 */
export async function dwellersHolding(
  provider:          KeyhiveProvider,
  place:             CabalRealm,
  candidateDwellerHexes: readonly string[],
): Promise<string[]> {
  const held: string[] = [];
  for (const hex of candidateDwellerHexes) {
    const v = await provider.verifySentinelMembership(hex, place.placeDocIdHex);
    if (v.ok) held.push(hex);
  }
  return held;
}

/**
 * READ the realm's liveness from the residency temperature of its substrate
 * (alive | dissolved — cut 1's deriveCabalRealmLiveness; an unknown/never-fed
 * substrate reads anu → "dissolved").
 */
export function cabalRealmLiveness(
  residency: BagStowage,
  place:     CabalRealm,
): CabalRealmLiveness {
  return deriveCabalRealmLiveness(residency.tier(place.substrateUrl) ?? "anu");
}
