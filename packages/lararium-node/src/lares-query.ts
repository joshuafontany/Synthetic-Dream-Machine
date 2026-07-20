/**
 * lares-query — the VERB-FIRST, LENS-PARAMETERIZED query surface (operator kupono): the caps are
 * universal Ki-VERBS, the palace is a PARAMETER (a lens). Expose the VERBS — search · relate ·
 * structure · status — each taking a `lens` argument that picks the palace, rather than multiplying
 * tools per palace (4 caps × N palaces = a sprawl). This is the foundation the `/mcp lares` server +
 * `lares` CLI both drive: one verb, any lens.
 *
 * A lens = a palace entity (content · structure · form · persistence · …); its dir is supplied in
 * `lensDirs`. Caps are composed per lens LAZILY (composePalaceCaps) and cached; `close()` releases all.
 * Independent of the spatial-projection model refinement — it rides the existing caps as they stand.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/nalu
 */

import {
  composePalaceCaps, type PalaceCaps,
  makeStructurePalace, makeFormPalace, makePersistencePalace,
  type StructurePalace, type FormPalace, type PersistencePalace,
} from "./sensorium.js";
import type { SearchResult, SearchHit } from "./search-cap.js";
import type { Taxonomy } from "./sensorium.js";
import { sensoriumLenses } from "./vessel-paths.js";

/** A lens names a palace entity; the caller maps lens → dir in `lensDirs`. */
export type Lens = string;

/** A non-content plane read (structure/form/persistence) OR the cross-plane widen — a plane-tagged bag the
 *  caller emits as-is. The `search` verb returns this for a non-content lens instead of a {@link
 *  SearchResult}, so each lens rides its plane's OWN semantics rather than a content query forced onto a
 *  non-content store. */
export interface PlaneRead {
  readonly plane: string;
  readonly [k: string]: unknown;
}

/** A content cid — a full sha256 hex, optionally chunk-suffixed (`<hex64>_<n>`). Non-cid text reads as a
 *  query; the by-cid planes (form/persistence) answer an honest null on a text query (no text→vector). */
const CID_RE = /^[0-9a-f]{64}(_\d+)?$/;

export interface LaresQuery {
  /**
   * Recall over a lens: the verb, the palace as a parameter. Each lens rides its PLANE's own semantics —
   * `content` hybrid-searches (BM25+vector); `structure` rides the structural query face (text → parse-tree
   * → structural embed → nearest shapes); `form`/`persistence` answer by-cid (a text query → honest null,
   * no text→vector); `crossplane` runs the content search then WIDENS each hit across form+structure by the
   * cross-plane cid-join (human eyes on all three planes from one text query). A content lens returns a
   * {@link SearchResult}; every other lens returns a plane-tagged {@link PlaneRead}.
   */
  search(lens: Lens, query: string, opts?: { k?: number; wing?: string; room?: string; notRoot?: string; selfWeight?: number }): Promise<SearchResult | PlaneRead>;
  /** Relate an entity over a lens (the bitemporal KG for that palace). */
  relate(lens: Lens, entity: string, opts?: { asOf?: string; direction?: "incoming" | "outgoing" }): Promise<unknown>;
  /** The structure/graph of a lens (entity-pair hallways for a wing). */
  structure(lens: Lens, wing: string, opts?: { minCount?: number }): Promise<unknown[]>;
  /** The status/taxonomy of a lens (wings/rooms/entities + total). */
  status(lens: Lens): Promise<Taxonomy>;
  /** The lenses this surface can address. */
  lenses(): Lens[];
  /** Release every composed lens's caps. */
  close(): Promise<void>;
}

/**
 * Compose the verb-first surface over a lens→dir map. Verbs dispatch to the per-lens cap-stack
 * (composed lazily on first use, cached). An unknown lens throws (fail-loud: the caller named a lens
 * with no dir). `close()` releases all composed lenses.
 */
