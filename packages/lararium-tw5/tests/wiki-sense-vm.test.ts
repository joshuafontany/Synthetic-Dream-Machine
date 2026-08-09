/**
 * wiki-sense-vm.test.ts — the VM-NATIVE wiki-sense witness: a REAL TW5 engine boots the packed
 * plugin, and the sensorium answers FROM INSIDE the VM — the WikiSenseIndexer enumerates via
 * wiki.getIndexer and follows live writes; the `wikisense` filter operator answers recall and
 * cohere from wikitext-land; and THE CROSS-BEAT AGREEMENT: the SAME corpus read through the wiki
 * face (in-VM filter) and through the composite face (the VM-less hull) yields the same verdict —
 * the two beats agree, witnessing the projection integrity (a disagreement here = a real fault).
 *
 * The wiki face's ordinary universe carries one resident the fixtures never seeded: the plugin
 * CONTAINER tiddler (an ordinary lar:/// title bundling the whole plugin JSON). The open-record
 * law counts it as a sensed entity like any other, so the cross-beat seeds the composite face
 * with the SAME doc — both mouths fold the identical corpus.
 *
 * Boots once per suite (the core blob rides tw5-core/, a build artifact) — the suite SKIPS loudly
 * when the blob stays absent (run `pnpm --filter @lararium/tw5 build:tw5-vendor` first).
 *
 * Meme: lar:///ha.ka.ba/lares/api/wiki-sensorium-cap
 */

import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { TW5Engine } from "../src/tw5-vm.js";
import { LARES_MEMETIC_WIKITEXT_PLUGIN } from "../src/plugin-tiddler.generated.js";
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../src/generated-tw5-version.js";
import { buildFixtureIsland, GLUE_SEEDS, type FixtureTiddler } from "../src/wiki-store-adapter.js";
import { createWikiSensorium } from "../src/wiki-sensorium-cap.js";
import { summarizeCoherence, type WikiCoherenceSummary } from "../src/wiki-sense-fold.js";

const CORE_PATH = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
/**
 * The vendored TW5 core is a GITIGNORED BUILD ARTIFACT, so a fresh clone — and CI's `test` job, which runs
 * `pnpm -r test` with no build step — sees it absent. An anonymous `skipIf` there drops this suite at exit 0,
 * indistinguishable from a green run. The skip now NAMES itself and its cure in the reporter line, following
 * `lararium-node/tests/blob-sovereignty.test.ts:35-44`.
 */
const coreBlobSkip = existsSync(CORE_PATH)
  ? false
  : `TW5 core blob absent at ${CORE_PATH} — run: pnpm --filter @lararium/tw5 build:tw5-vendor`;

/** The obstruct seed, stated locally: sigil-rich (structure 1) yet corpus-novel body (form 0). */
const ORNATE_NOVEL: FixtureTiddler = {
  title: "ornate-novel",
  text: "<<~ lares aim >> a singular unrepeated utterance found nowhere else in this corpus zzz <<~ oracle >>",
};

/** Fold the composite face over seeds and hand back the compact summary (the cross-beat's far mouth). */
async function compositeSummary(bagId: string, seeds: readonly FixtureTiddler[]): Promise<WikiCoherenceSummary> {
  const sense = createWikiSensorium(await buildFixtureIsland(bagId, seeds));
  try {
    return summarizeCoherence(await sense.cohere());
  } finally {
    sense.dispose();
  }
}

