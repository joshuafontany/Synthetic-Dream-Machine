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
import {
  canonicalIdentity, vouchDagFromInvites, type CappedVouch, type VouchKeyResolver,
} from "./vouch-dag.js";
import type { VouchEdge } from "./lineage-rank.js";

/** Why a crossing did not clear — the invite gate's own refusals, plus the one the price wall raises. */
export type AdmissionRefusal =
  | JoinRefusal         // the structural gate refused (no-invite / wrong-place / wrong-joiner / expired / bad-signature)
  | "at-the-ceiling";   // the invite cleared, but the vouching cluster sits at β — the convex wall stands vertical

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
 * THE APPLICANT BRINGS NOTHING. There is no budget, balance, or fee to clear — the limiting resource stands
 * SELF-STANDING, and the cost falls on the VOUCHER, paid by dilution the moment they vouch (a voucher's score
 * splits across everyone it vouches for, so vouching spends the only thing it can spend: its own standing).
 * A crossing therefore clears iff the invite gate admits AND the convex wall has not gone vertical.
 *
 * An `open` policy skips the invite requirement but STILL prices — open means "no invite needed", never
 * "free": the wall keeps pricing the cartel out whichever way the invite dial is set.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage#the-standing
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

  // The wall refuses ITSELF. At r ≥ β the convex curve returns a non-finite price — not a large number to
  // compare against something, an actual wall. No budget rides here because the applicant brings none: the
  // cost falls on the VOUCHER, paid by dilution at the moment of vouching, and a cluster that has vouched
  // its way to the ceiling prices its next crossing at infinity whatever anyone brought.
  if (!Number.isFinite(price.price)) {
    return voucher
      ? { admitted: false, refusal: "at-the-ceiling", voucherDid: voucher, price }
      : { admitted: false, refusal: "at-the-ceiling", price };
  }
  return voucher ? { admitted: true, voucherDid: voucher, price } : { admitted: true, price };
}

/** A verdict that also reports what the per-voucher cap turned away while folding the lineage. */
export interface LineageAdmission extends AdmissionVerdict {
  /** Edges the cap refused, in arrival order — the attack-edge budget made VISIBLE, never silently short. */
  readonly capped: readonly CappedVouch[];
}

/**
 * Admit on a lineage — the whole crossing from the ISSUED INVITES, cap and all.
 *
 * `admitToDreamnet` takes `edges` already folded, which leaves a caller free to assemble them by hand. That
 * hand-assembly SKIPS the per-voucher cap, and the cap is not a convenience: it is the choke that bounds the
 * mass any single hand injects into the lineage. A gate whose choke depends on the caller remembering to run
 * it has no choke. So this seam takes the invites THEMSELVES and folds them here, where the cap cannot be
 * left out — the same designation-carries-authority discipline the rest of the mesh holds.
 *
 * What the fold turned away rides back in `capped` rather than vanishing, so a caller reads the budget it
 * spent instead of trusting a graph that came back quietly shorter than the invites it handed in.
 *
 * Platform-blind, like everything here: node and browser compose the identical seam.
 * Meme: lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage#the-standing
 */
export async function admitOnLineage(args: {
  readonly policy:            CabalJoinPolicy;
  readonly placeDocIdHex:     string;
  readonly joinerIdentityHex: string;
  /** The invite THIS applicant presents — the structural signal-2. */
  readonly invite:            CabalInvite | null;
  readonly now:               Date;
  readonly verify:            (bytes: Uint8Array, sigHex: string, voucherDid: string) => Promise<boolean>;
  /** Every invite the place has issued — the lineage's raw material, folded here and never before. */
  readonly issued:            readonly CabalInvite[];
  readonly seed:              string;
  readonly applicant:         string;
  readonly dials:             AdmissionDials;
  /** The choke on any one hand's out-degree. Absent → uncapped, which is a DELIBERATE operator turn. */
  readonly maxVouchesPerVoucher?: number;
  readonly vouchKeyOf?:       VouchKeyResolver;
}): Promise<LineageAdmission> {
  const dag = vouchDagFromInvites(args.issued, {
    ...(args.vouchKeyOf !== undefined ? { vouchKeyOf: args.vouchKeyOf } : {}),
    ...(args.maxVouchesPerVoucher !== undefined ? { maxVouchesPerVoucher: args.maxVouchesPerVoucher } : {}),
  });
  const verdict = await admitToDreamnet({
    policy:            args.policy,
    placeDocIdHex:     args.placeDocIdHex,
    joinerIdentityHex: args.joinerIdentityHex,
    invite:            args.invite,
    now:               args.now,
    verify:            args.verify,
    edges:             dag.edges,
    seed:              args.seed,
    applicant:         args.applicant,
    dials:             args.dials,
  });
  return { ...verdict, capped: dag.capped };
}
