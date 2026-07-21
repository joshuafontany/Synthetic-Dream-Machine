/**
 * nexus-membership — the node holder that answers the @nexus MEMBER-vs-STRANGER consult on the live
 * sharePolicy path (the carry-split's member gate).
 *
 * The mesh breathes across a Nexus because a cross-operator the @nexus names a MEMBER blind-transits a
 * sealed private plane (carry the ciphertext, never the read-cap); a STRANGER reaches only the public shelf.
 * This holder stands the `NexusMembership` the node's `memberCarryShareDecision` consults, reading the
 * node's OWN @nexus replica (as of last sync; no global now — never a global truth).
 *
 * THE PROVABLE-MEMBER FLOOR — surfaced fork, fail-closed. A general contracted-member REGISTRY does not yet
 * stand in the substrate: the only cryptographic membership record in `bags/@nexus` is the founding-kahu
 * charter ROSTER (`readNexusCharterDoc` → `seatedCharterKeys`). A kahu is a STRICT SUBSET of members (every
 * seated kahu IS a contracted member), so this holder gates on the seated-kahu key-set as the CONSERVATIVE
 * member floor: a cross-operator whose resolved nym seats in the charter roster reads MEMBER; every other
 * cross-operator reads STRANGER. This UNDER-grants (a plain contracted member who is not a kahu is treated
 * STRANGER until a real members-registry stands) — the fail-closed direction: it NEVER blind-transits sealed
 * bytes to a peer not provably in the @nexus. When a `NexusRegistryDoc.members{}` lands, widen the roster
 * source here; the gate and its fail-closed discipline stay put.
 *
 * NYM RESOLUTION reuses the antigen's proven binding: the DaemonAuthGate already keyed a peerId → verifying-
 * key Identifier hex into `peerIdentifierMap` (this holder SURFACES that nym, never re-authenticates). An
 * unresolved / unauthenticated peer → NOT a member (fail-closed: a node never assumes a peer is Nexus-pono).
 *
 * FAILS CLOSED, three ways:
 *   · an absent / unseated charter → empty seated-key set → NOBODY reads member (every cross-operator STRANGER).
 *   · an unresolvable presenter → NOT a member.
 *   · a malformed identifier → no nym → NOT a member.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/nexus-membership
 */

import type { NexusMembership } from "@lararium/mesh";
import { seatedCharterKeys } from "@lararium/mesh";
import { readNexusCharterDoc } from "./nexus-charter-doc.js";

/** A verifying-key nym reads clean only at the exact ed25519 length — a stray value never seats a member. */
const NYM_RE = /^[0-9a-f]{64}$/;

export interface NexusMembershipHolder {
  /** The live consult the node sharePolicy passes to `memberCarryShareDecision`. */
  readonly membership: NexusMembership;
  /** Re-read the charter doc off disk and refresh the seated-member key-set. Idempotent; safe any time. */
  refresh(): void;
}

/**
 * Stand the @nexus membership holder. Reads the seated-kahu key-set SYNCHRONOUSLY at construction (the
 * charter doc is a disk file the operator seats via `lares nexus charter seat`, not a hot-syncing board),
 * and swaps the whole set on each `refresh`. `bagsDir` sites the charter doc authority home;
 * `peerIdentifierMap` carries the DaemonAuthGate's proven peerId → Identifier-hex bindings.
 */
export function makeNexusMembership(opts: {
  bagsDir:           string;
  peerIdentifierMap: ReadonlyMap<string, string>;
}): NexusMembershipHolder {
  const { bagsDir, peerIdentifierMap } = opts;

  // The seated-member nym set — swapped whole on each refresh (no partial-set window a lookup could read).
  let members: ReadonlySet<string> = new Set<string>();

  const refresh = (): void => {
    // The charter DOC is the authority home; an absent / unseated doc yields an empty set (every peer STRANGER).
    const keys = seatedCharterKeys(readNexusCharterDoc(bagsDir));
    members = new Set<string>(keys.map((k) => k.toLowerCase()));
  };
  refresh();

  const memberNym = (peerId: string): string | null => {
    const identHex = peerIdentifierMap.get(peerId);
    if (identHex === undefined) return null;               // unauthenticated / unknown peer → not named → STRANGER
    const nym = identHex.slice(-64).toLowerCase();         // the raw ed25519 verifying key (the nym)
    return NYM_RE.test(nym) ? nym : null;                  // a malformed identifier resolves to no nym
  };

  const membership: NexusMembership = {
    isMemberPeer(peerId: string): boolean {
      const nym = memberNym(peerId);
      if (nym === null) return false;                      // fail-closed: an unresolvable peer is never a member
      return members.has(nym);
    },
  };

  return { membership, refresh };
}
