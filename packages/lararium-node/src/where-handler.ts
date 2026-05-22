/**
 * where-handler — recipe-presence query for a tiddler.
 *
 * Returns which bags currently hold a non-tombstoned record for the given
 * URI. Used by the `lares promote` CLI to preview the source bag before
 * writing the actual promote command (operator confirms the move).
 *
 * Pure read operation; no side effects, no capability check needed today.
 *
 * Args:  { tiddler: string }
 * Result: { tiddler, bags: string[], primaryBag: string | null }
 *   bags        — every layer holding the tiddler, highest-priority first
 *   primaryBag  — record.bag for the read result; null when not found
 */

import type { CompositeStore } from "@lararium/mesh";
import type { JobHandler } from "./job-dispatcher.js";

export interface WhereHandlerOptions {
  readonly composite: CompositeStore;
}

export function createWhereHandler(opts: WhereHandlerOptions): JobHandler {
  return async (args) => {
    const tiddler = typeof args["tiddler"] === "string" ? args["tiddler"] : "";
    if (!tiddler) throw new Error("args.tiddler is required");

    const bags    = await opts.composite.listBagsHolding(tiddler);
    // primaryBag must reflect the live primary holder, not a tombstone.
    // listBagsHolding already filters deletions and orders highest-priority
    // first — its head is the canonical source for promote ceremonies.
    const primary = bags[0] ?? null;

    return { tiddler, bags, primaryBag: primary };
  };
}
