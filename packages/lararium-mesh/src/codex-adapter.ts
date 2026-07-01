/**
 * codex-adapter — the OpenAI Codex {@link SourceAdapter}, built against the reference
 * {@link claudeCodeAdapter} (commit 697f959c) and grounded on real `~/.codex/sessions/**` bytes.
 *
 * Codex stores one session per `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl`. Each line is a
 * typed record: `session_meta` (first line, the header), `turn_context` (per-turn config carrying a
 * `turn_id`), `event_msg` (UI/stream events), and `response_item` (the canonical transcript). The
 * transcript rides the `response_item` lines whose `payload.type === "message"` and role ∈
 * {developer, user, assistant}; each message's `content` is an array of `{type: input_text|output_text,
 * text}` blocks.
 *
 * It is an APPEND-ONLY / FORK source, but of a DIFFERENT shape than Claude:
 *   - The rollout file is a LINEAR append log — Codex never edits an earlier line, and a `/rewind`
 *     is NOT an in-file re-parent (there is no per-message `parentUuid` DAG to re-parent within a file).
 *   - A REWIND is an OUT-OF-FILE FORK: a NEW rollout file whose `session_meta.payload` carries
 *     `forked_from_id` + `parent_thread_id` (and a `source.subagent.thread_spawn` block). The parent
 *     thread's log is untouched; the child copies history up to the fork point, then diverges. The
 *     sqlite `state_5.sqlite` `thread_spawn_edges(parent_thread_id, child_thread_id, status)` mirrors
 *     the same DAG, but `forked_from_id` in the rollout header is authoritative and dependency-free.
 * So `appendOnly = true`: the parent orphan persists and re-harvests; kapae never deletes.
 *
 * IDENTITY. Assistant messages carry a stable `id` (`msg_...`) ⇒ the native-uuid rung. User messages
 * carry NO id and share a per-turn (not per-message) `turn_id`, so they ride the CONTENT-HASH rung —
 * the same text copied into a fork hashes identically, which is exactly what the cross-fork `diffGone`
 * needs (a per-turn `turn_id` fed as a native ordinal would DIVERGE across a re-run fork and misread the
 * copied prefix as gone). Both rungs are cross-fork stable because the fork copies bytes verbatim.
 *
 * `parse` + the adapter object are pure over records; only {@link discoverCodexFiles} touches `node:fs`
 * (it reads each rollout's header to chain the fork-family). Content-hashing is the injected `node:crypto`
 * sha256/16 prefix, matching the CLI harvest `sha` (and {@link claudeHash}).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/rewind-adapter
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import {
  linearBranch,
  type AdapterRecord,
  type PerAppSignal,
  type SessionGroup,
  type SourceAdapter,
} from "./source-adapter.js";

/** The default content-hasher (16-hex sha256 prefix) — matches the CLI harvest `sha` and {@link claudeHash}. */
export function codexHash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** The fork header a Codex rollout carries in its `session_meta` — the out-of-file fork edge. */
export interface CodexMeta {
  /** This rollout's own thread/session id (`payload.session_id ?? payload.id`). */
  readonly sessionId: string;
  /** The thread this rollout FORKED FROM, when it is a rewind/fork child (else null). */
  readonly forkedFromId: string | null;
  /** The parent thread id from the spawn edge (usually == `forkedFromId`), else null. */
  readonly parentThreadId: string | null;
  /** `user` for a top-level thread, `subagent` for a spawned worker thread. */
  readonly threadSource: string | null;
}

/** Pull the readable text from a Codex message payload's `content` blocks (input_text / output_text). */
function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let text = "";
  for (const block of content) {
    const b = block as { type?: string; text?: string };
    if (typeof b?.text === "string" && (b.type === "input_text" || b.type === "output_text")) {
      text += (text ? "\n" : "") + b.text;
    }
  }
  return text;
}

/** Read the `session_meta` header (the first non-blank line) into a {@link CodexMeta}, with a filename fallback. */
export function parseCodexMeta(content: string, file = ""): CodexMeta {
  const fallbackSession = file ? sessionIdFromFile(file) : "";
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try { row = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    if (row["type"] !== "session_meta") break; // the header is always first; nothing to read past it
    const p = (row["payload"] ?? {}) as Record<string, unknown>;
    return {
      sessionId: String(p["session_id"] ?? p["id"] ?? fallbackSession),
      forkedFromId: (p["forked_from_id"] as string | undefined) ?? null,
      parentThreadId: (p["parent_thread_id"] as string | undefined) ?? null,
      threadSource: (p["thread_source"] as string | undefined) ?? null,
    };
  }
  return { sessionId: fallbackSession, forkedFromId: null, parentThreadId: null, threadSource: null };
}

/** Recover a session id from a `rollout-<ts>-<uuid>.jsonl` filename (the trailing uuid), else the basename. */
export function sessionIdFromFile(file: string): string {
  const base = basename(file).replace(/\.jsonl$/, "");
  const m = /rollout-\d{4}-\d{2}-\d{2}T[\d-]+-([0-9a-f-]+)$/i.exec(base);
  return m ? (m[1] ?? base) : base;
}

