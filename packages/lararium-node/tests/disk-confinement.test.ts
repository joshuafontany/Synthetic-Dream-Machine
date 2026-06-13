/**
 * disk-confinement — the sovereign-island disk ward (bag-paths.confineMirrorWrite).
 *
 * Law (disk-projection#write-ward, operator ruling 2026-06-11): a mirror's
 * writes confine to its OWN bag subdir; the widened grant (allowBagsRootFiles)
 * MAY place files DIRECTLY in the root-bags-dir, but MUST NEVER escape the
 * bags dir or enter another bag's subdir. Cascade output = untrusted input.
 */

import { describe, test, expect } from "vitest";
import { confineMirrorWrite } from "../src/bag-paths.js";

const ROOT = "/srv/lar/bags/@lares";

describe("disk ward — own-subdir confinement (default)", () => {
  test("a path under the mirror root passes", () => {
    const r = confineMirrorWrite(ROOT, "ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot.md");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.path).toBe("/srv/lar/bags/@lares/ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot.md");
  });

  test("dot-dot traversal out of the root refuses", () => {
    const r = confineMirrorWrite(ROOT, "../escape.md");
    expect(r.ok).toBe(false);
  });

  test("deep traversal toward another bag refuses", () => {
    const r = confineMirrorWrite(ROOT, "../../@lararium/v0.1/poison.md");
    expect(r.ok).toBe(false);
  });

  test("absolute paths refuse outright", () => {
    const r = confineMirrorWrite(ROOT, "/etc/passwd");
    expect(r.ok).toBe(false);
  });

  test("a sneaky mid-path dot-dot that stays inside passes; one that leaves refuses", () => {
    expect(confineMirrorWrite(ROOT, "api/../api/x.md").ok).toBe(true);
    expect(confineMirrorWrite(ROOT, "api/../../../@sdm/x.md").ok).toBe(false);
  });

  test("writing the mirror root itself refuses", () => {
    expect(confineMirrorWrite(ROOT, ".").ok).toBe(false);
  });
});

describe("disk ward — the widened grant (allowBagsRootFiles)", () => {
  test("a file DIRECTLY in the root-bags-dir passes with the grant", () => {
    const r = confineMirrorWrite(ROOT, "../README.md", true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.path).toBe("/srv/lar/bags/README.md");
  });

  test("the same file refuses WITHOUT the grant", () => {
    expect(confineMirrorWrite(ROOT, "../../README.md", false).ok).toBe(false);
  });

  test("another bag's subdir refuses EVEN WITH the grant", () => {
    expect(confineMirrorWrite(ROOT, "../../@lararium/v0.1/poison.md", true).ok).toBe(false);
    expect(confineMirrorWrite(ROOT, "../../@sdm/anything.md", true).ok).toBe(false);
  });

  test("escaping above the bags dir refuses EVEN WITH the grant", () => {
    expect(confineMirrorWrite(ROOT, "../../../outside.md", true).ok).toBe(false);
    expect(confineMirrorWrite(ROOT, "../../../../etc/cron.d/x", true).ok).toBe(false);
  });

  test("a NEW subdir under bags refuses (files directly in bags only — one level)", () => {
    expect(confineMirrorWrite(ROOT, "../../newdir/file.md", true).ok).toBe(false);
  });

  test("a mirror root without a bags ancestor leaves the grant inert", () => {
    expect(confineMirrorWrite("/srv/other/place", "../up.md", true).ok).toBe(false);
  });
});

describe("disk ward — refusal signal (the alert chain's first link)", () => {
  test("a refused flush fires onRefusal with bag, uri, and reason", async () => {
    const { LarDiskProjector } = await import("../src/disk-projector.js");
    const refusals: Array<{ bagId: string; uri: string; reason: string }> = [];
    const projector = new LarDiskProjector({
      mirrors: [{ bagId: "@lares", mirrorRoot: "/srv/lar/bags/@lares", toRelPath: () => "../@sdm/poison.md" }],
      renderFn: async () => "never-rendered",
      debounceMs: 1,
      onRefusal: (info) => refusals.push(info),
    });
    await (projector as unknown as { flush: (b: string, u: string) => Promise<void> })
      .flush("@lares", "lar:///ha.ka.ba/@lares/v0.1/x");
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.bagId).toBe("@lares");
    expect(refusals[0]?.reason).toMatch(/escapes mirror root/);
  });
});
