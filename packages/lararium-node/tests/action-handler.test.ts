/**
 * action-handler — Residency Model ACTION verb handler family tests (Sprint 5).
 *
 * Verifies:
 *   - registerActionReactors fills the VerbTable with all six verbs
 *   - each handler executes the bag mutation
 *   - each handler writes the expected effect records via withEffectRecord
 *   - cap-verify gates destination bag (and source bag for MOVE)
 *   - change-id preserves across ADD / COPY / MOVE transfers
 *   - LOAD throws not-implemented (Sprint 5 scope honest about external fetch)
 *
 * Meme: lar:///ha.ka.ba/lararium/api/residency-model
 */

import { describe, test, expect } from "vitest";
import {
  CompositeStore,
  ACTION_VERBS,
  newChangeId,
  isEffectRecordUri,
} from "@lararium/mesh";
import type {
  ActionVerb, ChangeOrigin, LarTiddlerRecord, VerbContext, Verb,
  CapabilityAccess, CapabilityVerifyResult, CapabilityVerifier,
} from "@lararium/mesh";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { VerbTable } from "../../lararium-tw5/src/verb-dispatcher.js";
import { registerActionReactors } from "../../lararium-tw5/src/action-handler.js";
import { runLocalVerb } from "../../lararium-tw5/src/verb-local-dispatch.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BAG_LOW  = "lar:///ha.ka.ba/bags/low";
const BAG_MID  = "lar:///ha.ka.ba/bags/mid";
const BAG_HIGH = "lar:///ha.ka.ba/bags/high";

function makeComposite(): CompositeStore {
  const c = new CompositeStore();
  c.addLayer({ bagId: BAG_LOW,  store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });
  c.addLayer({ bagId: BAG_MID,  store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });
  c.addLayer({ bagId: BAG_HIGH, store: new MemoryTiddlerStore(), writable: true });
  return c;
}

function alwaysAllowCap(): VerbContext["cap"] {
  return async (_access: CapabilityAccess, _bagUrl: string): Promise<CapabilityVerifyResult> => ({ ok: true });
}

function makeContext(composite: CompositeStore, verb: ActionVerb, args: Record<string, unknown>): VerbContext {
  const invocation: Verb = {
    requestId:   "req-1",
    title:       `lar:///lararium.local.vm/verbs/req-1`,
    action:      verb,
    args,
    targets:     [],
    batchMode:   "best-effort",
    status:      "pending",
    requestedBy: "operator-test",
    requestedAt: "2026-05-31T00:00:00Z",
  };
  return { daemon: composite, invocation, cap: alwaysAllowCap() };
}

function denyCap(deniedBag: string): VerbContext["cap"] {
  return async (_access, bagUrl): Promise<CapabilityVerifyResult> =>
    bagUrl === deniedBag ? { ok: false, reason: "denied-in-test" } : { ok: true };
}

async function effectRecordsIn(composite: CompositeStore): Promise<string[]> {
  return (await composite.listVisible()).filter(isEffectRecordUri);
}

function seedTiddler(composite: CompositeStore, bag: string, title: string, text: string, changeId?: string): Promise<void> {
  const record: LarTiddlerRecord = {
    tiddler: { title, text },
    ...(changeId !== undefined && { meta: { changeId } }),
  };
  const origin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: bag };
  return composite.put(record, origin, { bag });
}

// ---------------------------------------------------------------------------
// registerActionReactors fills the table
// ---------------------------------------------------------------------------

