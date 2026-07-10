/**
 * disk-mirrors.test — V3: the @working → wikis/{slug} projector mirror.
 *
 * resolveDiskMirrors intersects the held disk grant (AUTHORITY) with the recipe's
 * mirrorBags (DESIGNATION), and fills a per-wiki-slug grant's leaf from the
 * recipe's wikiSlug at mount time — so @working projects to wikis/@{slug} while
 * @lares/@lararium keep their static bags/ roots. OCAP-clean: authority in the
 * grant, designation in the recipe, the per-instance subdir resolved here.
 *
 * Canon: lar:///ha.ka.ba/@lares/docs/pono/wiki-layer-ontology (#shore-law)
 */

import { describe, test, expect } from "vitest";
import { resolveDiskMirrors, type DiskMirrorGrant } from "../src/vessel-island-pool-core.js";

const LARES   = "lar:///ha.ka.ba/@lares";
const WORKING = "lar:///ha.ka.ba/@working";

const grant: DiskMirrorGrant = [
  { bagId: LARES,   mirrorRoot: "/root/bags/@lares", scope: "@lares" },
  { bagId: WORKING, mirrorRoot: "/root/wikis",       scope: "@working", perWikiSlug: true },
];

// thread 1: the per-wiki CANON authority — a minted wiki's own @{slug} bag
// projects to bags/@{slug}; system wikis keep their literal roots.
const canonGrant: DiskMirrorGrant = [
  { bagId: LARES,   mirrorRoot: "/root/bags/@lares", scope: "@lares" },
  { bagId: WORKING, mirrorRoot: "/root/wikis",       scope: "@working", perWikiSlug: true },
  { bagId: "@self", mirrorRoot: "/root/bags",        scope: "@self",    perWikiSlug: true, selfCanon: true },
];
const bagUri = (slug: string) => `lar:///ha.ka.ba/bags/@${slug}`;

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

  describe("self-canon — the minted wiki's own canon → bags/@{slug}", () => {
    test("a minted user wiki projects its @{slug} canon to bags/@{slug}", () => {
      const slug = "my-world";
      const out = resolveDiskMirrors(canonGrant, [WORKING, bagUri(slug)], slug);
      const self = out.find((m) => m.bagId === bagUri(slug));
      expect(self?.mirrorRoot).toBe("/root/bags/@my-world");
      // @working still resolves its own per-slug leaf
      expect(out.find((m) => m.bagId === WORKING)?.mirrorRoot).toBe("/root/wikis/@my-world");
    });

    test("a system wiki (literal grant covers its slug) never double-projects", () => {
      // the @lares wiki designates its own canon (@lares) but a literal grant
      // already covers it → self-canon yields nothing, only the literal root.
      const out = resolveDiskMirrors(canonGrant, [LARES, WORKING], "lares");
      const laresMirrors = out.filter((m) => m.bagId === LARES);
      expect(laresMirrors).toHaveLength(1);
      expect(laresMirrors[0]?.mirrorRoot).toBe("/root/bags/@lares");
    });

    test("self-canon yields nothing unless the recipe designates the own-canon bag", () => {
      // @working designated, but NOT the wiki's own canon → no self mirror
      const out = resolveDiskMirrors(canonGrant, [WORKING], "my-world");
      expect(out.map((m) => m.bagId)).toEqual([WORKING]);
    });
  });
});
