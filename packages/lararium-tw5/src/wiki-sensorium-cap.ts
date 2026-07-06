/**
 * wiki-sensorium-cap — S2: the `hasWikiSensorium` cap-fold. The S0 adapter senses, the S1 projection
 * displays; THIS cap gives the wiki-causal-island (and its @daemon or any wiki-island-worker) a
 * THREE-VERB PERCEIVER over its OWN tiddler corpus:
 *
 *   cohere()      — the consistency read: the S0 snapshot folds through the mesh organs (Robinson
 *                   {@link consistencyRadius} + the H¹ {@link cohomologyObstruction} classifier) into one
 *                   verdict: radius · glues/vacuous · per-pair loci · reconcilable-vs-ontological.
 *   recall(query) — LOCAL-FIRST tiddler recall over the planes that exist today: title match (content
 *                   floor) · sigil-head match (structure, the L2 reader's strata) · shingle-Jaccard
 *                   neighbors (form, the S0 shingle machinery) · plus an OPTIONAL semantic tier behind
 *                   the injectable {@link TextEmbedder} seam (cosine flat-scan; no model dependency —
 *                   the COOP/COEP deployment fork stays the operator's).
 *   couple()      — answers honestly UNBUILT: the cross-island coupling read awaits the S5 mesh-of-wikis
 *                   fork (readKiCorpus over FFZ-aligned cells across islands); this verb never fakes it.
 *
 * GRAIN LAW: every verb reads the RESOLVED composite surface ({@link CompositeStore.entries},
 * kāpae-honored, causal-stamped) and WRITES NOTHING. A volatile corpus-index memo (the licensed S3+
 * pattern) caches one entries() fold; the composite's own change events invalidate it, so the memo
 * never outlives the log it read (`heads` ride the cached entries as the as-of stamp — no global now).
 *
 * THE HULL RUNS PLATFORM-BLIND: no node builtins — the same cap composes on node AND in a browser
 * worker; {@link hasWikiSensorium} wears the existing {@link IslandCap} idiom (island-caps.ts), and
 * {@link createWikiSensorium} exposes the same perceiver for direct in-process use (daemon, tests).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-sensorium-cap
 */

import type { CompositeStore, CompositeEntry, LarTiddlerRecord, ConsistencyRadius, SensoriumSignalType } from "@lararium/mesh";
import { consistencyRadius, cohomologyObstruction, jaccardDistance, cosineDistance } from "@lararium/mesh";
import type { IslandCap } from "./island-caps.js";
import type { IslandContext } from "./island-context.js";
import {
  projectWikiSensorium,
  buildFixtureIsland,
  GLUE_SEEDS,
  OBSTRUCT_SEEDS,
  shingles,
} from "./wiki-store-adapter.js";
import { stratify } from "./memetic-wikitext-sensorium.js";

// ── the semantic SEAM (an interface, never a dependency) ────────────────────────────────────────────

/**
 * The injectable semantic-tier seam — an async batch text-embedder. The cap DEFINES the shape and calls
 * it when present; it never imports a model (transformers.js / COOP-COEP stays the operator's fork).
 * Browser scale (< 50k vectors) rides a flat cosine scan, so no index rides behind this seam either.
 */
export type TextEmbedder = (texts: readonly string[]) => Promise<readonly Float32Array[]>;

/** cosineDistance reads only length+index, so a Float32Array crosses via one number[] copy (flat-scan scale). */
function toNumbers(v: Float32Array): readonly number[] {
  return Array.from(v);
}

// ── the verb result shapes ──────────────────────────────────────────────────────────────────────────

/** The cohere() verdict — the S0 planes folded through BOTH mesh organs over one snapshot. */
export interface WikiCoherenceVerdict {
  /** the Robinson li-radius: radius · glues · vacuous · per-pair loci · the union obstruction locus. */
  readonly consistency: ConsistencyRadius;
  /** the H¹ classifier over the SAME assignment — which no-global-now stands (reconcilable ⊥ ontological). */
  readonly gate: {
    readonly kind: "reconcilable" | "ontological";
    readonly dimH1: number;
    /** the reconciliation cost R*_sem = log₂ dim H¹ (0 when reconcilable). */
    readonly cost: number;
  };
  /** how many resolved tiddlers the verdict folded — the corpus grain it speaks over. */
  readonly corpusSize: number;
  /** the as-of stamp: the union of the answering layers' Automerge heads at the snapshot read
   *  (dedup, sorted; empty for stores with no CRDT backing) — "as of my last sync", never "globally". */
  readonly asOf: readonly string[];
}

