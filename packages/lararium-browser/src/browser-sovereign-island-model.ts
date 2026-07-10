/**
 * browser-sovereign-island-model — browser host seam for the sovereign kernel.
 *
 * The lifecycle itself lives in @lararium/tw5 `runSovereignKernel` — ONE flow
 * both vessels compose. This file supplies only the browser platform pieces:
 *   - transport : Web Worker self (self.postMessage / self.addEventListener)
 *   - storage   : IndexedDBStorageAdapter keyed by wikiUri — island owns its
 *                 own persistence partition
 *   - ready     : self.postMessage(mkReady()) — IoC handshake; the WASM
 *                 top-level await in this ES-module Worker completes before the
 *                 kernel fires it, so the vessel may send a manifest only after.
 *
 * Divergence is COMPOSITION (which pieces the seam resolves), not an OO
 * platform interface. See feedback_isomorphism_by_composition.
 *
 * ## VM Pool alignment
 *
 *   Browser vessel: Daemon island (sovereign island) + Pinned (primary wiki)
 *                   + N hot islands (session wikis, LRU-evicted to cold)
 *   Every hot island runs via runBrowserSovereignWorker(behavior).
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/browser-sovereign-island-model
 */

import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import {
  runSovereignKernel,
  type IslandHostSeam,
} from "@lararium/tw5";
import { mkReady } from "@lararium/mesh";
import type { IslandMsg_Manifest, IslandToVesselMsg } from "@lararium/mesh";
import type { IslandBehavior } from "@lararium/tw5";
import { readCasBlobFromOpfs } from "./browser-genesis.js";

// ── runBrowserSovereignWorker — browser host seam over the shared kernel ────

export function runBrowserSovereignWorker(
  behaviorOrFactory: IslandBehavior | ((manifest: IslandMsg_Manifest) => IslandBehavior),
): void {
  const host: IslandHostSeam = {
    post:    (msg: IslandToVesselMsg) => self.postMessage(msg),
    listen:  (onMessage) => self.addEventListener("message", (e: MessageEvent) => onMessage(e.data)),
    storage: (msg) => new IndexedDBStorageAdapter(msg.wikiUri),
    ready:   () => self.postMessage(mkReady()),
    // The breath path: pull engine + plugin bytes by CID from the OPFS CAS the vessel
    // populated on genesis-load — never CRDT-synced over the port.
    resolveByCid: (cid) => readCasBlobFromOpfs(cid),
  };

  runSovereignKernel(host, behaviorOrFactory);
}