describe("registerActionReactors", () => {
  test("registers all six ACTION verbs on the table", () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    for (const verb of ACTION_VERBS) {
      expect(table.has(verb)).toBe(true);
    }
  });

  test("does not register non-ACTION verbs", () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    expect(table.has("echo")).toBe(false);
    expect(table.has("frobnicate")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ADD handler
// ---------------------------------------------------------------------------

describe("ADD handler", () => {
  test("copies tiddler from fromBag to toBag preserving change-id", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const cid = newChangeId();
    await seedTiddler(composite, BAG_LOW, "T", "low-text", cid);

    const handler = table.get("ADD")!;
    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": cid };
    const result = await handler(args, makeContext(composite, "ADD", args));

    expect(result["verb"]).toBe("ADD");
    expect(result["title"]).toBe("T");
    expect(result["fromBag"]).toBe(BAG_LOW);
    expect(result["toBag"]).toBe(BAG_HIGH);
    expect(result["changeId"]).toBe(cid);

    // Both bags hold the tiddler now.
    const all = await composite.resolveAll("T");
    expect(all.map((e) => e.bagId).sort()).toEqual([BAG_HIGH, BAG_LOW].sort());

    // change-id preserved on the destination.
    const dest = all.find((e) => e.bagId === BAG_HIGH)!;
    expect(dest.record.meta?.changeId).toBe(cid);

    // Effect record landed (accession in to-bag).
    const effects = await effectRecordsIn(composite);
    expect(effects.length).toBe(1);
  });

  test("rejects when source bag does not hold the title", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const handler = table.get("ADD")!;
    const args = { title: "missing", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": "c" };
    await expect(handler(args, makeContext(composite, "ADD", args))).rejects.toThrow(/does not hold/);
  });

  test("fails loud on an unmounted destination — no silent fall-through, no auto-mount", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const cid = newChangeId();
    await seedTiddler(composite, BAG_LOW, "T", "low-text", cid);

    // A deep target bag with no writable layer: a residency write MUST fail loud
    // (Law 4 / confused-deputy guard) and MUST NOT mount the bag ephemerally —
    // the access-reach path resolves the bag's own doc, never a standing mount.
    const handler = table.get("ADD")!;
    const UNMOUNTED = "lar:///ha.ka.ba/bags/unmounted-deep-bag";
    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": UNMOUNTED, "change-id": cid };
    await expect(handler(args, makeContext(composite, "ADD", args)))
      .rejects.toThrow(/unreachable|no silent fall-through/i);

    expect(composite.hasBag(UNMOUNTED)).toBe(false);
    // The source copy is untouched; nothing landed in the default writable either.
    expect((await composite.resolveAll("T")).map((e) => e.bagId)).toEqual([BAG_LOW]);
  });
});

// ---------------------------------------------------------------------------
// MOVE handler
// ---------------------------------------------------------------------------

describe("MOVE handler", () => {
  test("lands in toBag and tombstones in fromBag (transfer pair)", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const cid = newChangeId();
    await seedTiddler(composite, BAG_LOW, "T", "low-text", cid);

    const handler = table.get("MOVE")!;
    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": cid };
    await handler(args, makeContext(composite, "MOVE", args));

    // toBag holds; fromBag is RETRACTED (hard-removed → ABSENT, not a kāpae hide):
    // a MOVE relocates, it never shadows. resolveAll sees only the live dest, and
    // the source kāpae-set is empty (residency-model anti-pattern #3 — absent, not kāpae).
    const all = await composite.resolveAll("T");
    expect(all.map((e) => e.bagId)).toEqual([BAG_HIGH]);
    expect(await composite.listKapaeBags("T")).toEqual([]);

    // Two effect records — one accession in BAG_HIGH + one deaccession in BAG_LOW.
    const effects = await effectRecordsIn(composite);
    expect(effects.length).toBe(2);
  });

  test("requires admin on both source AND destination bag", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    await seedTiddler(composite, BAG_LOW, "T", "x", "c-1");

    const handler = table.get("MOVE")!;
    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": "c-1" };
    // Deny source bag access.
    const ctx: VerbContext = {
      ...makeContext(composite, "MOVE", args),
      cap: denyCap(BAG_LOW),
    };
    await expect(handler(args, ctx)).rejects.toThrow(/cap-denied.*low/);
  });
});

