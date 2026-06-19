/**
 * wikis-file-uri.test.ts — the @working write-layer's disk surface run
 * backward (the ingest-BACK leg, thread 2): `wikis/@{slug}/<sub-path>.md` ⇄
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
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@lares/ha.ka.ba/@lares/v0.1/api/pono/meme.md"))
      .toBe("lar:///ha.ka.ba/@lares/v0.1/api/pono/meme");
  });

  test("a minted user wiki's @working surface derives losslessly", () => {
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@my-world/ha.ka.ba/@lararium/v0.1/tw5/recipe-watch.md"))
      .toBe("lar:///ha.ka.ba/@lararium/v0.1/tw5/recipe-watch");
  });

  test("symmetry — the same name projects identically through either plane", () => {
    const name = "/ha.ka.ba/@lares/v0.1/api/pono/meme";
    expect(wikisFileToUri(ROOT, `/srv/vessel/wikis/@lares${name}.md`))
      .toBe(bagsFileToUri(ROOT, `/srv/vessel/bags/@lares${name}.md`));
  });

  test("rootless interior, non-.md, outside wikis/ → null (skipped, never guessed)", () => {
    // pre-migration rootless interior
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@lares/v0.1/api/pono/meme.md")).toBeNull();
    // non-.md
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@lares/ha.ka.ba/@lares/v0.1/tags/x.tid")).toBeNull();
    // a bags/ file does NOT resolve through the wikis plane
    expect(wikisFileToUri(ROOT, "/srv/vessel/bags/@lares/ha.ka.ba/@lares/v0.1/api/pono/meme.md")).toBeNull();
    // bare slug dir, no interior
    expect(wikisFileToUri(ROOT, "/srv/vessel/wikis/@lares")).toBeNull();
  });
});
