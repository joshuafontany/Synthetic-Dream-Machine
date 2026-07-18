/**
 * pack-member-gate — a PACK reconciles PER MEMBER through the ONE Confluence gate
 * (the operator's #40 Fork A ruling): the pack-skip is gone. Each member runs the
 * single-carrier triangle (echo · canonical-equivalent · conflict) at member grain,
 * its content-hash the leg (aside in `$:/config/OriginalTiddlerHashes`, sibling to
 * the path map). A concurrent wiki-edit + disk-change on ONE member names WHICH
 * member conflicts; the OTHER members flow. A `.multids` SHARED-field change reshapes
 * every member's carrier form → flags all (broad, but right).
 */

import { describe, test, expect, beforeAll } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CompositeStore, ORIGINAL_TIDDLER_HASHES, parseHashes } from "@lararium/mesh";
import type {
  VerbContext, Verb, CapabilityAccess, CapabilityVerifyResult, LarTiddlerRecord, ChangeOrigin,
} from "@lararium/mesh";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { VerbTable } from "../../lararium-tw5/src/verb-dispatcher.js";
import { registerActionReactors, makeTw5Deserializer } from "../../lararium-tw5/src/action-handler.js";
import { TW5Engine } from "../../lararium-tw5/src/tw5-vm.js";
import LARES_MEMETIC_WIKITEXT_PLUGIN from "../../lararium-tw5/plugins/lares-memetic-wikitext.json" with { type: "json" };
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../../lararium-tw5/src/generated-tw5-version.js";

const CORE = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
const corePresent = existsSync(CORE);
const URI = "lar:///ha.ka.ba/lares/api/native/bundle";
const BAG = "lar:///ha.ka.ba/bags/@lares";
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const allowCap = async (_a: CapabilityAccess, _b: string): Promise<CapabilityVerifyResult> => ({ ok: true });
function ctx(composite: CompositeStore, args: Record<string, unknown>): VerbContext {
  const invocation: Verb = {
    requestId: "req-member-1", title: "lar:///lararium.local.vm/verbs/req-member-1",
    action: "INGEST", args, targets: [], batchMode: "best-effort",
    status: "pending", requestedBy: "operator-test", requestedAt: "2026-07-18T00:00:00Z",
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
    "source-uri": "file:///staged/bundle.json", "to-bag": BAG, "change-id": "chg-member",
    carriers: [{ uri: URI, text, diskHash: sha(text), syncedHash: null, ext: ".json" }],
  };
}
function multidsArgs(uri: string, text: string): Record<string, unknown> {
  return {
    "source-uri": "file:///staged/langs.multids", "to-bag": BAG, "change-id": "chg-md",
    carriers: [{ uri, text, diskHash: sha(text), syncedHash: null, ext: ".multids" }],
  };
}
async function runIngest(composite: CompositeStore, engine: TW5Engine, a: Record<string, unknown>) {
  const table = new VerbTable();
  registerActionReactors(table, { composite, tw5: makeTw5Deserializer(engine) });
  const result = await table.get("INGEST")!(a, ctx(composite, a)) as Record<string, unknown>;
  return (result["carriers"] as Array<Record<string, unknown>>)[0]!;
}
/** The per-member breakdown, keyed by title → decision. */
function memberDecisions(carrier: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of (carrier["members"] as Array<Record<string, unknown>>) ?? []) {
    out[String(m["title"])] = String(m["decision"]);
  }
  return out;
}
async function textOf(composite: CompositeStore, title: string): Promise<string | undefined> {
  const rec = (await composite.resolveAll(title)).find((e) => e.bagId === BAG && !e.record.meta?.["tombstone"])?.record;
  return typeof rec?.tiddler["text"] === "string" ? (rec.tiddler["text"] as string) : undefined;
}
async function hashes(composite: CompositeStore) {
  const rec = (await composite.resolveAll(ORIGINAL_TIDDLER_HASHES)).find((e) => e.bagId === BAG)?.record;
  return parseHashes(typeof rec?.tiddler["text"] === "string" ? (rec.tiddler["text"] as string) : undefined);
}
/** Simulate a WIKI-SIDE edit: land a fresh version of a member straight into the
 *  bag's store (the records side moves, out of band from the pack file on disk). */
async function wikiEdit(composite: CompositeStore, title: string, text: string): Promise<void> {
  const store = composite.writableStoreForBag(BAG)!;
  const origin: ChangeOrigin = { kind: "tw-local", instanceId: "wiki-test" };
  const record: LarTiddlerRecord = { tiddler: { title, text, bag: BAG } as LarTiddlerRecord["tiddler"], meta: {} };
  await store.put(record, origin);
}

