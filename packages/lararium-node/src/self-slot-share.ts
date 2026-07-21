/**
 * self-slot-share — the federatable-own vs private-own SPLIT the node sharePolicy enacts per WS peer.
 *
 * The DaemonAuthGate admits an inbound peer; the keyholder worker vouches HOW it relates to this
 * operator's identity (the PeerClass). This pure decision reads that class and routes the doc:
 *   · an IN-PROCESS island peer (no WS socket) — a house member — shares FREELY (empty relay ring).
 *   · a SAME-OPERATOR WS peer — it proved admin@daemon OR a pinned-root device-edge, both UNFORGEABLE —
 *     shares FREELY too (full device sync; the operator's own fleet carries every private plane).
 *   · a CROSS-OPERATOR or UNCLASSIFIED WS peer — a singleton relay ring + the self-slot federation gate.
 *     The CARRY-SPLIT (operator-ruled 2026-07-20) lets the mesh BREATHE across a Nexus here: a cross-operator
 *     the @nexus consult names a MEMBER blind-transits a PROVABLY-SEALED private plane (carry the ciphertext,
 *     never the read-cap); a STRANGER (valid identity, no contract) reaches ONLY the deterministically-
 *     federatable public shelf. The read-lane denial stays absolute — no cross-operator ever decrypts.
 *
 * FAIL-CLOSED: the class the worker could not positively vouch as same-operator arrives here `undefined`
 * and routes to the STRICTER cross-operator branch — the federatable floor crosses only if PROVABLY
 * federatable; the sealed-carry lane opens only for a PROVABLY-member peer over a PROVABLY-sealed plane
 * (absent the @nexus consult or the seal oracle, every cross-operator is treated STRANGER).
 *
 * The SPLIT rides the OUTER deterministic federatable set (DeterministicFederationGate), never the INNER
 * verifyCapability-for-self ring (identity stays null) — sidestepping the allow-all self-grant trap: a
 * cross-operator peer reaches a FIXED public/infra surface, never an over-broad grant of this vessel's own
 * docs. The #59 antigen consult runs AHEAD (a Kapae'd presenter draws Mu even for a federatable plane).
 *
 * Meme: lar:///ha.ka.ba/lararium/node/self-slot-share
 */
import type { DocumentId } from "@automerge/automerge-repo";
import { carryContractShareDecision, memberCarryShareDecision, postureGatesCrossOperator } from "@lararium/mesh";
import type { AntigenRing, FederationGate, FederationPosture, NexusMembership, PeerClass, PlaneSeal } from "@lararium/mesh";

/** A same-operator peer + every in-process island peer ride this empty relay ring → shared freely. */
const NO_RELAY_PEERS: ReadonlySet<string> = new Set<string>();

export interface SelfSlotShareInput {
  /** True for a WS peer (an outside carrier); false for an in-process island peer (a house member). */
  readonly hasWsSocket: boolean;
  /** The class the keyholder vouched at admission; `undefined` → fail-closed to cross-operator. */
  readonly peerClass: PeerClass | undefined;
  /** The federatable-own classifier (a pure function of this Nexus's pubkey). Null before it stands. */
  readonly selfSlotFedGate: FederationGate | null;
  /** The #59 Kapae-antigen ring (consulted AHEAD; a Kapae'd presenter draws Mu). Null denies nobody. */
  readonly antigenRing: AntigenRing | null;
  /** The @nexus membership consult — a cross-operator MEMBER blind-transits a sealed plane. Null → every
   *  cross-operator treated STRANGER (public-read only), fail-closed. */
  readonly membership: NexusMembership | null;
  /** The plane-seal oracle — only a PROVABLY-sealed plane blind-transits. Null → deny-carry, fail-closed. */
  readonly planeSeal: PlaneSeal | null;
  /**
   * The per-Nexus federation POSTURE (read as-of-last-sync off the @nexus charter doc). Governs cross-Nexus
   * carry of the PUBLIC shelf to a FOREIGN (non-member) operator: PRIVATE denies it entirely (only a SAME-Nexus
   * member co-federates); OPEN lets any proof-carrying foreign operator reach the public shelf. It NEVER touches
   * a private plane — those stay sealed by the read-floor + the self-slot denial in BOTH postures.
   *
   * This pure mechanism defaults OPEN when omitted (policy-neutral: the code never bakes the legitimacy answer,
   * mirroring `decideCabalJoin`), AND — because the posture only ever gates the world-public shelf — an omitted
   * default can leak nothing private. The FAIL-CLOSED live default (PRIVATE) is set by the NODE caller
   * (`open-node-vessel` reads the charter doc, defaulting private); every live sharePolicy call supplies it.
   */
  readonly federationPosture?: FederationPosture;
  readonly peerId: string;
  /** The doc under decision; `undefined` (a gated relay peer with no doc id) → deny-by-default. */
  readonly documentId: DocumentId | undefined;
}

