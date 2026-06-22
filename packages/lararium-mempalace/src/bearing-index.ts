/**
 * bearing-index — the LOCAL-ONLY, never-federated session-memory bearing store.
 *
 * A plain append-only NDJSON file (one record per turn). It deliberately never
 * enters an Automerge Repo, so it is *structurally impossible to federate* — the
 * same guarantee operator-key leans on. mempalace-realm: what we *said*, kept
 * node-local. Promotion of a blessed bearing into Lararium domain canon is a
 * separate, operator-gated step (MOVE), not this file's concern.
 *
 * Single-writer per session: append is atomic enough at one-writer; concurrent
 * multi-process writers would race the torn-line boundary (funnel through one
 * process, or graduate to a richer store, if that ever becomes real).
 */

import { appendFileSync, mkdirSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { dirname } from "node:path";

export interface BearingRecord {
  /** When this bearing was harvested (ISO). */
  ts: string;
  /** mempalace session id the turn came from. */
  sessionId: string;
  /** Per-turn key (message uuid) — the append-only identity; never deduped on (aim, yield). */
  turn: string;
  /** Raw aim payload, verbatim — never normalized. Null if the turn carried no aim frame. */
  aim: string | null;
  /** Raw yield payload, verbatim. Null if no yield frame. */
  yield: string | null;
  /** 0..20 (the house Maybe-Logic continuum), low = drifted (the keeper's gauge). */
  confidence: number;
  /** e.g. ["arity:2"], ["session-form"], ["frame:no-yield"]. */
  driftFlags: string[];
  /** Turn-open instant (the gradient's start), or null. */
  validFrom: string | null;
  /** Turn-close instant (the gradient's end), or null. */
  validTo: string | null;
  /** mempalace drawer id this bearing was read from (provenance). */
  sourceDrawerId: string | null;
}

export interface BearingQuery {
  /** Substring match on the raw aim URI — catches drifted spellings a federated index could not. */
  aimLike?: string;
  /** Substring match on the raw yield URI. */
  yieldLike?: string;
  /** The keeper's drift-gauge: `<= 8` (provisional bands) surfaces the turns whose frame drifted. */
  maxConfidence?: number;
  minConfidence?: number;
  /** Point-in-time: keep bearings whose [validFrom, validTo] span contains this instant. */
  asOf?: string;
}

/** Append one bearing, creating the file/dir on first write. Local-only, never a Repo. */
export function appendBearing(filePath: string, record: BearingRecord): void {
  mkdirSync(dirname(filePath), { recursive: true });
  appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // non-POSIX filesystem — best effort
  }
}

/** Read every record; crash-degrade by dropping any unparseable (e.g. torn trailing) line. */
export function readBearings(filePath: string): BearingRecord[] {
  if (!existsSync(filePath)) return [];
  const out: BearingRecord[] = [];
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as BearingRecord);
    } catch {
      // torn / partial line — drop, never corrupt the read
    }
  }
  return out;
}

/** Filter the index. Substring matches preserve drift recall; asOf reads the gradient span. */
export function queryBearings(filePath: string, q: BearingQuery = {}): BearingRecord[] {
  return readBearings(filePath).filter((r) => {
    if (q.aimLike !== undefined && !(r.aim ?? "").includes(q.aimLike)) return false;
    if (q.yieldLike !== undefined && !(r.yield ?? "").includes(q.yieldLike)) return false;
    if (q.maxConfidence !== undefined && r.confidence > q.maxConfidence) return false;
    if (q.minConfidence !== undefined && r.confidence < q.minConfidence) return false;
    if (q.asOf !== undefined) {
      if (r.validFrom !== null && r.validFrom > q.asOf) return false;
      if (r.validTo !== null && r.validTo < q.asOf) return false;
    }
    return true;
  });
}
