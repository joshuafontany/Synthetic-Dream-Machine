/**
 * persona-group-root.test.ts — PersonaGroup-root key custody (operator-root capability, Phase 0.2).
 *
 * Proves the custody helper the meshed founding consumes: a founder-only root key, minted once and
 * loaded idempotently, persisted into `<lares>/identity` — a SIBLING of the substrate a rite reforges,
 * never a child of it — and, the load-bearing assertion, a DISTINCT capability from the per-vessel
 * device key (two capabilities in the #has-stack, never numbered planes). The seed surfaces
 * founder-only and throws when absent.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import {
  generateOrLoadPersonaGroupRoot,
  loadPersonaGroupRootSeed,
  generateOrLoadVesselIdentity,
} from "../src/node-vessel-identity.js";
import { larIdentityDir } from "../src/vessel-paths.js";

const freshDataDir = (): string => join(mkdtempSync(join(tmpdir(), "lares-pgroot-")), ".lararium");
/** The identity dir answers to `larIdentityDir()` — `<state>/identity`, beside the wiped `<lares>/vessel`. */
const idDirOf = (_dataDir: string): string => larIdentityDir();
const find = (idDir: string, prefix: string): string | undefined =>
  readdirSync(idDir).find((f) => f.startsWith(prefix));

describe("PersonaGroup-root custody (operator-root capability — genesis Phase 0.2)", () => {
  // `LAR_ROOT` reroots every lares home, so a mint here never reads or writes the operator's OWN root
  // key — a founder-only capability must never be touched by a test run.
  let larRoot: string;
  let priorRoot: string | undefined;
  beforeEach(() => {
    priorRoot = process.env["LAR_ROOT"];
    larRoot = mkdtempSync(join(tmpdir(), "lares-pgroot-root-"));
    process.env["LAR_ROOT"] = larRoot;
  });
  afterEach(() => {
    if (priorRoot === undefined) delete process.env["LAR_ROOT"];
    else process.env["LAR_ROOT"] = priorRoot;
    rmSync(larRoot, { recursive: true, force: true });
  });

  it("mints a fresh root into the identity dir — a sibling of the substrate, never inside it", async () => {
    const dataDir = freshDataDir();
    try {
      const root = await generateOrLoadPersonaGroupRoot(dataDir);
      expect(root.created, "first call mints").toBe(true);
      expect(root.verifyingKey).toMatch(/^[0-9a-f]{64}$/);

      const idDir = idDirOf(dataDir);
      expect(find(idDir, ".persona-group-root"), "root file in identity dir").toBeTruthy();
      // structurally outside any reset/rebuild that rmSyncs `<root>/.lararium`
      expect(existsSync(join(dataDir, find(idDir, ".persona-group-root")!))).toBe(false);
    } finally {
      rmSync(dirname(dataDir), { recursive: true, force: true });
    }
  });

  it("loads idempotently — a second call returns the SAME key, created:false", async () => {
    const dataDir = freshDataDir();
    try {
      const first  = await generateOrLoadPersonaGroupRoot(dataDir);
      const second = await generateOrLoadPersonaGroupRoot(dataDir);
      expect(second.created).toBe(false);
      expect(second.verifyingKey).toBe(first.verifyingKey);
    } finally {
      rmSync(dirname(dataDir), { recursive: true, force: true });
    }
  });

  it("the root is a DISTINCT capability from the per-vessel device key (not numbered planes)", async () => {
    const dataDir = freshDataDir();
    try {
      const vessel = await generateOrLoadVesselIdentity(dataDir);
      const root   = await generateOrLoadPersonaGroupRoot(dataDir);
      expect(root.verifyingKey).not.toBe(vessel.verifyingKey); // the split actually splits
    } finally {
      rmSync(dirname(dataDir), { recursive: true, force: true });
    }
  });

  it("loadPersonaGroupRootSeed returns the 32-byte seed founder-only, throws when absent", async () => {
    const dataDir = freshDataDir();
    try {
      await expect(loadPersonaGroupRootSeed(dataDir)).rejects.toThrow(/no persona-root/);
      await generateOrLoadPersonaGroupRoot(dataDir);
      const seed = await loadPersonaGroupRootSeed(dataDir);
      expect(seed).toBeInstanceOf(Uint8Array);
      expect(seed.length).toBe(32);
    } finally {
      rmSync(dirname(dataDir), { recursive: true, force: true });
    }
  });
});
