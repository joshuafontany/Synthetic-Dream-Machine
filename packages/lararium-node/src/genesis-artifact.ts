/**
 * genesis-artifact — genesis binary I/O and island reconcile surface.
 *
 * Exports:
 *   readGenesisSha256        — read advisory sha256 from genesis/island.sha256
 *   readGenesisCid           — derive CIDv1 from sha256 or genesis/island.cid
 *   GENESIS_CID              — cached CIDv1 of the bundled genesis artifact
 *   loadGenesisIsland        — import genesis/island.bin into a repo; return DocHandle<LarDoc>
 *   reconcileIslandFromGenesis — merge genesis into a live doc when CID diverges
 *   reconcileWellKnownTiddlers — write runtime oracle tiddlers (Tiga edges) into the island handle
 *
 * Node read path: readFileSync(genesis/island.bin) resolved relative to import.meta.url.
 * Browser path (future, @dreamdeck/app): bundler binary loader inlines island.bin as Uint8Array.
 */

import { repoRoot } from "@lararium/mesh/node";
import { readFileSync, existsSync }  from "fs";
import { join, dirname }             from "path";
import { fileURLToPath }             from "url";
import { automergeLoad } from "@lararium/mesh";
import type { Repo, DocHandle }      from "@automerge/automerge-repo";
import type { LarDoc }               from "@lararium/mesh";
import {
  ENGINE_CORE_ID,
  LARARIUM_DOC_URI,
  CATALOG_DOC_URI,
  LARES_DOC_URI,
  LARES_MEMETIC_WIKITEXT_PLUGIN_URI,
  IDENTITIES_DOC_URI,
  CIRCLES_DOC_URI,
  SESSIONS_DOC_URI,
  ADMIN_BAG_ID,
  mutableLarRecord,
  tiddlerText,
  emptyLarDoc,
  cidV1Sha256FromHex,
} from "@lararium/mesh";

// ---------------------------------------------------------------------------
// Genesis bytes source
// ---------------------------------------------------------------------------

const __dir              = dirname(fileURLToPath(import.meta.url));
const DEFAULT_GENESIS_DIR = join(repoRoot, "genesis");   // one root law (early alpha, no package-dir compatibility)

function genesisArtifactPaths(genesisDir?: string): { bin: string; sha: string; cid: string } {
  const root = genesisDir ?? DEFAULT_GENESIS_DIR;
  return {
    bin: join(root, "island.bin"),
    sha: join(root, "island.sha256"),
    cid: join(root, "island.cid"),
  };
}

function readGenesisBin(genesisDir?: string): Uint8Array {
  const { bin } = genesisArtifactPaths(genesisDir);
  if (!existsSync(bin)) {
    throw new Error(
      `[genesis-artifact] genesis/island.bin not found at ${bin}\n` +
      `  → run: pnpm --filter @lararium/node build:genesis`,
    );
  }
  return new Uint8Array(readFileSync(bin));
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
  const key = genesisDir ?? DEFAULT_GENESIS_DIR;
  if (!_genesisCid.has(key)) _genesisCid.set(key, readGenesisCid(genesisDir));
  return _genesisCid.get(key);
}

// ---------------------------------------------------------------------------
// loadGenesisIsland
// ---------------------------------------------------------------------------

export async function loadGenesisIsland(repo: Repo, genesisDir?: string): Promise<DocHandle<LarDoc>> {
  const bytes = readGenesisBin(genesisDir);

  // Smoke-verify bytes before importing: Automerge.load() checks format.
  try {
    const preview = automergeLoad<LarDoc>(bytes);
    if (!preview.blobs?.[ENGINE_CORE_ID]) {
      throw new Error(
        `[genesis-artifact] genesis artifact missing TW5 core blob (${ENGINE_CORE_ID}).\n` +
        `  CID mismatch or corrupt file. Re-run: pnpm --filter @lararium/node build:genesis`,
      );
    }
  } catch (err) {
    if ((err as Error).message.includes("genesis artifact")) throw err;
    throw new Error(`[genesis-artifact] genesis/island.bin failed Automerge.load() validation: ${err}`);
  }

  const handle = repo.import<LarDoc>(bytes);
  await handle.whenReady();

  const doc = handle.doc();
  if (!doc?.blobs?.[ENGINE_CORE_ID]) {
    throw new Error("[genesis-artifact] handle.whenReady() resolved but TW5 core blob is absent — import failed silently.");
  }

  const blobCount    = Object.keys(doc.blobs ?? {}).length;
  const tiddlerCount = Object.keys(doc.tiddlers ?? {}).length;
  const pluginOk     = Boolean(doc.blobs?.[LARES_MEMETIC_WIKITEXT_PLUGIN_URI]);
  if (!pluginOk) {
    throw new Error("[genesis-artifact] genesis artifact missing packed Lares TW5 plugin — run build:genesis after build:plugin.");
  }
  console.log(
    `[genesis-artifact] loaded  url=${handle.url}  blobs=${blobCount}  plugin=lares-memetic-wikitext  tiddlers=${tiddlerCount}`,
  );

  return handle;
}

// ---------------------------------------------------------------------------
// reconcileIslandFromGenesis
// ---------------------------------------------------------------------------

