/**
 * copilot-cli-adapter — the GitHub Copilot-CLI {@link SourceAdapter}, built against the reference
 * {@link claudeCodeAdapter} (commit 697f959c) and the sibling {@link codexAdapter}, GROUNDED ON THE REAL
 * `~/.copilot/**` bytes of a LIVE, multi-turn session (not the empty-DB schema the first cut assumed).
 *
 * ## Storage (grounded on real bytes)
 *   ~/.copilot/session-state/<uuid>/events.jsonl  — the TRUTH: an append-only TYPED event log
 *   ~/.copilot/session-store.db                   — a SQLite PROJECTION (a `turns` table), rebuildable
 *
 * ### The correction (real bytes vs the first cut)
 * The FIRST cut modelled `events.jsonl` as FLAT turn rows mirroring the DB — top-level `turn_index`,
 * `user_message`, `assistant_response`. That flat shape lives ONLY in the derived SQLite `turns` table.
 * The real `events.jsonl` is a TYPED EVENT STREAM, every line:
 *   `{ type, data, id, parentId, timestamp }`
 * with `type ∈ { session.start, session.model_change, system.message, user.message, assistant.turn_start,
 * assistant.message, assistant.turn_end, tool.execution_start, tool.execution_complete, system.notification,
 * permission.requested, permission.completed, … }`. The readable transcript rides:
 *   - `user.message`      → `data.content` (the operator's words), `data.interactionId`, `data.delivery`
 *   - `assistant.message` → `data.content`, `data.messageId` (a stable id), `data.turnId`, `data.interactionId`
 *
 * So the "UPSERT a `turn_index` row" the first cut worried about is a DB-PROJECTION behaviour, NOT a log
 * behaviour: the LOG only ever APPENDS (exactly like Codex). The corrected adapter therefore reads the
 * event log as a LINEAR APPEND CHAIN — no in-log re-emit fold.
 *
 * ### `turnId` is NOT a turn ordinal (the second footgun)
 * `data.turnId` RESETS to 0 on every new user interaction and counts the ASSISTANT SUB-TURNS (each
 * tool-call round increments it), so it collides across interactions (every interaction has a turnId 0).
 * The real per-exchange identity is `data.interactionId` (a UUID minted on the operator's `user.message`).
 * Feeding `turnId` as an ordinal rung would be catastrophic; the adapter never does.
 *
 * ## Turn granularity + identity — mirrors {@link codexAdapter}
 *   - An `assistant.message` carries a stable `data.messageId` ⇒ the NATIVE-UUID rung (rung 1). A rewind /
 *     regenerate mints a NEW `messageId` (a fresh API call), so the superseded message's key leaves the
 *     live set ⇒ it reads gone ⇒ `appendOnly = true` re-harvests it as a preserved orphan.
 *   - A `user.message` carries NO stable id ⇒ the CONTENT-HASH rung (rung 3): the same operator text
 *     hashes identically (stable for the copied prefix the diff compares), an EDITED message hashes to a
 *     NEW key and the superseded one falls out of the live set ⇒ reharvest. Identical to Codex's user turns.
 *
 * Only the FIRST `user.message` of an `interactionId` is a real operator turn: a LATER `user.message` that
 * REUSES a still-open `interactionId` is an INJECTED tool-result delivery (Copilot re-delivers large tool
 * output back to the model as a `user.message` with `delivery ≠ "idle"` and no `transformedContent`) — it
 * is skipped, the way Codex skips its `developer` base-instructions injection. Empty-content
 * `assistant.message`s (the tool-call-only sub-turns) are skipped too.
 *
 * ## Rewind semantics
 * Copilot-CLI has NO out-of-file fork (no `--fork-session`; a session lives in one `session-state/<uuid>/`
 * dir), and the log carries no per-message `parentUuid` DAG to re-parent in place. A rewind/regenerate
 * APPENDS fresh events; the superseded message's native-uuid / content-hash key simply leaves the live
 * (linear) branch, and the SHARED classifier reads TAIL_TRUNCATE / INTERIOR_DELETE / DELETE from the
 * content diff alone, gated to `reharvest` by `appendOnly = true`. So {@link copilotCliAdapter.perAppSignal}
 * carries no new sibling. `/session delete` is a whole-session hard-delete (the dir vanishes).
 *
 * NOTE: the rewind PATH is validated by shape (the shared diff/classify is proven cross-adapter), but a
 * real Copilot-CLI `/rewind` was not present in the grounding session — the exact bytes a rewind appends
 * to `events.jsonl` await a real rewind event to confirm.
 *
 * `parse` + the adapter object are pure over records; only {@link copilotCliAdapter.discover} touches
 * `node:fs`. Content-hashing is the injected `node:crypto` sha256/16 prefix (matching the CLI harvest `sha`).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/rewind-adapter
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import {
  linearBranch,
  type AdapterRecord,
  type PerAppSignal,
  type SessionGroup,
  type SourceAdapter,
} from "./source-adapter.js";

/** The default content-hasher (16-hex sha256 prefix) — matches the CLI harvest `sha` and {@link claudeHash}. */
export function copilotHash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** Read a string field off an object, else "". */
function str(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  return typeof v === "string" ? v : "";
}

