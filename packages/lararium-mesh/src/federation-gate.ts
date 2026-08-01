/**
 * FederationGate — the deny-by-default relay-share decision (the V5 socket).
 *
 * A vessel's Automerge `sharePolicy` decides which docs it VOLUNTEERS to a sync
 * peer. In-process island peers (MessageChannel workers) are house members and
 * share freely; a WS *relay* peer (LarWSClientAdapter) reaches the wider Nexus,
 * so the vessel must NOT blanket-share every doc with it — the private planes
 * (@catalog, @personal, @draft, wikis, corpus bags) stay home, only the public
 * federation surface crosses.
 *
 * This gate names that decision behind ONE narrow, deny-by-default shore, shaped
 * deliberately like `IdentitySlot.verifyCapability(docUrl, "read")`: the alpha
 * allow-set fork and the V5 capability-check fork are the SAME gate at two
 * capability resolutions — the deterministic allow-set IS a degenerate cap set.
 * So the V5 `KeyhiveIdentitySlot` swaps in behind this interface with no
 * call-site churn.
 *
 * HONEST BOUND: `sharePolicy` is ADVISORY. This gate closes the ACCIDENTAL leak
 * (the repo stops VOLUNTEERING private docs to the relay), and the private
 * planes' random 16-byte document ids give effective confidentiality against a
 * peer that cannot guess an id. TRUE crypto read-control — denying a *guessed*
 * id and hiding the bytes — is the V5 KeyhiveIdentitySlot / BeeKEM path, out of
 * this shore's scope. This gate IS that shore's alpha socket.
 *
 * SECOND HONEST BOUND — THIS GATE OFFERS NO PROBE RESISTANCE, and nothing here should read as
 * though it did. It decides what a peer may PULL; it never conceals that a lararium answers at
 * all. An adversary that connects and speaks the opening move learns what a passive observer
 * could not — the move a national censor has run for over a decade, at a measured median
 * half-second, from prober addresses too numerous and too short-lived to block.
 *
 * What probe resistance would require, none of which this shore holds: the CLIENT authenticating
 * BEFORE the responder emits a byte (else the responder itself serves as the oracle) · SILENCE on
 * failure rather than a rejection, since a rejection confesses that something understood the
 * question · and a PER-VESSEL gating secret, because a mesh-wide one hands a single infiltrator a
 * universal probe key. That belongs to the transport, not to a share-policy shore — named here so
 * a later reader never mistakes this gate's deny for a mesh that stays unobserved.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/federation-gate
 */
import {
  interpretAsDocumentId,
  type AutomergeUrl,
  type DocumentId,
  type PeerId,
} from "@automerge/automerge-repo";
import { crossroadsDocUrl, whoBoardDocUrl, kapaeAntigenDocUrl, personaKelBoardDocUrl, carriageDocUrl } from "./deterministic-doc.js";
import type { IdentitySlot } from "./identity-slot.js";
import type { PeerClass } from "./island-protocol.js";
import { type CapTierRing, resolveTierForDoc, tierPermitsRelayPeer } from "./cap-tier.js";

/**
 * FederationGate — MAY this document cross to this (relay) peer? DENY-BY-DEFAULT.
 *
 * The vessel only consults the gate for a RELAY peer; in-process peers never
 * reach it (they share freely). The signature mirrors verifyCapability so the V5
 * slot substitutes without touching the sharePolicy call site.
 */
export interface FederationGate {
  mayFederate(documentId: DocumentId, peerId?: PeerId): boolean | Promise<boolean>;
}

/**
 * DeterministicFederationGate — the alpha gate.
 *
 * The federatable surface is the per-Nexus PUBLIC boards, addressed
 * deterministically from the confederation (relay-gate) key: the @crossroads
 * public-plane doc + the WHO board + the Kapae-ANTIGEN board (the immune antigen
 * rides the mandatory-carry plane, carry-contract MANDATORY tier). Automerge-repo
 * does NOT auto-follow doc refs (each doc syncs independently under its own
 * sharePolicy verdict), so these board ids are the WHOLE relay surface — no
 * transitive dep-set to chase and ZERO hand-maintenance (the set is a pure
 * function of the gate key).
 *
 * `extraBoardUrls` admits any further public board a leaf deliberately federates
 * (e.g. a WHERE/mesh board) — passed in by the composing vessel, still
 * deny-by-default for everything absent.
 */
