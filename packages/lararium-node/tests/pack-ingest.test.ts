/**
 * pack-ingest — a multi-tiddler bundle (a `.json` array) ingests its members and
 * records pack membership ASIDE in `$:/config/OriginalTiddlerPaths`.
 *
 * The members land by their OWN TW5 titles (byte-clean, no injected fields); the
 * aside map remembers which pack file they came from, so REPACK can re-collect it.
 * A re-ingest that DROPS a member tombstones it (the group loop never sees a pack's
 * foreign-titled members — the map is their only prior record).
 */

import { describe, test, expect, beforeAll } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CompositeStore, ORIGINAL_TIDDLER_PATHS, parseProvenance, membersOfPack } from "@lararium/mesh";
import type { VerbContext, Verb, CapabilityAccess, CapabilityVerifyResult } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { VerbTable } from "../../lararium-tw5/src/verb-dispatcher.js";
import { registerActionReactors, makeTw5Deserializer } from "../../lararium-tw5/src/action-handler.js";
import { TW5Engine } from "../../lararium-tw5/src/tw5-vm.js";
import LARES_MEMETIC_WIKITEXT_PLUGIN from "../../lararium-tw5/plugins/lares-memetic-wikitext.json" with { type: "json" };
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../../lararium-tw5/src/generated-tw5-version.js";

const CORE = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
const corePresent = existsSync(CORE);
const URI  = "lar:///ha.ka.ba/lares/api/native/bundle";
const BAG  = "lar:///ha.ka.ba/bags/@lares";
const PACK = "ha.ka.ba/lares/api/native/bundle.json";      // the disk mirror-relative pack path
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const allowCap = async (_a: CapabilityAccess, _b: string): Promise<CapabilityVerifyResult> => ({ ok: true });
function ctx(composite: CompositeStore, args: Record<string, unknown>): VerbContext {
  const invocation: Verb = {
    requestId: "req-pack-1", title: "lar:///lararium.local.vm/verbs/req-pack-1",
    action: "INGEST", args, targets: [], batchMode: "best-effort",
    status: "pending", requestedBy: "operator-test", requestedAt: "2026-07-17T00:00:00Z",
  };
  return { daemon: composite, invocation, cap: allowCap };
}
function makeComposite(): CompositeStore {
  const c = new CompositeStore();
  c.addLayer({ bagId: BAG, store: new MemoryTiddlerStore(), writable: true });
  return c;
}
function jsonArgs(members: Array<Record<string, string>>): Record<string, unknown> {
  const text = JSON.stringify(members);
  return {
    "source-uri": "file:///staged/bundle.json", "to-bag": BAG, "change-id": "chg-pack-1",
    carriers: [{ uri: URI, text, diskHash: sha(text), syncedHash: null, ext: ".json" }],
  };
}
async function runIngest(composite: CompositeStore, engine: TW5Engine, a: Record<string, unknown>) {
  const table = new VerbTable();
  registerActionReactors(table, { composite, tw5: makeTw5Deserializer(engine) });
  const result = await table.get("INGEST")!(a, ctx(composite, a)) as Record<string, unknown>;
  return (result["carriers"] as Array<Record<string, unknown>>)[0]!;
}
async function provenance(composite: CompositeStore) {
  const rec = (await composite.resolveAll(ORIGINAL_TIDDLER_PATHS)).find((e) => e.bagId === BAG)?.record;
  return parseProvenance(typeof rec?.tiddler["text"] === "string" ? (rec.tiddler["text"] as string) : undefined);
}
async function liveTitle(composite: CompositeStore, title: string) {
  return (await composite.resolveAll(title)).some((e) => e.bagId === BAG && !e.record.meta?.["tombstone"]);
}

describe.skipIf(!corePresent)("pack ingest — a .json bundle lands members + records provenance aside", () => {
  let engine: TW5Engine;
  beforeAll(async () => {
    engine = new TW5Engine();
    await engine.boot(new Uint8Array(readFileSync(CORE)), [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
  }, 60_000);

  test("a 3-tiddler bundle lands all three + maps each to the pack file", async () => {
    const composite = makeComposite();
    const carrier = await runIngest(composite, engine, jsonArgs([
      { title: "Alpha", text: "a" }, { title: "Beta", text: "b" }, { title: "Gamma", text: "g" },
    ]));
    expect(carrier["decision"]).toBe("ingest");
    expect(carrier["pack"]).toBe(PACK);
    // members land by their OWN titles
    expect(await liveTitle(composite, "Alpha")).toBe(true);
    expect(await liveTitle(composite, "Gamma")).toBe(true);
    // provenance records the whole membership ASIDE — the tiddlers stay clean
    const prov = await provenance(composite);
    expect(membersOfPack(prov, PACK)).toEqual(["Alpha", "Beta", "Gamma"]);
    const alpha = (await composite.resolveAll("Alpha")).find((e) => e.bagId === BAG)!.record;
    expect(alpha.tiddler["file-path"]).toBeUndefined();       // no injected provenance on the tiddler
  });

  test("a re-ingest that DROPS a member tombstones it + updates the aside map", async () => {
    const composite = makeComposite();
    await runIngest(composite, engine, jsonArgs([{ title: "Alpha", text: "a" }, { title: "Beta", text: "b" }]));
    expect(await liveTitle(composite, "Beta")).toBe(true);
    // re-ingest with Beta removed from the file
    const carrier = await runIngest(composite, engine, jsonArgs([{ title: "Alpha", text: "a2" }]));
    expect(carrier["decision"]).toBe("ingest");
    expect(await liveTitle(composite, "Beta")).toBe(false);   // dropped member tombstoned
    expect(await liveTitle(composite, "Alpha")).toBe(true);
    expect(membersOfPack(await provenance(composite), PACK)).toEqual(["Alpha"]);
  });

  test("REPACK collects the members via provenance + re-renders the bundle (round-trip)", async () => {
    const composite = makeComposite();
    await runIngest(composite, engine, jsonArgs([
      { title: "Alpha", text: "a", tags: "keep" }, { title: "Beta", text: "b" },
    ]));
    // REPACK — the query verb: collect by provenance, serialize via TW5's own field serializer
    const table = new VerbTable();
    registerActionReactors(table, { composite, tw5: makeTw5Deserializer(engine) });
    const args = { bag: BAG, "pack-path": PACK };
    const result = await table.get("REPACK")!(args, ctx(composite, args)) as Record<string, unknown>;
    expect(result["count"]).toBe(2);
    expect(result["missing"]).toBeUndefined();
    // the re-rendered bundle deserializes BACK to the same members (byte-clean round-trip)
    const reparsed = JSON.parse(String(result["text"])) as Array<Record<string, string>>;
    const byTitle = new Map(reparsed.map((t) => [t["title"], t] as const));
    expect([...byTitle.keys()].sort()).toEqual(["Alpha", "Beta"]);
    expect(byTitle.get("Alpha")!["text"]).toBe("a");
    expect(byTitle.get("Alpha")!["tags"]).toContain("keep");
    expect(byTitle.get("Alpha")!["bag"]).toBeUndefined();     // the runtime bag stamp stays OFF the bundle
  });
});
