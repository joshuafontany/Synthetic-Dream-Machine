/**
 * wikis-file-uri.test.ts — the @working write-layer's disk surface run
 * backward (the ingest-BACK leg, thread 2): `wikis/@{slug}/<sub-path>.mem` ⇄
 * `lar:///ha.ka.ba/<sub-path>`. The first segment under wikis/ names the WIKI
 * SLUG (the write-layer instance) and never enters the name — symmetric with
 * bagsFileToUri, which strips the residency bag. The derived records home to
 * @working; the caller carries that designation in `--to`.
 */

import { describe, test, expect } from "vitest";
import { wikisFileToUri, bagsFileToUri } from "../src/bag-paths.js";

const ROOT = "/srv/vessel";

describe("wikisFileToUri — @working ingest-back reverse-derivation", () => {
  test("the wiki-slug dir strips; the interior IS the name", () => {
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@lares/ha.ka.ba/lares/api/pono/meme.mem"))
      .toBe("lar:///ha.ka.ba/lares/api/pono/meme");
  });

  test("a minted user wiki's @working surface derives losslessly", () => {
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@my-world/ha.ka.ba/lararium/tw5/recipe-watch.mem"))
      .toBe("lar:///ha.ka.ba/lararium/tw5/recipe-watch");
  });

  test("symmetry — the same name projects identically through either plane", () => {
    const name = "/ha.ka.ba/lares/api/pono/meme";
    expect(wikisFileToUri(ROOT, `/srv/vessel/wikis/@lares${name}.mem`))
      .toBe(bagsFileToUri(ROOT, `/srv/vessel/bags/@lares${name}.mem`));
  });

  test("rootless interior, non-.mem, outside wikis/ → null (skipped, never guessed)", () => {
    // pre-migration rootless interior
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@lares/api/pono/meme.mem")).toBeNull();
    // non-.mem
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@lares/ha.ka.ba/lares/tags/x.tid")).toBeNull();
    // a bags/ file does NOT resolve through the wikis plane
    expect(wikisFileToUri(ROOT, "/srv/vessel/bags/@lares/ha.ka.ba/lares/api/pono/meme.mem")).toBeNull();
    // bare slug dir, no interior
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@lares")).toBeNull();
  });
});
