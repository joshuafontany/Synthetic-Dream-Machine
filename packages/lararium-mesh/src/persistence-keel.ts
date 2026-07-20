/**
 * persistence-keel — the PersistencePalace lifecycle. A persistence pattern-integrity ANY sensorium composes as a
 * cosheaf `#has` cap: it persists content as an immutable TESTIMONY whose only dial is STANDING,
 * earned by distinct-signer witness edges and cooled by a per-instance half-life that IS the
 * maturation mode — differing stable-from-ephemeral by policy values alone.
 *
 * THE STANDING LAW: a persisted trace carries one STANDING dial — only distinct-signer witness
 * edges (polarity +1) raise it, only defeaters (polarity −1) lower it, repetition and recall move
 * it not at all; at the floor the trace rides silent, weighed at floor gain on re-entry, never
 * obeyed. Standing is a KI (cosheaf) quantity — it depends on edges OUTSIDE the trace (distinct
 * signers EXTEND it, local→global), never a li-restriction of the trace itself.
 *
 * THE THREE REGISTERS (never fused): CONFIDENCE — a forward vow of commitment (provisional→canon),
 * seeded before a claim, computed by NOTHING here; a recorder's vow rides `pubinfo` verbatim.
 * STANDING — what witnesses EARN (the Law-of-5s rating ladder r-axis: noise→data→meme→ano→kapu);
 * this, and only this, is the keel's dial. CORRESPONDENCE — Maybe-Logic's pole-shy fuzzy truth,
 * encoded NOWHERE; it lives in the reader.
 *
 * THE MATURATION MODE = the half-life (Keystone-Cutter's collapse): policy.halfLife === null →
 * append-only-witness (authority stores, e.g. the Mempalace: standing never cools, only a defeater
 * lowers it) · policy.halfLife finite → affinity-maturation (ephemeral sensoria: a witness edge's
 * contribution decays by half-life, so un-re-vouched standing cools toward the floor). This
 * completes the 7 biological moves — decay-as-tunable-dial was the one the keel lacked.
 *
 * DERIVE, NEVER STORE: the record persists only content + a signed witness-log; standing and voice
 * derive at read, so a persisted record cannot CLAIM "spoken" without the witnesses backing it.
 *
 * PURITY: platform-blind, immutable, no clock. Decay takes a caller-supplied `now` tick (the FFZ
 * rhythmic address rides in, as fisher-rao's windowedDrift does) — the keel never reads a clock.
 *
 * Standing ceiling law: the mechanical lifecycle NEVER lifts the dial into the top band (kapu,
 * 17..20) — kapu seats by talk-story consensus only; the ceiling pins at 16 (ano's top).
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/persistence-keel
 */

import * as ed25519 from "@noble/ed25519";
import { hexToBytes } from "./crypto.js";

/** The 0..20 STANDING dial's floor/step/ceiling for a testimony's lifecycle. */
export const STANDING_FLOOR = 3;    // born at the noise band — quiet, honest, not failed
export const STANDING_STEP = 4;     // one independent corroborator's worth of earned standing
export const STANDING_CEILING = 16; // ano's top — kapu (17+) seats by talk-story alone

/** PROVENANCE — who spoke (attribution only) + where in causal time (an inlined opaque frontier). */
export interface TestimonyProvenance {
  /** the signing vessel key id — attribution only, nothing more. */
  readonly signer: string;
  /** the ITC frontier at recording, INLINED on the record (no sidecar handle). */
  readonly frontier: string;
}

/** PUBINFO — the record about the record (a recorder's vowed CONFIDENCE rides here). Open; the keel reads none of it. */
export type TestimonyPubinfo = Readonly<Record<string, unknown>>;

/**
 * A WITNESS edge — the single signed shape that merges corroboration and defeat (Cut A). `polarity`
 * +1 vouches (raises standing), −1 defeats (lowers it). `tick` is a monotone time (the FFZ address)
 * the affinity mode decays against; the witness mode ignores it. Array order IS the monotone
 * sequence — no seq field.
 */