/**
 * Parse a Codex rollout `.jsonl` into {@link AdapterRecord}s (user/assistant message turns only). The
 * `developer` role (base-instructions injection) is skipped, as are non-message `response_item`s
 * (`reasoning`, `web_search_call`) and the `event_msg` stream (which would DOUBLE-count the transcript).
 *
 * The out-of-file fork edge rides the EARLIEST kept record's `parentUuid`: when the header carries a
 * `forked_from_id`, the root turn points at the parent thread (the cross-thread DAG link the linear file
 * itself cannot express). {@link codexAdapter.perAppSignal} reads it back to classify a FORK.
 */
export function parseCodexRollout(content: string, file = ""): AdapterRecord[] {
  const meta = parseCodexMeta(content, file);
  const out: AdapterRecord[] = [];
  let index = 0;
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try { row = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    if (row["type"] !== "response_item") continue;
    const p = (row["payload"] ?? {}) as Record<string, unknown>;
    if (p["type"] !== "message") continue;
    const role = String(p["role"] ?? "");
    if (role !== "user" && role !== "assistant") continue;
    const text = messageText(p["content"]);
    if (!text.trim()) continue;
    const isRoot = out.length === 0;
    out.push({
      uuid: (p["id"] as string | undefined) ?? null, // assistant msg id ⇒ native-uuid; user has none
      parentUuid: isRoot ? meta.forkedFromId : null, // the out-of-file fork edge sits on the root turn
      role,
      text,
      isSidechain: false, // a subagent rollout is the MAIN line of its own file; family ties ride discover
      sessionId: meta.sessionId,
      index: index++,
    });
  }
  return out;
}

/**
 * Group Codex rollouts into fork-FAMILIES by following the `forked_from_id` chain to a root thread. A
 * child rollout headers its `forked_from_id`; each member folds under the eldest reachable ancestor
 * present in the input (a session whose `forked_from_id` is null or points outside the set is its own
 * root). Cycles are guarded. The `rootKey` is the bare root thread id (a SessionGroup permits an id root).
 */
export function groupCodexForkFamilies(
  sessions: readonly { readonly meta: CodexMeta; readonly file: string }[],
): SessionGroup[] {
  const forkedFrom = new Map<string, string | null>();
  for (const s of sessions) forkedFrom.set(s.meta.sessionId, s.meta.forkedFromId);

  const rootOf = (sid: string): string => {
    const seen = new Set<string>();
    let cur = sid;
    while (!seen.has(cur)) {
      seen.add(cur);
      const parent = forkedFrom.get(cur);
      if (!parent || !forkedFrom.has(parent)) return cur; // no known ancestor ⇒ cur is the family root
      cur = parent;
    }
    return cur; // cycle guard: return where the loop closed
  };

  const byRoot = new Map<string, { sessionIds: string[]; files: string[] }>();
  for (const s of sessions) {
    const root = rootOf(s.meta.sessionId);
    let g = byRoot.get(root);
    if (!g) { g = { sessionIds: [], files: [] }; byRoot.set(root, g); }
    g.sessionIds.push(s.meta.sessionId);
    g.files.push(s.file);
  }
  return [...byRoot.entries()].map(([rootKey, g]) => ({
    rootKey,
    sessionIds: g.sessionIds,
    files: g.files,
  }));
}

/** Read each rollout's header from disk and group the files into fork-families (the `discover` disk leg). */
export function discoverCodexFiles(sessionFiles: readonly string[]): SessionGroup[] {
  const sessions = sessionFiles.map((file) => {
    let meta: CodexMeta = { sessionId: sessionIdFromFile(file), forkedFromId: null, parentThreadId: null, threadSource: null };
    try { meta = parseCodexMeta(readFileSync(file, "utf8"), file); } catch { /* skip unreadable */ }
    return { meta, file };
  });
  return groupCodexForkFamilies(sessions);
}

/**
 * The Codex {@link SourceAdapter}. `discover · perAppSignal` are the app-specific reads (`currentBranch`
 * delegates to the shared {@link linearBranch}); the SHARED free functions in source-adapter supply the
 * identity ladder, the linear-branch reconstruction, the diff, the classify-by-shape, and the emit gate.
 */
export const codexAdapter: SourceAdapter = {
  name: "codex",
  appendOnly: true,

  discover(sessionFiles: readonly string[]): SessionGroup[] {
    return discoverCodexFiles(sessionFiles);
  },

  /**
   * The current branch is the LINEAR append chain: Codex never edits an earlier line and has no in-file
   * re-parent, so every kept message IS on the live branch, in order — the shared {@link linearBranch}
   * reconstruction, fed the Codex content-hasher.
   */
  currentBranch(records: readonly AdapterRecord[]): string[] {
    return linearBranch(records, codexHash);
  },

  /**
   * The per-app signal: a rewind is an OUT-OF-FILE FORK, flagged by the `forked_from_id` the parser laid
   * on the root turn's `parentUuid`. A fork child reads as a new sibling whose `forkRootKey` is the bare
   * parent thread id. A top-level (non-forked) rollout leaves `hasNewSibling` false ⇒ the shared
   * classifier reads TAIL_TRUNCATE / DELETE / null from the diff shape alone.
   */
  perAppSignal(records: readonly AdapterRecord[], _prior: readonly string[]): PerAppSignal {
    const forkEdge = records.find((r) => r.parentUuid);
    if (forkEdge?.parentUuid) return { hasNewSibling: true, forkRootKey: forkEdge.parentUuid };
    return { hasNewSibling: false };
  },
};
