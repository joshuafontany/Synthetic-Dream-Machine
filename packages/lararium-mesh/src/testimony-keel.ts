/**
 * testimony-keel — the persistence keystone's LIFECYCLE floor: a sensorium's persisted reading
 * lives as attributed, immutable TESTIMONY (nanopublication shape: assertion ⊥ provenance ⊥
 * pubinfo), born SILENT at a LOW confidence, matured ONLY by independent corroboration — never by
 * count — and re-silenced by a defeater flag (move-not-delete).
 *
 * THE PRECISION LAW (the 2026-07-02 crucible's surviving core, YIN-collapsed to one sentence):
 * a persisted trace carries one confidence dial — only distinct-signer witness edges raise it,
 * only flagged defeaters lower it, repetition and recall move it not at all; at the floor, the
 * trace rides silent — weighed at floor gain on re-entry, never obeyed.
 *
 * The laws that sentence keeps, and where they came from (rhyme-diver-maps#crucible-verdicts):
 *   - FEP re-entry — {value, confidence} returns as arithmetic, weighed never obeyed.
 *   - recorded ≠ retrievable — a testimony persists whole while silent.
 *   - sincerity ⊥ reliability (Fricker, narrowed) — `signer` carries attribution only;
 *     reliability rides the corroboration lifecycle, never the signature.
 *   - the frequency-capture defense (ACT-R severed) — NO field counts recalls, and a same-signer
 *     corroboration weighs ZERO however often it repeats: independence = DISTINCT signers
 *     (distinct vessel keys of the two-key atom; under the operator's never-auto-federate ruling,
 *     that is what "independent" honestly means node-side).
 *   - the surprise gate — admission by novel information (a duplicate scores ≈ 0), the write-time
 *     node-local decision: content never admitted never needs reclaiming.
 *   - the inlined ITC frontier — the causal position rides ON the record as an opaque string
 *     (callers populate it via worldline-causal's frontierOf; the sidecar handle fell in crucible).
 *
 * VOCABULARY (loom-check): the 0..20 dial is CONFIDENCE (sensorium-pc's scale). The FEP gain π
 * is a DIFFERENT number — consumers weighing prediction error MUST convert via sensorium-pc's
 * `confidenceToPrecision` (confidence 10 ⇒ gain 1); plugging the raw dial in as π mis-weights.
 *
 * Confidence ceiling law: the mechanical lifecycle NEVER lifts the dial into the Canon band
 * (17..20) — Canon settles by talk-story consensus only (Maybe Logic), so the ceiling pins at 16.
 *
 * DERIVE, NEVER STORE (pruning-shear): the record persists only content + histories; voice and
 * confidence derive at read, so a persisted record cannot CLAIM "spoken" without the
 * corroborations backing it.
 *
 * Platform-blind, pure, immutable — every transition returns a new record; history only grows.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/testimony-keel
 */

import { meanVar } from "./change-point.js";

/** The 0..20 confidence dial's floors and ceilings for a testimony's lifecycle. */
export const CONFIDENCE_FLOOR = 3;    // born Provisional — the play register, honest not failed
export const CONFIDENCE_STEP = 4;     // one independent corroborator's worth of gain
export const CONFIDENCE_CEILING = 16; // Synthesis-Canon top — Canon (17+) is talk-story's alone

/** PROVENANCE — who spoke (attribution only) + where in causal time. */
export interface TestimonyProvenance {
  /** the signing vessel key id — attribution only, nothing more. */
  readonly signer: string;
  /** the ITC frontier at recording, INLINED on the record (no sidecar handle). */
  readonly frontier: string;
}

/** PUBINFO — the record about the record. An open bag; the keel reads none of it. */
export type TestimonyPubinfo = Readonly<Record<string, unknown>>;

