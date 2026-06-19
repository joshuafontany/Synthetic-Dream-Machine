/**
 * recipe-watch — island-side LIVE composition reconcile (isomorphic).
 *
 * The composition class of change (recipe bag membership, oracle doc-URL
 * moves) rides ordinary sync — so a running island can reconcile it without
 * a reboot. This watch subscribes to the `@catalog` registry doc (access≠load:
 * watched, never rendered), reads the island's OWN recipe record, and applies
 * the diff to its own composite:
 *
 *   - bag added to the recipe   → resolve via the catalog oracle, insert the
 *     layer above @lares (library position), replay its content into the wiki.
 *   - bag removed               → removeLayerLive: departed titles tombstone,
 *     unshadowed lower records resurface (no reboot).
 *   - oracle URL moved (epoch)  → swap the layer's store in place at the same
 *     cascade position, replay from the new doc.
 *
 * Pono: the admin never reaches in — it writes the catalog and each island
 * reconciles itself. After a successful reconcile the island clears its own
 * reboot-pending alert (@temp): the alert remains the FALLBACK for islands
 * that sleep through the change; the engine-epoch class keeps the alert as
 * its permanent mechanism (see engine-watch — code never live-swaps).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/recipe-watch
 */

import {
  AutomergeDocStore,
  TEMP_BAG,
  DRAFT_BAG,
  WORKING_BAG,
  PERSONAL_BAG,
  LARES_BAG,
  LARARIUM_BAG,
  ORACLE_BAG,
  wikiBagUri,
  recipeUri,
  bagStackFromRec,
  type AutomergeUrl,
  type ChangeOrigin,
  type DocHandle,
  type LarDoc,
  type LarTiddlerRecord,
} from "@lararium/mesh";
import { makeCatalogAccessor, findOrThrow } from "./catalog-accessor.js";
import { REBOOT_ALERT_TITLE } from "./wiki-behavior.js";
import type { IslandContext } from "./island-context.js";

/**
 * startRecipeWatch — subscribe to @catalog; reconcile this island's mounted
 * layer set against its live recipe record. Returns a cleanup for onHooAnu,
 * or undefined when the island carries no catalog access.
 */
