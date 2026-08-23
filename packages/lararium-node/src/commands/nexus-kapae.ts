/**
 * runNexusKapae / runNexusKapaeList — the RAISE side of the Kapae immune antigen (#65): the founding kahu
 * WRITES a quorum-signed ban (`kapae`) or lift (`un_kapae`) onto the always-carried antigen BOARD, and reads
 * the currently-Kapae'd set back. The READER (`antigen-board`) + the ENFORCE shore (`antigen-ring`,
 * `carryContractShareDecision`) already stand; this is the writer they were missing.
 *
 * Node-specific shores (only these belong here):
 *   - Repo + NodeFSStorageAdapter over the vessel store (the offline board-doc access, mirroring device-admit)
 *   - readNexusDoc off `bags/nexus` (the roster's authority home) → foundingRoster
 *   - listPersonaRoots / generateOrLoadPersonaGroupRoot / loadPersonaGroupRootSeed (founder-held signing seeds)
 *   - loadVesselVerifyingKey (the node's own gate key — the board's per-island deterministic address seed)
 *
 * The signing, the quorum SHAPE, the fold/verify, and the board tiddler shape stay in @lararium/mesh
 * (platform-blind). This adapter carries no crypto and no ban policy — it composes the mesh primitives.
 *
 * FAIL CLOSED, at every shore:
 *   - an unseated / quorum-short charter → REFUSE (nothing to root a quorum on); no board write.
 *   - fewer than `threshold` HELD persona-roots that sit IN the seated roster → REFUSE; no sub-quorum entry.
 *   - an entry that does not verify against the seated roster → REFUSE; never write an unverifiable ban.
 *   - a malformed nym (not a 64-hex ed25519 verifying key) → REFUSE.
 *
 * The a-multitude-of-one ceremony: one operator holds all three founding persona-roots, so a 2-of-3 quorum
 * signs with 2 of their OWN held persona-roots. A real cabal (2 DISTINCT operators) needs a collect-signatures
 * flow — surfaced, unbuilt (see the handback fork).
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#kapae-the-antigen
 */

import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  antigenEntriesFromBoard, writeAntigenEntry, signAntigenEntry,
  makeMultiSigQuorumVerifier, foldAntigenSet, isKapaed, foundingRoster,
  kapaeAntigenDocUrl, materializeSharedLarDoc, ed25519SignerFromSeed,
  type KapaeAction, type KapaeAntigenEntry, type KahuRoster, type LarDoc,
} from "@lararium/mesh";
import { larDataDir } from "../vessel-paths.js";
import { readNexusDoc } from "../nexus-doc.js";
import {
  listPersonaRoots, generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed,
  loadVesselVerifyingKey,
} from "../node-vessel-identity.js";

/** A ban target reads clean only at the exact ed25519 verifying-key length — a stray value never bans. */
const NYM_RE = /^[0-9a-f]{64}$/;

/** A REFUSAL the CLI renders as a clean fail-closed message (never a stack, never a partial write). */
export class NexusKapaeError extends Error {}

export interface NexusKapaeOptions {
  readonly action:     KapaeAction;
  readonly nym:        string;
  readonly reason?:    string;
  /** The charter DOC's authority home (the CLI supplies `larSealHome()`). */
  readonly sealHome:    string;
  /** The Automerge Repo store (defaults to the node vessel store). */
  readonly storageDir?: string;
}

export interface NexusKapaeResult {
  readonly action:          KapaeAction;
  readonly nym:             string;
  readonly version:         number;
  readonly priorVersion:    number | null;
  readonly sealEpochCid: string;
  readonly threshold:       number;
  /** The verifying keys that signed the entry (the held persona-roots that met the quorum). */
  readonly signers:         readonly string[];
  readonly boardUrl:        string;
  /** Whether the nym stands Kapae'd AFTER this write folds against the seated roster. */
  readonly kapaedNow:       boolean;
}