export interface Witness {
  readonly signer: string;
  readonly frontier: string;
  readonly polarity: 1 | -1;
  /** monotone time for affinity-mode decay; omitted / ignored under witness mode (halfLife null). */
  readonly tick?: number;
  /**
   * The Ed25519 signature (hex) the signer draws over {@link witnessProofBytes} — the CRYPTOGRAPHIC
   * STRING that turns the `signer` field from a bare claim into a proven vouch/defeat. OPTIONAL for
   * back-compat: an unsigned edge stays a valid log entry the standing law still counts, but
   * {@link verifyWitnessSig} refuses it (deny-by-default). Minted by {@link signWitness}.
   */
  readonly signature?: string;
}

/**
 * The per-instance PERSISTENCE POLICY — the ONE dial that makes one sensorium stable and another
 * ephemeral. `halfLife`: null = append-only-witness (never cools); finite = affinity-maturation
 * (standing cools by this half-life in `tick` units). The mode DERIVES from halfLife — never stored
 * twice. The gate carries NO dial: it decides by comparing two code lengths the store itself
 * measures (see {@link admit}), so a policy has no threshold to set.
 */
export interface PersistencePolicy {
  readonly halfLife: number | null;
}

/** The default authority policy — witness mode (standing never cools; only a defeater lowers it). */
export const WITNESS_POLICY: PersistencePolicy = { halfLife: null };

/** The maturation mode a policy names — derived, never stored. */
export function maturationMode(policy: PersistencePolicy): "witness" | "affinity" {
  return policy.halfLife === null ? "witness" : "affinity";
}

/**
 * A TESTIMONY — one persisted reading, nanopub-shaped: content + provenance + pubinfo + a signed
 * witness-log. Content-blind (`assertion` is any vector — an innovation, a distribution snapshot,
 * a Kumulipo line's embedding); `kind` names its plane for the reader. Standing/voice are NOT
 * stored — read them through {@link reentryPrior}.
 */
export interface Testimony {
  readonly kind: string;
  readonly assertion: readonly number[];
  readonly provenance: TestimonyProvenance;
  readonly pubinfo: TestimonyPubinfo;
  readonly witnesses: readonly Witness[];
}

/** Record a fresh testimony: witness-log empty — silent at the floor, by derivation. */
export function recordTestimony(
  kind: string,
  assertion: readonly number[],
  provenance: TestimonyProvenance,
  pubinfo: TestimonyPubinfo = {},
): Testimony {
  return { kind, assertion, provenance, pubinfo, witnesses: [] };
}

/**
 * A witness edge lands — corroboration (+1) or defeat (−1), one verb (Cut A). Append-only; nothing
 * else changes (standing/voice derive at read). Move-not-delete: a defeat is a flag in the log, it
 * removes nothing.
 */
export function witness(t: Testimony, edge: Witness): Testimony {
  return { ...t, witnesses: [...t.witnesses, edge] };
}

