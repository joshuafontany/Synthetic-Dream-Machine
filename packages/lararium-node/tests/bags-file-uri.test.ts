/**
 * bags-file-uri.test.ts — the loci law run backward (the ingest scan leg):
 * `bags/<sub-path>.md` ⇄ `lar:///ha.ka.ba/<sub-path>`; outside bags/ or
 * non-.md → null (the gesture reports skipped, never guesses).
 */

import { describe, test, expect } from "vitest";
import { bagsFileToUri } from "../src/bag-paths.js";

const ROOT = "/srv/vessel";

describe("bagsFileToUri — loci reverse-derivation", () => {
  test("a bags/ carrier derives its lar: URI", () => {
    expect(bagsFileToUri(ROOT, "/srv/vessel/bags/@lares/v0.1/api/pono/meme.md"))
      .toBe("lar:///ha.ka.ba/@lares/v0.1/api/pono/meme");
  });

  test("relative paths resolve before derivation", () => {
    const here = process.cwd();
    expect(bagsFileToUri(here, "bags/@sdm/v0.1/components/posture/ritual.md"))
      .toBe("lar:///ha.ka.ba/@sdm/v0.1/components/posture/ritual");
  });

  test("outside bags/ or non-.md reads null (skipped, never guessed)", () => {
    expect(bagsFileToUri(ROOT, "/srv/vessel/genesis/island.bin")).toBeNull();
    expect(bagsFileToUri(ROOT, "/srv/vessel/bags/@sdm/v0.1/tags/x.tid")).toBeNull();
    expect(bagsFileToUri(ROOT, "/elsewhere/bags/@x/v1/y.md")).toBeNull();
  });
});
