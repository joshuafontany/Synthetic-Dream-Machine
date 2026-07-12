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
