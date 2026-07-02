/**
 * testimony-keel — the persistence keystone's LIFECYCLE floor: a sensorium's persisted reading
 * lives as attributed, immutable TESTIMONY (nanopublication shape: assertion ⊥ provenance ⊥
 * pubinfo), born SILENT at a LOW precision, matured ONLY by independent corroboration — never by
 * count — and re-silenced by a defeater flag (move-not-delete).
 *
 * The 2026-07-02 crucible's surviving core, encoded (rhyme-diver-maps#crucible-verdicts):
 *   - FEP precision-prior — re-entry returns {value, precision}: weighed, never obeyed, as
 *     arithmetic. Precision speaks the sensorium's 0..20 confidence-as-gain scale (sensorium-pc).
 *   - recorded ≠ retrievable — a testimony persists whole while SILENT; only corroboration past
 *     the last defeat lets it speak. (The Tonegawa gate-framing was cut; the silent state stays.)
 *   - sincerity ⊥ reliability (Fricker, narrowed) — `signer` warrants attribution/non-forgery
 *     only; reliability rides the corroboration lifecycle, never the signature.
 *   - the frequency-capture defense (ACT-R severed) — NO field counts recalls, and a same-signer
 *     corroboration weighs ZERO however often it repeats: independence = DISTINCT signers
 *     (distinct vessel keys of the two-key atom; under the operator's never-auto-federate ruling,
 *     that is what "independent" honestly means node-side — no theater).
 *   - the surprise gate — admission by novel information (normalized-rate ≈ 0 for a duplicate),
 *     the one causally-safe bloat cure: it refuses BEFORE bytes land anywhere.
 *   - the inlined ITC frontier — the causal position rides ON the record (the content-hash
 *     sidecar handle fell in the crucible: a per-write frontier de-dups nothing).
 *
 * Precision ceiling law: the mechanical lifecycle NEVER lifts precision into the Canon band
 * (17..20) — Canon settles by talk-story consensus only (Maybe Logic), so the ceiling pins at 16.
 *
 * Platform-blind, pure, immutable — every transition returns a new record; history only grows.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/testimony-keel
 */

/** The 0..20 gain scale's floors and ceilings for a testimony's precision. */
export const PRECISION_FLOOR = 3;    // born Provisional — the play register, honest not failed
export const PRECISION_STEP = 4;     // one independent corroborator's worth of gain
export const PRECISION_CEILING = 16; // Synthesis-Canon top — Canon (17+) is talk-story's alone

/** PROVENANCE — who spoke (attribution only, never reliability) + where in causal time. */
export interface TestimonyProvenance {
  /** the signing vessel key id — warrants attribution/non-forgery, nothing more. */
  readonly signer: string;
  /** the ITC frontier at recording, INLINED on the record (no sidecar handle). */
  readonly frontier: string;
  /** the rhythmic FFZ address at recording, when the caller carries a clock. */
  readonly ffzAddress?: string;
}

/** PUBINFO — the record about the record. An open bag; the keel reads none of it. */
export type TestimonyPubinfo = Readonly<Record<string, unknown>>;

/** A corroboration edge — a witness vouches. `independent` is DERIVED (distinct signer), kept for the record. */
export interface Corroboration {
  readonly signer: string;
  readonly frontier: string;
  /** distinct-signer verdict at the time of the edge — same-seed edges record honestly as false. */
  readonly independent: boolean;
  /** monotone sequence number within this testimony's history (defeats share the counter). */
  readonly seq: number;
}

/** A defeat flag — evidence against. Recorded forever (move-not-delete); never removes anything. */
export interface Defeat {
  readonly signer: string;
  readonly frontier: string;
  readonly seq: number;
}

/**
 * A TESTIMONY — one persisted sensorium reading, nanopub-shaped. `assertion` carries the slow
 * sufficient statistic (a signed innovation vector, a distribution snapshot — the keel is
 * content-blind); `kind` names its plane/shape for the reader.
 */
export interface Testimony {
  readonly kind: string;
  readonly assertion: readonly number[];
  readonly provenance: TestimonyProvenance;
  readonly pubinfo: TestimonyPubinfo;
  /** silent = persisted-but-not-speaking; spoken = corroborated past the last defeat. */
  readonly voice: "silent" | "spoken";
  /** the 0..20 gain the re-entry prior carries — floor at birth, grown ONLY by independence. */
  readonly precision: number;
  readonly corroborations: readonly Corroboration[];
  readonly defeats: readonly Defeat[];
}

/** A witness edge as the caller presents it — signer + causal position. */
export interface WitnessEdge {
  readonly signer: string;
  readonly frontier: string;
}

/** Record a fresh testimony: born SILENT, precision at the floor, history empty. */
export function recordTestimony(
  kind: string,
  assertion: readonly number[],
  provenance: TestimonyProvenance,
  pubinfo: TestimonyPubinfo = {},
): Testimony {
  return { kind, assertion, provenance, pubinfo, voice: "silent", precision: PRECISION_FLOOR, corroborations: [], defeats: [] };
}