export async function startRecipeWatch(ctx: IslandContext): Promise<(() => void) | undefined> {
  if (!ctx.catalogUrl && !ctx.oracleUrl) return undefined;
  const slug        = ctx.recipe.wikiSlug;

  // Two registry planes (operator ruling 2026-06-16, wiki-layer-ontology#oracle-planes):
  // the @oracle SYSTEM plane carries system-bag pointers + system wiki-recipes
  // (@lares, @lararium); @catalog carries USER bags + user recipes. A system
  // wiki's recipe lives in @oracle; system bags resolve from @oracle.
  const catalog   = ctx.catalogUrl ? makeCatalogAccessor(ctx.repo, ctx.catalogUrl) : null;
  const sysPlane  = ctx.oracleUrl  ? makeCatalogAccessor(ctx.repo, ctx.oracleUrl)  : null;
  const catHandle = catalog ? await catalog.handle() : null;
  const sysHandle = sysPlane ? await sysPlane.handle() : null;

  const sysRecipeTitle  = recipeUri("@oracle",  slug);
  const userRecipeTitle = recipeUri("@catalog", slug);

  // System bags resolve from @oracle; everything else from @catalog.
  const SYSTEM_BAGS = new Set<string>([ORACLE_BAG, LARARIUM_BAG, LARES_BAG]);
  const urlOfBag = async (bagId: string): Promise<string | null> =>
    (SYSTEM_BAGS.has(bagId) && sysPlane) ? sysPlane.urlOf(bagId) : (catalog ? catalog.urlOf(bagId) : null);

  // The island's own recipe record: a system wiki reads it from @oracle, a user
  // wiki from @catalog. Prefer @oracle so a system wiki composes from its plane.
  const loadRecipeRec = (): LarTiddlerRecord | undefined =>
    (sysHandle?.doc()?.tiddlers?.[sysRecipeTitle] as LarTiddlerRecord | undefined)
    ?? (catHandle?.doc()?.tiddlers?.[userRecipeTitle] as LarTiddlerRecord | undefined);

  // Slots the recipe model owns structurally — everything else in the cascade
  // counts as a library bag for membership reconcile. @working is a per-
  // (PersonGroup×fingerprint) GRANT slot (peer to @personal/@draft) threaded
  // through the manifest, never named in a recipe's bag-stack — so it MUST be
  // exempt, else this reconcile evicts the live write layer buildIslandRecipe
  // just mounted (the OCI writable-upper-layer law: keep the scratch layer out
  // of the membership diff, never a member of it).
  const structural = new Set<string>([
    TEMP_BAG, DRAFT_BAG, WORKING_BAG, PERSONAL_BAG, wikiBagUri(slug), LARES_BAG, ORACLE_BAG,
  ]);

  const origin = (): ChangeOrigin =>
    ({ kind: "canon-hydrate", receipt: `recipe-watch:${slug}` });

  // A library that cannot resolve (its doc has not synced to this worker yet)
  // MUST NOT crash the reconcile — a thrown findOrThrow would abort the whole
  // wave and destabilize the island (taking the disk mirror down with it). Skip
  // it; the next change event (or the doc's arrival) re-kicks the reconcile.
  const mountAt = async (bagId: string, docUrl: string, at: number): Promise<boolean> => {
    let handle;
    try {
      handle = await findOrThrow(ctx.repo, docUrl, `bag ${bagId}`);
    } catch (err) {
      ctx.post({
        schema_version: 1, type: "event", wikiUri: ctx.wikiUri,
        listenable: "recipe-watch:bag-unresolved",
        payload: { bagId, docUrl, reason: String(err) },
      });
      return false;
    }
    const store = new AutomergeDocStore(handle, bagId);
    ctx.composite.addLayer({ bagId, store, writable: true, defaultWritable: false }, at);
    ctx.handles.set(bagId, handle);
    store.emitInitialReplay();
    store.markSyncComplete();
    return true;
  };

  /** Library bags insert above @lares, below the wiki bag. */
  const libraryInsertIndex = (): number => {
    const lares = ctx.composite.layerIndexOf(LARES_BAG);
    if (lares !== -1) return lares + 1;
    const lararium = ctx.composite.layerIndexOf(ORACLE_BAG);
    return lararium === -1 ? 0 : lararium + 1;
  };

  let busy = false;
  let rerun = false;

  const reconcile = async (): Promise<void> => {
    const rec = loadRecipeRec();
    if (!rec) return;   // no recipe registered (e.g. the admin island) — idle
    let applied = false;

    // ── membership: library bags ──
    const desired = new Set(bagStackFromRec(rec).filter((uri) => !structural.has(uri)));
    const mounted = new Set(ctx.composite.layerIds.filter((uri) => !structural.has(uri)));

    for (const bagId of mounted) {
      if (desired.has(bagId)) continue;
      await ctx.composite.removeLayerLive(bagId);
      ctx.handles.delete(bagId);
      applied = true;
    }
    for (const bagId of desired) {
      if (ctx.composite.hasBag(bagId)) continue;
      const docUrl = await urlOfBag(bagId);
      if (!docUrl) continue;   // unregistered — the admin's alert stays the fallback
      if (await mountAt(bagId, docUrl, libraryInsertIndex())) applied = true;
    }

    // ── oracle moves: any mounted CRDT slot whose plane oracle changed doc URL ──
    for (const bagId of ctx.composite.layerIds) {
      if (bagId === TEMP_BAG) continue;
      const current = ctx.handles.get(bagId)?.url;
      if (!current) continue;
      const docUrl = await urlOfBag(bagId);
      if (!docUrl || docUrl === current) continue;
      const at = ctx.composite.layerIndexOf(bagId);
      await ctx.composite.removeLayerLive(bagId);
      await mountAt(bagId, docUrl, at);   // re-mount at the same slot; skip-safe on unresolved
      applied = true;
    }

    // The change just applied live — the reboot-pending notice (if the admin's
    // alert verb raced ahead of this reconcile) no longer holds.
    if (applied && ctx.composite.hasWritableBag(TEMP_BAG)) {
      await ctx.composite.tombstoneInBag(TEMP_BAG, REBOOT_ALERT_TITLE, origin());
    }
  };

  // Serialize: one reconcile at a time; a change arriving mid-run queues one rerun.
  const kick = (): void => {
    if (busy) { rerun = true; return; }
    busy = true;
    void (async () => {
      try {
        do { rerun = false; await reconcile(); } while (rerun);
      } finally {
        busy = false;
      }
    })();
  };

  const onChange = (): void => kick();
  catHandle?.on("change", onChange);
  sysHandle?.on("change", onChange);
  kick();   // catch up on anything that moved while the island booted
  return () => { catHandle?.off("change", onChange); sysHandle?.off("change", onChange); };
}
