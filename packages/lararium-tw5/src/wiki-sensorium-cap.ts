/**
 * wiki-sensorium-cap — the `hasWikiSensorium` cap-fold: a wiki-causal-island (and its @daemon or
 * any wiki-island-worker) composes a THREE-VERB PERCEIVER over its OWN tiddler corpus:
 *
 *   cohere()      — the consistency read: the corpus folds through the mesh organs (Robinson
 *                   consistencyRadius + the H¹ cohomologyObstruction classifier) into one
 *                   verdict: radius · glues/vacuous · per-pair loci · reconcilable-vs-ontological.
 *   recall(query) — LOCAL-FIRST tiddler recall over the planes that exist today: title match (content
 *                   floor) · sigil-head match (structure, the memetic-wikitext reader's strata) · shingle-Jaccard
 *                   neighbors (form) · plus an OPTIONAL semantic tier behind the injectable
 *                   {@link TextEmbedder} shore (cosine flat-scan; no model dependency — the COOP/COEP
 *                   deployment fork stays the operator's).
 *   couple()      — answers honestly UNBUILT: the cross-island coupling read awaits the mesh-of-wikis
 *                   fork (readKiCorpus over FFZ-aligned cells across islands); this verb never fakes it.
 *
 * PONO-HOME LAW (operator): a wiki that RUNS as a TW5 VM senses itself IN-VM — the plugin blob's
 * WikiSenseIndexer + `wikisense` filter operator carry that beat natively. THIS cap serves the
 * wikis that hold NO VM: {@link createWikiSensorium} stands the hull over a composite-store island
 * through the {@link WikiCorpusReader} shore ({@link createWikiSensoriumOverReader} takes any
 * reader). Every doc crosses the shore as its WHOLE open field record (operator law — title =
 * pet-name key, no set schema); the fold math lives ONCE in wiki-sense-fold.ts — shipped in the
 * plugin as a library tiddler — so the in-VM beat and the composite beat agree by construction.
 *
 * GRAIN LAW: every verb reads the reader's resolved surface and WRITES NOTHING. A volatile
 * corpus-fold memo (the licensed pattern) caches one docs() fold; the reader's own change
 * events invalidate it, so the memo never outlives the log it read (`heads` ride the cached docs
 * as the as-of stamp — no global now).
 *
 * THE HULL RUNS PLATFORM-BLIND: no node builtins — the same cap composes on node AND in a browser
 * worker; {@link hasWikiSensorium} wears the existing {@link IslandCap} idiom (island-caps.ts).
 *
 * Meme: lar:///ha.ka.ba/lares/api/wiki-sensorium-cap
 */

import type { CompositeStore, SensoriumContract, SensoriumSignalType } from "@lararium/mesh";
import { cosineDistance } from "@lararium/mesh";
import type { IslandCap } from "./island-caps.js";
import type { IslandContext } from "./island-context.js";
import { buildFixtureIsland, GLUE_SEEDS, OBSTRUCT_SEEDS } from "./wiki-store-adapter.js";
import {
  foldCorpus,
  cohereFold,
  contentTier,
  structureTier,
  formTier,
  rankHits,
  RECALL_LIMIT,
  type CorpusFold,
  type WikiCoherenceVerdict,
  type WikiRecallHit,
} from "./wiki-sense-fold.js";
import { compositeCorpusReader, type WikiCorpusReader } from "./wiki-corpus-reader.js";

// the verdict/hit shapes live with the fold (every mouth speaks them); the cap re-exports the held names.
export type { WikiCoherenceVerdict, WikiRecallHit } from "./wiki-sense-fold.js";
export { RECALL_LIMIT } from "./wiki-sense-fold.js";
export type { WikiCorpusReader } from "./wiki-corpus-reader.js";
export { compositeCorpusReader } from "./wiki-corpus-reader.js";

/** This perceiver's contribution; surrounding vessels may compose further caps. */
const WIKI_SENSORIUM_CAP: SensoriumContract = {
  has: ["content", "structure", "form", "coupling"],
};

