/**
 * antigen-ring — the node holder that makes the Kapae-antigen BREATHE on the live sharePolicy path.
 *
 * It stands the `AntigenRing` (mesh federation-gate) the node's `carryContractShareDecision` consults:
 *   · presenterNym(peerId) — the main↔worker cap-verify BRIDGE. The DaemonAuthGate already proved a
 *     peerId↔verifying-key binding (its in-worker keyhive returned the peer's Identifier hex into
 *     `peerIdentifierMap`); this resolver SURFACES that proven nym — it never re-authenticates. The
 *     Identifier hex's last 64 hex chars ARE the raw ed25519 verifying key (operator-daemon-behavior
 *     `id.slice(-64)`), the exact `nym` the charter roster + antigen entries key on. An unresolved /
 *     unauthenticated peer → null (fail-closed: a denylist that cannot name a peer never falsely denies it).
 *   · kapaed — the currently-Kapae'd nym set, FOLDED (kapae-antigen `foldAntigenSet` + the multi-sig quorum
 *     verifier) from the always-carried antigen BOARD entries AND the founding-kahu roster read off disk
 *     (`readNexusCharterDoc(bagsDir)` → `foundingRoster`). Re-folded on every board-doc change so a ban
 *     propagated across the mesh takes on the next sync (the immune system saturates by carry-contract).
 *
 * FAILS CLOSED, three ways, matching the antigen's own discipline:
 *   · an absent / unseated charter → empty roster → the verifier ignores every entry → NOTHING Kapae'd
 *     (correct: no quorum, no bans — never allow-all, never false-deny).
 *   · an unverified board entry → ignored at the fold (never trusted).
 *   · an unresolvable presenter → presenterNym null → not on the denylist → NOT falsely denied AND not
 *     specially trusted (it still faces the rest of the sharePolicy composition upstream).
 *
 * The antigen is a DENYLIST: its absence (board not yet synced, roster not yet seated) means NO bans, so a
 * cold/empty ring denies nobody — availability-open, trust-closed. This is the pono fail-closed for an
 * immune antigen (a lone node MUST NOT manufacture a ban).
 *
 * Meme: lar:///ha.ka.ba/lararium/node/antigen-ring
 */

import type { DocHandle, Repo } from "@automerge/automerge-repo";
import {
  type AntigenRing,
  type LarDoc,
  antigenEntriesFromBoard,
  foldAntigenSet,
  foundingRoster,
  kapaeAntigenDocUrl,
  makeMultiSigQuorumVerifier,
  materializeSharedLarDoc,
} from "@lararium/mesh";
import { readNexusCharterDoc } from "./nexus-charter-doc.js";

/** A verifying-key nym reads clean only at the exact ed25519 length — a stray value never matches a ban. */
const NYM_RE = /^[0-9a-f]{64}$/;

export interface AntigenRingHolder {
  /** The live ring the node sharePolicy passes to `carryContractShareDecision`. */
  readonly ring: AntigenRing;
  /** Re-read the board entries + charter roster and re-fold the Kapae'd set. Idempotent; safe to call any time. */
  refold(): Promise<void>;
  /** Detach the board-doc change listener (graceful shutdown). */
  dispose(): void;
}

/**
 * Stand the antigen ring holder. Constructs the ring SYNCHRONOUSLY (empty Kapae'd set, live presenterNym)
 * so the sharePolicy has a valid ring at once; then resolves the antigen board doc + does the first fold
 * asynchronously (a cold board denies nobody, correctly). `nexusPubkey` is the node's own gate key (its
 * Nexus key — the same key browsers pass as relayGatePubKey). `bagsDir` sites the charter doc authority home.
 */
export function makeAntigenRingHolder(opts: {
  repo:              Repo;
  nexusPubkey:       string;
  bagsDir:           string;
  peerIdentifierMap: ReadonlyMap<string, string>;
}): AntigenRingHolder {
  const { repo, nexusPubkey, bagsDir, peerIdentifierMap } = opts;
  const verifier = makeMultiSigQuorumVerifier();

  // The folded Kapae'd set — swapped whole on each refold (no partial-set window a lookup could read).
  let kapaed: ReadonlySet<string> = new Set<string>();

  let boardHandle: DocHandle<LarDoc> | null = null;
  let onChange: (() => void) | null = null;

  const presenterNym = (peerId: string): string | null => {
    const identHex = peerIdentifierMap.get(peerId);
    if (identHex === undefined) return null;                 // unauthenticated / unknown peer → not named
    const nym = identHex.slice(-64).toLowerCase();           // the raw ed25519 verifying key (the nym)
    return NYM_RE.test(nym) ? nym : null;                    // a malformed identifier resolves to no nym
  };

  const ring: AntigenRing = {
    get kapaed(): ReadonlySet<string> { return kapaed; },
    presenterNym,
  };

  const refold = async (): Promise<void> => {
    // The board doc (may be null before the async resolve lands, or on a resolve fault) → no entries.
    const entries = antigenEntriesFromBoard(boardHandle?.doc());
    // The roster is the disk charter DOC (the authority home) — an absent / unseated doc folds empty (inert).
    const roster  = foundingRoster(readNexusCharterDoc(bagsDir));
    const folded  = await foldAntigenSet(entries, roster, verifier);
    // Normalize to lowercase so a nym's case can never silently miss a match against a resolved presenter.
    kapaed = new Set<string>([...folded].map((k) => k.toLowerCase()));
  };

  // Resolve (or materialize) the always-carried antigen board under its deterministic id, wire the refold
  // to its change stream, and do the first fold. Best-effort: a resolve/fold fault leaves the empty set
  // standing (deny-by-default for an antigen means NO bans — a cold ring denies nobody).
  void (async () => {
    try {
      const handle = await materializeSharedLarDoc(repo, kapaeAntigenDocUrl(nexusPubkey), "@kapae-antigen");
      boardHandle = handle;
      onChange = () => { void refold(); };
      handle.on("change", onChange);
      await refold();
    } catch (err) {
      console.warn(`[antigen-ring] board resolve/fold skipped — the antigen stays inert (no bans): ${(err as Error)?.message ?? err}`);
    }
  })();

  return {
    ring,
    refold,
    dispose(): void {
      if (boardHandle && onChange) boardHandle.off("change", onChange);
      boardHandle = null;
      onChange = null;
    },
  };
}
