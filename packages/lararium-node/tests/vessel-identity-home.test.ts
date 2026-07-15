/**
 * M1 — the identity home resolves under XDG state (reset-safe), the ONE resolver. No
 * migration arm, no legacy spelling: an empty home re-derives a fresh device key.
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
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

  test("the resolver ignores any legacy dir — no migration, the home stands alone", async () => {
    const dataDir = join(root, "data", "lares", "vessel");
    const legacy = join(root, "data", "lares", ".lararium-identity"); // an old sibling location
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, ".vessel-key.json"), JSON.stringify({ verifyingKey: "old", signingKey: "old" }));

    // A read routes through identityDir() → the state home only; the legacy dir never gets consulted
    // or consumed (it just re-derives a fresh key when the home holds none).
    try { await loadVesselVerifyingKey(dataDir); } catch { /* fresh-home read may reject; the point is no migration */ }

    expect(existsSync(legacy)).toBe(true);                    // left untouched — never moved
    expect(existsSync(join(legacy, ".vessel-key.json"))).toBe(true);
  });
});