// ── the semantic SHORE (an interface, never a dependency) ────────────────────────────────────────────

/**
 * The injectable semantic-tier shore — an async batch text-embedder. The cap DEFINES the shape and calls
 * it when present; it never imports a model (transformers.js / COOP-COEP stays the operator's fork).
 * Browser scale (< 50k vectors) rides a flat cosine scan, so no index rides behind this shore either.
 */
export type TextEmbedder = (texts: readonly string[]) => Promise<readonly Float32Array[]>;

/** cosineDistance reads only length+index, so a Float32Array crosses via one number[] copy (flat-scan scale). */
function toNumbers(v: Float32Array): readonly number[] {
  return Array.from(v);
}

// ── the verb result shapes ──────────────────────────────────────────────────────────────────────────

/** One recall query — each present field licenses its tier; absent fields skip theirs. */
export interface WikiRecallQuery {
  /** the content-floor probe: matches TITLES (exact > prefix > substring); also feeds the semantic tier. */
  readonly text?: string;
  /** the structure probe: matches the memetic-wikitext reader's sigil-head strata (e.g. "confidence", "ward"). */
  readonly sigilHead?: string;
  /** the form probe: a tiddler title whose recurring-shingle neighbors rank by Jaccard overlap. */
  readonly likeTitle?: string;
  /** per-tier hit cap; default {@link RECALL_LIMIT}. */
  readonly limit?: number;
}

/** The recall() result — one ranked list per tier the query licensed (empty = licensed, nothing matched). */
export interface WikiRecallResult {
  /** title matches for `text` (exact 1 · prefix 0.75 · substring 0.5). */
  readonly content: readonly WikiRecallHit[];
  /** tiddlers whose strata carry `sigilHead`, scored by matching-strata count (max-normalized). */
  readonly structure: readonly WikiRecallHit[];
  /** shingle-sharing neighbors of `likeTitle`, scored by Jaccard SIMILARITY (1 − jaccardDistance). */
  readonly form: readonly WikiRecallHit[];
  /** cosine-ranked bodies against `text` — null when NO embedder rides the shore (the tier stays honest-absent). */
  readonly semantic: readonly WikiRecallHit[] | null;
}

/** The couple() answer while the coupling read stands unbuilt — a typed refusal, never a faked read. */
export interface WikiCouplingUnbuilt {
  readonly status: "unbuilt";
  /** the fork this verb awaits — the wire value names it; the mesh-of-wikis coupling (readKiCorpus across islands). */
  readonly awaits: "S5:mesh-of-wikis";
}

/** The coupling read — widens beyond the unbuilt arm when the mesh-of-wikis fork lands. */
export type WikiCouplingRead = WikiCouplingUnbuilt;

// ── the perceiver ───────────────────────────────────────────────────────────────────────────────────

/** The three-verb perceiver a wiki island composes — read-only over its OWN resolved surface. */
export interface WikiSensorium {
  /** Platform-blind cap declaration; holder and storage details stay outside the contract. */
  readonly contract: SensoriumContract;
  cohere(): Promise<WikiCoherenceVerdict>;
  recall(query: WikiRecallQuery): Promise<WikiRecallResult>;
  couple(): WikiCouplingRead;
}

/** The perceiver plus its teardown — dispose() releases the memo's change subscription. */
export interface WikiSensoriumHandle extends WikiSensorium {
  dispose(): void;
}

export interface WikiSensoriumOptions {
  /** fills the semantic shore; absent = recall's semantic tier reads null (honest absence, no fallback). */
  readonly embedder?: TextEmbedder;
}

/**
 * Stand the ONE perceiver hull over ANY corpus reader. Read-only: every verb
 * folds the reader's resolved docs (WHOLE open records); nothing writes back. The corpus fold
 * memoizes ONE docs() read and the reader's own change events invalidate it (the licensed
 * volatile-memo pattern) — dispose() releases that subscription.
 */
