/**
 * palace-caps — the UNIFIED cap-stack every palace entity #has. A palace is a nameless entity whose
 * behavior IS its composed caps; this composer hands ANY palace dir the full stack — content store,
 * hybrid search, bitemporal KG, structure/graph — so every instance (contentpalace, structurepalace,
 * formpalace, persistencepalace, the mesh children, the memetic-wikitext peers) carries the same
 * capabilities uniformly. Each cap is dir-keyed (composeHolder), so the caps flow to every palace by
 * construction; this makes that flow explicit + closes them as one.
 *
 * The consumed engine + code (chroma · search_memories · KnowledgeGraph · palace_graph) sit behind
 * the causal-island boundary; the caps that produce results depend on the palace's data SHAPE (graph
 * needs `entities` metadata; search needs documents) — but the stack COMPOSES on every palace.
 * The meta-model cap is palace-LESS (a process-wide encoder), so it is NOT per-palace here.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/nalu
 */

import { makeContentPalace, type ContentPalace, type ContentPalaceOptions } from "./content-palace.js";
import { makeSearchCap, type SearchCap, type SearchCapOptions } from "./search-cap.js";
import { makeKgCap, type KgCap, type KgCapOptions } from "./kg-cap.js";
import { makeGraphCap, type GraphCap, type GraphCapOptions } from "./graph-cap.js";

/** The full cap-stack a palace entity #has — one per palace dir, closed together. */
export interface PalaceCaps {
  readonly content: ContentPalace;
  readonly search: SearchCap;
  readonly kg: KgCap;
  readonly graph: GraphCap;
  /** Release every cap's holder reference for this palace. */
  close(): Promise<void>;
}

export interface PalaceCapsOptions {
  readonly content?: ContentPalaceOptions;
  readonly search?: SearchCapOptions;
  readonly kg?: KgCapOptions;
  readonly graph?: GraphCapOptions;
}

/**
 * Compose the full cap-stack for a palace dir. Every palace entity gets the SAME caps uniformly — the
 * "all caps flow to all palaces" invariant made a single call. The per-cap holders (content/search/
 * kg/graph) each ref-count independently via composeHolder; `close()` releases all four.
 */
export function composePalaceCaps(dir: string, opts: PalaceCapsOptions = {}): PalaceCaps {
  const content = makeContentPalace(dir, opts.content ?? {});
  const search = makeSearchCap(dir, opts.search ?? {});
  const kg = makeKgCap(dir, opts.kg ?? {});
  const graph = makeGraphCap(dir, opts.graph ?? {});
  return {
    content,
    search,
    kg,
    graph,
    close: async (): Promise<void> => {
      // close each independently — one holder fault must not orphan the others
      await Promise.allSettled([content.close(), search.close(), kg.close(), graph.close()]);
    },
  };
}
