/**
 * residency-handlers — verb-tiddler handlers for operator-driven
 * residency control: pin, unpin, residency (stats).
 *
 * Operators invoke these via `lares pin <url>` / `lares unpin <url>` /
 * `lares residency`. Each handler closes over the BagResidencyManager
 * the daemon constructs at boot.
 */

import type { VerbReactor } from "@lararium/tw5";
import type { BagResidencyManager } from "@lararium/mesh";

export interface ResidencyHandlerOptions {
  readonly residency: BagResidencyManager;
}

// pin / unpin / register-cold RELOCATED to @lararium/tw5 (worker-data-verbs) — they run
// in the admin worker (sovereign-worker, verify-then-delegate gated) and command this
// main-resident BagResidencyManager via admin:residency-op. Only the `residency` stats
// READ stays main (the manager lives here); the askMain research decides its eventual home.

export function makeResidencyStatsReactor(opts: ResidencyHandlerOptions): VerbReactor {
  return async () => {
    const stats = opts.residency.stats();
    return {
      pinned:   [...stats.pinned],
      wela:     stats.wela.map((e) => ({
        url:         e.url,
        lastTouched: e.lastTouched,
        ...(e.syncActive !== undefined && { syncActive: e.syncActive }),
      })),
      anuCount: stats.anuCount,
      hotCap:   stats.hotCap,
    };
  };
}
