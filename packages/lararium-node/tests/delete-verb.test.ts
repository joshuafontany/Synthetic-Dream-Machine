/**
 * delete-verb.test.ts — the INGEST verb's whole-carrier deletion wave
 * (watcher build 4, moʻolelo 2026-06-14). Synthetic carriers (no live-boot
 * fixture — the fixture-drift lesson holds): seed N small carriers, then send a
 * wave carrying `deletions` and assert the gate's split applies correctly.
 *
 * Under proof:
 *   - a vanished carrier under the fraction → tombstone (group removed)
 *   - tombstones over the fraction → suspend (apply NOTHING)
 *   - a unique hash-matched add → rename re-link, change-id PRESERVED
 */

import { describe, test, expect } from "vitest";
import { CompositeStore } from "@lararium/mesh";
import type { ChangeOrigin, LarTiddlerRecord, VerbContext, Verb, CapabilityAccess, CapabilityVerifyResult } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { VerbTable } from "../../lararium-tw5/src/verb-dispatcher.js";
import { registerActionReactors } from "../../lararium-tw5/src/action-handler.js";

const BAG = "lar:///ha.ka.ba/bags/@lares";

function makeComposite(): CompositeStore {
  const c = new CompositeStore();
  c.addLayer({ bagId: BAG, store: new MemoryTiddlerStore(), writable: true });
  return c;
}

const allowCap = async (_a: CapabilityAccess, _b: string): Promise<CapabilityVerifyResult> => ({ ok: true });

function ctx(composite: CompositeStore, args: Record<string, unknown>): VerbContext {
  const invocation: Verb = {
    requestId: "req-del-1",
    title: "lar:///lararium.local.vm/verbs/req-del-1",
    action: "INGEST", args, targets: [], batchMode: "best-effort",
    status: "pending", requestedBy: "operator-test", requestedAt: "2026-06-14T00:00:00Z",
  };
  return { daemon: composite, invocation, cap: allowCap };
}

/** Seed `n` single-record synthetic carriers lar:///c0..c{n-1}, each its own changeId. */
async function seedCarriers(composite: CompositeStore, n: number): Promise<void> {
  const origin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: BAG };
  for (let i = 0; i < n; i++) {
    const uri = `lar:///c${i}`;
    const record: LarTiddlerRecord = { tiddler: { title: uri, text: `body ${i}` } as LarTiddlerRecord["tiddler"], meta: { changeId: `cid-${i}` } };
    await composite.put(record, origin, { bag: BAG });
  }
}

async function seedOne(composite: CompositeStore, uri: string, changeId: string): Promise<void> {
  const origin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: BAG };
  const record: LarTiddlerRecord = { tiddler: { title: uri, text: "renameable body" } as LarTiddlerRecord["tiddler"], meta: { changeId } };
  await composite.put(record, origin, { bag: BAG });
}

function waveArgs(opts: {
  deletions?: Array<{ uri: string; syncedHash: string }>;
  carriers?: Array<{ uri: string; text: string; diskHash: string; syncedHash: string | null }>;
  fraction?: number;
}): Record<string, unknown> {
  return {
    "source-uri": "file:///staged",
    "to-bag": BAG,
    "change-id": "chg-wave",
    carriers: opts.carriers ?? [],
    ...(opts.deletions ? { deletions: opts.deletions } : {}),
    ...(opts.fraction !== undefined ? { massDeleteFraction: opts.fraction } : {}),
  };
}

async function liveTitles(composite: CompositeStore): Promise<string[]> {
  return (await composite.listVisible()).sort();
}

/** Carrier titles only — drops the withEffectRecord residency-ledger entries. */
const carriersOnly = (titles: readonly string[]): string[] => titles.filter((t) => /^lar:\/\/\/[a-z-]+\d*$/.test(t));

describe("INGEST — whole-carrier deletion wave", () => {
  test("a vanished carrier under the fraction → tombstone (group removed)", async () => {
    const composite = makeComposite();
    await seedCarriers(composite, 10);
    const table = new VerbTable();
    registerActionReactors(table, { composite });

    const args = waveArgs({ deletions: [{ uri: "lar:///c0", syncedHash: "h0" }], fraction: 0.5 });
    const result = await table.get("INGEST")!(args, ctx(composite, args)) as Record<string, unknown>;

    expect((result["deletions"] as Record<string, unknown>)["decision"]).toBe("apply");
    const after = await liveTitles(composite);
    expect(after).not.toContain("lar:///c0");
    expect(after).toContain("lar:///c1");
    expect(carriersOnly(after).length).toBe(9); // 10 seeded − c0 tombstoned (ledger entries excluded)
  });

  test("tombstones over the fraction → suspend, apply nothing", async () => {
    const composite = makeComposite();
    await seedCarriers(composite, 10);
    const before = await liveTitles(composite);
    const table = new VerbTable();
    registerActionReactors(table, { composite });

    const deletions = [0, 1, 2, 3, 4, 5].map((i) => ({ uri: `lar:///c${i}`, syncedHash: `h${i}` }));
    const args = waveArgs({ deletions, fraction: 0.5 }); // threshold 5; 6 > 5 → suspend
    const result = await table.get("INGEST")!(args, ctx(composite, args)) as Record<string, unknown>;

    expect((result["deletions"] as Record<string, unknown>)["decision"]).toBe("suspend");
    expect(carriersOnly(await liveTitles(composite))).toEqual(carriersOnly(before)); // no carrier removed (a suspend still audits to the ledger)
  });

  test("unique hash-matched add → rename re-link, change-id PRESERVED", async () => {
    const composite = makeComposite();
    await seedCarriers(composite, 10);
    await seedOne(composite, "lar:///old-name", "cid-keepme");
    const table = new VerbTable();
    registerActionReactors(table, { composite });

    const args = waveArgs({
      deletions: [{ uri: "lar:///old-name", syncedHash: "HMATCH" }],
      carriers: [{ uri: "lar:///new-name", text: "renamed content", diskHash: "HMATCH", syncedHash: null }],
      fraction: 0.5,
    });
    const result = await table.get("INGEST")!(args, ctx(composite, args)) as Record<string, unknown>;

    const after = await liveTitles(composite);
    expect(after).not.toContain("lar:///old-name");
    expect(after).toContain("lar:///new-name");

    // The re-link preserved the original change-id — NOT the wave's "chg-wave".
    const moved = (await composite.resolveAll("lar:///new-name")).find((e) => e.bagId === BAG)!.record;
    expect(moved.meta?.["changeId"]).toBe("cid-keepme");
  });
});
