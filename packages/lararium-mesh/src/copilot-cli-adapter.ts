/**
 * copilot-cli-adapter — the GitHub Copilot-CLI {@link SourceAdapter}, built against the reference
 * {@link claudeCodeAdapter} (commit 697f959c) and the sibling {@link codexAdapter}, grounded on the real
 * `~/.copilot/**` bytes on this box.
 *
 * ## Storage (grounded)
 *   ~/.copilot/session-state/<uuid>/events.jsonl  — the TRUTH: an append-only event log
 *   ~/.copilot/session-store.db                   — a SQLite PROJECTION, rebuildable via reindex
 *
 * The SQLite `turns` table IS the projection shape (read live off `session-store.db`):
 *   turns(id INTEGER PK AUTOINCREMENT, session_id TEXT, turn_index INTEGER NOT NULL,
 *         user_message TEXT, assistant_response TEXT, timestamp TEXT,
 *         UNIQUE(session_id, turn_index))
 * The event log is the source; the DB is derived (a reindex rebuilds it), so the adapter reads the
 * `events.jsonl` and never the DB. `appendOnly = true`: a rewind ORPHANS-not-deletes, kapae re-harvests.
 *
 * ## Turn granularity + identity — the content-hash rung (NOT turn_index)
 * A `turns` row is PER-TURN: one row carries BOTH `user_message` AND `assistant_response`, keyed by
 * `turn_index` (`UNIQUE(session_id, turn_index)`). So `turn_index` counts TURNS, not messages. Feeding a
 * per-turn ordinal as the native/session-index rung would (a) make an EDIT re-key the SAME slot — an
 * in-place overwrite that silently DROPS the superseded content, violating the append-only "nothing
 * vanishes, re-harvestable" doctrine — and (b) diverge across any re-run. So a turn rides the
 * CONTENT-HASH rung of the 4-rung {@link identityLadder} (uuid + nativeSeq both absent): the same text
 * hashes identically (stable for the copied/unchanged prefix `diffGone` compares), while EDITED content
 * hashes to a NEW key and the superseded emission's key falls out of the live set ⇒ it reads gone ⇒ kapae
 * re-harvests it as a preserved orphan. This mirrors {@link codexAdapter}'s content-hash choice for its
 * per-turn user messages.
 *
 * ## Rewind semantics — the log appends, the DB is derived
 *   - A re-emitted `turn_index` UPSERTS/replaces that projection row (same index, new content /
 *     timestamp) = an EDIT / REGEN. {@link parseCopilotEvents} FOLDS to the latest content per
 *     `turn_index` (the live turn); the superseded emission's content-hash key leaves the live set, so
 *     the shared diff surfaces it — `appendOnly = true` gates the emit to `reharvest`.
 *     {@link editedTurnIndices} reads the raw log back for the explicit new-content (EDIT) signal.
 *   - An index present-then-absent = a DELETE (a tail-truncate, or an interior hole) — the same
 *     content-hash diff surfaces it ⇒ `reharvest`.
 *   - `/session delete` = a whole-session hard-delete (the whole `session-state/<uuid>/` dir vanishes).
 *
 * Copilot-CLI has NO out-of-file fork (no `--fork-session`; a session lives in one dir), so — unlike
 * Codex — there is no cross-file fork edge and {@link copilotCliAdapter.perAppSignal} carries no new
 * sibling: the in-file re-emit rides the content-hash diff alone (the shared classifier reads the shape).
 *
 * `parse` + the adapter object are pure over records; only {@link copilotCliAdapter.discover} touches
 * `node:fs`. Content-hashing is the injected `node:crypto` sha256/16 prefix (matching the CLI harvest `sha`).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/rewind-adapter
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import {
  identityLadder,
  makeIdentityContext,
  normalizeText,
  type AdapterRecord,
  type IdentityContext,
  type PerAppSignal,
  type SessionGroup,
  type SourceAdapter,
  type TurnIdentity,
} from "./source-adapter.js";

/** The default content-hasher (16-hex sha256 prefix) — matches the CLI harvest `sha` and {@link claudeHash}. */
export function copilotHash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
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

/** Assemble a turn's text from a copilot event row — the user side then the assistant side, tolerant of shapes. */
function eventText(row: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const field of ["user_message", "userMessage", "assistant_response", "assistantResponse", "content", "message", "text"]) {
    const t = valueText(row[field]);
    if (t) parts.push(t);
  }
  return parts.join("\n").trim();
}

