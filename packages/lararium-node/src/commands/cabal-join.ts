/**
 * runCabalJoin — the applicant's half of the cabal contract. A vouch stakes; this crosses.
 *
 * Calls `admitOnLineage`, never `admitToRealm`: the latter takes a pre-folded DAG, which puts the
 * per-voucher cap in the caller's hands, and a choke the caller may forget chokes nothing.
 *
 * Reads only. A refused applicant anergizes — this writes nothing and bans nobody; Kapae stands as a
 * separate quorum-signed act.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage#/the-standing
 */

import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import * as ed from "@noble/ed25519";
import {
  admitOnLineage, verifiedVouchesFromBoard, vouchBoardDocUrl, materializeSharedLarDoc,
  leaseEpochPrefix, effectiveLeaseEpoch,
  DEFAULT_JOIN_POLICY, alphaFromHalfLife, hexToBytes,
  type CabalInvite, type CabalJoinPolicy, type AdmissionDials, type LineageAdmission,
} from "@lararium/mesh";
import { larDataDir } from "../vessel-paths.js";
import { loadVesselVerifyingKey } from "../node-vessel-identity.js";

const NYM_RE = /^[0-9a-f]{64}$/;

export class CabalJoinError extends Error {}

/**
 * The realm's effective lease epoch, folded off the board doc — max over every per-writer slot.
 *
 * NO CLOCK, BY CONSTRUCTION. `epoch-lease` holds the epoch as a coordinator-free max-register in
 * per-writer slots: two concurrent rolls both land effective+1 in their own slot and the maximum
 * never decreases. Every replica that has seen the same board therefore reads the same fence, which
 * is the property a timestamp cannot give and the reason admission stopped taking an instant.
 *
 * An absent slot-set reads 0 — a realm that has rolled nothing yet, not an open gate: an invite bound
 * at 0 stands until the first roll, and one bound behind 0 cannot exist.
 */
export function realmLeaseEpoch(doc: unknown, realmDocIdHex: string): number {
  const tiddlers = (doc as { tiddlers?: Record<string, { text?: unknown }> } | null)?.tiddlers;
  if (!tiddlers) return 0;
  const prefix = leaseEpochPrefix(realmDocIdHex);
  const slots: string[] = [];
  for (const [title, rec] of Object.entries(tiddlers)) {
    if (!title.startsWith(prefix)) continue;
    if (typeof rec?.text === "string") slots.push(rec.text);
  }
  return effectiveLeaseEpoch(slots);
}

/**
 * The fairness dials a crossing falls back to. ARRIVED AT, NEVER CHOSEN HERE — a realm that seats its
 * own carries them on its charter; these stand only so a realm that seats none still PRICES, because a
 * missing dial must never read as an open door.
 */
const FALLBACK_DIALS: AdmissionDials = {
  epsilon: 0.15,
  beta:    0.35,
  rho:     0.002,
  supply:  1_000_000,
  alpha:   alphaFromHalfLife(30),
};

export interface CabalJoinOptions {
  readonly realm:     string;
  /** Usually a face this vessel does not hold — the gate never assumes the applicant is local. */
  readonly applicant: string;
  /**
   * The realm's effective lease epoch to read against.
   *
   * A causal island holds no global now, so this is a FENCE rather than an instant: the max over the
   * realm's per-writer lease slots. Absent → read off the board itself, which is what a replica
   * converging on that board already agrees to.
   */
  readonly epoch?:    number;
  /** An invite carried out of band, for a joiner the realm's board has not reached. Same gate either way. */
  readonly invite?:   CabalInvite | null;
  /** The choke on one hand's out-degree. Absent → uncapped, a deliberate operator turn. */
  readonly maxVouchesPerVoucher?: number;
  readonly policy?:   CabalJoinPolicy;
  readonly dials?:    AdmissionDials;
  readonly storageDir?: string;
}

export type CabalJoinResult = LineageAdmission;

const verifyOffline = (bytes: Uint8Array, sigHex: string, voucherDid: string): Promise<boolean> =>
  ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(voucherDid)).catch(() => false);

export async function runCabalJoin(
  opts: CabalJoinOptions,
): Promise<CabalJoinResult> {
  const storageDir = opts.storageDir ?? larDataDir();
  const realm = opts.realm.trim().toLowerCase();
  const applicant = opts.applicant.trim().toLowerCase();

  // FAIL CLOSED BEFORE A BOARD IS TOUCHED. A malformed realm reads an empty board and comes back
  // "nobody vouched" — a wrong answer wearing a plausible shape, and the shape a caller believes.
  if (!NYM_RE.test(realm)) {
    throw new CabalJoinError(`--realm expects a 64-hex cabal-realm doc id, got "${opts.realm}"`);
  }
  if (!NYM_RE.test(applicant)) {
    throw new CabalJoinError(`the applicant reads as a 64-hex verifying key, got "${opts.applicant}"`);
  }

  const vesselKey = await loadVesselVerifyingKey(storageDir);
  if (!vesselKey) {
    throw new CabalJoinError("this vessel surfaces no verifying key — no board to read the lineage from.");
  }

  let boardEpoch = 0;
  const repo = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  let issued: CabalInvite[];
  try {
    const handle = await materializeSharedLarDoc(repo, vouchBoardDocUrl(vesselKey), "board:vouch-registry");
    // THE VERIFYING READ, the only read that stands. An unverified board carries edges whose
    // signatures never cleared, and the fold would price a lineage partly made of noise.
    issued = await verifiedVouchesFromBoard(handle.doc(), realm, verifyOffline);
    // THE FENCE COMES OFF THE SAME READ. Folding the lease epoch from a second, later look at the
    // board would price a lineage against a fence that had moved beneath it.
    boardEpoch = realmLeaseEpoch(handle.doc(), realm);
  } finally {
    await repo.flush();
  }

  const presented = opts.invite ?? issued.find((i) => i.joinerIdentityHex.toLowerCase() === applicant) ?? null;
  // A CARRIED INVITE JOINS THE ISSUED SET, never replaces it. The lineage prices the realm's whole
  // vouch graph; an applicant holding their own copy must not shrink that graph to the one edge they
  // happen to be carrying.
  const forFold = opts.invite && !issued.some((i) => i.sig === opts.invite!.sig)
    ? [...issued, opts.invite]
    : issued;

  return await admitOnLineage({
    policy:            opts.policy ?? DEFAULT_JOIN_POLICY,
    realmDocIdHex:     realm,
    joinerIdentityHex: applicant,
    invite:            presented,
    // THE REALM'S OWN FENCE, read off the same board the vouches came from — a max-register over the
    // per-writer lease slots, so every replica that has seen this board reads the same number. The
    // clock that used to sit here belonged to the machine being gated.
    effectiveEpoch:    opts.epoch ?? boardEpoch,
    verify:            verifyOffline,
    issued:            forFold,
    // The lineage seed — the root standing every rank folds down from. This vessel roots the realm it
    // serves the board for.
    seed:              vesselKey.toLowerCase(),
    applicant,
    dials:             opts.dials ?? FALLBACK_DIALS,
    ...(opts.maxVouchesPerVoucher !== undefined ? { maxVouchesPerVoucher: opts.maxVouchesPerVoucher } : {}),
  });
}
