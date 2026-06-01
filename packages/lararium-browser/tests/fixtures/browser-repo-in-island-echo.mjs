/**
 * browser-repo-in-island-echo.mjs — browser island gate fixture.
 *
 * Proves CRDT sync path in browser workers without TW5:
 *   manifest (syncPort transferred) -> wire island-side Repo -> ea
 *   [doc arrives via CRDT sync]      -> handle.on("change") -> event(repo:change)
 *   teardown                         -> teardown:ack
 */

import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";

let wikiUri = "";
let frameCount = 0;

function wireHandle(handle, usingDocUrl) {
  void handle.whenReady().then(() => {
    self.postMessage({
      schema_version: 1,
      type: "event",
      wikiUri,
      listenable: "repo:synced",
      payload: {
        tiddlerCount: Object.keys(handle.doc()?.tiddlers ?? {}).length,
        usingDocUrl,
      },
    });

    handle.on("change", ({ doc }) => {
      frameCount += 1;
      const tiddlerCount = doc?.tiddlers ? Object.keys(doc.tiddlers).length : 0;
      self.postMessage({
        schema_version: 1,
        type: "event",
        wikiUri,
        listenable: "repo:change",
        payload: {
          frameCount,
          tiddlerCount,
          usingDocUrl,
        },
      });
    });
  });
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

    // Resolve docUrl from the WikiRecipe + resolver.
    const resolver = msg.resolver ?? {};
    const slug = msg.recipe?.wikiSlug;
    const resolvedDocUrl = (slug && resolver[`lar:///ha.ka.ba/@${slug}`]) ?? null;

    if (resolvedDocUrl) {
      void repo.find(resolvedDocUrl).then((handle) => wireHandle(handle, true));
    } else {
      repo.on("document", ({ handle }) => wireHandle(handle, false));
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

// Inversion of control: listener is registered; vessel may now send manifest.
self.postMessage({ schema_version: 1, type: "ready" });