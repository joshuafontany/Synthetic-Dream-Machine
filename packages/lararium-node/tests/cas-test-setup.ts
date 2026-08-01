/**
 * cas-test-setup — the CAS-plane test spine: the CID-plane full-boot setup AND the @cad
 * carriage-wire gate stubs the wire/relay tests all carry.
 *
 * Two faces, one plane:
 *   · setupCasFromGenesis — a real island worker pulls the engine + plugin bytes by CID from
 *     the local CAS (the CRDT plane carries no bytes). A full-boot test mirrors the genesis CAS
 *     files (genesis/cas/<cid>, indexed by island.manifest.json) into a temp fs CAS, gives the
 *     pool a storageRoot (each island's nodefs storage a child of it, deriving `<storageRoot>/cas`),
 *     and passes the plugin CIDs (from the genesis doc's blob METADATA) — the loader-path proof
 *     without the live @daemon.
 *   · membershipOf · antigenOf · sealABody — the @cad wire fixtures the carriage/relay/cas-wire
 *     tests share: the two gate-input stubs (membership fold · antigen fold) and the one-shot
 *     seal-a-body-into-a-temp-@cad-dir fixture. One definition, imported everywhere — a copy in
 *     each test file drifts under revert-verify (a stub that quietly diverges certifies nothing).
 */

import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pluginCidsFromIslandBlobs, type AntigenRing, type LarDoc, type MembershipEnvelope, type NexusMembership } from "@lararium/mesh";
import { casDirForStorage, mirrorGenesisCasFs } from "../src/node-cas.js";
import { readGenesisManifest, genesisCasDir } from "../src/genesis-artifact.js";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";
import { standNexusKeyring } from "../src/nexus-convergence-secret-store.js";
import { cadSealDir, sealCarrierForFederation } from "../src/seal-carrier-federation.js";

export interface CasSetup {
  /** Pool storageRoot — the CAS lives at `<storageDir>/cas`. */
  readonly storageDir:  string;
  /** Plugin-tiddler CIDs the island resolves from the CAS. */
  readonly pluginCids:  readonly string[];
  /** Remove the temp storageDir (call in finally). */
  readonly cleanup:     () => void;
}

/**
 * Mirror the genesis CAS files into a temp fs CAS and derive the pool inputs. The
 * bytes come from genesis/cas/<cid> (via island.manifest.json), the plugin CIDs from
 * the genesis doc's blob metadata. `genesisDir` defaults to the repo's genesis/ dir.
 */
export function setupCasFromGenesis(genesisDoc: LarDoc, genesisDir?: string): CasSetup {
  const storageDir = mkdtempSync(join(tmpdir(), "lar-cas-test-"));
  const manifest = readGenesisManifest(genesisDir);
  if (!manifest) {
    throw new Error("[cas-test-setup] genesis CAS manifest absent — run: pnpm --filter @lararium/node build:genesis");
  }
  mirrorGenesisCasFs(manifest, genesisCasDir(genesisDir), casDirForStorage(storageDir));
  return {
    storageDir,
    pluginCids: pluginCidsFromIslandBlobs(genesisDoc.blobs),
    cleanup: () => rmSync(storageDir, { recursive: true, force: true }),
  };
}

// ── @cad carriage-wire fixtures — the gate stubs + seal fixture the wire/relay tests share ──────

/**
 * Recover a Uint8Array a want-block/answer carried as JSON over the socket — the auth relay JSON-round-trips
 * a Uint8Array to `{0:..,1:..}`, so `Object.values` rebuilds the byte run. The wire shape is non-obvious;
 * one definition keeps every carriage test decoding the answer identically.
 */
export const bytesFromPayload = (env: MembershipEnvelope): Uint8Array =>
  Uint8Array.from(Object.values((env.payload as { bytes?: Record<string, number> }).bytes ?? {}));

/** A membership stub — a peerId is a MEMBER iff it sits in the set (production: the nexus-membership fold). */
export const membershipOf = (members: Iterable<string>): NexusMembership => {
  const set = new Set(members);
  return { holdsCarriagePeer: (peerId) => set.has(peerId) };
};

/** An antigen stub — a peerId IS its own nym here; a nym in `kapaed` draws Mu (production: the quorum-signed fold). */
export const antigenOf = (kapaed: Iterable<string>): AntigenRing => {
  const set = new Set(kapaed);
  return { kapaed: set, presenterNym: (peerId) => peerId };
};

/** The one-shot @cad seal fixture — the sealed body every wire test carries. */
export interface SealedBodyFixture {
  readonly registry:  ReturnType<typeof makeSealedPlaneRegistry>;
  readonly cadDir:    string;
  readonly installed: ReturnType<typeof sealCarrierForFederation>;
  readonly cleanup:   () => void;
}

/**
 * Seal one `plaintext` into a temp @cad dir under a fresh per-Nexus keyring (sealEpoch 0) —
 * the registry + cadDir + InstalledSealedBody a wire test serves, plus the temp-dir cleanup.
 */
export function sealABody(plaintext: Uint8Array): SealedBodyFixture {
  const storageDir = mkdtempSync(join(tmpdir(), "lares-caswire-store-"));
  const idDir = mkdtempSync(join(tmpdir(), "lares-caswire-id-"));
  const registry = makeSealedPlaneRegistry();
  const keyring = standNexusKeyring({ sealEpoch: 0, dir: idDir });
  const cadDir = cadSealDir(storageDir);
  const installed = sealCarrierForFederation({ registry, cadDir, plaintext, keyring });
  const cleanup = () => {
    rmSync(storageDir, { recursive: true, force: true });
    rmSync(idDir, { recursive: true, force: true });
  };
  return { registry, cadDir, installed, cleanup };
}
