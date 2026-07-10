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

import { composePalaceCaps, type PalaceCaps } from "./palace-caps.js";
import type { SearchResult } from "./search-cap.js";
import type { Taxonomy } from "./content-palace.js";

/** A lens names a palace entity; the caller maps lens → dir in `lensDirs`. */
export type Lens = string;

export interface LaresQuery {
  /** Recall over a lens (hybrid search): the verb, the palace as a parameter. */
  search(lens: Lens, query: string, opts?: { k?: number; wing?: string; room?: string }): Promise<SearchResult>;
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
  const capsFor = (lens: Lens): PalaceCaps => {
    let caps = cache.get(lens);
    if (!caps) {
      const dir = lensDirs[lens];
      if (!dir) throw new Error(`lares-query: unknown lens '${lens}' (no dir); known: ${Object.keys(lensDirs).join(", ")}`);
      caps = composePalaceCaps(dir);
      cache.set(lens, caps);
    }
    return caps;
  };
  return {
    // async so an unknown-lens throw surfaces as a REJECTION (the caller awaits), not a sync throw
    search: async (lens, query, opts = {}) => capsFor(lens).search.search(query, opts),
    relate: async (lens, entity, opts) => capsFor(lens).kg.queryEntity(entity, opts),
    structure: async (lens, wing, opts = {}) => capsFor(lens).graph.hallways(wing, opts.minCount),
    status: async (lens) => capsFor(lens).content.taxonomy(),
    lenses: () => Object.keys(lensDirs),
    close: async (): Promise<void> => {
      await Promise.allSettled([...cache.values()].map((c) => c.close()));
      cache.clear();
    },
  };
}
