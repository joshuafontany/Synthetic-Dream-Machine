/**
 * runNexusContract / runNexusAcceptCarriage / runNexusMembersList — the RAISE side of the operator MEMBERS-registry
 * (the Kapae-antigen's ALLOW-twin). The founding kahu WRITE a quorum-signed `admit` / `revoke` onto the
 * always-carried members BOARD; the READER (`members-board`) + the consult (`nexus-membership`,
 * `carrierShareDecision`) fold it. This is the writer they were missing — the mirror of `runNexusKapae`.
 *
 * TWO WAX-SEALS ride an ADMIT (membership-doctrine):
 *   · the OPERATOR's own "accepts carriage" contract-sig (the contract-in). Either the joining operator produced
 *     it out-of-band (`lares nexus accept-carriage` → a token supplied via `contractSig`), OR — the a-multitude-
 *     of-one ceremony — the vessel HOLDS the admitted nym's persona seed and self-signs it. FAIL CLOSED: no valid
 *     contract-in → REFUSE. A Nexus cannot conscript an operator into carriage; the operator consents first.
 *   · ≥ threshold founding-kahu quorum signatures (the steward act — identical to the antigen's).
 * A REVOKE needs the kahu quorum ONLY (an uncooperative member cannot veto its own removal).
 *
 * TRACK CONTRACTS, NEVER IDENTITIES: the writer takes an operator PUBKEY nym + (for admit) a carriage contract-sig.
 * No name / email / device / behavior is read, asked, or written — the FLOOR alone lands on the board.
 *
 * FAIL CLOSED, at every shore (mirrors nexus-kapae):
 *   · an unseated / quorum-short charter → REFUSE (nothing to root a quorum on); no board write.
 *   · fewer than `threshold` HELD persona-roots that sit IN the seated roster → REFUSE; no sub-quorum entry.
 *   · an admit with no valid contract-in → REFUSE; never write a conscripted member.
 *   · an entry that does not COUNT against the seated roster → REFUSE; never write a dead admit.
 *   · a malformed nym → REFUSE.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-operator-contract
 */

import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  carriageEntriesFromBoard, writeCarriageEntry, signCarriageQuorum, signCarriageContract,
  carriageEntryCounts, foldCarriageSet, holdsCarriage, foundingRoster,
  carriageDocUrl, materializeSharedLarDoc, ed25519SignerFromSeed,
  type CarriageAction, type CarriageEntry, type KahuRoster, type QuorumSignature,
} from "@lararium/mesh";
import { larDataDir } from "../vessel-paths.js";
import { readNexusDoc } from "../nexus-doc.js";
import { membersBoardRoot } from "@lararium/mesh";
import {
  listPersonaRoots, generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed,
  loadVesselVerifyingKey,
} from "../node-vessel-identity.js";

/** An operator nym reads clean only at the exact ed25519 verifying-key length — a stray value never admits. */
const NYM_RE = /^[0-9a-f]{64}$/;

/** A REFUSAL the CLI renders as a clean fail-closed message (never a stack, never a partial write). */
export class NexusContractError extends Error {}

export interface NexusContractOptions {
  readonly action:     CarriageAction;
  readonly nym:        string;
  /** The joining operator's "accepts carriage" contract-sig hex (from `nexus accept-carriage`). Admit only;
   *  optional when the vessel holds the nym's own persona seed (multitude-of-one self-sign). */
  readonly contractSig?: string;
  /** The charter DOC's authority home (the CLI supplies `larSealHome()`). */
  readonly sealHome:    string;
  readonly storageDir?: string;
}

export interface NexusContractResult {
  readonly action:          CarriageAction;
  readonly nym:             string;
  readonly version:         number;
  readonly priorVersion:    number | null;
  readonly sealEpochCid: string;
  readonly threshold:       number;
  readonly signers:         readonly string[];
  /** How the operator's consent arrived: "supplied" (out-of-band token), "self" (held seed), or "n/a" (revoke). */
  readonly contractIn:      "supplied" | "self" | "n/a";
  readonly boardUrl:        string;
  /** Whether the nym stands a MEMBER after this write folds against the seated roster. */
  readonly memberNow:       boolean;
}