export interface NexusKapaeListResult {
  readonly sealEpochCid: string;
  readonly threshold:       number;
  readonly seatedKeys:      number;
  /** The currently-Kapae'd nym set (folded + quorum-verified against the seated roster). */
  readonly kapaed:          readonly string[];
  /** Every well-formed board entry (pre-verify shape read) — surfaces the raw antigen for the operator. */
  readonly entries:         ReadonlyArray<{ nym: string; action: KapaeAction; version: number; signers: number }>;
}

/** Read the seated roster off disk, FAILING CLOSED when no live quorum stands to root a ban on. */
function seatedRosterOrRefuse(sealHome: string): KahuRoster {
  const roster = foundingRoster(readNexusDoc(sealHome));
  if (roster.sealEpochCid.length === 0 || roster.keys.length < roster.threshold) {
    throw new NexusKapaeError(
      "no seated founding-kahu quorum to root a ban on — run `lares nexus seal seat` first (the antigen stays inert until a quorum stands).",
    );
  }
  return roster;
}

/**
 * Resolve the ≥ threshold HELD persona-roots that sit IN the seated roster — the signers the operator can
 * actually bring to this quorum. FAIL CLOSED: fewer than `threshold` matching held roots REFUSES (no
 * sub-quorum entry is ever minted). Returns the selected `{ handleIndex, verifyingKey }` set (exactly
 * threshold, distinct signers).
 */
async function selectHeldQuorumSigners(
  storageDir: string, roster: KahuRoster,
): Promise<Array<{ handleIndex: number; verifyingKey: string }>> {
  const rosterKeys = new Set(roster.keys.map((k) => k.toLowerCase()));
  const indices    = await listPersonaRoots(storageDir);
  const candidates: Array<{ handleIndex: number; verifyingKey: string }> = [];
  const seen       = new Set<string>();
  for (const handleIndex of indices) {
    const root = await generateOrLoadPersonaGroupRoot(storageDir, handleIndex);   // loads a HELD root; never mints here (founder-side)
    const vk   = root.verifyingKey.toLowerCase();
    if (!rosterKeys.has(vk) || seen.has(vk)) continue;   // only a seated, not-yet-counted key counts toward quorum
    seen.add(vk);
    candidates.push({ handleIndex, verifyingKey: vk });
    if (candidates.length >= roster.threshold) break;
  }
  if (candidates.length < roster.threshold) {
    throw new NexusKapaeError(
      `sub-quorum REFUSED (fail-closed): the vessel holds ${candidates.length} seated persona-root(s), but a valid antigen act carries ${roster.threshold} distinct founding-kahu signatures. ` +
      `A real cabal collects the missing signature(s) from the other founding kahu (a collect-signatures ceremony, unbuilt).`,
    );
  }
  return candidates;
}

/**
 * Raise a ban (`kapae`) or mint a lift (`un_kapae`) on `nym` — sign a monotone antigen entry with ≥ threshold
 * held founding persona-roots and LAND it on the always-carried board. The lift lands at a STRICTLY HIGHER
 * version than any standing entry for the nym (the fold requires it), because the new version reads `max + 1`
 * over every prior entry for that nym. FAILS CLOSED before any write: unseated charter, sub-quorum, malformed
 * nym, or a self-verify miss all REFUSE with nothing written.
 */
