/**
 * worker-data-verbs — read-only data-plane reactors that run IN the admin worker.
 *
 * Sovereign-worker model (lararium-canonical-model #open-drift, project-sovereign-worker-model):
 * the data-plane lives in the worker, registered via makeAdminBehavior's `wireWorkerVerbs`
 * hook over the IslandContext, so it rides the dispatcher's verify-then-delegate gate for
 * free. These two read-only reactors depend ONLY on the CompositeStore (no pool, no node
 * edge) — the first slice relocated off the old main-thread jobRegistry.
 *
 * Pool-touching residency reactors (pin/unpin/evict) follow, commanding main via the
 * admin:evict-request seam.
 */

import { tiddlerText, type CompositeStore } from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";

const WIKI_PREFIX = "lar:///ha.ka.ba/@lararium/wikis/";

/** `where` — recipe-presence query: which bags hold a tiddler, highest-priority first. */
export function makeWhereReactor(composite: CompositeStore): VerbReactor {
  return async (args) => {
    const tiddler = typeof args["tiddler"] === "string" ? args["tiddler"] : "";
    if (!tiddler) throw new Error("args.tiddler is required");
    const bags = await composite.listBagsHolding(tiddler);
    return { tiddler, bags, primaryBag: bags[0] ?? null };
  };
}

/** `resolve` — Residency Model coordinate-inspection: live manifestations + tombstones. */
export function makeResolveReactor(composite: CompositeStore): VerbReactor {
  return async (args) => {
    const tiddler = typeof args["tiddler"] === "string" ? args["tiddler"] : "";
    if (!tiddler) throw new Error("args.tiddler is required");
    const live       = await composite.resolveAll(tiddler);
    const tombstones = await composite.listKapaeBags(tiddler);
    const manifestations = live.map((entry) => {
      const changeId = entry.record.meta?.changeId;
      return changeId !== undefined ? { bagId: entry.bagId, changeId } : { bagId: entry.bagId };
    });
    return { tiddler, manifestations, tombstones, winningBag: live[0]?.bagId ?? null };
  };
}

/** `list-wikis` — enumerate the wikis registered in the catalog (oracle tiddlers). */
export function makeListWikisReactor(composite: CompositeStore): VerbReactor {
  return async () => {
    const titles = await composite.listVisible();
    const wikis: Array<{ slug: string; uri: string; automergeUrl: string | null }> = [];
    for (const title of titles) {
      if (!title.startsWith(WIKI_PREFIX)) continue;
      const tail = title.slice(WIKI_PREFIX.length);
      if (tail.includes("/")) continue;
      const rec = await composite.get(title);
      wikis.push({ slug: tail, uri: title, automergeUrl: tiddlerText(rec) });
    }
    return { wikis };
  };
}