/** One recall query — each present field licenses its tier; absent fields skip theirs. */
export interface WikiRecallQuery {
  /** the content-floor probe: matches TITLES (exact > prefix > substring); also feeds the semantic tier. */
  readonly text?: string;
  /** the structure probe: matches the L2 reader's sigil-head strata (e.g. "confidence", "ward"). */
  readonly sigilHead?: string;
  /** the form probe: a tiddler title whose recurring-shingle neighbors rank by Jaccard overlap. */
  readonly likeTitle?: string;
  /** per-tier hit cap; default {@link RECALL_LIMIT}. */
  readonly limit?: number;
}

/** One recall hit — a title with the score its tier gave it (each tier normalizes into [0,1]). */
export interface WikiRecallHit {
  readonly title: string;
  readonly score: number;
}

/** The recall() result — one ranked list per tier the query licensed (empty = licensed, nothing matched). */
export interface WikiRecallResult {
  /** title matches for `text` (exact 1 · prefix 0.75 · substring 0.5). */
  readonly content: readonly WikiRecallHit[];
  /** tiddlers whose strata carry `sigilHead`, scored by matching-strata count (max-normalized). */
  readonly structure: readonly WikiRecallHit[];
  /** shingle-sharing neighbors of `likeTitle`, scored by Jaccard SIMILARITY (1 − jaccardDistance). */
  readonly form: readonly WikiRecallHit[];
  /** cosine-ranked bodies against `text` — null when NO embedder rides the seam (the tier stays honest-absent). */
  readonly semantic: readonly WikiRecallHit[] | null;
}

/** Default per-tier recall cap. */
export const RECALL_LIMIT = 10;

/** The couple() answer while S5 stands unbuilt — a typed refusal, never a faked coupling read. */
export interface WikiCouplingUnbuilt {
  readonly status: "unbuilt";
  /** the fork this verb awaits: the S5 mesh-of-wikis coupling (readKiCorpus across islands). */
  readonly awaits: "S5:mesh-of-wikis";
}

/** The coupling read — widens beyond the unbuilt arm when the S5 fork lands. */
export type WikiCouplingRead = WikiCouplingUnbuilt;

// ── the perceiver ───────────────────────────────────────────────────────────────────────────────────

/** The three-verb perceiver a wiki island composes — read-only over its OWN resolved surface. */
export interface WikiSensorium {
  cohere(): Promise<WikiCoherenceVerdict>;
  recall(query: WikiRecallQuery): Promise<WikiRecallResult>;
  couple(): WikiCouplingRead;
}

/** The perceiver plus its teardown — dispose() releases the memo's change subscription. */
export interface WikiSensoriumHandle extends WikiSensorium {
  dispose(): void;
}

export interface WikiSensoriumOptions {
  /** fills the semantic seam; absent = recall's semantic tier reads null (honest absence, no fallback). */
  readonly embedder?: TextEmbedder;
}

/** Pull a tiddler's body text — the `text` field, the memetic-wikitext carrier (the S0 read, kept local). */
function bodyOf(record: LarTiddlerRecord): string {
  const text = (record.tiddler as Record<string, unknown>)["text"];
  return typeof text === "string" ? text : "";
}

/** One tiddler's recall index — the per-plane probes derived once per memo fill. */
interface DocIndex {
  readonly title: string;
  readonly body: string;
  /** the form probe: the doc's distinct char k-gram shingles (the S0 machinery, same k). */
  readonly shingleSet: ReadonlySet<string>;
  /** the structure probe: sigil-head → how many strata carry it (the L2 reader's typed heads). */
  readonly headCounts: ReadonlyMap<string, number>;
}

/** The volatile corpus index — ONE entries() fold serving every verb until the log moves. */
interface CorpusIndex {
  readonly entries: readonly CompositeEntry[];
  readonly docs: readonly DocIndex[];
}

