/**
 * wiki-sensorium-consistency (node tier) — S0 KEYSTONE witness, node substrate.
 *
 * The SAME hull runs here and in the browser tier (browser/tests/wiki-sensorium-consistency.test.ts):
 * `runWikiConsistencyWitness()` builds two wiki-causal-island fixtures (GLUE ⊥ OBSTRUCT), senses each
 * through the pure {@link WikiStoreAdapter} — composite-store `entries()` → structure⊥form projection →
 * the lifted `@lararium/mesh` Robinson radius — and returns both readings. This test asserts the
 * cross-tier verdict; the browser test asserts the IDENTICAL verdict on a Chromium substrate. One hull,
 * two substrates, differ by grant not hull — the island-isomorphism made a witness.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-store-adapter
 */

import { describe, test, expect } from "vitest";
import {
  runWikiConsistencyWitness,
  WikiStoreAdapter,
  buildFixtureIsland,
  GLUE_SEEDS,
} from "@lararium/tw5";

describe("S0 wiki-sensorium consistency — node tier", () => {
  test("the engineered stalk reads NON-VACUOUS (a genuine cross-plane overlap, not a false glue)", async () => {
    const { glue, obstruct } = await runWikiConsistencyWitness();
    // the vacuous-overlap trap: a naively-wired keystone goes green proving nothing. Both fixtures
    // MUST bind a real structure⊥form overlap over the title universe.
    expect(glue.vacuous).toBe(false);
    expect(obstruct.vacuous).toBe(false);
  });

  test("the radius FLIPS 0 ↔ >0 between the GLUE and OBSTRUCT corpora", async () => {
    const { glue, obstruct } = await runWikiConsistencyWitness();
    // GLUE: structure and form agree on every unit → a global section stands.
    expect(glue.radius).toBe(0);
    expect(glue.glues).toBe(true);
    // OBSTRUCT: the ornate-yet-novel tiddler diverges the planes → a localized obstruction.
    expect(obstruct.radius).toBeGreaterThan(0);
    expect(obstruct.glues).toBe(false);
  });

  test("the obstruction localizes to the offending tiddler", async () => {
    const { obstruct } = await runWikiConsistencyWitness();
    expect(obstruct.obstructionLocus).toContain("ornate-novel");
  });

  test("entries() folds the island's OWN resolved surface, causal-stamped", async () => {
    const island = await buildFixtureIsland("lar:///ha.ka.ba/@witness-node", GLUE_SEEDS);
    const snap = await new WikiStoreAdapter(island).snapshot();
    expect(snap.readings.map((r) => r.title).sort()).toEqual(["canon-a", "canon-b", "plain"]);
    // memory-backed fixture carries no CRDT heads — the stamp reads honestly null, never fabricated.
    for (const r of snap.readings) expect(r.heads).toBeNull();
  });
});
