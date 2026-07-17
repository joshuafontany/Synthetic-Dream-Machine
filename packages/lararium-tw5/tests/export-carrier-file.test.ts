/**
 * export-carrier-file — a carrier projects back to ITS OWN filetype.
 *
 * The projection reciprocal of the filetype-native ingest: a memetic carrier
 * recomposes to `.mem`; ANY other TW5 filetype rides TW5's own file-info
 * cascade to its native file (a content filetype adds a `.meta` sidecar). The
 * VM registry decides type + extension + bytes; the projector only sites them.
 */

import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { TW5Engine } from "../src/tw5-vm.js";
import { exportCarrierFile } from "../src/meme-write.js";
import LARES_MEMETIC_WIKITEXT_PLUGIN from "../plugins/lares-memetic-wikitext.json" with { type: "json" };
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../src/generated-tw5-version.js";

const CORE_PATH = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
const coreBlobPresent = existsSync(CORE_PATH);

describe.skipIf(!coreBlobPresent)("exportCarrierFile — native filetype projection", () => {
  let engine: TW5Engine;

  beforeAll(async () => {
    engine = new TW5Engine();
    const coreBlob = new Uint8Array(readFileSync(CORE_PATH));
    await engine.boot(coreBlob, [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
    engine.setTiddler({
      title: "lar:///ha.ka.ba/lares/api/native/note",
      type:  "text/markdown",
      text:  "# a markdown carrier\n\nprose that projects to `.md`, fields to `.meta`.\n",
      tags:  "api/native",
    });
    engine.setTiddler({
      title: "lar:///ha.ka.ba/lares/api/native/leaf",
      type:  "text/vnd.tiddlywiki",
      text:  "a wikitext tiddler projects to a self-contained .tid.\n",
    });
    engine.setTiddler({
      title: "lar:///ha.ka.ba/lares/api/native/carrier",
      type:  "text/x-memetic-wikitext",
      text:  "a memetic carrier still recomposes to .mem.\n",
    });
  }, 60_000);

  test("a content filetype projects to its native file + a .meta sidecar", () => {
    const file = exportCarrierFile(engine, "lar:///ha.ka.ba/lares/api/native/note");
    expect(file).not.toBeNull();
    expect(file!.ext).toBe(".md");
    expect(file!.body).toContain("a markdown carrier");
    // the sidecar carries the FIELDS, never the text (the body file owns the text)
    expect(file!.metaBody).toBeDefined();
    expect(file!.metaBody!).toContain("type: text/markdown");
    expect(file!.metaBody!).not.toContain("markdown carrier");
  });

  test("a wikitext tiddler projects to a self-contained .tid (no sidecar)", () => {
    const file = exportCarrierFile(engine, "lar:///ha.ka.ba/lares/api/native/leaf");
    expect(file).not.toBeNull();
    expect(file!.ext).toBe(".tid");
    expect(file!.body).toContain("self-contained .tid");
    expect(file!.metaBody).toBeUndefined();
  });

  test("a memetic carrier still recomposes to .mem", () => {
    const file = exportCarrierFile(engine, "lar:///ha.ka.ba/lares/api/native/carrier");
    expect(file).not.toBeNull();
    expect(file!.ext).toBe(".mem");
    expect(file!.metaBody).toBeUndefined();
    // the SOH carrier envelope surfaces — the membrane recompose ran
    expect(file!.body).toContain("&#x0001;");
  });

  test("an absent tiddler projects nothing", () => {
    expect(exportCarrierFile(engine, "lar:///ha.ka.ba/lares/api/native/ghost")).toBeNull();
  });
});
