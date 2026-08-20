/**
 * bag-declare — a bag's declaration on disk, the operator's repo registry, and the MOVE.
 *
 * These hold the disk-side properties the pure layer cannot:
 *   · a bag with NO declaration reads at the fail-closed default rather than throwing,
 *   · the registry maps IDs to roots and nothing infers a repo from a checkout,
 *   · a move RELOCATES the bytes and RE-ANCHORS the declaration together, refuses an occupied destination,
 *     and never reaches the filesystem when the target does not resolve.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readBagManifest, writeBagManifest, surveyBags, moveBagHome,
  readRepoRegistry, registerRepo, unregisterRepo, bagHomeRoots, iamTableFromBody,
} from "../src/bag-declare.js";
import { laresDataHome } from "../src/vessel-paths.js";

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};

describe("bag-declare — the disk shore", () => {
  let root: string;
  let corpus: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-bagdecl-"));
    setEnv("LAR_ROOT", root);
    setEnv("XDG_STATE_HOME", join(root, "xdgstate"));
    setEnv("XDG_DATA_HOME", join(root, "xdgstate"));   // identity/seal/library answer HERE
    corpus = join(root, "corpus");
    mkdirSync(join(corpus, "@lares"), { recursive: true });
    mkdirSync(join(corpus, "@nexus"), { recursive: true });
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("★ a bag with NO declaration reads the fail-closed default, never a throw ★", () => {
    const m = readBagManifest(join(corpus, "@lares"), "@lares");
    expect(m).toEqual({ bag: "@lares", tier: "veil", home: "hearth" });
  });

  test("a written declaration round-trips through the iam block", () => {
    writeBagManifest(join(corpus, "@lares"), { bag: "@lares", tier: "public", home: "repository", repository: "canon" });
    const back = readBagManifest(join(corpus, "@lares"), "@lares");
    expect(back).toMatchObject({ bag: "@lares", tier: "public", home: "repository", repository: "canon" });
  });

  test("★ the written declaration carries the repo ID and NO path ★", () => {
    registerRepo({ id: "canon", root: corpus, vcs: "git" });
    writeBagManifest(join(corpus, "@lares"), { bag: "@lares", tier: "public", home: "repository", repository: "canon" });
    const wire = readFileSync(join(corpus, "@lares", "iam.mem"), "utf8");
    expect(wire).toContain('repository = "canon"');
    expect(wire).not.toContain(corpus);       // the root stays local to the vessel that resolved it
  });

  test("a TORN iam block reads the default rather than a partial guess into a home", () => {
    writeFileSync(join(corpus, "@lares", "iam.mem"), "```toml iam\nnot a table ][\n```\n", "utf8");
    expect(readBagManifest(join(corpus, "@lares"), "@lares").home).toBe("hearth");
  });

  test("the shallow iam parser reads flat scalars and ignores everything else", () => {
    const t = iamTableFromBody('```toml iam\nhome      = "ley"\ncount = 3\n```\n');
    expect(t["home"]).toBe("ley");
    expect(t["count"]).toBeUndefined();       // non-string values simply do not appear
  });
});

describe("the repo registry — IDs, never paths", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-bagrepo-"));
    setEnv("LAR_ROOT", root);
    setEnv("XDG_STATE_HOME", join(root, "xdgstate"));
    setEnv("XDG_DATA_HOME", join(root, "xdgstate"));   // identity/seal/library answer HERE
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("★ an absent registry reads EMPTY — a vessel with no repos is an ordinary vessel ★", () => {
    expect(readRepoRegistry().size).toBe(0);
    expect(bagHomeRoots().repositories?.size).toBe(0);
  });

  test("register → read back by id; re-registering re-points rather than duplicating", () => {
    registerRepo({ id: "canon", root: "/a", vcs: "git" });
    registerRepo({ id: "canon", root: "/b", vcs: "other" });
    const all = readRepoRegistry();
    expect(all.size).toBe(1);
    expect(all.get("canon")).toEqual({ id: "canon", root: "/b", vcs: "other" });
  });

  test("★ dropping an id leaves bags naming it DECLARED but unresolvable HERE — never broken ★", () => {
    registerRepo({ id: "canon", root: "/a", vcs: "git" });
    unregisterRepo("canon");
    expect(readRepoRegistry().has("canon")).toBe(false);
    // The declaration is untouched; only this vessel's ability to place it changed.
  });

  test("the hearth root always stands, so hearth-homed bags always place", () => {
    // THE CRITERION IS WHOSE IT IS. A hearth bag holds what a Lar authored, so it stands in the
    // SPIRITS' house beside the identity and the seal. The house's own things — the acquired shelf,
    // the sensoriums — stand at `<lararium>`, and the state home keeps watermarks alone.
    expect(bagHomeRoots().hearth).toBe(join(laresDataHome(), "bags"));
  });
});

describe("surveyBags + moveBagHome — the drift surface and the act", () => {
  let root: string;
  let corpus: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-bagmove-"));
    setEnv("LAR_ROOT", root);
    setEnv("XDG_STATE_HOME", join(root, "xdgstate"));
    setEnv("XDG_DATA_HOME", join(root, "xdgstate"));   // identity/seal/library answer HERE
    corpus = join(root, "corpus");
    mkdirSync(join(corpus, "@lares"), { recursive: true });
    writeFileSync(join(corpus, "@lares", "a.mem"), "content", "utf8");
    registerRepo({ id: "canon", root: corpus, vcs: "git" });
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("★ an UNDECLARED bag sitting in a repo reads ADRIFT — the mismatch finally has a surface ★", () => {
    // Exactly the condition that let a Nexus seal live in a repository: nothing lying, nothing checked.
    const [seen] = surveyBags(corpus);
    expect(seen?.bag).toBe("@lares");
    expect(seen?.adrift).toBe(true);
    expect(seen?.manifest.home).toBe("hearth");   // what it defaults to, against where it sits
  });

  test("declaring the truth clears the drift, without moving a byte", () => {
    writeBagManifest(join(corpus, "@lares"), { bag: "@lares", tier: "public", home: "repository", repository: "canon" });
    const [seen] = surveyBags(corpus);
    expect(seen?.adrift).toBe(false);
    expect(existsSync(join(corpus, "@lares", "a.mem"))).toBe(true);
  });

  test("★ a MOVE relocates the bytes AND re-anchors the declaration, together ★", () => {
    const [seen] = surveyBags(corpus);
    const out = moveBagHome(seen!, { home: "hearth" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(existsSync(join(corpus, "@lares"))).toBe(false);          // the bytes left
    expect(readFileSync(join(out.to, "a.mem"), "utf8")).toBe("content");
    expect(readBagManifest(out.to, "@lares").home).toBe("hearth");   // and the declaration followed
  });

  test("★ an UNRESOLVABLE target never reaches the filesystem ★", () => {
    const [seen] = surveyBags(corpus);
    const out = moveBagHome(seen!, { home: "repository", repository: "nowhere" });
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.why).toMatch(/no repo registered/);
    expect(existsSync(join(corpus, "@lares", "a.mem"))).toBe(true);  // untouched
  });

  test("★ a LEY move refuses — a plane that lives while the mesh carries it has nowhere to be put ★", () => {
    const [seen] = surveyBags(corpus);
    const out = moveBagHome(seen!, { home: "ley" });
    expect(out.ok).toBe(false);
    expect(existsSync(join(corpus, "@lares", "a.mem"))).toBe(true);
  });

  test("★ an OCCUPIED destination REFUSES rather than merging two bags of one name ★", () => {
    const hearthBags = bagHomeRoots().hearth;
    mkdirSync(join(hearthBags, "@lares"), { recursive: true });
    writeFileSync(join(hearthBags, "@lares", "other.mem"), "someone else", "utf8");
    const [seen] = surveyBags(corpus);
    const out = moveBagHome(seen!, { home: "hearth" });
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.why).toMatch(/already stands/);
    expect(readFileSync(join(hearthBags, "@lares", "other.mem"), "utf8")).toBe("someone else");
  });

  test("moving a bag already at its destination RE-ANCHORS it without touching bytes", () => {
    writeBagManifest(join(corpus, "@lares"), { bag: "@lares", tier: "public", home: "hearth" });
    const [seen] = surveyBags(corpus);
    const out = moveBagHome(seen!, { home: "repository", repository: "canon" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.to).toBe(join(corpus, "@lares"));
    expect(readBagManifest(out.to, "@lares")).toMatchObject({ home: "repository", repository: "canon", tier: "public" });
    expect(surveyBags(corpus)[0]?.adrift).toBe(false);
  });
});
