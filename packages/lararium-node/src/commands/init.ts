/**
 * runInit — Node adapter: one-time social-plane bootstrap for a new Lararium node.
 *
 * Node-specific shores (only these belong here):
 *   - NodeFSStorageAdapter for Automerge repo
 *   - generateOrLoadVesselIdentity / loadVesselSigningSeed (disk keypair)
 *   - writeFileSync for the social bootstrap (<data>/vessel — see larBootstrapPath)
 *   - the composable genesis cap (daemonGenesisDir) for default directory resolution
 *
 * All ceremony logic lives in @lararium/keyhive (runFoundingCeremony,
 * runApplyAdmitPayload) and runs identically in browser + mobile vessels.
 *
 * Re-running stays idempotent: when the social bootstrap already lives
 * on disk, the function returns early without re-seeding.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, DAEMON_BAG_ID, PERSONA_BAG_ID,
  PERSONA_GROUP_DOC_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
} from "@lararium/mesh";
import { daemonGenesisDir } from "../lares-config.js";
import { larDataDir, larBootstrapPath } from "../vessel-paths.js";
import { persistIdentityAnchors } from "../identity-anchors.js";
import {
  generateOrLoadVesselIdentity, loadVesselSigningSeed, persistVesselCard,
  generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed,
} from "../node-vessel-identity.js";
import { GENESIS_ENGINE_CID } from "../genesis-artifact.js";
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
   * ceremony and admits this vessel to the operator's existing PersonaGroup + MeshCabal.
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
  return {
    storageDir: larDataDir(),        // runtime → ~/.lares/.lararium
    // Baked seed rides the composable genesis cap (LAR_GENESIS → ~/.lares/config.json →
    // repo-relative <corpus>/genesis). Checked-in by default; a no-config boot lands on the repo seed.
    genesisDir: daemonGenesisDir(),
  };
}

function makeBootstrapPlugin(
  identitiesUrl: string, circlesUrl: string, sessionsUrl: string, daemonUrl: string, personaUrl: string,
  personaGroupDocIdHex: string, meshCabalDocIdHex: string,
): object {
  const packedTiddlers = {
    [IDENTITIES_DOC_URI]:        { title: IDENTITIES_DOC_URI,        text: identitiesUrl,         kind: "oracle" },
    [CIRCLES_DOC_URI]:           { title: CIRCLES_DOC_URI,           text: circlesUrl,             kind: "oracle" },
    [SESSIONS_DOC_URI]:          { title: SESSIONS_DOC_URI,          text: sessionsUrl,             kind: "oracle" },
    [DAEMON_BAG_ID]:              { title: DAEMON_BAG_ID,              text: daemonUrl,                kind: "oracle" },
    [PERSONA_BAG_ID]:             { title: PERSONA_BAG_ID,             text: personaUrl,               kind: "oracle" },
    [MESH_CABAL_DOC_ID_TIDDLER]: { title: MESH_CABAL_DOC_ID_TIDDLER, text: meshCabalDocIdHex,     kind: "sentinel-id" },
    [PERSONA_GROUP_DOC_ID_TIDDLER]:{ title: PERSONA_GROUP_DOC_ID_TIDDLER, text: personaGroupDocIdHex, kind: "sentinel-id" },
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
  const bootstrap  = larBootstrapPath();

  if (existsSync(bootstrap) && !opts.force) {
    console.log(`[lares init] ${bootstrap} already exists — skipping.`);
    console.log("  Pass --force or delete the file to re-seed.");
    return { skipped: true, bootstrapPath: bootstrap, storageDir, genesisDir };
  }

  mkdirSync(storageDir, { recursive: true });
  mkdirSync(genesisDir, { recursive: true });

  const operatorIdentity = await generateOrLoadVesselIdentity(storageDir);
  console.log(`[lares init] operator verifyingKey  ${operatorIdentity.verifyingKey.slice(0, 16)}…`);

  const repo = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });

  if (opts.admitPayloadPath) {
    // ── Vessel-admission path = the UPGRADE event (a fresh vessel joins a PersonaGroup) ──
    // The joinee's vessel key (above) is the DELEGATE; the payload carries the pinned signer +
    // the root→joinee edge (the founder's PersonaGroup root signed it). The joinee writes that
    // binding into its OWN daemon doc and boots through its Binding Gate — no Beelay, no cap events.
    if (!existsSync(opts.admitPayloadPath)) {
      throw new Error(`[lares init --admit] payload file not found: ${opts.admitPayloadPath}`);
    }
    const payload = JSON.parse(readFileSync(opts.admitPayloadPath, "utf8")) as DeviceAdmitPayload;
    if (payload.kind !== "device-admit/v1") {
      throw new Error(`[lares init --admit] unexpected payload kind: ${payload.kind}`);
    }
    // The joinee's OWN seed — the admit supplies the BINDING; the vessel supplies the SELF. The ceremony
    // mints this vessel's self-certifying ContactCard from it, and a cardless vessel cannot speak at a gate.
    const admitSeed = await loadVesselSigningSeed(storageDir);
    const { contactCardJson, identitiesUrl, circlesUrl, sessionsUrl, daemonUrl, personaUrl } = await runApplyAdmitPayload({
      repo,
      vesselSeed: admitSeed,
      vesselVerifyingKey: operatorIdentity.verifyingKey,
      vesselDisplayName:  operatorIdentity.displayName ?? "operator",
      payload,
      // The joinee's own gate key IS its Nexus key — the local KEL board it seeds the founder's inception onto.
      nexusPubkey: operatorIdentity.verifyingKey,
    });

    const bootstrapPlugin = makeBootstrapPlugin(
      identitiesUrl, circlesUrl, sessionsUrl, daemonUrl, personaUrl,
      payload.personaGroupDocIdHex, payload.meshCabalDocIdHex,
    );
    writeFileSync(bootstrap, JSON.stringify(bootstrapPlugin, null, 2), "utf8");
    // A joined vessel persists the SAME anchors from the admit payload — its identity home
    // now backstops the veiled Handle exactly as the founder's does.
    persistIdentityAnchors({
      personaGroupDocIdHex:    payload.personaGroupDocIdHex,
      meshCabalDocIdHex:       payload.meshCabalDocIdHex,
      personaGroupAgentIdHex:  payload.personaGroupAgentIdHex,
    });
    await repo.flush();

    console.log(`[lares init --admit] vessel ${operatorIdentity.verifyingKey.slice(0, 16)}… admitted`);
    console.log(`  @persona      ${personaUrl}${payload.personaUrl ? " (synced from founder)" : " (fresh local — payload carried none)"}`);
    console.log(`  PersonaGroup ${payload.personaGroupDocIdHex.slice(0, 20)}…`);
    console.log(`  signer pin   ${payload.signerDid.slice(0, 20)}…`);
    console.log(`  hearth-name  ${payload.hearthTrueName.slice(0, 20)}…  (binding: device × hearthTrueName)`);
    console.log("[lares init --admit] done — joined the PersonaGroup. Start with: lares dev");
    return { skipped: false, bootstrapPath: bootstrap, storageDir, genesisDir };
  }

  // ── Founding ceremony path ───────────────────────────────────────────────
  const vesselSeed = await loadVesselSigningSeed(storageDir);

  // The binding: the per-vessel key (vesselSeed) is the DEVICE; the PersonaGroup ROOT (persona h0)
  // signs the edge that binds it to the hearth true-name — that root's DID becomes the PINNED signerDid
  // peers verify the founding edge (and every admit-time device-delegation) against. Founder-only, so the
  // founding STANDS h0's root here; a founding with no operator-root to bind through is no founding.
  // `lares persona new 0 --name '<kahu>'` then LOADS this same root idempotently and sets its private
  // pet-name — the first of the three symmetric persona-new commands, the founder pre-standing.
  await generateOrLoadPersonaGroupRoot(storageDir);
  const signerSeed = await loadPersonaGroupRootSeed(storageDir);
  const hearthTrueName = GENESIS_ENGINE_CID(genesisDir);
  if (!hearthTrueName) {
    throw new Error(
      "[lares init] cannot found: hearth true-name (engine CID) absent — " +
      "run `pnpm --filter @lararium/node build:genesis` first.",
    );
  }

  const {
    identitiesUrl, circlesUrl, sessionsUrl, daemonUrl, personaUrl,
    personaGroupDocIdHex, meshCabalDocIdHex, personaGroupAgentIdHex, contactCardJson,
    signerDid, personaKelPrefix,
  } = await runFoundingCeremony({
    repo,
    vesselSeed,
    vesselVerifyingKey: operatorIdentity.verifyingKey,
    vesselDisplayName:  operatorIdentity.displayName ?? "operator",
    binding: { mode: "self-stood", signerSeed },
    hearthTrueName,
    // This node's own gate key IS its Nexus key — the per-Nexus KEL board the founding seats the inception on.
    nexusPubkey: operatorIdentity.verifyingKey,
  });

  // Cache the operator ContactCard for the light leaf-identity path — a CLI/agent
  // re-presents it on every peer handshake without booting keyhive (OP-AP5).
  await persistVesselCard(storageDir, contactCardJson);

  const bootstrapPlugin = makeBootstrapPlugin(
    identitiesUrl, circlesUrl, sessionsUrl, daemonUrl, personaUrl,
    personaGroupDocIdHex, meshCabalDocIdHex,
  );
  writeFileSync(bootstrap, JSON.stringify(bootstrapPlugin, null, 2), "utf8");
  // The veiled-Handle anchors ride the sovereign identity home, OUTSIDE the wiped substrate,
  // so a rebirth reforges @daemon while re-reading the SAME PersonaGroup/MeshCabal ids + agentId.
  persistIdentityAnchors({ personaGroupDocIdHex, meshCabalDocIdHex, personaGroupAgentIdHex });
  await repo.flush();

  console.log(`[lares init] ${bootstrap} written`);
  console.log(`  @identities  ${identitiesUrl}`);
  console.log(`  @circles     ${circlesUrl}`);
  console.log(`  @sessions    ${sessionsUrl}`);
  console.log(`  @daemon       ${daemonUrl}`);
  console.log(`  @persona      ${personaUrl}`);
  console.log(`  PersonaGroup  ${personaGroupDocIdHex.slice(0, 20)}…`);
  console.log(`  MeshCabal    ${meshCabalDocIdHex.slice(0, 20)}…`);
  console.log(`  operator-root ${signerDid.slice(0, 20)}…`);
  console.log(`  persona-KEL   ${personaKelPrefix.slice(0, 20)}…  (the pinned identifier the Binding Gate walks)`);
  console.log(`  hearth-name   ${hearthTrueName.slice(0, 20)}…  (binding: device × hearthTrueName)`);
  console.log("[lares init] done — Nexus node ready. Start with: lares dev");

  return { skipped: false, bootstrapPath: bootstrap, storageDir, genesisDir };
}
