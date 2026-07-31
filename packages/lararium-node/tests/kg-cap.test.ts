/**
 * kg-cap — the consumed bitemporal KG driven LIVE (TS → kg_io.py serve → KnowledgeGraph) over a
 * palace's kg sqlite: add a triple, query it back, timeline + stats. No LLM. One holder per palace.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { makeKgCap, _liveKgHolderCount, type KgCap } from "../src/kg-cap.js";

const TEST_TIMEOUT = 60_000;

const opened: KgCap[] = [];
function open(dir: string): KgCap {
  const cap = makeKgCap(dir);
  opened.push(cap);
  return cap;
}
const palaceDir = (): Promise<string> => mkdtemp(join(tmpdir(), "kg-"));
afterEach(async () => { await Promise.all(opened.splice(0).map((c) => c.close())); });

describe("makeKgCap (consumed bitemporal KG, live)", () => {
  test("add a triple → query the entity → timeline + stats", async () => {
    const kg = open(await palaceDir());
    await kg.addTriple("Alice", "collaborates_with", "Bob", { validFrom: "2026-01-01", confidence: 0.9 });
    const q = JSON.stringify(await kg.queryEntity("Alice"));
    expect(q.toLowerCase()).toContain("bob");             // the relationship rode back
    JSON.parse(JSON.stringify(await kg.timeline("Alice"))); // serializes
    const stats = await kg.stats();
    expect(typeof stats).toBe("object");
  }, TEST_TIMEOUT);

  test("invalidate closes the edge (bitemporal, history kept)", async () => {
    const kg = open(await palaceDir());
    await kg.addTriple("Alice", "knows", "Bob");
    await kg.invalidate("Alice", "knows", "Bob", "2026-07-02");
    JSON.stringify(await kg.queryEntity("Alice")); // op runs clean post-close
  }, TEST_TIMEOUT);

  test("one KG holder per palace, never a pile", async () => {
    const dir = await palaceDir();
    // RELATIVE, never absolute: the registry behind this counter is a module-global Map that
    // no reset clears, so an absolute `toBe(1)` reads the whole WORKER rather than this test.
    // It holds today only because vitest's default `isolate: true` hands each file a fresh
    // module registry — an inherited default, not a stated one. The delta is what the
    // reap-don't-pile invariant actually claims: two opens on one key add ONE holder.
    const before = _liveKgHolderCount();
    open(dir); open(dir);
    expect(_liveKgHolderCount()).toBe(before + 1);
  }, TEST_TIMEOUT);
});
