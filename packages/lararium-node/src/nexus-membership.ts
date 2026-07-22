/**
 * nexus-membership — the node holder that answers the @nexus MEMBER-vs-STRANGER consult on the live
 * sharePolicy path (the carry-split's member gate).
 *
 * The mesh breathes across a Nexus because a cross-operator the @nexus names a MEMBER blind-transits a
 * sealed private plane (carry the ciphertext, never the read-cap); a STRANGER reaches only the public shelf.
 * This holder stands the `NexusMembership` the node's `memberCarryShareDecision` consults, reading the
 * node's OWN @nexus replica (as of last sync; no global now — never a global truth).
 *
 * THE MEMBER SET = the seated-KAHU floor ∪ the folded operator MEMBERS-registry (members{}). Two sources,
 * unioned, each fail-closed:
 *   · the seated-kahu FLOOR — the founding-kahu charter ROSTER read off `bags/@nexus` (`seatedCharterKeys`).
 *     Every seated kahu IS a contracted member (a strict subset), so it stands even when the members board is
 *     empty / unsynced — the conservative floor that never over-grants.
 *   · the MEMBERS-registry — the quorum-signed, contract-in members{} board (the antigen's ALLOW-twin), folded
 *     through `foldMembershipSet` against the SAME charter roster the antigen folds against. A general contracted
 *     operator (not a kahu) reads MEMBER off THIS source — which is what LIGHTS SELF-SLOT-B: the carry-split's
 *     member gate now names contracted operators, not kahu alone, so a contracted peer would blind-transit a
 *     sealed plane the moment a sealed plane type registers (planeSeal is DENY-ALL today; the lane stands ready).
 *
 * The board fold is OPTIONAL: without a `repo` + `nexusPubkey` the holder stands the kahu-floor alone (the prior
 * behavior, fully preserved), so a caller that has not yet wired the board still gets the conservative floor.
 *
 * NYM RESOLUTION reuses the antigen's proven binding: the DaemonAuthGate already keyed a peerId → verifying-key
 * Identifier hex into `peerIdentifierMap` (this holder SURFACES that nym, never re-authenticates). An
 * unresolved / unauthenticated peer → NOT a member (fail-closed: a node never assumes a peer is Nexus-pono).
 *
 * FAILS CLOSED, every way:
 *   · an absent / unseated charter → empty roster → the members fold ignores every entry AND the kahu floor is
 *     empty → NOBODY reads member (every cross-operator STRANGER). No quorum, no members.
 *   · an unverified / contract-in-short members entry → ignored at the fold (never trusted).
 *   · an unresolvable / malformed presenter → no nym → NOT a member.
 *   · the members board not yet resolved / synced → the kahu floor alone stands (never a false member).
 *
 * USER-NEVER-WRITTEN: this holder reads operator-pubkey nyms ONLY (kahu keys + members{} nyms). A user leaves no
 * roster trace, so nothing a user does ever enters this set — there is no surface here to hold a user.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/nexus-membership
 */

import type { DocHandle, Repo } from "@automerge/automerge-repo";
import type { NexusMembership, LarDoc } from "@lararium/mesh";
import {
  seatedCharterKeys,
  foundingRoster,
  foldMembershipSet,
  membershipEntriesFromBoard,
  membersDocUrl,
  materializeSharedLarDoc,
} from "@lararium/mesh";
import { readNexusCharterDoc } from "./nexus-charter-doc.js";

/** A verifying-key nym reads clean only at the exact ed25519 length — a stray value never seats a member. */
const NYM_RE = /^[0-9a-f]{64}$/;

export interface NexusMembershipHolder {
  /** The live consult the node sharePolicy passes to `memberCarryShareDecision`. */
  readonly membership: NexusMembership;
  /** Re-read the kahu floor off disk (idempotent; safe any time). Does NOT touch the members board. */
  refresh(): void;
  /** Re-read the kahu floor AND re-fold the members board, swapping the union whole. No-op board when unwired. */
  refold(): Promise<void>;
  /** Re-fold the member union against an EXTERNALLY-materialized members board (fresh storage bytes) + the disk
   *  charter (kahu floor). The live-refresh path: an OUT-OF-PROCESS admit/revoke (the `lares nexus admit` CLI
   *  writes through its OWN repo) never reaches this holder's cached handle — NodeFS carries no cross-process
   *  change bus — so the refresh caller materializes the board on a throwaway repo and hands the fresh doc here.
   *  Swaps the union whole; a fold fault leaves the prior union standing (fail-closed: never a false member). */
  refoldWithBoard(boardDoc: LarDoc | undefined): Promise<void>;
  /** Detach the members-board change listener (graceful shutdown). */
  dispose(): void;
}

