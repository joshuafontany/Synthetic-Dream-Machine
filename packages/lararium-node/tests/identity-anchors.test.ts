/**
 * M2 — the veiled-Handle anchors round-trip through the sovereign identity home, so a
 * substrate rebirth can re-read the SAME PersonaGroup/MeshCabal ids + agentId.
 */
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { larIdentityDir } from "../src/vessel-paths.js";
import { persistIdentityAnchors, loadIdentityAnchors, persistIdentityArchive, loadIdentityArchive, type IdentityAnchors } from "../src/identity-anchors.js";

const saved: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
}

describe("identity anchors (M2)", () => {
  let root: string;
  const anchors: IdentityAnchors = {
    personaGroupDocIdHex:   "aa11",
    meshCabalDocIdHex:      "bb22",
    personaGroupAgentIdHex: "cc33",
  };
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-anchors-"));
    setEnv("LAR_ROOT", undefined);
    setEnv("XDG_STATE_HOME", join(root, "state"));
    setEnv("XDG_DATA_HOME", join(root, "state"));   // identity/seal/library answer HERE
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("persists into the identity home and reads back identically", () => {
    expect(loadIdentityAnchors()).toBeNull();               // nothing yet
    persistIdentityAnchors(anchors);
    expect(existsSync(join(larIdentityDir(), "anchors-h0.json"))).toBe(true);
    expect(loadIdentityAnchors()).toEqual(anchors);
  });

  test("an incomplete anchors file reads as null (never a partial Handle)", () => {
    persistIdentityAnchors(anchors);
    // Overwrite with a partial record.
    writeFileSync(join(larIdentityDir(), "anchors-h0.json"), JSON.stringify({ personaGroupDocIdHex: "aa11" }));
    expect(loadIdentityAnchors()).toBeNull();
  });

  test("the keyhive archive round-trips through the identity home (M3)", () => {
    expect(loadIdentityArchive()).toBeNull();
    const bytes = Uint8Array.from([0x85, 0x6f, 0x4a, 0x83, 0x01, 0x02, 0x03]);
    persistIdentityArchive(bytes);
    expect(existsSync(join(larIdentityDir(), "keyhive-archive.bin"))).toBe(true);
    expect(Array.from(loadIdentityArchive() ?? [])).toEqual(Array.from(bytes));
  });
});
