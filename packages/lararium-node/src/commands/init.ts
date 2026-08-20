/**
 * runInit — Node adapter: one-time social-plane bootstrap for a new Lararium node.
 *
 * Node-specific shores (only these belong here):
 *   - NodeFSStorageAdapter for Automerge repo
 *   - generateOrLoadVesselIdentity / loadVesselSigningSeed (disk keypair)
 *   - writeFileSync for the social bootstrap (<lares>/vessel — see larBootstrapPath)
 *   - the composable genesis cap (daemonGenesisDir) for default directory resolution
 *
 * All ceremony logic lives in @lararium/keyhive (foundThePlace, foundTheFace,
 * runApplyAdmitPayload) and runs identically in browser + mobile vessels.
 *
 * THE TWO HALVES: `runInit` stands the PLACE alone — a vessel that carries and serves, holding no
 * human face. `runFoundTheFace` lands the persona half whenever an operator arrives to light it.
 *
 * Re-running stays idempotent: when the social bootstrap already lives
 * on disk, the function returns early without re-seeding.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  DAEMON_BAG_ID, personaMembershipEntries, personaScopedBagIds,
  PERSONA_GROUP_DOC_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
} from "@lararium/mesh";
import { daemonGenesisDir } from "../lares-config.js";
import { larDataDir, larBootstrapPath } from "../vessel-paths.js";
import { persistIdentityAnchors } from "../identity-anchors.js";
import {
  generateOrLoadVesselIdentity, loadVesselSigningSeed, persistVesselCard,
  generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed,
} from "../node-vessel-identity.js";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { LarDoc } from "@lararium/mesh";
import { GENESIS_ENGINE_CID } from "../genesis-artifact.js";
import {
  foundThePlace, foundTheFace, runApplyAdmitPayload, type DeviceAdmitPayload,
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

type PackedTiddler  = { title: string; text: string; kind: string };
type PackedTiddlers = Record<string, PackedTiddler>;

/** Wrap a packed tiddler map as the bootstrap plugin the vessel reads at boot. */
function bootstrapPlugin(packedTiddlers: PackedTiddlers): object {
  return {
    title:         SOCIAL_BOOTSTRAP_PLUGIN_TITLE,
    "plugin-type": "plugin",
    type:          "application/json",
    tags:          "lar:///ha.ka.ba/tags/lararium-bootstrap",
    text:          JSON.stringify({ tiddlers: packedTiddlers }),
  };
}

/** What a PLACE bootstrap carries: its sovereign island, and nothing of any person. */
function placeTiddlers(daemonUrl: string): PackedTiddlers {
  return {
    [DAEMON_BAG_ID]: { title: DAEMON_BAG_ID, text: daemonUrl, kind: "oracle" },
  };
}

/** What a FACE adds on top: the social planes, the PersonaGroup that names them, and the cabal it seats in. */
function faceTiddlers(
  identitiesUrl: string, circlesUrl: string, sessionsUrl: string, personaUrl: string,
  personaGroupDocIdHex: string, meshCabalDocIdHex: string,
): PackedTiddlers {
  // A FACE'S PLANES ARE NAMED BY THE FACE. All four ride names derived off the one tag this
  // PersonaGroup's doc id yields, so the bootstrap that carries them says WHOSE they are; a
  // vessel-global `@circles` would name one shelf where a multitude needs one per face.
  const face = personaScopedBagIds(personaGroupDocIdHex);
  return {
    [MESH_CABAL_DOC_ID_TIDDLER]: { title: MESH_CABAL_DOC_ID_TIDDLER, text: meshCabalDocIdHex, kind: "sentinel-id" },
    [face.identities]: { title: face.identities, text: identitiesUrl, kind: "oracle" },
    [face.circles]:    { title: face.circles,    text: circlesUrl,    kind: "oracle" },
    [face.sessions]:   { title: face.sessions,   text: sessionsUrl,   kind: "oracle" },
    // The PersonaGroup plane and the membership that names it — written through the same pair a vessel
    // standing in a SECOND compartment would add, so founding and admission lay down one shape. The boot
    // path reads the family back by derivation; nothing here holds an order or an index.
    ...Object.fromEntries(
      personaMembershipEntries({ personaGroupId: personaGroupDocIdHex, url: personaUrl })
        .map((e) => [e.title, { title: e.title, text: e.text as string, kind: "oracle" }]),
    ),
    [PERSONA_GROUP_DOC_ID_TIDDLER]: { title: PERSONA_GROUP_DOC_ID_TIDDLER, text: personaGroupDocIdHex, kind: "sentinel-id" },
  };
}

