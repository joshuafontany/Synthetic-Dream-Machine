/**
 * genesis-artifact — node genesis byte SOURCE + the node genesis office.
 *
 * The intake core (validate → import → verify, CID reconcile) lives ONCE in
 * @lararium/mesh `genesis-intake`; this file
 * keeps only what genuinely belongs to node:
 *   - the fs byte source (genesis/island.bin + sha256/cid sidecars)
 *   - GENESIS_CID — cached CIDv1 of the bundled artifact
 *   - mintLaresIfAbsent — the operator's node genesis office (gate by placement)
 *   - reconcileWellKnownTiddlers — runtime oracle tiddler writer
 */

import { daemonGenesisDir } from "./lares-config.js";
import { readFileSync, existsSync }  from "fs";
import { join }                      from "path";
import type { Repo, DocHandle }      from "@automerge/automerge-repo";
import type { LarDoc }               from "@lararium/mesh";
import {
  ORACLE_DOC_URI,
  CATALOG_DOC_URI,
  LARES_DOC_URI,
  LARARIUM_DOC_URI,
  type PersonaScopedBags,
  DAEMON_BAG_ID,
  mutableLarRecord,
  tiddlerText,
  emptyLarDoc,
  cidV1Sha256FromHex,
  materializeGenesisIsland,
  GENESIS_CAS_MANIFEST_FORMAT,
  GENESIS_SEED_FORMAT,
  type GenesisCasManifest,
  type GenesisSeed,
} from "@lararium/mesh";

// ---------------------------------------------------------------------------
// Genesis bytes source
// ---------------------------------------------------------------------------

/** The genesis dir when a caller sites none — resolves through the composable genesis cap
 *  (`LAR_GENESIS` → `~/.lares/config.json` → repo-relative `<corpus>/genesis`). Genesis stays
 *  checked-in-by-default, so a no-config boot lands on the repo's tracked seed exactly as before. */
function defaultGenesisDir(): string {
  return daemonGenesisDir();
}

function genesisArtifactPaths(genesisDir?: string): {
  bin: string; sha: string; cid: string; cidEngine: string; cidPlugins: string;
  manifest: string; seed: string; casDir: string;
} {
  const root = genesisDir ?? defaultGenesisDir();
  return {
    bin: join(root, "island.bin"),
    sha: join(root, "island.sha256"),
    cid: join(root, "island.cid"),            // whole-doc forward CID (integrity)
    cidEngine:  join(root, "island.cid-engine"),   // engine content-CID = the hearth true-name
    cidPlugins: join(root, "island.cid-plugins"),  // plugins content-CID = the fast ratchet
    manifest:   join(root, "island.manifest.json"),// the CAS manifest (engine + plugin cids)
    seed:       join(root, "island.genesis.json"), // the PLAIN-DATA @oracle seed (the boot artifact)
    casDir:     join(root, "cas"),                 // the byte SOURCE: genesis/cas/<cid> files
  };
}

/**
 * Read the plain-data genesis seed (island.genesis.json) — the @oracle's initial
 * state the boot MATERIALIZES fresh (slice 2: the genesis is data, not a baked
 * binary). Returns null when absent or malformed (a pre-slice-2 genesis).
 */
