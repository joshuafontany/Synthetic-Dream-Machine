/**
 * CompositeStore — causal island layering contracts.
 *
 * Local-first law: every read fans out across all island bags, highest-priority wins.
 * Every write routes to the designated writable layer. Layers arrive async — corpus
 * islands may attach after wiki is already live.
 *
 * Bag order (lowest → highest priority):
 *   lararium (ha) → catalog (ka) → lares (ba) → corpus:* → wiki (writable) → draft (writable)
 *
 * Bag ID law (M21): bag ID = lar: URI of the owning Automerge doc.
 * No opaque prefixes (e.g. "corpus:") — every bag carries a stable lar:/// address.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/automerge-tiga
 */

import { describe, test, expect, beforeEach } from "vitest";
import { CompositeStore, corpusBagId } from "../src/composite-store.js";
import { BAG_IDS, wikiLarUri, LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI } from "../src/lar-uris.js";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import type { LarTiddlerChange, ChangeOrigin } from "../src/tiddler-store.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_WIKI_URI  = wikiLarUri("test-wiki");
const TEST_DRAFT_URI = "draft";

function systemOrigin(): ChangeOrigin { return { kind: "canon-hydrate", receipt: "system" }; }
function wikiOrigin():   ChangeOrigin { return { kind: "crdt-remote", edgeIsland: TEST_WIKI_URI }; }
function draftOrigin():  ChangeOrigin { return { kind: "tw-local", instanceId: "wiki:1" }; }

function record(title: string, text: string, bag?: string) {
  return { tiddler: { title, ...(bag ? { bag } : {}), text } };
}

// ---------------------------------------------------------------------------
// Construction + layer management
// ---------------------------------------------------------------------------

describe("CompositeStore — layer management", () => {
  test("starts with zero layers", () => {
    const store = new CompositeStore();
    expect(store.layerCount).toBe(0);
    expect(store.layerIds).toEqual([]);
  });

  test("addLayer registers bag id", () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: new MemoryTiddlerStore(), writable: false });
    expect(store.hasBag(BAG_IDS.lararium)).toBe(true);
  });

  test("addLayer with duplicate bagId throws", () => {
    const store = new CompositeStore();
    const ms = new MemoryTiddlerStore();
    store.addLayer({ bagId: TEST_WIKI_URI, store: ms, writable: true });
    expect(() =>
      store.addLayer({ bagId: TEST_WIKI_URI, store: new MemoryTiddlerStore(), writable: false }),
    ).toThrow(/already registered/);
  });

  test("removeLayer de-registers bag", () => {
    const store = new CompositeStore();
    const ms = new MemoryTiddlerStore();
    const corpusId = corpusBagId("lares");
    store.addLayer({ bagId: corpusId, store: ms, writable: false });
    store.removeLayer(corpusId);
    expect(store.hasBag(corpusId)).toBe(false);
  });

  test("corpusBagId produces a top-level @<slug> bag URI", () => {
    // Bag-tag rule: every bag has exactly one canonical address at child[1].
    // Each corpus is a first-class bag at lar:///ha.ka.ba/@<slug>.
    expect(corpusBagId("elyncia")).toBe("lar:///ha.ka.ba/@elyncia");
    expect(corpusBagId("sdm")).toBe("lar:///ha.ka.ba/@sdm");
  });
});

// ---------------------------------------------------------------------------
// Read fan-out — highest-priority layer wins
// ---------------------------------------------------------------------------

