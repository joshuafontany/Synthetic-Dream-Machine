/**
 * bulb-kindle.test.ts — the BULB cap: a Herm serves a HELD cold-boot snapshot; a cold device kindles a SOVEREIGN hearth.
 *
 * End-to-end, headless, every crypto piece real:
 *   1. SERVE + PULL — a Herm serves the bulb by cid over the PUBLIC floor (`/bulb/*`); a cold device pulls it and
 *      `assembleBulb` re-verifies `sha256(bytes) == cid` on every blob (content-address integrity, secret-free).
 *   2. KINDLE — the cold device materializes the @oracle island from the bulb's genesis, mints its OWN Ed25519, and
 *      builds the ceremony on THAT key → the kindled hearth's did:key derives from the DEVICE's own key.
 *   3. SERVE FIRE, NEVER KEY (KAPU, by placement) — the bulb carries NO signing key; two devices kindling the SAME
 *      bulb become two DISTINCT sovereigns (distinct did:keys). The Herm's process never touches either identity.
 *
 * REVERT-VERIFY (manual, in the handback): source the ceremony key from the bulb (Herm-supplied) → both devices
 * collapse to ONE did → the `did1 !== did2` guard fails. Key minted ON the cold device is what that guard pins.
 *
 * Gate: lar:///ha.ka.ba/lararium/node/bulb#kindle
 */
import { afterEach, describe, test, expect } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Repo } from "@automerge/automerge-repo";
import {
  buildGenesisDoc, didKeyFromVerifyingKey, identityTiddlerUri,
  LARES_MEMETIC_WIKITEXT_PLUGIN_URI, sha256HexBytesSync, utf8Bytes,
  type GenesisInputs, type LarDoc,
} from "@lararium/mesh";
import { readBulbArtifact, buildBulb, assembleBulb, type BulbArtifact } from "../src/bulb.js";
import { mountBulbReadFace } from "../src/bulb-read-face.js";
import { pullBulb, kindleFromBulb, httpBulbTransport, type KindleResult } from "../src/kindle.js";
import { writeCasEntriesFs } from "../src/node-cas.js";
import { readGenesisSeed, genesisCasDir } from "../src/genesis-artifact.js";

/** A fixture bulb — a fake core blob + a plugin under the Lares plugin id (validateGenesisBytes requires both). */
function fixtureBulb(): BulbArtifact {
  const coreBlob   = utf8Bytes("fake-tw5-core-for-bulb");
  const pluginBlob = utf8Bytes("fake-lares-memetic-wikitext-plugin");
  const inputs: GenesisInputs = {
    actorSeed: "abc123", coreBlob, coreVersion: "5.0.0-test",
    plugins: [{
      id: LARES_MEMETIC_WIKITEXT_PLUGIN_URI, version: "0.1.0",
      sha256: sha256HexBytesSync(pluginBlob), mimeType: "application/json", blob: pluginBlob,
    }],
  };
  const artifact = buildGenesisDoc(inputs);
  return {
    seed: artifact.seed, casManifest: artifact.casManifest, casEntries: artifact.casEntries,
    bootstrap: { note: "all-public boot pointers" }, charterEpochCid: "epoch-fixture-cid",
  };
}