/** A corroboration edge — a witness vouches. Independence derives at read (distinct signer). */
export interface Corroboration {
  readonly signer: string;
  readonly frontier: string;
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
 * A TESTIMONY — one persisted sensorium reading, nanopub-shaped: pure content + histories.
 * `assertion` carries the slow sufficient statistic (a signed innovation vector, a distribution
 * snapshot — the keel is content-blind); `kind` names its plane/shape for the reader. Voice and
 * confidence are NOT stored — read them through {@link reentryPrior}.
 */
export interface Testimony {
  readonly kind: string;
  readonly assertion: readonly number[];
  readonly provenance: TestimonyProvenance;
  readonly pubinfo: TestimonyPubinfo;
  readonly corroborations: readonly Corroboration[];
  readonly defeats: readonly Defeat[];
}

/** A witness edge as the caller presents it — signer + causal position. */
export interface WitnessEdge {
  readonly signer: string;
  readonly frontier: string;
}

/** Record a fresh testimony: histories empty — silent at the floor, by derivation. */
export function recordTestimony(
  kind: string,
  assertion: readonly number[],
  provenance: TestimonyProvenance,
  pubinfo: TestimonyPubinfo = {},
): Testimony {
  return { kind, assertion, provenance, pubinfo, corroborations: [], defeats: [] };
}

/** The next monotone seq across BOTH histories (corroborations and defeats share one counter). */
function nextSeq(t: Testimony): number {
  return t.corroborations.length + t.defeats.length;
}

/** The distinct non-self corroborators strictly AFTER the last defeat (fresh evidence only). */
function freshIndependentSigners(t: Testimony): ReadonlySet<string> {
  const lastDefeat = t.defeats.length > 0 ? t.defeats[t.defeats.length - 1]!.seq : -1;
  const signers = new Set<string>();
  for (const c of t.corroborations) {
    if (c.signer !== t.provenance.signer && c.seq > lastDefeat) signers.add(c.signer);
  }
  return signers;
}

/**
 * A witness corroborates: the edge is appended, nothing else changes — voice and confidence
 * derive at read. Independence = a signer distinct from the testimony's own (the Set dedups
 * repeats), so the same seed vouching twice — or a hundred times — adds nothing.
 */
export function corroborate(t: Testimony, witness: WitnessEdge): Testimony {
  const edge: Corroboration = { signer: witness.signer, frontier: witness.frontier, seq: nextSeq(t) };
  return { ...t, corroborations: [...t.corroborations, edge] };
}

/**
 * A defeater lands: the flag is appended — nothing is deleted (move-not-delete). Only
 * corroborations NEWER than the last defeat count toward speaking; fresh evidence, not old
 * fluency, re-earns the voice.
 */
export function defeat(t: Testimony, defeater: WitnessEdge): Testimony {
  const flag: Defeat = { signer: defeater.signer, frontier: defeater.frontier, seq: nextSeq(t) };
  return { ...t, defeats: [...t.defeats, flag] };
}

/**
 * The FEP re-entry read — where voice and confidence DERIVE: floor + one step per distinct fresh
 * signer, ceiling-pinned; above the floor, the testimony speaks. The value returns as a
 * low-confidence prior for the consumer's arithmetic — weighed, never obeyed. A silent testimony
 * still returns (recorded ≠ retrievable ≠ suppressed), at the floor.
 */
export function reentryPrior(t: Testimony): { readonly value: readonly number[]; readonly confidence: number; readonly voice: "silent" | "spoken" } {
  const n = freshIndependentSigners(t).size;
  const confidence = Math.min(CONFIDENCE_FLOOR + n * CONFIDENCE_STEP, CONFIDENCE_CEILING);
  return { value: t.assertion, confidence, voice: n > 0 ? "spoken" : "silent" };
}

/**
 * The surprise score of a candidate assertion against the population already admitted: the mean
 * squared z of the candidate under the population's per-dimension mean/variance (composes
 * change-point's meanVar) — a duplicate of what the population already predicts scores ≈ 0, an
 * outlier scores high. An EMPTY population returns +Infinity: the first light is always novel.
 */
export function surpriseScore(candidate: readonly number[], population: readonly (readonly number[])[]): number {
  if (population.length === 0) return Infinity;
  const dims = candidate.length;
  if (dims === 0) return 0;
  const { mean, var: varr } = meanVar(population, dims);
  let total = 0;
  for (let d = 0; d < dims; d++) {
    const z = ((candidate[d] ?? 0) - mean[d]!) / Math.sqrt(Math.max(varr[d]!, 1e-12));
    total += z * z;
  }
  return total / dims;
}

/**
 * The admission gate — the write-time, node-local decision (the crucible's one causally-safe
 * reclaim: content never admitted never needs dropping, and no peer can ever reference it).
 * Default threshold 0.5: below it, the candidate reads as a re-mined near-duplicate and the
 * verdict returns with its score — an honest refusal the caller enacts, never a silent drop.
 */
export function surpriseGate(
  candidate: readonly number[],
  population: readonly (readonly number[])[],
  threshold = 0.5,
): { readonly admit: boolean; readonly score: number } {
  const score = surpriseScore(candidate, population);
  return { admit: score >= threshold, score };
}
