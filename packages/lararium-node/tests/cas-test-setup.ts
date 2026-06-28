/**
 * cas-test-setup — the CID-plane setup shared by full-TW5-boot tests.
 *
 * A real island worker pulls the engine + plugin bytes by CID from the local CAS,
 * the CRDT plane carries no bytes. A test that boots the real kernel mirrors the
 * genesis CAS files (genesis/cas/<cid>, indexed by island.manifest.json) into a temp
 * fs CAS, gives the pool a storageRoot (so each island's nodefs storage is a child of
 * it, deriving the same `<storageRoot>/cas`), and passes the plugin CIDs (derived from
 * the genesis doc's blob METADATA). One setup, fed to every full-boot test — the
 * loader-path proof without the live @daemon.
 */

import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pluginCidsFromIslandBlobs, type LarDoc } from "@lararium/mesh";
import { casDirForStorage, mirrorGenesisCasFs } from "../src/node-cas.js";
import { readGenesisManifest, genesisCasDir } from "../src/genesis-artifact.js";

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