describe.skipIf(coreBlobSkip)(
  `wiki-sense — the VM-native beat (real TW5 boot)${coreBlobSkip ? ` [SKIPPED: ${coreBlobSkip}]` : ""}`,
() => {
  let engine: TW5Engine;

  beforeAll(async () => {
    engine = new TW5Engine();
    const coreBlob = new Uint8Array(readFileSync(CORE_PATH));
    await engine.boot(coreBlob, [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
    for (const s of GLUE_SEEDS) engine.setTiddler({ title: s.title, text: s.text });
  }, 60_000);

  test("the indexer enumerates — wiki.getIndexer reaches WikiSenseIndexer (never the module-gate trap)", () => {
    const indexer = engine.wiki.getIndexer("WikiSenseIndexer");
    expect(indexer).toBeTruthy();
    expect(typeof (indexer as unknown as { fold: unknown }).fold).toBe("function");
  });

  test("recall answers from wikitext-land — title, structure, and form tiers through the filter", () => {
    const wiki = engine.wiki;
    // whole-by-default: the undesignated title probe senses SHADOW + $:/ titles too (operator law) —
    // "canon" matches the core's canonical-uri family alongside the seeds.
    const whole = wiki.filterTiddlers("[wikisense:recall:title[canon]]");
    expect(whole).toContain("canon-a");
    expect(whole.some((t) => t.startsWith("$:/"))).toBe(true);
    // ordinary designation narrows to the island's own residents: the pet-name probe, exact set.
    expect(wiki.filterTiddlers("[wikisense:recall:title:ordinary[canon]]").sort()).toEqual(["canon-a", "canon-b"]);
    // structure tier: both canon seeds carry `confidence` sigil strata (the plugin container may too).
    const byHead = wiki.filterTiddlers("[wikisense:recall:structure:ordinary[confidence]]");
    expect(byHead).toContain("canon-a");
    expect(byHead).toContain("canon-b");
    // form tier: canon-b shares the recurring phrase — it ranks top among canon-a's neighbors.
    const byForm = wiki.filterTiddlers("[wikisense:recall:form:ordinary[canon-a]]");
    expect(byForm[0]).toBe("canon-b");
    // the merged default: tiers concatenate title → structure → form, deduped.
    const merged = wiki.filterTiddlers("[wikisense:recall:ordinary[canon]]");
    expect(merged).toContain("canon-a");
    expect(merged).toContain("canon-b");
    expect(new Set(merged).size).toBe(merged.length);
    // an unknown verb fails LOUD, never silent-empty.
    expect(wiki.filterTiddlers("[wikisense:nonsense[x]]")[0]).toMatch(/unknown verb/);
  }, 30_000);

  test("the indexer follows a live addTiddler — the update() pulse invalidates, the next lookup sees it", () => {
    const wiki = engine.wiki;
    expect(wiki.filterTiddlers("[wikisense:recall:title[late-comer]]")).toEqual([]);
    wiki.addTiddler({ title: "late-comer", text: "arrives after the fold memoized" });
    expect(wiki.filterTiddlers("[wikisense:recall:title[late-comer]]")).toEqual(["late-comer"]);
    wiki.deleteTiddler("late-comer");
    expect(wiki.filterTiddlers("[wikisense:recall:title[late-comer]]")).toEqual([]);
  });

  test("cohere speaks from wikitext-land — whole-by-default senses shadows + system; ordinary narrows", () => {
    const wiki = engine.wiki;
    const ordinary = JSON.parse(wiki.filterTiddlers("[wikisense:cohere:ordinary[]]")[0]!) as WikiCoherenceSummary;
    // seeds + the plugin container tiddler — the whole ordinary non-system universe of this island.
    expect(ordinary.corpusSize).toBe(GLUE_SEEDS.length + 1);
    expect(ordinary.vacuous).toBe(false);
    const whole = JSON.parse(wiki.filterTiddlers("[wikisense:cohere[]]")[0]!) as WikiCoherenceSummary;
    // the whole universe folds ordinary + shadow/plugin-bundled + $:/ system tiddlers (operator law).
    expect(whole.corpusSize).toBeGreaterThan(1000);
    expect(whole.corpusSize).toBeGreaterThan(ordinary.corpusSize);
  }, 30_000);

  test("THE CROSS-BEAT AGREEMENT — the same corpus through the wiki face and the composite face", async () => {
    const wiki = engine.wiki;
    // the wiki face's ordinary universe = the seeds + the plugin container; seed the composite face
    // with the IDENTICAL corpus (the container's packed JSON counts as a sensed entity — open-record law).
    const pluginDoc: FixtureTiddler = {
      title: LARES_MEMETIC_WIKITEXT_PLUGIN.title,
      text: LARES_MEMETIC_WIKITEXT_PLUGIN.text,
    };

    const wikiBeat = JSON.parse(wiki.filterTiddlers("[wikisense:cohere:ordinary[]]")[0]!) as WikiCoherenceSummary;
    const compositeBeat = await compositeSummary("lar:///ha.ka.ba/bags/@cross-beat-glue", [...GLUE_SEEDS, pluginDoc]);
    // the two beats agree on the WHOLE verdict — radius, glue, vacuity, loci, gate, grain.
    expect(wikiBeat).toEqual(compositeBeat);

    // the corpus moves on BOTH faces — the verdicts move TOGETHER (same radius, same loci, same
    // gate). NOTE: with the plugin container in the corpus, its English-rich bundle saturates the
    // form lens (small seeds share shingles with it), so the obstruction localizes at `plain`
    // (structure 0, form 1) on both faces — locus EQUALITY across the beats carries the witness,
    // not any fixture-specific locus name.
    wiki.addTiddler({ title: ORNATE_NOVEL.title, text: ORNATE_NOVEL.text });
    try {
      const wikiObstruct = JSON.parse(wiki.filterTiddlers("[wikisense:cohere:ordinary[]]")[0]!) as WikiCoherenceSummary;
      const compositeObstruct = await compositeSummary(
        "lar:///ha.ka.ba/bags/@cross-beat-obstruct", [...GLUE_SEEDS, pluginDoc, ORNATE_NOVEL],
      );
      expect(wikiObstruct).toEqual(compositeObstruct);
      expect(wikiObstruct.radius).toBeGreaterThan(0);
      expect(wikiObstruct.corpusSize).toBe(wikiBeat.corpusSize + 1);
      expect(wikiObstruct.obstructionLocus.length).toBeGreaterThan(0);
    } finally {
      wiki.deleteTiddler(ORNATE_NOVEL.title);
    }
  }, 30_000);
});
