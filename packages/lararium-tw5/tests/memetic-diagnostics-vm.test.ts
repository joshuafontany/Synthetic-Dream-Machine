/**
 * The isomorphic lift, proved in a live VM.
 *
 * Core TiddlyWiki closes over a parser-agnostic diagnostics contract: any parser sets `diagnostics`
 * on its parse result, and `[parse-diagnostics[]]` reads it through the parse cache, grading every
 * content type on one severity ladder. The memetic parser now populates that array from the
 * recoveries the meme-ast driver already performed.
 *
 * So a filter operator SDM never wrote grades a carrier SDM's own grammar parsed. This test boots
 * the real core against the real plugin and holds that claim to it.
 */

import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { TW5Engine } from "../src/tw5-vm.js";
import LARES_MEMETIC_WIKITEXT_PLUGIN from "../plugins/lares-memetic-wikitext.json" with { type: "json" };
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../src/generated-tw5-version.js";

const CORE_PATH = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
const coreBlobPresent = existsSync(CORE_PATH);

const MEMETIC = "text/x-memetic-wikitext";

describe.skipIf(!coreBlobPresent)("the memetic parser rides the core diagnostics contract", () => {
  let engine: TW5Engine;

  beforeAll(async () => {
    engine = new TW5Engine();
    const coreBlob = new Uint8Array(readFileSync(CORE_PATH));
    await engine.boot(coreBlob, [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
    engine.setTiddler({
      title: "carrier-clean",
      type:  MEMETIC,
      text:  "A carrier of ordinary prose, carrying no sigil at all.\n",
    });
    engine.setTiddler({
      title: "carrier-degraded",
      type:  MEMETIC,
      text:  "A carrier holding <<~ zzzznotasigil something >> in its body.\n",
    });
  }, 60_000);

  test("core's operator finds the carrier the memetic grammar could not fully read", () => {
    const found = engine.wiki.filterTiddlers("[[carrier-degraded]parse-diagnostics[]]");
    expect(found).toEqual(["carrier-degraded"]);
  });

  test("a clean carrier grades clean, and the degraded one grades on the shared ladder", () => {
    expect(engine.wiki.filterTiddlers("[[carrier-clean]parse-diagnostics:grade[]]")).toEqual(["clean"]);
    const grade = engine.wiki.filterTiddlers("[[carrier-degraded]parse-diagnostics:grade[]]");
    expect(["error", "warning", "info", "hint"]).toContain(grade[0]);
  });

  test("the carrier names its own fault by code, so a wiki lists its exposure with a filter", () => {
    const codes = engine.wiki.filterTiddlers("[[carrier-degraded]parse-diagnostics:codes[]]");
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.join(",")).toMatch(/sigil/);
  });

  test("the text survives the recovery, since a graded carrier still says what the operator wrote", () => {
    const text = engine.wiki.getTiddlerText("carrier-degraded") ?? "";
    expect(text).toContain("zzzznotasigil");
  });
});

/**
 * The superset law.
 *
 * `text/x-memetic-wikitext` extends TiddlyWiki's wikitext rather than replacing it, so a memetic
 * carrier inherits every recovery core performs and adds the sigil recoveries on top. Both land in
 * one diagnostics array, on one severity ladder, read by one filter. A superset that dropped the
 * substrate's recoveries would read as a fork wearing a superset's name.
 */
describe.skipIf(!coreBlobPresent)("the memetic grammar supersets the wikitext substrate", () => {
  let engine: TW5Engine;

  beforeAll(async () => {
    engine = new TW5Engine();
    const coreBlob = new Uint8Array(readFileSync(CORE_PATH));
    await engine.boot(coreBlob, [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
    engine.setTiddler({
      title: "carrier-unclosed-bold",
      type:  MEMETIC,
      text:  "A carrier opening ''bold that never closes.\n\n! A heading below it\n",
    });
    engine.setTiddler({
      title: "carrier-both-faults",
      type:  MEMETIC,
      text:  "An unclosed ''bold, and a <<~ zzzznotasigil form >> beside it.\n",
    });
  }, 60_000);

  test("a memetic carrier inherits the substrate's recoveries", () => {
    const codes = engine.wiki.filterTiddlers("[[carrier-unclosed-bold]parse-diagnostics:codes[]]");
    expect(codes).toContain("unterminated-bold");
  });

  test("the substrate's recovery holds inside the superset: the heading below survives the unclosed delimiter", () => {
    const html = engine.wiki.renderTiddler("text/html", "carrier-unclosed-bold");
    expect(html).toMatch(/<h1/);
  });

  test("a carrier carrying both a wikitext fault and a sigil fault reports both on one channel", () => {
    const codes = engine.wiki.filterTiddlers("[[carrier-both-faults]parse-diagnostics:codes[]]");
    expect(codes).toContain("unterminated-bold");
    expect(codes.some((code) => /sigil/.test(code))).toBe(true);
    const count = engine.wiki.filterTiddlers("[[carrier-both-faults]parse-diagnostics:count[]]");
    expect(Number(count[0])).toBeGreaterThanOrEqual(2);
  });

  // Core owes a tree for every input, so the superset owes one too: a carrier the operator half-typed
  // must never take the wiki down. The generator seeds itself, so a failure reproduces exactly.
  test("the superset never throws, whatever the carrier holds", () => {
    const CHUNKS = [
      "<<~", ">>", "<<~ ahu #slot >>", "<<~/ahu >>", "<<~ pranala a -> b >>", "<<~/pranala >>",
      "''", "//", "@@", "`", "```", "<<<", "\\define f()", "\\end", "{{x}}", "[[y]]",
      "\n", "\n\n", " ", "prose", "|t|c|", "! head", "* item", "&#x0001;", "```toml iam", "type = \"x\"",
    ];
    let state = 20260712;
    const next = () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 300; i++) {
      const parts: string[] = [];
      const length = 1 + Math.floor(next() * 24);
      for (let j = 0; j < length; j++) parts.push(CHUNKS[Math.floor(next() * CHUNKS.length)]!);
      const source = parts.join("");
      expect(() => engine.wiki.parseText(MEMETIC, source)).not.toThrow();
    }
  });
});
