/**
 * browser-verb-island.mjs — browser island gate fixture for the verb→event flow.
 *
 * Pono e2e at the browser TRANSPORT seam. Proves a verb-bearing tiddler synced
 * into a browser island surfaces as IslandMsg_Event{verb} at the
 * BrowserVesselIslandPool boundary — in a real Chromium Web Worker, over a real
 * MessageChannel + CRDT sync — without a full TW5-in-worker bundle.
 *
 * The reaction-router LOGIC (verb tiddler → tm-verse-event → IslandMsg_Event)
 * runs in @lararium/tw5 and is covered e2e against real TW5 by the node
 * m3-breathing test. This fixture stands in for that island-internal step so the
 * browser worker↔pool wire is exercised honestly here. Sibling of
 * browser-repo-in-island-echo.mjs (the same hand-written-worker pattern).
 *
 *   manifest (syncPort transferred) -> wire island Repo -> find wiki doc -> ea
 *   [verb tiddler arrives via CRDT]  -> event{verb, listenable, fromUri, uri}
 *   teardown                         -> teardown:ack
 */

import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";

let wikiUri = "";

// Mirror the reaction-router's output: one IslandMsg_Event per GENUINE verb summon.
// mutableLarRecord nests fields under `record.tiddler` (base-doc.ts). Faithful to #48:
// fire ONLY on a tiddler carrying the `lares-dispatch` marker (the loop-break gate), and
// lift `arg-<name>` fields into the flat-wire `verb-args` JSON string.
function emitVerbEvents(doc) {
  const tiddlers = doc?.tiddlers ?? {};
  for (const [uri, record] of Object.entries(tiddlers)) {
    const fields = record?.tiddler ?? {};
    if (typeof fields.verb !== "string") continue;
    if (!fields["lares-dispatch"]) continue;   // router-inert without the dispatch marker
    const args = {};
    for (const [f, v] of Object.entries(fields)) {
      if (f.startsWith("arg-")) args[f.slice(4)] = v;
    }
    self.postMessage({
      schema_version: 1,
      type: "event",
      wikiUri,
      listenable: typeof fields.listenable === "string" ? fields.listenable : "",
      payload: { verb: fields.verb, fromUri: uri, uri, "verb-args": JSON.stringify(args) },
    });
  }
}

self.addEventListener("message", (e) => {
  const msg = e.data;
  if (typeof msg !== "object" || msg === null || msg.schema_version !== 1) return;

  if (msg.type === "manifest") {
    wikiUri = msg.wikiUri;
    const syncPort = msg.syncPort;
    if (!syncPort) {
      self.postMessage({ schema_version: 1, type: "fault", wikiUri, error: "manifest missing syncPort" });
      return;
    }

    const repo = new Repo({
      network: [new MessageChannelNetworkAdapter(syncPort)],
      sharePolicy: async () => true,
    });

    // Resolve the wiki doc from the typed grants, then replay its
    // verb tiddlers once synced and on every subsequent change.
    const wikiDocUrl = msg.grants?.wikiUrl ?? null;
    if (wikiDocUrl) {
      void repo.find(wikiDocUrl).then((handle) => {
        void handle.whenReady().then(() => {
          emitVerbEvents(handle.doc());
          handle.on("change", ({ doc }) => emitVerbEvents(doc));
        });
      });
    }

    self.postMessage({ schema_version: 1, type: "ea", wikiUri });
    return;
  }

  if (msg.type === "teardown" || msg.type === "hooanu") {
    self.postMessage({ schema_version: 1, type: "teardown:ack" });
    wikiUri = "";
    return;
  }
});

// Inversion of control: listener registered; vessel may now send manifest.
self.postMessage({ schema_version: 1, type: "ready" });