/** Read the seated roster off disk, FAILING CLOSED when no live quorum stands to root an admit on. */
function seatedRosterOrRefuse(sealHome: string): KahuRoster {
  const roster = foundingRoster(readNexusDoc(sealHome));
  if (roster.sealEpochCid.length === 0 || roster.keys.length < roster.threshold) {
    throw new NexusContractError(
      "no seated founding-kahu quorum to root an admit on — run `lares nexus seal seat` first (the members-registry stays inert until a quorum stands).",
    );
  }
  return roster;
}

/**
 * Resolve the ≥ threshold HELD persona-roots that sit IN the seated roster — the kahu signers the operator can
 * bring to this quorum. FAIL CLOSED: fewer than `threshold` matching held roots REFUSES (no sub-quorum admit is
 * ever minted). Mirrors nexus-kapae `selectHeldQuorumSigners`.
 */
async function selectHeldQuorumSigners(
  storageDir: string, roster: KahuRoster,
): Promise<Array<{ handleIndex: number; verifyingKey: string }>> {
  const rosterKeys = new Set(roster.keys.map((k) => k.toLowerCase()));
  const indices    = await listPersonaRoots(storageDir);
  const candidates: Array<{ handleIndex: number; verifyingKey: string }> = [];
  const seen       = new Set<string>();
  for (const handleIndex of indices) {
    const root = await generateOrLoadPersonaGroupRoot(storageDir, handleIndex);   // loads a HELD root; never mints here
    const vk   = root.verifyingKey.toLowerCase();
    if (!rosterKeys.has(vk) || seen.has(vk)) continue;
    seen.add(vk);
    candidates.push({ handleIndex, verifyingKey: vk });
    if (candidates.length >= roster.threshold) break;
  }
  if (candidates.length < roster.threshold) {
    throw new NexusContractError(
      `sub-quorum REFUSED (fail-closed): the vessel holds ${candidates.length} seated persona-root(s), but a valid membership act carries ${roster.threshold} distinct founding-kahu signatures. ` +
      `A real cabal collects the missing signature(s) from the other founding kahu (a collect-signatures ceremony, unbuilt).`,
    );
  }
  return candidates;
}

/**
 * Obtain the operator's "accepts carriage" contract-sig for an ADMIT. Two paths, fail-closed:
 *   · a `--contract <hex>` token supplied out-of-band → wrap it { signer: nym, sig } (the fold verifies it).
 *   · else, if the vessel HOLDS the nym's persona seed (multitude-of-one) → self-sign the carriage token.
 * Neither → REFUSE (never admit an operator that has not consented to carriage).
 */
async function resolveContractIn(
  opts: NexusContractOptions, storageDir: string, nym: string, sealEpochCid: string,
): Promise<{ contractSig: QuorumSignature; how: "supplied" | "self" }> {
  if (opts.contractSig) {
    return { contractSig: { signer: nym, sig: opts.contractSig.trim().toLowerCase() }, how: "supplied" };
  }
  // multitude-of-one: does this vessel hold the admitted nym's seed? Then self-sign the carriage token.
  for (const handleIndex of await listPersonaRoots(storageDir)) {
    const root = await generateOrLoadPersonaGroupRoot(storageDir, handleIndex);
    if (root.verifyingKey.toLowerCase() !== nym) continue;
    const contractSig = await signCarriageContract(
      nym, sealEpochCid, ed25519SignerFromSeed(await loadPersonaGroupRootSeed(storageDir, handleIndex)),
    );
    return { contractSig, how: "self" };
  }
  throw new NexusContractError(
    "admit REFUSED (fail-closed): no operator contract-in. The joining operator must sign 'accepts carriage' " +
    "(`lares nexus accept-carriage` on their vessel) and supply the token via --contract, OR this vessel must " +
    "hold the admitted persona's own seed. A Nexus never conscripts an operator into carriage.",
  );
}