describe("BULB — serve a held snapshot; kindle a sovereign hearth (serve fire, never key)", () => {
  const servers: Server[] = [];
  const repos: Repo[] = [];
  const dirs: string[] = [];
  const mkDir = (t: string): string => { const d = mkdtempSync(join(tmpdir(), `lares-bulb-${t}-`)); dirs.push(d); return d; };
  const newRepo = (): Repo => { const r = new Repo({ sharePolicy: async () => true }); repos.push(r); return r; };
  const priorLarRoot = process.env["LAR_ROOT"];

  // Kindle under a FRESH LAR_ROOT — the vessel identity home is machine-global (a cold device = one machine), so a
  // distinct LAR_ROOT simulates a distinct cold device, each minting its OWN sovereign key. This is the honest bound:
  // two REAL machines (or a Pi) prove the placement in the field; here one process stands in for two devices via env.
  const kindleAsFreshDevice = async (bulb: BulbArtifact, tag: string): Promise<KindleResult> => {
    process.env["LAR_ROOT"] = mkDir(`root-${tag}`);
    try { return await kindleFromBulb({ bulb, repo: newRepo(), storageDir: mkDir(`store-${tag}`) }); }
    finally { if (priorLarRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = priorLarRoot; }
  };

  afterEach(async () => {
    for (const s of servers.splice(0)) await new Promise<void>((r) => s.close(() => r()));
    for (const r of repos.splice(0)) await r.shutdown();
    for (const d of dirs.splice(0)) { try { rmSync(d, { recursive: true, force: true }); } catch { /* gone */ } }
    if (priorLarRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = priorLarRoot;
  });

  test("readBulbArtifact reads a genesis dir; build/assemble round-trips content-addressed", () => {
    const genesisDir = mkDir("gd");
    const bulb = fixtureBulb();
    mkdirSync(genesisCasDir(genesisDir), { recursive: true });
    writeFileSync(join(genesisDir, "island.genesis.json"),  JSON.stringify(bulb.seed));
    writeFileSync(join(genesisDir, "island.manifest.json"), JSON.stringify(bulb.casManifest));
    writeFileSync(join(genesisDir, "social-bootstrap.json"), JSON.stringify(bulb.bootstrap));
    writeCasEntriesFs(bulb.casEntries, genesisCasDir(genesisDir));

    const read = readBulbArtifact(genesisDir, "epoch-fixture-cid");
    expect(read).not.toBeNull();
    expect(read!.charterEpochCid).toBe("epoch-fixture-cid");
    expect(readGenesisSeed(genesisDir)?.format).toBe(bulb.seed.format);

    // buildBulb → assembleBulb re-verifies every blob against its cid.
    const { manifest, blobs } = buildBulb(read!);
    const byCid = new Map(blobs.map((b) => [b.cid, b.bytes]));
    const back = (cid: string): Uint8Array | null => byCid.get(cid) ?? null;
    const reassembled = assembleBulb(manifest, back);
    expect(reassembled.seed.actorSeed).toBe(bulb.seed.actorSeed);
    expect(reassembled.casEntries.length).toBe(bulb.casEntries.length);

    // A tampered blob fails the content-address (secret-free integrity).
    expect(() => assembleBulb(manifest, (cid) => (cid === manifest.seedCid ? utf8Bytes("tampered") : back(cid))))
      .toThrow(/content-address/);
  });

  test("SERVE + PULL + KINDLE: a cold device kindles a sovereign hearth; did:key derives from its OWN key", async () => {
    const bulb = fixtureBulb();
    const httpServer = createServer();   // no catch-all handler — the read-face is the sole responder (as in the vessel)
    servers.push(httpServer);
    await new Promise<void>((r) => httpServer.listen(0, "127.0.0.1", () => r()));
    const port = (httpServer.address() as { port: number }).port;
    await mountBulbReadFace({ httpServer, bulb, signerSeed: new Uint8Array(32).fill(7), storageDir: mkDir("herm") });

    // PULL over real HTTP — assembleBulb re-verifies content-address on every blob.
    const pulled = await pullBulb(httpBulbTransport(`http://127.0.0.1:${port}`));
    expect(pulled.seed.actorSeed).toBe(bulb.seed.actorSeed);
    expect(pulled.charterEpochCid).toBe("epoch-fixture-cid");

    // KINDLE — the cold device mints its OWN key; the ceremony builds on it.
    process.env["LAR_ROOT"] = mkDir("root-serve");
    const repo = newRepo();
    let k: KindleResult;
    try { k = await kindleFromBulb({ bulb: pulled, repo, storageDir: mkDir("device-a") }); }
    finally { if (priorLarRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = priorLarRoot; }
    expect(k.did).toBe(didKeyFromVerifyingKey(k.deviceVerifyingKey));

    // The ceremony seeded the identity under THAT did in the device's OWN fresh social doc.
    const idHandle = await repo.find<LarDoc>(k.identitiesUrl as Parameters<typeof repo.find>[0]);
    const idTiddler = idHandle.doc()?.tiddlers?.[identityTiddlerUri(k.did)];
    expect(idTiddler?.tiddler?.["did"]).toBe(k.did);
    expect(idTiddler?.tiddler?.["verifyingKey"]).toBe(k.deviceVerifyingKey);
  }, 30_000);

  test("SERVE FIRE, NEVER KEY (KAPU): two devices kindle the SAME bulb → two DISTINCT sovereigns", async () => {
    const bulb = fixtureBulb();
    const kA = await kindleAsFreshDevice(bulb, "a");
    const kB = await kindleAsFreshDevice(bulb, "b");

    // Each device minted its OWN key → the dids DIFFER (a Herm-supplied key would collapse them to one).
    expect(kA.deviceVerifyingKey).not.toBe(kB.deviceVerifyingKey);
    expect(kA.did).not.toBe(kB.did);
    // Each did derives from its own device key (the placement proof: device-minted, never bulb-supplied).
    expect(kA.did).toBe(didKeyFromVerifyingKey(kA.deviceVerifyingKey));
    expect(kB.did).toBe(didKeyFromVerifyingKey(kB.deviceVerifyingKey));

    // The bulb carries NO signing-key material — the placement guarantee is structural, not conventional.
    expect(Object.keys(bulb)).not.toContain("signerSeed");
    expect(Object.keys(bulb)).not.toContain("readCap");
    expect(JSON.stringify(bulb.seed)).not.toContain(kA.deviceVerifyingKey);
    expect(JSON.stringify(bulb.seed)).not.toContain(kB.deviceVerifyingKey);
  }, 30_000);
});