export class DeterministicFederationGate implements FederationGate {
  readonly #federatable: ReadonlySet<DocumentId>;

  constructor(nexusPubkey: string, extraBoardUrls: readonly AutomergeUrl[] = []) {
    const urls: AutomergeUrl[] = [
      crossroadsDocUrl(nexusPubkey),
      whoBoardDocUrl(nexusPubkey),
      kapaeAntigenDocUrl(nexusPubkey),   // the immune antigen (DENY-twin) rides the always-carried plane (MANDATORY tier)
      carriageDocUrl(nexusPubkey),        // the operator members-registry (ALLOW-twin) — quorum-signed contracts, MANDATORY tier
      personaKelBoardDocUrl(nexusPubkey), // the persona-KEL board — PUBLIC identifier→head mapping (federates once)
      ...extraBoardUrls,
    ];
    this.#federatable = new Set(urls.map((u) => interpretAsDocumentId(u) as DocumentId));
  }

  mayFederate(documentId: DocumentId): boolean {
    return this.#federatable.has(documentId);
  }
}

/**
 * federationShareDecision — the relay-ring verdict a vessel's Automerge `sharePolicy`
 * delegates to. Pure (given the ring set + gate), so the vessel's sharePolicy stays a
 * one-liner and the whole decision is unit-testable without booting a vessel.
 *
 *   - an IN-PROCESS peer (not in `relayPeers`) → share freely (house member).
 *   - a relay peer with NO gate (same-operator own node, own DID) → full sovereign sync.
 *   - a gated relay peer with no documentId → DENY (deny-by-default).
 *   - a gated relay peer → only the gate's federatable surface crosses.
 */
export async function federationShareDecision(
  relayPeers: ReadonlySet<string>,
  fedGate:    FederationGate | null,
  peerId:     string,
  documentId?: DocumentId,
): Promise<boolean> {
  if (!relayPeers.has(peerId)) return true;   // in-process island peer — house member
  if (!fedGate)                return true;    // same-operator relay (own node) — full device sync
  if (!documentId)             return false;   // relay ring gated, no doc id → deny-by-default
  return fedGate.mayFederate(documentId, peerId as PeerId);
}

/**
 * IdentityRing — the INNER capability ring the identity slot supplies to a
 * composed sharePolicy. The slot answers "may I (this vessel, presenter = self)
 * sync this doc" against the REAL barrier; `bagUrlForDoc` resolves the Automerge
 * `documentId` the sharePolicy carries back to the registered bag URL the slot's
 * `verifyCapability` speaks. A null return from `bagUrlForDoc` names an
 * unresolvable doc→bag mapping — treated as DENY (a cap cannot be proven for a
 * doc whose bag is unknown), never a silent allow.
 */
export interface IdentityRing {
  readonly slot: IdentitySlot;
  /** Resolve an Automerge documentId → the registered bag URL the slot verifies. */
  bagUrlForDoc(documentId: DocumentId): string | null;
  /** The ability the sharePolicy self-question asks of the barrier (default "read"). */
  readonly ability?: "read" | "edit";
}

/**
 * identityShareDecision — the #58 COMPOSITION: the #49 federation gate (OUTER
 * ring) AND the identity slot's capability barrier (INNER ring), deny-by-default,
 * with AND semantics — a doc crosses to a relay peer only if BOTH rings allow it.
 *
 * The rings compose the same way the node sharePolicy already layers them
 * (per-peer admission OUTSIDE, per-doc caps INSIDE — open-node-vessel.ts:278-282):
 *   - fed gate DENIES         → deny (the private planes never reach the ring).
 *   - no identity ring wired  → the fed gate verdict IS the whole decision (today's
 *                               behavior; the slot socket stays inert until injected).
 *   - in-process island peer  → house member, the slot is NOT consulted (freely shared).
 *   - gated relay, no doc id   → deny-by-default.
 *   - doc→bag unresolvable     → deny (cannot prove a cap for an unknown bag).
 *   - else                    → the slot's verifyCapability against the REAL barrier.
 *
 * ── HONEST BOUND (the #58 wiring gap this fn is the socket for) ──────────────
 * This fn ENFORCES a genuine capability check ONLY where a live `IdentityRing`
 * is passed — i.e. where a slot backed by a REAL provider AND a doc→bag resolver
 * are both in scope at the sharePolicy shore. TODAY neither vessel has that at its
 * main-thread sharePolicy: the live KeyhiveProvider runs INSIDE the daemon-island
 * worker (bootDaemonKeyhive over the worker composite), and the bag↔docId registry
 * lives there too — the founding ceremony DISPOSES its transient provider before
 * returning, and LarVessel (whose `identity` field would carry the slot) is not on
 * the live factory path. So both vessels pass `identity = null` and this degenerates
 * EXACTLY to federationShareDecision (zero behavior change, deny-by-default intact).
 * Making the inner ring LIVE needs the main↔worker cap-verify bridge (the async
 * `daemon:verify-request` shore the node peer-gate already uses) + a docId→bagUrl
 * resolver over the worker's bag registry — a SEPARATE thread. This fn is that
 * shore's tested socket; it never fakes a verdict.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/identity-share-decision
 */