export function createWikiSensoriumOverReader(
  reader: WikiCorpusReader, opts: WikiSensoriumOptions = {},
): WikiSensoriumHandle {
  let cached: Promise<CorpusFold> | null = null;
  // the log moved → the memo dies with the snapshot it summarized (never a stale read past a write).
  const unsub = reader.subscribe(() => { cached = null; });
  // the reader's own stalk supplier (per-title memo / cache law) fills foldCorpus's shore when present.
  const fold = (): Promise<CorpusFold> =>
    (cached ??= reader.docs().then((docs) => foldCorpus(docs, reader.stalkOf)));

  return {
    contract: WIKI_SENSORIUM_CAP,
    async cohere(): Promise<WikiCoherenceVerdict> {
      // both organs read the SAME assignment — the shared fold projects the structure⊥form planes.
      return cohereFold(await fold());
    },

    async recall(query: WikiRecallQuery): Promise<WikiRecallResult> {
      const f = await fold();
      // a non-finite limit (NaN/Infinity off a wire) falls back to the default — never a poisoned slice.
      const limit = Number.isFinite(query.limit) ? Math.max(1, query.limit!) : RECALL_LIMIT;

      const content = query.text !== undefined ? contentTier(f, query.text, limit) : [];
      const structure = query.sigilHead !== undefined ? structureTier(f, query.sigilHead, limit) : [];
      const form = query.likeTitle !== undefined ? formTier(f, query.likeTitle, limit) : [];

      // semantic — the shore-gated tier: ONE batch embed (query + every body), then a flat cosine scan.
      // No embedder ⇒ null (the tier reads honest-absent, never a degraded fallback ranking).
      let semantic: WikiRecallHit[] | null = null;
      if (opts.embedder && query.text !== undefined && query.text.length > 0 && f.docs.length > 0) {
        const vecs = await opts.embedder([query.text, ...f.docs.map((d) => d.body)]);
        const qv = toNumbers(vecs[0]!);
        semantic = [];
        for (let i = 0; i < f.docs.length; i++) {
          const sim = 1 - cosineDistance(qv, toNumbers(vecs[i + 1]!));
          if (Number.isFinite(sim) && sim > 0) semantic.push({ title: f.docs[i]!.title, score: sim });
        }
        semantic = rankHits(semantic, limit);
      }

      return { content, structure, form, semantic };
    },

    couple(): WikiCouplingRead {
      // the honest stub: a cross-island coupling read needs the mesh-of-wikis fork (FFZ-aligned
      // cells across islands feeding readKiCorpus); until it lands this verb REFUSES, typed.
      return { status: "unbuilt", awaits: "S5:mesh-of-wikis" };
    },

    dispose(): void {
      unsub();
      cached = null;
    },
  };
}

/**
 * Stand the perceiver over one VM-less wiki island's composite — the held signature: it wraps the
 * composite in {@link compositeCorpusReader} and rides the same hull as every other face.
 */
export function createWikiSensorium(
  store: CompositeStore, opts: WikiSensoriumOptions = {},
): WikiSensoriumHandle {
  return createWikiSensoriumOverReader(compositeCorpusReader(store), opts);
}

// ── the island cap (the #has unit — wears the island-caps idiom) ────────────────────────────────────

/** The OUT-frame listenable every sensorium verb answers on (the telemetry post-event family). */
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

/** Post one verb's FAILURE as a SENSORIUM_FRAME error event — the ask-wire fails loud on BOTH ends:
 *  the supervisor's timeout never stands in for an answerable fault (requestId echoes back). */