describe.skipIf(!corePresent)("pack member-gate — each member reconciles through the ONE Confluence gate", () => {
  let engine: TW5Engine;
  beforeAll(async () => {
    engine = new TW5Engine();
    await engine.boot(new Uint8Array(readFileSync(CORE)), [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
  }, 60_000);

  test("one member with BOTH a wiki-edit and a disk-change conflicts; the others land clean", async () => {
    const composite = makeComposite();
    // land the pack — every member ingests, its content-hash recorded aside
    await runIngest(composite, engine, jsonArgs([
      { title: "Alpha", text: "a" }, { title: "Beta", text: "b" }, { title: "Gamma", text: "g" },
    ]));
    const h1 = await hashes(composite);
    expect(Object.keys(h1).sort()).toEqual(["Alpha", "Beta", "Gamma"]);   // per-member content-hash rides aside

    // a WIKI-SIDE edit moves ONLY Beta's record (the records leg)
    await wikiEdit(composite, "Beta", "b-wiki");
    expect(await textOf(composite, "Beta")).toBe("b-wiki");

    // re-ingest with ALL THREE changed on DISK (the disk leg)
    const carrier = await runIngest(composite, engine, jsonArgs([
      { title: "Alpha", text: "a2" }, { title: "Beta", text: "b-disk" }, { title: "Gamma", text: "g2" },
    ]));

    // Beta moved on BOTH sides → conflict; Alpha/Gamma moved on disk only → clean ingest
    const dec = memberDecisions(carrier);
    expect(dec).toEqual({ Alpha: "ingest", Beta: "conflict", Gamma: "ingest" });

    // the top-level decision flips to conflict → the whole-file synced hash stays stale
    // (recordLandedPacks only advances on `ingest`), so the conflict re-runs next scan
    expect(carrier["decision"]).toBe("conflict");
    expect(carrier["pack"]).toBe("ha.ka.ba/lares/api/native/bundle.json");
    expect(carrier["landed"]).toBe(2);

    // unconflicted members flowed…
    expect(await textOf(composite, "Alpha")).toBe("a2");
    expect(await textOf(composite, "Gamma")).toBe("g2");
    // …and the conflicted member was SURFACED, never overwritten (the wiki edit survives)
    expect(await textOf(composite, "Beta")).toBe("b-wiki");

    // the aside hash map advanced ONLY the landed members; Beta HELD its old base
    const h2 = await hashes(composite);
    expect(h2["Alpha"]).not.toBe(h1["Alpha"]);
    expect(h2["Gamma"]).not.toBe(h1["Gamma"]);
    expect(h2["Beta"]).toBe(h1["Beta"]);   // conflict → base unmoved (no silent last-write-wins)
  });

  test("an unchanged pack re-ingest noops every member (per-member echo gate)", async () => {
    const composite = makeComposite();
    await runIngest(composite, engine, jsonArgs([{ title: "Alpha", text: "a" }, { title: "Beta", text: "b" }]));
    // re-ingest the SAME members (whole-file syncedHash null forces the island past the
    // whole-file echo, so the PER-MEMBER echo is what noops each one)
    const carrier = await runIngest(composite, engine, jsonArgs([{ title: "Alpha", text: "a" }, { title: "Beta", text: "b" }]));
    expect(memberDecisions(carrier)).toEqual({ Alpha: "noop", Beta: "noop" });
    expect(carrier["decision"]).toBe("ingest");   // no conflict → whole-file base may advance
    expect(carrier["landed"]).toBe(0);
  });

  test("a .multids SHARED-field change flags every member (a shared field touches all)", async () => {
    const composite = makeComposite();
    const MD_URI = "lar:///ha.ka.ba/lares/api/native/langs";
    await runIngest(composite, engine, multidsArgs(MD_URI,
      "tags: i18n\ntype: text/vnd.tiddlywiki\n\nHello: hello world\nGoodbye: goodbye world"));
    const h1 = await hashes(composite);
    expect(Object.keys(h1).sort()).toEqual(["Goodbye", "Hello"]);

    // change ONLY the shared field block (the member texts stay put)
    const carrier = await runIngest(composite, engine, multidsArgs(MD_URI,
      "tags: i18n-v2\ntype: text/vnd.tiddlywiki\n\nHello: hello world\nGoodbye: goodbye world"));

    // a shared field reshapes EVERY member's carrier form → every member re-ingests
    expect(memberDecisions(carrier)).toEqual({ Hello: "ingest", Goodbye: "ingest" });
    expect(carrier["decision"]).toBe("ingest");
    expect(carrier["landed"]).toBe(2);
    // and each member's content-hash actually moved
    const h2 = await hashes(composite);
    expect(h2["Hello"]).not.toBe(h1["Hello"]);
    expect(h2["Goodbye"]).not.toBe(h1["Goodbye"]);
  });
});