/* ══════════════════ THE WITNESS SIGNATURE — the string the log was always described to carry ══════════════════
 *
 * The keel's header names the witness-log SIGNED, and the standing law only counts DISTINCT-SIGNER edges —
 * but a `signer` field is a bare CLAIM until a key proves it. This block gives the witness edge its
 * cryptographic string: the signer draws an Ed25519 signature over canonical bytes binding the TESTIMONY it
 * attests (by content-address) to its own vouch/defeat, and a verifier re-derives those bytes and checks the
 * signature. It mirrors the wax-stamp floor exactly (proofBytes · mint · verifySig) and rides the SAME
 * @noble/ed25519 the auth-wire and wax-stamp keels already ride — no new crypto enters the stack.
 *
 * WHAT IT ATTESTS — a PAST, never a global now (preserves no-global-now / causal-islands): "signer S,
 * standing at causal frontier F, corroborated (+1) / defeated (−1) the testimony content-addressed by
 * `claimCid`." `frontier` is an ITC bound-past (the same opaque frontier the provenance inlines), so the seal
 * freezes a causal fact — it says nothing about the testimony's LIVE standing, which DERIVES at read from the
 * whole distinct-signer log ({@link reentryPrior}), never from any one signature.
 *
 * OUT OF SCOPE — deliberately: (a) the signature does NOT gate the standing arithmetic. {@link standingUnder}
 * stays signature-blind: it trusts the log it is handed, exactly as wax-stamp's `classifySeal` trusts its
 * injected `verifySig`. A caller admits an edge into the log by running {@link verifyWitnessSig} FIRST
 * (deny-by-default: an absent or bad signature → do not append), so curation happens at the gate, never inside
 * the dial — which is why the unsigned edges the standing-law tests use stay valid. (b) carrying this string
 * THROUGH the dumb python store (persistence_io) so a re-loaded edge still verifies is an owed cross-language
 * fixture (the parity manifest already names the debt) — the sovereign keel mints and checks the seal; the
 * store need not understand it. (c) WHO may witness (authorization) is the caller's policy, not the
 * signature's — the seal proves possession of `signer`'s key and nothing more.
 */

/** The version-tagged, strict `|`-delimited canonical bytes a witness edge signs (the wax-stamp proof shape). */
export function witnessProofBytes(
  claimCid: string,
  edge: Pick<Witness, "signer" | "frontier" | "polarity" | "tick">,
): Uint8Array {
  return new TextEncoder().encode(
    `lar-witness/v1|${claimCid}|${edge.signer}|${edge.frontier}|${edge.polarity}|${edge.tick ?? ""}`,
  );
}

/**
 * Mint a SIGNED witness edge: sign the proof bytes (`claimCid` ← the testimony being attested) with the
 * signer's key. `sign` yields a hex Ed25519 signature; the caller injects the key material (the same
 * injected-`sign` shape as `mintWaxStamp` / `buildAuthResponse` — no keyhive dep enters the keel).
 */
export async function signWitness(input: {
  readonly claimCid: string;
  readonly signer: string;
  readonly frontier: string;
  readonly polarity: 1 | -1;
  readonly tick?: number;
  readonly sign: (bytes: Uint8Array) => Promise<string>;
}): Promise<Witness> {
  const core: Pick<Witness, "signer" | "frontier" | "polarity" | "tick"> = {
    signer: input.signer, frontier: input.frontier, polarity: input.polarity,
    ...(input.tick !== undefined ? { tick: input.tick } : {}),
  };
  const signature = await input.sign(witnessProofBytes(input.claimCid, core));
  return { ...core, signature };
}

/**
 * Verify a witness edge's Ed25519 signature against the testimony it attests (`claimCid`). FAIL-CLOSED: an
 * absent signature, a malformed key/sig, or ANY verify error all read `false` — an unsigned or tampered edge
 * NEVER passes. `signerKeyHex` defaults to the edge's own `signer` (the raw verifying-key hex the mesh uses
 * for identity); a conservative caller MAY pass a trusted key explicitly (the wax-stamp / verifyAuthProof
 * conservative-caller law — never trust a wire-claimed key where a trusted one is held). A `signer` that is
 * not raw verifying-key hex fails the shape guard and forces the caller to supply the trusted key.
 */
export async function verifyWitnessSig(
  claimCid: string,
  edge: Witness,
  signerKeyHex: string = edge.signer,
): Promise<boolean> {
  if (edge.signature === undefined) return false;                 // no string → nothing attested → deny
  if (!/^[0-9a-fA-F]{64}$/.test(signerKeyHex)) return false;      // not a 32-byte verifying key
  if (!/^[0-9a-fA-F]{128}$/.test(edge.signature)) return false;   // not a 64-byte signature
  const msg = witnessProofBytes(claimCid, edge);
  try {
    return await ed25519.verifyAsync(hexToBytes(edge.signature), msg, hexToBytes(signerKeyHex));
  } catch {
    return false;
  }
}