function postErrorFrame(
  ctx: IslandContext, verb: keyof typeof SENSORIUM_SIGNAL, requestId: string, error: unknown,
): void {
  ctx.post({
    schema_version: 1,
    type: "event",
    wikiUri: ctx.wikiUri,
    listenable: SENSORIUM_FRAME,
    payload: { verb, requestId, error: error instanceof Error ? error.message : String(error) },
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
    sensorium: WIKI_SENSORIUM_CAP,
    onEa(ctx: IslandContext) {
      perceiver = createWikiSensorium(ctx.composite, opts);
      return () => { perceiver?.dispose(); perceiver = null; };
    },
    onSignal(type: string, raw: unknown, ctx: IslandContext): boolean {
      const verb: keyof typeof SENSORIUM_SIGNAL | null =
        type === SENSORIUM_SIGNAL.cohere ? "cohere"
        : type === SENSORIUM_SIGNAL.recall ? "recall"
        : type === SENSORIUM_SIGNAL.couple ? "couple"
        : null;
      if (verb === null) return false;

      const sig = (raw ?? {}) as RecallSignal;
      const fields = sig.args ?? sig;
      const requestId = typeof fields.requestId === "string" ? fields.requestId : "";

      // a claimed signal with NO live perceiver answers an ERROR frame — the ask-wire fails loud
      // on this end too (the supervisor rejects on it, never idles into its timeout).
      if (!perceiver) {
        postErrorFrame(ctx, verb, requestId,
          "the wiki-sensorium cap holds no live perceiver — the island answered before ea (or after teardown)");
        return true;
      }
      const p = perceiver;

      if (verb === "cohere") {
        p.cohere()
          .then((v) => postFrame(ctx, "cohere", requestId, v))
          .catch((err) => postErrorFrame(ctx, "cohere", requestId, err));
        return true;
      }
      if (verb === "recall") {
        const query: WikiRecallQuery = {
          ...(typeof fields.text === "string" ? { text: fields.text } : {}),
          ...(typeof fields.sigilHead === "string" ? { sigilHead: fields.sigilHead } : {}),
          ...(typeof fields.likeTitle === "string" ? { likeTitle: fields.likeTitle } : {}),
          ...(typeof fields.limit === "number" ? { limit: fields.limit } : {}),
        };
        p.recall(query)
          .then((v) => postFrame(ctx, "recall", requestId, v))
          .catch((err) => postErrorFrame(ctx, "recall", requestId, err));
        return true;
      }
      postFrame(ctx, "couple", requestId, p.couple());
      return true;
    },
  };
}

// ── the cross-tier witness (one hull, run identically on node AND in a browser worker) ──────────────

/**
 * The deterministic shore-witness embedder — 26-dim letter-frequency vectors. A WITNESS FIXTURE proving
 * the {@link TextEmbedder} shore carries a real semantic tier end-to-end; it stands in for no model
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

/** The witness verdict — every perceiver verb exercised over the fixture corpora, the cross-tier assertion surface. */
export interface WikiSensoriumWitness {
  /** cohere over the GLUE corpus — expects glues:true, vacuous:false, gate reconcilable. */
  readonly glue: WikiCoherenceVerdict;
  /** cohere over the OBSTRUCT corpus — expects radius>0 with the pair locus naming ornate-novel. */
  readonly obstruct: WikiCoherenceVerdict;
  /** form recall seeded on canon-a — expects canon-b top (they share the recurring phrase). */
  readonly formRecall: WikiRecallResult;
  /** recall WITHOUT an embedder — expects semantic:null (the shore honestly absent). */
  readonly bareRecall: WikiRecallResult;
  /** recall WITH the letter-frequency embedder, query = plain's own body — expects plain cosine-top. */
  readonly semanticRecall: WikiRecallResult;
  /** the couple() answer — expects the typed unbuilt refusal. */
  readonly coupling: WikiCouplingRead;
}

/**
 * Run the cross-tier witness — stand the two fixture islands (the GLUE/OBSTRUCT corpora), drive every
 * verb through the SAME {@link createWikiSensorium} hull, and hand back the readings. A node test and a
 * browser (Chromium) test assert the IDENTICAL verdict — one hull, two substrates, differ by grant not hull.
 */
export async function runWikiSensoriumWitness(): Promise<WikiSensoriumWitness> {
  const glueIsland = await buildFixtureIsland("lar:///ha.ka.ba/bags/sensorium-glue", GLUE_SEEDS);
  const obstructIsland = await buildFixtureIsland("lar:///ha.ka.ba/bags/sensorium-obstruct", OBSTRUCT_SEEDS);
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
