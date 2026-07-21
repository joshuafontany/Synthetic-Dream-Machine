/**
 * self-slot-share — the federatable-own vs private-own SPLIT the node sharePolicy enacts per WS peer.
 *
 * The DaemonAuthGate admits an inbound peer; the keyholder worker vouches HOW it relates to this
 * operator's identity (the PeerClass). This pure decision reads that class and routes the doc:
 *   · an IN-PROCESS island peer (no WS socket) — a house member — shares FREELY (empty relay ring).
 *   · a SAME-OPERATOR WS peer — it proved admin@daemon OR a pinned-root device-edge, both UNFORGEABLE —
 *     shares FREELY too (full device sync; the operator's own fleet carries every private plane).
 *   · a CROSS-OPERATOR or UNCLASSIFIED WS peer — a singleton relay ring + the self-slot federation gate,
 *     so ONLY a deterministically-federatable-own plane crosses; every private-own plane DENIES.
 *
 * FAIL-CLOSED: the class the worker could not positively vouch as same-operator arrives here `undefined`
 * and routes to the STRICTER cross-operator branch — a doc crosses to it only if PROVABLY federatable.
 *
 * The SPLIT rides the OUTER deterministic federatable set (DeterministicFederationGate), never the INNER
 * verifyCapability-for-self ring (identity stays null) — sidestepping the allow-all self-grant trap: a
 * cross-operator peer reaches a FIXED public/infra surface, never an over-broad grant of this vessel's own
 * docs. The #59 antigen consult runs AHEAD (a Kapae'd presenter draws Mu even for a federatable plane).
 *
 * Meme: lar:///ha.ka.ba/lararium/node/self-slot-share
 */
import type { DocumentId } from "@automerge/automerge-repo";
import { carryContractShareDecision } from "@lararium/mesh";
import type { AntigenRing, FederationGate, PeerClass } from "@lararium/mesh";

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
    // FAIL-CLOSED at the boot edge: a gated peer whose federatable classifier has not yet stood gets
    // NOTHING. `federationShareDecision` reads a null fed gate as "same-operator relay → full sync"
    // (a DIFFERENT case), so a gated peer MUST never reach it null — that would leak every plane. But
    // the antigen consult still runs first, so a Kapae'd presenter draws Mu here identically.
    if (!input.selfSlotFedGate) {
      return carryContractShareDecision(new Set<string>([input.peerId]), new DenyAllGate(), input.antigenRing, null, input.peerId, input.documentId);
    }
    return carryContractShareDecision(new Set<string>([input.peerId]), input.selfSlotFedGate, input.antigenRing, null, input.peerId, input.documentId);
  }
  // A same-operator / in-process peer: empty relay ring → shared freely (the antigen still draws Mu).
  return carryContractShareDecision(NO_RELAY_PEERS, null, input.antigenRing, null, input.peerId, input.documentId);
}

/** A federation gate that federates NOTHING — the fail-closed stand-in before selfSlotFedGate arms. */
class DenyAllGate implements FederationGate {
  mayFederate(): boolean { return false; }
}
