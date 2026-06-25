/**
 * genesis-intake — the ONE genesis intake core, platform-blind.
 *
 * The emitter lives next door (genesis-doc.ts: buildGenesisDoc /
 * verifyGenesisArtifact); this module carries the receiving side every
 * vessel runs: validate bytes → import → post-import verify, and the
 * CID-diverge reconcile. Until 2026-06-12 this logic lived twice —
 * genesis-artifact.ts (node) ⇆ browser-genesis.ts — and had already
 * drifted (record shape, authority string). One hull now; the platform
 * wrappers keep only their byte SOURCES (fs · bundle/IDB/OPFS/peer)
 * and their held offices (mintLaresIfAbsent stays in the node genesis
 * office — the gate enforces by placement).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/genesis-intake
 */

import type { Repo, DocHandle } from "@automerge/automerge-repo";
import { load as automergeLoad } from "@automerge/automerge";
import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord, ENGINE_CORE_ID } from "./base-doc.js";
import { LARES_MEMETIC_WIKITEXT_PLUGIN_URI } from "./lar-uris.js";
import { GENESIS_CID_ENGINE_TIDDLER, GENESIS_CID_PLUGINS_TIDDLER } from "./genesis-doc.js";

/** Read a region content-CID recorded in a live/incoming island doc, or null when absent. */
function regionCid(handle: DocHandle<LarDoc>, title: string): string | null {
  return (handle.doc()?.tiddlers?.[title]?.tiddler?.["cid"] as string | undefined) ?? null;
}
const short = (c: string | null): string => c?.slice(0, 12) ?? "none";

/**
 * Validate genesis bytes before any import: Automerge format, TW5 core blob,
 * packed Lares plugin. Throws loudly with `label` naming the calling intake;
 * returns the previewed doc for further inspection.
 */
export function validateGenesisBytes(bytes: Uint8Array, label: string): LarDoc {
  let preview: LarDoc;
  try {
    preview = automergeLoad<LarDoc>(bytes);
  } catch (err) {
    throw new Error(`[${label}] genesis bytes failed Automerge.load() validation: ${err}`);
  }
  if (!preview.blobs?.[ENGINE_CORE_ID]) {
    throw new Error(
      `[${label}] genesis artifact missing TW5 core blob (${ENGINE_CORE_ID}) — ` +
      `CID mismatch or corrupt artifact; rebuild genesis`,
    );
  }
  if (!preview.blobs?.[LARES_MEMETIC_WIKITEXT_PLUGIN_URI]) {
    throw new Error(
      `[${label}] genesis artifact missing packed Lares TW5 plugin — rebuild genesis after build:plugin`,
    );
  }
  return preview;
}

/**
 * Import genesis bytes into a Repo: validate → import → whenReady → verify
 * the imported doc actually carries the core blob (an import can fail
 * silently). Returns the live handle.
 */
export async function importGenesisIsland(
  repo:  Repo,
  bytes: Uint8Array,
  label: string,
): Promise<DocHandle<LarDoc>> {
  validateGenesisBytes(bytes, label);

  const handle = repo.import<LarDoc>(bytes);
  await handle.whenReady();

  const doc = handle.doc();
  if (!doc?.blobs?.[ENGINE_CORE_ID]) {
    throw new Error(`[${label}] handle.whenReady() resolved but TW5 core blob absent — import failed silently`);
  }

  const blobCount    = Object.keys(doc.blobs ?? {}).length;
  const tiddlerCount = Object.keys(doc.tiddlers ?? {}).length;
  console.log(`[${label}] loaded  url=${handle.url}  blobs=${blobCount}  tiddlers=${tiddlerCount}`);

  return handle;
}

export interface GenesisReconcileResult {
  /** True when either region CID differed from the live doc — the genesis merged. */
  updated: boolean;
  /** Incoming engine content-CID (the hearth true-name; slow ratchet), or null. */
  incomingEngineCid:  string | null;
  /** Incoming plugins content-CID (fast ratchet), or null. */
  incomingPluginsCid: string | null;
  /** Engine CID recorded in the live doc before reconcile, or null when absent. */
  previousEngineCid:  string | null;
  /** Plugins CID recorded in the live doc before reconcile, or null when absent. */
  previousPluginsCid: string | null;
}

/**
 * Compare the live island doc's two recorded region CIDs against the incoming doc's,
 * reading both straight from the incoming witness tiddlers (the source of truth in the
 * doc — no caller need pass them). Two ratchets, one merge: the engine (slow) OR the
 * plugins (fast) moving triggers a single additive Automerge merge (operator-authored
 * content survives under LWW); both CIDs re-record so the next boot skips the merge.
 * Both stable → no-op.
 */
export function reconcileGenesisCid(
  liveHandle:     DocHandle<LarDoc>,
  incomingHandle: DocHandle<LarDoc>,
): GenesisReconcileResult {
  const incomingEngineCid  = regionCid(incomingHandle, GENESIS_CID_ENGINE_TIDDLER);
  const incomingPluginsCid = regionCid(incomingHandle, GENESIS_CID_PLUGINS_TIDDLER);

  // Self-merge guard: a fresh boot falls the island back to the genesis handle
  // itself (the bootstrap path — open-node-vessel waitHandleLocal fallback). A
  // doc merged into itself trips automerge 3.x's wasm borrow-checker ("recursive
  // use of an object … unsafe aliasing"); automerge 2.x silently no-op'd it.
  // When the live doc IS the genesis doc there is nothing to reconcile.
  if (liveHandle.url === incomingHandle.url) {
    return {
      updated: false, incomingEngineCid, incomingPluginsCid,
      previousEngineCid: incomingEngineCid, previousPluginsCid: incomingPluginsCid,
    };
  }

  const previousEngineCid  = regionCid(liveHandle, GENESIS_CID_ENGINE_TIDDLER);
  const previousPluginsCid = regionCid(liveHandle, GENESIS_CID_PLUGINS_TIDDLER);

  const engineMoved  = previousEngineCid  !== incomingEngineCid;
  const pluginsMoved = previousPluginsCid !== incomingPluginsCid;
  if (!engineMoved && !pluginsMoved) {
    return { updated: false, incomingEngineCid, incomingPluginsCid, previousEngineCid, previousPluginsCid };
  }

  liveHandle.merge(incomingHandle);
  liveHandle.change((doc) => {
    if (incomingEngineCid !== null) {
      doc.tiddlers[GENESIS_CID_ENGINE_TIDDLER] = mutableLarRecord(
        GENESIS_CID_ENGINE_TIDDLER, { cid: incomingEngineCid }, "genesis-reconcile");
    }
    if (incomingPluginsCid !== null) {
      doc.tiddlers[GENESIS_CID_PLUGINS_TIDDLER] = mutableLarRecord(
        GENESIS_CID_PLUGINS_TIDDLER, { cid: incomingPluginsCid }, "genesis-reconcile");
    }
  });

  console.log(
    `[genesis-intake] genesis merged  ` +
    `engine ${engineMoved ? `${short(previousEngineCid)}→${short(incomingEngineCid)} (slow)` : "stable"}  ` +
    `plugins ${pluginsMoved ? `${short(previousPluginsCid)}→${short(incomingPluginsCid)} (fast)` : "stable"}`,
  );

  return { updated: true, incomingEngineCid, incomingPluginsCid, previousEngineCid, previousPluginsCid };
}
