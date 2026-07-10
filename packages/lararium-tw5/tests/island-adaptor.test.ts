/**
 * IslandAdaptor — unit tests for the narrowed TS membrane between the
 * CompositeStore and the wiki's nalu engine.
 *
 * Under unified-nalu (yin-collapse law), the adaptor's job collapsed to:
 *   - forward inbound LarTiddlerChange events → $tw.lares.enqueueNalu()
 *   - filter own tw-local echoes (don't re-enqueue our own writes)
 *   - resolve cross-bag tombstones (read getLive across composite layers)
 *   - outbound saveTiddler / deleteTiddler → store.put / store.tombstone
 *   - echo guard via $tw.lares.isApplyingNalu() (delegated to nalu engine)
 *
 * What the adaptor no longer owns (moved into TW5 nalu-engine startup module):
 *   - per-island pre-sync buffer + onSyncComplete batch flush
 *   - flushAll(accumulators, budget) frame drain
 *   - wiki.transact() wrapping
 *   - direct wiki.addTiddler / wiki.deleteTiddler calls (inbound)
 *
 * All tests use FakeTW5Engine (no TW5 boot) and MemoryTiddlerStore.
 *
 * Schema: lar:///ha.ka.ba/@lares/api/lararium/schema/island-adaptor
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { IslandAdaptor }      from "../src/island-adaptor.js";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { wikiSlotUri, type LarTiddlerChange, type ChangeOrigin } from "@lararium/mesh";

const BAG_PATHS_CONFIG = "lar:///ha.ka.ba/@lararium/config/bag-paths";
const SHIPPED_TID = join(dirname(fileURLToPath(import.meta.url)), "..", "tiddlers", "lar-bag-paths.tid");

/** The cascade body (filter rules) of the SHIPPED lar-bag-paths.tid — the
 *  frontmatter ends at the first blank line; the rest is the tiddler text. */
function shippedCascadeBody(): string {
  const raw = readFileSync(SHIPPED_TID, "utf8");
  const blank = raw.indexOf("\n\n");
  return raw.slice(blank + 2).trim();
}

const CURRENT_WIKI_BAG = "lar:///ha.ka.ba/@lararium/config/current-wiki-bag";

// ---------------------------------------------------------------------------
// FakeTW5Engine — minimal surface used by IslandAdaptor under unified-nalu
// ---------------------------------------------------------------------------

type TW5FieldsMap = Record<string, string | string[]>;

class FakeTW5Engine {
  readonly addTiddlerCalls:    TW5FieldsMap[]      = [];
  readonly deleteTiddlerCalls: string[]            = [];
  readonly enqueueCalls:       LarTiddlerChange[]  = [];
  applying = false;

  // Cascade-config tiddler texts the fake serves through wiki.getTiddlerText.
  // Default cascade mirrors lar-bag-paths.tid so the adaptor routes lar: writes
  // to TARGET_BAG (used as the test's "current wiki bag").
  readonly tiddlerTexts = new Map<string, string>([
    [
      "lar:///ha.ka.ba/@lararium/config/bag-paths",
      [
        "[prefix[$:/temp/]then{lar:///ha.ka.ba/@lararium/config/current-wiki-temp}]",
        "[prefix[$:/status/]then{lar:///ha.ka.ba/@lararium/config/current-wiki-temp}]",
        "[prefix[$:/boot/]then{lar:///ha.ka.ba/@lararium/config/current-wiki-temp}]",
        "[prefix[$:/HistoryList]then{lar:///ha.ka.ba/@lararium/config/current-wiki-temp}]",
        "[prefix[$:/StoryList]then{lar:///ha.ka.ba/@lararium/config/current-wiki-personal}]",
        "[prefix[$:/state/folded/]then{lar:///ha.ka.ba/@lararium/config/current-wiki-personal}]",
        "[prefix[$:/state/tab-]then{lar:///ha.ka.ba/@lararium/config/current-wiki-personal}]",
        "[prefix[$:/palette]then{lar:///ha.ka.ba/@lararium/config/current-wiki-personal}]",
        "[prefix[$:/state/]then{lar:///ha.ka.ba/@lararium/config/current-wiki-temp}]",
        "[prefix[Draft of ]then{lar:///ha.ka.ba/@lararium/config/current-wiki-draft}]",
        "[prefix[lar:]then{lar:///ha.ka.ba/@lararium/config/current-wiki-bag}]",
      ].join("\n"),
    ],
    ["lar:///ha.ka.ba/@lararium/config/current-wiki-bag",      wikiSlotUri("test-wiki", "working")],
    ["lar:///ha.ka.ba/@lararium/config/current-wiki-temp",     wikiSlotUri("test-wiki", "temp")],
    ["lar:///ha.ka.ba/@lararium/config/current-wiki-draft",    wikiSlotUri("test-wiki", "draft")],
    ["lar:///ha.ka.ba/@lararium/config/current-wiki-personal", wikiSlotUri("test-wiki", "personal")],
  ]);

