/**
 * browser-admin-island — browser Web Worker entry point for the admin island.
 *
 * Sovereign admin island. Runs the shared browser sovereign island lifecycle
 * with the isomorphic makeAdminBehavior: JobDispatcher subscribed to TW5 wiki
 * change events (local path) + CRDT inbox relay (remote path). Delegation
 * routing via AdminMsg_DelegateJob / AdminMsg_JobResult.
 *
 * Platform counterpart of lar-admin-island.ts (Node). Both import
 * makeAdminBehavior from @lararium/tw5 — no platform fork in the behavior.
 *
 * Island Sovereignty Law §9: TW5 boots here, inside a sovereign Worker.
 * The main thread holds DocHandle references and CompositeStore layers only.
 *
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-admin-island
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { makeAdminBehavior }          from "@lararium/tw5";

runBrowserSovereignWorker(makeAdminBehavior());
