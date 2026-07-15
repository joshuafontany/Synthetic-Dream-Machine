/**
 * M1 — the identity home resolves under XDG state (reset-safe), and a legacy identity dir
 * migrates onto it so an install predating the state home keeps its sovereign key.
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { larIdentityDir } from "../src/vessel-paths.js";
import { loadVesselVerifyingKey } from "../src/node-vessel-identity.js";

const saved: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
}

describe("identity home (M1)", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-identity-home-"));
    setEnv("LAR_ROOT", undefined);          // exercise the real XDG arm, not the isolated one
    setEnv("XDG_STATE_HOME", join(root, "state"));
    setEnv("XDG_DATA_HOME", join(root, "data"));
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("larIdentityDir resolves under XDG state home", () => {
    expect(larIdentityDir()).toBe(join(root, "state", "lares", "identity"));
  });

  test("a legacy <data>/.lararium-identity dir migrates onto the state home", async () => {
    const dataDir = join(root, "data", "lares", "vessel");     // <data>/vessel
    const legacy = join(root, "data", "lares", ".lararium-identity"); // its sibling
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, ".vessel-key.json"), JSON.stringify({ verifyingKey: "ab", signingKey: "cd" }));

    // Any loader routes through identityDir(), which triggers the one-time migration.
    // The read itself may reject (the key file name keys off git login) — the MOVE still fires.
    try { await loadVesselVerifyingKey(dataDir); } catch { /* the move is the assertion */ }

    const home = larIdentityDir();
    expect(existsSync(home)).toBe(true);
    expect(existsSync(join(home, ".vessel-key.json"))).toBe(true);
    expect(existsSync(legacy)).toBe(false); // moved, not copied
  });

  test("migration is a no-op when the home already holds a key", async () => {
    const dataDir = join(root, "data", "lares", "vessel");
    const legacy = join(root, "data", "lares", ".lararium-identity");
    const home = larIdentityDir();
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, ".vessel-key.json"), JSON.stringify({ verifyingKey: "home", signingKey: "home" }));
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, ".vessel-key.json"), JSON.stringify({ verifyingKey: "legacy", signingKey: "legacy" }));

    try { await loadVesselVerifyingKey(dataDir); } catch { /* ignore read */ }

    // The home key stays; the legacy dir is NOT consumed (home present → short-circuit).
    expect(existsSync(legacy)).toBe(true);
    expect(JSON.parse(String(readFileSync(join(home, ".vessel-key.json")))).verifyingKey).toBe("home");
  });
});