/** Fold the resolved entries into the corpus index (the memo body — runs once per invalidation). */
function buildIndex(entries: readonly CompositeEntry[]): CorpusIndex {
  const docs: DocIndex[] = entries.map((e) => {
    const body = bodyOf(e.record);
    const headCounts = new Map<string, number>();
    // the L2 reader stratifies the body; frame sigils bound rather than steer, so they stay out of
    // the head index (a recall for "ahu" would name structure that governs nothing).
    for (const s of stratify(body).strata) {
      if (s.frame) continue;
      const key = s.head.toLowerCase();
      headCounts.set(key, (headCounts.get(key) ?? 0) + 1);
    }
    return { title: e.title, body, shingleSet: shingles(body), headCounts };
  });
  return { entries, docs };
}

/** Sort hits score-desc, title-asc (deterministic), then cap at the tier limit. */
function rankHits(hits: WikiRecallHit[], limit: number): WikiRecallHit[] {
  return hits
    .sort((a, b) => b.score - a.score || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0))
    .slice(0, limit);
}

/**
 * Stand the perceiver over one wiki island's composite. Read-only: every verb folds the RESOLVED
 * surface (kāpae-honored); nothing writes back. The corpus index memoizes ONE entries() fold and the
 * composite's own change events invalidate it (the licensed volatile-memo pattern) — dispose() releases
 * that subscription.
 */
export function createWikiSensorium(
  store: CompositeStore, opts: WikiSensoriumOptions = {},
): WikiSensoriumHandle {
  let cached: Promise<CorpusIndex> | null = null;
  // the log moved → the memo dies with the snapshot it summarized (never a stale read past a write).
  const unsub = store.subscribe(() => { cached = null; });
  const index = (): Promise<CorpusIndex> =>
    (cached ??= store.entries().then(buildIndex));

  return {
    async cohere(): Promise<WikiCoherenceVerdict> {
      const idx = await index();
      // the S0 projection engineers the structure⊥form stalk; both organs read the SAME assignment.
      const snap = projectWikiSensorium(idx.entries);
      const consistency = consistencyRadius(snap.restrictions, snap.stalk);
      const obs = cohomologyObstruction({ restrictions: snap.restrictions, stalk: snap.stalk });
      return {
        consistency,
        gate: { kind: obs.kind, dimH1: obs.dimH1, cost: obs.cost },
        corpusSize: idx.entries.length,
        // the snapshot's causal coordinates — the proof-hold's stamp rides these, never a wall clock.
        asOf: [...new Set(idx.entries.flatMap((e) => e.heads ?? []))].sort(),
      };
    },

    async recall(query: WikiRecallQuery): Promise<WikiRecallResult> {
      const idx = await index();
      const limit = Math.max(1, query.limit ?? RECALL_LIMIT);

      // content floor — the probe matches TITLES; exact outranks prefix outranks substring.
      const content: WikiRecallHit[] = [];
      if (query.text !== undefined && query.text.length > 0) {
        const probe = query.text.toLowerCase();
        for (const d of idx.docs) {
          const t = d.title.toLowerCase();
          const score = t === probe ? 1 : t.startsWith(probe) ? 0.75 : t.includes(probe) ? 0.5 : 0;
          if (score > 0) content.push({ title: d.title, score });
        }
      }

      // structure — the sigil-head strata the L2 reader typed; score = matching-strata count, max-normalized.
      const structure: WikiRecallHit[] = [];
      if (query.sigilHead !== undefined && query.sigilHead.length > 0) {
        const head = query.sigilHead.toLowerCase();
        const counts = idx.docs
          .map((d) => ({ title: d.title, n: d.headCounts.get(head) ?? 0 }))
          .filter((x) => x.n > 0);
        const maxN = Math.max(1, ...counts.map((x) => x.n));
        for (const x of counts) structure.push({ title: x.title, score: x.n / maxN });
      }

      // form — the seed tiddler's shingle-set neighbors, ranked by Jaccard SIMILARITY (the mesh organ's
      // distance, flipped). The seed itself stays out of its own neighbor list.
      const form: WikiRecallHit[] = [];
      if (query.likeTitle !== undefined) {
        const seed = idx.docs.find((d) => d.title === query.likeTitle);
        if (seed) {
          for (const d of idx.docs) {
            if (d.title === seed.title) continue;
            const sim = 1 - jaccardDistance(seed.shingleSet, d.shingleSet);
            if (sim > 0) form.push({ title: d.title, score: sim });
          }
        }
      }

      // semantic — the seam-gated tier: ONE batch embed (query + every body), then a flat cosine scan.
      // No embedder ⇒ null (the tier reads honest-absent, never a degraded fallback ranking).
      let semantic: WikiRecallHit[] | null = null;
      if (opts.embedder && query.text !== undefined && query.text.length > 0 && idx.docs.length > 0) {
        const vecs = await opts.embedder([query.text, ...idx.docs.map((d) => d.body)]);
        const qv = toNumbers(vecs[0]!);
        semantic = [];
        for (let i = 0; i < idx.docs.length; i++) {
          const sim = 1 - cosineDistance(qv, toNumbers(vecs[i + 1]!));
          if (Number.isFinite(sim) && sim > 0) semantic.push({ title: idx.docs[i]!.title, score: sim });
        }
        semantic = rankHits(semantic, limit);
      }

      return {
        content: rankHits(content, limit),
        structure: rankHits(structure, limit),
        form: rankHits(form, limit),
        semantic,
      };
    },

    couple(): WikiCouplingRead {
      // the honest stub: a cross-island coupling read needs the S5 mesh-of-wikis fork (FFZ-aligned
      // cells across islands feeding readKiCorpus); until it lands this verb REFUSES, typed.
      return { status: "unbuilt", awaits: "S5:mesh-of-wikis" };
    },

    dispose(): void {
      unsub();
      cached = null;
    },
  };
}

