/**
 * runDeviceAdmit — Node adapter: produce a device-admit/v1 payload for a new vessel.
 *
 * Node-specific seams (only these belong here):
 *   - readFileSync for genesis/social-bootstrap.json
 *   - NodeFSStorageAdapter + findWithProgress for admin doc access
 *   - loadVesselSigningSeed (disk keypair)
 *   - writeFileSync / process.stdout.write for output
 *
 * All ceremony logic (Keyhive hydration, Gate B/C self-check, payload construction)
 * lives in @lararium/keyhive (runDeviceAdmitCore) and runs identically in any vessel.
 *
 * Same-operator path: covers the operator's own N vessels (desktop, browser, phone).
 * Multi-operator join uses invite-send / invite-receive (ceremony.ts stubs).
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import {
  ADMIN_BAG_ID,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
} from "@lararium/mesh";
import { repoRoot } from "@lararium/mesh/node";
import { runDeviceAdmitCore, type DeviceAdmitPayload } from "@lararium/keyhive";
import { loadVesselSigningSeed } from "../node-vessel-identity.js";

export type { DeviceAdmitPayload } from "@lararium/keyhive";

export interface DeviceAdmitOptions {
  readonly storageDir?:    string;
  readonly genesisDir?:    string;
  readonly outPath?:       string;
  readonly syncUrl?:       string;
  /** Automerge URL of this vessel's genesis island — included in payload for peer-sync delivery. */
  readonly islandDocUrl?:  string | null;
}

function defaultDirs(): { storageDir: string; genesisDir: string } {
  const root = process.env["LAR_ROOT"] ?? repoRoot;   // one root law: the repo IS the vessel
  return {
    storageDir: join(root, ".lararium"),
    genesisDir: join(root, "genesis"),
  };
}

export async function runDeviceAdmit(opts: DeviceAdmitOptions = {}): Promise<DeviceAdmitPayload> {
  const defaults   = defaultDirs();
  const storageDir = opts.storageDir ?? defaults.storageDir;
  const genesisDir = opts.genesisDir ?? defaults.genesisDir;
  const bootstrap  = join(genesisDir, "social-bootstrap.json");

  if (!existsSync(bootstrap)) {
    throw new Error(
      `[lares device-admit] genesis/social-bootstrap.json not found — run \`lares init\` first.\n` +
      `  expected: ${bootstrap}`,
    );
  }

  // Read sentinel oracle IDs from social-bootstrap.json.
  const bootstrapPlugin = JSON.parse(readFileSync(bootstrap, "utf8")) as { text?: string };
  const tiddlers = (JSON.parse(bootstrapPlugin.text ?? "{}") as {
    tiddlers?: Record<string, { text?: string }>;
  }).tiddlers ?? {};

  const personaGroupDocIdHex = tiddlers[PERSONA_GROUP_DOC_ID_TIDDLER]?.text ?? null;
  const meshCabalDocIdHex   = tiddlers[MESH_CABAL_DOC_ID_TIDDLER]?.text   ?? null;
  const adminUrl            = tiddlers[ADMIN_BAG_ID]?.text                 ?? null;

  if (!personaGroupDocIdHex || !meshCabalDocIdHex) {
    throw new Error(
      `[lares device-admit] sentinel oracle IDs missing from social-bootstrap.json.\n` +
      `  Run \`lares init --force\` to re-establish the founding ceremony.`,
    );
  }
  if (!adminUrl) {
    throw new Error(`[lares device-admit] admin doc URL missing from social-bootstrap.json.`);
  }

  // Open admin doc to read cap events + personaGroupAgentIdHex.
  const repo        = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  const progress    = repo.findWithProgress(adminUrl as AutomergeUrl);
  // automerge-repo 2.6: whenReady() resolves the handle when ready, rejects on
  // unavailable; race it against a 5s timeout.
  const adminHandle = await Promise.race([
    progress.whenReady(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[lares device-admit] admin doc not ready after 5s")), 5000),
    ),
  ]);
  const adminDoc    = adminHandle.doc();
  const tiddlerMap  = ((adminDoc as Record<string,unknown>)?.["tiddlers"] ?? {}) as Record<string, unknown>;

  const agentEntry         = tiddlerMap[PERSONA_GROUP_AGENT_ID_TIDDLER] as Record<string,unknown> | undefined;
  const personaGroupAgentIdHex = (agentEntry?.["tiddler"] as Record<string,unknown> | undefined)?.["text"] as string | null ?? null;
  if (!personaGroupAgentIdHex) {
    throw new Error(`[lares device-admit] PersonaGroup agent ID missing from admin doc — run \`lares init --force\`.`);
  }

  const capEventPrefix = `${ADMIN_BAG_ID}/cap/`;
  const capEvents: Array<{ variant: string; bytes: string }> = [];
  for (const [title, entry] of Object.entries(tiddlerMap)) {
    if (!title.startsWith(capEventPrefix)) continue;
    const t       = (entry as Record<string,unknown>)?.["tiddler"] as Record<string,unknown>;
    const variant = t?.["variant"] as string | undefined;
    const text    = t?.["text"]    as string | undefined;
    if (variant && text) capEvents.push({ variant, bytes: text });
  }
  console.log(`[lares device-admit] found ${capEvents.length} cap events in admin doc`);

  await repo.flush();

  // Delegate to isomorphic ceremony core.
  const operatorSeed = await loadVesselSigningSeed(storageDir);
  const payload = await runDeviceAdmitCore({
    operatorSeed,
    personaGroupDocIdHex,
    personaGroupAgentIdHex,
    meshCabalDocIdHex,
    capEvents,
    syncUrl:      opts.syncUrl      ?? null,
    islandDocUrl: opts.islandDocUrl ?? null,
  });

  const json = JSON.stringify(payload, null, 2);
  if (opts.outPath) {
    writeFileSync(opts.outPath, json, "utf8");
    console.log(`[lares device-admit] payload written to ${opts.outPath}`);
  } else {
    process.stdout.write(json + "\n");
  }

  return payload;
}