/**
 * Stand the @nexus membership holder. Reads the seated-kahu floor SYNCHRONOUSLY at construction (the charter
 * doc is a disk file the operator seats, not a hot-syncing board), and — when a `repo` + `nexusPubkey` are
 * supplied — resolves the always-carried members board under its deterministic id and re-folds members{} ∪ the
 * kahu floor on every board change. `bagsDir` sites the charter doc authority home; `peerIdentifierMap` carries
 * the DaemonAuthGate's proven peerId → Identifier-hex bindings.
 */
export function makeNexusMembership(opts: {
  bagsDir:           string;
  peerIdentifierMap: ReadonlyMap<string, string>;
  /** The Automerge repo — supply to fold the members board; omit for the kahu-floor-only holder. */
  repo?:             Repo;
  /** The node's own gate key (its Nexus key) — the members board's deterministic address seed. Required with `repo`. */
  nexusPubkey?:      string;
}): NexusMembershipHolder {
  const { bagsDir, peerIdentifierMap, repo, nexusPubkey } = opts;

  // The member nym set — swapped whole on each refresh/refold (no partial-set window a lookup could read).
  let members: ReadonlySet<string> = new Set<string>();
  let boardHandle: DocHandle<LarDoc> | null = null;
  let onChange: (() => void) | null = null;
  // Resolve the members board at most once (the promise is cached); a lazy refold awaits it so a caller that
  // refolds before the constructor's kick-off completes still reads the board (never a null-board false miss).
  let boardResolve: Promise<DocHandle<LarDoc> | null> | null = null;

  /** The seated-kahu floor read off disk — lowercased. An absent / unseated charter yields the empty floor. */
  const kahuFloor = (): Set<string> =>
    new Set<string>(seatedCharterKeys(readNexusCharterDoc(bagsDir)).map((k) => k.toLowerCase()));

  /** Resolve (once) the always-carried members board, wire the change listener, and cache the handle. A holder
   *  without a repo / nexusPubkey resolves to null (kahu-floor-only). A resolve fault resolves to null too
   *  (fail-closed: the kahu floor stands). */
  const ensureBoard = (): Promise<DocHandle<LarDoc> | null> => {
    if (boardHandle) return Promise.resolve(boardHandle);
    if (!repo || !nexusPubkey) return Promise.resolve(null);
    if (!boardResolve) {
      boardResolve = materializeSharedLarDoc(repo, membersDocUrl(nexusPubkey), "@members-registry")
        .then((handle) => {
          boardHandle = handle;
          onChange = () => { void refold(); };
          handle.on("change", onChange);
          return handle;
        })
        .catch((err) => {
          console.warn(`[nexus-membership] members board resolve skipped — kahu floor stands: ${(err as Error)?.message ?? err}`);
          return null;
        });
    }
    return boardResolve;
  };

  const refresh = (): void => {
    // Floor-only swap — union with whatever the board fold last produced (empty until refold runs).
    if (boardHandle || boardResolve) { void refold(); return; }   // a wired board owns the union; fold it
    members = kahuFloor();
  };

  // Fold the member union (kahu floor ∪ members{}) against a SUPPLIED board doc + the disk charter — the one
  // fold body both the live handle-change refold (its own cached board) and the out-of-process refresh (a
  // freshly-materialized board) share. An absent / unseated charter folds empty (inert) AND yields an empty
  // floor; a lowercased union never silently misses a case match.
  const foldBoard = async (boardDoc: LarDoc | undefined): Promise<void> => {
    const doc     = readNexusCharterDoc(bagsDir);
    const roster  = foundingRoster(doc);
    const floor   = new Set<string>(seatedCharterKeys(doc).map((k) => k.toLowerCase()));
    const entries = membershipEntriesFromBoard(boardDoc);
    const folded  = await foldMembershipSet(entries, roster);
    const union = new Set<string>(floor);
    for (const n of folded) union.add(n.toLowerCase());
    members = union;
  };

  const refold = async (): Promise<void> => {
    const board = await ensureBoard();   // resolve the board first (lazy, once) — no null-board false miss
    await foldBoard(board?.doc());       // the live WS-sync path folds THIS holder's own cached board handle
  };
  // The out-of-process refresh path: fold a board the caller materialized fresh off storage (see the interface).
  const refoldWithBoard = (boardDoc: LarDoc | undefined): Promise<void> => foldBoard(boardDoc);

  // First floor read (synchronous), then — when wired — resolve the members board + first fold asynchronously.
  members = kahuFloor();
  if (repo && nexusPubkey) void refold();

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

  return {
    membership,
    refresh,
    refold,
    refoldWithBoard,
    dispose(): void {
      if (boardHandle && onChange) boardHandle.off("change", onChange);
      boardHandle = null;
      onChange = null;
    },
  };
}