  readonly wiki = {
    addTiddler:      (tiddler: { fields?: TW5FieldsMap } | TW5FieldsMap): void => {
      const fields = (tiddler && typeof tiddler === "object" && "fields" in tiddler && tiddler.fields)
        ? tiddler.fields as TW5FieldsMap
        : tiddler as TW5FieldsMap;
      this.addTiddlerCalls.push(fields);
    },
    deleteTiddler:   (title: string): void => { this.deleteTiddlerCalls.push(title); },
    getTiddler:      (_title: string) => undefined,
    getTiddlerText:  (title: string, fallback?: string): string =>
      this.tiddlerTexts.get(title) ?? fallback ?? "",
    filterTiddlers:  (filter: string, _widget: unknown, source: unknown): string[] => {
      // Minimal cascade-rule parser: [prefix[X]then[Y]] or [prefix[X]then{Z}].
      const re = /^\[prefix\[([^\]]*)\]then(?:\[([^\]]*)\]|\{([^}]+)\})\]$/;
      const m  = re.exec(filter);
      if (!m) return [];
      const prefix      = m[1] ?? "";
      const literalThen = m[2];
      const refThen     = m[3];
      let title = "";
      (source as (fn: (t: unknown, ti: string) => void) => void)((_t, ti) => { title = ti; });
      if (!title.startsWith(prefix)) return [];
      if (literalThen !== undefined) return [literalThen]; // empty string = explicit skip
      if (refThen) {
        const text = this.tiddlerTexts.get(refThen) ?? "";
        return text ? [text] : [];
      }
      return [];
    },
    transact:        (fn: () => void): void => fn(),
    addEventListener:    (_e: string, _cb: (c: Record<string, unknown>) => void): void => {},
    removeEventListener: (_e: string, _cb: (c: Record<string, unknown>) => void): void => {},
  };

  readonly $tw = {
    Tiddler: class {
      fields: TW5FieldsMap;
      constructor(fields: TW5FieldsMap) { this.fields = fields; }
      getFieldStrings(): Record<string, string> {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(this.fields)) {
          if (v !== undefined) out[k] = String(v);
        }
        return out;
      }
    },
    wiki: this.wiki,
    lares: {
      enqueueNalu:    (c: LarTiddlerChange): void => { this.enqueueCalls.push(c); },
      flushNalu:      (_budget?: number): void => {},
      isApplyingNalu: (): boolean => this.applying,
      naluPending:    (): number => 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const INSTANCE_ID = "test-adaptor";
const TARGET_BAG  = "lar:///ha.ka.ba/@test-wiki/draft";
const LAR_URI     = "lar:///ha.ka.ba/@lares/memes/SESSION";

function crdtRemote(islandId = "automerge"): ChangeOrigin {
  return { kind: "crdt-remote", edgeIsland: islandId };
}

function localOrigin(): ChangeOrigin {
  return { kind: "tw-local", instanceId: INSTANCE_ID };
}

function liveChange(title: string, text: string, islandId = "automerge"): LarTiddlerChange {
  return { title, record: { tiddler: { title, bag: TARGET_BAG, text } }, origin: crdtRemote(islandId) };
}

function tombstone(title: string, islandId = "automerge"): LarTiddlerChange {
  return { title, record: null, origin: crdtRemote(islandId) };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("IslandAdaptor — lifecycle", () => {
  test("start() registers via addProjection when the store supports it", () => {
    const tw5   = new FakeTW5Engine();
    const store = new MemoryTiddlerStore();
    const projections: unknown[] = [];
    (store as unknown as Record<string, unknown>)["addProjection"] = (p: unknown) => {
      projections.push(p);
      return () => {};
    };

    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
    expect(projections).toHaveLength(1);
    adaptor.stop();
  });

  test("start() falls back to subscribe() when addProjection absent — change forwards to enqueueNalu", async () => {
    const tw5   = new FakeTW5Engine();
    const store = new MemoryTiddlerStore();
    delete (store as unknown as Record<string, unknown>)["addProjection"];

    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();

    await store.put({ tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "hello" } }, crdtRemote());
    expect(tw5.enqueueCalls.length).toBeGreaterThan(0);
    adaptor.stop();
  });

  test("stop() disconnects — further store changes do not reach the nalu engine", async () => {
    const tw5   = new FakeTW5Engine();
    const store = new MemoryTiddlerStore();
    delete (store as unknown as Record<string, unknown>)["addProjection"];

    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
    adaptor.stop();

    await store.put({ tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "after-stop" } }, crdtRemote());
    expect(tw5.enqueueCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Inbound — forwards every change to $tw.lares.enqueueNalu (one rail, all bags)
// ---------------------------------------------------------------------------

describe("IslandAdaptor — inbound forwarding", () => {
  let tw5: FakeTW5Engine;
  let store: MemoryTiddlerStore;
  let adaptor: IslandAdaptor;

  beforeEach(() => {
    tw5     = new FakeTW5Engine();
    store   = new MemoryTiddlerStore();
    adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
  });

  test("crdt-remote change forwards to enqueueNalu — no direct TW5 write", () => {
    adaptor.onUriChanged(liveChange(LAR_URI, "hello"));
    expect(tw5.enqueueCalls).toHaveLength(1);
    expect(tw5.enqueueCalls[0]?.title).toBe(LAR_URI);
    expect(tw5.addTiddlerCalls).toHaveLength(0);
  });

  test("tombstone change forwards to enqueueNalu with record:null", () => {
    adaptor.onUriChanged(tombstone(LAR_URI));
    expect(tw5.enqueueCalls).toHaveLength(1);
    expect(tw5.enqueueCalls[0]?.record).toBeNull();
  });

  test("own tw-local echo is filtered — never reaches the nalu engine", () => {
    const ownChange: LarTiddlerChange = {
      title:  LAR_URI,
      record: { tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "own" } },
      origin: localOrigin(),
    };
    adaptor.onUriChanged(ownChange);
    expect(tw5.enqueueCalls).toHaveLength(0);
  });

  test("multiple bags converge on one accumulator — unified rail (per prior-art)", () => {
    adaptor.onUriChanged(liveChange("lar:///a", "a", "bag-a"));
    adaptor.onUriChanged(liveChange("lar:///b", "b", "bag-b"));
    adaptor.onUriChanged(liveChange("lar:///c", "c", "bag-a"));
    expect(tw5.enqueueCalls).toHaveLength(3);
  });

  test("non-crdt origin (canon-hydrate, lares-verb) also forwards via enqueueNalu", () => {
    const canonChange: LarTiddlerChange = {
      title:  LAR_URI,
      record: { tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "canon" } },
      origin: { kind: "canon-hydrate", receipt: "test" },
    };
    adaptor.onUriChanged(canonChange);
    expect(tw5.enqueueCalls).toHaveLength(1);
  });

  test("onSyncComplete is observability-only — no buffer to flush, no side effect", () => {
    adaptor.onSyncComplete("automerge");
    expect(tw5.enqueueCalls).toHaveLength(0);
    expect(tw5.addTiddlerCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Cross-bag tombstone resolution
// ---------------------------------------------------------------------------

describe("IslandAdaptor — cross-bag tombstone resolution", () => {
  test("tombstone forwards the live record from another bag, stamped with the SURVIVOR's bag", async () => {
    const tw5   = new FakeTW5Engine();
    const store = new MemoryTiddlerStore();
    const liveRecord = { tiddler: { title: LAR_URI, bag: "other", text: "still-here" } };
    // resolveTopmost carries {bagId, record} — the survivor's ACTUAL bag.
    (store as unknown as Record<string, unknown>)["resolveTopmost"] = async () => ({ bagId: "other", record: liveRecord });

    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();

    adaptor.onUriChanged(tombstone(LAR_URI));
    await new Promise((r) => setTimeout(r, 0)); // let microtask flush

    expect(tw5.enqueueCalls).toHaveLength(1);
    expect(tw5.enqueueCalls[0]?.record).toEqual(liveRecord);
    // The cross-bag MOVE fix: stamp the bag the record NOW lives in (the survivor),
    // never the source bag it just left — else the projector targets the stale mirror.
    expect(tw5.enqueueCalls[0]?.bag).toBe("other");
  });

  test("tombstone forwards the tombstone when no live copy remains elsewhere", async () => {
    const tw5   = new FakeTW5Engine();
    const store = new MemoryTiddlerStore();
    (store as unknown as Record<string, unknown>)["resolveTopmost"] = async () => null;

    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();

    adaptor.onUriChanged(tombstone(LAR_URI));
    await new Promise((r) => setTimeout(r, 0));

    expect(tw5.enqueueCalls).toHaveLength(1);
    expect(tw5.enqueueCalls[0]?.record).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Outbound — TW5 → CRDT
// ---------------------------------------------------------------------------

describe("IslandAdaptor — outbound saveTiddler", () => {
  let tw5: FakeTW5Engine;
  let store: MemoryTiddlerStore;
  let adaptor: IslandAdaptor;

  beforeEach(() => {
    vi.useFakeTimers();
    tw5     = new FakeTW5Engine();
    store   = new MemoryTiddlerStore();
    adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
  });

  afterEach(() => {
    adaptor.stop();
    vi.useRealTimers();
  });

  const flush = () => vi.advanceTimersByTimeAsync(IslandAdaptor.DEBOUNCE_MS + 1);

  test("lar: URI → store.put() called", async () => {
    const puts: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, origin) => { puts.push(rec.tiddler.title); return orig(rec, origin); };

    const done = adaptor.saveTiddler({ fields: { title: LAR_URI, text: "saved", bag: TARGET_BAG } });
    await flush();
    await done;

    expect(puts).toContain(LAR_URI);
  });

  test("rapid saves to the same URI coalesce — only the last write reaches the store", async () => {
    const texts: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, o) => { texts.push(typeof rec.tiddler.text === "string" ? rec.tiddler.text : ""); return orig(rec, o); };

    const saves = ["v1", "v2", "v3"].map((text) =>
      adaptor.saveTiddler({ fields: { title: LAR_URI, text, bag: TARGET_BAG } }),
    );
    await flush();
    await Promise.all(saves);

    expect(texts).toEqual(["v3"]);
  });

  test("explicit bag field routes ceremony write to canonical bag (MOVE path)", async () => {
    const bags: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, origin, options) => { bags.push(options?.bag ?? ""); return orig(rec, origin, options); };

    const done = adaptor.saveTiddler({ fields: { title: LAR_URI, text: "saved", bag: "lar:///ha.ka.ba/@lares" } });
    await flush();
    await done;

    expect(bags).toContain("lar:///ha.ka.ba/@lares");
  });

  // The working/canon split (shore-law): a LIVE edit (no explicit bag) routes
  // via the cascade to the per-wiki working write layer — NOT straight into
  // canon. The wiring lives in island-recipe.ts (current-wiki-bag → the working
  // slot); this witnesses the routing semantics with the real per-wiki slot.
  test("live lar: edit (no explicit bag) → cascade routes to the working layer, not canon", async () => {
    const workingSlot = wikiSlotUri("test-wiki", "working");
    tw5.tiddlerTexts.set(CURRENT_WIKI_BAG, workingSlot);
    const bags: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, origin, options) => { bags.push(options?.bag ?? ""); return orig(rec, origin, options); };

    const done = adaptor.saveTiddler({ fields: { title: LAR_URI, text: "a live working edit" } });
    await flush();
    await done;

    expect(bags).toContain(workingSlot);                  // saved to the live write layer
    expect(bags).not.toContain("lar:///ha.ka.ba/@lares"); // never straight into canon
  });

  test("$:/temp/ title → cascade routes to the per-wiki temp layer", async () => {
    const bags: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, origin, options) => { bags.push(options?.bag ?? ""); return orig(rec, origin, options); };

    const done = adaptor.saveTiddler({ fields: { title: "$:/temp/x" } });
    await flush();
    await done;

    expect(bags).toContain(wikiSlotUri("test-wiki", "temp"));
  });

  test("$:/StoryList → cascade routes to the per-wiki personal layer", async () => {
    const bags: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, origin, options) => { bags.push(options?.bag ?? ""); return orig(rec, origin, options); };

    const done = adaptor.saveTiddler({ fields: { title: "$:/StoryList" } });
    await flush();
    await done;

    expect(bags).toContain(wikiSlotUri("test-wiki", "personal"));
  });

  test("plain text title (no cascade rule) → skipped", async () => {
    const puts: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, o) => { puts.push(rec.tiddler.title); return orig(rec, o); };

    await adaptor.saveTiddler({ fields: { title: "Some Plain Tiddler" } });
    expect(puts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Cascade drift guard — the outbound tests above route against an in-test copy
// of the cascade; bind that copy to the SHIPPED lar-bag-paths.tid so the
// "live edit → @working" witness can never silently drift from the real config.
// (The live-VM saveTiddler path is unit-witnessed only — the cascade runs in
// the wiki VM, worker-bound in node and dropped from the browser harness, so
// no clean e2e surface drives it; the @working→wikis/ disk leg is e2e-witnessed
// in tests/e2e/working-loop. This guard keeps the unit witness truthful.)
// ---------------------------------------------------------------------------

describe("IslandAdaptor — cascade config drift guard", () => {
  test("the in-test cascade mirrors the SHIPPED lar-bag-paths.tid exactly", () => {
    const tw5 = new FakeTW5Engine();
    const inTest = (tw5.wiki.getTiddlerText(BAG_PATHS_CONFIG, "") ?? "").trim();
    expect(inTest).toBe(shippedCascadeBody());
  });

  test("the shipped cascade routes a bare lar: edit to {current-wiki-bag} (the write-layer invariant)", () => {
    // island-recipe seeds current-wiki-bag → @working for a granted content wiki;
    // this rule is what carries a live lar: edit there instead of straight to canon.
    expect(shippedCascadeBody()).toContain(`[prefix[lar:]then{${CURRENT_WIKI_BAG}}]`);
  });
});

describe("IslandAdaptor — outbound deleteTiddler", () => {
  test("lar: URI → store.tombstone() called", async () => {
    const tw5     = new FakeTW5Engine();
    const store   = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();

    await store.put({ tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "exist" } }, crdtRemote());

    const tombstones: string[] = [];
    const orig = store.tombstone.bind(store);
    store.tombstone = async (t, o) => { tombstones.push(t); return orig(t, o); };

    await adaptor.deleteTiddler(LAR_URI);
    expect(tombstones).toContain(LAR_URI);
  });
});

// ---------------------------------------------------------------------------
// Echo-loop guard — delegated to $tw.lares.isApplyingNalu()
// ---------------------------------------------------------------------------

describe("IslandAdaptor — echo-loop guard", () => {
  test("saveTiddler skips when the nalu engine reports applying", async () => {
    vi.useFakeTimers();
    const tw5     = new FakeTW5Engine();
    const store   = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();

    let putCount = 0;
    const orig = store.put.bind(store);
    store.put = async (rec, o) => { putCount++; return orig(rec, o); };

    tw5.applying = true;
    await adaptor.saveTiddler({ fields: { title: LAR_URI, text: "echo", bag: TARGET_BAG } });
    await vi.advanceTimersByTimeAsync(IslandAdaptor.DEBOUNCE_MS + 1);

    expect(putCount).toBe(0);
    adaptor.stop();
    vi.useRealTimers();
  });

  test("deleteTiddler skips when the nalu engine reports applying", async () => {
    const tw5     = new FakeTW5Engine();
    const store   = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();

    let tombstoneCount = 0;
    const orig = store.tombstone.bind(store);
    store.tombstone = async (t, o) => { tombstoneCount++; return orig(t, o); };

    tw5.applying = true;
    await adaptor.deleteTiddler(LAR_URI);

    expect(tombstoneCount).toBe(0);
  });
});
