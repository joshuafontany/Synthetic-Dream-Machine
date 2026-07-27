/**
 * runDeviceAdmit — Node adapter: produce a device-admit/v1 payload for a new vessel.
 *
 * Node-specific shores (only these belong here):
 *   - readFileSync for genesis/social-bootstrap.json
 *   - NodeFSStorageAdapter + findWithProgress for daemon doc access
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
  DAEMON_BAG_ID, PERSONA_BAG_ID, PERSONA_KEL_PREFIX_TIDDLER,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  personaKelBoardDocUrl, personaKelChainForPrefix, materializeSharedLarDoc,
} from "@lararium/mesh";
import { daemonGenesisDir } from "../lares-config.js";
import { larDataDir } from "../vessel-paths.js";
import { runDeviceAdmitEdge, type DeviceAdmitPayload } from "@lararium/keyhive";
import { loadPersonaGroupRootSeed, loadVesselVerifyingKey } from "../node-vessel-identity.js";
import { GENESIS_ENGINE_CID } from "../genesis-artifact.js";

export type { DeviceAdmitPayload } from "@lararium/keyhive";

export interface DeviceAdmitOptions {
  readonly storageDir?:    string;
  readonly genesisDir?:    string;
  readonly outPath?:       string;
  readonly syncUrl?:       string;
  /** The joining vessel's PUBLIC Ed25519 verifying-key hex — the delegate the founder's root signs. */
  readonly joineeVerifyingKey: string;
  /** Automerge URL of this vessel's genesis island — included in payload for peer-sync delivery. */
  readonly islandDocUrl?:  string | null;
}

function defaultDirs(): { storageDir: string; genesisDir: string } {
  return {
    storageDir: larDataDir(),        // runtime → ~/.lares/.lararium
    // Baked seed rides the composable genesis cap (LAR_GENESIS → ~/.lares/config.json →
    // repo-relative <corpus>/genesis). Checked-in by default; a no-config boot lands on the repo seed.
    genesisDir: daemonGenesisDir(),
  };
}

