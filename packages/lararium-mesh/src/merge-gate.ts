/**
 * merge-gate — the fan-in merge acts as a GATE, not a funnel. Where parallel embedders converge on
 * the single-writer commit, the merge does three jobs at once (the shape secretory-pathway QC ·
 * venous one-way valves · coagulation threshold · ATC point-merge all share): it VALIDATES before
 * the irreversible step, ASSIGNS one-way order, and RECYCLES rejects to a dead-letter lane — it
 * never drops a reject nor blocks the whole stream.
 *
 * It also carries the CONSUME-LICENSE-ON-COMMIT flow (DNA-replication licensing · kinetic
 * proofreading): a fresh content-key holds a license the commit consumes exactly once; a key already
 * consumed skips idempotently (the store's content-hash upsert is the ground-truth backstop, this
 * the fast-path). "Consume-license-on-commit" and the trailing watermark name ONE mechanism — the
 * watermark advance IS the license removal — so this composes capture-drain rather than re-storing
 * licenses (YIN: the drain's resolved-set is the license registry).
 *
 * The PROOFREAD-BEFORE-IRREVERSIBLE law (kinetic proofreading): validation runs BEFORE the commit,
 * so a wrong item leaves the pathway (dead-letter) before the point of no return. The cost is honest
 * — a validation step buys fidelity at a throughput price (named, not free).
 *
 * PURE: functions over (item, licensed-set, validate-seam). The caller draws `licensed` from the
 * drain's committed keys and routes each verdict (commit → the single writer · dead-letter → the
 * ERAD sink · skip → nothing). Meme: lar:///ha.ka.ba/@lararium/mesh/merge-gate ·
 * api/projection-nalu (the accumulate family's merge point).
 */

/** An embedded item arriving at the merge: its order `seq`, its content-key `license`, the payload `embedded`. */
export interface MergeItem<E> {
  readonly seq: number;
  /** the content-hash key — the LICENSE the commit consumes exactly once (== the drain's idempotent key). */
  readonly key: string;
  readonly embedded: E;
}

/** The proofread seam — run BEFORE the irreversible commit; a reject exits to the dead-letter lane. */
export type Validate<E> = (m: MergeItem<E>) => { readonly ok: true } | { readonly ok: false; readonly reason: string };

/** The merge verdict — the caller routes by kind. Exactly one of three outcomes; nothing drops. */
export type MergeVerdict<E> =
  /** validated + license fresh → the single writer commits this (then consumes the license). */
  | { readonly kind: "commit"; readonly item: MergeItem<E> }
  /** the license was already consumed → idempotent skip (a re-presented key, safe no-op). */
  | { readonly kind: "skip-licensed"; readonly key: string }
  /** failed the proofread → route to the dead-letter (ERAD) lane WITH the reason; never dropped. */
  | { readonly kind: "dead-letter"; readonly key: string; readonly reason: string };

/**
 * The merge gate. Consume-license first (idempotent skip on a spent key), then proofread (reject →
 * dead-letter), else admit for commit. Order-assignment rides `item.seq` (the caller's monotonic
 * merge offset — the valve/miles-in-trail that forbids backflow). No side effects: the caller
 * consumes the license (marks the drain committed) only on a `commit` verdict it actually lands.
 */
export function mergeGate<E>(m: MergeItem<E>, licensed: ReadonlySet<string>, validate: Validate<E>): MergeVerdict<E> {
  if (licensed.has(m.key)) return { kind: "skip-licensed", key: m.key };
  const verdict = validate(m);
  if (!verdict.ok) return { kind: "dead-letter", key: m.key, reason: verdict.reason };
  return { kind: "commit", item: m };
}

/** A dead-lettered record — kept, never dropped (the ERAD lane / the hiatus drop-honesty law). */
export interface DeadLetter {
  readonly key: string;
  readonly seq: number;
  readonly reason: string;
}
