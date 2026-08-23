/**
 * Residency Model Sprint 4 — effect-record.ts tests.
 *
 * Covers:
 *   - ARCHIVAL_VERBS membership + isArchivalVerb type guard
 *   - URI builders (effectLedgerPrefix, effectRecordUri, isEffectRecordUri)
 *   - newEventId uniqueness
 *   - buildEffectRecordTiddler ↔ parseEffectRecord roundtrip
 *   - mapActionToEffects per-verb correctness
 *   - MOVE transferId pairing accession+deaccession
 *   - writeEffectRecord against MemoryTiddlerStore
 *   - withEffectRecord mutate-then-log ordering + error path
 *
 * Kāpae tests for CompositeStore (S4.3) live in
 * residency-resolution.test.ts.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/residency-model
 */

import { describe, test, expect } from "vitest";
import {
  ARCHIVAL_VERBS, isArchivalVerb,
  LARES_EFFECT_RECORD_TAG,
  effectLedgerPrefix, effectRecordUri, isEffectRecordUri,
  newEventId,
  buildEffectRecordTiddler, parseEffectRecord,
  mapActionToEffects,
  writeEffectRecord, withEffectRecord,
} from "../src/effect-record.js";
import type { EffectRecord } from "../src/effect-record.js";
import type { LarTiddlerStore } from "../src/tiddler-store.js";
import type { ResidencyAction, AddAction, CopyAction, MoveAction, ClearAction, DropAction, LoadAction } from "../src/residency-actions.js";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { CompositeStore } from "../src/composite-store.js";

// ---------------------------------------------------------------------------
// ARCHIVAL_VERBS membership
// ---------------------------------------------------------------------------

