/**
 * catalog-accessor — one catalog-driven reach to ANY bag (access ≠ load).
 *
 * The bag-stack ontology (operator-approved 2026-06-09) splits two concerns the
 * old per-verb handle-plumbing fused: LOAD (tiddlers layered into a render
 * composite) vs ACCESS (data-plane reach to a bag's doc). `@catalog` IS the
 * registry — a bag-URI → AutomergeUrl map. Given the catalog doc URL and a Repo,
 * any holder can `repo.find()` any registered bag ON DEMAND without layering it
 * into a composite.
 *
 * This collapses the verb plumbing: reactors that took a bespoke `catalogHandle`
 * (and `islandHandle`, and any other specific handle) now take ONE accessor and
 * reach every bag through `find(bagUri)`. The catalog-writing verbs
 * (init-wiki / bag-epoch / rotate-recipe) open `@catalog` via `handle()` — its
 * own registered URL — write, and sync; they never LOAD it as a render layer.
 *
 * Pairs with [[project_bag_stack_ontology]] (access≠load keystone) and
 * [[project_sovereign_worker_model]] (the worker reaches @catalog this way once
 * the verbs land worker-side — no catalog render-layer in the admin recipe).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/catalog-accessor
 */

import {
  CATALOG_DOC_URI,
  tiddlerText,
  type Repo,
  type DocHandle,
  type AutomergeUrl,
  type LarDoc,
} from "@lararium/mesh";

export interface CatalogAccessor {
  /** The `@catalog` registry doc itself, resolved + cached. */
  handle(): Promise<DocHandle<LarDoc>>;
  /** The AutomergeUrl a registry entry points at, or null if unregistered. */
  urlOf(bagUri: string): Promise<string | null>;
  /** `repo.find()` the bag the registry maps `bagUri` to (null if unregistered). */
  find(bagUri: string): Promise<DocHandle<LarDoc> | null>;
}

/**
 * Build a catalog accessor over `repo`, anchored at the `@catalog` doc URL.
 *
 * The catalog handle is resolved once and cached; `urlOf` reads the registry
 * entry's `text` field (the bag's AutomergeUrl); `find` resolves that bag's doc.
 * Asking for `CATALOG_DOC_URI` itself short-circuits to the catalog handle (the
 * registry need not register itself).
 */
export function makeCatalogAccessor(repo: Repo, catalogUrl: string): CatalogAccessor {
  let _catalog: Promise<DocHandle<LarDoc>> | null = null;
  const handle = (): Promise<DocHandle<LarDoc>> => {
    if (!_catalog) {
      _catalog = (async () => {
        const h = await repo.find<LarDoc>(
          catalogUrl as AutomergeUrl,
          { allowableStates: ["ready", "unavailable"] },
        );
        await h.whenReady();
        return h;
      })();
    }
    return _catalog;
  };

  const urlOf = async (bagUri: string): Promise<string | null> => {
    if (bagUri === CATALOG_DOC_URI) return catalogUrl;
    const cat = await handle();
    return tiddlerText(cat.doc()?.tiddlers?.[bagUri]) ?? null;
  };

  const find = async (bagUri: string): Promise<DocHandle<LarDoc> | null> => {
    if (bagUri === CATALOG_DOC_URI) return handle();
    const url = await urlOf(bagUri);
    if (!url) return null;
    const h = await repo.find<LarDoc>(
      url as AutomergeUrl,
      { allowableStates: ["ready", "unavailable"] },
    );
    await h.whenReady();
    return h;
  };

  return { handle, urlOf, find };
}
