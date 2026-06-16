import { describe, test, expect, vi } from "vitest";
import {
  CompositeStore,
  TEMP_BAG,
  LARES_BAG,
  ORACLE_BAG,
  wikiBagUri,
  recipeUri,
  type DocHandle,
  type LarDoc,
  type LarTiddlerChange,
  type LarTiddlerRecord,
  type Repo,
  type WikiRecipe,
} from "@lararium/mesh";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { startRecipeWatch } from "../src/recipe-watch.js";
import { REBOOT_ALERT_TITLE } from "../src/wiki-behavior.js";
import type { IslandContext } from "../src/island-context.js";

const SLUG     = "altar-fire";
const WIKI_BAG = wikiBagUri(SLUG);
const LIB_BAG  = "lar:///ha.ka.ba/@corpus/elyncia";
const RECIPE   = recipeUri("@catalog", SLUG);

type Tiddlers = Record<string, LarTiddlerRecord>;

/** Fake DocHandle: mutable tiddlers + manual change firing. */
function fakeHandle(url: string, tiddlers: Tiddlers = {}) {
  const listeners = new Set<(p: { patches: unknown[] }) => void>();
  const handle = {
    url,
    doc: () => ({ tiddlers }),
    whenReady: async () => {},
    isUnavailable: () => false,
    on:  (_ev: string, fn: (p: { patches: unknown[] }) => void) => { listeners.add(fn); },
    off: (_ev: string, fn: (p: { patches: unknown[] }) => void) => { listeners.delete(fn); },
  } as unknown as DocHandle<LarDoc>;
  const set = (title: string, rec: LarTiddlerRecord) => {
    tiddlers[title] = rec;
    for (const fn of [...listeners]) fn({ patches: [] });
  };
  return { handle, set, tiddlers };
}

const rec = (title: string, fields: Record<string, string> = {}): LarTiddlerRecord =>
  ({ tiddler: { title, ...fields } });

function harness(opts: { stack: string[]; libMounted?: boolean; libTiddlers?: Tiddlers }) {
  const wikiDoc = fakeHandle("automerge:wiki-1");
  const libDoc  = fakeHandle("automerge:lib-1", opts.libTiddlers ?? { "lib-note": rec("lib-note", { text: "from lib" }) });
  const catalog = fakeHandle("automerge:catalog", {
    [RECIPE]:   rec(RECIPE, { "bag-stack": opts.stack.join(" ") }),
    [WIKI_BAG]: rec(WIKI_BAG, { text: "automerge:wiki-1" }),
    [LIB_BAG]:  rec(LIB_BAG,  { text: "automerge:lib-1" }),
  });
  const byUrl = new Map([
    ["automerge:catalog", catalog.handle],
    ["automerge:wiki-1",  wikiDoc.handle],
    ["automerge:lib-1",   libDoc.handle],
  ]);
  const repo = { find: async (url: string) => {
    const h = byUrl.get(url);
    if (!h) throw new Error(`no fake doc at ${url}`);
    return h;
  } } as unknown as Repo;
  const registerDoc = (url: string, h: ReturnType<typeof fakeHandle>) => byUrl.set(url, h.handle);

  const composite = new CompositeStore();
  const laresStore = new MemoryTiddlerStore(LARES_BAG);
  // @oracle is the structural floor (operator ruling 2026-06-16); @lararium is a
  // library, not a structural pre-mount. The floor + @lares persona seat here.
  composite.addLayer({ bagId: ORACLE_BAG, store: new MemoryTiddlerStore(ORACLE_BAG), writable: true, defaultWritable: false });
  composite.addLayer({ bagId: LARES_BAG,    store: laresStore,                            writable: true, defaultWritable: false });
  const handles = new Map<string, DocHandle<LarDoc>>([[WIKI_BAG, wikiDoc.handle]]);
  if (opts.libMounted) {
    const libStore = new MemoryTiddlerStore(LIB_BAG);
    for (const r of Object.values(libDoc.tiddlers)) void libStore.put(r, { kind: "canon-hydrate", receipt: "test-boot" });
    composite.addLayer({ bagId: LIB_BAG, store: libStore, writable: true, defaultWritable: false });
    handles.set(LIB_BAG, libDoc.handle);
  }
  composite.addLayer({ bagId: WIKI_BAG, store: new MemoryTiddlerStore(WIKI_BAG), writable: true, defaultWritable: false });
  const tempStore = new MemoryTiddlerStore(TEMP_BAG);
  composite.addLayer({ bagId: TEMP_BAG, store: tempStore, writable: true, defaultWritable: true });

  const recipe: WikiRecipe = { wikiSlug: SLUG };
  const ctx = {
    composite, handles, repo,
    catalogUrl: "automerge:catalog",
    recipe,
    engine: { sha256: "x", version: "0" },
  } as unknown as IslandContext;

  return { ctx, composite, catalog, wikiDoc, libDoc, laresStore, tempStore, registerDoc };
}