/** Read the packed tiddlers back out of a bootstrap already on disk. */
function readPackedTiddlers(path: string): PackedTiddlers {
  const plugin = JSON.parse(readFileSync(path, "utf8")) as { text?: string };
  const packed = JSON.parse(plugin.text ?? '{"tiddlers":{}}') as { tiddlers?: PackedTiddlers };
  return packed.tiddlers ?? {};
}

export async function runInit(opts: InitOptions = {}): Promise<InitResult> {
  const defaults   = defaultDirs();
  const storageDir = opts.storageDir ?? defaults.storageDir;
  const genesisDir = opts.genesisDir ?? defaults.genesisDir;
  const bootstrap  = larBootstrapPath();

  if (existsSync(bootstrap) && !opts.force) {
    console.log(`[lares vessel found] ${bootstrap} already exists — skipping.`);
    console.log("  Pass --force or delete the file to re-seed.");
    return { skipped: true, bootstrapPath: bootstrap, storageDir, genesisDir };
  }

  mkdirSync(storageDir, { recursive: true });
  mkdirSync(genesisDir, { recursive: true });

  // ── THE PRECONDITION RUNS BEFORE THE FIRST MUTATION ──────────────────────────────────────────
  // A founding binds (device × hearthTrueName), so an absent engine CID means there is nothing to bind
  // TO and no founding can complete. Checked LATER, this same refusal arrived after the vessel keypair
  // and the PersonaGroup root had already been minted — a tree carrying keys and no charter, which reads
  // like damage even though both mints load-or-create and a re-run heals them.
  //
  // A gate that fires after the act it guards teaches the operator to distrust a clean refusal.
  const hearthTrueName = GENESIS_ENGINE_CID(genesisDir);
  if (!hearthTrueName) {
    throw new Error(
      "[lares vessel found] cannot found: hearth true-name (engine CID) absent from " + genesisDir + " —\n" +
      "  the genesis seed carries it. In this repo: `pnpm --filter @lararium/node build:genesis`.\n" +
      "  Founding an ISOLATED root (LAR_ROOT)? Seed the tracked genesis into it first:\n" +
      "    (cd <repo> && git ls-files -z genesis/ | xargs -0 -I{} cp --parents \"{}\" \"$LAR_ROOT/\")",
    );
  }

  const operatorIdentity = await generateOrLoadVesselIdentity(storageDir);
  console.log(`[lares vessel found] operator verifyingKey  ${operatorIdentity.verifyingKey.slice(0, 16)}…`);

  const repo = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });

  if (opts.admitPayloadPath) {
    // ── Vessel-admission path = the UPGRADE event (a fresh vessel joins a PersonaGroup) ──
    // The joinee's vessel key (above) is the DELEGATE; the payload carries the pinned signer +
    // the root→joinee edge (the founder's PersonaGroup root signed it). The joinee writes that
    // binding into its OWN daemon doc and boots through its Binding Gate — no Beelay, no cap events.
    if (!existsSync(opts.admitPayloadPath)) {
      throw new Error(`[lares vessel found --admit] payload file not found: ${opts.admitPayloadPath}`);
    }
    const payload = JSON.parse(readFileSync(opts.admitPayloadPath, "utf8")) as DeviceAdmitPayload;
    if (payload.kind !== "device-admit/v1") {
      throw new Error(`[lares vessel found --admit] unexpected payload kind: ${payload.kind}`);
    }
    // The joinee's OWN seed — the admit supplies the BINDING; the vessel supplies the SELF. The ceremony
    // mints this vessel's self-certifying ContactCard from it, and a cardless vessel cannot speak at a gate.
    const admitSeed = await loadVesselSigningSeed(storageDir);
    const { contactCardJson, identitiesUrl, circlesUrl, sessionsUrl, daemonUrl, personaUrl, hearthDaemonUrl } = await runApplyAdmitPayload({
      repo,
      vesselSeed: admitSeed,
      vesselVerifyingKey: operatorIdentity.verifyingKey,
      vesselDisplayName:  operatorIdentity.displayName ?? "operator",
      payload,
      // The joinee's own gate key IS its Nexus key — the local KEL board it seeds the founder's inception onto.
      nexusPubkey: operatorIdentity.verifyingKey,
    });

    // An admit lands a place AND a contracted face in one act — the contracting operator already signed
    // the edge, so nothing waits on a later ceremony here.
    writeFileSync(bootstrap, JSON.stringify(bootstrapPlugin({
      ...placeTiddlers(daemonUrl),
      ...faceTiddlers(identitiesUrl, circlesUrl, sessionsUrl, personaUrl,
                      payload.personaGroupDocIdHex, payload.meshCabalDocIdHex),
    }), null, 2), "utf8");
    // A joined vessel persists the SAME anchors from the admit payload — its identity home
    // now backstops the veiled Handle exactly as the founder's does.
    persistIdentityAnchors({
      personaGroupDocIdHex:    payload.personaGroupDocIdHex,
      meshCabalDocIdHex:       payload.meshCabalDocIdHex,
      personaGroupAgentIdHex:  payload.personaGroupAgentIdHex,
    });
    await repo.flush();

    console.log(`[lares vessel found --admit] vessel ${operatorIdentity.verifyingKey.slice(0, 16)}… admitted`);
    console.log(`  @persona      ${personaUrl}${payload.personaUrl ? " (synced from founder)" : " (fresh local — payload carried none)"}`);
    console.log(`  PersonaGroup ${payload.personaGroupDocIdHex.slice(0, 20)}…`);
    console.log(`  signer pin   ${payload.signerDid.slice(0, 20)}…`);
    console.log(`  hearth-name  ${payload.hearthTrueName.slice(0, 20)}…  (binding: device × hearthTrueName)`);
    console.log("[lares vessel found --admit] done — joined the PersonaGroup. Start with: lares vessel stand --with-app");
    return { skipped: false, bootstrapPath: bootstrap, storageDir, genesisDir };
  }

  // ── PLACE-FOUNDING — a somewhere, standing on its own key alone ─────────────────────────────
  // Canon rules the halves apart (identity-classes#herm-establishment): a vessel "boots permissionlessly
  // on its own key… it asks no blessing to exist", and NO civic identity mints into it. So founding stands
  // the PLACE — the sovereign @daemon island, the vessel's own Keyhive individual, and the blind-carriage
  // cabal seated on that individual — and stops there. The vessel now carries, serves the public shelf,
  // and holds every sovereign act closed: the waking floor, reached by founding rather than by falling.
  //
  // The FACE lands later, by an operator act: `lares persona new 0 --name '<label>'` runs `runFoundTheFace`
  // below. A hearth whose operator stands right here types two commands instead of one, and a crossroads
  // never types the second at all.
  const vesselSeed = await loadVesselSigningSeed(storageDir);

  const place = await foundThePlace({ repo, vesselSeed, hearthTrueName });

  // Cache the vessel's ContactCard for the light leaf-identity path — a CLI/agent
  // re-presents it on every peer handshake without booting keyhive (OP-AP5).
  await persistVesselCard(storageDir, place.contactCardJson);

  writeFileSync(bootstrap, JSON.stringify(
    bootstrapPlugin(placeTiddlers(place.daemonUrl)), null, 2), "utf8");
  // NO anchors land here. The veiled-Handle anchor set keys by handle-index and names a PERSONA's
  // planes — a place that holds no face holds no handle to anchor. `runFoundTheFace` writes the set.
  await repo.flush();

  console.log(`[lares vessel found] ${bootstrap} written`);
  console.log(`  @daemon       ${place.daemonUrl}`);
  console.log(`  hearth-name   ${hearthTrueName.slice(0, 20)}…  (the place this vessel stands at)`);
  console.log("[lares vessel found] the PLACE stands — carrying, serving the public shelf, faceless.");
  console.log("  stand it:      lares vessel stand");
  console.log("  light a face:  lares persona new 0 --name '<label>'");

  return { skipped: false, bootstrapPath: bootstrap, storageDir, genesisDir };
}


