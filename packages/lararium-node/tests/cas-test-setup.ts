/**
 * cas-test-setup — the CID-plane setup shared by full-TW5-boot tests.
 *
 * A real island worker pulls the engine + plugin bytes by CID from the local CAS,
 * the CRDT plane carries no bytes. A test that boots the real kernel mirrors the
 * genesis blobs into a temp fs CAS, gives the pool a storageRoot (so each island's
 * nodefs storage is a child of it, deriving the same `<storageRoot>/cas`), and
 * passes the plugin CIDs. One setup, fed to every full-boot test.
 */

import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pluginCidsFromIslandBlobs, type LarDoc } from "@lararium/mesh";
import { casDirForStorage, writeBlobsToCasFs } from "../src/node-cas.js";

export interface CasSetup {
  /** Pool storageRoot — the CAS lives at `<storageDir>/cas`. */
  readonly storageDir:  string;
  /** Plugin-tiddler CIDs the island resolves from the CAS. */
  readonly pluginCids:  readonly string[];
  /** Remove the temp storageDir (call in finally). */
  readonly cleanup:     () => void;
}

/** Mirror a genesis doc's blobs into a temp fs CAS and derive the pool inputs. */
export function setupCasFromGenesis(genesisDoc: LarDoc): CasSetup {
  const storageDir = mkdtempSync(join(tmpdir(), "lar-cas-test-"));
  writeBlobsToCasFs(genesisDoc.blobs, casDirForStorage(storageDir));
  return {
    storageDir,
    pluginCids: pluginCidsFromIslandBlobs(genesisDoc.blobs),
    cleanup: () => rmSync(storageDir, { recursive: true, force: true }),
  };
}