// ── the island cap (the #has unit — wears the island-caps idiom) ────────────────────────────────────

/** The OUT-frame listenable every sensorium verb answers on (the S1/telemetry post-event family). */
export const SENSORIUM_FRAME = "sensorium:frame";

/** The three IN signals the cap claims — one per perceiver verb. Typed against the mesh wire union
 *  ({@link SensoriumSignalType}) so the cap's claims and the protocol's admissions never drift. */
export const SENSORIUM_SIGNAL = {
  cohere: "sensorium:cohere",
  recall: "sensorium:recall",
  couple: "sensorium:couple",
} as const satisfies Record<string, SensoriumSignalType>;

/** A recall signal's fields ride flat or under `args` (the signal-channel convention has-capture set). */
interface RecallSignal {
  readonly requestId?: string;
  readonly text?: string;
  readonly sigilHead?: string;
  readonly likeTitle?: string;
  readonly limit?: number;
  readonly args?: Omit<RecallSignal, "args">;
}

/** Post one verb's answer as a SENSORIUM_FRAME event — composite fields serialize (payload law: flat scalars). */
function postFrame(
  ctx: IslandContext, verb: keyof typeof SENSORIUM_SIGNAL, requestId: string, result: unknown,
): void {
  ctx.post({
    schema_version: 1,
    type: "event",
    wikiUri: ctx.wikiUri,
    listenable: SENSORIUM_FRAME,
    payload: { verb, requestId, result: JSON.stringify(result) },
  });
}

/**
 * The `hasWikiSensorium` cap — folds the perceiver into a wiki island's #has stack. onEa stands the
 * perceiver over the island's OWN composite (dispose rides the LIFO teardown); onSignal claims the
 * three verb signals and posts each answer as a {@link SENSORIUM_FRAME} event. In-process callers
 * (the daemon-VM, tests) reach the same verbs through {@link createWikiSensorium} directly.
 */
