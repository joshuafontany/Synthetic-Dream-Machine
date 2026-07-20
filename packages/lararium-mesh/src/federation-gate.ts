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
import type { IdentitySlot } from "./identity-slot.js";

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
 * are both in scope at the sharePolicy seam. TODAY neither vessel has that at its
 * main-thread sharePolicy: the live KeyhiveProvider runs INSIDE the daemon-island
 * worker (bootDaemonKeyhive over the worker composite), and the bag↔docId registry
 * lives there too — the founding ceremony DISPOSES its transient provider before
 * returning, and LarVessel (whose `identity` field would carry the slot) is not on
 * the live factory path. So both vessels pass `identity = null` and this degenerates
 * EXACTLY to federationShareDecision (zero behavior change, deny-by-default intact).
 * Making the inner ring LIVE needs the main↔worker cap-verify bridge (the async
 * `daemon:verify-request` seam the node peer-gate already uses) + a docId→bagUrl
 * resolver over the worker's bag registry — a SEPARATE thread. This fn is that
 * seam's tested socket; it never fakes a verdict.
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
