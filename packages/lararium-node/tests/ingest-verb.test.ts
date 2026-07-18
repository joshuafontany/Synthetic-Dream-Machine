/**
 * ingest-verb.test.ts — the INGEST verb (island side): the Confluence gate composed
 * with replace-by-group apply, riding the summons/outcome record-pair physics.
 *
 * Driven by the live boot meme (real carrier, real membrane). The verb:
 *   - computes currentRenderHash from the merge seat (the island's only hash)
 *   - runs decideIngest (echo-noop · refuse · canonical-equivalent · ingest · conflict)
 *   - on ingest: lands fresh records, tombstones vanished group members
 *     (replace-by-group — LOAD never removes; INGEST must)
 *   - on conflict/refuse/noop: applies NOTHING; the decision rides the outcome.
 *
 * Meme: lar:///ha.ka.ba/lares/docs/lares/handoff (NEXT VECTOR, build 1)
 */

import { describe, test, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CompositeStore } from "@lararium/mesh";
import type { ChangeOrigin, LarTiddlerRecord, VerbContext, Verb, CapabilityAccess, CapabilityVerifyResult } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { VerbTable } from "../../lararium-tw5/src/verb-dispatcher.js";
import { registerActionReactors } from "../../lararium-tw5/src/action-handler.js";
import { memeticWikitextDeserializer, expandMemeRefs } from "../../lararium-tw5/src/deserializer.js";

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const BOOT = join(REPO_ROOT, "bags/@lares/ha.ka.ba/lares/api/lares/noosphere-boot.mem");
const URI  = "lar:///ha.ka.ba/lares/api/lares/noosphere-boot";
const BAG  = "lar:///ha.ka.ba/bags/@lares";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const source = readFileSync(BOOT, "utf8");

function renderOf(text: string, uri: string): string {
  const records = memeticWikitextDeserializer(text, { title: uri });
  const map = new Map(records.map((r) => [String(r.title), r] as const));
  return expandMemeRefs((t) => map.get(t), uri) ?? "";
}
const canonical = renderOf(source, URI);

// The entry H1 heading, read FROM the live meme — so a heading rename (Boot→Hearth→…)
// never re-stales this fixture. The edit tests below mutate THIS heading to prove INGEST
// lands a changed heading; hardcoding the literal is what drifted them red.
const ENTRY_H1 = source.match(/^! Entry\b.*$/m)?.[0];
if (!ENTRY_H1) throw new Error("ingest-verb test: entry H1 heading not found in boot meme");

function makeComposite(): CompositeStore {
  const c = new CompositeStore();
  c.addLayer({ bagId: BAG, store: new MemoryTiddlerStore(), writable: true });
  return c;
}

const allowCap = async (_a: CapabilityAccess, _b: string): Promise<CapabilityVerifyResult> => ({ ok: true });

function ctx(composite: CompositeStore, args: Record<string, unknown>): VerbContext {
  const invocation: Verb = {
    requestId: "req-ingest-1",
    title: "lar:///lararium.local.vm/verbs/req-ingest-1",
    action: "INGEST", args, targets: [], batchMode: "best-effort",
    status: "pending", requestedBy: "operator-test", requestedAt: "2026-06-12T00:00:00Z",
  };
  return { daemon: composite, invocation, cap: allowCap };
}

/** Seed the bag with the boot meme's decomposed records (the fed state). */
async function seedBoot(composite: CompositeStore): Promise<string[]> {
  const records = memeticWikitextDeserializer(source, { title: URI });
  const origin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: BAG };
  const titles: string[] = [];
  for (const fields of records) {
    const title = String(fields["title"]);
    const record: LarTiddlerRecord = { tiddler: fields as LarTiddlerRecord["tiddler"], meta: { changeId: "seed-1" } };
    await composite.put(record, origin, { bag: BAG });
    titles.push(title);
  }
  return titles;
}

function ingestArgs(text: string, syncedHash: string | null): Record<string, unknown> {
  return {
    "source-uri": "file:///staged/boot.md",
    "to-bag": BAG,
    "change-id": "chg-ingest-1",
    carriers: [{ uri: URI, text, diskHash: sha(text), syncedHash }],
  };
}

