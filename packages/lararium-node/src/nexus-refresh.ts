/**
 * nexus-refresh — the LIVE-refold shore behind the `nexus-refresh` daemon verb.
 *
 * A running node reads three authorities off the `bags/nexus` charter + the always-carried antigen / members
 * boards: the federation POSTURE, the Kapae'd DENY set, and the contracted MEMBER set. All three settle at boot
 * and re-fold live ONLY on a board-doc CHANGE that reaches the running repo — the WS-sync path (a peer's ban or
 * admit propagates over the relay, fires the handle change, refolds). But an OUT-OF-PROCESS edit does NOT reach
 * the running node: `lares nexus posture` rewrites a DISK file the boot read once, and `lares nexus kapae` /
 * `admit` write the boards through their OWN throwaway repo. NodeFS carries no cross-process change bus, so the
 * running repo's cached board handle never sees those bytes. This refresh closes that gap on demand.
 *
 * WHAT IT DOES, once, fail-closed:
 *   1. POSTURE — re-read the disk charter fresh and hand the posture to the caller's setter (which reassigns the
 *      sharePolicy's live `federationPosture`). A torn / absent charter reads PRIVATE (`federationPostureFromDoc`
 *      fails closed), so a broken read can only ever tighten the mesh, never open it.
 *   2. BOARDS — re-materialize the antigen + members boards on a THROWAWAY repo bound to the same storage dir
 *      (a cold-cache read → the flushed on-disk bytes the CLI wrote), then hand each fresh board doc to the live
 *      holders' `refoldWithBoard`. The holders swap their sets whole; a fold fault leaves the prior set standing.
 *
 * NO-GLOBAL-NOW: the refresh reads THIS node's own storage as-of-now — never a global truth of who is banned or
 * admitted. It re-reads a local replica the operator's own CLI just wrote beside it; a peer's change still rides
 * the WS-sync refold, not this shore. TRACK-CONTRACTS-NEVER-IDENTITIES holds unchanged — the boards carry operator
 * pubkey nyms + quorum seals only, and this shore reads them, never a user.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/nexus-refresh
 */

import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  materializeSharedLarDoc, kapaeAntigenDocUrl, carriageDocUrl,
  antigenEntriesFromBoard, carriageEntriesFromBoard,
  federationPostureFromDoc, type FederationPosture,
  membersBoardRoot,
} from "@lararium/mesh";
import { readNexusDoc } from "./nexus-doc.js";
import type { AntigenRingHolder } from "./antigen-ring.js";
import type { NexusMembershipHolder } from "./nexus-carriage.js";

export interface NexusRefreshDeps {
  /** The Automerge storage dir the running node + the CLI writers both bind (the shared on-disk substrate). */
  readonly storageDir: string;
  /** The `bags/nexus` charter authority home (the CLI supplies the same dir the boot read). */
  readonly sealHome: string;
  /** The node's own gate key (its Nexus key) — the boards' deterministic address seed. */
  readonly nexusPubkey: string;
  /** The live antigen ring holder — its Kapae'd set re-folds against the fresh board. */
  readonly antigen: AntigenRingHolder;
  /** The live membership holder — its member union re-folds against the fresh board. */
  readonly membership: NexusMembershipHolder;
  /** Reassign the sharePolicy's live `federationPosture` closure var. Called ONLY with a freshly-read posture. */
  readonly setPosture: (posture: FederationPosture) => void;
  /**
   * The LIVE networked repo, for SUBSCRIPTION only.
   *
   * A charter naming ANOTHER vessel's board needs that doc opened on a networked repo or it never
   * syncs into storage, and the throwaway read repo below carries storage ALONE — it can only ever
   * read what this vessel already holds. Opening the doc here is what lets it arrive; the fold still
   * reads cold from disk afterwards, because a live handle hands back stale in-memory bytes.
   *
   * Optional: a caller with no network (a CLI writer) refreshes without one and folds what it has.
   */
  readonly liveRepo?: Repo;
}