// ---------------------------------------------------------------------------
// COPY handler
// ---------------------------------------------------------------------------

describe("COPY handler", () => {
  // ── THE SOURCE IS A CAPABILITY TOO ────────────────────────────────────────────────────────────
  // Every verb cap-checks its DESTINATION, and MOVE additionally checks its source because it mutates
  // there. COPY and ADD only READ the source — and reading it still reaches across a bag boundary the
  // caller may hold nothing on.
  //
  // The bag access declines to help: "read and write share the store: the doc carries no read-only
  // flag — the cap-gate is the authority". The routing layer picks its bag as
  // `bagUrl ?? toBag ?? dest ?? bag ?? targetBag`, so it names the destination too. With the source
  // unchecked at both layers, a caller holding admin on a destination names any source and the handler
  // reads it with its own reach — the caller supplies the path, the deputy performs the read.
  //
  // `read` suffices and `admin` would over-tighten: COPY takes a copy and leaves the source as it
  // stands, so a bag one may read is a bag one may copy from.

  test("★ COPY refuses when the caller holds nothing on the SOURCE ★", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    await seedTiddler(composite, BAG_LOW, "T", "x", "c-1");

    const handler = table.get("COPY")!;
    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": "c-1" };
    const ctx: VerbContext = {
      ...makeContext(composite, "COPY", args),
      cap: denyCap(BAG_LOW),
    };
    await expect(handler(args, ctx)).rejects.toThrow(/cap-denied.*low/);
  });

  test("★ ADD refuses when the caller holds nothing on the SOURCE ★", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    await seedTiddler(composite, BAG_LOW, "T", "x", "c-1");

    const handler = table.get("ADD")!;
    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": "c-1" };
    const ctx: VerbContext = {
      ...makeContext(composite, "ADD", args),
      cap: denyCap(BAG_LOW),
    };
    await expect(handler(args, ctx)).rejects.toThrow(/cap-denied.*low/);
  });

  test("overwrites destination preserving change-id", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    await seedTiddler(composite, BAG_LOW,  "T", "low-text",  "c-source");
    await seedTiddler(composite, BAG_HIGH, "T", "high-text", "c-old");

    const handler = table.get("COPY")!;
    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": "c-source" };
    const result = await handler(args, makeContext(composite, "COPY", args));
    expect(result["mode"]).toBe("overwrite");

    const dest = (await composite.resolveAll("T")).find((e) => e.bagId === BAG_HIGH)!;
    expect((dest.record.tiddler as Record<string, unknown>)["text"]).toBe("low-text");
    expect(dest.record.meta?.changeId).toBe("c-source");
  });
});

// ---------------------------------------------------------------------------
// CLEAR + DROP handlers
// ---------------------------------------------------------------------------

describe("CLEAR handler", () => {
  test("tombstones every live title in bag + writes bag-level disposition record", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    await seedTiddler(composite, BAG_MID, "A", "a");
    await seedTiddler(composite, BAG_MID, "B", "b");
    await seedTiddler(composite, BAG_MID, "C", "c");

    const handler = table.get("CLEAR")!;
    const args = { bag: BAG_MID };
    const result = await handler(args, makeContext(composite, "CLEAR", args));

    expect(result["clearedCount"]).toBe(3);
    expect(await composite.listKapaeBags("A")).toContain(BAG_MID);
    expect(await composite.listKapaeBags("B")).toContain(BAG_MID);
    expect(await composite.listKapaeBags("C")).toContain(BAG_MID);

    // One bag-level disposition effect-record (per Sprint 4 mapping).
    const effects = await effectRecordsIn(composite);
    expect(effects.length).toBe(1);
  });
});

