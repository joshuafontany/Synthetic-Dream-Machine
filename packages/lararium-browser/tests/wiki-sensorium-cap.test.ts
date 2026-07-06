/**
 * wiki-sensorium-cap (browser tier) — the cap-fold witness, browser substrate.
 *
 * Runs the IDENTICAL hull as tw5/tests/wiki-sensorium-cap.test.ts — the SAME
 * `runWikiSensoriumWitness()` from `@lararium/tw5`, here inside a real Chromium harness. The core
 * assertions match the node tier line-for-line: cohere flips glue↔obstruct through both mesh organs,
 * form-recall finds the shingle-sharing neighbor, the TextEmbedder seam carries a real semantic tier
 * (the deterministic letter-frequency fixture — no model, no COOP/COEP commitment), and couple
 * refuses honestly. node ≡ browser on this verdict extends the island-isomorphism to the wiki-sensorium cap —
 * one hull, two substrates, differ by grant not hull.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-sensorium-cap
 */

import { describe, test, expect } from "vitest";
import { runWikiSensoriumWitness } from "@lararium/tw5";

describe("hasWikiSensorium — browser tier", () => {
  test("cohere folds the keystone planes through BOTH organs — the radius flips, the gate classifies", async () => {
    const w = await runWikiSensoriumWitness();
    expect(w.glue.consistency.glues).toBe(true);
    expect(w.glue.consistency.vacuous).toBe(false);
    expect(w.glue.gate.kind).toBe("reconcilable");
    expect(w.obstruct.consistency.radius).toBeGreaterThan(0);
    expect(w.obstruct.consistency.obstructionLocus).toContain("ornate-novel");
    expect(w.obstruct.consistency.pairs.some((p) => !p.vacuous && p.locus.includes("ornate-novel"))).toBe(true);
  });

  test("form recall finds the shingle-sharing tiddler, ranked by Jaccard overlap", async () => {
    const w = await runWikiSensoriumWitness();
    expect(w.formRecall.form.length).toBeGreaterThan(0);
    expect(w.formRecall.form[0]!.title).toBe("canon-b");
  });

  test("the semantic seam carries a real tier when filled — and reads null when empty", async () => {
    const w = await runWikiSensoriumWitness();
    expect(w.bareRecall.semantic).toBeNull();
    expect(w.semanticRecall.semantic).not.toBeNull();
    expect(w.semanticRecall.semantic![0]!.title).toBe("plain");
    expect(w.semanticRecall.semantic![0]!.score).toBeCloseTo(1, 6);
  });

  test("couple refuses honestly — the typed unbuilt answer names the mesh-of-wikis fork", async () => {
    const w = await runWikiSensoriumWitness();
    expect(w.coupling).toEqual({ status: "unbuilt", awaits: "S5:mesh-of-wikis" });
  });
});