describe("CompositeStore — read priority (ha < corpus < wiki)", () => {
  let system: MemoryTiddlerStore;
  let corpus: MemoryTiddlerStore;
  let wiki:   MemoryTiddlerStore;
  let store:  CompositeStore;

  beforeEach(async () => {
    system = new MemoryTiddlerStore();
    corpus = new MemoryTiddlerStore();
    wiki   = new MemoryTiddlerStore();
    store  = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: system, writable: false });
    store.addLayer({ bagId: corpusBagId("lares"), store: corpus, writable: false });
    store.addLayer({ bagId: TEST_WIKI_URI, store: wiki, writable: true });
  });

  test("get() returns null when no layer has the title", async () => {
    expect(await store.get("lar:///missing")).toBeNull();
  });

  test("get() returns system record when only system has it", async () => {
    await system.put(record("lar:///AGENTS", "canon body"), systemOrigin());
    const rec = await store.get("lar:///AGENTS");
    expect(rec?.tiddler.text).toBe("canon body");
  });

  test("wiki layer overrides system for same title", async () => {
    await system.put(record("lar:///AGENTS", "canon"), systemOrigin());
    await wiki.put(record("lar:///AGENTS", "override"), wikiOrigin());
    const rec = await store.get("lar:///AGENTS");
    expect(rec?.tiddler.text).toBe("override");
  });

  test("corpus overrides system but wiki overrides corpus", async () => {
    await system.put(record("lar:///t", "sys"), systemOrigin());
    await corpus.put(record("lar:///t", "corp"), systemOrigin());
    await wiki.put(record("lar:///t", "wiki"), wikiOrigin());
    expect((await store.get("lar:///t"))?.tiddler.text).toBe("wiki");

    // Remove wiki record — corpus should surface on get() (wiki tombstone wins over corpus)
    await wiki.tombstone("lar:///t", wikiOrigin());
    // get() returns the highest-priority record (the tombstone from wiki)
    const afterTombstone = await store.get("lar:///t");
    expect(afterTombstone?.meta?.deleted).toBe(true);
    // listVisible() deduplicates from high→low; wiki's listVisible() omits the tombstoned title,
    // so corpus's copy surfaces. Composite does not retroactively suppress lower layers.
    const visible = await store.listVisible();
    expect(visible).toContain("lar:///t");
  });

  test("listVisible() deduplicates — each title appears once", async () => {
    await system.put(record("lar:///shared", "sys"), systemOrigin());
    await corpus.put(record("lar:///shared", "corp"), systemOrigin());
    await wiki.put(record("lar:///own", "wiki"), wikiOrigin());

    const visible = await store.listVisible();
    const shared = visible.filter((t) => t === "lar:///shared");
    expect(shared).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Write routing — always routes to the writable layer
// ---------------------------------------------------------------------------

describe("CompositeStore — write routing", () => {
  test("put() without any writable layer throws", async () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: new MemoryTiddlerStore(), writable: false });
    await expect(
      store.put({ tiddler: { title: "lar:///x" } }, systemOrigin()),
    ).rejects.toThrow(/no writable layer/);
  });

  test("put() writes to the registered writable store, not ha island", async () => {
    const system = new MemoryTiddlerStore();
    const wiki   = new MemoryTiddlerStore();
    const store  = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: system, writable: false });
    store.addLayer({ bagId: TEST_WIKI_URI,    store: wiki,   writable: true });

    await store.put(record("lar:///new", "data"), wikiOrigin());

    expect(await system.get("lar:///new")).toBeNull();
    expect((await wiki.get("lar:///new"))?.tiddler.text).toBe("data");
  });

  test("when draft is writable, put() routes to draft (last registered wins)", async () => {
    const wiki  = new MemoryTiddlerStore();
    const draft = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: TEST_WIKI_URI,    store: wiki,  writable: true });
    store.addLayer({ bagId: BAG_IDS.draft, store: draft, writable: true });

    await store.put(record("lar:///edit", "draft"), draftOrigin());
    expect((await draft.get("lar:///edit"))?.tiddler.text).toBe("draft");
    expect(await wiki.get("lar:///edit")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Subscribe — fan-out and synthetic events on addLayer
// ---------------------------------------------------------------------------

describe("CompositeStore — subscribe fan-out", () => {
  test("subscriber receives changes from all layers", async () => {
    const system = new MemoryTiddlerStore();
    const wiki   = new MemoryTiddlerStore();
    const store  = new CompositeStore();

    const changes: LarTiddlerChange[] = [];
    store.subscribe((c) => changes.push(c));

    store.addLayer({ bagId: BAG_IDS.lararium, store: system, writable: false });
    store.addLayer({ bagId: TEST_WIKI_URI,    store: wiki,   writable: true });

    await system.put(record("lar:///A", "sys"), systemOrigin());
    await wiki.put(record("lar:///B", "wiki"), wikiOrigin());

    expect(changes.some((c) => c.title === "lar:///A")).toBe(true);
    expect(changes.some((c) => c.title === "lar:///B")).toBe(true);
  });

  test("unsubscribe stops notifications", async () => {
    const wiki  = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: TEST_WIKI_URI, store: wiki, writable: true });

    const changes: LarTiddlerChange[] = [];
    const unsub = store.subscribe((c) => changes.push(c));

    await wiki.put(record("lar:///before", "x"), wikiOrigin());
    unsub();
    await wiki.put(record("lar:///after", "y"), wikiOrigin());

    expect(changes.some((c) => c.title === "lar:///before")).toBe(true);
    expect(changes.some((c) => c.title === "lar:///after")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Recipe helpers (Loop 4 — topology-derived VM)
// ---------------------------------------------------------------------------

describe("CompositeStore — getRecipe + buildLayersFromRecipe", () => {
  const RECIPE_URI = "lar:///ha.ka.ba/@lararium/recipes/default";

  test("getRecipe returns null when tiddler absent", async () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: new MemoryTiddlerStore(), writable: false });
    expect(await store.getRecipe(RECIPE_URI)).toBeNull();
  });

  test("getRecipe parses space-separated bagStack string", async () => {
    const ha = new MemoryTiddlerStore();
    await ha.put(
      {
        tiddler: {
          title:    RECIPE_URI,
          bag:      BAG_IDS.lararium,
          label:    "Default",
          bagStack: `${LARARIUM_DOC_URI} ${CATALOG_DOC_URI} ${LARES_DOC_URI}`,
          updatedAt: "2026-05-03T00:00:00Z",
        },
        meta: { authority: "test" },
      },
      systemOrigin(),
    );
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: ha, writable: false });

    const recipe = await store.getRecipe(RECIPE_URI);
    expect(recipe).not.toBeNull();
    expect(recipe!.bagStack).toEqual([LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI]);
    expect(recipe!.label).toBe("Default");
  });

  test("buildLayersFromRecipe returns layers in bagStack order, skipping unregistered", async () => {
    const ha = new MemoryTiddlerStore();
    const ka = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: ha, writable: false });
    store.addLayer({ bagId: BAG_IDS.catalog,  store: ka, writable: false });
    // Note: LARES_DOC_URI layer NOT registered — should be omitted silently.

    const layers = store.buildLayersFromRecipe({
      title:     RECIPE_URI,
      label:     "Default",
      bagStack:  [LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI],
      updatedAt: "2026-05-03T00:00:00Z",
      authority: "test",
      bag:       BAG_IDS.lararium,
    });

    expect(layers.map((l) => l.bagId)).toEqual([LARARIUM_DOC_URI, CATALOG_DOC_URI]);
  });

  test("getRecipe returns null for tombstoned tiddler", async () => {
    const ha = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: ha, writable: false });
    await ha.put({ tiddler: { title: RECIPE_URI, bag: BAG_IDS.lararium, bagStack: "", text: "" } }, systemOrigin());
    await ha.tombstone(RECIPE_URI, systemOrigin());

    expect(await store.getRecipe(RECIPE_URI)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// putViaRecipe (TW5 Bags/Recipes law: writes route to writableBag)
// ---------------------------------------------------------------------------

describe("CompositeStore — putViaRecipe", () => {
  test("routes write to declared writableBag layer", async () => {
    const ha   = new MemoryTiddlerStore();
    const wiki = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: ha,   writable: false });
    store.addLayer({ bagId: TEST_WIKI_URI,     store: wiki, writable: true  });

    const recipe = {
      title:       "lar:///ha.ka.ba/@lararium/recipes/default",
      label:       "Default",
      bagStack:    [LARARIUM_DOC_URI, TEST_WIKI_URI],
      writableBag: TEST_WIKI_URI,
      updatedAt:   "2026-05-03T00:00:00Z",
      authority:   "test",
      bag:         BAG_IDS.lararium,
    };

    await store.putViaRecipe(recipe, { tiddler: { title: "test-tiddler", bag: TEST_WIKI_URI, text: "hello" } }, systemOrigin());

    const rec = await wiki.get("test-tiddler");
    expect(rec).not.toBeNull();
    expect(rec!.tiddler.text).toBe("hello");

    // Should NOT appear in ha
    expect(await ha.get("test-tiddler")).toBeNull();
  });

  test("falls back to default writable store when writableBag absent", async () => {
    const wiki = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: TEST_WIKI_URI, store: wiki, writable: true });

    const recipe = {
      title:     "lar:///ha.ka.ba/@lararium/recipes/default",
      label:     "Default",
      bagStack:  [TEST_WIKI_URI],
      updatedAt: "2026-05-03T00:00:00Z",
      authority: "test",
      bag:       BAG_IDS.lararium,
    };

    await store.putViaRecipe(recipe, { tiddler: { title: "t", text: "x" } }, systemOrigin());
    expect(await wiki.get("t")).not.toBeNull();
  });

  test("throws when writableBag is not registered as writable", async () => {
    const ha    = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: ha, writable: false });

    const recipe = {
      title:       "lar:///ha.ka.ba/@lararium/recipes/default",
      label:       "Default",
      bagStack:    [LARARIUM_DOC_URI],
      writableBag: TEST_WIKI_URI, // not registered
      updatedAt:   "2026-05-03T00:00:00Z",
      authority:   "test",
      bag:         BAG_IDS.lararium,
    };

    await expect(
      store.putViaRecipe(recipe, { tiddler: { title: "t", text: "x" } }, systemOrigin()),
    ).rejects.toThrow("writableBag");
  });
});