export async function identityShareDecision(
  relayPeers: ReadonlySet<string>,
  fedGate:    FederationGate | null,
  identity:   IdentityRing | null,
  peerId:     string,
  documentId?: DocumentId,
): Promise<boolean> {
  // OUTER ring — the #49 federation gate. Its own deny-by-default holds first.
  const fedAllows = await federationShareDecision(relayPeers, fedGate, peerId, documentId);
  if (!fedAllows)               return false;   // outer ring denies → done (AND semantics)
  if (!identity)                return true;    // no inner ring wired → fed gate is the whole verdict
  if (!relayPeers.has(peerId))  return true;    // in-process island peer — slot not consulted
  if (!documentId)              return false;   // gated relay, no doc id → deny-by-default
  // INNER ring — resolve doc→bag, then ask the REAL barrier "may I sync this doc".
  const bagUrl = identity.bagUrlForDoc(documentId);
  if (!bagUrl)                  return false;   // doc→bag unresolvable → cannot prove a cap → DENY
  return identity.slot.verifyCapability(bagUrl, identity.ability ?? "read");
}

/**
 * AntigenRing — the #59 identity-ring shore the carry-contract enforces: consult the quorum-signed
 * Kapae-antigen and deny a Kapae'd PRESENTER with Mu. This is NOT a second peer-gate (peer-auth lives,
 * live, at the DaemonAuthGate) and it is NOT the self-slot capability ring (that stays inert — see the
 * surfaced fork below). It is a purely ADDITIVE deny path keyed on the PEER, orthogonal to the per-doc
 * cap barrier.
 *
 * `kapaed` is the folded antigen set (kapae-antigen `foldAntigenSet`); `presenterNym` resolves a sync
 * peerId → the presenter's verifying-key nym, or null when the wire cannot yet name the presenter.
 */
export interface AntigenRing {
  /** The currently-Kapae'd nym set — folded from the quorum-signed, always-carried antigen board. */
  readonly kapaed: ReadonlySet<string>;
  /** Resolve a sync peerId → the presenter's ed25519 verifying-key nym, or null when unknown. */
  presenterNym(peerId: string): string | null;
}

/**
 * presenterIsKapaed — does the antigen positively identify this presenter as Kapae'd? PURELY ADDITIVE:
 * a null ring or an UNRESOLVABLE presenter returns false (NOT a deny) — the antigen only DENIES a
 * positively-identified Kapae'd presenter; it never opens a new allow path, and it never fail-closed-denies
 * an unknown peer (deny-by-default for READ already lives at the fed gate + the BeeKEM read-floor). The
 * fail-closed discipline sits UPSTREAM, in the antigen fold: an unverified entry never reaches `kapaed`.
 */
export function presenterIsKapaed(antigen: AntigenRing | null, peerId: string): boolean {
  if (!antigen) return false;
  const nym = antigen.presenterNym(peerId);
  if (nym === null) return false;
  return antigen.kapaed.has(nym);
}

