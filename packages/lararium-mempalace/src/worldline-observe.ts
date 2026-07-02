/**
 * worldline-observe — the OBSERVER trigger: turn an OBSERVED spirit lifecycle (spawn → handback)
 * into durable worldline edges on the mempalace KG.
 *
 * The @daemon receives no real-time spawn/handback EVENT — it sees only per-turn capture verbs. The
 * one deterministic spawn/handback signal lives in the TRANSCRIPT PROVENANCE: a session's
 * `<session>/subagents/agent-<id>.jsonl` is a spirit's whole worldline, complete by the time the
 * parent session's Stop fires (the spirit ran to completion inside the parent's turn). So the cleanest
 * single observation point is the PRODUCER that already walks every spirit of a session: the
 * `lares subagents` leg. This module derives the edges from that transcript and projects them through
 * worldline-kg's KG membrane (the durable twin of the in-memory ITC registry, mesh/worldline-clock).
 *
 * SPAWN → a prov:Delegation edge (parent run → child `run.agentId`), turnKey = the spirit's first
 *         turn uuid, valid_from = its first timestamp. Matches buildPatch's lar_parent_handle →
 *         lar_agent_handle exactly (deriveHandle = `<run>.<agentId>`), so the live capture lar_* and
 *         this edge name the SAME worldline.
 * HANDBACK → close the Delegation interval (the twin-reunion), ended = the spirit's last timestamp.
 *
 * INJECT (prov:Communication) is NOT observed here — see {@link observeSubagentWorldlines} note: the
 * current Claude Code subagent model is one-handoff/run-to-completion, so a transcript carries no
 * reliable mid-flight injection signal. The mechanism (communicationEdge / worldlineInject) stands
 * ready for when a SendMessage-continue lifecycle lands a distinguishable signal.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#attribution
 */

import { readFileSync } from "node:fs";

import {
  delegationEdge,
  handbackClose,
  deriveInjectionEdges,
  classifyTranscriptTurn,
  type WorldlineEdgeTriple,
  type WorldlineEdgeClose,
  type TranscriptTurn,
} from "@lararium/mesh";

import { listSpiritFiles, agentIdOf, runIdOf } from "./subagent-mine.js";
import {
  persistWorldlineEdges,
  closeWorldlineEdges,
  isoWholeSeconds,
  KgUnavailable,
  type WorldlineKgOptions,
} from "./worldline-kg.js";

// The whole-second law now lives IN the KG membrane (worldline-kg.ts) — every temporal value
// crossing there rides it regardless of caller. This observer still truncates at derivation time
// (below) so the DERIVED edges it returns carry canonical timestamps too; re-exported for the
// callers that imported it from here.
export { isoWholeSeconds } from "./worldline-kg.js";

/** The boundary turns of a spirit transcript — the spawn anchor (first) and handback anchor (last). */
interface SpiritBounds {
  readonly firstUuid: string;
  readonly firstTs: string;
  readonly lastTs: string;
}

/** Read a spirit transcript's first/last user-or-assistant turn boundaries (uuid + timestamps). */
function spiritBounds(agentFile: string): SpiritBounds | null {
  let lines: string[];
  try { lines = readFileSync(agentFile, "utf8").split("\n"); } catch { return null; }
  let firstUuid = "";
  let firstTs = "";
  let lastTs = "";
  for (const l of lines) {
    if (!l.trim()) continue;
    let r: Record<string, unknown>;
    try { r = JSON.parse(l) as Record<string, unknown>; } catch { continue; }
    const role = r["type"];
    if (role !== "user" && role !== "assistant") continue;
    const ts = typeof r["timestamp"] === "string" ? isoWholeSeconds(r["timestamp"] as string) : "";
    if (!firstUuid) firstUuid = typeof r["uuid"] === "string" ? (r["uuid"] as string) : "";
    if (!firstTs && ts) firstTs = ts;
    if (ts) lastTs = ts;
  }
  // A spirit with no readable turns yields nothing to anchor an edge to.
  if (!firstUuid && !firstTs) return null;
  return { firstUuid, firstTs, lastTs };
}

/** Read a spirit transcript's turns, normalized for the inject detector (role + provenance, no body).
 *  Lines that carry no worldline signal (system/summary/sidechain) classify away to null. */
function spiritTurns(agentFile: string): TranscriptTurn[] {
  let lines: string[];
  try { lines = readFileSync(agentFile, "utf8").split("\n"); } catch { return []; }
  const turns: TranscriptTurn[] = [];
  for (const l of lines) {
    const t = classifyTranscriptTurn(l);
    // Whole-second law at the observer: an inject edge's validFrom rides t.ts into the KG.
    if (t) turns.push(t.ts ? { ...t, ts: isoWholeSeconds(t.ts) } : t);
  }
  return turns;
}