describe("DROP handler", () => {
  test("tombstones every live title + writes bag-retired disposition", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    await seedTiddler(composite, BAG_MID, "A", "a");
    await seedTiddler(composite, BAG_MID, "B", "b");

    const handler = table.get("DROP")!;
    const args = { bag: BAG_MID };
    const result = await handler(args, makeContext(composite, "DROP", args));

    expect(result["retiredCount"]).toBe(2);
    expect(result["note"]).toContain("recipe-edit");
  });
});

// ---------------------------------------------------------------------------
// LOAD handler — carrier-borne ingest (operator gesture supplies content)
// ---------------------------------------------------------------------------

describe("LOAD handler", () => {
  test("refuses loudly when no carriers ride the verb (islands never fetch)", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const handler = table.get("LOAD")!;
    const args = { "source-uri": "https://example.org/seed.json", "to-bag": BAG_HIGH, "change-id": "c" };
    await expect(handler(args, makeContext(composite, "LOAD", args))).rejects.toThrow(/no carriers/);
  });

  test("lands a titled carrier into toBag under the action's changeId", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const handler = table.get("LOAD")!;
    const args = {
      "source-uri": "bags/lares/api/example.md",
      "to-bag": BAG_HIGH,
      "change-id": "c-load-1",
      carriers: [{ title: "lar:///ha.ka.ba/lares/example", text: "Aloha — carrier body.\n" }],
    };
    const summary = await handler(args, makeContext(composite, "LOAD", args)) as { count: number; titles: string[] };
    expect(summary.count).toBeGreaterThanOrEqual(1);
    const all = await composite.resolveAll("lar:///ha.ka.ba/lares/example");
    const landed = all.find((e) => e.bagId === BAG_HIGH);
    expect(landed).toBeTruthy();
    expect(landed?.record.meta?.changeId).toBe("c-load-1");
  });
});

// ---------------------------------------------------------------------------
// Cap-verify gates
// ---------------------------------------------------------------------------

describe("cap-verify gates", () => {
  test("ADD rejects when destination cap denied", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    await seedTiddler(composite, BAG_LOW, "T", "x", "c");
    const handler = table.get("ADD")!;
    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": "c" };
    const ctx: VerbContext = {
      ...makeContext(composite, "ADD", args),
      cap: denyCap(BAG_HIGH),
    };
    await expect(handler(args, ctx)).rejects.toThrow(/cap-denied.*high/);
  });

  test("CLEAR rejects when bag cap denied", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const handler = table.get("CLEAR")!;
    const args = { bag: BAG_MID };
    const ctx: VerbContext = {
      ...makeContext(composite, "CLEAR", args),
      cap: denyCap(BAG_MID),
    };
    await expect(handler(args, ctx)).rejects.toThrow(/cap-denied.*mid/);
  });
});

// ---------------------------------------------------------------------------
// Malformed args
// ---------------------------------------------------------------------------

describe("malformed args", () => {
  test("ADD without title rejects", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const handler = table.get("ADD")!;
    const args = { "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": "c" };
    await expect(handler(args, makeContext(composite, "ADD", args))).rejects.toThrow(/malformed/);
  });

  test("CLEAR without bag rejects", async () => {
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const handler = table.get("CLEAR")!;
    await expect(handler({}, makeContext(composite, "CLEAR", {}))).rejects.toThrow(/malformed/);
  });
});

// ---------------------------------------------------------------------------
// S5.7 — Integration: verb-tiddler → runLocalVerb → handler
//
// The unit blocks above hand-build VerbContext and call the reactor directly.
// This block exercises the real dispatch shore the daemon VM (open-daemon-vm.ts)
// and browser worker use: registry lookup by `invocation.action` + the
// CapabilityVerifier→cap() adaptation (makeCapVerify) + handler run. A full CLI
// binary spawn + TW5 boot roundtrip stays covered by the live `lares act`
// command + `verb-tiddler-dispatch.test.ts` full-boot harness; this closes the
// dispatch-wiring gap the unit blocks skip.
// ---------------------------------------------------------------------------

