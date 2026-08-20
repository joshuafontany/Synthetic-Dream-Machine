/**
 * M1 — the identity home resolves in the SPIRITS' house (reset-safe), the ONE resolver. No migration
 * arm and no second spelling: an empty home re-derives a fresh device key.
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

  test("larIdentityDir resolves in the spirits' house — beside the seal", () => {
    // THE CRITERION IS WHOSE IT IS. A Lar's keys ARE that Lar, so the sovereign root belongs to the
    // SPIRITS and stands at `<lares>/identity`, beside the Nexus seal. What belongs to the HOUSE — the
    // acquired shelf, the sensoriums — stands at `<lararium>`. `reset` spares identity by targeting the
    // vessel SUBDIR, so the two sit as siblings and never as parent and child.
    expect(larIdentityDir()).toBe(join(root, "data", "lares", "identity"));
  });

  test("ONE address answers — a key sitting anywhere else stays unread and untouched", async () => {
    const dataDir = join(root, "data", "lares", "vessel");
    const elsewhere = join(root, "data", "lares", ".lararium-identity"); // a sibling that is not the home
    mkdirSync(elsewhere, { recursive: true });
    writeFileSync(join(elsewhere, ".vessel-key.json"), JSON.stringify({ verifyingKey: "x", signingKey: "x" }));

    // A read routes through identityDir() and nowhere else. A key outside that address never gets
    // consulted or consumed — an empty home re-derives a fresh one instead.
    try { await loadVesselVerifyingKey(dataDir); } catch { /* a fresh home may reject the read; the point is no migration */ }

    expect(existsSync(elsewhere)).toBe(true);                    // left untouched — never moved
    expect(existsSync(join(elsewhere, ".vessel-key.json"))).toBe(true);
  });
});