/** A spirit's worldline edges (one spawn Delegation + its handback close + any mid-flight injects). */
export interface SpiritWorldlineEdges {
  /** The lineage HANDLE, `<run>.<agentId>` — IDENTICAL to buildPatch's lar_agent_handle. */
  readonly handle: string;
  readonly spawn: WorldlineEdgeTriple;
  readonly handback: WorldlineEdgeClose;
  /**
   * prov:Communication edges — a SendMessage-continue that re-entered this RUNNING spirit (the
   * rhizome's merge-where-messages-land leg, worldline-inject-detect). The injector is the run-root
   * (the safe default: the spirit transcript cannot name the sender). Empty under the one-handoff /
   * run-to-completion model — the detector stands ready for the signal.
   */
  readonly inject: readonly WorldlineEdgeTriple[];
}

/**
 * Derive every spirit's spawn + handback edges from a session transcript — PURE relative to the KG
 * (reads the transcript files, writes nothing). The run-root = the session id (runIdOf); each spirit's
 * handle = `<run>.<agentId>` (the worldline path). Empty when the session spawned no spirits.
 */
export function deriveSubagentEdges(transcript: string): SpiritWorldlineEdges[] {
  const run = runIdOf(transcript);
  const out: SpiritWorldlineEdges[] = [];
  for (const af of listSpiritFiles(transcript)) {
    const agentId = agentIdOf(af);
    const handle = `${run}.${agentId}`;
    const b = spiritBounds(af);
    if (!b) continue;
    const spawn = delegationEdge(run, handle, {
      ...(b.firstTs ? { validFrom: b.firstTs } : {}),
      ...(b.firstUuid ? { turnKey: b.firstUuid } : {}),
    });
    const handback = handbackClose(run, handle, b.lastTs || undefined);
    // INJECT — the mid-flight re-entry edges (run-root → spirit), one per detected injection point.
    const inject = deriveInjectionEdges(run, handle, spiritTurns(af));
    out.push({ handle, spawn, handback, inject });
  }
  return out;
}

export interface ObserveResult {
  /** Spirit handles whose spawn+handback edges were observed this pass. */
  readonly observed: readonly string[];
  /** prov:Delegation rows added to the KG. */
  readonly spawned: number;
  /** Delegation intervals closed (the handback twin-reunion). */
  readonly handedBack: number;
  /** prov:Communication rows added to the KG (the mid-flight inject seam, SEAM B). */
  readonly injected: number;
}

/**
 * OBSERVE a session's spirit worldlines → persist the spawn Delegation edges, then close them at
 * handback. Best-effort durability: the KG is a re-derivable projection (transcripts are truth), so a
 * {@link KgUnavailable} is SWALLOWED (the caller's verbatim/AST capture is never sunk by an absent KG).
 *
 * Re-runs are safe at the SINK: kg_io.py holds lifecycle idempotence (an identical S/P/O + valid_from
 * skips re-add even after the interval closed; close-of-already-closed no-ops), so a wiped watermark
 * never duplicates rows or churns valid_to. The caller's per-handle watermark (lares subagents) thereby
 * demotes to a CACHE — it saves the python spawn, it no longer carries correctness.
 *
 * `only` (optional) restricts the pass to the named handles (the un-watermarked spirits this run).
 */
export function observeSubagentWorldlines(
  transcript: string,
  opts: WorldlineKgOptions & { readonly only?: readonly string[] } = {},
): ObserveResult {
  const all = deriveSubagentEdges(transcript);
  const only = opts.only ? new Set(opts.only) : null;
  const edges = only ? all.filter((e) => only.has(e.handle)) : all;
  if (edges.length === 0) return { observed: [], spawned: 0, handedBack: 0, injected: 0 };

  const { only: _drop, ...kg } = opts;
  try {
    const spawned = persistWorldlineEdges(edges.map((e) => e.spawn), kg).added;
    const handedBack = closeWorldlineEdges(edges.map((e) => e.handback), kg).invalidated;
    // SEAM B — persist every detected mid-flight inject (prov:Communication). [] under the one-handoff
    // model → persistWorldlineEdges no-ops. Same best-effort gate (KgUnavailable swallowed below).
    const injectEdges = edges.flatMap((e) => e.inject);
    const injected = persistWorldlineEdges(injectEdges, kg).added;
    return { observed: edges.map((e) => e.handle), spawned, handedBack, injected };
  } catch (err) {
    if (err instanceof KgUnavailable) return { observed: [], spawned: 0, handedBack: 0, injected: 0 };
    throw err;
  }
}
