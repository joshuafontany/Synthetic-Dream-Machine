/**
 * wiki-sensorium-cap (node tier) — the cap-fold witness, node substrate.
 *
 * The SAME hull runs here and in the browser tier (browser/tests/wiki-sensorium-cap.test.ts):
 * `runWikiSensoriumWitness()` stands the consistency keystone's fixture islands and drives every perceiver verb —
 * cohere (glue + seeded obstruction, both organs), form-recall (shingle-Jaccard neighbors), the
 * semantic shore (the deterministic letter-frequency embedder — no model), and couple's honest
 * unbuilt refusal. This tier ALSO witnesses the node-reachable shores: the content/structure recall
 * tiers, the volatile memo's change-invalidation, and the island-cap signal surface.
 *
 * Meme: lar:///ha.ka.ba/lares/api/wiki-sensorium-cap
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test, expect } from "vitest";
import type { ChangeOrigin } from "@lararium/mesh";
import {
  runWikiSensoriumWitness,
  createWikiSensorium,
  hasWikiSensorium,
  letterFrequencyEmbedder,
  SENSORIUM_SIGNAL,
} from "../src/wiki-sensorium-cap.js";
import { buildFixtureIsland, GLUE_SEEDS } from "../src/wiki-store-adapter.js";
import type { IslandContext } from "../src/island-context.js";

const contractFixture = JSON.parse(readFileSync(
  fileURLToPath(new URL("../../lararium-mesh/tests/fixtures/sensorium-contract-parity.json", import.meta.url)), "utf8"),
) as { wiki: { has: readonly string[] } };

describe("hasWikiSensorium — node tier", () => {
  test("contributes its own cap fragment without naming the vessel's full stack", async () => {
    const island = await buildFixtureIsland("lar:///ha.ka.ba/bags/@sensorium-contract", GLUE_SEEDS);
    const sense = createWikiSensorium(island);
    expect(sense.contract).toEqual(contractFixture.wiki);
    sense.dispose();
  });

  test("cohere folds the keystone planes through BOTH organs — the radius flips, the gate classifies", async () => {
    const w = await runWikiSensoriumWitness();
    // GLUE: structure and form agree on every unit → a global section stands, non-vacuously.
    expect(w.glue.consistency.glues).toBe(true);
    expect(w.glue.consistency.vacuous).toBe(false);
    expect(w.glue.consistency.radius).toBe(0);
    expect(w.glue.gate.kind).toBe("reconcilable");
    expect(w.glue.corpusSize).toBe(3);
    // OBSTRUCT: ornate-novel diverges the planes → a positive radius, localized per-pair.
    expect(w.obstruct.consistency.radius).toBeGreaterThan(0);
    expect(w.obstruct.consistency.glues).toBe(false);
    expect(w.obstruct.consistency.obstructionLocus).toContain("ornate-novel");
    const binding = w.obstruct.consistency.pairs.filter((p) => !p.vacuous);
    expect(binding.length).toBeGreaterThan(0);
    expect(binding.some((p) => p.locus.includes("ornate-novel"))).toBe(true);
  });

  test("form recall finds the shingle-sharing tiddler, ranked by Jaccard overlap", async () => {
    const w = await runWikiSensoriumWitness();
    // canon-a and canon-b share the recurring phrase → canon-b ranks top among canon-a's neighbors.
    expect(w.formRecall.form.length).toBeGreaterThan(0);
    expect(w.formRecall.form[0]!.title).toBe("canon-b");
    const canonB = w.formRecall.form.find((h) => h.title === "canon-b")!;
    const plain = w.formRecall.form.find((h) => h.title === "plain");
    if (plain) expect(canonB.score).toBeGreaterThan(plain.score);
  });

  test("the semantic shore carries a real tier when filled — and reads null when empty", async () => {
    const w = await runWikiSensoriumWitness();
    // no embedder → the tier stays honest-absent, never a degraded fallback.
    expect(w.bareRecall.semantic).toBeNull();
    // the deterministic embedder + query = plain's own body → plain lands cosine-top (sim 1).
    expect(w.semanticRecall.semantic).not.toBeNull();
    expect(w.semanticRecall.semantic![0]!.title).toBe("plain");
    expect(w.semanticRecall.semantic![0]!.score).toBeCloseTo(1, 6);
  });

  test("couple refuses honestly — the typed unbuilt answer names the mesh-of-wikis fork", async () => {
    const w = await runWikiSensoriumWitness();
    expect(w.coupling).toEqual({ status: "unbuilt", awaits: "S5:mesh-of-wikis" });
  });

  test("content and structure tiers read the resolved corpus (title probe · sigil-head probe)", async () => {
    const island = await buildFixtureIsland("lar:///ha.ka.ba/bags/@sensorium-tiers", GLUE_SEEDS);
    const sense = createWikiSensorium(island);
    try {
      const byTitle = await sense.recall({ text: "canon" });
      expect(byTitle.content.map((h) => h.title).sort()).toEqual(["canon-a", "canon-b"]);
      // canon-a and canon-b both carry a `confidence` sigil; plain carries none.
      const byHead = await sense.recall({ sigilHead: "confidence" });
      expect(byHead.structure.map((h) => h.title).sort()).toEqual(["canon-a", "canon-b"]);
      const byWard = await sense.recall({ sigilHead: "ward" });
      expect(byWard.structure.map((h) => h.title).sort()).toEqual(["canon-a", "canon-b"]);
    } finally {
      sense.dispose();
    }
  });

  test("the volatile memo dies when the log moves — a write invalidates, the next read re-folds", async () => {
    const island = await buildFixtureIsland("lar:///ha.ka.ba/bags/@sensorium-memo", GLUE_SEEDS);
    const sense = createWikiSensorium(island);
    const origin: ChangeOrigin = { kind: "canon-hydrate", receipt: "memo-test" };
    try {
      const before = await sense.cohere();
      expect(before.corpusSize).toBe(3);
      await island.put({ tiddler: { title: "late-comer", text: "arrives after the memo filled" } }, origin);
      const after = await sense.cohere();
      expect(after.corpusSize).toBe(4);
      const found = await sense.recall({ text: "late-comer" });
      expect(found.content.map((h) => h.title)).toContain("late-comer");
    } finally {
      sense.dispose();
    }
  });

  test("the island cap claims the three verb signals and posts SENSORIUM_FRAME answers", async () => {
    const island = await buildFixtureIsland("lar:///ha.ka.ba/bags/@sensorium-cap", GLUE_SEEDS);
    const posted: Array<Record<string, unknown>> = [];
    // a minimal island context — only the shores this cap touches (composite · post · wikiUri).
    const ctx = {
      composite: island,
      wikiUri: "lar:///ha.ka.ba/bags/@sensorium-cap",
      post: (msg: unknown) => { posted.push(msg as Record<string, unknown>); },
    } as unknown as IslandContext;

    const cap = hasWikiSensorium();
    const teardown = await cap.onEa!(ctx);
    try {
      expect(cap.onSignal!(SENSORIUM_SIGNAL.couple, { requestId: "r1" }, ctx)).toBe(true);
      expect(cap.onSignal!(SENSORIUM_SIGNAL.cohere, { requestId: "r2" }, ctx)).toBe(true);
      expect(cap.onSignal!(SENSORIUM_SIGNAL.recall, { args: { requestId: "r3", likeTitle: "canon-a" } }, ctx)).toBe(true);
      expect(cap.onSignal!("unrelated:signal", {}, ctx)).toBe(false);
      // the async verbs resolve on the microtask queue — drain it before reading the frames.
      await new Promise((r) => setTimeout(r, 0));

      expect(posted).toHaveLength(3);
      for (const frame of posted) expect(frame["listenable"]).toBe("sensorium:frame");
      const byVerb = new Map(posted.map((f) => [
        (f["payload"] as Record<string, unknown>)["verb"],
        JSON.parse((f["payload"] as Record<string, unknown>)["result"] as string) as Record<string, unknown>,
      ]));
      expect(byVerb.get("couple")).toEqual({ status: "unbuilt", awaits: "S5:mesh-of-wikis" });
      expect((byVerb.get("cohere") as { consistency: { glues: boolean } }).consistency.glues).toBe(true);
      const recall = byVerb.get("recall") as { form: Array<{ title: string }> };
      expect(recall.form[0]!.title).toBe("canon-b");
    } finally {
      if (typeof teardown === "function") await teardown();
    }
  });
});
