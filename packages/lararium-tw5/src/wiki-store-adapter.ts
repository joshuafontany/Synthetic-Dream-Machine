/**
 * wiki-store-adapter — the pure-read SNAPSHOT projection that lets a wiki-causal-island sense its OWN
 * wikistore, isomorphic to the py-over-mempalace sensorium read. It folds the composite's
 * causal-stamped {@link CompositeEntry} surface into per-tiddler LI (sheaf) plane readings, then runs
 * the Robinson {@link consistencyRadius} over an ENGINEERED cross-plane stalk. S0 senses the CHEAPEST
 * planes end-to-end — structure ⊥ form — and leaves content (embeddings) and the cap-stack to S1+.
 *
 * THE HULL RUNS PLATFORM-BLIND. It composes only pure organs — the meme-ast island scanner
 * ({@link collectEvents}) reads structure, a corpus shingle-mine reads form, and the lifted
 * `@lararium/mesh` consistency core reads the radius — so the SAME hull stands on node AND in a
 * browser worker. The islands differ by GRANT (which bags each mounts), never by hull; that single
 * cross-substrate identity IS the island-isomorphism the witness proves.
 *
 * THE ENGINEERED STALK (the real S0 labor — the vacuous-overlap trap): the comparison stalk carries
 * the TITLE universe every plane speaks to, so structure and form share a genuine overlap and the
 * radius reads NON-VACUOUS. Both planes assign every resolved title a [0,1] load salience through
 * their own lens: structure sees the RED sigil register (does the tiddler carry meme-ast structure?),
 * form sees the RECURRING shingle grammar (does the tiddler participate in patterns that recur across
 * the corpus?). A tiddler rich in one lens and bare in the other DIVERGES the planes — a localized
 * obstruction; a corpus where the two lenses track each other GLUES (radius 0).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-store-adapter
 */

import type { CompositeStore, CompositeEntry, LarTiddlerRecord, ChangeOrigin } from "@lararium/mesh";
import {
  consistencyRadius,
  type PlaneRestriction,
  type ComparisonStalk,
  type ConsistencyRadius,
} from "@lararium/mesh";
import { CompositeStore as CompositeStoreCtor } from "@lararium/mesh";
import { collectEvents } from "./meme-ast/index.js";
import { MemoryTiddlerStore } from "./memory-store.js";

// ── the per-tiddler plane readings (structure ⊥ form; content OUT of S0) ────────────────────────────

/** One tiddler's SNAPSHOT reading — its two S0 LI-plane saliences plus the causal stamp it read as-of. */
export interface WikiTiddlerReading {
  readonly title: string;
  readonly bagId: string;
  /** structure plane [0,1]: the tiddler carries the RED meme-ast sigil register (load, not essence). */
  readonly structure: number;
  /** form plane [0,1]: the fraction of the tiddler's shingles that RECUR across the corpus. */
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

/** The shingle width the form lens mines — a small char k-gram, cheap and deterministic. */
export const FORM_SHINGLE_K = 6;

/** Shred a tiddler's text into its DISTINCT char k-gram shingles (the form lens's atomic patterns). */
export function shingles(text: string, k: number = FORM_SHINGLE_K): Set<string> {
  const out = new Set<string>();
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length === 0) return out;
  if (t.length <= k) { out.add(t); return out; }
  for (let i = 0; i + k <= t.length; i++) out.add(t.slice(i, i + k));
  return out;
}

/**
 * The STRUCTURE-plane salience of one tiddler [0,1] — the meme-ast RED register load. `collectEvents`
 * scans the disjoint `<<~…>>` sigil islands; a tiddler carrying at least one sigil reads structurally
 * load-bearing (1), a bare-prose tiddler reads 0. The load indicator stays deterministic and cheap —
 * the graded sigil-density refinement waits for S1 (the vacuous-overlap trap wants a clean flip first).
 */
export function structureSalience(text: string): number {
  return collectEvents(text).length >= 1 ? 1 : 0;
}

/** Pull a tiddler's body text — the `text` field, the memetic-wikitext carrier. */
function bodyOf(record: LarTiddlerRecord): string {
  const text = (record.tiddler as Record<string, unknown>)["text"];
  return typeof text === "string" ? text : "";
}

/**
 * Project a CORPUS of causal-stamped entries into the S0 snapshot — the pure-read fold. Structure
 * reads per tiddler (local); form reads corpus-aware — it first mines the GLOBAL shingle→document-count
 * map, then a tiddler's form salience = the fraction of its shingles that occur in ≥2 documents (the
 * recurring grammar it participates in), read as a load indicator (>0 ⟹ 1). Both planes key EVERY
 * title, so the engineered stalk (the title universe) carries a genuine overlap — the radius reads
 * non-vacuous by construction.
 */
export function projectWikiSensorium(entries: readonly CompositeEntry[]): WikiSensoriumSnapshot {
  // corpus form-mine: document frequency of each shingle across the resolved surface.
  const docFreq = new Map<string, number>();
  const perDoc = new Map<string, Set<string>>();
  for (const e of entries) {
    const sh = shingles(bodyOf(e.record));
    perDoc.set(e.title, sh);
    for (const s of sh) docFreq.set(s, (docFreq.get(s) ?? 0) + 1);
  }

  const readings: WikiTiddlerReading[] = [];
  const structureVal = new Map<string, number>();
  const formVal = new Map<string, number>();
  for (const e of entries) {
    const structure = structureSalience(bodyOf(e.record));
    const sh = perDoc.get(e.title)!;
    let recurring = 0;
    for (const s of sh) if ((docFreq.get(s) ?? 0) >= 2) recurring++;
    // the recurring-shingle fraction, read as a load indicator (participates in the corpus grammar ⟹ 1).
    const form = sh.size > 0 && recurring > 0 ? 1 : 0;
    structureVal.set(e.title, structure);
    formVal.set(e.title, form);
    readings.push({
      title: e.title, bagId: e.bagId, structure, form, heads: e.heads, changeId: e.changeId,
    });
  }

  const units = readings.map((r) => r.title);
  const restrictions: PlaneRestriction[] = [
    { plane: "structure", variance: "sheaf", value: structureVal },
    { plane: "form", variance: "sheaf", value: formVal },
  ];
  return { readings, stalk: { units }, restrictions };
}

/**
 * The WIKI-STORE ADAPTER — a pure-read cap over ONE wiki-causal-island's composite. It reads the
 * island's own resolved surface (kāpae-honored, causal-stamped), projects the S0 planes, and reads the
 * cross-plane consistency radius. Read-only: it never writes the store it senses.
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
 * bag id), never by hull.
 */
export function buildFixtureIsland(bagId: string, seeds: readonly FixtureTiddler[]): CompositeStore {
  const store = new CompositeStoreCtor();
  const bag = new MemoryTiddlerStore(bagId);
  store.addLayer({ bagId, store: bag, writable: true });
  const origin: ChangeOrigin = { kind: "canon-hydrate", receipt: bagId };
  for (const s of seeds) {
    void bag.put({ tiddler: { title: s.title, text: s.text } }, origin);
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
  const glueIsland = buildFixtureIsland("lar:///ha.ka.ba/@witness-glue", GLUE_SEEDS);
  const obstructIsland = buildFixtureIsland("lar:///ha.ka.ba/@witness-obstruct", OBSTRUCT_SEEDS);
  const glue = await new WikiStoreAdapter(glueIsland).consistency();
  const obstruct = await new WikiStoreAdapter(obstructIsland).consistency();
  return { glue, obstruct };
}
