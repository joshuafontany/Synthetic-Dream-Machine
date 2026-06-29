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
  type WorldlineEdgeTriple,
  type WorldlineEdgeClose,
} from "@lararium/mesh";

import { listSpiritFiles, agentIdOf, runIdOf } from "./subagent-mine.js";
import {
  persistWorldlineEdges,
  closeWorldlineEdges,
  KgUnavailable,
  type WorldlineKgOptions,
} from "./worldline-kg.js";

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
    const ts = typeof r["timestamp"] === "string" ? (r["timestamp"] as string) : "";
    if (!firstUuid) firstUuid = typeof r["uuid"] === "string" ? (r["uuid"] as string) : "";
    if (!firstTs && ts) firstTs = ts;
    if (ts) lastTs = ts;
  }
  // A spirit with no readable turns yields nothing to anchor an edge to.
  if (!firstUuid && !firstTs) return null;
  return { firstUuid, firstTs, lastTs };
}

/** A spirit's worldline edges (one spawn Delegation + its handback close). */
export interface SpiritWorldlineEdges {
  /** The lineage HANDLE, `<run>.<agentId>` — IDENTICAL to buildPatch's lar_agent_handle. */
  readonly handle: string;
  readonly spawn: WorldlineEdgeTriple;
  readonly handback: WorldlineEdgeClose;
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
    out.push({ handle, spawn, handback });
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
}

/**
 * OBSERVE a session's spirit worldlines → persist the spawn Delegation edges, then close them at
 * handback. Best-effort durability: the KG is a re-derivable projection (transcripts are truth), so a
 * {@link KgUnavailable} is SWALLOWED (the caller's verbatim/AST capture is never sunk by an absent KG).
 *
 * The caller (lares subagents) SHOULD gate this with a per-handle watermark — a re-run re-derives the
 * same edges, and while persist is idempotent at the KG for a still-OPEN triple, closing-then-re-adding
 * across runs is not, so observe each spirit's lifecycle ONCE (the transcript is complete at Stop).
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
  if (edges.length === 0) return { observed: [], spawned: 0, handedBack: 0 };

  const { only: _drop, ...kg } = opts;
  try {
    const spawned = persistWorldlineEdges(edges.map((e) => e.spawn), kg).added;
    const handedBack = closeWorldlineEdges(edges.map((e) => e.handback), kg).invalidated;
    return { observed: edges.map((e) => e.handle), spawned, handedBack };
  } catch (err) {
    if (err instanceof KgUnavailable) return { observed: [], spawned: 0, handedBack: 0 };
    throw err;
  }
}
