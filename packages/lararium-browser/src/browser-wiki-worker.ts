/**
 * browser-wiki-worker — browser Web Worker entry point for wiki authorities.
 *
 * Sovereign wiki island. Runs the shared browser-sovereign-island-model
 * lifecycle with BrowserWikiBehavior. Registers the Residency Model ACTION
 * verb family (ADD / COPY / MOVE / CLEAR / DROP / LOAD) on a VerbTable so
 * operator-submitted verb-tiddlers dispatch through action-handler.ts (which
 * lives in @lararium/tw5 — shared with the Node vessel for parity).
 *
 * Recipe expansion follows the canonical WikiRecipe shape — see
 * browser-sovereign-island-model.ts for the slot table.
 *
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-wiki-worker
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { VerbTable, registerActionReactors } from "@lararium/tw5";
import type { IslandBehavior, IslandContext } from "@lararium/tw5";

let _registry: VerbTable | null = null;

const BrowserWikiBehavior: IslandBehavior = {
  onEa(ctx: IslandContext) {
    // Residency Model ACTION verb family — same registration set as the Node
    // vessel's makeWikiPrimaryBehavior. Browser + Node share action-handler.ts
    // in @lararium/tw5; isomorphic dispatch through identical reactors.
    _registry = new VerbTable();
    registerActionReactors(_registry, { composite: ctx.composite });
  },
  onSignal(_type: string, _raw: unknown, _ctx: IslandContext): boolean {
    // wiki:place-verb dispatch in the browser vessel waits on the operator-
    // facing message wire that mirrors makeWikiPrimaryBehavior's onSignal in
    // @lararium/node. Sprint 6 lands the registration; the dispatch hookup
    // belongs to a follow-up that lights up the per-vessel admin signal path.
    // The _registry is reachable; future code can `_registry?.get(verb)?.(...)`.
    void _registry;
    return false;
  },
  onDemote: () => {
    _registry = null;
  },
};

runBrowserSovereignWorker(BrowserWikiBehavior);
