/**
 * true-name-model.test — the node-side witness that the founding subsequence keeps the VESSEL key
 * and the PERSONA ROOT apart, and binds them with a signed edge that names the PLACE.
 *
 * The invariant under test (node-vessel-identity states it in full):
 *   · the VESSEL key belongs to the PLACE — minted per-install, never copied to another vessel;
 *   · the PERSONA ROOT belongs to the HUMAN — a DISTINCT key in its own slot, never the vessel seed;
 *   · the v2 DELEGATION EDGE binds them without merging them, carrying the hearth's True Name as P
 *     in "Operator O delegates to Device D AT PLACE P".
 *
 * Runs the exact subsequence `lares init` executes (commands/init.ts: generateOrLoadVesselIdentity →
 * generateOrLoadPersonaGroupRoot → loadPersonaGroupRootSeed → buildDeviceDelegation) over a temp XDG
 * state home — no founding, no daemon, no ceremony repo. The browser twin lives at
 * browser/tests/browser-persona-vault.test.ts; this closes the node side.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDeviceDelegation, verifyDeviceDelegation } from "@lararium/mesh";
import {
  generateOrLoadVesselIdentity,
  generateOrLoadPersonaGroupRoot,
  loadPersonaGroupRootSeed,
  loadPersonaGroupRootVerifyingKey,
  loadVesselVerifyingKey,
  loadVesselSigningSeed,
} from "../src/node-vessel-identity.js";

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};

/** The hearth's True Name stands in as the genesis engine CID `lares init` reads off disk. */
const HEARTH_TRUE_NAME = "bafyTestHearthTrueName";

describe("the True Name Model — vessel, persona root, and the edge that binds them", () => {
  let root: string;
  const dataDir = () => root;   // the identity store resolves under XDG state; dataDir rides the contract

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-truename-"));
    setEnv("LAR_ROOT", undefined);
    setEnv("XDG_STATE_HOME", join(root, "state"));
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("founding mints TWO distinct keys — the place's and the human's", async () => {
    await generateOrLoadVesselIdentity(dataDir());
    const vesselKey = await loadVesselVerifyingKey(dataDir());
    const personaRoot = await generateOrLoadPersonaGroupRoot(dataDir());

    expect(personaRoot.created).toBe(true);
    // The two never share bytes — the persona root derives from its own CSPRNG draw, never the vessel seed.
    expect(personaRoot.verifyingKey).not.toBe(vesselKey);
    const vesselSeed  = await loadVesselSigningSeed(dataDir());
    const personaSeed = await loadPersonaGroupRootSeed(dataDir());
    expect(Buffer.from(personaSeed).toString("hex")).not.toBe(Buffer.from(vesselSeed).toString("hex"));
  });

  test("the read-only accessor surfaces the human's face without minting one", async () => {
    // Before any root stands, the accessor READS nothing — a read never stands a sovereign key up.
    expect(await loadPersonaGroupRootVerifyingKey(dataDir())).toBeUndefined();

    const minted = await generateOrLoadPersonaGroupRoot(dataDir());
    expect(await loadPersonaGroupRootVerifyingKey(dataDir())).toBe(minted.verifyingKey);
    // A second handle-index still holds nothing — the accessor never widens custody by being called.
    expect(await loadPersonaGroupRootVerifyingKey(dataDir(), 1)).toBeUndefined();
  });

  test("the persona root SIGNS the edge that binds the vessel to the hearth's True Name", async () => {
    await generateOrLoadVesselIdentity(dataDir());
    const vesselKey   = await loadVesselVerifyingKey(dataDir());
    const personaRoot = await generateOrLoadPersonaGroupRoot(dataDir());
    const signerSeed  = await loadPersonaGroupRootSeed(dataDir());

    const issuedAt  = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    const edge = await buildDeviceDelegation({
      personaRootSeed:       signerSeed,          // the HUMAN's root signs
      deviceVerifyingKey: vesselKey,           // the PLACE's key delegates
      hearthTrueName:     HEARTH_TRUE_NAME,    // the place this binds TO
      issuedAt, expiresAt, boundEpoch: 0,
    });

    // The edge chains to the persona root, delegates the vessel, and names the hearth.
    expect(edge.personaRootDid).toBe(`0x${personaRoot.verifyingKey}`);
    expect(edge.deviceDid).toBe(`0x${vesselKey}`);
    expect(edge.hearthTrueName).toBe(HEARTH_TRUE_NAME);
    // Never the self-signed floor: signer and delegate stand apart.
    expect(edge.personaRootDid).not.toBe(edge.deviceDid);

    // A peer pinning the persona root clears it.
    await expect(verifyDeviceDelegation(edge, `0x${personaRoot.verifyingKey}`, { now: Date.now() }))
      .resolves.toMatchObject({ ok: true });
  });

  test("pinning the VESSEL key REFUSES the edge — the two names never substitute", async () => {
    await generateOrLoadVesselIdentity(dataDir());
    const vesselKey  = await loadVesselVerifyingKey(dataDir());
    await generateOrLoadPersonaGroupRoot(dataDir());
    const signerSeed = await loadPersonaGroupRootSeed(dataDir());

    const issuedAt  = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    const edge = await buildDeviceDelegation({
      personaRootSeed: signerSeed, deviceVerifyingKey: vesselKey,
      hearthTrueName: HEARTH_TRUE_NAME, issuedAt, expiresAt, boundEpoch: 0,
    });

    // The confused-deputy guard in identity form: a verifier that pins the PLACE where the HUMAN
    // belongs gets a clean refusal, never an ambient pass.
    await expect(verifyDeviceDelegation(edge, `0x${vesselKey}`, { now: Date.now() }))
      .resolves.toMatchObject({ ok: false, reason: "operator is not the pinned root" });
  });

  test("a re-read of the vessel key loads the SAME place — founding never re-mints it", async () => {
    const first = await generateOrLoadVesselIdentity(dataDir());
    const again = await generateOrLoadVesselIdentity(dataDir());
    expect(again.verifyingKey).toBe(first.verifyingKey);
    // The persona root is idempotent per index the same way — a second call loads, never mints.
    const minted = await generateOrLoadPersonaGroupRoot(dataDir());
    const loaded = await generateOrLoadPersonaGroupRoot(dataDir());
    expect(minted.created).toBe(true);
    expect(loaded.created).toBe(false);
    expect(loaded.verifyingKey).toBe(minted.verifyingKey);
  });
});
