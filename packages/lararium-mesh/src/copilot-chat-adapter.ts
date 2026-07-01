/**
 * copilot-chat-adapter — the GitHub Copilot Chat (VS Code) {@link SourceAdapter}, built against the
 * reference {@link claudeCodeAdapter} (commit 697f959c) and grounded on real
 * `…/Code/User/workspaceStorage/<hash>/chatSessions/<sessionId>.jsonl` bytes on this box.
 *
 * Copilot Chat does NOT store a flat transcript — it stores a JSON-PATCH OP-LOG. Each `.jsonl` line is
 * one op against an in-memory chat-session state:
 *   - `kind:0` — the BASE SNAPSHOT (line 0 only): `{ kind:0, v:<full session state> }` carrying
 *     `sessionId` + a `requests[]` array (each request = one user turn + its assistant response).
 *   - `kind:1` — a SET at a json-pointer path: `{ kind:1, k:[…path…], v:<value> }` (e.g. streaming a
 *     token into `["requests",N,"response"]`, or setting `["requests",N,"modelState"]`).
 *   - `kind:2` — an ARRAY SPLICE on `["requests"]`: `{ kind:2, k:["requests"], v:[items], i?:<index> }`.
 *       · no `i`            → APPEND (push the items — a new turn).
 *       · `i` present, `v` a list → REPLACE-1-AT-`i` (`splice(i, 1, …items)` — a re-issued/edited turn).
 *       · `i` present, `v` null    → DELETE-1-AT-`i` (`splice(i, 1)` — a removed turn).
 *   The LIVE state is the op-log REPLAYED to the end; every superseded op stays physically in the file.
 *
 * ## The `appendOnly` VERIFY-GATE — RESOLVED `true` by the bytes on this box
 *
 * The research spirits conflicted: an on-disk read said the op-log is append-only (old ops persist,
 * recoverable by replay-to-offset ⇒ `appendOnly=true`); the docs said edit/restore TRUNCATES the tail
 * (⇒ `appendOnly=false`). The BYTES settle it — `appendOnly = true`:
 *   1. Across ALL 269 chat-session files on this box (Code + Code-Insiders), the `kind:0` base snapshot
 *      appears ONLY at line 0 — the file is NEVER re-snapshotted / compacted / rewritten. A `.jsonl`
 *      op-log only GROWS.
 *   2. A genuine edit of the request at index 45 (session 3863d027…) emitted THREE STACKED ops, each
 *      APPENDED as a new line: line 502 appended `request_de3a2212…` ("More Dev/Referee focused family
 *      ontology"); line 503 re-spliced index 45 → `request_9b8b3b93…` (edited text); line 508 re-spliced
 *      index 45 → `request_a9cada7f…` (edited again). All three coexist in the byte stream.
 *   3. Replay-to-offset RECOVERS every superseded turn: ops[0..502] ⇒ index 45 = `de3a2212`;
 *      ops[0..507] ⇒ index 45 = `9b8b3b93`; full replay ⇒ live `a9cada7f`. The old requestIds are not
 *      erased — they are superseded-in-place and remain re-harvestable.
 *   4. 120 of the 269 files carry such re-splice (rewind/edit) ops; every one leaves its superseded ops
 *      in the append log.
 * The docs' "truncate the tail" describes the LOGICAL `requests[]` state after a rewind, NOT the physical
 * file — the file records the truncation AS an op, preserving the pre-cut ops. So Copilot Chat joins the
 * APPEND-ONLY family: a rewind down-weights via kapae AND stays re-harvestable ({@link emitFor}).
 *
 * IDENTITY. A Copilot `requestId` (`request_<uuid>`) keys ONE request — a user prompt + its assistant
 * response as a single turn unit — so this adapter emits ONE {@link AdapterRecord} per LIVE request,
 * keyed by `requestId` on the native-uuid rung (no user/assistant sibling collision, since the pair
 * shares one key by construction). The `requests[]` array is FLAT and LINEAR (no in-file parent DAG), so
 * the current branch is simply the replayed-live requestId sequence, in order.
 *
 * `parse` + the adapter object are pure over records; only {@link discoverCopilotChatFiles} touches
 * `node:fs` (it reads each file's base snapshot for the sessionId). Content-hashing is the injected
 * `node:crypto` sha256/16 prefix, matching the CLI harvest `sha` (and {@link claudeHash}).
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
export function copilotChatHash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** One raw op-log line. `k` is a json-pointer path; `i` marks an array-splice index. */
interface CopilotOp {
  readonly kind: number;
  readonly k?: unknown;
  readonly v?: unknown;
  readonly i?: number;
}

/** A live Copilot request (post-replay) — only the fields this adapter reads; the source carries more. */
interface CopilotRequest {
  readonly requestId?: string;
  readonly message?: unknown;
}

/** The replayed-live session state — the sessionId and the final `requests[]` after applying every op. */
export interface CopilotChatState {
  readonly sessionId: string;
  readonly requests: CopilotRequest[];
}

/** Pull the user-prompt text from a request's `message` (a `{ text, parts }` object, or a bare string). */
function messageText(message: unknown): string {
  if (typeof message === "string") return message;
  const m = message as { text?: unknown; parts?: unknown } | null | undefined;
  if (typeof m?.text === "string") return m.text;
  if (Array.isArray(m?.parts)) {
    let text = "";
    for (const part of m.parts) {
      const p = part as { text?: unknown };
      if (typeof p?.text === "string") text += (text ? "\n" : "") + p.text;
    }
    return text;
  }
  return "";
}

/** Recover a sessionId from a `<sessionId>.jsonl` filename, else the bare basename. */
export function copilotChatSessionIdFromFile(file: string): string {
  return basename(file).replace(/\.jsonl$/, "");
}

