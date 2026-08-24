/**
 * catalog-accessor — one catalog-driven reach to ANY bag (access ≠ load).
 *
 * The bag-stack ontology splits two concerns the
 * old per-verb handle-plumbing fused: LOAD (tiddlers layered into a render
 * composite) vs ACCESS (data-plane reach to a bag's doc). `@catalog` IS the
 * registry — a bag-URI → AutomergeUrl map. Given the catalog doc URL and a Repo,
 * any holder can `repo.find()` any registered bag ON DEMAND without layering it
 * into a composite.
 *
 * This collapses the verb plumbing: reactors that took a bespoke `catalogHandle`
 * (and `islandHandle`, and any other specific handle) now take ONE accessor and
 * reach every bag through `find(bagUri)`. The catalog-writing verbs
 * (init-wiki / bag-compact / rotate-recipe) open `@catalog` via `handle()` — its
 * own registered URL — write, and sync; they never LOAD it as a render layer.
 *
 * Pairs with [[project_bag_stack_ontology]] (access≠load keystone) and
 * [[project_sovereign_worker_model]] (the worker reaches @catalog this way once
 * the verbs land worker-side — no catalog render-layer in the daemon recipe).
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/catalog-accessor
 */

import {
  CATALOG_DOC_URI,
  tiddlerText,
  AutomergeDocStore,
  type Repo,
  type DocHandle,
  type AutomergeUrl,
  type LarDoc,
  type LarTiddlerRecord,
  type LarTiddlerStore,
} from "@lararium/mesh";

export interface CatalogAccessor {
  /** The `catalog` registry doc itself, resolved + cached. */
  handle(): Promise<DocHandle<LarDoc>>;
  /** The AutomergeUrl a registry entry points at, or null if unregistered. */
  urlOf(bagUri: string): Promise<string | null>;
  /** The full registry RECORD at a title (e.g. a user wiki recipe), or null.
   *  @catalog holds registry data — wiki recipes, bag oracles — NOT loaded as a
   *  composite layer (access≠load); reads come through here. */
  recordOf(title: string): Promise<LarTiddlerRecord | null>;
  /** `repo.find()` the bag the registry maps `bagUri` to (null if unregistered). */
  find(bagUri: string): Promise<DocHandle<LarDoc> | null>;
  /** A read+write store over the bag's own doc, resolved by access (null if
   *  unregistered). The access-WRITE surface (`wiki-layer-ontology#write-law`):
   *  a deep-bag residency write reaches the bag's doc directly and writes-then-
   *  syncs — it MOUNTS nothing into a composite (access≠load). Authority rides
   *  the cap-gate upstream, never a composite read-only flag. */
  storeOf(bagUri: string): Promise<LarTiddlerStore | null>;
}

/**
 * Build a catalog accessor over `repo`, anchored at the `catalog` doc URL.
 *
 * The catalog handle is resolved once and cached; `urlOf` reads the registry
 * entry's `text` field (the bag's AutomergeUrl); `find` resolves that bag's doc.
 * Asking for `CATALOG_DOC_URI` itself short-circuits to the catalog handle (the
 * registry need not register itself).
 */
// Partition-as-normal-state: an unavailable doc gets a bounded wait for sync
// to deliver, then a LOUD throw — never a forever-pending whenReady the caller
// must guess at by timeout.
const ACCESS_READY_TIMEOUT_MS = 8_000;

export async function findOrThrow(repo: Repo, url: string, what: string): Promise<DocHandle<LarDoc>> {
  // automerge-repo 2.6: find() resolves only when READY and REJECTS on
  // unavailable. Race against a bounded timeout; throw LOUD if it never arrives.
  const h = await Promise.race([
    repo.find<LarDoc>(url as AutomergeUrl).catch(() => null),
    new Promise<DocHandle<LarDoc> | null>((res) => setTimeout(() => res(null), ACCESS_READY_TIMEOUT_MS)),
  ]);
  if (h) return h;
  throw new Error(`[catalog-accessor] ${what} unavailable — doc ${url} never arrived (${ACCESS_READY_TIMEOUT_MS}ms)`);
}

export function makeCatalogAccessor(repo: Repo, catalogUrl: string): CatalogAccessor {
  let _catalog: Promise<DocHandle<LarDoc>> | null = null;
  const handle = (): Promise<DocHandle<LarDoc>> => {
    if (!_catalog) {
      _catalog = findOrThrow(repo, catalogUrl, "catalog registry");
      // A failed resolve must not poison the cache — the next call retries.
      _catalog.catch(() => { _catalog = null; });
    }
    return _catalog;
  };

  const urlOf = async (bagUri: string): Promise<string | null> => {
    if (bagUri === CATALOG_DOC_URI) return catalogUrl;
    const cat = await handle();
    return tiddlerText(cat.doc()?.tiddlers?.[bagUri]) ?? null;
  };

  const recordOf = async (title: string): Promise<LarTiddlerRecord | null> => {
    const cat = await handle();
    return (cat.doc()?.tiddlers?.[title] as LarTiddlerRecord | undefined) ?? null;
  };

  const find = async (bagUri: string): Promise<DocHandle<LarDoc> | null> => {
    if (bagUri === CATALOG_DOC_URI) return handle();
    const url = await urlOf(bagUri);
    if (!url) return null;
    return findOrThrow(repo, url, `bag ${bagUri}`);
  };

  const storeOf = async (bagUri: string): Promise<LarTiddlerStore | null> => {
    const h = await find(bagUri);
    return h ? new AutomergeDocStore(h, bagUri) : null;
  };

  return { handle, urlOf, recordOf, find, storeOf };
}