/**
 * The fresh non-self +1 witnesses strictly AFTER the last defeat (−1), one entry per distinct
 * signer keyed to that signer's LATEST fresh edge (for affinity decay). Fresh evidence only —
 * old fluency past a defeat does not count.
 */
function freshIndependentEdges(t: Testimony): Map<string, Witness> {
  let lastDefeat = -1;
  t.witnesses.forEach((w, i) => { if (w.polarity === -1) lastDefeat = i; });
  const bySigner = new Map<string, Witness>();
  t.witnesses.forEach((w, i) => {
    if (w.polarity === 1 && w.signer !== t.provenance.signer && i > lastDefeat) bySigner.set(w.signer, w);
  });
  return bySigner;
}

/**
 * Derive the standing under a policy. Witness mode (halfLife null): floor + step per distinct fresh
 * signer, ceiling-pinned — repetition and recall move nothing. Affinity mode (halfLife finite, `now`
 * given): each distinct fresh signer contributes a step DECAYED by 0.5^((now − tick)/halfLife), so
 * standing cools toward the floor unless re-vouched. `now` absent under affinity → no decay applied
 * (the caller declined to supply a clock).
 */
function standingUnder(t: Testimony, policy: PersistencePolicy, now?: number): number {
  const edges = [...freshIndependentEdges(t).values()];
  if (policy.halfLife === null || now === undefined) {
    return Math.min(STANDING_FLOOR + edges.length * STANDING_STEP, STANDING_CEILING);
  }
  let sum = 0;
  for (const e of edges) {
    const age = e.tick === undefined ? 0 : Math.max(0, now - e.tick);
    sum += STANDING_STEP * Math.pow(0.5, age / policy.halfLife);
  }
  return Math.min(STANDING_FLOOR + sum, STANDING_CEILING);
}

/**
 * The FEP re-entry read — where standing and voice DERIVE (never stored). Returns the value as a
 * low-standing prior for the consumer's arithmetic (weighed, never obeyed), plus the derived
 * standing and voice. A silent testimony still returns (recorded ≠ retrievable ≠ suppressed), at
 * the floor. Pass a policy + `now` for affinity-mode decay; the bare call reads witness mode.
 */
export function reentryPrior(
  t: Testimony,
  policy: PersistencePolicy = WITNESS_POLICY,
  now?: number,
): { readonly value: readonly number[]; readonly standing: number; readonly voice: "silent" | "spoken" } {
  const standing = standingUnder(t, policy, now);
  return { value: t.assertion, standing, voice: standing > STANDING_FLOOR ? "spoken" : "silent" };
}


