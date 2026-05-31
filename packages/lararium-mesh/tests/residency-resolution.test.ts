/**
 * Residency Model Sprint 3 — resolveAll / resolveTopmost on CompositeStore +
 * WikiRecipe bagEpochs + lensFor hook tests.
 *
 * Surfaces the multi-bag residency that already runs inside CompositeStore
 * (listBagsHolding existed pre-sprint; resolveAll/resolveTopmost return
 * (bagId, record) pairs for operator-visible coordinate inspection).
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
 */

import { describe, test, expect } from "vitest";
import { CompositeStore } from "../src/composite-store.js";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { lensFor, identityLens, TEMP_BAG, DRAFT_BAG, LARES_BAG, LARARIUM_BAG, wikiBagUri } from "../src/wiki-recipe.js";
import type { WikiRecipe } from "../src/wiki-recipe.js";
import type { LarTiddlerRecord, ChangeOrigin } from "../src/tiddler-store.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HIGH = "lar:///ha.ka.ba/@high";
const MID  = "lar:///ha.ka.ba/@mid";
const LOW  = "lar:///ha.ka.ba/@low";

function rec(title: string, text: string): LarTiddlerRecord {
  return { tiddler: { title, text } };
}

function origin(bagId: string): ChangeOrigin {
  return { kind: "crdt-remote", edgeIsland: bagId };
}

async function makeStoreWithLayers(): Promise<CompositeStore> {
  const composite = new CompositeStore();
  // Layers added lowest-priority → highest-priority (composite-store convention).
  composite.addLayer({ bagId: LOW,  store: new MemoryTiddlerStore(), writable: false });
  composite.addLayer({ bagId: MID,  store: new MemoryTiddlerStore(), writable: false });
  composite.addLayer({ bagId: HIGH, store: new MemoryTiddlerStore(), writable: true });
  return composite;
}

// ---------------------------------------------------------------------------
// resolveAll
// ---------------------------------------------------------------------------

describe("CompositeStore.resolveAll", () => {
  test("returns empty when no layer holds the title", async () => {
    const store = await makeStoreWithLayers();
    expect(await store.resolveAll("missing")).toEqual([]);
  });

  test("returns one entry when only one layer holds the title", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("solo", "from-high"), origin(HIGH), { bag: HIGH });
    const result = await store.resolveAll("solo");
    expect(result).toHaveLength(1);
    expect(result[0]!.bagId).toBe(HIGH);
    expect((result[0]!.record.tiddler as Record<string, unknown>)["text"]).toBe("from-high");
  });

  test("returns multiple entries in highest-priority-first order when multiple bags hold the title", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("shared", "low-version"),  origin(LOW),  { bag: LOW });
    await store.put(rec("shared", "mid-version"),  origin(MID),  { bag: MID });
    await store.put(rec("shared", "high-version"), origin(HIGH), { bag: HIGH });
    const result = await store.resolveAll("shared");
    expect(result.map((r) => r.bagId)).toEqual([HIGH, MID, LOW]);
    expect((result[0]!.record.tiddler as Record<string, unknown>)["text"]).toBe("high-version");
    expect((result[2]!.record.tiddler as Record<string, unknown>)["text"]).toBe("low-version");
  });

  test("skips tombstoned layers (live residency only)", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("partial", "low-live"),  origin(LOW),  { bag: LOW });
    await store.put(rec("partial", "mid-live"),  origin(MID),  { bag: MID });
    await store.tombstoneInBag(MID, "partial", origin(MID));
    const result = await store.resolveAll("partial");
    // MID tombstoned; LOW remains live.
    expect(result.map((r) => r.bagId)).toEqual([LOW]);
  });
});

// ---------------------------------------------------------------------------
// resolveTopmost
// ---------------------------------------------------------------------------

