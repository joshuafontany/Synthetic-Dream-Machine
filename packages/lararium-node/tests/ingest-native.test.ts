/**
 * ingest-native — the §6 gate for a NATIVE filetype carrier (.md/.tid/.json).
 *
 * A native carrier runs the SAME triangle a memetic one does, via the registry's
 * own render (the file-info body): echo-noop · canonical-equivalent · ingest ·
 * conflict. The conflict leg is the load-bearing one — without it a native carrier
 * read last-write-wins over a wiki-side edit (a silent §6 overwrite).
 */

import { describe, test, expect, beforeAll } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CompositeStore } from "@lararium/mesh";
import type { ChangeOrigin, LarTiddlerRecord, VerbContext, Verb, CapabilityAccess, CapabilityVerifyResult } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { VerbTable } from "../../lararium-tw5/src/verb-dispatcher.js";
import { registerActionReactors, makeTw5Deserializer } from "../../lararium-tw5/src/action-handler.js";
import { TW5Engine } from "../../lararium-tw5/src/tw5-vm.js";
import LARES_MEMETIC_WIKITEXT_PLUGIN from "../../lararium-tw5/plugins/lares-memetic-wikitext.json" with { type: "json" };
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../../lararium-tw5/src/generated-tw5-version.js";

const CORE = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
const corePresent = existsSync(CORE);
const URI = "lar:///ha.ka.ba/lares/api/native/note";
const BAG = "lar:///ha.ka.ba/bags/@lares";
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const allowCap = async (_a: CapabilityAccess, _b: string): Promise<CapabilityVerifyResult> => ({ ok: true });
function ctx(composite: CompositeStore, args: Record<string, unknown>): VerbContext {
  const invocation: Verb = {
    requestId: "req-nat-1", title: "lar:///lararium.local.vm/verbs/req-nat-1",
    action: "INGEST", args, targets: [], batchMode: "best-effort",
    status: "pending", requestedBy: "operator-test", requestedAt: "2026-07-16T00:00:00Z",
  };
  return { daemon: composite, invocation, cap: allowCap };
}

async function seedNative(composite: CompositeStore, text: string): Promise<void> {
  const origin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: BAG };
  const record: LarTiddlerRecord = {
    tiddler: { title: URI, type: "text/markdown", text } as LarTiddlerRecord["tiddler"],
    meta: { changeId: "seed-1" },
  };
  await composite.put(record, origin, { bag: BAG });
}
function makeComposite(): CompositeStore {
  const c = new CompositeStore();
  c.addLayer({ bagId: BAG, store: new MemoryTiddlerStore(), writable: true });
  return c;
}
function args(text: string, syncedHash: string | null): Record<string, unknown> {
  return {
    "source-uri": "file:///staged/note.md", "to-bag": BAG, "change-id": "chg-nat-1",
    carriers: [{ uri: URI, text, diskHash: sha(text), syncedHash, ext: ".md" }],
  };
}
async function runIngest(composite: CompositeStore, engine: TW5Engine, a: Record<string, unknown>) {
  const table = new VerbTable();
  registerActionReactors(table, { composite, tw5: makeTw5Deserializer(engine) });
  const result = await table.get("INGEST")!(a, ctx(composite, a)) as Record<string, unknown>;
  return (result["carriers"] as Array<Record<string, unknown>>)[0]!;
}

describe.skipIf(!corePresent)("INGEST — the native filetype §6 triangle", () => {
  let engine: TW5Engine;
  beforeAll(async () => {
    engine = new TW5Engine();
    await engine.boot(new Uint8Array(readFileSync(CORE)), [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
  }, 60_000);

  test("conflict: disk AND records both moved → surfaced, nothing overwritten", async () => {
    const composite = makeComposite();
    await seedNative(composite, "the records-side body\n");     // a wiki-side edit already landed
    // disk carries a DIFFERENT body, and syncedHash names a THIRD (older) state
    const carrier = await runIngest(composite, engine, args("the disk-side body\n", sha("an older projection")));
    expect(carrier["decision"]).toBe("conflict");
    // nothing overwritten — the records-side body survives
    const rec = (await composite.resolveAll(URI)).find((e) => e.bagId === BAG)!.record;
    expect(String(rec.tiddler["text"])).toContain("records-side");
  });

  test("canonical-equivalent: disk renders to what the records already hold → noop", async () => {
    const composite = makeComposite();
    await seedNative(composite, "identical body\n");
    const carrier = await runIngest(composite, engine, args("identical body\n", sha("an older projection")));
    expect(carrier["decision"]).toBe("noop");
    expect(carrier["reason"]).toBe("canonical-equivalent");
  });

  test("clean ingest: records unmoved since the merge base, disk moved → lands", async () => {
    const composite = makeComposite();
    await seedNative(composite, "base body\n");
    // syncedHash == the CURRENT record's render → records unmoved; disk differs → ingest
    const syncedHash = sha("base body\n");   // makeTw5FileInfo body of a .md is its text verbatim
    const carrier = await runIngest(composite, engine, args("edited body\n", syncedHash));
    expect(carrier["decision"]).toBe("ingest");
    const rec = (await composite.resolveAll(URI)).find((e) => e.bagId === BAG)!.record;
    expect(String(rec.tiddler["text"])).toContain("edited body");
  });

  test("echo: disk == last-projected → noop, zero deserialize", async () => {
    const composite = makeComposite();
    await seedNative(composite, "whatever\n");
    const disk = "on-disk bytes\n";
    const carrier = await runIngest(composite, engine, args(disk, sha(disk)));
    expect(carrier["decision"]).toBe("noop");
    expect(carrier["reason"]).toBe("disk-matches-synced");
  });
});
