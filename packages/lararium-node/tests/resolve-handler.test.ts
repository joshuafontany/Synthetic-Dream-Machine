/**
 * resolve-handler — Residency Model coordinate-inspection tests.
 *
 * Sprint:  Residency Model Epic — S8.2 (full surface)
 * Meme:    lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
 */

import { describe, test, expect } from "vitest";
import { CompositeStore } from "@lararium/mesh";
import type { ChangeOrigin, LarTiddlerRecord, VerbInvocation, VerbContext, CapabilityAccess, CapabilityVerifyResult } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { makeResolveReactor } from "../src/resolve-handler.js";

const BAG_LOW  = "lar:///ha.ka.ba/@low";
const BAG_MID  = "lar:///ha.ka.ba/@mid";
const BAG_HIGH = "lar:///ha.ka.ba/@high";

function makeComposite(): CompositeStore {
  const c = new CompositeStore();
  c.addLayer({ bagId: BAG_LOW,  store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });
  c.addLayer({ bagId: BAG_MID,  store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });
  c.addLayer({ bagId: BAG_HIGH, store: new MemoryTiddlerStore(), writable: true });
  return c;
}

function emptyContext(composite: CompositeStore): VerbContext {
  const invocation: VerbInvocation = {
    requestId: "r", title: "lar:///x/r", verb: "resolve", args: {}, targets: [],
    batchMode: "best-effort", status: "pending", requestedBy: "test", requestedAt: "2026-05-31T00:00:00Z",
  };
  return {
    admin: composite,
    invocation,
    cap: async (_a: CapabilityAccess, _b: string): Promise<CapabilityVerifyResult> => ({ ok: true }),
  };
}

function rec(title: string, text: string, changeId?: string): LarTiddlerRecord {
  return changeId !== undefined
    ? { tiddler: { title, text }, meta: { changeId } }
    : { tiddler: { title, text } };
}
function origin(bag: string): ChangeOrigin { return { kind: "crdt-remote", edgeIsland: bag }; }

describe("resolve verb", () => {
  test("rejects when tiddler arg missing", async () => {
    const composite = makeComposite();
    const handler = makeResolveReactor({ composite });
    await expect(handler({}, emptyContext(composite))).rejects.toThrow(/tiddler is required/);
  });

  test("returns empty manifestations + tombstones when title unknown", async () => {
    const composite = makeComposite();
    const handler = makeResolveReactor({ composite });
    const result = await handler({ tiddler: "T-missing" }, emptyContext(composite));
    expect(result["tiddler"]).toBe("T-missing");
    expect(result["manifestations"]).toEqual([]);
    expect(result["tombstones"]).toEqual([]);
    expect(result["winningBag"]).toBeNull();
  });

  test("returns Manifestations across all live bags in priority order", async () => {
    const composite = makeComposite();
    await composite.put(rec("T", "low-text",  "c-low"),  origin(BAG_LOW),  { bag: BAG_LOW });
    await composite.put(rec("T", "mid-text",  "c-mid"),  origin(BAG_MID),  { bag: BAG_MID });
    await composite.put(rec("T", "high-text", "c-high"), origin(BAG_HIGH), { bag: BAG_HIGH });

    const handler = makeResolveReactor({ composite });
    const result = await handler({ tiddler: "T" }, emptyContext(composite));
    const manifs = result["manifestations"] as Array<{ bagId: string; changeId?: string }>;

    expect(manifs.map((m) => m.bagId)).toEqual([BAG_HIGH, BAG_MID, BAG_LOW]);
    expect(result["winningBag"]).toBe(BAG_HIGH);
    expect(manifs[0]!.changeId).toBe("c-high");
    expect(manifs[1]!.changeId).toBe("c-mid");
    expect(manifs[2]!.changeId).toBe("c-low");
  });

  test("surfaces tombstones separately from manifestations (whiteout-shadow)", async () => {
    const composite = makeComposite();
    await composite.put(rec("T", "low-text"),  origin(BAG_LOW),  { bag: BAG_LOW });
    await composite.put(rec("T", "high-text"), origin(BAG_HIGH), { bag: BAG_HIGH });
    await composite.tombstoneInBag(BAG_HIGH, "T", origin(BAG_HIGH));

    const handler = makeResolveReactor({ composite });
    const result = await handler({ tiddler: "T" }, emptyContext(composite));

    // Live: only BAG_LOW (BAG_HIGH tombstoned).
    expect((result["manifestations"] as Array<{ bagId: string }>).map((m) => m.bagId)).toEqual([BAG_LOW]);
    // Whiteout surfaces the hiding bag.
    expect(result["tombstones"]).toEqual([BAG_HIGH]);
    // winningBag still = live-priority head (resolveAll skips tombstones).
    expect(result["winningBag"]).toBe(BAG_LOW);
  });

  test("manifestations omit changeId when none present (legacy / non-residency tiddlers)", async () => {
    const composite = makeComposite();
    await composite.put(rec("T", "no-change-id"), origin(BAG_HIGH), { bag: BAG_HIGH });

    const handler = makeResolveReactor({ composite });
    const result = await handler({ tiddler: "T" }, emptyContext(composite));
    const manifs = result["manifestations"] as Array<{ bagId: string; changeId?: string }>;

    expect(manifs).toHaveLength(1);
    expect(manifs[0]!.bagId).toBe(BAG_HIGH);
    expect(manifs[0]!.changeId).toBeUndefined();
  });
});