describe("recipe-watch", () => {
  test("no catalog access → no watch", async () => {
    const { ctx } = harness({ stack: [WIKI_BAG] });
    (ctx as { catalogUrl: string | null }).catalogUrl = null;
    expect(await startRecipeWatch(ctx)).toBeUndefined();
  });

  test("bag added to the recipe mounts live, above @lares", async () => {
    const h = harness({ stack: [WIKI_BAG] });
    const stop = await startRecipeWatch(h.ctx);
    h.catalog.set(RECIPE, rec(RECIPE, { "bag-stack": `${WIKI_BAG} ${LIB_BAG}` }));
    await vi.waitFor(() => expect(h.composite.hasBag(LIB_BAG)).toBe(true));
    expect(h.composite.layerIndexOf(LIB_BAG)).toBe(h.composite.layerIndexOf(LARES_BAG) + 1);
    expect(h.composite.layerIndexOf(LIB_BAG)).toBeLessThan(h.composite.layerIndexOf(WIKI_BAG));
    const note = await h.composite.get("lib-note");
    expect(note?.tiddler["text"]).toBe("from lib");
    expect(h.ctx.handles.get(LIB_BAG)).toBeDefined();
    stop?.();
  });

  test("bag removed from the recipe unmounts live; departed titles tombstone to projections", async () => {
    const h = harness({ stack: [WIKI_BAG, LIB_BAG], libMounted: true });
    const seen: LarTiddlerChange[] = [];
    h.composite.addProjection({ onUriChanged: (c: LarTiddlerChange) => { seen.push(c); } } as never);
    const stop = await startRecipeWatch(h.ctx);
    h.catalog.set(RECIPE, rec(RECIPE, { "bag-stack": WIKI_BAG }));
    await vi.waitFor(() => expect(h.composite.hasBag(LIB_BAG)).toBe(false));
    expect(h.ctx.handles.has(LIB_BAG)).toBe(false);
    const departed = seen.find((c) => c.title === "lib-note" && c.record === null);
    expect(departed).toBeDefined();
    stop?.();
  });

  test("oracle URL move swaps the layer in place (same cascade position)", async () => {
    const h = harness({ stack: [WIKI_BAG] });
    const wiki2 = fakeHandle("automerge:wiki-2", { "fresh": rec("fresh", { text: "post-epoch" }) });
    h.registerDoc("automerge:wiki-2", wiki2);
    const posBefore = h.composite.layerIndexOf(WIKI_BAG);
    const stop = await startRecipeWatch(h.ctx);
    h.catalog.set(WIKI_BAG, rec(WIKI_BAG, { text: "automerge:wiki-2" }));
    await vi.waitFor(() => expect(h.ctx.handles.get(WIKI_BAG)?.url).toBe("automerge:wiki-2"));
    expect(h.composite.layerIndexOf(WIKI_BAG)).toBe(posBefore);
    const fresh = await h.composite.get("fresh");
    expect(fresh?.tiddler["text"]).toBe("post-epoch");
    stop?.();
  });

  test("a successful live reconcile clears the reboot-pending alert", async () => {
    const h = harness({ stack: [WIKI_BAG] });
    await h.tempStore.put(rec(REBOOT_ALERT_TITLE, { text: "Bag added — reboot to mount it." }), { kind: "canon-hydrate", receipt: "test" });
    const stop = await startRecipeWatch(h.ctx);
    h.catalog.set(RECIPE, rec(RECIPE, { "bag-stack": `${WIKI_BAG} ${LIB_BAG}` }));
    await vi.waitFor(async () => {
      const alert = await h.composite.get(REBOOT_ALERT_TITLE);
      expect(alert === null || alert.meta?.deleted === true).toBe(true);
    });
    stop?.();
  });

  test("no recipe record → watch idles without throwing", async () => {
    const h = harness({ stack: [WIKI_BAG] });
    delete h.catalog.tiddlers[RECIPE];
    const stop = await startRecipeWatch(h.ctx);
    h.catalog.set("unrelated", rec("unrelated", { text: "noise" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(h.composite.hasBag(LIB_BAG)).toBe(false);
    stop?.();
  });
});
