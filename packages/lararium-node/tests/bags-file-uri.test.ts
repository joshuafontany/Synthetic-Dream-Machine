/**
 * bags-file-uri.test.ts — the loci law run backward (the ingest scan leg):
 * `bags/<sub-path>.md` ⇄ `lar:///ha.ka.ba/<sub-path>`; outside bags/ or
 * non-.md → null (the gesture reports skipped, never guesses).
 */

import { describe, test, expect } from "vitest";
import { bagsFileToUri } from "../src/bag-paths.js";

const ROOT = "/srv/vessel";

describe("bagsFileToUri — loci reverse-derivation (full-path-inside-bag)", () => {
  test("residency dir strips; the interior IS the name", () => {
    expect(bagsFileToUri(ROOT, "/srv/vessel/bags/@lares/ha.ka.ba/@lares/api/pono/meme.md"))
      .toBe("lar:///ha.ka.ba/@lares/api/pono/meme");
  });

  test("a foreign name held in another bag derives losslessly", () => {
    expect(bagsFileToUri(ROOT, "/srv/vessel/bags/@draft/ha.ka.ba/@lares/api/pono/meme.md"))
      .toBe("lar:///ha.ka.ba/@lares/api/pono/meme");
  });

  test("pre-migration (rootless interior), non-.md, outside bags/ → null", () => {
    expect(bagsFileToUri(ROOT, "/srv/vessel/bags/@lares/api/pono/meme.md")).toBeNull();
    expect(bagsFileToUri(ROOT, "/srv/vessel/bags/@sdm/ha.ka.ba/@sdm/tags/x.tid")).toBeNull();
    expect(bagsFileToUri(ROOT, "/elsewhere/bags/@x/ha.ka.ba/@x/v1/y.md")).toBeNull();
    expect(bagsFileToUri(ROOT, "/srv/vessel/genesis/island.bin")).toBeNull();
  });
});
