/**
 * IslandAdaptor — unit tests for the causal-island ↔ TW5 wiki bridge.
 *
 * Tests cover:
 *   Lifecycle     — start() wires addProjection or falls back to subscribe; stop() unsubscribes
 *   Inbound       — onUriChanged buffers pre-sync; onSyncComplete batch flush; post-sync deferred
 *   Outbound      — saveTiddler → store.put(); deleteTiddler → store.tombstone(); skip guards
 *   Accumulator   — flushAll drains IslandAccumulator into wiki.transact()
 *   Echo guard    — _applying map prevents outbound round-trips during inbound apply
 *
 * All tests use FakeTW5Engine (no actual TW5 boot) and MemoryTiddlerStore
 * (in-process, synchronous) — no Automerge or DOM required.
 *
 * Schema: lar:///ha.ka.ba/@lares/api/v0.1/lararium/schema/island-adaptor
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { IslandAdaptor }      from "../src/island-adaptor.js";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { IslandAccumulator }    from "@lararium/mesh";
import type { LarTiddlerChange, ChangeOrigin } from "@lararium/mesh";

// ---------------------------------------------------------------------------
// FakeTW5Engine — minimal TW5Engine surface used by IslandAdaptor
// ---------------------------------------------------------------------------

type TW5FieldsMap = Record<string, string | string[]>;

class FakeTW5Engine {
  readonly addTiddlerCalls:    TW5FieldsMap[] = [];
  readonly deleteTiddlerCalls: string[]       = [];

  private _changeListeners: ((changes: Record<string, unknown>) => void)[] = [];

  readonly wiki = {
    addTiddler:      (tiddler: { fields?: TW5FieldsMap } | TW5FieldsMap): void => {
      const fields = (tiddler && typeof tiddler === "object" && "fields" in tiddler && tiddler.fields)
        ? tiddler.fields as TW5FieldsMap
        : tiddler as TW5FieldsMap;
      this.addTiddlerCalls.push(fields);
    },
    deleteTiddler:   (title: string): void => { this.deleteTiddlerCalls.push(title); },
    getTiddler:      (_title: string) => undefined,
    filterTiddlers:  (_filter: string): string[] => [],
    transact:        (fn: () => void): void => fn(),
    addEventListener:    (_e: string, cb: (c: Record<string, unknown>) => void): void => {
      this._changeListeners.push(cb);
    },
    removeEventListener: (_e: string, cb: (c: Record<string, unknown>) => void): void => {
      this._changeListeners = this._changeListeners.filter((l) => l !== cb);
    },
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
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const INSTANCE_ID = "test-adaptor";
const TARGET_BAG  = "lar:///ha.ka.ba/@lararium/wikis/test-wiki/draft";
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

  test("start() falls back to subscribe() when addProjection absent", async () => {
    const tw5   = new FakeTW5Engine();
    const store = new MemoryTiddlerStore();
    delete (store as unknown as Record<string, unknown>)["addProjection"];

    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();

    // subscribe fallback calls _applyChange() directly — changes reach TW5 without sync gate.
    await store.put({ tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "hello" } }, crdtRemote());
    expect(tw5.addTiddlerCalls.length).toBeGreaterThan(0);
    adaptor.stop();
  });

  test("stop() disconnects — further store changes do not reach TW5", async () => {
    const tw5   = new FakeTW5Engine();
    const store = new MemoryTiddlerStore();
    delete (store as unknown as Record<string, unknown>)["addProjection"];

    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
    adaptor.stop();

    await store.put({ tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "after-stop" } }, crdtRemote());
    expect(tw5.addTiddlerCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Inbound — CRDT → TW5
// ---------------------------------------------------------------------------

describe("IslandAdaptor — inbound pre-sync buffering", () => {
  let tw5: FakeTW5Engine;
  let store: MemoryTiddlerStore;
  let adaptor: IslandAdaptor;

  beforeEach(() => {
    tw5     = new FakeTW5Engine();
    store   = new MemoryTiddlerStore();
    adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
  });

  test("crdt-remote change before onSyncComplete is buffered — no TW5 write yet", () => {
    adaptor.onUriChanged(liveChange(LAR_URI, "buffered"));
    expect(tw5.addTiddlerCalls).toHaveLength(0);
  });

  test("onSyncComplete flushes buffer in one batch — tiddler lands in wiki", () => {
    adaptor.onUriChanged(liveChange(LAR_URI, "hello"));
    adaptor.onSyncComplete("automerge");
    expect(tw5.addTiddlerCalls).toHaveLength(1);
    expect(tw5.addTiddlerCalls[0]?.["bag"]).toBe(TARGET_BAG);
  });

  test("tombstone in buffer → deleteTiddler called on flush", () => {
    adaptor.onUriChanged(tombstone(LAR_URI));
    adaptor.onSyncComplete("automerge");
    expect(tw5.deleteTiddlerCalls).toContain(LAR_URI);
  });

  test("per-island isolation — island B flushes without touching island A's buffer", () => {
    const islandA = "automerge:room-a";
    const islandB = "automerge:room-b";
    adaptor.onUriChanged(liveChange("lar:///a", "a", islandA));
    adaptor.onUriChanged(liveChange("lar:///b", "b", islandB));

    adaptor.onSyncComplete(islandB);
    expect(tw5.addTiddlerCalls).toHaveLength(1); // only B

    adaptor.onSyncComplete(islandA);
    expect(tw5.addTiddlerCalls).toHaveLength(2); // now A too
  });

  test("own tw-local echo in pre-sync buffer is suppressed on flush", () => {
    const ownChange: LarTiddlerChange = {
      title: LAR_URI,
      record: { tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "own" } },
      origin: localOrigin(),
    };
    adaptor.onUriChanged(ownChange);
    adaptor.onSyncComplete(INSTANCE_ID);
    expect(tw5.addTiddlerCalls).toHaveLength(0);
  });
});

describe("IslandAdaptor — inbound post-sync crdt-remote deferred to accumulator", () => {
  test("onUriChanged after onSyncComplete does NOT write to TW5 (accumulator owns it)", () => {
    const tw5     = new FakeTW5Engine();
    const store   = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
    adaptor.onSyncComplete("automerge");

    adaptor.onUriChanged(liveChange(LAR_URI, "post-sync"));
    // IslandAccumulator (separate MemeProjection) receives this; adaptor passes.
    expect(tw5.addTiddlerCalls).toHaveLength(0);
  });

  test("non-crdt origin after onSyncComplete applies immediately", () => {
    const tw5     = new FakeTW5Engine();
    const store   = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
    adaptor.onSyncComplete("automerge");

    const canonChange: LarTiddlerChange = {
      title:  LAR_URI,
      record: { tiddler: { title: LAR_URI, bag: TARGET_BAG, text: "canon" } },
      origin: { kind: "canon-hydrate", receipt: "test" },
    };
    adaptor.onUriChanged(canonChange);
    expect(tw5.addTiddlerCalls.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Accumulator drain
// ---------------------------------------------------------------------------

describe("IslandAdaptor — flushAll (N accumulators, recipe-ordered)", () => {
  test("drains multiple accumulators in order, shared budget", () => {
    const tw5     = new FakeTW5Engine();
    const store   = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    const accA    = new IslandAccumulator(); // lower priority bag
    const accB    = new IslandAccumulator(); // higher priority bag

    accA.onSyncComplete(); accB.onSyncComplete();
    accA.onUriChanged(liveChange("lar:///bag-a/1", "a1"));
    accA.onUriChanged(liveChange("lar:///bag-a/2", "a2"));
    accB.onUriChanged(liveChange("lar:///bag-b/1", "b1"));
    accB.onUriChanged(liveChange("lar:///bag-b/2", "b2"));

    adaptor.start();
    adaptor.flushAll([accA, accB], 3); // budget 3: drains 2 from A, 1 from B

    expect(tw5.addTiddlerCalls).toHaveLength(3);
    expect(accA.pending).toBe(0);
    expect(accB.pending).toBe(1); // one B left
  });

  test("stops at budget — remainder carries to next tick", () => {
    const tw5     = new FakeTW5Engine();
    const store   = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    const acc     = new IslandAccumulator();
    acc.onSyncComplete();

    for (let i = 0; i < 10; i++) acc.onUriChanged(liveChange(`lar:///t/${i}`, `v${i}`));

    adaptor.start();
    adaptor.flushAll([acc], 4);

    expect(tw5.addTiddlerCalls).toHaveLength(4);
    expect(acc.pending).toBe(6);
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

  /** Advance fake timers past the debounce window and flush all microtasks. */
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

    // Only the last value reaches the store — v1 and v2 were displaced by the debounce
    expect(texts).toEqual(["v3"]);
  });

  test("explicit bag field routes ceremony write to canonical bag (promote path)", async () => {
    const bags: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, origin, options) => { bags.push(options?.bag ?? ""); return orig(rec, origin, options); };

    const done = adaptor.saveTiddler({ fields: { title: LAR_URI, text: "saved", bag: "lar:///ha.ka.ba/@lares" } });
    await flush();
    await done;

    expect(bags).toContain("lar:///ha.ka.ba/@lares");
  });

  test("$:/temp/ title → skipped (no debounce timer)", async () => {
    const puts: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, o) => { puts.push(rec.tiddler.title); return orig(rec, o); };

    await adaptor.saveTiddler({ fields: { title: "$:/temp/x" } });
    expect(puts).toHaveLength(0);
  });

  test("$:/ system title → skipped", async () => {
    const puts: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, o) => { puts.push(rec.tiddler.title); return orig(rec, o); };

    await adaptor.saveTiddler({ fields: { title: "$:/StoryList" } });
    expect(puts).toHaveLength(0);
  });

  test("plain text title (no lar: prefix) → skipped", async () => {
    const puts: string[] = [];
    const orig = store.put.bind(store);
    store.put = async (rec, o) => { puts.push(rec.tiddler.title); return orig(rec, o); };

    await adaptor.saveTiddler({ fields: { title: "Some Plain Tiddler" } });
    expect(puts).toHaveLength(0);
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
// Echo-loop guard
// ---------------------------------------------------------------------------

describe("IslandAdaptor — echo-loop guard", () => {
  test("inbound apply does not trigger outbound store.put()", async () => {
    const tw5     = new FakeTW5Engine();
    const store   = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(tw5 as never, store, INSTANCE_ID, TARGET_BAG);
    adaptor.start();
    adaptor.onSyncComplete("automerge");

    let putCount = 0;
    const orig = store.put.bind(store);
    store.put = async (rec, o) => { putCount++; return orig(rec, o); };

    // Five post-sync crdt-remote changes — adaptor passes (accumulator owns),
    // so no outbound puts fire.
    for (let i = 0; i < 5; i++) adaptor.onUriChanged(liveChange(`lar:///t/${i}`, `v${i}`));
    expect(putCount).toBe(0);
  });
});
