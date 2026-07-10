/**
 * worldline-inject-detect — the RHIZOME'S BRANCH-POINTS: detect a mid-flight INJECTION (a
 * SendMessage-continue reaching a RUNNING spirit) in a spirit's transcript, and turn each into a
 * `prov:Communication` edge (the rhizome's merge-where-messages-land leg, mesh/worldline-edge).
 *
 * ## Feasibility (the slice-2 flag, confirmed)
 *
 * The current Claude-Code subagent model is mostly ONE-HANDOFF / run-to-completion: a spirit's
 * transcript carries one initial task prompt then its own assistant turns + tool-result echoes, and
 * worldline-observe (lararium-mempalace) reads only spawn→handback from it. A `SendMessage`-continue
 * — re-entering a spawned agent with its context intact — appends a SECOND top-level USER prompt
 * AFTER the spirit had produced output. THAT is the one distinguishable mid-flight signal.
 *
 * So the DETECTABLE injection point = a `user` turn AFTER the first that is NOT a tool-result echo
 * (tool results also arrive as `user`-type turns, but carry `tool_result` content blocks). Each such
 * turn is a re-entry → a Communication edge: the injector (the parent/root that sent the message)
 * `wasInformedBy`-reaches the target spirit's handle, turnKey = the injected turn's uuid.
 *
 * WHAT ISN'T DETECTABLE (flagged, not built): WHO injected (operator vs parent) is not in the spirit
 * transcript — the caller supplies the injector (the parent handle is the safe default; a parent
 * SendMessage and an operator-relayed one both land as a parent-origin re-entry from the spirit's
 * vantage). The CONTENT/bearing of the injection is unread (full ticks beat a lossy parse — the
 * worldlineInject D-cut). And whether the harness even writes a continuation as a distinguishable
 * user turn needs a real SendMessage-continue transcript to confirm — this detector stands READY for
 * that signal, tested against the transcript SHAPE.
 *
 * PURE / IO-free: classification takes raw jsonl lines (strings); the fs walk + the KG persist stay
 * node-side (worldline-observe's seam), which composes these functions over real transcript files.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#attribution
 */

import { communicationEdge, type WorldlineEdgeTriple } from "./worldline-edge.js";

/** A normalized transcript turn — the shape the detector reasons over (role + provenance, no body). */
export interface TranscriptTurn {
  /** "user" | "assistant" | other (sidechain/system lines normalize away to null upstream). */
  readonly role: string;
  /** the turn uuid (the turnKey for an edge); "" when the line carried none. */
  readonly uuid: string;
  /** ISO timestamp, or "" when absent. */
  readonly ts: string;
  /** true when this `user` turn is a tool-result echo (carries tool_result content) — NOT an injection. */
  readonly isToolResult: boolean;
}

/**
 * Classify ONE raw transcript jsonl line into a {@link TranscriptTurn} — PURE (no fs). Returns null
 * for a blank/unparseable line or a non-user/assistant turn (system, summary, sidechain markers),
 * which carry no worldline injection signal. A `user` turn counts as a tool-result echo when its
 * `message.content` is an array containing a `tool_result` block (the harness's tool round-trip),
 * else it reads as a real prompt (a spawn task or a SendMessage-continue).
 */
export function classifyTranscriptTurn(rawLine: string): TranscriptTurn | null {
  const line = rawLine.trim();
  if (!line) return null;
  let r: Record<string, unknown>;
  try {
    r = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }
  const role = r["type"];
  if (role !== "user" && role !== "assistant") return null;
  const uuid = typeof r["uuid"] === "string" ? (r["uuid"] as string) : "";
  const ts = typeof r["timestamp"] === "string" ? (r["timestamp"] as string) : "";
  return { role, uuid, ts, isToolResult: role === "user" && _userIsToolResult(r) };
}

/** True when a `user` line's content carries a tool_result block (a tool round-trip, not a prompt). */
function _userIsToolResult(r: Record<string, unknown>): boolean {
  const msg = r["message"];
  if (!msg || typeof msg !== "object") return false;
  const content = (msg as Record<string, unknown>)["content"];
  if (typeof content === "string") return false; // a plain-text user message is a prompt
  if (!Array.isArray(content)) return false;
  return content.some((b) => b && typeof b === "object" && (b as Record<string, unknown>)["type"] === "tool_result");
}

/**
 * The detectable INJECTION points in a spirit's turn sequence — every `user` prompt AFTER the first
 * that is NOT a tool-result echo (the SendMessage-continue signal). The first user turn is the spawn
 * task (worldline-observe's Delegation anchor), never an injection. PURE.
 */
export function detectInjectionTurns(turns: readonly TranscriptTurn[]): TranscriptTurn[] {
  const out: TranscriptTurn[] = [];
  let seenFirstUserPrompt = false;
  for (const t of turns) {
    if (t.role !== "user" || t.isToolResult) continue;
    if (!seenFirstUserPrompt) {
      seenFirstUserPrompt = true; // the spawn task — the Delegation anchor, not an injection
      continue;
    }
    out.push(t); // a re-entry prompt → an injection point
  }
  return out;
}

/**
 * Derive the `prov:Communication` edges for one spirit handle from its transcript turns — the
 * inject twin of deriveSubagentEdges' spawn/handback. `injector` is the handle that reached the
 * spirit (the parent/root — the spirit transcript can't name the sender, so the caller supplies it,
 * the parent being the safe default). One edge per detected injection point, turnKey = the injected
 * turn's uuid, valid_from = its timestamp. PURE.
 */
export function deriveInjectionEdges(
  injector: string,
  targetHandle: string,
  turns: readonly TranscriptTurn[],
): WorldlineEdgeTriple[] {
  return detectInjectionTurns(turns).map((t) =>
    communicationEdge(injector, targetHandle, {
      ...(t.ts ? { validFrom: t.ts } : {}),
      ...(t.uuid ? { turnKey: t.uuid } : {}),
    }),
  );
}