/* ════════════════════════════ THE ADMISSION GATE ════════════════════════════
 *
 * A claim earns its place iff THE STORE'S OWN CODE CANNOT BEAT IGNORANCE ON IT.
 *
 * ── WHY `−log2 p(c)` IS NOT BITS ──────────────────────────────────────────────
 * For a continuous density, `−log2 p(x)` reads a DIFFERENTIAL entropy, never a code length: a tight
 * density exceeds 1 and the "bits" go NEGATIVE, and no one spends −6.5 bits. A real code length needs a
 * quantization step Δ — Cover & Thomas, *Elements of Information Theory* 2e, Thm 8.3.1 (§8.3): for a
 * Riemann-integrable density, H(X^Δ) + log Δ → h(X), so coding x to precision Δ costs
 * `−log2 p(x) + d·log2(1/Δ)` bits. Δ never cancels against a disk figure (dims × 32 for an f32), so
 * "surprisal > storage cost" compares two DIFFERENT KINDS of quantity and the verdict moves with Δ.
 *
 * ── WHAT DOES CANCEL ──────────────────────────────────────────────────────────
 * Δ cancels EXACTLY between two codes for the SAME object at the SAME precision. So the gate compares two
 * CODES, never a code against a disk figure:
 *
 *     bitsSaved(c) = [−log2 p₀(c) + d·log2(1/Δ)] − [−log2 p₁(c) + d·log2(1/Δ)]
 *                  = log2( p₁(c) / p₀(c) )              ← Δ gone; a real, signed bit-count
 *
 *     ADMIT  ⟺  bitsSaved(c) ≤ 0  ⟺  the store's code prices c WORSE than ignorance does.
 *
 * Zero names no threshold anyone chose: it names the TIE between two code lengths, and taking the shorter
 * code IS the MDL rule (Grünwald, *The Minimum Description Length Principle*, MIT Press 2007; tutorial
 * arXiv math/0406077). The gate carries no dial, and `PersistencePolicy` offers none.
 *
 * ── THE TWO CODES ─────────────────────────────────────────────────────────────
 * p₀ — IGNORANCE: the UNIFORM density on the unit sphere S^(d−1). It carries ZERO parameters and knows
 *      nothing whatever about the store. True ignorance, not a simpler fit.
 * p₁ — THE STORE: a von Mises–Fisher density, `f(x; μ, κ) = C_d(κ)·exp(κ·μᵀx)`, whose log-density runs
 *      LINEAR in the cosine the store already measures. μ and κ come from the mean resultant length
 *      r̄ = ‖Σuᵢ‖/n in closed form — κ̂ ≈ r̄(d − r̄³)/(1 − r̄²) — Banerjee, Dhillon, Ghosh & Sra,
 *      "Clustering on the Unit Hypersphere using von Mises-Fisher Distributions", JMLR 6:1345–1382 (2005).
 *
 * Both densities integrate against the SAME surface measure, so the ratio collapses to
 *
 *     bitsSaved(c) = [ ln(C_d(κ)·Area(S^(d−1))) + κ·cos(c, μ) ] / ln 2
 *
 * and the decision boundary reads as an INFERRED cosine:  cos* = −ln(C_d(κ)·Area) / κ. The store MEASURES
 * its own similarity threshold from its own concentration. Nobody types 0.5.
 *
 * ── WHY THE SPHERE, AND WHAT IT COSTS US ──────────────────────────────────────
 * A diagonal Gaussian is the WRONG family here, and not merely imprecise. Embeddings ride the unit sphere
 * in a narrow anisotropic cone (Ethayarajh, EMNLP 2019; Gao et al., ICLR 2019), so a Gaussian's radial
 * variance reads ~0 and its per-dim scales carry almost no shape signal at d≈384 — a Gaussian-vs-pooled-
 * Gaussian ratio then measures the two codes' DEGREES OF FREEDOM (heavier tails price outliers cheaper)
 * rather than novelty, and MEASURABLY INVERTS: it refuses genuine novelty and admits near-duplicates. The
 * vMF ratio carries no such term because ignorance has no parameters to differ in.
 *
 * The gate therefore reads DIRECTION. It L2-normalizes both the store and the candidate, so two claims
 * differing only in magnitude read as one claim. For an embedding store (already unit-norm) that discards
 * nothing. For a store of unnormalized readings it names a real narrowing, and it names it out loud.
 *
 * ── NEVER A NEIGHBOURHOOD — AND HUBNESS IS THE REASON ──────────────────────────
 * A k-NN population makes p₁ a FUNCTION OF THE CANDIDATE: it then normalizes to nothing, stops being a
 * probability distribution over the claim space, and log2(p₁/p₀) stops being a difference of code lengths
 * at all. Worse, in high dimension a k-NN list is not even local: k-occurrence skews hard, points near the
 * data centroid enter almost every list (hubs) and far points enter none (antihubs) — Radovanović,
 * Nanopoulos & Ivanović, "Hubs in Space", JMLR 11:2487–2531 (2010) — so a distance-based gate admits
 * ANTIHUBS on geometry alone (the swamping effect: high-dim distance outlier detection yields false
 * positives, not false negatives). This gate reads NO neighbours. It reads one running vector sum over the
 * admitted store, which no candidate can steer.
 *
 * ── COST ──────────────────────────────────────────────────────────────────────
 * {@link StoreCode} carries (n, Σ unit-vectors). An admitted claim folds in at O(d). An admit costs O(d)
 * plus one Bessel evaluation. NO store read, NO O(n) scan, NO index probe.
 *
 * ── PREQUENTIAL HONESTY (the anti-manufacture law) ────────────────────────────
 * A model fitted to a store and then asked whether a member of that store looks novel manufactures its own
 * finding. Here a candidate is ALWAYS priced by a code built from claims strictly BEFORE it — Dawid's
 * prequential principle (JRSS-A 147:278–292, 1984; Grünwald 2007 ch. 6). {@link prequentialBits} replays
 * that and returns the cumulative ledger: if the store's code does not beat uniform over its own history,
 * the store learned NOTHING and every verdict it issued read as a coin-flip. The instrument reports its own
 * blindness — measured, on a directionless store, it does exactly that.
 */