/**
 * ADMIT (`admit`) or REVOKE (`revoke`) an operator nym — sign a monotone membership entry with ≥ threshold held
 * founding persona-roots (plus, for admit, the operator's contract-in) and LAND it on the always-carried members
 * board. FAILS CLOSED before any write. The lift/re-admit rides a STRICTLY HIGHER version than any standing entry.
 */
export async function runNexusContract(opts: NexusContractOptions): Promise<NexusContractResult> {
  const storageDir = opts.storageDir ?? larDataDir();
  const nym        = opts.nym.trim().toLowerCase();
  if (!NYM_RE.test(nym)) {
    throw new NexusContractError(`"${opts.nym}" is not a valid operator nym — expected a 64-hex ed25519 verifying key.`);
  }

  const roster   = seatedRosterOrRefuse(opts.sealHome);
  const selected = await selectHeldQuorumSigners(storageDir, roster);

  // The contract-in — REQUIRED for an admit, none for a revoke.
  let contract: { contractSig: QuorumSignature; how: "supplied" | "self" } | null = null;
  if (opts.action === "admit") {
    contract = await resolveContractIn(opts, storageDir, nym, roster.sealEpochCid);
  }

  const nexusPubkey = await loadVesselVerifyingKey(storageDir);
  const boardUrl    = carriageDocUrl(nexusPubkey);
  const repo        = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  try {
    const handle = await materializeSharedLarDoc(repo, boardUrl, "board:members-registry");

    const priorVersion = maxVersionForNym(carriageEntriesFromBoard(handle.doc()), nym);
    const version      = (priorVersion ?? 0) + 1;

    const signers = await Promise.all(selected.map(async (s) => ({
      signer: s.verifyingKey,
      sign:   ed25519SignerFromSeed(await loadPersonaGroupRootSeed(storageDir, s.handleIndex)),
    })));
    const entry: CarriageEntry = await signCarriageQuorum(
      { nym, action: opts.action, version, sealEpochCid: roster.sealEpochCid },
      signers,
      contract?.contractSig,
    );

    // NEVER write an entry the fold would ignore — self-verify it COUNTS against the live roster (a dead admit
    // would read as enforced while granting nothing). This catches a bad supplied contract-sig BEFORE the write.
    if (!(await carriageEntryCounts(entry, roster))) {
      throw new NexusContractError(
        opts.action === "admit"
          ? "refusing to write: the signed admit does not COUNT (the kahu quorum or the operator contract-in failed to verify against the seated roster)."
          : "refusing to write: the signed revoke does not verify against the seated roster (fail-closed).",
      );
    }

    handle.change((d) => writeCarriageEntry(d, entry));
    await repo.flush();

    const folded    = await foldCarriageSet(carriageEntriesFromBoard(handle.doc()), roster);
    const memberNow = holdsCarriage(nym, folded);

    return {
      action: opts.action, nym, version, priorVersion,
      sealEpochCid: roster.sealEpochCid, threshold: roster.threshold,
      signers: selected.map((s) => s.verifyingKey),
      contractIn: opts.action === "admit" ? contract!.how : "n/a",
      boardUrl, memberNow,
    };
  } finally {
    await repo.flush().catch(() => { /* best-effort final flush */ });
  }
}

/**
 * Mint the operator's "accepts carriage" contract-sig — run by the JOINING operator on its OWN vessel. Reads the
 * held persona seed at `handleIndex`, signs the version-independent carriage token for the current charter epoch,
 * and returns the token hex the kahu supply to `runNexusContract({ contractSig })`. FAIL CLOSED: an unseated charter
 * has no epoch to bind consent to → REFUSE.
 */
