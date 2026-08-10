/**
 * Residency Model Sprint 3 — resolveAll / resolveTopmost on CompositeStore +
 * WikiRecipe bagPins + lensFor hook tests.
 *
 * Surfaces the multi-bag residency that already runs inside CompositeStore
 * (listBagsHolding existed pre-sprint; resolveAll/resolveTopmost return
 * (bagId, record) pairs for operator-visible coordinate inspection).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/residency-model
 */

import { describe, test, expect } from "vitest";
import { CompositeStore } from "../src/composite-store.js";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import {
  lensFor, identityLens, headsEqual,
  LARES_BAG, wikiBagUri,
} from "../src/wiki-recipe.js";
import type { WikiRecipe, BagPinState } from "../src/wiki-recipe.js";
import type { LarTiddlerRecord, LarTiddlerStore, ChangeOrigin } from "../src/tiddler-store.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HIGH = "lar:///ha.ka.ba/bags/@high";
const MID  = "lar:///ha.ka.ba/bags/@mid";
const LOW  = "lar:///ha.ka.ba/bags/@low";

function rec(title: string, text: string): LarTiddlerRecord {
  return { tiddler: { title, text } };
}

function origin(bagId: string): ChangeOrigin {
  return { kind: "crdt-remote", edgeIsland: bagId };
}

