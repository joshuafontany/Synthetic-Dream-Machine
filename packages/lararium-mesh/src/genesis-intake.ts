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
import {
  LARARIUM_DOC_URI,
  LARES_MEMETIC_WIKITEXT_PLUGIN_URI,
} from "./lar-uris.js";

/** The oracle tiddler recording which genesis CID a live island doc carries. */
export const GENESIS_CID_TIDDLER = `${LARARIUM_DOC_URI}/genesis-cid`;

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
  /** True when the incoming genesis CID differed from the live doc — engine update merged. */
  updated: boolean;
  /** CID of the incoming genesis. */
  incomingCid: string;
  /** CID recorded in the live doc before reconcile, or null when absent. */
  previousCid: string | null;
}

/**
 * Compare the live island doc's recorded genesis CID against `incomingCid`.
 * On divergence: merge the incoming handle into the live one (Automerge merge
 * runs additive — operator-authored content survives under LWW) and record
 * the new CID so the next boot skips the merge. Equality no-ops.
 */
export function reconcileGenesisCid(
  liveHandle:     DocHandle<LarDoc>,
  incomingHandle: DocHandle<LarDoc>,
  incomingCid:    string,
): GenesisReconcileResult {
  // Self-merge guard: a fresh boot falls the island back to the genesis handle
  // itself (the bootstrap path — open-node-vessel waitHandleLocal fallback). A
  // doc merged into itself trips automerge 3.x's wasm borrow-checker ("recursive
  // use of an object … unsafe aliasing"); automerge 2.x silently no-op'd it.
  // When the live doc IS the genesis doc there is nothing to reconcile.
  if (liveHandle.url === incomingHandle.url) {
    return { updated: false, incomingCid, previousCid: incomingCid };
  }
  const previousCid =
    (liveHandle.doc()?.tiddlers?.[GENESIS_CID_TIDDLER]?.tiddler?.["cid"] as string | undefined) ?? null;

  if (previousCid === incomingCid) {
    return { updated: false, incomingCid, previousCid };
  }

  liveHandle.merge(incomingHandle);
  liveHandle.change((doc) => {
    doc.tiddlers[GENESIS_CID_TIDDLER] = mutableLarRecord(
      GENESIS_CID_TIDDLER,
      { cid: incomingCid },
      "genesis-reconcile",
    );
  });

  console.log(
    `[genesis-intake] engine update merged  prev=${previousCid?.slice(0, 12) ?? "none"}  new=${incomingCid.slice(0, 12)}`,
  );

  return { updated: true, incomingCid, previousCid };
}
