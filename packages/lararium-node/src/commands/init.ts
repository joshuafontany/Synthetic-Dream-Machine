/**
 * runInit — Node adapter: one-time social-plane bootstrap for a new Lararium node.
 *
 * Node-specific seams (only these belong here):
 *   - NodeFSStorageAdapter for Automerge repo
 *   - generateOrLoadOperatorKeypair / loadOperatorSigningSeed (disk keypair)
 *   - writeFileSync for genesis/social-bootstrap.json
 *   - LAR_ROOT / repoRoot for default directory resolution
 *
 * All ceremony logic lives in @lararium/keyhive (runFoundingCeremony,
 * runApplyAdmitPayload) and runs identically in browser + mobile vessels.
 *
 * Re-running stays idempotent: when genesis/social-bootstrap.json already lives
 * on disk, the function returns early without re-seeding.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
  PERSON_GROUP_DOC_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
} from "@lararium/mesh";
import { repoRoot } from "@lararium/mesh/node";
import { generateOrLoadOperatorKeypair, loadOperatorSigningSeed, persistOperatorCard } from "../operator-key.js";
import {
  runFoundingCeremony, runApplyAdmitPayload, type DeviceAdmitPayload,
} from "@lararium/keyhive";
import { SOCIAL_BOOTSTRAP_PLUGIN_TITLE } from "../open-node-vessel.js";

export interface InitOptions {
  readonly storageDir?: string;
  readonly genesisDir?: string;
  readonly force?:      boolean;
  /**
   * Path to a device-admit/v1 JSON payload. When provided, skips the founding
   * ceremony and admits this vessel to the operator's existing PersonGroup + MeshCabal.
   * Use for same-operator second vessel. Multi-operator join uses invite-receive.
   */
  readonly admitPayloadPath?: string;
}

export interface InitResult {
  readonly skipped:       boolean;
  readonly bootstrapPath: string;
  readonly storageDir:    string;
  readonly genesisDir:    string;
}

function defaultDirs(): { storageDir: string; genesisDir: string } {
  const root    = process.env["LAR_ROOT"] ?? join(repoRoot, "packages", "lararium-node");
  const pkgRoot = join(repoRoot, "packages", "lararium-node");
  return {
    storageDir: join(root, ".lararium"),
    genesisDir: process.env["LAR_ROOT"] ? join(root, "genesis") : join(pkgRoot, "genesis"),
  };
}

