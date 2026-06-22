/**
 * harvest-all — the orchestration loop. Pages the mempalace sidecar's drawers,
 * harvests each turn's bearing, and appends to the local-only index.
 *
 * This is the read-leg consulting the witness: it never writes to mempalace, and
 * the index it appends is mempalace-realm (local-only, never federated). It is a
 * GROUNDING read, not a promotion into Lararium canon.
 */

import type { MempalaceClient, ListDrawersArgs } from "./mempalace-client.js";
import { harvestTurn } from "./harvest-turn.js";
import { appendBearing } from "./bearing-index.js";

export interface HarvestOptions {
  /** Local-only NDJSON index path (mempalace-realm). */
  indexPath: string;
  /** Override the session id stamped on records (else read from drawer metadata). */
  sessionId?: string;
  /** Restrict the sweep to a wing / room. */
  wing?: string;
  room?: string;
  /** Page size for list_drawers (clamped to 100 server-side). */
  pageLimit?: number;
  /** Harvest timestamp (ISO); injectable for determinism in tests. */
  now?: string;
}

export interface HarvestSummary {
  drawersScanned: number;
  framed: number;
  unframed: number;
  appended: number;
}

/** Sweep every drawer (paged), harvest framed turns, append bearings. Returns a summary. */
export async function harvestAll(client: MempalaceClient, opts: HarvestOptions): Promise<HarvestSummary> {
  const pageLimit = opts.pageLimit ?? 100;
  const summary: HarvestSummary = { drawersScanned: 0, framed: 0, unframed: 0, appended: 0 };

  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    const listArgs: ListDrawersArgs = { limit: pageLimit, offset };
    if (opts.wing !== undefined) listArgs.wing = opts.wing;
    if (opts.room !== undefined) listArgs.room = opts.room;

    const page = await client.listDrawers(listArgs);
    total = page.total;
    if (page.drawers.length === 0) break;

    for (const d of page.drawers) {
      const drawer = await client.getDrawer(d.drawer_id);
      summary.drawersScanned++;
      const meta = drawer.metadata ?? {};
      const record = harvestTurn(drawer.content, {
        ts: opts.now ?? new Date().toISOString(),
        sessionId: opts.sessionId ?? (typeof meta.session_id === "string" ? meta.session_id : "unknown"),
        turn: d.drawer_id,
        sourceDrawerId: d.drawer_id,
        validFrom: typeof meta.timestamp === "string" ? meta.timestamp : null,
      });
      if (record) {
        appendBearing(opts.indexPath, record);
        summary.framed++;
        summary.appended++;
      } else {
        summary.unframed++;
      }
    }
    offset += page.drawers.length;
  }

  return summary;
}
