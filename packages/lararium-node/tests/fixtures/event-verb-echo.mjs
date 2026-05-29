/**
 * event-verb-echo.mjs — verb-routing gate fixture.
 *
 * Proves the island→vessel verb payload path:
 *   manifest → ea → IslandMsg_Event { verb, listenable, fromUri } in payload
 *
 * The fixture bypasses TW5 and reaction-router entirely — it posts a pre-formed
 * IslandMsg_Event directly after ea, as if a kumu device had fired and island-kernel
 * had enriched the event with verb metadata from the tiddler's reaction:listenable edge.
 *
 * Vessel-side M.1 subscriber receives the event, checks payload.verb, and calls placeVerb.
 * This fixture proves the message travels correctly; a separate test asserts placeVerb semantics.
 *
 * NOT production code — gate fixture only.
 */

import { parentPort } from "node:worker_threads";

let wikiUri = null;

parentPort.on("message", (msg) => {
  if (typeof msg !== "object" || msg === null || msg.schema_version !== 1) return;

  if (msg.type === "manifest") {
    wikiUri = msg.wikiUri;

    // Emit ea — island declares sovereignty.
    parentPort.postMessage({ schema_version: 1, type: "ea", wikiUri });

    // Immediately post a verb-carrying event — simulates island-kernel enriching
    // a tm-verse-event with verb metadata from a reaction:listenable edge.
    parentPort.postMessage({
      schema_version: 1,
      type: "event",
      wikiUri,
      listenable: "OnActivated",
      payload: {
        uri:      "lar:///test/instances/promote-button-1",
        verb:     "echo-verb",
        fromUri:  "lar:///test/instances/promote-button-1",
      },
    });

    return;
  }

  if (msg.type === "teardown" || msg.type === "demote") {
    parentPort.postMessage({ schema_version: 1, type: "teardown:ack" });
    wikiUri = null;
    return;
  }
});
