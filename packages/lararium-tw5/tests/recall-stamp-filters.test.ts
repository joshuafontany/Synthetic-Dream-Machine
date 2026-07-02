/**
 * recall stamp-filters — the daemon recall verb learns the stamps the palace
 * already stores (voice · band · agent · surface · drift), composed with the
 * semantic query (overfetch + post-filter, honest counts) and the list (exact
 * lar_* metadata). Driven through the REAL recallVerbCap over a fake
 * RecallClient — the whole verb body runs, only the sidecar is stubbed.
 */
import { describe, test, expect } from "vitest";
import {
  composeVerbPlane,
  mempalaceProviderCap,
  formPalaceProviderCap,
  recallVerbCap,
  type MempalaceProvider,
  type FormPalaceProvider,
  type RecallClient,
} from "../src/verb-caps.js";
import { VerbTable } from "../src/verb-dispatcher.js";

const CANON_TURN = [
  "<<~ lares aim lar:///operator.intent.lands/x -> lar:///council.options.cuts/y >>",
  "<<~ hud Aperture(10) OODA-HA(3) >>",
  "<<~ ward * L-Prime >>",
  "Council (Lares): the fork holds.",
  "<<~ ward ! · ↻ L-Prime >>",
  "<<~ hud Aperture(10 -> 11) OODA-HA(1↺) >>",
  "<<~ lares yield lar:///council.fork.named/z -> ? >>",
].join("\n");

/** Fake sidecar hits: two codex, one claude (the claude one carries the Voice frame). */
const HITS = [
  { text: "plain codex turn", source_path: "/stage/codex__run-cdx-1.jsonl", similarity: 0.9 },
  { text: CANON_TURN, source_path: "/stage/claude__run-cl-1.jsonl", similarity: 0.8 },
  { text: "another codex turn", source_path: "/stage/codex__run-cdx-2.jsonl", similarity: 0.7 },
];

const DRAWERS = [
  { drawer_id: "d1", metadata: { source_file: "codex__run-cdx-1.jsonl", lar_surface: "codex", lar_band: "raw" } },
  { drawer_id: "d2", metadata: { source_file: "claude__run-cl-1.jsonl", lar_surface: "claude", lar_band: "canon", lar_voices: "Council (Lares)" } },
  { drawer_id: "d3", metadata: { source_file: "codex__run-cdx-2.jsonl", lar_surface: "codex", lar_band: "synthesis", lar_drift: "arity:2" } },
];

function fakeClient(): RecallClient & { lastSearchLimit?: number } {
  const c: RecallClient & { lastSearchLimit?: number } = {
    async getDrawer(id) { return { drawer_id: id, content: "x" }; },
    async search(args) {
      c.lastSearchLimit = typeof args["limit"] === "number" ? (args["limit"] as number) : undefined;
      return { query: args["query"], results: HITS };
    },
    async listDrawers() { return { drawers: DRAWERS, count: DRAWERS.length, total: DRAWERS.length, offset: 0, limit: 200 }; },
  };
  return c;
}

async function makeRecall(client: RecallClient) {
  const mp: MempalaceProvider = {
    withClient: (fn) => fn(client),
    turnsForHandleStubs: async () => [],
  };
  const form: FormPalaceProvider = {
    getForm: async () => null,
    multiRecall: async () => ({ results: [] }),
  };
  const registry = new VerbTable();
  const contribution = await composeVerbPlane([
    mempalaceProviderCap(mp),
    formPalaceProviderCap(form),
    recallVerbCap(),
  ]);
  contribution(registry);
  const handler = registry.get("recall");
  if (!handler) throw new Error("recall verb not registered");
  return (args: Record<string, unknown>) => handler(args, {} as never);
}

describe("recall verb — stamp filters over the search", () => {
  test("--surface codex returns only codex hits, with honest counts + overfetch", async () => {
    const client = fakeClient();
    const recall = await makeRecall(client);
    const out = await recall({ query: "anything", surface: "codex", limit: 5 });
    const results = out["results"] as Array<Record<string, unknown>>;
    expect(results).toHaveLength(2);
    expect(results.every((h) => String(h["source_path"]).includes("codex__"))).toBe(true);
    expect(out["scanned"]).toBe(3);
    expect(out["matched"]).toBe(2);
    expect(client.lastSearchLimit).toBe(25); // ×5 floor — the overfetch actually reached the sidecar
  });

  test("--voice filters by the gradient re-read; a no-match returns an HONEST empty", async () => {
    const recall = await makeRecall(fakeClient());
    const hit = await recall({ query: "q", voice: "Council" });
    expect((hit["results"] as unknown[]).length).toBe(1);
    const empty = await recall({ query: "q", voice: "Hierophant" });
    expect((empty["results"] as unknown[]).length).toBe(0);
    expect(empty["scanned"]).toBe(3); // empty WITH counts, never a silent drop
    expect(empty["matched"]).toBe(0);
  });

  test("an invalid --band fails loud", async () => {
    const recall = await makeRecall(fakeClient());
    await expect(recall({ query: "q", band: "mythic" })).rejects.toThrow(/--band must be one of/);
  });

  test("filters + --multi refuse loud (the fuse has no filter law yet)", async () => {
    const recall = await makeRecall(fakeClient());
    await expect(recall({ query: "q", multi: true, surface: "codex" })).rejects.toThrow(/do not yet compose/);
  });
});

describe("recall verb — stamp filters over the list (exact lar_* metadata)", () => {
  test("--surface codex lists only codex drawers", async () => {
    const recall = await makeRecall(fakeClient());
    const out = await recall({ surface: "codex" });
    const drawers = out["drawers"] as Array<Record<string, unknown>>;
    expect(drawers.map((d) => d["drawer_id"])).toEqual(["d1", "d3"]);
    expect(out["scanned"]).toBe(3);
    expect(out["matched"]).toBe(2);
  });

  test("--drift keeps only drift-stamped drawers; --band composes", async () => {
    const recall = await makeRecall(fakeClient());
    const drifted = await recall({ drift: true });
    expect((drifted["drawers"] as Array<Record<string, unknown>>).map((d) => d["drawer_id"])).toEqual(["d3"]);
    const both = await recall({ drift: true, band: "canon" });
    expect((both["drawers"] as unknown[]).length).toBe(0); // composed clauses — honest empty
    expect(both["matched"]).toBe(0);
  });

  test("unfiltered behavior stays byte-compatible (no filters → the plain list path)", async () => {
    const recall = await makeRecall(fakeClient());
    const out = await recall({});
    expect(out["mode"]).toBe("list");
    expect((out["drawers"] as unknown[]).length).toBe(3);
    expect(out["filters"]).toBeUndefined();
  });
});
