/**
 * bag-manifest — a bag declares what it carries, who may read it, and where it belongs.
 *
 * These hold the three properties the declaration exists for:
 *   · NO PATHS EVER — a repository home names a registered ID, and the rendered manifest carries no directory.
 *   · FIELD-WISE FAIL-CLOSE — one torn value never throws away the fields that read fine.
 *   · THE MOVE IS JUDGED BEFORE IT ACTS — both ends resolve purely, so an unresolvable target never reaches
 *     a filesystem.
 *
 * Canon: lar:///ha.ka.ba/lararium/mesh/cap-tier
 */
import { describe, test, expect } from "vitest";
import {
  BAG_MANIFEST_FILE, defaultBagManifest, bagManifestFromMeta, renderBagManifest,
  placeBag, planBagMove,
} from "../src/bag-manifest.js";
import type { BagHomeRoots, RepoRegistration } from "../src/bag-home.js";

const CANON: RepoRegistration = { id: "canon", root: "/repos/canon", vcs: "git" };
const ROOTS: BagHomeRoots = { hearth: "/state", repositories: new Map([["canon", CANON]]) };
const NO_REPOS: BagHomeRoots = { hearth: "/state" };

describe("a bag that declares nothing still answers", () => {
  test("the defaults read tightest-tier + recoverable-home", () => {
    expect(defaultBagManifest("@x")).toEqual({ bag: "@x", tier: "veil", home: "hearth" });
    expect(bagManifestFromMeta("@x", null)).toEqual({ bag: "@x", tier: "veil", home: "hearth" });
    expect(BAG_MANIFEST_FILE).toBe("meta.mem");
  });

  test("★ a TORN field fails closed ALONE — one bad value never discards the good ones ★", () => {
    // An all-or-nothing parse would throw away a correct tier because somebody mistyped a home.
    const m = bagManifestFromMeta("lares", { "cap-tier": "public", home: "corpus" });
    expect(m.tier).toBe("public");     // read fine, kept
    expect(m.home).toBe("hearth");     // torn, fail-closed on its OWN axis
  });

  test("either spelling of the tier key reads, because a human writes this by hand", () => {
    expect(bagManifestFromMeta("@x", { tier: "contract" }).tier).toBe("contract");
    expect(bagManifestFromMeta("@x", { "cap-tier": "contract" }).tier).toBe("contract");
  });
});

describe("★ NO PATHS, EVER — a repository home names a registered id ★", () => {
  test("the repo id rides only where a repository home does", () => {
    const repoBag = bagManifestFromMeta("lares", { home: "repository", repository: "canon" });
    expect(repoBag.repository).toBe("canon");
    // A hearth bag carrying a repo id would leave a stale pointer reading as intent the next time somebody
    // moved it, so the parse drops it.
    expect(bagManifestFromMeta("nexus", { home: "hearth", repository: "canon" }).repository).toBeUndefined();
  });

  test("★ the rendered manifest carries the ID and never a directory ★", () => {
    const wire = renderBagManifest(bagManifestFromMeta("lares", { home: "repository", repository: "canon", "cap-tier": "public" }));
    expect(wire).toContain('repository = "canon"');
    expect(wire).not.toContain("/repos/canon");     // the path stays local to the vessel that resolved it
    expect(wire).not.toContain("/state");
  });

  test("an unregistered id REFUSES here rather than resolving somewhere else", () => {
    const m = bagManifestFromMeta("lares", { home: "repository", repository: "elsewhere" });
    const p = placeBag(m, ROOTS);
    expect(p.resolution.ok).toBe(false);
    expect(p.resolution.ok === false && p.resolution.why).toMatch(/no repo registered under "elsewhere"/);
  });

  test("a repository home that NAMES no repo refuses — the bag must say which", () => {
    const p = placeBag(bagManifestFromMeta("@x", { home: "repository" }), ROOTS);
    expect(p.resolution.ok).toBe(false);
    expect(p.resolution.ok === false && p.resolution.why).toMatch(/NAMES none/);
  });

  test("★ an unregistered repo reads PLACEABLE-ELSEWHERE, never broken ★", () => {
    // The declaration travels with the bag and is fine; this vessel simply is not where it lives.
    const m = bagManifestFromMeta("lares", { home: "repository", repository: "canon" });
    expect(placeBag(m, ROOTS).resolution).toEqual({ ok: true, home: "repository", dir: "/repos/canon" });
    expect(placeBag(m, NO_REPOS).resolution.ok).toBe(false);
    expect(m.repository).toBe("canon");             // unchanged — the bag still knows what it wants
  });
});

describe("planBagMove — judged before anything is written", () => {
  test("hearth → repository resolves both ends", () => {
    const move = planBagMove(defaultBagManifest("lares"), { home: "repository", repository: "canon" }, ROOTS);
    expect(move.from.resolution).toEqual({ ok: true, home: "hearth", dir: "/state" });
    expect(move.to.resolution).toEqual({ ok: true, home: "repository", dir: "/repos/canon" });
    expect(move.noop).toBe(false);
  });

  test("★ a move to an UNRESOLVABLE target surfaces its refusal BEFORE any act ★", () => {
    const move = planBagMove(defaultBagManifest("@x"), { home: "repository", repository: "nope" }, ROOTS);
    expect(move.to.resolution.ok).toBe(false);
    expect(move.from.resolution.ok).toBe(true);     // the bag still stands where it stands
  });

  test("moving to hearth or ley DROPS a carried repo id — no stale pointer survives", () => {
    const inRepo = bagManifestFromMeta("lares", { home: "repository", repository: "canon" });
    expect(planBagMove(inRepo, { home: "hearth" }, ROOTS).to.manifest.repository).toBeUndefined();
    expect(planBagMove(inRepo, { home: "ley" }, ROOTS).to.manifest.repository).toBeUndefined();
  });

  test("a move to LEY carries no destination directory — the model speaking", () => {
    const move = planBagMove(defaultBagManifest("@x"), { home: "ley" }, ROOTS);
    expect(move.to.resolution.ok).toBe(false);
    expect(move.to.resolution.ok === false && move.to.resolution.why).toMatch(/nowhere durable/);
  });

  test("a move that lands the same directory reads NOOP", () => {
    expect(planBagMove(defaultBagManifest("@x"), { home: "hearth" }, ROOTS).noop).toBe(true);
  });

  test("the tier rides through a move untouched — a home change is not a permission change", () => {
    const m = bagManifestFromMeta("lares", { "cap-tier": "contract", home: "hearth" });
    expect(planBagMove(m, { home: "repository", repository: "canon" }, ROOTS).to.manifest.tier).toBe("contract");
  });
});
