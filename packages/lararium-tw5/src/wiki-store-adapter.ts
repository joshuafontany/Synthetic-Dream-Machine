/**
 * wiki-store-adapter — the pure-read SNAPSHOT projection that lets a VM-less wiki-causal-island
 * sense its OWN wikistore, isomorphic to the py-over-mempalace sensorium read. It folds the
 * composite's causal-stamped {@link CompositeEntry} surface through the shared wiki-sense fold
 * (wiki-sense-fold.ts — the ONE math, whose pono home ships in the plugin blob) into per-tiddler
 * LI (sheaf) plane readings, then runs the Robinson {@link consistencyRadius} over the ENGINEERED
 * cross-plane stalk. The cheapest planes sense end-to-end — structure ⊥ form — leaving content
 * (embeddings) to the perceiver's semantic shore.
 *
 * THE HULL RUNS PLATFORM-BLIND: pure organs only, so the SAME hull stands on node AND in a
 * browser worker. The islands differ by GRANT (which bags each mounts), never by hull; that single
 * cross-substrate identity IS the island-isomorphism the witness proves.
 *
 * THE ENGINEERED STALK (the vacuous-overlap trap): the comparison stalk carries the TITLE universe
 * every plane speaks to, so structure and form share a genuine overlap and the radius reads
 * NON-VACUOUS. Both planes assign every resolved title a [0,1] load salience through their own
 * lens: structure sees the RED sigil register, form sees the RECURRING shingle grammar. A tiddler
 * rich in one lens and bare in the other DIVERGES the planes — a localized obstruction; a corpus
 * where the two lenses track each other GLUES (radius 0).
 *
 * Meme: lar:///ha.ka.ba/lares/api/wiki-store-adapter
 */

import type { CompositeStore, CompositeEntry, ChangeOrigin } from "@lararium/mesh";
import { consistencyRadius, type ConsistencyRadius, type ComparisonStalk, type PlaneRestriction } from "@lararium/mesh";
import { CompositeStore as CompositeStoreCtor } from "@lararium/mesh";
import { MemoryTiddlerStore } from "./memory-store.js";
import { foldCorpus, corpusPlanes } from "./wiki-sense-fold.js";
import { senseDocOfEntry } from "./wiki-corpus-reader.js";

// ── the per-tiddler plane readings (structure ⊥ form; content rides the perceiver's shore) ──────────

/** One tiddler's SNAPSHOT reading — its two LI-plane saliences plus the causal stamp it read as-of. */
export interface WikiTiddlerReading {
  readonly title: string;
  readonly bagId: string;
  /** structure plane [0,1]: the tiddler carries the RED meme-ast sigil register (load, not essence). */
  readonly structure: number;
  /** form plane [0,1]: the tiddler participates in shingle patterns that RECUR across the corpus. */
  readonly form: number;
  /** the causal coordinates carried from {@link CompositeEntry} — heads + changeId (no global now). */
  readonly heads: readonly string[] | null;
  readonly changeId: string | null;
}

/** The whole snapshot — the readings plus the engineered stalk + sheaf restrictions ready for the radius. */
export interface WikiSensoriumSnapshot {
  readonly readings: readonly WikiTiddlerReading[];
  readonly stalk: ComparisonStalk;
  readonly restrictions: readonly PlaneRestriction[];
}

/**
 * Project a CORPUS of causal-stamped entries into the snapshot — the pure-read fold, delegated to
 * the shared wiki-sense fold so every mouth speaks the same math. Structure reads per tiddler
 * (local); form reads corpus-aware — the recurring-shingle census — both as load indicators. Both
 * planes key EVERY title, so the engineered stalk carries a genuine overlap — the radius reads
 * non-vacuous by construction.
 */
export function projectWikiSensorium(entries: readonly CompositeEntry[]): WikiSensoriumSnapshot {
  const fold = foldCorpus(entries.map(senseDocOfEntry));
  const { stalk, restrictions } = corpusPlanes(fold);
  const structureVal = restrictions[0]!.value;
  const formVal = restrictions[1]!.value;
  const readings: WikiTiddlerReading[] = fold.docs.map((d) => ({
    title: d.title,
    bagId: d.bagId ?? "",
    structure: structureVal.get(d.title) ?? 0,
    form: formVal.get(d.title) ?? 0,
    heads: d.heads,
    changeId: d.changeId ?? null,
  }));
  return { readings, stalk, restrictions };
}

/**
 * The WIKI-STORE ADAPTER — a pure-read cap over ONE VM-less wiki-causal-island's composite. It
 * reads the island's own resolved surface (kāpae-honored, causal-stamped), projects the planes,
 * and reads the cross-plane consistency radius. Read-only: it never writes the store it senses.
 */