describe("CompositeStore.resolveTopmost", () => {
  test("returns null when no layer holds the title", async () => {
    const store = await makeStoreWithLayers();
    expect(await store.resolveTopmost("missing")).toBeNull();
  });

  test("returns the highest-priority bag when multiple hold the title", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("shared", "low-version"),  origin(LOW),  { bag: LOW });
    await store.put(rec("shared", "high-version"), origin(HIGH), { bag: HIGH });
    const top = await store.resolveTopmost("shared");
    expect(top?.bagId).toBe(HIGH);
    expect((top?.record.tiddler as Record<string, unknown>)["text"]).toBe("high-version");
  });

  test("skips tombstones — returns next live layer below the highest tombstone", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("partial", "mid-live"), origin(MID), { bag: MID });
    await store.put(rec("partial", "high-version"), origin(HIGH), { bag: HIGH });
    await store.tombstoneInBag(HIGH, "partial", origin(HIGH));
    const top = await store.resolveTopmost("partial");
    expect(top?.bagId).toBe(MID);
  });

  test("agrees with resolveAll's first entry when one exists", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("x", "mid"), origin(MID), { bag: MID });
    await store.put(rec("x", "high"), origin(HIGH), { bag: HIGH });
    const all = await store.resolveAll("x");
    const top = await store.resolveTopmost("x");
    expect(top?.bagId).toBe(all[0]!.bagId);
  });
});

// ---------------------------------------------------------------------------
// Multi-bag residency invariants
// ---------------------------------------------------------------------------

describe("multi-bag residency invariants (residency model)", () => {
  test("same title in N bags carries N independent Manifestations", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("shared", "a"), origin(LOW),  { bag: LOW });
    await store.put(rec("shared", "b"), origin(MID),  { bag: MID });
    await store.put(rec("shared", "c"), origin(HIGH), { bag: HIGH });
    const result = await store.resolveAll("shared");
    expect(result).toHaveLength(3);
    // Each bag carries its own version — independent Manifestations.
    const texts = result.map((r) => (r.record.tiddler as Record<string, unknown>)["text"]);
    expect(texts).toEqual(["c", "b", "a"]);
  });

  test("listBagsHolding agrees with resolveAll bag ordering", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("shared", "a"), origin(LOW),  { bag: LOW });
    await store.put(rec("shared", "b"), origin(HIGH), { bag: HIGH });
    const bags = await store.listBagsHolding("shared");
    const resolved = await store.resolveAll("shared");
    expect(bags).toEqual(resolved.map((r) => r.bagId));
  });
});

// ---------------------------------------------------------------------------
// WikiRecipe.bagEpochs interface (S3.5 — hook, no enforcement yet)
// ---------------------------------------------------------------------------

describe("WikiRecipe.bagEpochs (Anti-pattern #5 hook)", () => {
  test("bagEpochs absent by default — recipe stays unpinned", () => {
    const recipe: WikiRecipe = { wikiSlug: "demo" };
    expect(recipe.bagEpochs).toBeUndefined();
  });

  test("bagEpochs accepts a ReadonlyMap of slot URIs to Automerge Heads", () => {
    // Heads = ReadonlyArray<string>; we pass a stub-shaped array.
    const epochs = new Map<string, readonly string[]>([
      [LARES_BAG, ["head-1", "head-2"]],
      [wikiBagUri("demo"), ["wiki-head-1"]],
    ]);
    const recipe: WikiRecipe = { wikiSlug: "demo", bagEpochs: epochs as never };
    expect(recipe.bagEpochs?.get(LARES_BAG)).toEqual(["head-1", "head-2"]);
    expect(recipe.bagEpochs?.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// lensFor (S3.6 — hook, identity default)
// ---------------------------------------------------------------------------

describe("lensFor (Anti-pattern #2 hook)", () => {
  test("identityLens returns its input unchanged", () => {
    const r = rec("x", "hello");
    expect(identityLens(r)).toBe(r);
  });

  test("lensFor returns identityLens for any (recipe, title, bag) tuple by default", () => {
    const recipe: WikiRecipe = { wikiSlug: "demo" };
    const lens = lensFor(recipe, "any-title", LARES_BAG);
    expect(lens).toBe(identityLens);
    const r = rec("x", "hello");
    expect(lens(r)).toBe(r);
  });

  test("lensFor stays callable across the full expanded slot set", () => {
    const recipe: WikiRecipe = { wikiSlug: "demo", canonBags: ["lar:///ha.ka.ba/@canon"] };
    const slots = [TEMP_BAG, DRAFT_BAG, wikiBagUri("demo"), "lar:///ha.ka.ba/@canon", LARES_BAG, LARARIUM_BAG];
    for (const slot of slots) {
      const lens = lensFor(recipe, "title", slot);
      expect(typeof lens).toBe("function");
    }
  });
});