export function makeLaresQuery(lensDirs: Record<Lens, string>): LaresQuery {
  const cache = new Map<Lens, PalaceCaps>();
  // The per-plane read-clients (structure/form/persistence), lazily opened + cached by DIR (one holder per
  // canonical dir), closed with the caps. A non-content lens rides its OWN client, never the content cap.
  const structureClients = new Map<string, StructurePalace>();
  const formClients = new Map<string, FormPalace>();
  const persistenceClients = new Map<string, PersistencePalace>();

  const dirFor = (lens: Lens): string => {
    const dir = lensDirs[lens];
    if (!dir) throw new Error(`lares-query: unknown lens '${lens}' (no dir); known: ${Object.keys(lensDirs).join(", ")}`);
    return dir;
  };
  const capsFor = (lens: Lens): PalaceCaps => {
    let caps = cache.get(lens);
    if (!caps) { caps = composePalaceCaps(dirFor(lens)); cache.set(lens, caps); }
    return caps;
  };
  const structureFor = (dir: string): StructurePalace => {
    let c = structureClients.get(dir); if (!c) { c = makeStructurePalace(dir); structureClients.set(dir, c); } return c;
  };
  const formFor = (dir: string): FormPalace => {
    let c = formClients.get(dir); if (!c) { c = makeFormPalace(dir); formClients.set(dir, c); } return c;
  };
  const persistenceFor = (dir: string): PersistencePalace => {
    let c = persistenceClients.get(dir); if (!c) { c = makePersistencePalace(dir); persistenceClients.set(dir, c); } return c;
  };
  // The last segment names the PLANE (`memory/structure` → `structure`); the short `structure` is its own.
  const planeOf = (lens: Lens): string => lens.split("/").pop() ?? lens;

  /** HUMAN-QUERY ALL PLANES — the content search widened per hit across form + structure by the cid-join.
   *  The sibling planes resolve against the SAME sensorium prefix as the `crossplane` lens. */
  const crossplaneSearch = async (lens: Lens, query: string, k?: number): Promise<PlaneRead> => {
    const prefix = lens.includes("/") ? lens.slice(0, lens.lastIndexOf("/")) : "";
    const sib = (plane: string): Lens => (prefix ? `${prefix}/${plane}` : plane);
    const contentLens = sib("content");
    if (!lensDirs[contentLens]) throw new Error(`lares-query: crossplane needs a sibling 'content' lens (${contentLens})`);
    const res = await capsFor(contentLens).search.search(query, { ...(k !== undefined ? { k } : {}) });
    const structureDir = lensDirs[sib("structure")];
    const formDir = lensDirs[sib("form")];
    const structure = structureDir ? structureFor(structureDir) : null;
    const form = formDir ? formFor(formDir) : null;
    const hits = await Promise.all((res.results ?? []).map(async (hit: SearchHit) => {
      const sha = typeof hit["lar_verbatim_sha"] === "string" ? (hit["lar_verbatim_sha"] as string) : "";
      const cid = typeof hit["cid"] === "string" ? (hit["cid"] as string) : "";
      const key = sha || cid;
      const [structureEntry, formEntry] = await Promise.all([
        structure && key ? structure.entryForCid(key).catch(() => null) : Promise.resolve(null),
        form && key ? form.get(key).catch(() => null) : Promise.resolve(null),
      ]);
      return {
        cid: cid || key,
        join_key: key,
        content: { present: true, head: (hit.text ?? "").slice(0, 120).replace(/\n/g, " "),
                   source_file: hit.source_file ?? "", wing: hit.wing ?? null, room: hit.room ?? null },
        structure: structureEntry ? { present: true, ...structureEntry } : { present: false },
        form: formEntry ? { present: true, key: formEntry.key, ...formEntry.metadata } : { present: false },
      };
    }));
    return { plane: "crossplane", query, hits, matched: hits.length };
  };

  return {
    // async so an unknown-lens throw surfaces as a REJECTION (the caller awaits), not a sync throw.
    // A non-content lens routes to its PLANE's own door (the A1 fix: never a content query forced onto a
    // structure/form/persistence store) — content hybrid-searches, structure rides the structural query
    // face, form/persistence answer by-cid, crossplane widens across all three.
    search: async (lens, query, opts = {}): Promise<SearchResult | PlaneRead> => {
      const plane = planeOf(lens);
      if (plane === "crossplane") return crossplaneSearch(lens, query, opts.k);
      if (plane === "content") return capsFor(lens).search.search(query, opts);
      const dir = dirFor(lens);
      if (plane === "structure") {
        const res = await structureFor(dir).query({ text: query, ...(opts.k !== undefined ? { nResults: opts.k } : {}) });
        return { plane: "structure", present: true, ...res };
      }
      if (plane === "form") {
        if (!CID_RE.test(query)) return { plane: "form", present: true, matches: [],
          note: "form: text queries need the induced constructicon (not a queryable grammar) — query by cid" };
        return { plane: "form", present: true, cid: query, record: await formFor(dir).get(query), matches: [] };
      }
      if (plane === "persistence") {
        if (!CID_RE.test(query)) return { plane: "persistence", present: true, matches: [],
          note: "persistence: text queries need an assertion vector (the plane runs no embedder) — query by cid" };
        return { plane: "persistence", present: true, cid: query, record: await persistenceFor(dir).get(query), matches: [] };
      }
      // an unrecognized plane keeps the prior content-cap behavior (never a silent drop).
      return capsFor(lens).search.search(query, opts);
    },
    relate: async (lens, entity, opts) => capsFor(lens).kg.queryEntity(entity, opts),
    structure: async (lens, wing, opts = {}) => capsFor(lens).graph.hallways(wing, opts.minCount),
    status: async (lens) => capsFor(lens).content.taxonomy(),
    lenses: () => Object.keys(lensDirs),
    close: async (): Promise<void> => {
      await Promise.allSettled([
        ...[...cache.values()].map((c) => c.close()),
        ...[...structureClients.values()].map((c) => c.close()),
        ...[...formClients.values()].map((c) => c.close()),
        ...[...persistenceClients.values()].map((c) => c.close()),
      ]);
      cache.clear(); structureClients.clear(); formClients.clear(); persistenceClients.clear();
    },
  };
}

/**
 * THE CORRIDOR — the memory sensorium's four planes, behind the four verbs. The one binding the whole
 * surface waited on.
 *
 * Every piece stood built and none of them touched: the py holders serve NDJSON, `composePalaceCaps`
 * stacks any palace dir, `makeLaresQuery` takes the lens as a parameter — and nothing named the planes.
 * This names them. The CLI, the MCP seat, and `lares_uds.py` all drive THIS, so one verb reaches any
 * plane and no caller composes its own caps behind the daemon's back (a second cap-stack on a palace dir
 * opens a second holder, the flock fires, and the holder exits — the single-owner law, learned the hard
 * way).
 */
export function openMemorySensorium(): LaresQuery {
  return makeLaresQuery(sensoriumLenses());
}
