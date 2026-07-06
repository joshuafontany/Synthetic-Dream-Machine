/**
 * browser-sensorium-island.mjs — a REAL Web Worker island carrying the wiki-sensorium cap.
 *
 * Proves the supervision-reads wire in Chromium without a TW5 boot: the worker stands the consistency keystone's GLUE
 * fixture corpus behind `hasWikiSensorium`, breathes ea, and answers the vessel's sensorium
 * signals (`sensorium:cohere` / `sensorium:recall` / `sensorium:couple`) with SENSORIUM_FRAME
 * events over genuine postMessage — the exact leg the daemon's supervision reads ride.
 *
 *   manifest             -> stand fixture island + cap -> ea
 *   sensorium:*          -> cap.onSignal (the cap surface, un-re-implemented) -> event(sensorium:frame)
 *   teardown             -> cap teardown -> teardown:ack
 */

import { buildFixtureIsland, GLUE_SEEDS, hasWikiSensorium } from "@lararium/tw5";

let wikiUri = "";
let cap = null;
let ctx = null;
let capDown = null;

self.addEventListener("message", (e) => {
  const msg = e.data;
  if (typeof msg !== "object" || msg === null || msg.schema_version !== 1) return;

  if (msg.type === "manifest") {
    wikiUri = msg.wikiUri;
    // the island's OWN corpus — the perceiver reads it; nothing here writes back.
    const island = buildFixtureIsland(wikiUri, GLUE_SEEDS);
    cap = hasWikiSensorium();
    ctx = {
      composite: island,
      wikiUri,
      post: (out) => self.postMessage(out),
    };
    const down = cap.onEa(ctx);
    capDown = typeof down === "function" ? down : null;
    self.postMessage({ schema_version: 1, type: "ea", wikiUri });
    return;
  }

  if (msg.type === "teardown" || msg.type === "hooanu") {
    if (capDown) capDown();
    cap = null;
    ctx = null;
    self.postMessage({ schema_version: 1, type: "teardown:ack" });
    return;
  }

  // the cap's signal surface, ridden verbatim: the wire message's TYPE names the signal, and the cap
  // claims it (or declines) exactly as it would in-process. Unclaimed types fall through silently.
  if (cap && ctx && typeof msg.type === "string" && msg.type.startsWith("sensorium:")) {
    cap.onSignal(msg.type, msg, ctx);
  }
});

// Inversion of control: listener registered; the vessel may now send the manifest.
self.postMessage({ schema_version: 1, type: "ready" });
