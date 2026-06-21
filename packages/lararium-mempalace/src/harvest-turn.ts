/**
 * harvest-turn — glue between the Lararium grammar parser (@lararium/mesh) and
 * the local bearing index. Pure: a verbatim turn + its context -> a record.
 */

import { harvest } from "@lararium/mesh";
import type { BearingRecord } from "./bearing-index.js";

export interface TurnContext {
  /** When harvested (ISO). */
  ts: string;
  /** mempalace session id. */
  sessionId: string;
  /** Per-turn key (message uuid). */
  turn: string;
  /** Turn-open instant. */
  validFrom?: string | null;
  /** Turn-close instant. */
  validTo?: string | null;
  /** mempalace drawer id (provenance). */
  sourceDrawerId?: string | null;
}

/**
 * Parse one verbatim turn into a bearing record, or null when it carried no
 * frame at all (an unframed turn contributes no bearing — its silence is a gap,
 * never a fabricated record).
 */
export function harvestTurn(turnText: string, ctx: TurnContext): BearingRecord | null {
  const bearing = harvest(turnText);
  if (!bearing) return null;
  return {
    ts: ctx.ts,
    sessionId: ctx.sessionId,
    turn: ctx.turn,
    aim: bearing.aimUri,
    yield: bearing.yieldUri,
    confidence: bearing.confidence,
    driftFlags: bearing.driftFlags,
    validFrom: ctx.validFrom ?? null,
    validTo: ctx.validTo ?? null,
    sourceDrawerId: ctx.sourceDrawerId ?? null,
  };
}