export async function reconcileIslandFromGenesis(
  handle:        DocHandle<LarDoc>,
  genesisHandle: DocHandle<LarDoc>,
  genesisDir?: string,
): Promise<void> {
  const expectedCid = GENESIS_CID(genesisDir);
  if (!expectedCid) {
    console.warn("[genesis-artifact] reconcile: genesis CID unavailable — skipping reconcile");
    return;
  }

  const GENESIS_CID_TIDDLER = `${LARARIUM_DOC_URI}/genesis-cid`;
  const liveCid = handle.doc()?.tiddlers?.[GENESIS_CID_TIDDLER]?.tiddler?.["cid"] as string | undefined;

  if (liveCid === expectedCid) {
    console.log("[genesis-artifact] reconcile: live doc current — no merge needed");
    return;
  }

  console.log(
    `[genesis-artifact] reconcile: merging genesis into live doc` +
    `  live-cid=${liveCid?.slice(0, 12) ?? "absent"}  expected=${expectedCid.slice(0, 12)}`,
  );

  const genDoc = genesisHandle.doc();
  if (!genDoc) {
    console.warn("[genesis-artifact] reconcile: genesisHandle.doc() null — skipping");
    return;
  }
  handle.merge(genesisHandle);

  handle.change((doc) => {
    doc.tiddlers[GENESIS_CID_TIDDLER] = mutableLarRecord(GENESIS_CID_TIDDLER, {
      cid: expectedCid,
    }, "genesis");
  });

  console.log("[genesis-artifact] reconcile: merge complete — genesis CID updated in live doc");
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
  // Two node homes federating one @lararium doc may still race; LWW settles
  // it — re-read and adopt the winner (an orphaned empty mint costs nothing).
  return tiddlerText(islandHandle.doc()?.tiddlers?.[LARES_DOC_URI]) ?? minted.url;
}

// ---------------------------------------------------------------------------
// reconcileWellKnownTiddlers — runtime oracle tiddler writer
// ---------------------------------------------------------------------------

export function reconcileWellKnownTiddlers(
  handle:         DocHandle<LarDoc>,
  catalogUrl:     string,
  laresUrl?:      string,
  identitiesUrl?: string,
  groupsUrl?:     string,
  sessionsUrl?:   string,
  adminUrl?:      string,
): void {
  const doc      = handle.doc();
  const tiddlers = doc?.tiddlers ?? {};
  const selfOk = tiddlers[LARARIUM_DOC_URI]?.tiddler.text === handle.url;
  const catOk  = tiddlers[CATALOG_DOC_URI]?.tiddler.text  === catalogUrl;
  const baOk   = laresUrl        ? tiddlers[LARES_DOC_URI]?.tiddler.text      === laresUrl       : true;
  const idOk   = identitiesUrl   ? tiddlers[IDENTITIES_DOC_URI]?.tiddler.text === identitiesUrl  : true;
  const grOk   = groupsUrl       ? tiddlers[CIRCLES_DOC_URI]?.tiddler.text    === groupsUrl      : true;
  const seOk   = sessionsUrl     ? tiddlers[SESSIONS_DOC_URI]?.tiddler.text   === sessionsUrl    : true;
  const adOk   = adminUrl        ? tiddlers[ADMIN_BAG_ID]?.tiddler.text       === adminUrl       : true;
  if (selfOk && catOk && baOk && idOk && grOk && seOk && adOk) return;

  handle.change((d) => {
    if (!selfOk) d.tiddlers[LARARIUM_DOC_URI] = mutableLarRecord(LARARIUM_DOC_URI, { text: handle.url, kind: "oracle" }, "lararium-seed");
    if (!catOk)  d.tiddlers[CATALOG_DOC_URI]  = mutableLarRecord(CATALOG_DOC_URI, { text: catalogUrl, kind: "oracle" }, "lararium-seed");
    if (!baOk  && laresUrl)      d.tiddlers[LARES_DOC_URI]      = mutableLarRecord(LARES_DOC_URI, { text: laresUrl, kind: "oracle" }, "lararium-seed");
    if (!idOk  && identitiesUrl) d.tiddlers[IDENTITIES_DOC_URI] = mutableLarRecord(IDENTITIES_DOC_URI, { text: identitiesUrl }, "lararium-seed");
    if (!grOk  && groupsUrl)     d.tiddlers[CIRCLES_DOC_URI]    = mutableLarRecord(CIRCLES_DOC_URI, { text: groupsUrl }, "lararium-seed");
    if (!seOk  && sessionsUrl)   d.tiddlers[SESSIONS_DOC_URI]   = mutableLarRecord(SESSIONS_DOC_URI, { text: sessionsUrl }, "lararium-seed");
    if (!adOk  && adminUrl)      d.tiddlers[ADMIN_BAG_ID]       = mutableLarRecord(ADMIN_BAG_ID, { text: adminUrl }, "lararium-seed");
  });

  const flags = [
    `self=${selfOk ? "ok" : "patched"}`,
    `catalog=${catOk ? "ok" : "patched"}`,
    `lares=${baOk       ? "ok" : laresUrl       ? "patched" : "pending"}`,
    `identities=${idOk  ? "ok" : identitiesUrl  ? "patched" : "pending"}`,
    `circles=${grOk     ? "ok" : groupsUrl       ? "patched" : "pending"}`,
    `sessions=${seOk    ? "ok" : sessionsUrl     ? "patched" : "pending"}`,
    `admin=${adOk       ? "ok" : adminUrl        ? "patched" : "pending"}`,
  ].join("  ");
  console.log(`[genesis-artifact] oracle tiddlers  ${flags}`);
}
