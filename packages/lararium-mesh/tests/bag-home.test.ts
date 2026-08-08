/**
 * bag-home — the third self-describing axis: WHERE a bag's bytes rest.
 *
 * The property that earns the axis its existence: it is ORTHOGONAL to the cap-tier. Two bags at the same
 * tier want opposite homes, so no tier can decide one. These pin that, pin the fail-closed default and the
 * asymmetry behind it, and pin the two REFUSALS the resolver makes rather than guessing — an unconfigured
 * repository, and a ley plane that has no local directory by construction.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */
import { describe, test, expect } from "vitest";
import {
  BAG_HOMES, DEFAULT_BAG_HOME, isBagHome, parseBagHome, resolveBagHomeDir,
  bagHomeRestsOnDisk, bagHomeTravelsWithAClone, type BagHome,
} from "../src/bag-home.js";
import { DEFAULT_CAP_TIER, parseCapTier } from "../src/cap-tier.js";

const CANON = { id: "canon", root: "/repos/canon", vcs: "git" } as const;
const ROOTS = { hearth: "/state", repositories: new Map([["canon", CANON]]) };

describe("the axis reads as data, and fail-closes to the recoverable failure", () => {
  test("the three homes stand, and nothing else parses into them", () => {
    expect([...BAG_HOMES].sort()).toEqual(["hearth", "ley", "repository"]);
    for (const h of BAG_HOMES) expect(isBagHome(h)).toBe(true);
    expect(isBagHome("corpus")).toBe(false);       // the earlier name reads as no home at all
    expect(isBagHome(2)).toBe(false);
  });

  test("★ an absent or TORN declaration reads HEARTH — the only failure that recovers ★", () => {
    // A mis-defaulted `repository` writes a private thing into a history somebody may already have pushed; a
    // mis-defaulted `ley` gives a durable thing no durable home. Only a wrong `hearth` merely fails to share.
    expect(DEFAULT_BAG_HOME).toBe("hearth");
    for (const torn of [undefined, null, "", "  ", "REPO", "corpus", 7, {}]) {
      expect(parseBagHome(torn)).toBe("hearth");
    }
  });

  test("a hand-written declaration folds case and trims — a human writes this into a manifest", () => {
    expect(parseBagHome(" Repository ")).toBe("repository");
    expect(parseBagHome("LEY")).toBe("ley");
  });
});

describe("★ the axis stands ORTHOGONAL to the cap-tier — the pair that proves it ★", () => {
  test("two equally-PUBLIC bags want opposite homes, so no tier can decide one", () => {
    // The canon memes and the Nexus seal read the same on the tier axis. One belongs in a tracked tree a
    // clone carries; the other must never enter one. That is the whole argument for a third axis.
    const memes = { tier: parseCapTier("public"), home: parseBagHome("repository") };
    const seal  = { tier: parseCapTier("public"), home: parseBagHome("hearth") };
    expect(memes.tier).toBe(seal.tier);
    expect(memes.home).not.toBe(seal.home);
    expect(bagHomeTravelsWithAClone(memes.home)).toBe(true);
    expect(bagHomeTravelsWithAClone(seal.home)).toBe(false);
  });

  test("the two defaults fail closed on their OWN axes, and neither implies the other", () => {
    expect(DEFAULT_CAP_TIER).toBe("veil");         // fewest readers
    expect(DEFAULT_BAG_HOME).toBe("hearth");       // the recoverable home
  });
});

describe("the resolver holds the one mapping, and refuses rather than guessing", () => {
  test("hearth always resolves — a vessel that stands at all stands a state home", () => {
    expect(resolveBagHomeDir("hearth", ROOTS)).toEqual({ ok: true, home: "hearth", dir: "/state" });
  });

  test("repository resolves through the REGISTERED id — a bag names WHAT, the vessel resolves WHERE", () => {
    expect(resolveBagHomeDir("repository", ROOTS, "canon")).toEqual({ ok: true, home: "repository", dir: "/repos/canon" });
  });

  test("★ an UNREGISTERED id REFUSES — inventing a tree is the failure this axis prevents ★", () => {
    const r = resolveBagHomeDir("repository", { hearth: "/state" }, "canon");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.why).toMatch(/no repo registered/);
  });

  test("★ a repository home NAMING no repo refuses — no path ever rides a declaration ★", () => {
    const r = resolveBagHomeDir("repository", ROOTS);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.why).toMatch(/NAMES none/);
  });

  test("★ a LEY bag resolves to NO directory by construction — the model speaking, never a gap ★", () => {
    // Handing back a path would invite a caller to write one, and a plane that lives while the mesh carries
    // it has no local original to write.
    const r = resolveBagHomeDir("ley", ROOTS);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.why).toMatch(/nowhere durable/);
    expect(bagHomeRestsOnDisk("ley")).toBe(false);
  });

  test("every home resolves totally — no home falls through unhandled", () => {
    for (const h of BAG_HOMES) {
      const r = resolveBagHomeDir(h as BagHome, ROOTS, "canon");
      expect(typeof r.ok).toBe("boolean");
      expect(r.home).toBe(h);
    }
  });

  test("the two on-disk homes rest on disk; only the repository travels with a clone", () => {
    expect(bagHomeRestsOnDisk("hearth")).toBe(true);
    expect(bagHomeRestsOnDisk("repository")).toBe(true);
    expect(bagHomeTravelsWithAClone("hearth")).toBe(false);
    expect(bagHomeTravelsWithAClone("ley")).toBe(false);
  });
});
