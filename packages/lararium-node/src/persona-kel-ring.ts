/**
 * persona-kel-ring — the node holder that stands the per-Nexus persona-KEL BOARD live on the main thread.
 *
 * It materializes the always-carried KEL board (mesh deterministic-doc `personaKelBoardDocUrl`) under its
 * deterministic id, keeps a per-prefix chain map folded from the board entries, and RE-FOLDS on every
 * board-doc change — so a rotation propagated across the mesh takes on the next sync (the identifier→head
 * mapping saturates by carry-contract, bounded by sync-latency, NEVER a global now). The board reads a LOCAL
 * replica: a prefix the replica has not yet synced surfaces a null head, and the Binding-Gate walk denies.
 *
 * The holder serves TWO reads:
 *   · chainForPrefix(prefix) — the RAW seq-sorted key-event-log for one persona, handed to the worker at boot
 *     (threaded via daemonAuth.personaKel.chain). The worker RE-VERIFIES it — this is transport, not trust.
 *   · headOpKeyForPrefix(prefix) — the fully-verified current head op-key (structural + every rotation quorum),
 *     or null on a broken / unreachable / unquorumed chain (fail-closed). The live read a gate wants.
 *
 * FAILS CLOSED: a board that never resolves (cold boot, sync not yet landed) leaves the chain map empty, so
 * every prefix resolves to a null head — a KEL that cannot reach a head DENIES, it never opens an allow path.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/persona-kel-ring
 */

import type { DocHandle, Repo } from "@automerge/automerge-repo";
import {
  type LarDoc,
  type PersonaKelEvent,
  headOpKey,
  materializeSharedLarDoc,
  personaKelBoardDocUrl,
  personaKelChainsFromBoard,
} from "@lararium/mesh";

export interface PersonaKelRingHolder {
  /** Resolves once the board has materialized + the first fold has run — boot AWAITS this before it reads a chain. */
  readonly ready: Promise<void>;
  /** The RAW seq-sorted chain for one persona prefix, or null when the local replica carries none. UNVERIFIED
   *  (the worker re-verifies) — this is the transport read the boot path threads into daemonAuth. */
  chainForPrefix(prefix: string): readonly PersonaKelEvent[] | null;
  /** The fully-verified current head op-key for one prefix (structural + every rotation quorum), or null
   *  fail-closed on a broken / unreachable / below-quorum chain. */
  headOpKeyForPrefix(prefix: string): Promise<string | null>;
  /** Re-read the board entries and re-fold the chain map. Idempotent; safe to call any time. */
  refold(): void;
  /** Detach the board-doc change listener (graceful shutdown). */
  dispose(): void;
}

/**
 * Stand the persona-KEL ring holder. `nexusPubkey` is the node's own gate key (its Nexus key — the same key
 * browsers pass as relayGatePubKey), so the board id is a pure function of the Nexus and every island member
 * resolves the identical board with no mint-race. The board resolves asynchronously; `ready` gates the first
 * read (a cold board folds to an empty map — every prefix denies, correctly).
 */
export function makePersonaKelRingHolder(opts: { repo: Repo; nexusPubkey: string }): PersonaKelRingHolder {
  const { repo, nexusPubkey } = opts;

  // The folded per-prefix chains — swapped whole on each refold (no partial-map window a walk could read).
  let chains: Map<string, PersonaKelEvent[]> = new Map();

  let boardHandle: DocHandle<LarDoc> | null = null;
  let onChange: (() => void) | null = null;

  const refold = (): void => {
    chains = personaKelChainsFromBoard(boardHandle?.doc());
  };

  const ready = (async (): Promise<void> => {
    try {
      const handle = await materializeSharedLarDoc(repo, personaKelBoardDocUrl(nexusPubkey), "board:persona-kel");
      boardHandle = handle;
      onChange = () => refold();
      handle.on("change", onChange);
      refold();
    } catch (err) {
      // Fail-closed: a resolve fault leaves the empty map standing (every prefix denies — a KEL that cannot
      // reach a head never opens an allow path). The boot path re-checks the chain it needs and halts on absence.
      console.warn(`[persona-kel-ring] board resolve skipped — the KEL reads no heads (deny): ${(err as Error)?.message ?? err}`);
    }
  })();

  return {
    ready,
    chainForPrefix(prefix: string): readonly PersonaKelEvent[] | null {
      const chain = chains.get(prefix);
      return chain && chain.length > 0 ? chain : null;
    },
    async headOpKeyForPrefix(prefix: string): Promise<string | null> {
      const chain = chains.get(prefix);
      if (!chain || chain.length === 0) return null;   // no chain on the local replica → no head (fail-closed)
      // Verify structure AND every rotation quorum before returning a head — a gate trusts a head only when
      // the whole lineage stands. Also bind the chain to the asked prefix (a mis-filed event never speaks for it).
      if (chain[0]!.prefix !== prefix) return null;
      return headOpKey(chain, { verifyQuorums: true });
    },
    refold,
    dispose(): void {
      if (boardHandle && onChange) boardHandle.off("change", onChange);
      boardHandle = null;
      onChange = null;
    },
  };
}
