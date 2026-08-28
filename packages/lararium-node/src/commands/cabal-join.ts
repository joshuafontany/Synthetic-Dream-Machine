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
  DEFAULT_JOIN_POLICY, alphaFromHalfLife, hexToBytes,
  type CabalInvite, type CabalJoinPolicy, type AdmissionDials, type LineageAdmission,
} from "@lararium/mesh";
import { larDataDir } from "../vessel-paths.js";
import { loadVesselVerifyingKey } from "../node-vessel-identity.js";

const NYM_RE = /^[0-9a-f]{64}$/;

export class CabalJoinError extends Error {}

/** Stands only so a realm that seats no dials still PRICES. A missing dial must not read as an open door. */
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
  /** The instant the lease reads against; a causal island holds no global now. */
  readonly now?:      number;
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
  opts: CabalJoinOptions, nowDefault = Date.now(),
): Promise<CabalJoinResult> {
  const storageDir = opts.storageDir ?? larDataDir();
  const realm = opts.realm.trim().toLowerCase();
  const applicant = opts.applicant.trim().toLowerCase();

  // Refuse before reading a board: a malformed realm finds an empty one and answers "nobody vouched",
  // which reads plausible and says the wrong thing.
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

  const repo = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  let issued: CabalInvite[];
  try {
    const handle = await materializeSharedLarDoc(repo, vouchBoardDocUrl(vesselKey), "board:vouch-registry");
    // The verifying read — an unverified board prices a lineage partly made of noise.
    issued = await verifiedVouchesFromBoard(handle.doc(), realm, verifyOffline);
  } finally {
    await repo.flush();
  }

  const presented = opts.invite ?? issued.find((i) => i.joinerIdentityHex.toLowerCase() === applicant) ?? null;
  // A carried invite JOINS the issued set rather than replacing it: the price reads the realm's whole
  // graph, and an applicant holding their own copy must not shrink it to one edge.
  const forFold = opts.invite && !issued.some((i) => i.sig === opts.invite!.sig)
    ? [...issued, opts.invite]
    : issued;

  return await admitOnLineage({
    policy:            opts.policy ?? DEFAULT_JOIN_POLICY,
    realmDocIdHex:     realm,
    joinerIdentityHex: applicant,
    invite:            presented,
    now:               new Date(opts.now ?? nowDefault),
    verify:            verifyOffline,
    issued:            forFold,
    seed:              vesselKey.toLowerCase(),   // the lineage root every rank folds down from
    applicant,
    dials:             opts.dials ?? FALLBACK_DIALS,
    ...(opts.maxVouchesPerVoucher !== undefined ? { maxVouchesPerVoucher: opts.maxVouchesPerVoucher } : {}),
  });
}
