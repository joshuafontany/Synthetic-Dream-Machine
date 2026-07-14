/**
 * admission-price — the gate as a PRICE, composed from parts that already stood.
 *
 * NOTHING NEW GETS INVENTED HERE. `lineage-rank` supplies the seed-rooted vouch mass; `conviction-dial`
 * supplies the 1Hive convex bar and the half-life decay; `capture-reading` supplies the discipline this
 * file obeys. The one thing missing was the seam between them, and a seam is all this is.
 *
 * WHY A PRICE AND NOT A PREDICATE. A boolean gate has a CLIFF, and no parameter smooths a cliff — so
 * "invite-only now, open protocol later" could never be a dial while admission stayed a yes/no. Make it a
 * COST and the same fold spans both: set the cost of an UNRANKED applicant to unpayable and the mesh is
 * invite-only; set it finite and the protocol is open. One number, no rewrite.
 *
 * WHY THE COST RISES WITH CONCENTRATION. A vouch DAG where vouching costs nothing is positive feedback: the
 * founders' descendants hold the mass, they vouch the most, and the lineage collapses into an oligarchy of
 * the early. The 1Hive curve is the stabiliser — `ρ·S / (1−α) / (β − r)²` — cheap while power stays
 * dispersed, asymptotically IMPOSSIBLE as one cluster nears the operator's ceiling β. It is Turrigiano's
 * multiplicative renormalisation and Ogilvie's cartel warning answered by the same convex wall: THE GATE AND
 * THE CARTEL ARE THE SAME MACHINE, so the machine must price the cartel out of itself as it forms.
 *
 * WHY THE VOUCHER'S BUDGET IS SCARCE AND NOT POLICED. The germinal centre never picked a threshold: it made
 * help LIMITING, so admission became a rank against siblings rather than a cutoff cleared. Mass conservation
 * in `lineage-rank` gives us that for free — a voucher's score SPLITS across everyone it vouches for, so
 * vouching for one more IS vouching less for everyone else. The co-pay falls out as a CONSERVATION LAW.
 *
 *     YOU PAY WHEN YOU VOUCH. NEVER WHEN THEY BETRAY.
 *
 * That distinction is load-bearing, and it is what makes the co-pay survivable at all: charging a voucher
 * for a betrayal requires the NEWS OF THE BETRAYAL TO ARRIVE, and a negative fact cannot be made to arrive
 * (CRLs, OCSP, PGP revocation, CT's gossip layer, and the Maghribi coalition of the 11th century, all dead
 * in the same place). A conservation law needs no messenger.
 *
 * VERDICT-FREE, like the reading it mirrors. This returns a PRICE and the parts it was built from. It does
 * not admit anyone. The caller decides what it can afford — and an operator who wants the cliff back can
 * always compare the price to a wall of their own choosing.
 *
 * Design-of-record (an OUTLINE, unproven): lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage
 */
import { captureThreshold } from "./conviction-dial.js";
import { rankLineage, type VouchEdge, type LineageRank } from "./lineage-rank.js";

/** The operator's fairness settings. NUMBERS ARE NEVER CHOSEN HERE — they arrive, and the operator owns them. */
export interface AdmissionDials {
  /** ε ∈ (0,1) — the lineage-rank reset. THE closed↔open dial: high keeps trust tight to the seed. */
  readonly epsilon: number;
  /** β ∈ (0,1) — the named "this-is-capture" ceiling. The convex wall blows up as concentration nears it. */
  readonly beta: number;
  /** ρ, S — the 1Hive curve's shape and supply. */
  readonly rho: number;
  readonly supply: number;
  /** α — the decay rate, from `alphaFromHalfLife(h)`. NEVER hand-picked; the half-life is the human dial. */
  readonly alpha: number;
}

export interface AdmissionPrice {
  /** What this crossing COSTS. Infinity = unpayable, which is what invite-only looks like from outside. */
  readonly price: number;
  /** The applicant's seed-rooted rank. ABSENT from the lineage → 0, which reads UNRANKED, never REFUSED. */
  readonly rank: number;
  /** r — the vouching cluster's share of the whole lineage's mass ∈ [0,1). 1 = one hand holds every vouch. */
  readonly concentration: number;
  /** β − r. At or below zero, the cluster sits at the operator's ceiling and the wall is vertical. */
  readonly headroom: number;
  /** The full rank, so a caller may read the lineage rather than trust this summary of it. */
  readonly lineage: LineageRank;
}

/**
 * The share of the lineage's total mass held by ONE cluster — the vouch-side twin of `capture-reading`'s
 * maintenance concentration. That one asks "whose hands keep this place alive?"; this asks "whose hands hold
 * the power to let people IN?". Both are real, and they are not the same question.
 *
 * An empty or unreachable cluster reads 0 — dispersed, not captured. Absence is never evidence.
 */
export function vouchConcentration(rank: LineageRank, cluster: readonly string[]): number {
  let total = 0;
  for (const s of rank.score.values()) total += s;
  if (total <= 0) return 0;
  let held = 0;
  for (const v of cluster) held += rank.score.get(v) ?? 0;
  return held / total;
}

/**
 * Price a crossing.
 *
 * The applicant's own RANK discounts the price — a deep-standing lineage makes an introduction cheap,
 * which is what "a deep-rep voucher shortens the path" was always reaching for. The vouching cluster's
 * CONCENTRATION raises it, convexly, without limit, as that cluster approaches the operator's ceiling.
 *
 * An UNRANKED applicant (rank 0) prices at the bar itself, undiscounted. Set the bar high and that is
 * invite-only; set it low and the protocol is open. THE SAME FOLD SPANS BOTH — and nothing here changes when
 * the operator turns it, which is the only reason "later" can ever be a turn rather than a rewrite.
 *
 * REFUSAL IS ANERGY. This never bans, never remembers an enemy, never writes anything down. An applicant who
 * cannot pay today simply does not cross today, and may return with a voucher who raises its rank.
 */
export function priceAdmission(args: {
  readonly seed:      string;
  readonly edges:     readonly VouchEdge[];
  readonly applicant: string;
  /** The cluster whose concentration the wall reads — typically the applicant's voucher and its lineage. */
  readonly cluster:   readonly string[];
  readonly dials:     AdmissionDials;
}): AdmissionPrice {
  const { seed, edges, applicant, cluster, dials } = args;

  const lineage = rankLineage(seed, edges, { epsilon: dials.epsilon });
  // A cyclic edge set is a CORRUPTED lineage, not a cheap one. It prices as unpayable rather than scoring a
  // graph whose meaning we cannot vouch for — the one place this file refuses instead of pricing.
  if (!lineage.acyclic) {
    return { price: Infinity, rank: 0, concentration: 1, headroom: -1, lineage };
  }

  const rank = lineage.score.get(applicant) ?? 0;   // absent = UNRANKED = the floor, never a verdict
  const r    = vouchConcentration(lineage, cluster);
  const bar  = captureThreshold(r, dials.beta, dials.rho, dials.supply, dials.alpha);

  // The rank DISCOUNTS the bar. Rank 0 pays the bar entire; a well-rooted applicant pays a fraction of it.
  // Division, not subtraction: a subtractive discount could drive the price negative and pay people to
  // enter, and any curve that can pay an attacker to arrive has stopped being a gate.
  const price = rank > 0 ? bar / (1 + rank) : bar;

  return { price, rank, concentration: r, headroom: dials.beta - r, lineage };
}
