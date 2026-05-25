/**
 * vm-manager-echo.mjs — lightweight Worker fixture for NodeVmManager lifecycle tests.
 *
 * Implements the lar-wiki-worker protocol without TW5 or ReactionEngine:
 *   manifest  → ea
 *   changeset → event(echo, { addedCount, deletedCount, changedUris })
 *   teardown  → teardown:ack (with mock snapshotTiddlers)
 *   demote    → teardown:ack (same)
 *
 * NOT production code — fixture only.
 */

import { parentPort } from "node:worker_threads";

let wikiUri = null;

// Simulated tiddler store — accumulates upserts/deletes from changeset messages.
const tiddlers = new Map();

parentPort.on("message", (msg) => {
  if (typeof msg !== "object" || msg === null || msg.schema_version !== 1) {
    parentPort.postMessage({ schema_version: 1, type: "fault", wikiUri: wikiUri ?? "", error: "bad schema" });
    return;
  }

  if (msg.type === "manifest") {
    wikiUri = msg.wikiUri;
    // Seed from snapshot tiddlers.
    for (const t of (msg.snapshotTiddlers ?? [])) {
      if (typeof t.title === "string") tiddlers.set(t.title, t);
    }
    parentPort.postMessage({ schema_version: 1, type: "ea", wikiUri });
    return;
  }

  if (msg.type === "changeset") {
    // Apply delta to local store.
    for (const fields of (msg.added ?? [])) {
      if (typeof fields.title === "string") tiddlers.set(fields.title, fields);
    }
    for (const title of (msg.deleted ?? [])) {
      tiddlers.delete(title);
    }
    // Echo back delta counts and current total for assertions.
    parentPort.postMessage({
      schema_version: 1,
      type: "event",
      wikiUri: msg.wikiUri,
      listenable: "changeset:applied",
      payload: {
        addedCount:   (msg.added   ?? []).length,
        deletedCount: (msg.deleted ?? []).length,
        totalTiddlers: tiddlers.size,
      },
    });
    return;
  }

  if (msg.type === "teardown" || msg.type === "demote") {
    const snapshotTiddlers = [...tiddlers.values()];
    tiddlers.clear();
    wikiUri = null;
    parentPort.postMessage({ schema_version: 1, type: "teardown:ack", snapshotTiddlers });
    return;
  }
});