/**
 * carryContractShareDecision — the #59 WIRE: the antigen peer-consult layered AHEAD of the #58
 * composition. A Kapae'd presenter draws the SAME `false` a caught-up peer draws (no doc crosses, no
 * denial announced) — that identical `false` IS the Mu the caller emits as the indistinguishable void
 * (./mu-void): the wire cannot tell nothing-more-permitted from nothing-more-to-extract.
 *
 * The layering is ADDITIVE and self-slot-safe:
 *   1. antigen peer-consult — a Kapae'd presenter → deny (Mu). Adds a deny, never an allow.
 *   2. the existing #58 `identityShareDecision`, UNCHANGED — the inner self-slot ring stays inert
 *      (identity = null on the live path) exactly as today; deny-by-default intact.
 *
 * ── SURFACED FORK (the #59 self-slot question) ──────────────────────────────
 * Lighting the INNER self-slot capability ring fully (identity ≠ null) re-introduces the allow-all
 * regression Ringward found (the self-slot `verifyCapability(bagUrl,"read")` for presenter = self grants
 * the vessel every one of its own docs, so an over-broad self-slot leaks the private planes to the relay).
 * This fn does NOT light that ring — it passes `identity` straight through so the self-slot stays inert —
 * and wires ONLY the antigen-consult that is safe. Making the self-slot inner ring live needs the
 * main↔worker cap-verify bridge (identityShareDecision's own HONEST BOUND) AND a tightened self-slot that
 * distinguishes federatable-own from private-own; kept as the open fork.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#carry-read-contract
 */
export async function carryContractShareDecision(
  relayPeers: ReadonlySet<string>,
  fedGate:    FederationGate | null,
  antigen:    AntigenRing | null,
  identity:   IdentityRing | null,
  peerId:     string,
  documentId?: DocumentId,
): Promise<boolean> {
  // ANTIGEN peer-consult FIRST — a Kapae'd presenter draws Mu (an in-process island peer never reaches a
  // relay antigen; the ring's presenterNym returns null for a house member, so this is a no-op there).
  if (presenterIsKapaed(antigen, peerId)) return false;
  // Then the #58 composition, UNCHANGED. The self-slot inner ring stays inert (see the surfaced fork).
  return identityShareDecision(relayPeers, fedGate, identity, peerId, documentId);
}

/**
 * NexusMembership — the @nexus CONSULT the carry-split gates on: is this cross-operator peer a CONTRACTED
 * Nexus MEMBER, or a mere STRANGER (a valid identity carrying no contract)?
 *
 * The mesh breathes across a Nexus because a MEMBER relay blind-transits sealed ciphertext (carry, never
 * read); a STRANGER reaches ONLY the public shelf (the federatable set). This consult draws that line — and
 * it reads the node's OWN @nexus replica (as of last sync; no global now). It is NOT a peer-auth gate (that
 * lives, live, at the DaemonAuthGate) and NOT a read-cap (the BeeKEM read-floor stays absolute). It answers
 * ONE question: MEMBER or not.
 *
 * FAIL-CLOSED: an unrecognized / unconsultable peer reads `false` (STRANGER) — a node NEVER assumes a peer
 * is Nexus-pono. A null `NexusMembership` treats EVERY cross-operator STRANGER (public-read only), so a
 * boot window before the consult stands, or a Nexus with no members-record, denies all sealed carriage.
 */
export interface NexusMembership {
  /** True ONLY when the peer is provably a contracted Nexus member (fail-closed: unknown/unconsultable → false). */
  holdsCarriagePeer(peerId: string): boolean;
}

/**
 * PlaneSeal — the ENCRYPT-FIRST guard on the carry-split: is this plane PROVABLY sealed (BeeKEM ciphertext)
 * or immutable (content-addressed CID), such that carrying its bytes hands a member NOTHING readable?
 *
 * ONLY a provably-sealed / immutable plane may blind-transit. A cleartext-local plane MUST NEVER cross to a
 * cross-operator — carrying it would leak plaintext, breaching the read-lane denial the split MUST keep
 * absolute. This oracle is the guard on that gap.
 *
 * FAIL-CLOSED: a plane whose seal status the oracle cannot positively affirm reads `false` (deny-carry). A
 * null `PlaneSeal` deny-carries EVERY plane — the correct floor while no sealed plane type stands (today the
 * automerge sync wire carries cleartext, so no private plane is provably sealed; the @cad ciphertext-CAS /
 * BeeKEM-on-wire path is the design-north that will register the first sealed planes here).
 */
export interface PlaneSeal {
  /** True ONLY when the doc's bytes are ciphertext a carrier cannot read (fail-closed: unknown → false → deny-carry). */
  isSealedPlane(documentId: DocumentId): boolean;
}

