/**
 * repo-in-island-echo.mjs — Repo-in-island gate fixture.
 *
 * Proves the CRDT sync path without TW5:
 *   manifest (syncPort transferred) → wire island-side Repo → ea
 *   [doc arrives via CRDT sync]    → handle.on("change") → frame:ack + event(repo:change)
 *   teardown                       → teardown:ack
 *
 * Emits `event(repo:synced)` after `handle.whenReady()` resolves — tests await
 * this before mutating the vessel doc to avoid the initial-sync race.
 *
 * NOT production code — gate fixture only.
 */

import { parentPort } from "node:worker_threads";
import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";

let wikiUri = null;
let frameCount = 0;

parentPort.on("message", (msg) => {
  if (typeof msg !== "object" || msg === null || msg.schema_version !== 1) return;

  if (msg.type === "manifest") {
    wikiUri = msg.wikiUri;
    const syncPort = msg.syncPort;

    if (syncPort) {
      const repo = new Repo({
        network: [new MessageChannelNetworkAdapter(syncPort)],
        sharePolicy: async () => true,
      });

      function wireHandle(handle) {
        void handle.whenReady().then(() => {
          // Signal that the change listener is now live — tests await this before mutating.
          parentPort.postMessage({
            schema_version: 1,
            type: "event",
            wikiUri,
            listenable: "repo:synced",
            payload: { tiddlerCount: Object.keys(handle.doc()?.tiddlers ?? {}).length },
          });
          handle.on("change", ({ doc }) => {
            frameCount += 1;
            const tiddlerCount = doc?.tiddlers ? Object.keys(doc.tiddlers).length : 0;

            // Drain signal: frame-completion ack (GP-1 frame signal, not GP-3 batch ACK).
            parentPort.postMessage({
              schema_version: 1,
              type: "frame:ack",
              wikiUri,
              frameId: `frame-${frameCount}`,
            });

            // Observable event: surfaces via onWorkerEvent.
            parentPort.postMessage({
              schema_version: 1,
              type: "event",
              wikiUri,
              listenable: "repo:change",
              payload: { frameCount, tiddlerCount },
            });
          });
        });
      }

      // Resolve docUrl: prefer bagBindings (new), fall back to deprecated msg.docUrl.
      const relationalBinding = msg.bagBindings?.find(b => b.mode === "relational");
      const resolvedDocUrl = relationalBinding?.docUrl ?? msg.docUrl ?? null;

      if (resolvedDocUrl) {
        // Explicit docUrl: island awaits repo.find() — reliable, no gossip race.
        void repo.find(resolvedDocUrl).then((handle) => wireHandle(handle));
      } else {
        // Fallback: wait for doc to arrive via gossip (cold boot).
        repo.on("document", ({ handle }) => wireHandle(handle));
      }
    }

    parentPort.postMessage({ schema_version: 1, type: "ea", wikiUri });
    return;
  }

  if (msg.type === "teardown" || msg.type === "demote") {
    parentPort.postMessage({ schema_version: 1, type: "teardown:ack" });
    wikiUri = null;
    return;
  }
});