/** Read the monotonic per-turn `turn_index` off an event row (number or numeric string), or null when absent. */
function turnIndexOf(row: Record<string, unknown>): number | null {
  const v = row["turn_index"] ?? row["turnIndex"];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Read the session id an event row carries (`session_id` / `sessionId`), else null. */
function sessionOf(row: Record<string, unknown>): string | null {
  const v = (row["session_id"] as string | undefined) ?? (row["sessionId"] as string | undefined);
  return v ? String(v) : null;
}

/**
 * Parse a Copilot-CLI `events.jsonl` (the append-only event log) into the LIVE turns — one
 * {@link AdapterRecord} per `turn_index`, FOLDED to the LATEST emission (the current UPSERT winner), in
 * ascending `turn_index` order (the monotonic live-branch order). No `uuid` / `nativeSeq` is set, so each
 * turn rides the CONTENT-HASH rung of {@link identityLadder}. `sessionId` seeds the namespace when a row
 * carries no `session_id`.
 *
 * The superseded (pre-edit) emissions are folded OUT of the live set here; they are the orphans the diff
 * surfaces against a prior harvest. {@link editedTurnIndices} reads them back from the raw log.
 */
export function parseCopilotEvents(content: string, sessionId = ""): AdapterRecord[] {
  const latest = new Map<number, { text: string; session: string }>();
  const firstSeen: number[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try { row = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    const ti = turnIndexOf(row);
    if (ti === null) continue;
    const text = eventText(row);
    if (!text) continue;
    if (!latest.has(ti)) firstSeen.push(ti);
    latest.set(ti, { text, session: sessionOf(row) ?? sessionId });
  }
  return firstSeen
    .slice()
    .sort((a, b) => a - b)
    .map((ti, i) => {
      const live = latest.get(ti)!;
      return {
        uuid: null,
        parentUuid: null,
        role: "turn",
        text: live.text,
        isSidechain: false,
        sessionId: live.session,
        index: i,
      } satisfies AdapterRecord;
    });
}

/**
 * The `turn_index`es RE-EMITTED with NEW content in this raw log — the explicit EDIT / UPSERT signal
 * (a `turn_index` reappearing with a different normalized text supersedes its prior emission). An
 * identical re-emit (idempotent UPSERT) is NOT an edit. Returned ascending.
 */
export function editedTurnIndices(content: string): number[] {
  const latest = new Map<number, string>();
  const edited = new Set<number>();
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try { row = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    const ti = turnIndexOf(row);
    if (ti === null) continue;
    const text = eventText(row);
    if (!text) continue;
    const norm = normalizeText(text);
    const prev = latest.get(ti);
    if (prev !== undefined && prev !== norm) edited.add(ti);
    latest.set(ti, norm);
  }
  return [...edited].sort((a, b) => a - b);
}

/**
 * The Copilot-CLI {@link SourceAdapter}. `discover · normalizeIdentity · currentBranch · perAppSignal`
 * are the app-specific reads; the SHARED free functions in source-adapter supply the identity ladder,
 * the diff, the classify-by-shape, and the emit gate.
 */
export const copilotCliAdapter: SourceAdapter = {
  name: "copilot-cli",
  appendOnly: true,

  /**
   * Read each `events.jsonl` into a singleton {@link SessionGroup}: a Copilot-CLI session lives in its
   * own `session-state/<uuid>/` dir and shares no root with another (there is no `--fork-session`), so a
   * family never spans files. The session id is the dir uuid (or a row's `session_id`).
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

  normalizeIdentity(rec: AdapterRecord, ctx: IdentityContext): TurnIdentity {
    return identityLadder(rec, ctx);
  },

  /**
   * The current branch is the LINEAR live-turn chain (parse already folded each `turn_index` to its
   * latest content, in ascending order), so every kept turn IS on the live branch. Keys ride
   * {@link identityLadder} (which owns the session-namespace separator) — never a hand-typed separator.
   */
  currentBranch(records: readonly AdapterRecord[]): string[] {
    const sessionId = records[0]?.sessionId ?? "?";
    const ctx = makeIdentityContext(sessionId, copilotHash);
    return records.map((rec) => identityLadder(rec, ctx).key);
  },

  /**
   * Copilot-CLI has NO out-of-file fork and no in-file `parentUuid` DAG to re-parent — a rewind is an
   * in-file `turn_index` re-emit whose superseded content-hash key simply leaves the live set. So there
   * is no app-specific new sibling to flag: the shared classifier reads the rewind shape (TAIL_TRUNCATE /
   * INTERIOR_DELETE / DELETE) from the content-hash diff alone, and `appendOnly = true` gates it to
   * `reharvest`. ({@link editedTurnIndices} exposes the raw EDIT signal for callers that want it.)
   */
  perAppSignal(_records: readonly AdapterRecord[], _prior: readonly string[]): PerAppSignal {
    return { hasNewSibling: false };
  },
};
