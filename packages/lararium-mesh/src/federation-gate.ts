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
import { crossroadsDocUrl, whoBoardDocUrl, kapaeAntigenDocUrl } from "./deterministic-doc.js";
import type { IdentitySlot } from "./identity-slot.js";
import type { PeerClass } from "./island-protocol.js";

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
      kapaeAntigenDocUrl(nexusPubkey),   // the immune antigen rides the always-carried plane (MANDATORY tier)
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

/**
 * AntigenRing — the #59 identity-ring seam the carry-contract enforces: consult the quorum-signed
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