function makeBootstrapPlugin(
  identitiesUrl: string, circlesUrl: string, sessionsUrl: string, adminUrl: string,
  personGroupDocIdHex: string, meshCabalDocIdHex: string,
): object {
  const packedTiddlers = {
    [IDENTITIES_DOC_URI]:        { title: IDENTITIES_DOC_URI,        text: identitiesUrl,         kind: "oracle" },
    [CIRCLES_DOC_URI]:           { title: CIRCLES_DOC_URI,           text: circlesUrl,             kind: "oracle" },
    [SESSIONS_DOC_URI]:          { title: SESSIONS_DOC_URI,          text: sessionsUrl,             kind: "oracle" },
    [ADMIN_BAG_ID]:              { title: ADMIN_BAG_ID,              text: adminUrl,                kind: "oracle" },
    [MESH_CABAL_DOC_ID_TIDDLER]: { title: MESH_CABAL_DOC_ID_TIDDLER, text: meshCabalDocIdHex,     kind: "sentinel-id" },
    [PERSON_GROUP_DOC_ID_TIDDLER]:{ title: PERSON_GROUP_DOC_ID_TIDDLER, text: personGroupDocIdHex, kind: "sentinel-id" },
  };
  return {
    title:         SOCIAL_BOOTSTRAP_PLUGIN_TITLE,
    "plugin-type": "plugin",
    type:          "application/json",
    tags:          "lar:///ha.ka.ba/tags/lararium-bootstrap",
    text:          JSON.stringify({ tiddlers: packedTiddlers }),
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

  const operatorIdentity = await generateOrLoadOperatorKeypair(storageDir);
  console.log(`[lares init] operator verifyingKey  ${operatorIdentity.verifyingKey.slice(0, 16)}…`);

  const repo = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });

  if (opts.admitPayloadPath) {
    // ── Vessel-admission path ────────────────────────────────────────────────
    if (!existsSync(opts.admitPayloadPath)) {
      throw new Error(`[lares init --admit] payload file not found: ${opts.admitPayloadPath}`);
    }
    const payload = JSON.parse(readFileSync(opts.admitPayloadPath, "utf8")) as DeviceAdmitPayload;
    if (payload.kind !== "device-admit/v1") {
      throw new Error(`[lares init --admit] unexpected payload kind: ${payload.kind}`);
    }
    console.log(`[lares init --admit] PersonGroup  ${payload.personGroupDocIdHex.slice(0, 20)}…`);
    console.log(`[lares init --admit] MeshCabal    ${payload.meshCabalDocIdHex.slice(0, 20)}…`);
    console.log(`[lares init --admit] cap events   ${payload.capEvents.length}`);

    const { identitiesUrl, circlesUrl, sessionsUrl, adminUrl } =
      await runApplyAdmitPayload({
        repo,
        operatorVerifyingKey: operatorIdentity.verifyingKey,
        operatorDisplayName:  operatorIdentity.displayName ?? "operator",
        payload,
      });

    const bootstrapPlugin = makeBootstrapPlugin(
      identitiesUrl, circlesUrl, sessionsUrl, adminUrl,
      payload.personGroupDocIdHex, payload.meshCabalDocIdHex,
    );
    writeFileSync(bootstrap, JSON.stringify(bootstrapPlugin, null, 2), "utf8");
    await repo.flush();

    console.log("[lares init --admit] sentinel oracle tiddlers written");
    if (payload.syncUrl) console.log(`  founding vessel sync URL: ${payload.syncUrl}`);
    console.log("[lares init --admit] done — vessel admitted to operator PersonGroup. Start with: lares dev");
    return { skipped: false, bootstrapPath: bootstrap, storageDir, genesisDir };
  }

  // ── Founding ceremony path ───────────────────────────────────────────────
  const operatorSeed = await loadOperatorSigningSeed(storageDir);

  const {
    identitiesUrl, circlesUrl, sessionsUrl, adminUrl,
    personGroupDocIdHex, meshCabalDocIdHex, contactCardJson,
  } = await runFoundingCeremony({
    repo,
    operatorSeed,
    operatorVerifyingKey: operatorIdentity.verifyingKey,
    operatorDisplayName:  operatorIdentity.displayName ?? "operator",
  });

  // Cache the operator ContactCard for the light leaf-identity path — a CLI/agent
  // re-presents it on every peer handshake without booting keyhive (OP-AP5).
  await persistOperatorCard(storageDir, contactCardJson);

  const bootstrapPlugin = makeBootstrapPlugin(
    identitiesUrl, circlesUrl, sessionsUrl, adminUrl,
    personGroupDocIdHex, meshCabalDocIdHex,
  );
  writeFileSync(bootstrap, JSON.stringify(bootstrapPlugin, null, 2), "utf8");
  await repo.flush();

  console.log(`[lares init] genesis/social-bootstrap.json written`);
  console.log(`  @identities  ${identitiesUrl}`);
  console.log(`  @circles     ${circlesUrl}`);
  console.log(`  @sessions    ${sessionsUrl}`);
  console.log(`  @admin       ${adminUrl}`);
  console.log(`  PersonGroup  ${personGroupDocIdHex.slice(0, 20)}…`);
  console.log(`  MeshCabal    ${meshCabalDocIdHex.slice(0, 20)}…`);
  console.log("[lares init] done — Nexus node ready. Start with: lares dev");

  return { skipped: false, bootstrapPath: bootstrap, storageDir, genesisDir };
}
