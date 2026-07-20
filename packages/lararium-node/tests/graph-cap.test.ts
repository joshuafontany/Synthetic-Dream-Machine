/**
 * graph-cap — the consumed structure/graph driven LIVE (TS → graph_io.py → palace_graph + hallways)
 * over a content palace whose drawers carry wing/entities (as the meta-model consume stamps): the
 * entity co-occurrence surfaces a hallway through the lares cap. No LLM. One holder per palace.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeContentPalace, type ContentPalace } from "../src/sensorium.js";
import { makeGraphCap, _liveGraphHolderCount, type GraphCap } from "../src/graph-cap.js";

const TEST_TIMEOUT = 60_000;

beforeAll(() => { process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm"; });

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((c) => c())); });

describe("makeGraphCap (consumed structure/graph, live)", () => {
  test("entity co-occurrence surfaces a hallway; stats serialize", async () => {
    const dir = await mkdtemp(join(tmpdir(), "graph-"));
    const content: ContentPalace = makeContentPalace(dir);
    closers.push(content.close);
    // two drawers in one wing sharing the alice;bob pair → a hallway
    await content.put("d1", "alice and bob built the node", [0.1, 0.2], { wing: "w1", entities: "alice;bob", room: "r1" });
    await content.put("d2", "alice thanked bob again", [0.3, 0.4], { wing: "w1", entities: "alice;bob", room: "r1" });

    const graph: GraphCap = makeGraphCap(dir);
    closers.push(graph.close);
    const halls = await graph.hallways("w1", 2);
    expect(Array.isArray(halls)).toBe(true);
    expect(halls.length).toBeGreaterThanOrEqual(1);   // the alice-bob co-occurrence
    expect(typeof (await graph.stats())).toBe("object");
  }, TEST_TIMEOUT);

  test("one graph holder per palace, never a pile", async () => {
    const dir = await mkdtemp(join(tmpdir(), "graph-"));
    const a = makeGraphCap(dir); const b = makeGraphCap(dir);
    closers.push(a.close, b.close);
    expect(_liveGraphHolderCount()).toBe(1);
  }, TEST_TIMEOUT);
});