export function hasWikiSensorium(opts: WikiSensoriumOptions = {}): IslandCap {
  let perceiver: WikiSensoriumHandle | null = null;

  return {
    name: "wiki-sensorium",
    onEa(ctx: IslandContext) {
      perceiver = createWikiSensorium(ctx.composite, opts);
      return () => { perceiver?.dispose(); perceiver = null; };
    },
    onSignal(type: string, raw: unknown, ctx: IslandContext): boolean {
      if (!perceiver) return false;
      const p = perceiver;
      const sig = (raw ?? {}) as RecallSignal;
      const fields = sig.args ?? sig;
      const requestId = typeof fields.requestId === "string" ? fields.requestId : "";

      if (type === SENSORIUM_SIGNAL.cohere) {
        void p.cohere().then((v) => postFrame(ctx, "cohere", requestId, v));
        return true;
      }
      if (type === SENSORIUM_SIGNAL.recall) {
        const query: WikiRecallQuery = {
          ...(typeof fields.text === "string" ? { text: fields.text } : {}),
          ...(typeof fields.sigilHead === "string" ? { sigilHead: fields.sigilHead } : {}),
          ...(typeof fields.likeTitle === "string" ? { likeTitle: fields.likeTitle } : {}),
          ...(typeof fields.limit === "number" ? { limit: fields.limit } : {}),
        };
        void p.recall(query).then((v) => postFrame(ctx, "recall", requestId, v));
        return true;
      }
      if (type === SENSORIUM_SIGNAL.couple) {
        postFrame(ctx, "couple", requestId, p.couple());
        return true;
      }
      return false;
    },
  };
}

// ── the cross-tier witness (one hull, run identically on node AND in a browser worker) ──────────────

/**
 * The deterministic seam-witness embedder — 26-dim letter-frequency vectors. A WITNESS FIXTURE proving
 * the {@link TextEmbedder} seam carries a real semantic tier end-to-end; it stands in for no model
 * (the model fork stays the operator's). A query equal to a doc's body lands cosine 1 on that doc.
 */
export const letterFrequencyEmbedder: TextEmbedder = async (texts) =>
  texts.map((t) => {
    const v = new Float32Array(26);
    for (const ch of t.toLowerCase()) {
      const c = ch.charCodeAt(0) - 97;
      if (c >= 0 && c < 26) v[c]! += 1;
    }
    return v;
  });

/** The witness verdict — every S2 verb exercised over the S0 fixture corpora, the cross-tier assertion surface. */
export interface WikiSensoriumWitness {
  /** cohere over the GLUE corpus — expects glues:true, vacuous:false, gate reconcilable. */
  readonly glue: WikiCoherenceVerdict;
  /** cohere over the OBSTRUCT corpus — expects radius>0 with the pair locus naming ornate-novel. */
  readonly obstruct: WikiCoherenceVerdict;
  /** form recall seeded on canon-a — expects canon-b top (they share the recurring phrase). */
  readonly formRecall: WikiRecallResult;
  /** recall WITHOUT an embedder — expects semantic:null (the seam honestly absent). */
  readonly bareRecall: WikiRecallResult;
  /** recall WITH the letter-frequency embedder, query = plain's own body — expects plain cosine-top. */
  readonly semanticRecall: WikiRecallResult;
  /** the couple() answer — expects the typed unbuilt refusal. */
  readonly coupling: WikiCouplingRead;
}

/**
 * Run the S2 cross-tier witness — stand two fixture islands (the S0 GLUE/OBSTRUCT corpora), drive every
 * verb through the SAME {@link createWikiSensorium} hull, and hand back the readings. A node test and a
 * browser (Chromium) test assert the IDENTICAL verdict — one hull, two substrates, differ by grant not hull.
 */
export async function runWikiSensoriumWitness(): Promise<WikiSensoriumWitness> {
  const glueIsland = buildFixtureIsland("lar:///ha.ka.ba/@sensorium-glue", GLUE_SEEDS);
  const obstructIsland = buildFixtureIsland("lar:///ha.ka.ba/@sensorium-obstruct", OBSTRUCT_SEEDS);
  const plainBody = GLUE_SEEDS.find((s) => s.title === "plain")!.text;

  const bare = createWikiSensorium(glueIsland);
  const embedded = createWikiSensorium(glueIsland, { embedder: letterFrequencyEmbedder });
  const obstructSense = createWikiSensorium(obstructIsland);
  try {
    return {
      glue: await bare.cohere(),
      obstruct: await obstructSense.cohere(),
      formRecall: await bare.recall({ likeTitle: "canon-a" }),
      bareRecall: await bare.recall({ text: plainBody }),
      semanticRecall: await embedded.recall({ text: plainBody }),
      coupling: bare.couple(),
    };
  } finally {
    bare.dispose();
    embedded.dispose();
    obstructSense.dispose();
  }
}