/**
 * REPLAY the JSON-patch op-log to its live state. Starts from the `kind:0` base snapshot's `requests[]`
 * and applies every subsequent array-splice on `["requests"]`:
 *   - `kind:2` no `i`             → append the items;
 *   - `kind:2` `i` present, list  → `splice(i, 1, …items)` (replace the re-issued turn in place);
 *   - `kind:2` `i` present, null  → `splice(i, 1)` (delete the removed turn).
 * Nested `kind:1/2` ops (streaming into `["requests",N,…]`) never touch a request's `requestId` (an edit
 * re-splices the WHOLE request with a fresh id), so identity needs only the array-level ops. A malformed
 * or snapshot-less file replays to an empty session. `file` supplies the sessionId fallback.
 */
export function replayCopilotChat(content: string, file = ""): CopilotChatState {
  const fallbackSession = file ? copilotChatSessionIdFromFile(file) : "";
  let sessionId = fallbackSession;
  const requests: CopilotRequest[] = [];
  let sawBase = false;

  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let op: CopilotOp;
    try { op = JSON.parse(line) as CopilotOp; } catch { continue; }

    if (op.kind === 0) {
      const state = (op.v ?? {}) as { sessionId?: unknown; requests?: unknown };
      sessionId = typeof state.sessionId === "string" && state.sessionId ? state.sessionId : fallbackSession;
      if (Array.isArray(state.requests)) requests.push(...(state.requests as CopilotRequest[]));
      sawBase = true;
      continue;
    }
    if (!sawBase) continue; // ops before a base snapshot have no state to apply against

    // Only the array-level splice on ["requests"] moves a turn's identity.
    if (op.kind === 2 && Array.isArray(op.k) && op.k.length === 1 && op.k[0] === "requests") {
      const items = Array.isArray(op.v) ? (op.v as CopilotRequest[]) : [];
      if (typeof op.i === "number") requests.splice(op.i, 1, ...items); // replace-1 (or delete when items empty)
      else requests.push(...items); // append a new turn
    }
  }

  return { sessionId, requests };
}

/**
 * Parse a Copilot Chat `.jsonl` op-log into {@link AdapterRecord}s — ONE record per LIVE request (the
 * op-log REPLAYED to its final `requests[]`), keyed by `requestId`. Superseded ops persist in the file
 * but are OFF the live branch, so they never appear here; the shared `diffGone` surfaces them against a
 * prior harvest index (⇒ reharvest, since `appendOnly = true`).
 */
export function parseCopilotChatJsonl(content: string, file = ""): AdapterRecord[] {
  const { sessionId, requests } = replayCopilotChat(content, file);
  const out: AdapterRecord[] = [];
  let index = 0;
  for (const req of requests) {
    if (!req || typeof req !== "object") continue;
    out.push({
      uuid: (req.requestId as string | undefined) ?? null, // request_<uuid> ⇒ native-uuid rung
      parentUuid: null, // the requests[] array is flat + linear — no in-file parent DAG
      role: "user", // a request is one user-initiated turn unit (prompt + response)
      text: messageText(req.message),
      isSidechain: false,
      sessionId,
      index: index++,
    });
  }
  return out;
}

/** Read each file's base snapshot for its sessionId; each Copilot session is its own singleton family. */
export function discoverCopilotChatFiles(sessionFiles: readonly string[]): SessionGroup[] {
  return sessionFiles.map((file) => {
    let sessionId = copilotChatSessionIdFromFile(file);
    try { sessionId = replayCopilotChat(readFileSync(file, "utf8"), file).sessionId; } catch { /* skip unreadable */ }
    return { rootKey: sessionId, sessionIds: [sessionId], files: [file] };
  });
}

/**
 * The GitHub Copilot Chat {@link SourceAdapter}. `discover · perAppSignal` are the app-specific reads
 * (`currentBranch` delegates to the shared {@link linearBranch}); the SHARED free functions in
 * source-adapter supply the identity ladder, the linear-branch reconstruction, the diff, the
 * classify-by-shape, and the emit gate.
 */
export const copilotChatAdapter: SourceAdapter = {
  name: "copilot-chat",
  appendOnly: true, // VERIFIED by the bytes: superseded ops persist in the append log, replay-recoverable

  /** Each session file stands alone — Copilot Chat has no cross-file fork header (rewinds are in-file). */
  discover(sessionFiles: readonly string[]): SessionGroup[] {
    return discoverCopilotChatFiles(sessionFiles);
  },

  /**
   * The current branch is the REPLAYED-LIVE requestId sequence: `parse` already replayed the op-log to
   * its final `requests[]`, so every kept record IS on the live branch, in order — the shared
   * {@link linearBranch} reconstruction, fed the Copilot-Chat content-hasher.
   */
  currentBranch(records: readonly AdapterRecord[]): string[] {
    return linearBranch(records, copilotChatHash);
  },

  /**
   * The per-app signal: a Copilot rewind (edit / regenerate / restore) SUPERSEDES a turn IN PLACE — a
   * re-splice at `["requests",N,…]` replaces the old requestId with a new one and re-runs the tail. The
   * superseded turns leave NO live sibling (the array replaces, it does not fork), so `hasNewSibling` is
   * always false: the shared classifier reads the prior-vs-live diff as a TAIL_TRUNCATE / INTERIOR_DELETE
   * (a contiguous trailing run of superseded requestIds), and `appendOnly = true` ⇒ emit `reharvest`
   * (the orphan persists in the op-log). No out-of-file fork exists to flag.
   */
  perAppSignal(_records: readonly AdapterRecord[], _prior: readonly string[]): PerAppSignal {
    return { hasNewSibling: false, note: "copilot-chat: rewind supersedes in-place; orphan persists in the op-log (reharvestable)" };
  },
};