// ---------------------------------------------------------------------------
// CompositeLayer readPolicy / writePolicy (TW5 Bags access controls model)
// ---------------------------------------------------------------------------

describe("CompositeStore — CompositeLayer access policy fields", () => {
  test("layers carry optional readPolicy and writePolicy", () => {
    const store = new CompositeStore();
    store.addLayer({
      bagId:       BAG_IDS.lararium,
      store:       new MemoryTiddlerStore(),
      writable:    false,
      readPolicy:  "public",
      writePolicy: "private",
    });
    const ids = store.layerIds;
    expect(ids).toContain(BAG_IDS.lararium);
    // Policy fields are carried on the layer object (no runtime enforcement yet;
    // this test asserts the field is accepted without type error).
  });
});

// ---------------------------------------------------------------------------
// addProjection — per-island causal fan-out (M25 Loop 1)
// ---------------------------------------------------------------------------

describe("CompositeStore — addProjection fan-out", () => {
  test("projection receives onUriChanged from a MemoryTiddlerStore layer", async () => {
    const mem   = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: TEST_WIKI_URI, store: mem, writable: true });

    const received: LarTiddlerChange[] = [];
    const unsub = store.addProjection({
      onUriChanged: (c) => received.push(c),
    });

    await store.put(record("lar:///proj-test", "v1"), wikiOrigin());
    // MemoryTiddlerStore fires subscribe synchronously → addProjection fan-out.
    expect(received.some((c) => c.title === "lar:///proj-test")).toBe(true);
    unsub();
  });

  test("unsubscribe stops projection from receiving future events", async () => {
    const mem   = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: TEST_WIKI_URI, store: mem, writable: true });

    const received: LarTiddlerChange[] = [];
    const unsub = store.addProjection({ onUriChanged: (c) => received.push(c) });
    unsub(); // disconnect immediately

    await store.put(record("lar:///proj-test2", "v1"), wikiOrigin());
    expect(received).toHaveLength(0);
  });

  test("projection receives events from multiple layers independently", async () => {
    const layerA = new MemoryTiddlerStore();
    const layerB = new MemoryTiddlerStore();
    const store  = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: layerA, writable: false });
    store.addLayer({ bagId: TEST_WIKI_URI,    store: layerB, writable: true });

    const received: LarTiddlerChange[] = [];
    const unsub = store.addProjection({ onUriChanged: (c) => received.push(c) });

    // Only writable layer accepts put() — but we can fire directly on layerA via _seed.
    layerA._seed({ tiddler: { title: "lar:///from-a", bag: BAG_IDS.lararium } });
    await store.put(record("lar:///from-b", "b-body"), wikiOrigin());

    // layerB fires via store.put(); layerA was seeded (no subscriber fired).
    // Projection should at minimum get the layerB event.
    expect(received.some((c) => c.title === "lar:///from-b")).toBe(true);
    unsub();
  });

  test("multiple projections each receive every event", async () => {
    const mem   = new MemoryTiddlerStore();
    const store = new CompositeStore();
    store.addLayer({ bagId: TEST_WIKI_URI, store: mem, writable: true });

    const p1: LarTiddlerChange[] = [];
    const p2: LarTiddlerChange[] = [];
    const u1 = store.addProjection({ onUriChanged: (c) => p1.push(c) });
    const u2 = store.addProjection({ onUriChanged: (c) => p2.push(c) });

    await store.put(record("lar:///multi", "v1"), wikiOrigin());

    expect(p1.some((c) => c.title === "lar:///multi")).toBe(true);
    expect(p2.some((c) => c.title === "lar:///multi")).toBe(true);
    u1(); u2();
  });
});

