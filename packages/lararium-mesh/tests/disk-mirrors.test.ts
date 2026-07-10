/**
 * disk-mirrors.test — the per-wiki working → wikis/@{slug} projector mirror.
 *
 * resolveDiskMirrors intersects the held disk grant (AUTHORITY) with the recipe's
 * mirrorBags (DESIGNATION), and slug-expands a per-wiki grant's bag + leaf from the
 * recipe's wikiSlug at mount time — so a `wikiSlot:"working"` grant projects
 * `wikis/@{slug}/working` → disk `wikis/@{slug}`, while @lares/@lararium keep their
 * static bags/ roots. OCAP-clean: authority in the grant, designation in the
 * recipe, the per-instance bag + subdir resolved here.
 *
 * Canon: lar:///ha.ka.ba/lares/docs/pono/wiki-layer-ontology (#shore-law)
 */

import { describe, test, expect } from "vitest";
import { resolveDiskMirrors, type DiskMirrorGrant } from "../src/vessel-island-pool-core.js";
import { wikiSlotUri, wikiBagUri } from "@lararium/mesh";

const LARES = "lar:///ha.ka.ba/bags/@lares";

// The node vessel's real grant shape: a `wikiSlot` entry slug-expands BOTH its
// bagId (→ wikis/@{slug}/working) and its leaf (→ wikis/@{slug}); a literal grant
// (@lares) keeps its static root.
const grant: DiskMirrorGrant = [
  { bagId: LARES,      mirrorRoot: "/root/bags/@lares", scope: "@lares" },
  { bagId: "@working", mirrorRoot: "/root/wikis",       scope: "@working", wikiSlot: "working" },
];

// + the per-wiki CANON authority — a minted wiki's own bags/@{slug} bag projects
// to bags/@{slug}; system wikis keep their literal roots.
const canonGrant: DiskMirrorGrant = [
  ...grant,
  { bagId: "@self", mirrorRoot: "/root/bags", scope: "@self", perWikiSlug: true, selfCanon: true },
];

describe("resolveDiskMirrors — authority ∩ designation + per-wiki slug expansion", () => {
  test("a wikiSlot grant (working) slug-expands its bag + leaf to wikis/@{slug}", () => {
    const workingSlot = wikiSlotUri("myproject", "working");
    const out = resolveDiskMirrors(grant, [LARES, workingSlot], "myproject");
    const working = out.find((m) => m.bagId === workingSlot);
    expect(working?.bagId).toBe("lar:///ha.ka.ba/wikis/@myproject/working");
    expect(working?.mirrorRoot).toBe("/root/wikis/@myproject");
    // a non-per-wiki grant keeps its static bag + root.
    expect(out.find((m) => m.bagId === LARES)?.mirrorRoot).toBe("/root/bags/@lares");
  });

  test("authority ∩ designation — a bag absent from mirrorBags never mirrors", () => {
    const out = resolveDiskMirrors(grant, [LARES], "myproject"); // working slot not designated
    expect(out.map((m) => m.bagId)).toEqual([LARES]);
  });

  test("absent/empty mirrorBags → no mirrors (a designation-less mount writes no disk)", () => {
    expect(resolveDiskMirrors(grant, undefined, "x")).toEqual([]);
    expect(resolveDiskMirrors(grant, [], "x")).toEqual([]);
  });

  describe("self-canon — the minted wiki's own canon → bags/@{slug}", () => {
    test("a minted user wiki projects its bags/@{slug} canon to bags/@{slug}", () => {
      const slug = "my-world";
      const out = resolveDiskMirrors(canonGrant, [wikiSlotUri(slug, "working"), wikiBagUri(slug)], slug);
      const self = out.find((m) => m.bagId === wikiBagUri(slug));
      expect(self?.mirrorRoot).toBe("/root/bags/@my-world");
      // the working slot still resolves its own per-slug leaf
      expect(out.find((m) => m.bagId === wikiSlotUri(slug, "working"))?.mirrorRoot).toBe("/root/wikis/@my-world");
    });

    test("a system wiki (literal grant covers its slug) never double-projects", () => {
      // the @lares wiki designates its own canon (@lares) but a literal grant
      // already covers it → self-canon yields nothing, only the literal root.
      const out = resolveDiskMirrors(canonGrant, [LARES, wikiSlotUri("lares", "working")], "lares");
      const laresMirrors = out.filter((m) => m.bagId === LARES);
      expect(laresMirrors).toHaveLength(1);
      expect(laresMirrors[0]?.mirrorRoot).toBe("/root/bags/@lares");
    });

    test("self-canon yields nothing unless the recipe designates the own-canon bag", () => {
      // working designated, but NOT the wiki's own canon → no self mirror
      const workingSlot = wikiSlotUri("my-world", "working");
      const out = resolveDiskMirrors(canonGrant, [workingSlot], "my-world");
      expect(out.map((m) => m.bagId)).toEqual([workingSlot]);
    });
  });
});
