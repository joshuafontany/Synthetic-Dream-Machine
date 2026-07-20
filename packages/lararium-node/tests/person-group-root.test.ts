/**
 * persona-group-root.test.ts — PersonaGroup-root key custody (operator-root capability, Phase 0.2).
 *
 * Proves the custody helper the meshed founding consumes: a founder-only root key,
 * minted once and loaded idempotently, persisted into the wipe-safe `.lararium-identity/`
 * sibling, and — the load-bearing assertion — a DISTINCT capability from the per-vessel
 * device key (two capabilities in the #has-stack, never numbered planes). The seed
 * surfaces founder-only and throws when absent.
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import {
  generateOrLoadPersonaGroupRoot,
  loadPersonaGroupRootSeed,
  generateOrLoadVesselIdentity,
} from "../src/node-vessel-identity.js";

const freshDataDir = (): string => join(mkdtempSync(join(tmpdir(), "lares-pgroot-")), ".lararium");
const idDirOf = (dataDir: string): string => join(dirname(dataDir), ".lararium-identity");
const find = (idDir: string, prefix: string): string | undefined =>
  readdirSync(idDir).find((f) => f.startsWith(prefix));

describe("PersonaGroup-root custody (operator-root capability — genesis Phase 0.2)", () => {
  it("mints a fresh root into the wipe-safe sibling dir, NOT the .lararium wipe zone", async () => {
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
