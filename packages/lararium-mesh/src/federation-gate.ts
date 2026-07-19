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
 * This gate names that decision behind ONE narrow, deny-by-default seam, shaped
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
 * this seam's scope. This gate IS that seam's alpha socket.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/federation-gate
 */
import {
  interpretAsDocumentId,
  type AutomergeUrl,
  type DocumentId,
  type PeerId,
} from "@automerge/automerge-repo";
import { crossroadsDocUrl, whoBoardDocUrl } from "./deterministic-doc.js";

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
 * public-plane doc + the WHO board. Automerge-repo does NOT auto-follow doc refs
 * (each doc syncs independently under its own sharePolicy verdict), so these
 * board ids are the WHOLE relay surface — no transitive dep-set to chase and
 * ZERO hand-maintenance (the set is a pure function of the gate key).
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