export class WikiStoreAdapter {
  constructor(private readonly store: CompositeStore) {}

  /** The causal-stamped snapshot projection over the island's OWN resolved surface. */
  async snapshot(): Promise<WikiSensoriumSnapshot> {
    const entries = await this.store.entries();
    return projectWikiSensorium(entries);
  }

  /** The Robinson li-radius over the engineered structure⊥form stalk — the wiki-sensorium's read. */
  async consistency(): Promise<ConsistencyRadius> {
    const snap = await this.snapshot();
    return consistencyRadius(snap.restrictions, snap.stalk);
  }
}

// ── the cross-tier witness (one hull, run identically on node AND in a browser worker) ──────────────

/** One tiddler seed for a fixture wikistore — a title + its memetic-wikitext body. */
export interface FixtureTiddler {
  readonly title: string;
  readonly text: string;
}

/**
 * Build a wiki-causal-island fixture — a {@link CompositeStore} scoped to its OWN single writable bag
 * (the island's bagStack), seeded with tiddlers. The island differs from its sibling by GRANT (its
 * bag id), never by hull. Awaits every seed put — the fixture hands back a fully-landed corpus.
 */
export async function buildFixtureIsland(bagId: string, seeds: readonly FixtureTiddler[]): Promise<CompositeStore> {
  const store = new CompositeStoreCtor();
  const bag = new MemoryTiddlerStore(bagId);
  store.addLayer({ bagId, store: bag, writable: true });
  const origin: ChangeOrigin = { kind: "canon-hydrate", receipt: bagId };
  for (const s of seeds) {
    await bag.put({ tiddler: { title: s.title, text: s.text } }, origin);
  }
  return store;
}

/** The witness verdict — the two fixtures' radii + the non-vacuity flag, the cross-tier assertion surface. */
export interface WikiConsistencyWitness {
  readonly glue: ConsistencyRadius;
  readonly obstruct: ConsistencyRadius;
}

// ── the two engineered fixtures — a GLUE corpus and an OBSTRUCT corpus, deterministic ──────────────

/** Two tiddlers rich in BOTH lenses (sigils + a shared recurring phrase) plus one bare-prose tiddler. */
const SHARED_PHRASE = "the tideline carries uncertain cyclic pressures across the shore";

/** The GLUE corpus: structure and form AGREE on every unit — sigil-rich ⟺ pattern-rich, bare ⟺ bare. */
export const GLUE_SEEDS: readonly FixtureTiddler[] = [
  // canon-a: carries the red register AND shares the recurring phrase with canon-b → structure 1, form 1.
  { title: "canon-a", text: `<<~ confidence Synthesis 12/20 >> ${SHARED_PHRASE} <<~ ward * L-Prime >>` },
  // canon-b: same construction → structure 1, form 1 (the phrase recurs across a-and-b).
  { title: "canon-b", text: `<<~ confidence Synthesis 11/20 >> ${SHARED_PHRASE} <<~ ward ! L-Prime >>` },
  // plain: no sigils AND a unique body (recurs nowhere) → structure 0, form 0.
  { title: "plain", text: "a solitary line of prose that occurs in no other tiddler at all here" },
];

/** The OBSTRUCT corpus: the glue baseline PLUS an ornate-yet-novel tiddler where the lenses DISAGREE. */
export const OBSTRUCT_SEEDS: readonly FixtureTiddler[] = [
  ...GLUE_SEEDS,
  // ornate-novel: carries the red register (structure 1) but a wholly UNIQUE body (form 0) → obstruction.
  {
    title: "ornate-novel",
    text: "<<~ lares aim >> a singular unrepeated utterance found nowhere else in this corpus zzz <<~ oracle >>",
  },
];

/**
 * Run the cross-tier witness — build the GLUE and OBSTRUCT islands, sense each through the SAME
 * {@link WikiStoreAdapter} hull, and return both radii. The caller (a node test AND a browser-worker
 * test) asserts the identical verdict: `vacuous:false` on both (a genuine engineered stalk, not a
 * false glue) and the radius FLIPS 0 → >0 between glue and obstruct. That single assertion, holding on
 * two substrates, proves the island-isomorphism — one hull, differ by grant not hull.
 */
export async function runWikiConsistencyWitness(): Promise<WikiConsistencyWitness> {
  const glueIsland = await buildFixtureIsland("lar:///ha.ka.ba/bags/@witness-glue", GLUE_SEEDS);
  const obstructIsland = await buildFixtureIsland("lar:///ha.ka.ba/bags/@witness-obstruct", OBSTRUCT_SEEDS);
  const glue = await new WikiStoreAdapter(glueIsland).consistency();
  const obstruct = await new WikiStoreAdapter(obstructIsland).consistency();
  return { glue, obstruct };
}