/** ln Γ(x) — Lanczos g=7, n=9. Pure, deterministic, CPU. */
function lnGamma(x: number): number {
  const G = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let a = G[0]!;
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += G[i]! / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * ln I_ν(κ), the modified Bessel function of the first kind — the vMF normalizer's one hard term.
 *
 * Two regimes, both verified against `scipy.special.ive` to |err| < 1e-13 (series) and < 3e-6 (asymptotic):
 * the ascending power series carries κ ≤ 3000 exactly under a log-sum-exp; past that the UNIFORM asymptotic
 * expansion (Abramowitz & Stegun 9.7.7) takes over, which holds for every ν once κ runs large. Order ν
 * floors at 0.5 in the asymptotic branch purely to keep η finite — at those κ the correction lands below
 * 1e-5 bits against a verdict measured in hundreds.
 */
function lnBesselI(nu: number, kappa: number): number {
  if (kappa <= 3000) {
    const terms: number[] = [];
    const N = Math.ceil(kappa / 2) + 80;
    const lnHalfK = Math.log(kappa / 2);
    for (let j = 0; j < N; j++) terms.push((2 * j + nu) * lnHalfK - lnGamma(j + 1) - lnGamma(nu + j + 1));
    let m = -Infinity;
    for (const t of terms) if (t > m) m = t;
    let s = 0;
    for (const t of terms) s += Math.exp(t - m);
    return m + Math.log(s);
  }
  const v = Math.max(nu, 0.5);
  const z = kappa / v;
  const s = Math.sqrt(1 + z * z);
  const eta = s + Math.log(z) - Math.log(1 + s);
  return -0.5 * Math.log(2 * Math.PI * v) + v * eta - 0.25 * Math.log(1 + z * z);
}

/**
 * ln[ C_d(κ) · Area(S^(d−1)) ] — the vMF's log-density ADVANTAGE over uniform at the mode, before the
 * cosine tilt. This single term carries the whole "what does the store know" side of the ledger, and it is
 * what makes the threshold inferred: cos* = −this/κ.
 */
function lnTilt(dims: number, kappa: number): number {
  const nu = dims / 2 - 1;
  return nu * Math.log(kappa) - (dims / 2) * Math.LN2 - lnBesselI(nu, kappa) + Math.LN2 - lnGamma(dims / 2);
}

/** L2-normalize; a zero vector stays zero (it carries no direction to judge). */
function unit(v: readonly number[]): number[] {
  let sq = 0;
  for (const x of v) sq += x * x;
  const n = Math.sqrt(sq);
  return n > 0 ? v.map((x) => x / n) : v.slice();
}

/**
 * THE STORE'S CODE — the count and the running SUM OF UNIT VECTORS over the ADMITTED claims. That sum is
 * the vMF's complete sufficient statistic (Mardia & Jupp, *Directional Statistics*, Wiley 2000, ch. 9), so
 * the store carries its own model in O(d) bytes and updates it in O(d) time. Immutable.
 */
export interface StoreCode {
  readonly dims: number;
  readonly n: number;
  /** Σ of the admitted claims' unit vectors — the vMF sufficient statistic. */
  readonly sum: readonly number[];
}

/** An empty code — the store before first light. */
export function emptyStoreCode(dims: number): StoreCode {
  return { dims, n: 0, sum: new Array<number>(dims).fill(0) };
}

/** Fold one ADMITTED claim into the code. O(d), exact, no re-read of the store. */
export function observeClaim(code: StoreCode, claim: readonly number[]): StoreCode {
  const u = unit(claim);
  const sum = code.sum.slice();
  for (let i = 0; i < code.dims; i++) sum[i]! += u[i] ?? 0;
  return { dims: code.dims, n: code.n + 1, sum };
}

/** Rebuild a code from a population (a uniform draw of the store, or the whole store). O(n·d), once. */
export function storeCodeFrom(population: readonly (readonly number[])[], dims: number): StoreCode {
  let code = emptyStoreCode(dims);
  for (const row of population) code = observeClaim(code, row);
  return code;
}

/** The gate's verdict WITH its full ledger — an honest refusal the caller enacts, never a silent drop. */
export interface AdmitVerdict {
  readonly admit: boolean;
  /** bits the STORE'S code saves over UNIFORM when transmitting this claim; ≤ 0 admits. Real, signed bits. */
  readonly bitsSaved: number;
  /** the candidate's cosine to the store's mean direction — what the store actually measured. */
  readonly cosine: number;
  /** the INFERRED decision cosine: admit iff `cosine < cosStar`. Derived from κ and d; nobody typed it. */
  readonly cosStar: number;
  /** the store's fitted concentration — how sharply it believes it knows its own shape. */
  readonly kappa: number;
  /** the mean resultant length ‖Σuᵢ‖/n ∈ [0,1] — 0 = the store points nowhere, 1 = one direction only. */
  readonly rbar: number;
  /** the same verdict as a signed magnitude a caller may rank; identical to {@link bitsSaved}. */
  readonly score: number;
}

const NOTHING_TO_SAY: AdmitVerdict = {
  admit: true, bitsSaved: 0, cosine: 0, cosStar: 0, kappa: 0, rbar: 0, score: 0,
};

/**
 * THE GATE. Admit iff the store's own code cannot beat uniform ignorance on this claim.
 *
 * Hand it a {@link StoreCode} (the live path — O(d), no store read) or a population (rebuilt once, for a
 * cold seed or a test). NEVER a k-nearest neighbourhood: a candidate-selected population breaks the code's
 * normalization outright, and in high dimension it reads hubness rather than novelty. See the header.
 *
 * Degenerate readings, every one resolved WITHOUT a chosen number:
 *  · n < 2 → the store holds no direction worth the name → ADMIT (first light carries every bit it has).
 *  · r̄ → 0 (the store points nowhere) → κ → 0 → the store's code IS uniform → it saves nothing → ADMIT.
 *    An honest gate on a directionless store refuses nothing, and says so through `rbar`.
 *  · r̄ → 1 (the store holds one direction) → κ → ∞ → ADMIT iff the candidate points anywhere else at all.
 */
export function admit(
  candidate: readonly number[],
  population: readonly (readonly number[])[] | StoreCode,
  _policy: PersistencePolicy = WITNESS_POLICY,
): AdmitVerdict {
  const dims = candidate.length;
  if (dims < 2) return { ...NOTHING_TO_SAY, admit: false };   // no sphere below 2 dims; nothing to judge

  const code: StoreCode = Array.isArray(population)
    ? storeCodeFrom(population as readonly (readonly number[])[], dims)
    : (population as StoreCode);
  if (code.n < 2) return { ...NOTHING_TO_SAY, bitsSaved: -Infinity, score: -Infinity };

  let sq = 0;
  for (const s of code.sum) sq += s * s;
  const norm = Math.sqrt(sq);
  const raw = norm / code.n;
  if (norm === 0) return NOTHING_TO_SAY;                      // the store cancels to nothing: uniform, exactly

  const uc = unit(candidate);
  let cosine = 0;
  for (let i = 0; i < dims; i++) cosine += (code.sum[i]! / norm) * (uc[i] ?? 0);

  // THE SMALL-SAMPLE CHARGE, EXACT AND UNTYPED. The raw mean resultant length runs BIASED UP: even for
  // perfectly uniform directions, E[R̄²] = 1/n exactly (the cross terms E[uᵢ·uⱼ] vanish, the n diagonal
  // terms give 1 apiece), in EVERY dimension. So a plug-in κ̂ on a young store reads concentration that
  // pure chance put there, and the gate would refuse the world on two claims. Subtracting that expectation
  // gives ρ̂² = (n·R̄² − 1)/(n − 1), an EXACTLY unbiased estimator of the population resultant ρ² (the
  // Rayleigh statistic's first moment — Mardia & Jupp, *Directional Statistics*, Wiley 2000, §10.4). This
  // IS the model's complexity charge: the store may only claim the concentration it did not get for free.
  const rho2 = (code.n * raw * raw - 1) / (code.n - 1);
  const rbar = rho2 > 0 ? Math.sqrt(rho2) : 0;

  if (rbar >= 1) {
    // Every admitted claim points the SAME way; the store's code is a spike. Anything off it is unpriceable.
    const same = cosine >= 1;
    return { admit: !same, bitsSaved: same ? Infinity : -Infinity, cosine, cosStar: 1, kappa: Infinity, rbar, score: same ? Infinity : -Infinity };
  }

  const kappa = (rbar * (dims - rbar * rbar * rbar)) / (1 - rbar * rbar);   // Banerjee et al. 2005
  if (!(kappa > 0)) return { ...NOTHING_TO_SAY, cosine, rbar };             // no earned concentration: uniform

  const tilt = lnTilt(dims, kappa);
  // The candidate's code length under the store, MINUS its code length under uniform. Δ, the quantization
  // step, sat in BOTH and cancelled; what remains counts real bits.
  const bitsSaved = (tilt + kappa * cosine) / Math.LN2;
  const cosStar = -tilt / kappa;
  return { admit: bitsSaved <= 0, bitsSaved, cosine, cosStar, kappa, rbar, score: bitsSaved };
}

/**
 * THE PREQUENTIAL CALIBRATION — the gate's own honesty check, and the only certification it accepts.
 *
 * Replay a claim stream through the LIVE gate: each claim priced by a code built from the claims admitted
 * strictly BEFORE it, and folded in only if it was admitted. Accumulate the ledger. A positive
 * `bitsSaved` says the store's code genuinely beats uniform on its own history — it learned a direction, and
 * its refusals stand on that. A `bitsSaved` at or below zero says the store learned NOTHING uniform did not
 * already know, and every verdict it issued read as a coin-flip on noise. Run this before trusting a gate on
 * a new corpus; a gate that cannot beat ignorance has manufactured its finding.
 */
export function prequentialBits(
  stream: readonly (readonly number[])[],
  dims: number,
): { readonly bitsSaved: number; readonly admitted: number; readonly seen: number } {
  let code = emptyStoreCode(dims);
  let bitsSaved = 0;
  let admitted = 0;
  for (const x of stream) {
    const v = admit(x, code);
    if (Number.isFinite(v.bitsSaved)) bitsSaved += v.bitsSaved;
    if (v.admit) { admitted++; code = observeClaim(code, x); }   // the code sees a claim only AFTER judging it
  }
  return { bitsSaved, admitted, seen: stream.length };
}