export function readGenesisSeed(genesisDir?: string): GenesisSeed | null {
  const { seed } = genesisArtifactPaths(genesisDir);
  try {
    const parsed = JSON.parse(readFileSync(seed, "utf8")) as GenesisSeed;
    if (parsed?.format !== GENESIS_SEED_FORMAT) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** The genesis CAS dir (genesis/cas) — the content-addressed byte SOURCE. */
export function genesisCasDir(genesisDir?: string): string {
  return genesisArtifactPaths(genesisDir).casDir;
}

/**
 * Read the genesis CAS manifest (island.manifest.json) — the index of which
 * `genesis/cas/<cid>` files belong to this artifact. Returns null when absent
 * (a pre-slice-1 genesis with embedded blobs) or malformed.
 */
export function readGenesisManifest(genesisDir?: string): GenesisCasManifest | null {
  const { manifest } = genesisArtifactPaths(genesisDir);
  try {
    const parsed = JSON.parse(readFileSync(manifest, "utf8")) as GenesisCasManifest;
    if (parsed?.format !== GENESIS_CAS_MANIFEST_FORMAT) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readGenesisSha256(genesisDir?: string): string | undefined {
  const { sha } = genesisArtifactPaths(genesisDir);
  try {
    return readFileSync(sha, "utf8").trim();
  } catch {
    return undefined;
  }
}

export function readGenesisCid(genesisDir?: string): string | undefined {
  const { cid } = genesisArtifactPaths(genesisDir);
  try {
    const cidText = readFileSync(cid, "utf8").trim();
    if (cidText) return cidText;
  } catch {
    // fall back to converting the advisory sha256 if the CID file is absent
  }
  const sha = readGenesisSha256(genesisDir);
  if (!sha) return undefined;
  try {
    return cidV1Sha256FromHex(sha);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// GENESIS_CID — cached CIDv1 derived at first call.
// ---------------------------------------------------------------------------

const _genesisCid = new Map<string, string | undefined>();

export function GENESIS_CID(genesisDir?: string): string | undefined {
  const key = genesisDir ?? defaultGenesisDir();
  if (!_genesisCid.has(key)) _genesisCid.set(key, readGenesisCid(genesisDir));
  return _genesisCid.get(key);
}

// ---------------------------------------------------------------------------
// Region content-CIDs (G-D2 two ratchets; G-D3 engineCid = the hearth true-name).
// ---------------------------------------------------------------------------

function readSidecar(path: string): string | undefined {
  try {
    const t = readFileSync(path, "utf8").trim();
    if (t) return t;
  } catch { /* sidecar absent */ }
  return undefined;
}

export function readGenesisEngineCid(genesisDir?: string): string | undefined {
  return readSidecar(genesisArtifactPaths(genesisDir).cidEngine);
}
export function readGenesisPluginsCid(genesisDir?: string): string | undefined {
  return readSidecar(genesisArtifactPaths(genesisDir).cidPlugins);
}

const _engineCid  = new Map<string, string | undefined>();
const _pluginsCid = new Map<string, string | undefined>();

/** The engine content-CID (slow ratchet) — the hearth's stable true-name (G-D3). */
export function GENESIS_ENGINE_CID(genesisDir?: string): string | undefined {
  const key = genesisDir ?? defaultGenesisDir();
  if (!_engineCid.has(key)) _engineCid.set(key, readGenesisEngineCid(genesisDir));
  return _engineCid.get(key);
}
/** The plugins content-CID (fast ratchet) — a per-operator composition, never the true-name. */
export function GENESIS_PLUGINS_CID(genesisDir?: string): string | undefined {
  const key = genesisDir ?? defaultGenesisDir();
  if (!_pluginsCid.has(key)) _pluginsCid.set(key, readGenesisPluginsCid(genesisDir));
  return _pluginsCid.get(key);
}

// ---------------------------------------------------------------------------
// hearthTrueName — the hearth's PUBLIC true-name (the place's public face).
// ---------------------------------------------------------------------------
//
// The hearth wears two faces, never fused (lar:///ha.ka.ba/lares/api/pono/
// lararium-identity#head). The PUBLIC face = the content-address of the place's
// GRAMMAR — the engine content-CID ALONE (G-D3), the TW5 core + version, NOT the
// plugins. Plugins compose per-operator (DreamNet-offered) and ride their own fast
// ratchet, so a plugin change MUST NEVER perturb the true-name. The engine face is
// shared DreamNet-wide, ratchets by engine-epoch, checked into git, holds NO secret.
// The PRIVATE face = a secret root minted per-founding (node-vessel-identity,
// gitignored), NEVER derived from this public content. This accessor surfaces the
// public engine face ONLY.
//
// Under capability-is-identity + petnames (#capability-and-petnames), this is the
// hearth's canonical STABLE petname — a content-addressed name for "which grammar/
// lineage this place speaks," legible across the mesh with no registry. It returns
// `undefined` when the genesis artifact is absent (mirrors GENESIS_ENGINE_CID).
export function hearthTrueName(genesisDir?: string): string | undefined {
  return GENESIS_ENGINE_CID(genesisDir);
}

// ---------------------------------------------------------------------------
// loadOrMaterializeOracle — the slice-2 boot path (no Automerge-binary seed)
// ---------------------------------------------------------------------------
//
// No island.bin import, no merge-into-stale reconcile. The @oracle is a LIVE CRDT: reload it under the
// deterministic id when persisted, else materialize it FRESH from the plain-data
// seed (island.genesis.json). One call, no merge.

export async function loadOrMaterializeOracle(repo: Repo, genesisDir?: string): Promise<DocHandle<LarDoc>> {
  const seed = readGenesisSeed(genesisDir);
  if (!seed) {
    throw new Error(
      `[genesis-artifact] plain-data genesis seed (island.genesis.json) absent or malformed\n` +
      `  → run: pnpm --filter @lararium/node build:genesis`,
    );
  }
  return materializeGenesisIsland(repo, seed, "genesis-artifact");
}

// ---------------------------------------------------------------------------
// mintLaresIfAbsent — operator(admin) mint of the @lares protocol invariant
// ---------------------------------------------------------------------------

/**
 * Gate: the most-restricted grant — operator(admin), timed. Only the node home
 * (the base @lararium node) mints protocol invariants; wild vessels receive
 * the plane by federating the @lararium doc, and the keel (assembleVessel)
 * only READS the oracle. Grant-proof enforcement arrives with keyhive;
 * placement enforces the gate today — this code runs solely in the operator's
 * node genesis office.
 */
export function mintLaresIfAbsent(repo: Repo, islandHandle: DocHandle<LarDoc>): string {
  const existing = tiddlerText(islandHandle.doc()?.tiddlers?.[LARES_DOC_URI]) ?? null;
  if (existing) return existing;
  const minted = repo.create<LarDoc>(emptyLarDoc());
  islandHandle.change((d) => {
    d.tiddlers[LARES_DOC_URI] = mutableLarRecord(LARES_DOC_URI, { text: minted.url, kind: "oracle" }, "operator-mint");
  });
  // Two node homes federating one @oracle doc may still race; LWW settles
  // it — re-read and adopt the winner (an orphaned empty mint costs nothing).
  return tiddlerText(islandHandle.doc()?.tiddlers?.[LARES_DOC_URI]) ?? minted.url;
}

/**
 * mintLarariumIfAbsent — the @lararium memetic corpus as its OWN doc (@oracle,
 * @lararium, @lares stand as three separate docs). Mirror
 * of mintLaresIfAbsent: the corpus pointer rides the @oracle system plane (the
 * island doc), never @catalog. The minted doc starts empty; corpus content fills
 * it by LOAD/ingest (`lares act LOAD … --to lar:///ha.ka.ba/bags/@lararium`) and the
 * disk mirror carries it back to `bags/@lararium`. Node genesis office only.
 */
export function mintLarariumIfAbsent(repo: Repo, islandHandle: DocHandle<LarDoc>): string {
  const existing = tiddlerText(islandHandle.doc()?.tiddlers?.[LARARIUM_DOC_URI]) ?? null;
  if (existing) return existing;
  const minted = repo.create<LarDoc>(emptyLarDoc());
  islandHandle.change((d) => {
    d.tiddlers[LARARIUM_DOC_URI] = mutableLarRecord(LARARIUM_DOC_URI, { text: minted.url, kind: "oracle" }, "operator-mint");
  });
  return tiddlerText(islandHandle.doc()?.tiddlers?.[LARARIUM_DOC_URI]) ?? minted.url;
}

// ---------------------------------------------------------------------------
// reconcileWellKnownTiddlers — runtime oracle tiddler writer
// ---------------------------------------------------------------------------

export function reconcileWellKnownTiddlers(
  handle:         DocHandle<LarDoc>,
  catalogUrl:     string,
  laresUrl?:      string,
  /** The face whose three travelling planes this island registers, or null where no face stands. Their
   *  names derive off the face's own tag, so the registry says WHOSE planes it names — and a second face
   *  on the same vessel registers a second set beside them rather than overwriting the first. */
  face?:          PersonaScopedBags | null,
  identitiesUrl?: string,
  groupsUrl?:     string,
  sessionsUrl?:   string,
  daemonUrl?:      string,
): void {
  const doc      = handle.doc();
  const tiddlers = doc?.tiddlers ?? {};
  const selfOk = tiddlers[ORACLE_DOC_URI]?.tiddler.text === handle.url;
  const catOk  = tiddlers[CATALOG_DOC_URI]?.tiddler.text  === catalogUrl;
  const baOk   = laresUrl        ? tiddlers[LARES_DOC_URI]?.tiddler.text      === laresUrl       : true;
  const idOk   = face && identitiesUrl ? tiddlers[face.identities]?.tiddler.text === identitiesUrl : true;
  const grOk   = face && groupsUrl     ? tiddlers[face.circles]?.tiddler.text    === groupsUrl     : true;
  const seOk   = face && sessionsUrl   ? tiddlers[face.sessions]?.tiddler.text   === sessionsUrl   : true;
  const adOk   = daemonUrl        ? tiddlers[DAEMON_BAG_ID]?.tiddler.text       === daemonUrl       : true;
  if (selfOk && catOk && baOk && idOk && grOk && seOk && adOk) return;

  handle.change((d) => {
    if (!selfOk) d.tiddlers[ORACLE_DOC_URI] = mutableLarRecord(ORACLE_DOC_URI, { text: handle.url, kind: "oracle" }, "lararium-seed");
    if (!catOk)  d.tiddlers[CATALOG_DOC_URI]  = mutableLarRecord(CATALOG_DOC_URI, { text: catalogUrl, kind: "oracle" }, "lararium-seed");
    if (!baOk  && laresUrl)      d.tiddlers[LARES_DOC_URI]      = mutableLarRecord(LARES_DOC_URI, { text: laresUrl, kind: "oracle" }, "lararium-seed");
    if (!idOk  && face && identitiesUrl) d.tiddlers[face.identities] = mutableLarRecord(face.identities, { text: identitiesUrl }, "lararium-seed");
    if (!grOk  && face && groupsUrl)     d.tiddlers[face.circles]    = mutableLarRecord(face.circles, { text: groupsUrl }, "lararium-seed");
    if (!seOk  && face && sessionsUrl)   d.tiddlers[face.sessions]   = mutableLarRecord(face.sessions, { text: sessionsUrl }, "lararium-seed");
    if (!adOk  && daemonUrl)      d.tiddlers[DAEMON_BAG_ID]       = mutableLarRecord(DAEMON_BAG_ID, { text: daemonUrl }, "lararium-seed");
  });

  const flags = [
    `self=${selfOk ? "ok" : "patched"}`,
    `catalog=${catOk ? "ok" : "patched"}`,
    `lares=${baOk       ? "ok" : laresUrl       ? "patched" : "pending"}`,
    `identities=${idOk  ? "ok" : identitiesUrl  ? "patched" : "pending"}`,
    `circles=${grOk     ? "ok" : groupsUrl       ? "patched" : "pending"}`,
    `sessions=${seOk    ? "ok" : sessionsUrl     ? "patched" : "pending"}`,
    `daemon=${adOk       ? "ok" : daemonUrl        ? "patched" : "pending"}`,
  ].join("  ");
  console.log(`[genesis-artifact] oracle tiddlers  ${flags}`);
}