export async function runNexusAcceptCarriage(opts: {
  handleIndex: number; sealHome: string; storageDir?: string;
}): Promise<{ nym: string; sealEpochCid: string; contractSig: string }> {
  const storageDir = opts.storageDir ?? larDataDir();
  const roster     = foundingRoster(readNexusDoc(opts.sealHome));
  if (roster.sealEpochCid.length === 0) {
    throw new NexusContractError("no seated charter epoch to bind carriage consent to — the Nexus must seat its charter first.");
  }
  const root = await generateOrLoadPersonaGroupRoot(storageDir, opts.handleIndex);
  const nym  = root.verifyingKey.toLowerCase();
  const sig  = await signCarriageContract(
    nym, roster.sealEpochCid, ed25519SignerFromSeed(await loadPersonaGroupRootSeed(storageDir, opts.handleIndex)),
  );
  return { nym, sealEpochCid: roster.sealEpochCid, contractSig: sig.sig };
}

export interface NexusMembersListResult {
  /** The verifying key whose carriage doc this fold read — WHICH Nexus these members belong to. */
  readonly boardRoot:       string;
  /** Whether that board is this vessel's own. False when reading a charter this vessel joined. */
  readonly boardIsOwn:      boolean;
  /** Whose board this is, so a caller never reads a local fold under a Nexus-scoped name. */
  readonly boardReading:    string;
  readonly sealEpochCid: string;
  readonly threshold:       number;
  readonly seatedKeys:      number;
  /** The currently-admitted member nyms (folded + quorum + contract-in verified against the seated roster). */
  readonly members:         readonly string[];
  readonly entries:         ReadonlyArray<{ nym: string; action: CarriageAction; version: number; signers: number; contractIn: boolean }>;
}

/** Read the currently-admitted member set + the raw board entries (the `--list` fold). Read-only; FAILS CLOSED
 *  to the empty set on an unseated charter. */
export async function runNexusMembersList(opts: { sealHome: string; storageDir?: string }): Promise<NexusMembersListResult> {
  const storageDir = opts.storageDir ?? larDataDir();
  const roster     = foundingRoster(readNexusDoc(opts.sealHome));

  // WHOSE BOARD THIS IS. The board is a SHARED doc at `carriageDocUrl(<key>)`, so the key decides
  // which Nexus is being read. Reading this vessel's own key is right for the operator who FOUNDED
  // the charter and wrong for every operator she contracts: a joining operator was admitted onto the
  // FOUNDER's board, so that is where the relation both sides entered is written.
  const doc   = readNexusDoc(opts.sealHome);
  const board = membersBoardRoot({
    charterRoot: doc?.boardRoot ?? null,
    ownVesselKey: await loadVesselVerifyingKey(storageDir),
  });
  const repo        = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  try {
    const handle  = await materializeSharedLarDoc(repo, carriageDocUrl(board.root), "board:members-registry");
    const entries = carriageEntriesFromBoard(handle.doc());
    const folded  = await foldCarriageSet(entries, roster);
    return {
      boardRoot:       board.root,
      boardIsOwn:      board.own,
      boardReading:    board.reading,
      sealEpochCid: roster.sealEpochCid,
      threshold:       roster.threshold,
      seatedKeys:      roster.keys.length,
      members:         [...folded].map((k) => k.toLowerCase()).sort(),
      entries:         entries
        .map((e) => ({ nym: e.nym, action: e.action, version: e.version, signers: e.signatures.length, contractIn: Boolean(e.contractSig) }))
        .sort((a, b) => (a.nym === b.nym ? a.version - b.version : a.nym.localeCompare(b.nym))),
    };
  } finally {
    await repo.flush().catch(() => { /* best-effort */ });
  }
}

/** The highest `version` any board entry carries for `nym`, or null when the nym has no standing entry. */
function maxVersionForNym(entries: readonly CarriageEntry[], nym: string): number | null {
  let max: number | null = null;
  for (const e of entries) {
    if (e.nym.toLowerCase() !== nym) continue;
    if (max === null || e.version > max) max = e.version;
  }
  return max;
}