// ---------------------------------------------------------------------------
// CompositeStore — put() bag routing (M25 Loop 3)
// ---------------------------------------------------------------------------

describe("CompositeStore — put() bag routing", () => {
  test("put() with explicit bag option routes to the matching writable layer", async () => {
    const roomMem  = new MemoryTiddlerStore();
    const draftMem = new MemoryTiddlerStore();
    const store    = new CompositeStore();
    store.addLayer({ bagId: TEST_WIKI_URI,  store: roomMem,  writable: true });
    store.addLayer({ bagId: TEST_DRAFT_URI, store: draftMem, writable: true });

    await store.put({ tiddler: { title: "lar:///routed", text: "wiki-body" } }, wikiOrigin(), { bag: TEST_WIKI_URI });

    const inRoom  = await roomMem.get("lar:///routed");
    const inDraft = await draftMem.get("lar:///routed");
    expect(inRoom).not.toBeNull();
    expect(inDraft).toBeNull();
  });

  test("put() with no explicit bag option falls back to writableStore (last registered)", async () => {
    const roomMem  = new MemoryTiddlerStore();
    const draftMem = new MemoryTiddlerStore();
    const store    = new CompositeStore();
    store.addLayer({ bagId: TEST_WIKI_URI,  store: roomMem,  writable: true });
    store.addLayer({ bagId: TEST_DRAFT_URI, store: draftMem, writable: true });

    await store.put(record("lar:///fallback", "any"), wikiOrigin());

    // writableStore = last writable = draftMem
    const inDraft = await draftMem.get("lar:///fallback");
    expect(inDraft).not.toBeNull();
  });

  test("put() with explicit bag option pointing to a non-writable layer falls back to writableStore", async () => {
    const readMem  = new MemoryTiddlerStore();
    const writeMem = new MemoryTiddlerStore();
    const store    = new CompositeStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: readMem,  writable: false });
    store.addLayer({ bagId: TEST_WIKI_URI,    store: writeMem, writable: true });

    await store.put(record("lar:///fallback2", "v"), systemOrigin(), { bag: BAG_IDS.lararium });

    const inWrite = await writeMem.get("lar:///fallback2");
    expect(inWrite).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CompositeStore — dynamic addProjection (M25 Loop 3)
// ---------------------------------------------------------------------------

describe("CompositeStore — dynamic addProjection fan-out to future layers", () => {
  test("projection registered before addLayer receives events from that new layer", async () => {
    const store  = new CompositeStore();
    const early  = new MemoryTiddlerStore();
    store.addLayer({ bagId: TEST_WIKI_URI, store: early, writable: true });

    const received: LarTiddlerChange[] = [];
    const unsub = store.addProjection({ onUriChanged: (c) => received.push(c) });

    // Add a second layer AFTER addProjection was called.
    const late = new MemoryTiddlerStore();
    store.addLayer({ bagId: BAG_IDS.lararium, store: late, writable: false });

    // Trigger an event from the late layer's store so the subscriber fires.
    await late.put({ tiddler: { title: "lar:///late-event", text: "late" } }, systemOrigin());

    expect(received.some((c) => c.title === "lar:///late-event")).toBe(true);
    unsub();
  });

  test("stop() unsubscribes from all layers including those added after registration", async () => {
    const store = new CompositeStore();
    const mem1  = new MemoryTiddlerStore();
    store.addLayer({ bagId: TEST_WIKI_URI, store: mem1, writable: true });

    const received: LarTiddlerChange[] = [];
    const unsub = store.addProjection({ onUriChanged: (c) => received.push(c) });

    const mem2 = new MemoryTiddlerStore();
    store.addLayer({ bagId: BAG_IDS.catalog, store: mem2, writable: false });

    unsub(); // stop before any events

    await mem2.put({ tiddler: { title: "lar:///after-stop" } }, systemOrigin());
    await mem1.put({ tiddler: { title: "lar:///also-after" } }, wikiOrigin());

    expect(received).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Live composition reconcile surface (recipe-watch substrate)
// ---------------------------------------------------------------------------

describe("CompositeStore live layer surgery", () => {
  test("addLayer at an index splices into the cascade, not the top", () => {
    const composite = new CompositeStore();
    composite.addLayer({ bagId: "lar:///low",  store: new MemoryTiddlerStore("lar:///low"),  writable: false });
    composite.addLayer({ bagId: "lar:///high", store: new MemoryTiddlerStore("lar:///high"), writable: false });
    composite.addLayer({ bagId: "lar:///mid",  store: new MemoryTiddlerStore("lar:///mid"),  writable: false }, 1);
    expect(composite.layerIds).toEqual(["lar:///low", "lar:///mid", "lar:///high"]);
    expect(composite.layerIndexOf("lar:///mid")).toBe(1);
  });

  test("removeLayerLive tombstones departed titles and reveals unshadowed lower records", async () => {
    const composite = new CompositeStore();
    const low  = new MemoryTiddlerStore("lar:///low");
    const high = new MemoryTiddlerStore("lar:///high");
    await low.put({ tiddler: { title: "shared", text: "from low" } }, systemOrigin());
    await high.put({ tiddler: { title: "shared", text: "from high" } }, systemOrigin());
    await high.put({ tiddler: { title: "only-high", text: "departing" } }, systemOrigin());
    composite.addLayer({ bagId: "lar:///low",  store: low,  writable: false });
    composite.addLayer({ bagId: "lar:///high", store: high, writable: false });

    const heard: LarTiddlerChange[] = [];
    composite.subscribe((c) => heard.push(c));
    const projected: LarTiddlerChange[] = [];
    composite.addProjection({ onUriChanged: (c: LarTiddlerChange) => { projected.push(c); } } as never);

    await composite.removeLayerLive("lar:///high");

    expect(composite.hasBag("lar:///high")).toBe(false);
    // departed-with-nothing-beneath → tombstone (record null)
    const gone = heard.find((c) => c.title === "only-high");
    expect(gone?.record).toBeNull();
    // shadowed lower record resurfaces
    const revealed = heard.find((c) => c.title === "shared");
    expect(revealed?.record?.tiddler["text"]).toBe("from low");
    // projections hear the same surgery
    expect(projected.some((c) => c.title === "only-high" && c.record === null)).toBe(true);
  });

  test("removeLayerLive on an absent bag stays a no-op", async () => {
    const composite = new CompositeStore();
    await expect(composite.removeLayerLive("lar:///ghost")).resolves.toBeUndefined();
  });
});