/**
 * carrierShareDecision — the CARRY-SPLIT that lets the mesh breathe across a Nexus (operator-ruled
 * 2026-07-20). It layers a MEMBER blind-transit lane ATOP the unchanged public floor, so:
 *
 *   1. antigen + the federatable-public FLOOR — `carryContractShareDecision`, VERBATIM. A Kapae'd presenter
 *      draws Mu; the federatable set (@crossroads / WHO / kapae-antigen) crosses to member AND stranger alike;
 *      an in-process house member full-syncs. This is today's behavior, untouched.
 *   2. the MEMBER blind-transit — a plane the floor DENIED (a private-own plane) may STILL cross to a peer the
 *      @nexus consult names a MEMBER, but ONLY when the seal oracle proves it sealed. The member relays the
 *      CIPHERTEXT it can never read; the read-cap (BeeKEM group key) NEVER crosses this shore — sharePolicy
 *      governs WHICH docs sync, never key material, so this adds ZERO decrypt path.
 *
 * THE THREE DENIALS the split holds absolute (each fail-closed):
 *   · Kapae'd → Mu (re-checked after the floor so the split never resurrects a banned presenter).
 *   · STRANGER (or unconsultable peer, or null membership) → public-read only, no sealed carriage.
 *   · cleartext-local plane (or unknown seal, or null seal) → NEVER carried (the encrypt-first invariant).
 *
 * DEGENERATION (the read-lane-untouched proof): with `membership = null` OR `seal = null`, this returns
 * EXACTLY `carryContractShareDecision(...)` — the carry-split adds a lane, it never widens the floor.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#carry-read-contract
 */
export async function carrierShareDecision(
  relayPeers: ReadonlySet<string>,
  fedGate:    FederationGate | null,
  antigen:    AntigenRing | null,
  identity:   IdentityRing | null,
  membership: NexusMembership | null,
  seal:       PlaneSeal | null,
  peerId:     string,
  documentId?: DocumentId,
): Promise<boolean> {
  // 1. The FLOOR, verbatim — antigen-first (Kapae'd → Mu), then the federatable-public set (#58/#59).
  const floor = await carryContractShareDecision(relayPeers, fedGate, antigen, identity, peerId, documentId);
  if (floor) return true;                                   // federatable/public/house already crosses — done
  // 2. The MEMBER blind-transit lane — additive, over a plane the floor DENIED.
  if (!membership || !seal)              return false;      // no consult / no seal oracle → fail-closed (stranger)
  if (presenterIsKapaed(antigen, peerId)) return false;    // a Kapae'd presenter drew Mu at the floor — keep it Mu
  if (!documentId)                       return false;      // deny-by-default
  if (!relayPeers.has(peerId))           return false;      // a house member already crossed at the floor
  if (!membership.holdsCarriagePeer(peerId))  return false;      // STRANGER → public-read only (no sealed carriage)
  if (!seal.isSealedPlane(documentId))   return false;      // cleartext-local plane → NEVER carried (encrypt-first)
  return true;                                             // MEMBER + provably-sealed → blind-transit the ciphertext
}

/** The admission verdict the GATE-WIDENING hands back for a FOREIGN operator identity. */
export interface CrossOperatorAdmission {
  /** True → admit the peer at the bounded federatable-carry tier. */
  readonly ok: boolean;
  /** The self-slot class the sharePolicy reads; present only on an `ok` admission. */
  readonly peerClass?: PeerClass;
  /** The provenance / denial cause (audit; survives the worker→host boundary). */
  readonly reason: string;
}

/**
 * classifyCrossOperatorAdmission — the GATE-WIDENING decision (carry-contract MANDATORY tier).
 *
 * The peer-verify FLOOR runs AHEAD of this (the DaemonAuthGate → verifyPeer chain): a well-formed
 * self-certifying ContactCard establishes the identity, and the V3 proof-of-possession proves the peer
 * HOLDS its key. This fn decides the LAST branch — a valid, proof-carrying identity that holds NEITHER
 * cap=admin@daemon NOR a pinned-root operator device-edge. That peer carries a DIFFERENT operator identity
 * (a cabal-mate / another kahu), so it earns the BOUNDED "cross-operator" class and NOTHING more: the node
 * sharePolicy (selfSlotShareDecision) grants it ONLY the deterministically-federatable public/infra planes
 * (@crossroads / WHO / kapae-antigen), NEVER a private-own plane, NEVER admin. The @crossroads plane reads
 * world-public-plaintext by design (no keyhive read-cap gates it — the safety is the DeterministicFederationGate
 * volunteering ONLY the fixed public set + the BeeKEM read-floor beneath every private plane), so the proven
 * identity IS the admission floor for the mandatory public/infra carriage.
 *
 * FAIL-CLOSED — the tighter bound on the WIDENED (foreign) surface: cross-operator carriage REQUIRES a
 * verified proof-of-possession UNCONDITIONALLY. A caller's `LAR_V3_ALLOW_UNPROVEN` escape hatch relaxes the
 * operator's OWN device fleet (the admin/edge same-operator branches, adjudicated before this fn), never a
 * foreign identity — a foreign presenter that cannot prove key-possession draws a DENY here.
 *
 * The #59 Kapae antigen runs AHEAD of the carriage, at the sharePolicy — a Kapae'd cross-operator draws Mu
 * even for a federatable plane; this fn only classifies, it never overrides the antigen.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#carry-read-contract
 */
