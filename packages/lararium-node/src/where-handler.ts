/**
 * where-handler — recipe-presence query for a tiddler.
 *
 * Returns which bags currently hold a non-tombstoned record for the given
 * URI. Operator uses this to preview the source bag before issuing a
 * residency ACTION verb (`lares act ADD/COPY/MOVE`, Sprint 5) that lands
 * the tiddler into another bag.
 *
 * Pure read operation; no side effects, no capability check needed today.
 *
 * Args:  { tiddler: string }
 * Result: { tiddler, bags: string[], primaryBag: string | null }
 *   bags        — every layer holding the tiddler, highest-priority first
 *   primaryBag  — record.bag for the read result; null when not found
 */

import type { CompositeStore } from "@lararium/mesh";
import type { VerbReactor } from "@lararium/tw5";

export interface WhereHandlerOptions {
  readonly composite: CompositeStore;
}

export function makeWhereReactor(opts: WhereHandlerOptions): VerbReactor {
  return async (args) => {
    const tiddler = typeof args["tiddler"] === "string" ? args["tiddler"] : "";
    if (!tiddler) throw new Error("args.tiddler is required");

    const bags    = await opts.composite.listBagsHolding(tiddler);
    // primaryBag must reflect the live primary holder, not a tombstone.
    // listBagsHolding already filters deletions and orders highest-priority
    // first — its head is the source bag for any current read (origin-bag).
    const primary = bags[0] ?? null;

    return { tiddler, bags, primaryBag: primary };
  };
}
