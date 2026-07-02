/**
 * persistence-keel — the PersistencePalace lifecycle, collapsed (the 2026-07-02 Keystone-Cutter
 * pass; strangles testimony-keel.ts). A persistence pattern-integrity ANY sensorium composes as a
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
 * Meme: lar:///ha.ka.ba/@lararium/mesh/persistence-keel
 */

import { meanVar } from "./change-point.js";

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
}

/**
 * The per-instance PERSISTENCE POLICY — the two dials that make one sensorium stable and another
 * ephemeral. `admitThreshold`: the surprise floor for admission. `halfLife`: null = append-only-
 * witness (never cools); finite = affinity-maturation (standing cools by this half-life in `tick`
 * units). The mode DERIVES from halfLife — never stored twice.
 */
export interface PersistencePolicy {
  readonly admitThreshold: number;
  readonly halfLife: number | null;
}

/** The default authority policy — witness mode, admit anything novel-enough by the standard gate. */
export const WITNESS_POLICY: PersistencePolicy = { admitThreshold: 0.5, halfLife: null };

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

/**
 * The admission gate (Cut B — score+gate merged): the write-time, node-local decision that refuses
 * a re-mined near-duplicate before it lands (the one causally-safe reclaim — content never admitted
 * never needs dropping, and no peer can reference it). The candidate's mean squared z against the
 * admitted population (composes change-point's meanVar) — a duplicate scores ≈ 0, an outlier high;
 * an EMPTY population always admits (the first light is novel). Returns the verdict WITH its score
 * — an honest refusal the caller enacts, never a silent drop.
 */
export function admit(
  candidate: readonly number[],
  population: readonly (readonly number[])[],
  policy: PersistencePolicy = WITNESS_POLICY,
): { readonly admit: boolean; readonly score: number } {
  if (population.length === 0) return { admit: true, score: Infinity };
  const dims = candidate.length;
  if (dims === 0) return { admit: 0 >= policy.admitThreshold, score: 0 };
  const { mean, var: varr } = meanVar(population, dims);
  let total = 0;
  for (let d = 0; d < dims; d++) {
    const z = ((candidate[d] ?? 0) - mean[d]!) / Math.sqrt(Math.max(varr[d]!, 1e-12));
    total += z * z;
  }
  const score = total / dims;
  return { admit: score >= policy.admitThreshold, score };
}