export function classifyCrossOperatorAdmission(proofVerified: boolean): CrossOperatorAdmission {
  if (proofVerified) {
    return {
      ok: true,
      peerClass: "cross-operator",
      reason: "admitted at the cross-operator federatable-carry tier (carry-contract MANDATORY)",
    };
  }
  return { ok: false, reason: "cross-operator carriage requires a verified proof-of-possession" };
}

/**
 * FederationPosture — a per-Nexus stance toward FOREIGN operators (cross-Nexus peers), read as-of-last-sync off
 * the @nexus doc. A Nexus develops in ISOLATION until the operator flips it open, so the default is
 * PRIVATE (fail-closed: an absent / unreadable posture reads PRIVATE — see `federationPostureFromDoc`).
 *
 *   · private — the node co-federates with SAME-Nexus operators only (members of THIS charter). A cross-Nexus
 *     peer — a valid, proof-carrying FOREIGN operator that this Nexus never admitted — is denied co-federation
 *     entirely (not even the public shelf crosses to it). The Nexus keeps to itself.
 *   · open    — cross-Nexus peers co-federate the PUBLIC planes: the existing bounded public/infra carry
 *     (@crossroads / WHO / kapae-antigen / members) crosses to any proof-carrying foreign operator.
 *
 * The posture governs the CARRY of the PUBLIC surface to FOREIGN operators. It NEVER opens a private plane: the
 * BeeKEM read-floor + the self-slot's private-plane denial hold absolute in BOTH postures. Open widens WHO may
 * carry the public shelf; it never widens WHAT crosses.
 */
export type FederationPosture = "private" | "open";

/** The fail-closed default — a Nexus develops in isolation until the operator opens it. */
export const DEFAULT_FEDERATION_POSTURE: FederationPosture = "private";

/**
 * The OUTER posture gate over a cross-operator admission: MAY a proof-carrying foreign operator co-federate the
 * public shelf, given this Nexus's posture and whether that operator is a contracted member of THIS charter?
 *
 *   · open    → yes (any proof-carrying foreign operator co-federates the public shelf; membership is irrelevant
 *               to the public tier — a stranger still reaches ONLY the federatable set, never a private plane).
 *   · private → yes ONLY when the operator is a SAME-Nexus MEMBER; a non-member cross-Nexus peer → NO.
 *
 * Fail-closed direction: private + non-member denies. The posture reads PRIVATE by default, so an unconfigured
 * Nexus denies every foreign operator until the operator both opens it AND (for the sealed lane) contracts them.
 */
export function postureGatesCrossOperator(posture: FederationPosture, isNexusMember: boolean): boolean {
  if (posture === "open") return true;
  return isNexusMember;   // private: same-Nexus members only
}

/**
 * admitCrossOperatorUnderPosture — COMPOSE the posture (outer) with `classifyCrossOperatorAdmission` (inner). The
 * classify FLOOR still requires a verified proof-of-possession (a foreign presenter that cannot prove key-possession
 * draws a DENY, unconditionally). The posture then gates whether that proven foreign operator co-federates at all:
 * under PRIVATE it must also be a SAME-Nexus member; under OPEN the classify verdict passes straight through.
 *
 * A denial names its cause for audit. NEVER opens a private plane — an `ok` verdict still earns ONLY the bounded
 * cross-operator federatable-carry tier the classifier grants; the read-floor and the self-slot denial are untouched.
 */
export function admitCrossOperatorUnderPosture(args: {
  readonly proofVerified: boolean;
  readonly posture:       FederationPosture;
  readonly isNexusMember: boolean;
}): CrossOperatorAdmission {
  const floor = classifyCrossOperatorAdmission(args.proofVerified);
  if (!floor.ok) return floor;   // no proven possession → deny (fail-closed), regardless of posture
  if (postureGatesCrossOperator(args.posture, args.isNexusMember)) {
    return { ...floor, reason: `${floor.reason} · posture=${args.posture}` };
  }
  return {
    ok: false,
    reason: `posture=private denies a cross-Nexus (non-member) foreign operator co-federation`,
  };
}