async function liveGroup(composite: CompositeStore): Promise<string[]> {
  const all = await composite.listVisible();
  return all.filter((t) => t === URI || t.startsWith(`${URI}#`) || t.startsWith(`${URI}/`)).sort();
}

describe("INGEST — the gate composed with replace-by-group", () => {
  test("clean edit with a vanished child: fresh records land, the vanished child tombstones", async () => {
    const composite = makeComposite();
    const seeded = await seedBoot(composite);
    expect(seeded.length).toBeGreaterThan(10);

    // Edit: change a heading AND remove the #classifier-channel ahu block whole.
    const blockStart = source.indexOf("<<~ ahu #classifier-channel >>");
    const blockEnd   = source.indexOf("<<~/ahu >>", blockStart) + "<<~/ahu >>".length;
    expect(blockStart).toBeGreaterThan(0);
    const edited = (source.slice(0, blockStart) + source.slice(blockEnd))
      .replace(ENTRY_H1, `${ENTRY_H1} (ingested)`)
      .replace(/\n{3,}/g, "\n\n");
    expect(edited).toContain("(ingested)"); // guard: heading drift must fail loud, not collapse to noop

    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const handler = table.get("INGEST")!;
    const args = ingestArgs(edited, sha(canonical));
    const result = await handler(args, ctx(composite, args)) as Record<string, unknown>;

    const carriers = result["carriers"] as Array<Record<string, unknown>>;
    expect(carriers[0]!["decision"]).toBe("ingest");
    expect(carriers[0]!["tombstoned"]).toContain(`${URI}#classifier-channel`);

    const after = await liveGroup(composite);
    expect(after).not.toContain(`${URI}#classifier-channel`);
    // The heading lives in the #entry child (FFZ grain); the fresh changeId
    // rides every landed record.
    const entry = (await composite.resolveAll(`${URI}#entry`)).find((e) => e.bagId === BAG)!.record;
    expect(String(entry.tiddler["text"] ?? "")).toContain("(ingested)");
    expect(entry.meta?.["changeId"]).toBe("chg-ingest-1");
  });

  test("echo: disk == synced → noop, zero writes", async () => {
    const composite = makeComposite();
    await seedBoot(composite);
    const before = await liveGroup(composite);

    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const args = ingestArgs(source, sha(source));
    const result = await table.get("INGEST")!(args, ctx(composite, args)) as Record<string, unknown>;

    const carriers = result["carriers"] as Array<Record<string, unknown>>;
    expect(carriers[0]!["decision"]).toBe("noop");
    expect(carriers[0]!["reason"]).toBe("disk-matches-synced");
    expect(await liveGroup(composite)).toEqual(before);
  });

  test("conflict: disk and records both moved → surfaced, nothing applied", async () => {
    const composite = makeComposite();
    await seedBoot(composite);
    const before = await liveGroup(composite);

    const edited = source.replace(ENTRY_H1, "# Entry - DISK EDIT");
    expect(edited).not.toBe(source);
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    // syncedHash names a THIRD state: disk moved AND the merge seat moved.
    const args = ingestArgs(edited, sha("some-older-projection"));
    const result = await table.get("INGEST")!(args, ctx(composite, args)) as Record<string, unknown>;

    const carriers = result["carriers"] as Array<Record<string, unknown>>;
    expect(carriers[0]!["decision"]).toBe("conflict");
    expect(await liveGroup(composite)).toEqual(before);
  });

  test("refuse: a carrier the membrane cannot round-trip applies nothing and carries warnings", async () => {
    const composite = makeComposite();
    await seedBoot(composite);
    const before = await liveGroup(composite);

    // The known refusal class: an unclosed fence that swallows the closer
    // (the membrane's degraded-carrier surfacing, found live 2026-06-11).
    const broken = source.replace("<<~ &#x0003; >>", "```js\nunclosed fence\n<<~ &#x0003; >>");
    const table = new VerbTable();
    registerActionReactors(table, { composite });
    const args = ingestArgs(broken, sha(canonical));
    const result = await table.get("INGEST")!(args, ctx(composite, args)) as Record<string, unknown>;

    const carriers = result["carriers"] as Array<Record<string, unknown>>;
    expect(carriers[0]!["decision"]).toBe("refuse");
    expect(await liveGroup(composite)).toEqual(before);
  });
});
