/**
 * runInit — one-time social-plane bootstrap for a new Lararium node.
 *
 * Causal-island law: this function holds the ONLY seeding path for social Tiga
 * docs. The server (openNodeVessel) finds docs created here; it never authors
 * them.
 *
 * Three docs + one bootstrap artifact get produced:
 *   1. IdentitiesDoc — operator IdentityTiddler (device delegation lands at S7.1)
 *   2. CirclesDoc    — 5 system circles (Following / All Following / Circles / Blocked / Muted)
 *   3. SessionsDoc   — empty, ready for runtime session writes
 *   4. AdminDoc      — operator-private bag (bag-mirror configs, etc.)
 *
 *   genesis/social-bootstrap.json — TW5 plugin container encoding the
 *   AutomergeUrls of the four docs above. The lararium-bootstrap-sync startup
 *   module promotes it on first boot.
 *
 * Re-running stays idempotent: when genesis/social-bootstrap.json already lives
 * on disk, the function returns early without re-seeding.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
} from "@lararium/mesh";
import { buildCeremonyTiddlers } from "@lararium/tw5";
import { repoRoot } from "@lararium/mesh";
import {
  seedIdentitiesDoc, seedCirclesDoc, seedSessionsDoc, seedAdminDoc,
} from "../social-seed.js";
import { generateOrLoadOperatorKeypair } from "../operator-key.js";
import { SOCIAL_BOOTSTRAP_PLUGIN_TITLE } from "../open-node-vessel.js";

export interface InitOptions {
  /** Absolute path to the Automerge NodeFS storage directory. */
  readonly storageDir?: string;
  /** Absolute path to the genesis/ directory (holds social-bootstrap.json). */
  readonly genesisDir?: string;
  /** When true, deletes social-bootstrap.json before seeding. */
  readonly force?:      boolean;
}

export interface InitResult {
  readonly skipped:        boolean;
  readonly bootstrapPath:  string;
  readonly storageDir:     string;
  readonly genesisDir:     string;
}

/**
 * Resolve default lararium-node directories when caller passes no overrides.
 * The defaults track the historical `lararium:init` shape so `lares init`
 * lands the same artifacts in the same places (under packages/lararium-node/).
 *
 * Anchors on repoRoot (walks up to pnpm-workspace.yaml) rather than import.meta.url.
 */
function defaultDirs(): { storageDir: string; genesisDir: string } {
  const root    = process.env["LAR_ROOT"] ?? join(repoRoot, "packages", "lararium-node");
  const pkgRoot = join(repoRoot, "packages", "lararium-node");
  return {
    storageDir: join(root, ".lararium"),
    genesisDir: process.env["LAR_ROOT"] ? join(root, "genesis") : join(pkgRoot, "genesis"),
  };
}

export async function runInit(opts: InitOptions = {}): Promise<InitResult> {
  const defaults   = defaultDirs();
  const storageDir = opts.storageDir ?? defaults.storageDir;
  const genesisDir = opts.genesisDir ?? defaults.genesisDir;
  const bootstrap  = join(genesisDir, "social-bootstrap.json");

  if (existsSync(bootstrap) && !opts.force) {
    console.log("[lares init] genesis/social-bootstrap.json already exists — skipping.");
    console.log("  Pass --force or delete the file to re-seed.");
    return { skipped: true, bootstrapPath: bootstrap, storageDir, genesisDir };
  }

  mkdirSync(storageDir, { recursive: true });
  mkdirSync(genesisDir, { recursive: true });

  const repo = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });

  const operatorIdentity = await generateOrLoadOperatorKeypair(storageDir);
  console.log(`[lares init] operator verifyingKey  ${operatorIdentity.verifyingKey.slice(0, 16)}…`);

  const identitiesHandle = seedIdentitiesDoc(repo);
  const circlesHandle    = seedCirclesDoc(repo);
  const sessionsHandle   = seedSessionsDoc(repo);
  const adminHandle      = seedAdminDoc(repo);

  const ceremonyTiddlers = buildCeremonyTiddlers(
    operatorIdentity.verifyingKey,
    operatorIdentity.displayName,
  );

  for (const t of ceremonyTiddlers) {
    if (t.bag === IDENTITIES_DOC_URI) {
      identitiesHandle.change((doc) => {
        if (!doc.tiddlers[t.title]) {
          doc.tiddlers[t.title] = {
            tiddler: { title: t.title, ...t.fields },
            meta: { authority: t.authority },
          };
        }
      });
    } else {
      circlesHandle.change((doc) => {
        if (!doc.tiddlers[t.title]) {
          doc.tiddlers[t.title] = {
            tiddler: { title: t.title, ...t.fields },
            meta: { authority: t.authority },
          };
        }
      });
    }
  }

  console.log("[lares init] ceremony complete — operator identity written");

  const packedTiddlers: Record<string, Record<string, unknown>> = {
    [IDENTITIES_DOC_URI]: { title: IDENTITIES_DOC_URI, text: identitiesHandle.url, kind: "oracle" },
    [CIRCLES_DOC_URI]:    { title: CIRCLES_DOC_URI,    text: circlesHandle.url,    kind: "oracle" },
    [SESSIONS_DOC_URI]:   { title: SESSIONS_DOC_URI,   text: sessionsHandle.url,   kind: "oracle" },
    [ADMIN_BAG_ID]:       { title: ADMIN_BAG_ID,       text: adminHandle.url,      kind: "oracle" },
  };

  const bootstrapPlugin = {
    title:         SOCIAL_BOOTSTRAP_PLUGIN_TITLE,
    "plugin-type": "plugin",
    type:          "application/json",
    tags:          "lar:///ha.ka.ba/tags/lararium-bootstrap",
    text:          JSON.stringify({ tiddlers: packedTiddlers }),
  };

  writeFileSync(bootstrap, JSON.stringify(bootstrapPlugin, null, 2), "utf8");

  await repo.flush();

  console.log(`[lares init] genesis/social-bootstrap.json written`);
  console.log(`  @identities  ${identitiesHandle.url}`);
  console.log(`  @circles     ${circlesHandle.url}`);
  console.log(`  @sessions    ${sessionsHandle.url}`);
  console.log(`  @admin       ${adminHandle.url}`);
  console.log("[lares init] done — start the node with: lares dev");

  return { skipped: false, bootstrapPath: bootstrap, storageDir, genesisDir };
}