async function makeStoreWithLayers(): Promise<CompositeStore> {
  const composite = new CompositeStore();
  // Layers added lowest-priority → highest-priority (composite-store convention).
  // All three mark `writable: true` so the test can route explicit-bag writes
  // to any layer. `defaultWritable: false` on LOW/MID preserves HIGH as the
  // default writable for unbagged writes — matches normal recipe semantics
  // (wiki bag at top is the default writable; canon bags accept explicit
  // ceremony-routed writes but don't override the default).
  composite.addLayer({ bagId: LOW,  store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });
  composite.addLayer({ bagId: MID,  store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });
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

  test("absent in HIGH (no put) falls through to the next live layer below", async () => {
    // Truly-absent (not tombstoned) in HIGH falls through. Distinct from the
    // tombstone-shadow case (covered in the kāpae describe block).
    const store = await makeStoreWithLayers();
    await store.put(rec("partial", "mid-live"), origin(MID), { bag: MID });
    // HIGH has no record at all for "partial".
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
// WikiRecipe.bagPins interface (S3.5 — hook, no enforcement yet)
// ---------------------------------------------------------------------------

describe("WikiRecipe.bagPins (Anti-pattern #5 hook)", () => {
  test("bagPins absent by default — recipe stays unpinned", () => {
    const recipe: WikiRecipe = { wikiSlug: "demo" };
    expect(recipe.bagPins).toBeUndefined();
  });

  test("bagPins accepts a ReadonlyMap of slot URIs to Automerge Heads", () => {
    // Heads = ReadonlyArray<string>; we pass a stub-shaped array.
    const epochs = new Map<string, readonly string[]>([
      [LARES_BAG, ["head-1", "head-2"]],
      [wikiBagUri("demo"), ["wiki-head-1"]],
    ]);
    const recipe: WikiRecipe = { wikiSlug: "demo", bagPins: epochs as never };
    expect(recipe.bagPins?.get(LARES_BAG)).toEqual(["head-1", "head-2"]);
    expect(recipe.bagPins?.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// lensFor (Anti-pattern #2 hook — version-keyed registry)
// ---------------------------------------------------------------------------

describe("lensFor (Anti-pattern #2 hook)", () => {
  test("identityLens returns its input unchanged", () => {
    const r = rec("x", "hello");
    expect(identityLens(r)).toBe(r);
  });

  test("lensFor returns identityLens when record carries no schemaVersion", () => {
    const recipe: WikiRecipe = { wikiSlug: "demo" };
    const r = rec("x", "hello");
    const lens = lensFor(recipe, r);
    expect(lens).toBe(identityLens);
    expect(lens(r)).toBe(r);
  });

  test("lensFor returns identityLens when recipe has no lenses map", () => {
    const recipe: WikiRecipe = { wikiSlug: "demo" };
    const r: LarTiddlerRecord = { tiddler: { title: "x", text: "hello" }, meta: { schemaVersion: "v1" } };
    expect(lensFor(recipe, r)).toBe(identityLens);
  });

  test("lensFor returns identityLens when record's schemaVersion is unregistered", () => {
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      lenses: new Map([["v1", (rr) => rr]]),
    };
    const r: LarTiddlerRecord = { tiddler: { title: "x", text: "hello" }, meta: { schemaVersion: "v99" } };
    expect(lensFor(recipe, r)).toBe(identityLens);
  });

  test("lensFor returns the registered lens when schemaVersion matches", () => {
    const v1Lens: (r: LarTiddlerRecord) => LarTiddlerRecord = (r) => ({
      ...r,
      tiddler: { ...r.tiddler, lensed: "yes" },
    });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      lenses: new Map([["v1", v1Lens]]),
    };
    const r: LarTiddlerRecord = { tiddler: { title: "x", text: "hello" }, meta: { schemaVersion: "v1" } };
    const lens = lensFor(recipe, r);
    expect(lens).toBe(v1Lens);
    expect((lens(r).tiddler as Record<string, unknown>)["lensed"]).toBe("yes");
  });

  test("multiple version-keyed lenses route by record version", () => {
    const v1Lens: (r: LarTiddlerRecord) => LarTiddlerRecord = (r) => ({ ...r, tiddler: { ...r.tiddler, via: "v1" } });
    const v2Lens: (r: LarTiddlerRecord) => LarTiddlerRecord = (r) => ({ ...r, tiddler: { ...r.tiddler, via: "v2" } });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      lenses: new Map([["v1", v1Lens], ["v2", v2Lens]]),
    };
    const r1: LarTiddlerRecord = { tiddler: { title: "x", text: "hello" }, meta: { schemaVersion: "v1" } };
    const r2: LarTiddlerRecord = { tiddler: { title: "y", text: "world" }, meta: { schemaVersion: "v2" } };
    expect(lensFor(recipe, r1)).toBe(v1Lens);
    expect(lensFor(recipe, r2)).toBe(v2Lens);
  });
});

// ---------------------------------------------------------------------------
// headsEqual (Spirit 1 finding: heads form a set, not an array)
// ---------------------------------------------------------------------------

describe("headsEqual (set-semantic equality)", () => {
  test("empty arrays match", () => {
    expect(headsEqual([], [])).toBe(true);
  });

  test("identical arrays match", () => {
    expect(headsEqual(["a"], ["a"])).toBe(true);
    expect(headsEqual(["a", "b"], ["a", "b"])).toBe(true);
  });

  test("differently-ordered arrays match (set-semantics)", () => {
    expect(headsEqual(["a", "b"], ["b", "a"])).toBe(true);
    expect(headsEqual(["c", "a", "b"], ["a", "b", "c"])).toBe(true);
  });

  test("different lengths never match", () => {
    expect(headsEqual(["a"], ["a", "b"])).toBe(false);
    expect(headsEqual([], ["a"])).toBe(false);
  });

  test("different members never match", () => {
    expect(headsEqual(["a"], ["b"])).toBe(false);
    expect(headsEqual(["a", "b"], ["a", "c"])).toBe(false);
  });

  test("reference equality short-circuits", () => {
    const h: readonly string[] = ["a", "b"];
    expect(headsEqual(h, h)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CompositeStore.auditPins (Anti-pattern #5 defense — audit-only)
// ---------------------------------------------------------------------------

/** Heads-aware MemoryTiddlerStore wrapper for audit tests. */
class HeadsAwareStore implements LarTiddlerStore {
  constructor(public heads: readonly string[] | null, private readonly inner = new MemoryTiddlerStore()) {}
  listVisible(): Promise<string[]> { return this.inner.listVisible(); }
  get(title: string): Promise<LarTiddlerRecord | null> { return this.inner.get(title); }
  put(record: LarTiddlerRecord, origin: ChangeOrigin): Promise<void> { return this.inner.put(record, origin); }
  tombstone(title: string, origin: ChangeOrigin): Promise<void> { return this.inner.tombstone(title, origin); }
  subscribe(fn: (c: import("../src/tiddler-store.js").LarTiddlerChange) => void): () => void { return this.inner.subscribe(fn); }
  async getHeads(): Promise<readonly string[] | null> { return this.heads; }
}

const BAG_A = "lar:///ha.ka.ba/bags/@aleph";
const BAG_B = "lar:///ha.ka.ba/bags/@beth";

describe("CompositeStore.auditPins", () => {
  test("returns empty map when recipe has no bagPins", async () => {
    const store = await makeStoreWithLayers();
    const recipe: WikiRecipe = { wikiSlug: "demo" };
    const audit = await store.auditPins(recipe);
    expect(audit.size).toBe(0);
  });

  test("returns 'matched' when current heads equal pinned heads", async () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_A, store: new HeadsAwareStore(["h1", "h2"]), writable: true });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      bagPins: new Map([[BAG_A, ["h1", "h2"]]]),
    };
    const audit = await store.auditPins(recipe);
    const state = audit.get(BAG_A);
    expect(state?.state).toBe("matched");
    expect((state as { state: "matched"; heads: readonly string[] }).heads).toEqual(["h1", "h2"]);
  });

  test("returns 'matched' when heads differ in order only (Spirit 1 set-semantics)", async () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_A, store: new HeadsAwareStore(["b", "a", "c"]), writable: true });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      bagPins: new Map([[BAG_A, ["a", "b", "c"]]]),
    };
    const audit = await store.auditPins(recipe);
    expect(audit.get(BAG_A)?.state).toBe("matched");
  });

  test("returns 'drifted' when current heads differ from pinned", async () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_A, store: new HeadsAwareStore(["h3"]), writable: true });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      bagPins: new Map([[BAG_A, ["h1"]]]),
    };
    const audit = await store.auditPins(recipe);
    const state = audit.get(BAG_A);
    expect(state?.state).toBe("drifted");
    const drifted = state as { state: "drifted"; pinned: readonly string[]; current: readonly string[] };
    expect(drifted.pinned).toEqual(["h1"]);
    expect(drifted.current).toEqual(["h3"]);
  });

  test("returns 'absent' when pinned bag has no layer registered", async () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_A, store: new HeadsAwareStore(["h1"]), writable: true });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      bagPins: new Map([[BAG_A, ["h1"]], [BAG_B, ["x"]]]),
    };
    const audit = await store.auditPins(recipe);
    expect(audit.get(BAG_B)?.state).toBe("absent");
    expect(audit.get(BAG_A)?.state).toBe("matched");
  });

  test("returns 'opaque' when layer's store cannot expose heads", async () => {
    const store = new CompositeStore();
    // MemoryTiddlerStore does not implement getHeads — opaque to audit.
    store.addLayer({ bagId: BAG_A, store: new MemoryTiddlerStore(), writable: true });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      bagPins: new Map([[BAG_A, ["h1"]]]),
    };
    const audit = await store.auditPins(recipe);
    expect(audit.get(BAG_A)?.state).toBe("opaque");
  });

  test("returns 'opaque' when getHeads returns null (doc not hydrated)", async () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_A, store: new HeadsAwareStore(null), writable: true });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      bagPins: new Map([[BAG_A, ["h1"]]]),
    };
    const audit = await store.auditPins(recipe);
    expect(audit.get(BAG_A)?.state).toBe("opaque");
  });

  test("audits multiple pinned bags independently", async () => {
    const store = new CompositeStore();
    store.addLayer({ bagId: BAG_A, store: new HeadsAwareStore(["h-a"]), writable: true });
    store.addLayer({ bagId: BAG_B, store: new HeadsAwareStore(["h-b-current"]), writable: true });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      bagPins: new Map([
        [BAG_A, ["h-a"]],          // matched
        [BAG_B, ["h-b-pinned"]],   // drifted
      ]),
    };
    const audit = await store.auditPins(recipe);
    expect(audit.size).toBe(2);
    expect(audit.get(BAG_A)?.state).toBe("matched");
    expect(audit.get(BAG_B)?.state).toBe("drifted");
  });

  test("audit-only — default read paths stay unaffected by drift", async () => {
    // Spirit 3 finding: most production CRDT apps do NOT pin. SDM default
    // stays audit-only; drift does not block resolveAll / get / resolveTopmost.
    const store = new CompositeStore();
    store.addLayer({
      bagId: BAG_A,
      store: new HeadsAwareStore(["h-current"]),
      writable: true,
    });
    await store.put(rec("T", "live"), origin(BAG_A), { bag: BAG_A });
    const recipe: WikiRecipe = {
      wikiSlug: "demo",
      bagPins: new Map([[BAG_A, ["h-pinned"]]]),  // drifted
    };
    const audit = await store.auditPins(recipe);
    expect(audit.get(BAG_A)?.state).toBe("drifted");
    // Drift does NOT affect default reads.
    const top = await store.resolveTopmost("T");
    expect(top?.bagId).toBe(BAG_A);
    expect((top?.record.tiddler as Record<string, unknown>)["text"]).toBe("live");
  });

  test("BagPinState type carries discriminated states", () => {
    // Compile-time check that the discriminated union covers all five states.
    const states: BagPinState[] = [
      { state: "unpinned" },
      { state: "matched", heads: ["h"] },
      { state: "drifted", pinned: ["a"], current: ["b"] },
      { state: "absent" },
      { state: "opaque" },
    ];
    expect(states).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Kāpae semantics (S4.3 — Anti-pattern #3 defense)
// ---------------------------------------------------------------------------

describe("kāpae — tombstone in higher bag stops cascade", () => {
  test("resolveTopmost returns null when HIGH tombstones a title that MID/LOW hold live", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("T", "low-live"), origin(LOW), { bag: LOW });
    await store.put(rec("T", "mid-live"), origin(MID), { bag: MID });
    await store.put(rec("T", "high-live"), origin(HIGH), { bag: HIGH });
    // Operator deaccessions T in HIGH.
    await store.tombstoneInBag(HIGH, "T", origin(HIGH));
    // Kāpae: HIGH's tombstone stops the cascade.
    const top = await store.resolveTopmost("T");
    expect(top).toBeNull();
  });

  test("getLive returns null under the same kāpae", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("T", "low-live"), origin(LOW), { bag: LOW });
    await store.put(rec("T", "high-live"), origin(HIGH), { bag: HIGH });
    await store.tombstoneInBag(HIGH, "T", origin(HIGH));
    expect(await store.getLive("T")).toBeNull();
  });

  test("absent in HIGH (no record at all) falls through to MID — distinct from tombstone", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("T", "mid-live"), origin(MID), { bag: MID });
    // HIGH has NO record for T at all (not a tombstone — truly absent).
    const top = await store.resolveTopmost("T");
    expect(top?.bagId).toBe(MID);
  });

  test("tombstone in MID with live HIGH returns HIGH (cascade not yet shadowed)", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("T", "high-live"), origin(HIGH), { bag: HIGH });
    await store.put(rec("T", "mid-live"), origin(MID), { bag: MID });
    await store.tombstoneInBag(MID, "T", origin(MID));
    // HIGH is live; tombstone in MID does not affect HIGH-priority read.
    const top = await store.resolveTopmost("T");
    expect(top?.bagId).toBe(HIGH);
  });

  test("resolveAll stays a presence report — shows live bags even when HIGH places kāpae", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("T", "low-live"), origin(LOW), { bag: LOW });
    await store.put(rec("T", "mid-live"), origin(MID), { bag: MID });
    await store.put(rec("T", "high-live"), origin(HIGH), { bag: HIGH });
    await store.tombstoneInBag(HIGH, "T", origin(HIGH));
    // resolveAll = presence report (skips tombstones, returns live versions).
    const all = await store.resolveAll("T");
    expect(all.map((r) => r.bagId).sort()).toEqual([LOW, MID].sort());
  });

  test("listKapaeBags reports which bags explicitly hide a title", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("T", "low-live"), origin(LOW), { bag: LOW });
    await store.put(rec("T", "high-live"), origin(HIGH), { bag: HIGH });
    await store.tombstoneInBag(HIGH, "T", origin(HIGH));
    expect(await store.listKapaeBags("T")).toEqual([HIGH]);
  });

  test("listKapaeBags returns empty when no bag tombstones the title", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("T", "high-live"), origin(HIGH), { bag: HIGH });
    expect(await store.listKapaeBags("T")).toEqual([]);
  });

  test("listKapaeBags orders highest-priority-first", async () => {
    const store = await makeStoreWithLayers();
    await store.put(rec("T", "mid-live"), origin(MID), { bag: MID });
    await store.put(rec("T", "high-live"), origin(HIGH), { bag: HIGH });
    await store.tombstoneInBag(MID, "T", origin(MID));
    await store.tombstoneInBag(HIGH, "T", origin(HIGH));
    expect(await store.listKapaeBags("T")).toEqual([HIGH, MID]);
  });
});