export async function runNexusKapae(opts: NexusKapaeOptions): Promise<NexusKapaeResult> {
  const storageDir = opts.storageDir ?? larDataDir();
  const nym        = opts.nym.trim().toLowerCase();
  if (!NYM_RE.test(nym)) {
    throw new NexusKapaeError(`"${opts.nym}" is not a valid presenter nym — expected a 64-hex ed25519 verifying key.`);
  }

  const roster   = seatedRosterOrRefuse(opts.sealHome);
  const selected = await selectHeldQuorumSigners(storageDir, roster);

  const nexusPubkey = await loadVesselVerifyingKey(storageDir);
  const boardUrl    = kapaeAntigenDocUrl(nexusPubkey);
  const repo        = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  try {
    const handle = await materializeSharedLarDoc(repo, boardUrl, "board:kapae-antigen");

    // Monotone version: strictly above every prior entry for this nym, so a lift always supersedes a standing
    // ban and a re-ban always supersedes a lift (the fold keeps the highest-version verified entry per nym).
    const priorVersion = maxVersionForNym(antigenEntriesFromBoard(handle.doc()), nym);
    const version      = (priorVersion ?? 0) + 1;

    // Sign with the held persona-roots — each signer supplies its OWN seed's bare-ed25519 signer (mesh holds
    // no key). loadPersonaGroupRootSeed reads founder-only custody; a joinee never reaches this branch.
    const signers = await Promise.all(selected.map(async (s) => ({
      signer: s.verifyingKey,
      sign:   ed25519SignerFromSeed(await loadPersonaGroupRootSeed(storageDir, s.handleIndex)),
    })));
    const entry: KapaeAntigenEntry = await signAntigenEntry(
      { nym, action: opts.action, version, sealEpochCid: roster.sealEpochCid },
      signers,
    );

    // NEVER write an entry that will not verify — the fold would ignore it, so a written-but-dead ban would
    // read as enforced while enforcing nothing (a false sense of a ban). Self-verify against the live roster.
    const verifier = makeMultiSigQuorumVerifier();
    if (!(await verifier.verifyQuorum(entry, roster))) {
      throw new NexusKapaeError("refusing to write: the signed entry does not verify against the seated roster (fail-closed).");
    }

    handle.change((d) => writeAntigenEntry(d, entry));
    await repo.flush();

    // Re-fold the board to report the ACTUAL enforced state (not the intent) — the loop the ring reads.
    const folded    = await foldAntigenSet(antigenEntriesFromBoard(handle.doc()), roster, verifier);
    const kapaedNow = isKapaed(nym, folded);

    return {
      action: opts.action, nym, version, priorVersion,
      sealEpochCid: roster.sealEpochCid, threshold: roster.threshold,
      signers: selected.map((s) => s.verifyingKey), boardUrl, kapaedNow,
    };
  } finally {
    await repo.flush().catch(() => { /* best-effort final flush on the finally path */ });
  }
}

/** Read the currently-Kapae'd set + the raw board entries (the `--list` fold). Read-only; materializes a blank
 *  board on a cold first boot (denies nobody). FAILS CLOSED to the empty set on an unseated charter. */
export async function runNexusKapaeList(opts: { sealHome: string; storageDir?: string }): Promise<NexusKapaeListResult> {
  const storageDir = opts.storageDir ?? larDataDir();
  const roster     = foundingRoster(readNexusDoc(opts.sealHome));

  const nexusPubkey = await loadVesselVerifyingKey(storageDir);
  const repo        = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  try {
    const handle  = await materializeSharedLarDoc(repo, kapaeAntigenDocUrl(nexusPubkey), "board:kapae-antigen");
    const entries = antigenEntriesFromBoard(handle.doc());
    const folded  = await foldAntigenSet(entries, roster, makeMultiSigQuorumVerifier());
    return {
      sealEpochCid: roster.sealEpochCid,
      threshold:       roster.threshold,
      seatedKeys:      roster.keys.length,
      kapaed:          [...folded].map((k) => k.toLowerCase()).sort(),
      entries:         entries
        .map((e) => ({ nym: e.nym, action: e.action, version: e.version, signers: e.signatures.length }))
        .sort((a, b) => (a.nym === b.nym ? a.version - b.version : a.nym.localeCompare(b.nym))),
    };
  } finally {
    await repo.flush().catch(() => { /* best-effort */ });
  }
}

/** The highest `version` any board entry carries for `nym`, or null when the nym has no standing entry. */
function maxVersionForNym(entries: readonly KapaeAntigenEntry[], nym: string): number | null {
  let max: number | null = null;
  for (const e of entries) {
    if (e.nym.toLowerCase() !== nym) continue;
    if (max === null || e.version > max) max = e.version;
  }
  return max;
}
