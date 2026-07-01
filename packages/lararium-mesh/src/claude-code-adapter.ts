/**
 * claude-code-adapter — the REFERENCE {@link SourceAdapter} the adapter-swarm (Codex / Copilot-CLI /
 * Copilot-Chat) builds against.
 *
 * Claude Code stores one session per `~/.claude/projects/<slug>/<sessionId>.jsonl`; each line is a
 * record carrying `uuid` + `parentUuid` (the turn DAG), `type` (`user`/`assistant`), `sessionId`,
 * `isSidechain` (worker-swarm sub-agents), and a `message`. It is an APPEND-ONLY / FORK source — a
 * rewind ORPHANS-not-deletes — so `appendOnly = true`: the orphaned tail persists, kapae down-weights
 * AND marks it re-harvestable.
 *
 * Two rewind mechanisms, both handled:
 *   - IN-FILE re-parent (`/rewind`): new turns re-parent off an earlier node; the rewound tail stays in
 *     the SAME `.jsonl` as an orphaned branch (same parent, SAME-TYPE sibling = a real re-issue). The
 *     current-branch reconstruction ({@link reconstructCurrentBranch}) walks past it to the live leaf.
 *   - NEW-FILE fork (`--fork-session` / `/branch`): a NEW sessionId file sharing the parent's early
 *     uuids (Claude copies history to the fork point, then diverges). {@link groupForkFamilies} groups
 *     them under the shared root so the lineage is one family.
 *
 * Uses `node:crypto` for the default content-hasher and `node:fs` only in {@link discoverClaudeFiles}
 * (the fork-family grouping reads each file's root). The parse + adapter object are pure over records.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/rewind-adapter
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import {
  reconstructCurrentBranch,
  rewindOrphanUuids,
  type BranchNode,
} from "./gone-turns.js";
import {
  identityLadder,
  type AdapterRecord,
  type IdentityContext,
  type PerAppSignal,
  type SessionGroup,
  type SourceAdapter,
  type TurnIdentity,
} from "./source-adapter.js";

const NS = "\u0000"; // MUST match source-adapter's session-namespace separator

/** The default content-hasher (16-hex sha256 prefix) — matches the CLI harvest `sha`. */
export function claudeHash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** Pull the readable text from a Claude message's content (array of blocks, or a bare string). */
function messageText(message: unknown): string {
  if (typeof message === "string") return message;
  const content = (message as { content?: unknown })?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let text = "";
  for (const block of content) {
    const b = block as { type?: string; text?: string };
    if (b?.type === "text" && typeof b.text === "string") text += (text ? "\n" : "") + b.text;
  }
  return text;
}

/** Derive a subagent id from an `agent-<id>.jsonl` filename, else null (a main-session file). */
function agentIdFromFile(file: string): string | null {
  const m = /^agent-(.+)\.jsonl$/.exec(basename(file));
  return m ? (m[1] ?? null) : null;
}

/**
 * Parse a Claude `.jsonl` transcript into {@link AdapterRecord}s (user/assistant turns only). `file` is
 * optional — it recovers the `agent-<id>` sidechain marker and a sessionId fallback from the basename.
 */
export function parseClaudeJsonl(content: string, file = ""): AdapterRecord[] {
  const out: AdapterRecord[] = [];
  const fileAgent = agentIdFromFile(file);
  const fallbackSession = file ? basename(file).replace(/\.jsonl$/, "") : "";
  let index = 0;
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try { row = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    const role = String(row["type"] ?? "");
    if (role !== "user" && role !== "assistant") continue;
    const text = messageText(row["message"]);
    if (!text.trim()) continue;
    out.push({
      uuid: (row["uuid"] as string | undefined) ?? null,
      parentUuid: (row["parentUuid"] as string | null | undefined) ?? null,
      role,
      text,
      isSidechain: row["isSidechain"] === true || fileAgent !== null,
      sessionId: String(row["sessionId"] ?? fallbackSession),
      index: index++,
    });
  }
  return out;
}

/** Map an {@link AdapterRecord} to the branch-DAG shape gone-turns walks. */
function toBranchNode(rec: AdapterRecord): BranchNode {
  return { uuid: rec.uuid ?? "", parentUuid: rec.parentUuid, isSidechain: rec.isSidechain, type: rec.role };
}