export interface NexusRefreshResult {
  /** The posture the disk charter now names (PRIVATE when the charter is absent / torn — fail-closed). */
  readonly posture: FederationPosture;
  /** The antigen board entry count folded this pass (0 when the board is absent / unsynced). */
  readonly antigenEntries: number;
  /** The members board entry count folded this pass (0 when the board is absent / unsynced). */
  readonly memberEntries: number;
  /** WHICH members board this pass folded — the charter's own root, or this vessel's when none is named. */
  readonly boardRoot: string;
  /** Whether that board is this vessel's own. False on a vessel that JOINED someone else's Nexus. */
  readonly boardIsOwn: boolean;
}

/**
 * Re-read the disk charter posture and re-fold the antigen + members boards from storage into the live holders.
 * A single, idempotent pass. The board re-materialize rides a THROWAWAY repo (disposed on return) so it reads
 * the CLI's flushed bytes without disturbing the running repo's handles — the same throwaway-repo pattern the
 * CLI writers themselves use, here for a read.
 */
export async function runNexusRefresh(deps: NexusRefreshDeps): Promise<NexusRefreshResult> {
  // 1. POSTURE — fresh disk read; PRIVATE on absent / torn (fail-closed: a broken read only ever tightens).
  const charter = readNexusDoc(deps.sealHome);
  const posture = federationPostureFromDoc(charter);
  deps.setPosture(posture);

  // 2. BOARDS — a throwaway repo on the SAME storage dir reads the flushed on-disk bytes cold (the running
  //    repo's cached handle would hand back its stale in-memory board). Read-only here; disposed on return.
  // WHICH members board. The board is a SHARED doc addressed by a key, so the key decides WHICH Nexus
  // this pass folds. A vessel that JOINED a Nexus was admitted onto the FOUNDER's board, and folding
  // its own instead reads an empty registry — a completed crossing then reports no relation at all.
  // The antigen board stays on this vessel's OWN key: it is the node's gate, not the Nexus's.
  const board = membersBoardRoot({ charterRoot: charter?.boardRoot ?? null, ownVesselKey: deps.nexusPubkey });

  // OPEN THE FOREIGN BOARD ON THE NETWORK before reading cold, or the right address folds an empty
  // registry forever. Idempotent — automerge-repo hands back the same handle for a URL already open.
  if (!board.own && deps.liveRepo) {
    try { await materializeSharedLarDoc(deps.liveRepo, carriageDocUrl(board.root), "board:members-registry"); }
    catch { /* a board that has not arrived is not an error — the fold below reads what stands */ }
  }

  const repo = new Repo({ storage: new NodeFSStorageAdapter(deps.storageDir) });
  try {
    const antigenBoard = await materializeSharedLarDoc(repo, kapaeAntigenDocUrl(deps.nexusPubkey), "board:kapae-antigen");
    const membersBoard = await materializeSharedLarDoc(repo, carriageDocUrl(board.root), "board:members-registry");
    const antigenDoc = antigenBoard.doc();
    const membersDoc = membersBoard.doc();
    // Fold the fresh boards into the live holders. Each swaps its set whole; a fold fault throws BEFORE the
    // swap (the prior set stands), so a torn board never widens the denylist or manufactures a member.
    await deps.antigen.refoldWithBoard(antigenDoc);
    await deps.membership.refoldWithBoard(membersDoc);
    return {
      posture,
      antigenEntries: antigenEntriesFromBoard(antigenDoc).length,
      memberEntries:  carriageEntriesFromBoard(membersDoc).length,
      boardRoot:      board.root,
      boardIsOwn:     board.own,
    };
  } finally {
    // Dispose the throwaway repo whole — flush its docs AND disconnect its subsystems, so no Repo, no
    // network shore, and no storage-throttle timer outlives the call. (repo.flush() alone leaves the
    // StorageSource's armed asyncThrottle trailing-save pending; a caller that removes the storage dir
    // before it fires draws an ENOENT. shutdown() flushes then tears the subsystems down.)
    await repo.shutdown().catch(() => { /* best-effort — a read-only throwaway repo has nothing to persist */ });
  }
}
