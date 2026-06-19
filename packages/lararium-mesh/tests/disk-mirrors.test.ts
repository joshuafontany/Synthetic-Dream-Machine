/**
 * disk-mirrors.test — V3: the @working → wikis/{slug} projector mirror.
 *
 * resolveDiskMirrors intersects the held disk grant (AUTHORITY) with the recipe's
 * mirrorBags (DESIGNATION), and fills a per-wiki-slug grant's leaf from the
 * recipe's wikiSlug at mount time — so @working projects to wikis/@{slug} while
 * @lares/@lararium keep their static bags/ roots. OCAP-clean: authority in the
 * grant, designation in the recipe, the per-instance subdir resolved here.
 *
 * Canon: lar:///ha.ka.ba/@lares/v0.1/docs/pono/wiki-layer-ontology (#shore-law)
 */

import { describe, test, expect } from "vitest";
import { resolveDiskMirrors, type DiskMirrorGrant } from "../src/vessel-island-pool-core.js";

const LARES   = "lar:///ha.ka.ba/@lares";
const WORKING = "lar:///ha.ka.ba/@working";

const grant: DiskMirrorGrant = [
  { bagId: LARES,   mirrorRoot: "/root/bags/@lares", scope: "@lares" },
  { bagId: WORKING, mirrorRoot: "/root/wikis",       scope: "@working", perWikiSlug: true },
];

describe("resolveDiskMirrors — authority ∩ designation + per-wiki-slug leaf", () => {
  test("a per-wiki-slug grant (@working) resolves its leaf to wikis/@{slug}", () => {
    const out = resolveDiskMirrors(grant, [LARES, WORKING], "myproject");
    expect(out.find((m) => m.bagId === WORKING)?.mirrorRoot).toBe("/root/wikis/@myproject");
    // a non-per-wiki grant keeps its static root.
    expect(out.find((m) => m.bagId === LARES)?.mirrorRoot).toBe("/root/bags/@lares");
  });

  test("authority ∩ designation — a bag absent from mirrorBags never mirrors", () => {
    const out = resolveDiskMirrors(grant, [LARES], "myproject"); // @working not designated
    expect(out.map((m) => m.bagId)).toEqual([LARES]);
  });

  test("absent/empty mirrorBags → no mirrors (a designation-less mount writes no disk)", () => {
    expect(resolveDiskMirrors(grant, undefined, "x")).toEqual([]);
    expect(resolveDiskMirrors(grant, [], "x")).toEqual([]);
  });
});