/** The next monotone seq across BOTH histories (corroborations and defeats share one counter). */
function nextSeq(t: Testimony): number {
  return t.corroborations.length + t.defeats.length;
}

/** The distinct INDEPENDENT corroborators strictly AFTER the last defeat (fresh evidence only). */
function freshIndependentSigners(t: Testimony): ReadonlySet<string> {
  const lastDefeat = t.defeats.length > 0 ? t.defeats[t.defeats.length - 1]!.seq : -1;
  const signers = new Set<string>();
  for (const c of t.corroborations) {
    if (c.independent && c.seq > lastDefeat) signers.add(c.signer);
  }
  return signers;
}

/** Precision from the lifecycle alone: floor + one step per fresh independent signer, ceiling-pinned. */
function lifecyclePrecision(t: Testimony): number {
  const n = freshIndependentSigners(t).size;
  return Math.min(PRECISION_FLOOR + n * PRECISION_STEP, PRECISION_CEILING);
}

/**
 * A witness corroborates. Independence = a signer DISTINCT from the testimony's own AND from every
 * prior independent corroborator — the same seed vouching twice (or a hundred times) adds nothing,
 * recorded honestly with `independent: false`. Voice speaks when ≥1 fresh independent signer stands
 * past the last defeat; precision grows one step per DISTINCT fresh signer, never past the ceiling.
 */
export function corroborate(t: Testimony, witness: WitnessEdge): Testimony {
  const seen = freshIndependentSigners(t);
  const independent = witness.signer !== t.provenance.signer && !seen.has(witness.signer);
  const edge: Corroboration = { signer: witness.signer, frontier: witness.frontier, independent, seq: nextSeq(t) };
  const next: Testimony = { ...t, corroborations: [...t.corroborations, edge] };
  const precision = lifecyclePrecision(next);
  return { ...next, precision, voice: freshIndependentSigners(next).size > 0 ? "spoken" : "silent" };
}

/**
 * A defeater lands: the testimony RE-SILENCES and precision returns to the floor — but nothing is
 * deleted (move-not-delete): the whole corroboration history stays, and only corroborations NEWER
 * than this defeat count toward speaking again. Fresh evidence, not old fluency, re-earns the voice.
 */
export function defeat(t: Testimony, defeater: WitnessEdge): Testimony {
  const flag: Defeat = { signer: defeater.signer, frontier: defeater.frontier, seq: nextSeq(t) };
  const next: Testimony = { ...t, defeats: [...t.defeats, flag] };
  return { ...next, precision: lifecyclePrecision(next), voice: "silent" };
}

/**
 * The FEP re-entry read: the persisted statistic returns as a LOW-precision prior — weighed by the
 * consumer's arithmetic, never obeyed. A silent testimony still returns (recorded ≠ retrievable ≠
 * suppressed — the reader sees it, at floor weight); `spoken` alone carries the earned precision.
 */
export function reentryPrior(t: Testimony): { readonly value: readonly number[]; readonly precision: number; readonly voice: Testimony["voice"] } {
  return { value: t.assertion, precision: t.voice === "spoken" ? t.precision : PRECISION_FLOOR, voice: t.voice };
}

/**
 * The surprise score of a candidate assertion against the population already admitted: the mean
 * squared z of the candidate under the population's per-dimension mean/variance — a duplicate of
 * what the population already predicts scores ≈ 0 (no novel information), an outlier scores high.
 * An EMPTY population returns +Infinity: the first light is always novel.
 */
export function surpriseScore(candidate: readonly number[], population: readonly (readonly number[])[]): number {
  if (population.length === 0) return Infinity;
  const dims = candidate.length;
  if (dims === 0) return 0;
  let total = 0;
  for (let d = 0; d < dims; d++) {
    const col = population.map((row) => row[d] ?? 0);
    const mean = col.reduce((a, b) => a + b, 0) / col.length;
    const varc = col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length;
    const z = ((candidate[d] ?? 0) - mean) / Math.sqrt(Math.max(varc, 1e-12));
    total += z * z;
  }
  return total / dims;
}

/**
 * The admission gate — the write-time, node-local decision that stops bloat BEFORE bytes land
 * anywhere (the crucible's one causally-safe reclaim: content never admitted never needs dropping,
 * and no peer can ever reference it). Default threshold 0.5: below it, the candidate reads as a
 * re-mined near-duplicate and is refused with its score (an honest refusal, never a silent drop).
 */
export function surpriseGate(
  candidate: readonly number[],
  population: readonly (readonly number[])[],
  threshold = 0.5,
): { readonly admit: boolean; readonly score: number } {
  const score = surpriseScore(candidate, population);
  return { admit: score >= threshold, score };
}