describe("S5.7 — verb-tiddler → runLocalVerb → handler integration", () => {
  // A real CapabilityVerifier (not a hand-stubbed cap): proves makeCapVerify
  // adapts verifier.verify({presenter,bagUrl,access}) into the handler's cap().
  function verifier(denyBag?: string): CapabilityVerifier {
    return {
      verify: async ({ bagUrl }): Promise<CapabilityVerifyResult> =>
        bagUrl === denyBag ? { ok: false, reason: "verifier-denied" } : { ok: true },
    };
  }

  function invocation(verb: ActionVerb, args: Record<string, unknown>): Verb {
    return {
      requestId:   "s57-req",
      title:       "lar:///lararium.local.vm/verbs/s57-req",
      action:      verb,
      args,
      targets:     [],
      batchMode:   "best-effort",
      status:      "pending",
      requestedBy: "did:web:operator-test",
      requestedAt: "2026-06-01T00:00:00Z",
    };
  }

  test("ADD dispatches through registry + verifier → mutation + effect record", async () => {
    const composite = makeComposite();
    const registry  = new VerbTable();
    registerActionReactors(registry, { composite });
    const cid = newChangeId();
    await seedTiddler(composite, BAG_LOW, "T", "low-text", cid);

    const args   = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": cid };
    const result = await runLocalVerb(invocation("ADD", args), { daemon: composite, registry, verifier: verifier() });

    expect(result["verb"]).toBe("ADD");
    const all = await composite.resolveAll("T");
    expect(all.map((e) => e.bagId).sort()).toEqual([BAG_HIGH, BAG_LOW].sort());
    expect((await effectRecordsIn(composite)).length).toBe(1);
  });

  test("MOVE dispatches → transfer pair (accession + deaccession) through the shore", async () => {
    const composite = makeComposite();
    const registry  = new VerbTable();
    registerActionReactors(registry, { composite });
    const cid = newChangeId();
    await seedTiddler(composite, BAG_LOW, "T", "low-text", cid);

    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": cid };
    await runLocalVerb(invocation("MOVE", args), { daemon: composite, registry, verifier: verifier() });

    expect((await composite.resolveAll("T")).map((e) => e.bagId)).toEqual([BAG_HIGH]);
    expect(await composite.listKapaeBags("T")).toEqual([]); // MOVE retracts source to absent, not kāpae
    expect((await effectRecordsIn(composite)).length).toBe(2);
  });

  test("verifier denial gates the dispatched verb (verifier.verify drives cap)", async () => {
    const composite = makeComposite();
    const registry  = new VerbTable();
    registerActionReactors(registry, { composite });
    await seedTiddler(composite, BAG_LOW, "T", "x", "c");

    const args = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": "c" };
    await expect(
      runLocalVerb(invocation("ADD", args), { daemon: composite, registry, verifier: verifier(BAG_HIGH) }),
    ).rejects.toThrow(/cap-denied.*high/);
    expect((await effectRecordsIn(composite)).length).toBe(0); // gated before mutate-then-log
  });

  test("no verifier → makeCapVerify defaults to allow (open alpha path)", async () => {
    const composite = makeComposite();
    const registry  = new VerbTable();
    registerActionReactors(registry, { composite });
    const cid = newChangeId();
    await seedTiddler(composite, BAG_LOW, "T", "x", cid);

    const args   = { title: "T", "from-bag": BAG_LOW, "to-bag": BAG_HIGH, "change-id": cid };
    const result = await runLocalVerb(invocation("ADD", args), { daemon: composite, registry });
    expect(result["verb"]).toBe("ADD");
  });

  test("unregistered verb → runLocalVerb throws (registry lookup gate)", async () => {
    const composite = makeComposite();
    const registry  = new VerbTable(); // empty — no reactors registered
    await expect(
      runLocalVerb(invocation("ADD", { title: "T" }), { daemon: composite, registry }),
    ).rejects.toThrow(/no handler registered/);
  });
});
