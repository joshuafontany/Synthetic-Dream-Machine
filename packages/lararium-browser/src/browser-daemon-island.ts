/**
 * browser-daemon-island — browser Web Worker entry point for the daemon island.
 *
 * Sovereign daemon island AND the operator's authn/z home (isomorphic-vessel
 * Stage 1). Composition only: the browser sovereign kernel + the shared
 * keyhive-wired daemon behavior (makeOperatorDaemonBehavior, @lararium/keyhive) —
 * byte-identical wiring to the node daemon entry, which is why it lives once in
 * keyhive. This file picks only the platform kernel.
 *
 * Island Sovereignty Law §9: TW5 boots here, inside a sovereign Worker.
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/browser-daemon-island
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { makeOperatorDaemonBehavior } from "@lararium/keyhive/operator-daemon-behavior";
import { mountProjection, seedDaemonUiTiddlers, seedDaemonPersonaTiddlers } from "@lararium/tw5";

// The @daemon INHERITS the wiki render cap (hasProjection). Mount its projection DORMANT at island-boot —
// exactly as a pool wiki mounts its camera — so summoning the @daemon is a pure active-surface gate flip,
// never a worker re-manifest (the HA·BA braid: mount-then-flip, fully live, uniform across surfaces). The
// frames ride onProjection to the boot; the boot's active-surface gate decides whether they paint #projection.
runBrowserSovereignWorker((manifest) =>
  makeOperatorDaemonBehavior(manifest, {
    // Born-from-source: paint the @daemon UX widget's CODE tiddlers + open the switcher
    // wrapper as the story's INITIAL content — BEFORE the camera renders, so no
    // story-navigation beat (which would reference `window` in this headless Worker).
    onBoot: (ctx) => { seedDaemonUiTiddlers(ctx.tw5); seedDaemonPersonaTiddlers(ctx.tw5); return mountProjection(ctx); },
  }));