// ---------------------------------------------------------------------------
// The face half — landed by an operator act, onto a place that already stands
// ---------------------------------------------------------------------------

export interface FoundFaceOptions {
  readonly storageDir?: string;
  readonly genesisDir?: string;
}

/** Whether a face already stands on this place — a pure read that founds nothing. */
export function faceStands(): boolean {
  const bootstrap = larBootstrapPath();
  if (!existsSync(bootstrap)) return false;
  return Boolean(readPackedTiddlers(bootstrap)[PERSONA_GROUP_DOC_ID_TIDDLER]?.text);
}

export interface FoundFaceResult {
  readonly alreadyStood:         boolean;
  readonly personaGroupDocIdHex: string;
  readonly personaKelPrefix:     string;
  readonly signerDid:            string;
}

/**
 * Land the FACE onto a standing place — the operator act that turns a carrying vessel into a hearth.
 *
 * It refuses on a place that has not been founded (nothing to land on) and reads as a no-op on a vessel
 * that already holds a face: a second face would fork the very continuity the persona-KEL pin exists to
 * hold, so the idempotence here is a safety property rather than a convenience.
 */
export async function runFoundTheFace(opts: FoundFaceOptions = {}): Promise<FoundFaceResult> {
  const defaults   = defaultDirs();
  const storageDir = opts.storageDir ?? defaults.storageDir;
  const genesisDir = opts.genesisDir ?? defaults.genesisDir;
  const bootstrap  = larBootstrapPath();

  if (!existsSync(bootstrap)) {
    throw new Error("[lares persona new] no place stands here — run `lares vessel found` first.");
  }
  const packed = readPackedTiddlers(bootstrap);

  const already = packed[PERSONA_GROUP_DOC_ID_TIDDLER]?.text;
  if (already) {
    return {
      alreadyStood: true, personaGroupDocIdHex: already,
      personaKelPrefix: "", signerDid: "",
    };
  }

  const daemonUrl = packed[DAEMON_BAG_ID]?.text;
  if (!daemonUrl) {
    throw new Error("[lares persona new] the bootstrap names no @daemon — this place did not finish founding.");
  }

  const hearthTrueName = GENESIS_ENGINE_CID(genesisDir);
  if (!hearthTrueName) {
    throw new Error(`[lares persona new] hearth true-name (engine CID) absent from ${genesisDir} — the edge binds (device × hearthTrueName) and has nothing to bind to.`);
  }

  const vesselIdentity = await generateOrLoadVesselIdentity(storageDir);
  const vesselSeed     = await loadVesselSigningSeed(storageDir);
  const repo           = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  const daemonHandle   = await repo.find<LarDoc>(daemonUrl as AutomergeUrl);

  // The persona ROOT — the human's side. It only ever SIGNS; the per-vessel key stays the Individual.
  // The founding root seats at h0 ALWAYS — the face IS the vessel's first persona, and a founding that
  // seated it anywhere else would leave h0 empty beneath a group that names it.
  await generateOrLoadPersonaGroupRoot(storageDir, 0);
  const signerSeed = await loadPersonaGroupRootSeed(storageDir, 0);

  const face = await foundTheFace({
    repo,
    daemonHandle,
    vesselSeed,
    vesselVerifyingKey: vesselIdentity.verifyingKey,
    vesselDisplayName:  vesselIdentity.displayName ?? "operator",
    binding: { mode: "self-stood", signerSeed },
    hearthTrueName,
    // This node's own gate key IS its Nexus key — the per-Nexus KEL board the inception seats onto.
    nexusPubkey: vesselIdentity.verifyingKey,
  });

  writeFileSync(bootstrap, JSON.stringify(bootstrapPlugin({
    ...packed,
    ...faceTiddlers(face.identitiesUrl, face.circlesUrl, face.sessionsUrl, face.personaUrl,
                    face.personaGroupDocIdHex, face.meshCabalDocIdHex),
  }), null, 2), "utf8");
  persistIdentityAnchors({
    meshCabalDocIdHex:      face.meshCabalDocIdHex,
    personaGroupDocIdHex:   face.personaGroupDocIdHex,
    personaGroupAgentIdHex: face.personaGroupAgentIdHex,
  });
  await repo.flush();

  return {
    alreadyStood: false,
    personaGroupDocIdHex: face.personaGroupDocIdHex,
    personaKelPrefix:     face.personaKelPrefix,
    signerDid:            face.signerDid,
  };
}
