/**
 * resolve-handler — Residency Model coordinate-inspection query.
 *
 * Sibling of where-handler.ts. Returns the richer view that operator-facing
 * inspection wants: every live Manifestation across bags (with change-id
 * preserved per-bag), the winning bag per recipe priority, and the bags
 * that explicitly tombstone the title (whiteout-shadow surfacing for
 * Talk-Story-decided overrides).
 *
 * Args:    { tiddler: string }
 *
 * Result:  {
 *   tiddler:        string,
 *   manifestations: Array<{ bagId: string, changeId?: string }>,
 *   tombstones:     string[],   // bag URIs that explicitly tombstone (whiteout-shadow)
 *   winningBag:     string | null,
 * }
 *
 * Pure read operation; no side effects, no capability check required.
 *
 * Sprint:  Residency Model Epic — S8.2 (full surface — tombstone-inspection
 *          completes the operator-facing coordinate query)
 * Meme:    lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
 */

import type { CompositeStore } from "@lararium/mesh";
import type { VerbReactor } from "@lararium/tw5";

export interface ResolveHandlerOptions {
  readonly composite: CompositeStore;
}

export function makeResolveReactor(opts: ResolveHandlerOptions): VerbReactor {
  return async (args) => {
    const tiddler = typeof args["tiddler"] === "string" ? args["tiddler"] : "";
    if (!tiddler) throw new Error("args.tiddler is required");

    const live       = await opts.composite.resolveAll(tiddler);
    const tombstones = await opts.composite.listBagsTombstoning(tiddler);

    const manifestations = live.map((entry) => {
      const changeId = entry.record.meta?.changeId;
      return changeId !== undefined
        ? { bagId: entry.bagId, changeId }
        : { bagId: entry.bagId };
    });

    return {
      tiddler,
      manifestations,
      tombstones,
      winningBag: live[0]?.bagId ?? null,
    };
  };
}
