/**
 * env-corpus-root — the corpus-root siting law (env.ts resolveLarRoot / composable resource caps).
 *
 * No silent global-tree default: an unconfigured root throws a CLEAN error; explicit LAR_ROOT siting
 * wins; the named repo dev-preset opts in. The resource caps (bags · wikis · genesis · cas) site
 * INDEPENDENTLY — each derives off the corpus root, each overrides on its own env var.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  resolveLarRoot, repoPresetEnabled,
  larRoot, larBagsDir, larWikisDir, larGenesisDir, larCasDir, larBootstrapPath, larDataDir,
} from "../src/env.js";

const REPO = "/tmp/fake-repo";

describe("resolveLarRoot — the siting law", () => {
  test("unconfigured (no LAR_ROOT, preset off) throws a clean error, no silent repo fallback", () => {
    expect(() => resolveLarRoot({ larRootEnv: undefined, presetEnabled: false, repoRoot: REPO }))
      .toThrow(/no corpus root sited/);
  });

  test("the named dev-preset opts the repo in", () => {
    expect(resolveLarRoot({ larRootEnv: undefined, presetEnabled: true, repoRoot: REPO })).toBe(REPO);
  });

  test("explicit LAR_ROOT siting wins over the preset", () => {
    expect(resolveLarRoot({ larRootEnv: "/srv/daemon-a", presetEnabled: true, repoRoot: REPO }))
      .toBe("/srv/daemon-a");
  });
});

describe("repoPresetEnabled — the named opt-in", () => {
  const KEY = "LAR_DEV_REPO_ROOT";
  let saved: string | undefined;
  beforeEach(() => { saved = process.env[KEY]; });
  afterEach(() => { if (saved === undefined) delete process.env[KEY]; else process.env[KEY] = saved; });

  test("the LAR_DEV_REPO_ROOT env switch enables the preset", () => {
    process.env[KEY] = "1";
    expect(repoPresetEnabled()).toBe(true);
  });
});

describe("composable resource caps — independent siting off the corpus root", () => {
  const KEYS = ["LAR_ROOT", "LAR_BAGS", "LAR_WIKIS", "LAR_GENESIS", "LAR_CAS"] as const;
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => { for (const k of KEYS) saved[k] = process.env[k]; process.env["LAR_ROOT"] = "/corpus"; });
  afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]!; } });

  test("each CORPUS resource derives off the corpus root when unset", () => {
    for (const k of ["LAR_BAGS", "LAR_WIKIS", "LAR_GENESIS", "LAR_CAS"]) delete process.env[k];
    expect(larRoot()).toBe("/corpus");
    expect(larBagsDir()).toBe(join("/corpus", "bags"));
    expect(larWikisDir()).toBe(join("/corpus", "wikis"));
    expect(larGenesisDir()).toBe(join("/corpus", "genesis"));
    // The bootstrap does NOT follow the corpus — it names ONE VESSEL, so it sits with the store that
    // holds the docs it addresses, and dies with them on a reset (same law as the CAS, below).
    expect(larBootstrapPath()).toBe(join(larDataDir(), "social-bootstrap.json"));
    expect(larBootstrapPath()).not.toBe(join("/corpus", "genesis", "social-bootstrap.json"));
  });

  test("the CAS roots off the VESSEL-STATE home, never the corpus — it carries state, not corpus", () => {
    // The CAS holds runtime vessel state whose blobs rebuild from the `bags/` carriers at each seed, so
    // it stays OUT of the tracked tree that `bags`/`wikis`/`genesis` sit in. A corpus root must not drag
    // it along; only its own override moves it.
    for (const k of ["LAR_BAGS", "LAR_WIKIS", "LAR_GENESIS", "LAR_CAS"]) delete process.env[k];
    expect(larCasDir()).toBe(join(larDataDir(), "cas"));
    // It sits BESIDE the store under the vessel-state home, never as a sibling of bags/wikis/genesis.
    expect(larCasDir()).not.toBe(join("/corpus", "cas"));
    expect(larCasDir().startsWith(larDataDir())).toBe(true);
  });

  test("each resource overrides INDEPENDENTLY on its own env var", () => {
    process.env["LAR_BAGS"] = "/mnt/bags";
    process.env["LAR_GENESIS"] = "/mnt/seed";
    expect(larBagsDir()).toBe("/mnt/bags");
    expect(larGenesisDir()).toBe("/mnt/seed");
    expect(larWikisDir()).toBe(join("/corpus", "wikis"));   // untouched → still derives
    // LAR_GENESIS moves the SEED alone. The address book stays with the vessel it names — a seed can be
    // shared or re-sited freely precisely because no vessel identity rides inside it.
    expect(larBootstrapPath()).toBe(join(larDataDir(), "social-bootstrap.json"));
  });
});