/**
 * capTierShareDecision — the DECLARED-TIER TIGHTENING layered ATOP `carrierShareDecision`. The bag's
 * self-describing cap-tier (cap-tier.ts) refines WHO holds the read-cap, and it may only ever TIGHTEN the
 * structural verdict — never loosen it. So this fn wraps the whole carry-split and ANDs a pure tier
 * predicate over its `true`:
 *
 *   1. the STRUCTURAL floor — `carrierShareDecision`, VERBATIM. Its deny stands ABSOLUTE: a tier can
 *      never resurrect a doc the structure denied (the keystone runs one direction only). If the base says
 *      `false`, this says `false`.
 *   2. the DECLARED-TIER tighten — over a doc the base ALLOWED to a RELAY peer, the bag's resolved tier
 *      (`resolveTier(declared ∧ structuralFloor)`) may still WITHDRAW it: a bag structurally-PUBLIC that
 *      DECLARES itself PERSONAGROUP drops out of a stranger's crossing; a bag resolving to VEIL crosses to
 *      no relay peer at all. `tierPermitsRelayPeer` reads the resolved tier against the peer's membership.
 *
 * ── THE SAFETY KEYSTONE (proven in cap-tier.test) ────────────────────────────────────────────────
 * Because `resolveTierForDoc` returns a tier ≤ the STRUCTURAL floor, and the base verdict already encodes
 * that floor, this layer can only ADD a deny — it is mechanically impossible for a declared datum to grant
 * a doc MORE openness than `carrierShareDecision` already permits. A bag that DECLARES itself PUBLIC but
 * whose structural floor is PERSONAGROUP resolves to PERSONAGROUP and never reaches a stranger.
 *
 * DEGENERATION (the read-lane-untouched proof): with `capTiers = null`, this returns EXACTLY
 * `carrierShareDecision(...)` — the tier layer adds tightening, it never widens the floor, and it stays
 * INERT until a bag actually carries the datum.
 *
 * ── HONEST BOUND (the not-yet-wired shore) ────────────────────────────────────────────────────────
 * The `CapTierRing`'s `floor` oracle IS wired on the live path (it reads the SAME federatable-set + seal
 * oracles the carry-split consults — see cap-tier.ts `structuralFloorFor`). The `declared` source is the
 * SHORE not yet lit: no @daemon recipe / BagTiddler carries a `capTier` datum in the tree TODAY, so a live
 * `declaredTierForDoc` returns null for every doc → the floor governs → zero behavior change. Lighting it
 * needs the recipe surface to seat the datum + a doc→bag resolver over the bag registry (the same bridge
 * `identityShareDecision`'s bound names). This fn is that shore's tested socket; it never fakes a verdict.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/cap-tier
 */
export async function capTierShareDecision(
  relayPeers: ReadonlySet<string>,
  fedGate:    FederationGate | null,
  antigen:    AntigenRing | null,
  identity:   IdentityRing | null,
  membership: NexusMembership | null,
  seal:       PlaneSeal | null,
  capTiers:   CapTierRing | null,
  peerId:     string,
  documentId?: DocumentId,
): Promise<boolean> {
  // 1. The STRUCTURAL floor, verbatim. Its deny is absolute — a tier never loosens it.
  const base = await carrierShareDecision(relayPeers, fedGate, antigen, identity, membership, seal, peerId, documentId);
  if (!base)                    return false;   // structural deny stands (tier tightens only, never loosens)
  if (!capTiers)                return true;    // no declared-tier ring → the base verdict is whole (inert shore)
  if (!relayPeers.has(peerId))  return true;    // in-process house member — tier not consulted (full sync)
  if (!documentId)              return true;    // base allowed a no-doc case (house member) — nothing to tighten
  // 2. The DECLARED-TIER tighten — resolve declared ∧ structuralFloor, then AND the pure peer predicate.
  const resolved = resolveTierForDoc(capTiers, documentId);
  const holdsCarriage = membership ? membership.holdsCarriagePeer(peerId) : false;
  return tierPermitsRelayPeer(resolved, holdsCarriage);   // can only DENY where the base said allow
}