/** Pull the readable text from a value — a bare string, a `{content}` / `{text}` object, or a block array. */
function valueText(v: unknown): string {
  if (typeof v === "string") return v;
  if (!v || typeof v !== "object") return "";
  const o = v as { content?: unknown; text?: unknown };
  if (typeof o.content === "string") return o.content;
  if (Array.isArray(o.content)) {
    let text = "";
    for (const block of o.content) {
      const b = block as { type?: string; text?: string };
      if (b?.type === "text" && typeof b.text === "string") text += (text ? "\n" : "") + b.text;
    }
    if (text) return text;
  }
  if (typeof o.text === "string") return o.text;
  return "";
}

/**
 * Parse a Copilot-CLI `events.jsonl` (the append-only TYPED event log) into the transcript turns — one
 * {@link AdapterRecord} per real operator `user.message` and per non-empty `assistant.message`, in the
 * linear append order the log carries (Copilot never edits an earlier line; a rewind APPENDS).
 *
 * Identity rungs (via {@link identityLadder}, seeded downstream): an assistant message rides its stable
 * `data.messageId` (native-uuid rung); a user message has no id ⇒ content-hash rung. Only the FIRST
 * `user.message` of an `interactionId` is kept (a later one reusing a live interaction is an injected
 * tool-result delivery); empty-content assistant messages (tool-call-only sub-turns) are dropped.
 *
 * `sessionId` seeds the record namespace (the dir uuid); `data.sessionId` on `session.start` corroborates.
 */
export function parseCopilotEvents(content: string, sessionId = ""): AdapterRecord[] {
  const out: AdapterRecord[] = [];
  const openInteractions = new Set<string>();
  let ns = sessionId;
  let index = 0;
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try { row = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    const type = str(row, "type");
    const data = (row["data"] ?? {}) as Record<string, unknown>;

    if (type === "session.start" && !ns) {
      ns = str(data, "sessionId") || ns;
      continue;
    }

    if (type === "user.message") {
      const interaction = str(data, "interactionId");
      // The FIRST user.message of an interaction is the operator's turn; a later one REUSING a still-open
      // interactionId is an injected tool-result delivery (delivery ≠ "idle") — skip it.
      if (interaction && openInteractions.has(interaction)) continue;
      if (interaction) openInteractions.add(interaction);
      const text = valueText(data["content"]);
      if (!text.trim()) continue;
      out.push({
        uuid: null,
        parentUuid: null,
        role: "user",
        text,
        isSidechain: false,
        sessionId: ns,
        index: index++,
      } satisfies AdapterRecord);
      continue;
    }

    if (type === "assistant.message") {
      const text = valueText(data["content"]);
      if (!text.trim()) continue; // tool-call-only sub-turns carry empty content — skip
      const messageId = str(data, "messageId");
      out.push({
        uuid: messageId || null, // a stable messageId ⇒ native-uuid rung, else content-hash
        parentUuid: null,
        role: "assistant",
        text,
        isSidechain: false,
        sessionId: ns,
        index: index++,
      } satisfies AdapterRecord);
      continue;
    }
    // session.model_change · system.message (the injected system prompt) · assistant.turn_start/end ·
    // tool.* · system.notification · permission.* — not transcript turns, skipped (cf. Codex `developer`).
  }
  return out;
}

/**
 * The Copilot-CLI {@link SourceAdapter}. `discover · perAppSignal` are the app-specific reads
 * (`currentBranch` delegates to the shared {@link linearBranch}); the SHARED free functions in
 * source-adapter supply the identity ladder, the linear-branch reconstruction, the diff, the
 * classify-by-shape, and the emit gate.
 */
export const copilotCliAdapter: SourceAdapter = {
  name: "copilot-cli",
  appendOnly: true,

  /**
   * Read each `events.jsonl` into a singleton {@link SessionGroup}: a Copilot-CLI session lives in its
   * own `session-state/<uuid>/` dir and shares no root with another (there is no `--fork-session`), so a
   * family never spans files. The session id is the dir uuid (or a `session.start` `sessionId`).
   */
  discover(sessionFiles: readonly string[]): SessionGroup[] {
    return sessionFiles.map((file) => {
      const dirSession = file ? basename(dirname(file)) : "";
      let records: AdapterRecord[] = [];
      try { records = parseCopilotEvents(readFileSync(file, "utf8"), dirSession); } catch { /* skip unreadable */ }
      const sessionId = records[0]?.sessionId ?? dirSession ?? basename(file);
      return { rootKey: sessionId, sessionIds: [sessionId], files: [file] };
    });
  },

  /**
   * The current branch is the LINEAR append chain (Copilot never edits an earlier line and has no in-file
   * re-parent), so every kept record IS on the live branch, in order — the shared {@link linearBranch}
   * reconstruction, fed the Copilot-CLI content-hasher.
   */
  currentBranch(records: readonly AdapterRecord[]): string[] {
    return linearBranch(records, copilotHash);
  },

  /**
   * Copilot-CLI has NO out-of-file fork and no in-file `parentUuid` DAG to re-parent — a rewind APPENDS
   * fresh events whose superseded native-uuid / content-hash key simply leaves the live set. So there is
   * no app-specific new sibling to flag: the shared classifier reads the rewind shape (TAIL_TRUNCATE /
   * INTERIOR_DELETE / DELETE) from the content diff alone, and `appendOnly = true` gates it to `reharvest`.
   */
  perAppSignal(_records: readonly AdapterRecord[], _prior: readonly string[]): PerAppSignal {
    return { hasNewSibling: false };
  },
};
