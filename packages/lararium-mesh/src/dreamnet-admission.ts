/**
 * dreamnet-admission — the SEAM that admits, composing the two signals into one verdict.
 *
 * The two gates stand apart and complete: `cabal-invite` answers the STRUCTURAL question (does a licensed
 * member vouch for this joiner, into THIS place, unexpired?) and `admission-price` answers the MARGINAL one
 * (what does this crossing cost, given the applicant's lineage rank and the vouching cluster's
 * concentration?). Admission runs both, in that order, and reports the FIRST that refuses.
 *
 * WHY THE INVITE COMES FIRST. The structural check is cheap, offline, and decisive: no invite under an
 * invite-only policy ends the crossing before any lineage is walked. Pricing an applicant nobody vouched for
 * would compute a number no one can pay and call it a refusal — the invite gate says the same thing sooner,
 * and names WHY (no-invite / wrong-place / wrong-joiner / expired / bad-signature) where a bare price cannot.
 *
 * WHY THE VOUCHER ANCHORS THE PRICE. The invite already names the voucher who staked their standing; that
 * same voucher IS the cluster whose concentration the convex wall reads. So the two gates share one fact —
 * the co-pay falls on the hand that signed the invite — and the caller never has to name the cluster twice.
 *
 * REFUSAL IS ANERGY, END TO END. Neither gate bans, remembers, or writes anything down. An applicant refused
 * for want of an invite, or priced out by a cluster nearing the ceiling, stays at the floor and may return
 * with a stronger vouch. This composition adds no memory of its own.
 *
 * VERDICT-BEARING, NOT VERDICT-DECIDING. It returns whether the crossing clears and what it cost; it admits
 * no one and mints no membership. The keyhive ceremony (`runApplyAdmitPayload`) runs BEHIND a cleared verdict,
 * one layer up, where the platform lives — this module holds no key and touches no store.
 *
 * Platform-blind: rides ./cabal-invite + ./admission-price only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lares/api/pono/lararium-identity#the-siege-gate
 */
import {
  decideCabalJoin, type CabalInvite, type CabalJoinPolicy, type JoinRefusal,
} from "./cabal-invite.js";
import { priceAdmission, type AdmissionDials, type AdmissionPrice } from "./admission-price.js";
import { canonicalIdentity } from "./vouch-dag.js";
import type { VouchEdge } from "./lineage-rank.js";

/** Why a crossing did not clear — the invite gate's own refusals, plus the one the price wall raises. */
export type AdmissionRefusal =
  | JoinRefusal      // the structural gate refused (no-invite / wrong-place / wrong-joiner / expired / bad-signature)
  | "unaffordable";  // the invite cleared, but the priced crossing exceeds what the applicant brought

export interface AdmissionVerdict {
  /** The crossing cleared BOTH gates. */
  readonly admitted: boolean;
  /** Present only on a refusal — names the FIRST gate that refused, so the applicant knows what to change. */
  readonly refusal?: AdmissionRefusal;
  /** The voucher who staked their standing, on an admission — the hand the co-pay falls on. */
  readonly voucherDid?: string;
  /** The price the crossing cleared — present whenever the invite gate passed and pricing ran. */
  readonly price?: AdmissionPrice;
}

/**
 * Admit a joiner to a DreamNet place — the whole gate, both signals.
 *
 * The `budget` is what the applicant brought to pay; the caller owns where it comes from (a stake, a burn, a
 * standing balance). A crossing clears iff the invite gate admits AND the priced crossing sits within budget.
 * An `open` policy skips the invite requirement but STILL prices — open means "no invite needed", never
 * "free": the convex wall keeps pricing the cartel out whichever way the invite dial is set.
 */
export async function admitToDreamnet(args: {
  readonly policy:            CabalJoinPolicy;
  readonly placeDocIdHex:     string;
  readonly joinerIdentityHex: string;
  readonly invite:            CabalInvite | null;
  readonly now:               Date;
  readonly verify:            (bytes: Uint8Array, sigHex: string, voucherDid: string) => Promise<boolean>;
  /** The seed-rooted vouch DAG the lineage price walks. */
  readonly edges:             readonly VouchEdge[];
  /** The lineage seed — the root standing every rank folds down from. */
  readonly seed:              string;
  /** The applicant's identity as it appears in the vouch DAG (its rank discounts the price). */
  readonly applicant:         string;
  /** The operator's fairness settings — arrived, never chosen here. */
  readonly dials:             AdmissionDials;
  /** What the applicant brought to pay. The crossing clears only if the price sits within it. */
  readonly budget:            number;
}): Promise<AdmissionVerdict> {
  // Signal-2 first: cheap, offline, and it names its own refusal where a price cannot.
  const structural = await decideCabalJoin({
    policy:            args.policy,
    placeDocIdHex:     args.placeDocIdHex,
    joinerIdentityHex: args.joinerIdentityHex,
    invite:            args.invite,
    now:               args.now,
    verify:            args.verify,
  });
  if (!structural.admitted) {
    return structural.refusal ? { admitted: false, refusal: structural.refusal } : { admitted: false };
  }

  // The invite's voucher IS the cluster the convex wall reads. Under `open` there may be no voucher; then the
  // cluster is empty, which reads as dispersed (concentration 0), never as captured — absence is not evidence.
  // The voucher rides raw from the invite and the applicant from the caller; both must read in the SAME
  // canonical space as the feeder's edges, or the price walks a graph they never touch (vouch-dag).
  const voucher = structural.voucherDid;   // present under invite-only, absent under `open`
  const cluster = voucher ? [canonicalIdentity(voucher)] : [];
  const price = priceAdmission({
    seed:      args.seed,
    edges:     args.edges,
    applicant: canonicalIdentity(args.applicant),
    cluster,
    dials:     args.dials,
  });

  if (price.price > args.budget) {
    return voucher
      ? { admitted: false, refusal: "unaffordable", voucherDid: voucher, price }
      : { admitted: false, refusal: "unaffordable", price };
  }
  return voucher ? { admitted: true, voucherDid: voucher, price } : { admitted: true, price };
}