describe("ARCHIVAL_VERBS membership", () => {
  test("exactly nine canonical archival verbs", () => {
    expect(ARCHIVAL_VERBS).toEqual([
      "accession", "deaccession", "transfer",
      "withdrawal", "loan", "holdings",
      "reappraisal", "disposition", "creation",
    ]);
    expect(ARCHIVAL_VERBS).toHaveLength(9);
  });

  test("isArchivalVerb accepts all canonical verbs", () => {
    for (const v of ARCHIVAL_VERBS) expect(isArchivalVerb(v)).toBe(true);
  });

  test("isArchivalVerb rejects non-archival verbs", () => {
    expect(isArchivalVerb("ADD")).toBe(false);         // an ACTION verb, not archival
    expect(isArchivalVerb("echo")).toBe(false);
    expect(isArchivalVerb("ACCESSION")).toBe(false);   // archival verbs stay lowercase
    expect(isArchivalVerb("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// URI builders
// ---------------------------------------------------------------------------

describe("effect-record URI builders", () => {
  const BAG = "lar:///ha.ka.ba/bags/elyncia";

  test("effectLedgerPrefix appends /ledger/residency/ to the bag URI", () => {
    expect(effectLedgerPrefix(BAG)).toBe("lar:///ha.ka.ba/bags/elyncia/ledger/residency/");
  });

  test("effectRecordUri appends event-id to the prefix", () => {
    expect(effectRecordUri(BAG, "abc-123")).toBe("lar:///ha.ka.ba/bags/elyncia/ledger/residency/abc-123");
  });

  test("isEffectRecordUri accepts well-formed log titles", () => {
    expect(isEffectRecordUri("lar:///ha.ka.ba/bags/elyncia/ledger/residency/abc-123")).toBe(true);
    expect(isEffectRecordUri("lar:///lararium.local.vm/daemon/ledger/residency/x")).toBe(true);
  });

  test("isEffectRecordUri accepts a bags/ kind-segment title — the projector must skip it", () => {
    // An audit title builds from the bag const, which carries the `bags/` segment. The
    // projector recognizes it as audit data, never leaking it to disk as a carrier.
    expect(isEffectRecordUri("lar:///ha.ka.ba/bags/lararium/ledger/residency/abc-123")).toBe(true);
    expect(isEffectRecordUri("lar:///ha.ka.ba/bags/daemon/ledger/residency/x")).toBe(true);
  });

  test("isEffectRecordUri accepts a per-wiki-slot ledger title — the projector must skip it", () => {
    // A residency verb run in a wiki writes its ledger under the working slot; the
    // deeper `wikis/<slug>/working/` prefix must still read as audit, never a carrier.
    expect(isEffectRecordUri("lar:///ha.ka.ba/wikis/lares/working/ledger/residency/1jt7fmda8-joc6o7ju")).toBe(true);
    expect(isEffectRecordUri("lar:///ha.ka.ba/wikis/synthetic-dream-machine/draft/ledger/residency/x")).toBe(true);
  });

  test("isEffectRecordUri rejects non-residency-log titles", () => {
    expect(isEffectRecordUri("lar:///ha.ka.ba/bags/elyncia/some-tiddler")).toBe(false);
    expect(isEffectRecordUri("lar:///ha.ka.ba/bags/elyncia/ledger/residency/")).toBe(false); // empty event-id
    expect(isEffectRecordUri("https://example.com")).toBe(false);
    expect(isEffectRecordUri("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// newEventId
// ---------------------------------------------------------------------------

describe("newEventId", () => {
  test("returns distinct ids across calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(newEventId());
    expect(ids.size).toBe(50);
  });

  test("matches timestamp-rand format (base-32 with hyphen)", () => {
    const id = newEventId();
    expect(id).toMatch(/^[0-9a-v]+-[0-9a-v]+$/);
  });
});

// ---------------------------------------------------------------------------
// buildEffectRecordTiddler / parseEffectRecord roundtrip
// ---------------------------------------------------------------------------

describe("EffectRecord encode/parse roundtrip", () => {
  test("ADD-shaped accession record roundtrips through tiddler form", () => {
    const original: EffectRecord = {
      eventId:      "evt-1",
      archivalVerb: "accession",
      actionVerb:   "ADD",
      requestId:    "req-1",
      bag:          "lar:///ha.ka.ba/bags/elyncia",
      actor:        "operator-x",
      timestamp:    "2026-05-31T00:00:00Z",
      tiddlerTitle: "MyTiddler",
      changeId:     "c-stable",
      sourceBag:    "lar:///ha.ka.ba/bags/personal",
    };
    const tiddler = buildEffectRecordTiddler(original);
    expect(tiddler.tiddler.title).toBe("lar:///ha.ka.ba/bags/elyncia/ledger/residency/evt-1");
    expect(tiddler.tiddler["tags"]).toBe(LARES_EFFECT_RECORD_TAG);

    const parsed = parseEffectRecord(tiddler.tiddler as Record<string, unknown>);
    expect(parsed).not.toBeNull();
    expect(parsed?.eventId).toBe("evt-1");
    expect(parsed?.archivalVerb).toBe("accession");
    expect(parsed?.actionVerb).toBe("ADD");
    expect(parsed?.tiddlerTitle).toBe("MyTiddler");
    expect(parsed?.changeId).toBe("c-stable");
    expect(parsed?.sourceBag).toBe("lar:///ha.ka.ba/bags/personal");
  });

  test("MOVE-shaped deaccession record carries transferId and disposition", () => {
    const original: EffectRecord = {
      eventId:      "evt-2",
      archivalVerb: "deaccession",
      actionVerb:   "MOVE",
      requestId:    "req-2",
      bag:          "lar:///ha.ka.ba/bags/personal",
      actor:        "op",
      timestamp:    "2026-05-31T00:00:00Z",
      tiddlerTitle: "T",
      changeId:     "c-1",
      transferId:   "tr-1",
      sourceBag:    "lar:///ha.ka.ba/bags/personal",
      destBag:      "lar:///ha.ka.ba/bags/wiki",
      disposition:  "transferred-to:lar:///ha.ka.ba/bags/wiki",
    };
    const parsed = parseEffectRecord(buildEffectRecordTiddler(original).tiddler as Record<string, unknown>);
    expect(parsed?.transferId).toBe("tr-1");
    expect(parsed?.disposition).toBe("transferred-to:lar:///ha.ka.ba/bags/wiki");
  });

  test("parseEffectRecord returns null for non-effect tiddlers", () => {
    expect(parseEffectRecord({ title: "some-other-tiddler" })).toBeNull();
    expect(parseEffectRecord({})).toBeNull();
    expect(parseEffectRecord({
      title:           "lar:///ha.ka.ba/bags/x/ledger/residency/y",
      "archival-verb": "not-an-archival-verb",
      "action-verb":   "ADD",
      "event-id":      "e",
      "request-id":    "r",
      bag:             "b",
      actor:           "a",
      timestamp:       "t",
    })).toBeNull();
  });

  test("parseEffectRecord requires all base fields (event-id, request-id, bag, actor, timestamp)", () => {
    const full: Record<string, unknown> = {
      title:           "lar:///ha.ka.ba/bags/x/ledger/residency/y",
      "archival-verb": "accession",
      "action-verb":   "ADD",
      "event-id":      "e",
      "request-id":    "r",
      bag:             "b",
      actor:           "a",
      timestamp:       "t",
    };
    for (const k of ["event-id", "request-id", "bag", "actor", "timestamp"]) {
      const dropped = { ...full };
      delete dropped[k];
      expect(parseEffectRecord(dropped)).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// mapActionToEffects — per-verb correctness
// ---------------------------------------------------------------------------

describe("mapActionToEffects", () => {
  const NOW = "2026-05-31T00:00:00Z";
  let counter = 0;
  const newId = () => `id-${++counter}`;
  const opts = { now: NOW, newId };

  function makeActionBase() {
    counter = 0;
    return { requestId: "req-1", requestedBy: "operator-x" };
  }

  test("ADD produces one accession in to-bag", () => {
    const base = makeActionBase();
    const action: AddAction = {
      ...base, verb: "ADD",
      title: "T", fromBag: "lar:///ha.ka.ba/bags/personal", toBag: "lar:///ha.ka.ba/bags/elyncia", changeId: "c-1",
    };
    const effects = mapActionToEffects(action, opts);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.archivalVerb).toBe("accession");
    expect(effects[0]!.bag).toBe("lar:///ha.ka.ba/bags/elyncia");
    expect(effects[0]!.tiddlerTitle).toBe("T");
    expect(effects[0]!.changeId).toBe("c-1");
    expect(effects[0]!.sourceBag).toBe("lar:///ha.ka.ba/bags/personal");
    expect(effects[0]!.actionVerb).toBe("ADD");
    expect(effects[0]!.timestamp).toBe(NOW);
  });

  test("COPY produces one accession with copy-overwrite reason", () => {
    const base = makeActionBase();
    const action: CopyAction = {
      ...base, verb: "COPY",
      title: "T", fromBag: "lar:///ha.ka.ba/bags/a", toBag: "lar:///ha.ka.ba/bags/b", changeId: "c",
    };
    const effects = mapActionToEffects(action, opts);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.archivalVerb).toBe("accession");
    expect(effects[0]!.reason).toBe("copy-overwrite");
  });

  test("MOVE produces two effects paired by transferId", () => {
    const base = makeActionBase();
    const action: MoveAction = {
      ...base, verb: "MOVE",
      title: "T", fromBag: "lar:///ha.ka.ba/bags/personal", toBag: "lar:///ha.ka.ba/bags/wiki", changeId: "c-move",
    };
    const effects = mapActionToEffects(action, opts);
    expect(effects).toHaveLength(2);
    const [accession, deaccession] = effects as [EffectRecord, EffectRecord];
    expect(accession.archivalVerb).toBe("accession");
    expect(accession.bag).toBe("lar:///ha.ka.ba/bags/wiki");
    expect(deaccession.archivalVerb).toBe("deaccession");
    expect(deaccession.bag).toBe("lar:///ha.ka.ba/bags/personal");
    // transferId pairs them
    expect(accession.transferId).toBeDefined();
    expect(accession.transferId).toBe(deaccession.transferId);
    // disposition on the deaccession names the destination
    expect(deaccession.disposition).toBe("transferred-to:lar:///ha.ka.ba/bags/wiki");
  });

  test("CLEAR produces one bag-level disposition record", () => {
    const base = makeActionBase();
    const action: ClearAction = { ...base, verb: "CLEAR", bag: "lar:///ha.ka.ba/bags/scratch" };
    const effects = mapActionToEffects(action, opts);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.archivalVerb).toBe("disposition");
    expect(effects[0]!.disposition).toBe("bag-cleared");
    expect(effects[0]!.bag).toBe("lar:///ha.ka.ba/bags/scratch");
    expect(effects[0]!.tiddlerTitle).toBeUndefined(); // bag-level
  });

  test("DROP produces one bag-level disposition record", () => {
    const base = makeActionBase();
    const action: DropAction = { ...base, verb: "DROP", bag: "lar:///ha.ka.ba/bags/retired" };
    const effects = mapActionToEffects(action, opts);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.archivalVerb).toBe("disposition");
    expect(effects[0]!.disposition).toBe("bag-retired");
  });

  test("LOAD produces accession with source-uri and changeId", () => {
    const base = makeActionBase();
    const action: LoadAction = {
      ...base, verb: "LOAD",
      sourceUri: "https://example.org/seed.json", toBag: "lar:///ha.ka.ba/bags/elyncia", changeId: "c-load",
    };
    const effects = mapActionToEffects(action, opts);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.archivalVerb).toBe("accession");
    expect(effects[0]!.sourceUri).toBe("https://example.org/seed.json");
    expect(effects[0]!.changeId).toBe("c-load");
    expect(effects[0]!.reason).toBe("external load");
  });

  test("every ACTION verb produces at least one effect (audit-coverage invariant)", () => {
    const baseFields = { requestId: "r", requestedBy: "a" };
    const actions: ResidencyAction[] = [
      { ...baseFields, verb: "ADD",   title: "T", fromBag: "a", toBag: "b", changeId: "c" },
      { ...baseFields, verb: "COPY",  title: "T", fromBag: "a", toBag: "b", changeId: "c" },
      { ...baseFields, verb: "MOVE",  title: "T", fromBag: "a", toBag: "b", changeId: "c" },
      { ...baseFields, verb: "CLEAR", bag: "x" },
      { ...baseFields, verb: "DROP",  bag: "x" },
      { ...baseFields, verb: "LOAD",  sourceUri: "u", toBag: "b", changeId: "c" },
    ];
    for (const a of actions) {
      const effects = mapActionToEffects(a);
      expect(effects.length).toBeGreaterThan(0);
      for (const e of effects) {
        expect(e.requestId).toBe("r");
        expect(e.actor).toBe("a");
        expect(e.actionVerb).toBe(a.verb);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// writeEffectRecord + withEffectRecord
// ---------------------------------------------------------------------------

describe("writeEffectRecord", () => {
  test("writes the effect tiddler into the affected bag's own store", async () => {
    const composite = new CompositeStore();
    const BAG = "lar:///ha.ka.ba/bags/elyncia";
    composite.addLayer({ bagId: BAG, store: new MemoryTiddlerStore(), writable: true });
    const effect: EffectRecord = {
      eventId:      "evt-1",
      archivalVerb: "accession",
      actionVerb:   "ADD",
      requestId:    "req-1",
      bag:          BAG,
      actor:        "op",
      timestamp:    "2026-05-31T00:00:00Z",
      tiddlerTitle: "T",
      changeId:     "c",
    };
    await writeEffectRecord(async (bag) => composite.writableStoreForBag(bag), effect);
    const got = await composite.get(effectRecordUri(BAG, "evt-1"));
    expect(got).not.toBeNull();
    expect((got?.tiddler as Record<string, unknown>)["archival-verb"]).toBe("accession");
  });

  test("throws loud when the affected bag is unreachable (no silent unlink)", async () => {
    const effect: EffectRecord = {
      eventId:      "evt-x",
      archivalVerb: "accession",
      actionVerb:   "ADD",
      requestId:    "req-x",
      bag:          "lar:///ha.ka.ba/bags/nowhere",
      actor:        "op",
      timestamp:    "2026-05-31T00:00:00Z",
      tiddlerTitle: "T",
      changeId:     "c",
    };
    await expect(writeEffectRecord(async () => null, effect)).rejects.toThrow(/unreachable/);
  });
});

describe("withEffectRecord", () => {
  async function setupComposite(): Promise<{
    composite: CompositeStore; bagA: string; bagB: string;
    resolve: (bag: string) => Promise<LarTiddlerStore | null>;
  }> {
    const composite = new CompositeStore();
    const bagA = "lar:///ha.ka.ba/bags/aleph";
    const bagB = "lar:///ha.ka.ba/bags/beth";
    composite.addLayer({ bagId: bagA, store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });
    composite.addLayer({ bagId: bagB, store: new MemoryTiddlerStore(), writable: true });
    // Effect records ride each affected bag's OWN store (residency-model
    // #effect-record-surface) — resolved per bag, not the composite default writable.
    const resolve = async (bag: string) => composite.writableStoreForBag(bag);
    return { composite, bagA, bagB, resolve };
  }

  test("runs mutate then writes effect records (ADD = one accession)", async () => {
    const { composite, bagA, bagB, resolve } = await setupComposite();
    let mutateCalled = false;
    const action: AddAction = {
      verb: "ADD", requestId: "r-1", requestedBy: "op",
      title: "T", fromBag: bagA, toBag: bagB, changeId: "c-1",
    };
    const result = await withEffectRecord(action, resolve, async () => {
      mutateCalled = true;
      return "result-payload";
    });
    expect(mutateCalled).toBe(true);
    expect(result).toBe("result-payload");

    // One accession effect landed in bagB.
    const titles = await composite.listVisible();
    const effectTitles = titles.filter(isEffectRecordUri);
    expect(effectTitles.length).toBe(1);
    const got = await composite.get(effectTitles[0]!);
    expect((got?.tiddler as Record<string, unknown>)["archival-verb"]).toBe("accession");
    expect((got?.tiddler as Record<string, unknown>)["bag"]).toBe(bagB);
  });

  test("MOVE writes paired effects (one accession + one deaccession)", async () => {
    const { composite, bagA, bagB, resolve } = await setupComposite();
    const action: MoveAction = {
      verb: "MOVE", requestId: "r-1", requestedBy: "op",
      title: "T", fromBag: bagA, toBag: bagB, changeId: "c-1",
    };
    await withEffectRecord(action, resolve, async () => undefined);

    const titles = await composite.listVisible();
    const effectTitles = titles.filter(isEffectRecordUri);
    expect(effectTitles.length).toBe(2);

    const records = await Promise.all(effectTitles.map((t) => composite.get(t)));
    const verbs = records.map((r) => (r?.tiddler as Record<string, unknown>)["archival-verb"]);
    expect(verbs.sort()).toEqual(["accession", "deaccession"]);

    // Both effects share a transfer-id.
    const transferIds = records.map((r) => (r?.tiddler as Record<string, unknown>)["transfer-id"]);
    expect(transferIds[0]).toBeDefined();
    expect(transferIds[0]).toBe(transferIds[1]);
  });

  test("when mutate throws, no effect records get written", async () => {
    const { composite, bagA, bagB, resolve } = await setupComposite();
    const action: AddAction = {
      verb: "ADD", requestId: "r-1", requestedBy: "op",
      title: "T", fromBag: bagA, toBag: bagB, changeId: "c-1",
    };
    await expect(withEffectRecord(action, resolve, async () => {
      throw new Error("mutate failed");
    })).rejects.toThrow("mutate failed");

    const titles = await composite.listVisible();
    const effectTitles = titles.filter(isEffectRecordUri);
    expect(effectTitles.length).toBe(0);
  });

  test("mutate result type passes through unchanged", async () => {
    const { composite, bagA, bagB, resolve } = await setupComposite();
    const action: AddAction = {
      verb: "ADD", requestId: "r-1", requestedBy: "op",
      title: "T", fromBag: bagA, toBag: bagB, changeId: "c-1",
    };
    const result = await withEffectRecord(action, resolve, async () => ({ id: 42, ok: true }));
    expect(result).toEqual({ id: 42, ok: true });
  });
});