/** Namespace a uuid into the session-scoped identity key (matches {@link identityLadder} rung 1). */
function nsKey(sessionId: string, uuid: string): string {
  return `${sessionId || "?"}${NS}${uuid}`;
}

/** The root uuid of a session's records — the record with no in-set parent (the conversation root). */
export function rootUuidOf(records: readonly AdapterRecord[]): string | null {
  const byUuid = new Set(records.map((r) => r.uuid).filter((u): u is string => !!u));
  for (const r of records) {
    if (!r.uuid) continue;
    if (!r.parentUuid || !byUuid.has(r.parentUuid)) return r.uuid; // parent outside the file ⇒ this is the root
  }
  return records.find((r) => r.uuid)?.uuid ?? null;
}

/**
 * Group parsed sessions into fork-FAMILIES by shared ROOT uuid — a `--fork-session` copies history up
 * to the fork point, so the fork file and its parent share the same root uuid. Sessions with no shared
 * root each form a singleton family. Members sort by earliest index (eldest → newest) by input order.
 */
export function groupForkFamilies(
  sessions: readonly { readonly sessionId: string; readonly file: string; readonly records: readonly AdapterRecord[] }[],
): SessionGroup[] {
  const byRoot = new Map<string, { sessionIds: string[]; files: string[] }>();
  for (const s of sessions) {
    const root = rootUuidOf(s.records) ?? s.sessionId;
    let g = byRoot.get(root);
    if (!g) { g = { sessionIds: [], files: [] }; byRoot.set(root, g); }
    g.sessionIds.push(s.sessionId);
    g.files.push(s.file);
  }
  return [...byRoot.entries()].map(([rootKey, g]) => ({
    rootKey,
    sessionIds: g.sessionIds,
    files: g.files,
  }));
}

/**
 * The Claude-Code {@link SourceAdapter} — the reference implementation.
 */
export const claudeCodeAdapter: SourceAdapter = {
  name: "claude-code",
  appendOnly: true,

  /** Read each file, parse it, and group the sessions into fork-families by shared root. */
  discover(sessionFiles: readonly string[]): SessionGroup[] {
    const sessions = sessionFiles.map((file) => {
      let records: AdapterRecord[] = [];
      try { records = parseClaudeJsonl(readFileSync(file, "utf8"), file); } catch { /* skip unreadable */ }
      const sessionId = records[0]?.sessionId ?? basename(file).replace(/\.jsonl$/, "");
      return { sessionId, file, records };
    });
    return groupForkFamilies(sessions);
  },

  normalizeIdentity(rec: AdapterRecord, ctx: IdentityContext): TurnIdentity {
    return identityLadder(rec, ctx);
  },

  /** The current-branch leaf-chain as session-namespaced KEYS (root → leaf). */
  currentBranch(records: readonly AdapterRecord[]): string[] {
    const sessionId = records[0]?.sessionId ?? "?";
    return reconstructCurrentBranch(records.map(toBranchNode)).map((uuid) => nsKey(sessionId, uuid));
  },

  /**
   * The per-app signal: an in-file `/rewind` that AUTHORED a new branch reads as a FORK — a rewind
   * orphan whose parent ALSO carries an on-branch (same-type) sibling means the operator diverged and
   * kept writing. A pure tail-cut (orphan whose parent ends the branch) leaves `hasNewSibling` false ⇒
   * the shared classifier reads TAIL_TRUNCATE.
   */
  perAppSignal(records: readonly AdapterRecord[], _prior: readonly string[]): PerAppSignal {
    const nodes = records.map(toBranchNode);
    const orphans = rewindOrphanUuids(nodes);
    if (orphans.size === 0) return { hasNewSibling: false };
    const sessionId = records[0]?.sessionId ?? "?";
    const branch = new Set(reconstructCurrentBranch(nodes));
    const parentOf = new Map<string, string | null>();
    for (const n of nodes) if (n.uuid) parentOf.set(n.uuid, n.parentUuid ?? null);
    // A rewind orphan whose parent is ON the branch AND has an on-branch child = a divergence with new
    // content = a FORK; its parent is the shared root the sibling branched from.
    for (const o of orphans) {
      const p = parentOf.get(o);
      if (!p || !branch.has(p)) continue;
      const parentHasOnBranchChild = [...branch].some((b) => parentOf.get(b) === p);
      if (parentHasOnBranchChild) return { hasNewSibling: true, forkRootKey: nsKey(sessionId, p) };
    }
    return { hasNewSibling: false };
  },
};