/**
 * The per-peer share verdict. A same-operator / in-process peer full-syncs; a cross-operator /
 * unclassified WS peer reaches only the deterministically-federatable planes; a Kapae'd presenter
 * draws Mu regardless. The self-slot INNER capability ring stays inert (identity = null).
 */
export async function selfSlotShareDecision(input: SelfSlotShareInput): Promise<boolean> {
  // Gate a WS peer the worker did NOT positively vouch same-operator (cross-operator OR unclassified).
  const gateThisPeer = input.hasWsSocket && input.peerClass !== "same-operator";
  if (gateThisPeer) {
    // THE POSTURE OUTER GATE (open-beta toggle). Under PRIVATE, a cross-Nexus foreign operator that is NOT a
    // SAME-Nexus member is denied co-federation ENTIRELY — not even the public shelf crosses. Under OPEN, any
    // proof-carrying foreign operator reaches the public shelf (the prior bounded carry). The posture never opens
    // a private plane; it only gates WHO may carry the world-public surface. Defaults OPEN when omitted (the pure
    // mechanism stays policy-neutral + can leak nothing private); the live node caller supplies the fail-closed
    // PRIVATE default it read off the charter doc.
    const posture  = input.federationPosture ?? "open";
    const isMember = input.membership?.isMemberPeer(input.peerId) ?? false;
    if (!postureGatesCrossOperator(posture, isMember)) return false;   // private + non-member → deny all (Mu-shaped false)
    // FAIL-CLOSED at the boot edge: a gated peer whose federatable classifier has not yet stood gets a
    // DenyAllGate floor — the federatable floor reads nothing crossable (`carryContractShareDecision` reads
    // a null fed gate as "same-operator relay → full sync", a DIFFERENT case, so a gated peer MUST never
    // reach it null — that would leak every plane). The carry-split adds the MEMBER blind-transit lane atop
    // that floor: a MEMBER (per the @nexus consult) blind-transits a PROVABLY-SEALED private plane; a
    // STRANGER reaches only the federatable floor; a Kapae'd presenter draws Mu regardless. The self-slot
    // INNER capability ring stays inert (identity = null) — the carry-split rides carriage, never a read-cap.
    const fedGate: FederationGate = input.selfSlotFedGate ?? new DenyAllGate();
    return memberCarryShareDecision(
      new Set<string>([input.peerId]),
      fedGate,
      input.antigenRing,
      null,
      input.membership,
      input.planeSeal,
      input.peerId,
      input.documentId,
    );
  }
  // A same-operator / in-process peer: empty relay ring → shared freely (the antigen still draws Mu).
  return carryContractShareDecision(NO_RELAY_PEERS, null, input.antigenRing, null, input.peerId, input.documentId);
}

/** A federation gate that federates NOTHING — the fail-closed stand-in before selfSlotFedGate arms. */
class DenyAllGate implements FederationGate {
  mayFederate(): boolean { return false; }
}