export async function runDeviceAdmit(opts: DeviceAdmitOptions): Promise<DeviceAdmitPayload> {
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
  const daemonUrl            = tiddlers[DAEMON_BAG_ID]?.text                 ?? null;
  // The founder's @persona doc — carried into the payload so the joinee SYNCS the shared
  // veiled identity (membership-sync foundation); @daemon stays sovereign (joinee seeds its own).
  const personaUrl           = tiddlers[PERSONA_BAG_ID]?.text                ?? null;

  if (!personaGroupDocIdHex || !meshCabalDocIdHex) {
    throw new Error(
      `[lares device-admit] sentinel oracle IDs missing from social-bootstrap.json.\n` +
      `  Run \`lares init --force\` to re-establish the founding ceremony.`,
    );
  }
  if (!daemonUrl) {
    throw new Error(`[lares device-admit] daemon doc URL missing from social-bootstrap.json.`);
  }

  // Open daemon doc to read cap events + personaGroupAgentIdHex.
  const repo        = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  const progress    = repo.findWithProgress(daemonUrl as AutomergeUrl);
  // automerge-repo 2.6: whenReady() resolves the handle when ready, rejects on
  // unavailable; race it against a 5s timeout.
  const daemonHandle = await Promise.race([
    progress.whenReady(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[lares device-admit] daemon doc not ready after 5s")), 5000),
    ),
  ]);
  const daemonDoc    = daemonHandle.doc();
  const tiddlerMap  = ((daemonDoc as Record<string,unknown>)?.["tiddlers"] ?? {}) as Record<string, unknown>;

  const agentEntry         = tiddlerMap[PERSONA_GROUP_AGENT_ID_TIDDLER] as Record<string,unknown> | undefined;
  const personaGroupAgentIdHex = (agentEntry?.["tiddler"] as Record<string,unknown> | undefined)?.["text"] as string | null ?? null;
  if (!personaGroupAgentIdHex) {
    throw new Error(`[lares device-admit] PersonaGroup agent ID missing from daemon doc — run \`lares init --force\`.`);
  }

  // The founder's persona-KEL PREFIX (the identifier the joinee will pin) + the chain SNAPSHOT off the
  // founder's own per-Nexus KEL board (its gate key IS its Nexus key). The joinee seeds the snapshot into its
  // local board so it boots to a head with no sync wait (no-global-now). Fail-closed: a founding always seats
  // an inception, so a prefix + a chain always stand — their absence names a torn founding, refuse to admit.
  const kelPrefixEntry = tiddlerMap[PERSONA_KEL_PREFIX_TIDDLER] as Record<string,unknown> | undefined;
  const personaKelPrefix = (kelPrefixEntry?.["tiddler"] as Record<string,unknown> | undefined)?.["text"] as string | null ?? null;
  if (!personaKelPrefix) {
    throw new Error(`[lares device-admit] persona-KEL prefix missing from daemon doc — run \`lares init --force\`.`);
  }
  const founderNexusKey = await loadVesselVerifyingKey(storageDir);
  const kelBoard   = await materializeSharedLarDoc(repo, personaKelBoardDocUrl(founderNexusKey), "@persona-kel");
  const personaKelChain = personaKelChainForPrefix(kelBoard.doc(), personaKelPrefix);
  if (!personaKelChain || personaKelChain.length === 0) {
    throw new Error(`[lares device-admit] persona-KEL chain for ${personaKelPrefix.slice(0, 20)}… absent from the local board — run \`lares init --force\`.`);
  }

  await repo.flush();

  // The founder's PersonaGroup ROOT signs the joinee's edge (the upgrade event). The root seed
  // is founder-only (.lararium-identity); the joinee supplies ONLY its PUBLIC verifying key.
  if (!opts.joineeVerifyingKey) {
    throw new Error("[lares device-admit] --joinee-key <hex> required — the joining vessel's public verifying key.");
  }
  const signerSeed     = await loadPersonaGroupRootSeed(storageDir);
  const hearthTrueName = GENESIS_ENGINE_CID(genesisDir);
  if (!hearthTrueName) {
    throw new Error("[lares device-admit] hearth true-name (engine CID) absent — run `lares init` first.");
  }
  const payload = await runDeviceAdmitEdge({
    signerSeed,
    joineeVerifyingKey: opts.joineeVerifyingKey.toLowerCase(),
    personaKelPrefix,
    personaKelChain,
    hearthTrueName,
    personaGroupDocIdHex,
    personaGroupAgentIdHex,
    meshCabalDocIdHex,
    syncUrl:      opts.syncUrl      ?? null,
    islandDocUrl: opts.islandDocUrl ?? null,
    personaUrl,
  });

  const json = JSON.stringify(payload, null, 2);
  if (opts.outPath) {
    writeFileSync(opts.outPath, json, "utf8");
    console.log(`[lares device-admit] payload written to ${opts.outPath}`);
  } else {
    process.stdout.write(json + "\n");
  }

  // The CARRIED form. The payload is a signed capability, so it needs no trusted channel and no
  // reachable issuer: a hostile carrier may WITHHOLD it, never forge it. It rides in the URL FRAGMENT,
  // which browsers do not transmit — so the bytes reach the vessel by whatever the human used (a paste,
  // a QR held up to a screen, a file on a stick) and touch no network on the way.
  //
  // The alternative — a `GET /admit/<key>` the vessel calls — makes the vessel a client PETITIONING an
  // authority for its own admission, and it demands that authority be REACHABLE at the moment of asking.
  // That is a global now, and this house does not have one.
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  console.log("");
  console.log("[lares device-admit] carry this to the joining vessel — the fragment never leaves the browser:");
  console.log(`  #admit=${b64}`);

  return payload;
}
