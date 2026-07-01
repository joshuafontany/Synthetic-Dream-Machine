/**
 * copilot-cli-adapter — the GitHub Copilot-CLI SourceAdapter, grounded on the REAL `~/.copilot/**` bytes
 * of a LIVE multi-turn session. The event log is a TYPED event stream (`{type,data,id,parentId,timestamp}`),
 * NOT the flat `turn_index`/`user_message`/`assistant_response` rows the first cut assumed (that flat shape
 * lives only in the derived SQLite `turns` table). The log APPENDS (like Codex): an `assistant.message`
 * rides its stable `data.messageId` (native-uuid rung), a `user.message` rides the content-hash rung, and
 * appendOnly gates a rewind to reharvest.
 *
 * A redacted real-shape fixture (`fixtures/copilot-cli.events.jsonl` — structure from a real session,
 * content synthetic) grounds the parse; a guarded block also parses any live `~/.copilot` session present.
 * Imports the adapter module DIRECTLY (not the barrel) to stay disjoint from the parallel adapter swarm.
 */
import { describe, test, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { copilotCliAdapter, copilotHash, parseCopilotEvents } from "../src/copilot-cli-adapter.js";
import {
  analyzeSession,
  identityLadder,
  makeIdentityContext,
  type AdapterRecord,
} from "../src/source-adapter.js";

const FIXTURE = join(fileURLToPath(new URL(".", import.meta.url)), "fixtures", "copilot-cli.events.jsonl");

/** Serialize typed events back to the `events.jsonl` line shape the parser reads. */
function jsonl(rows: Array<Record<string, unknown>>): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

/** A real-shaped `user.message` event — `data.content` + the interaction it opens. */
function userEvent(interactionId: string, content: string, delivery: string | null = "idle"): Record<string, unknown> {
  return { type: "user.message", data: { content, delivery, interactionId }, id: `ev-${interactionId}`, parentId: null, timestamp: "2026-07-01T00:00:00.000Z" };
}

/** A real-shaped `assistant.message` event — `data.content` + a stable `messageId` (the native-uuid rung). */
function asstEvent(interactionId: string, messageId: string, content: string, turnId = "0"): Record<string, unknown> {
  return { type: "assistant.message", data: { content, messageId, turnId, interactionId }, id: `ev-${messageId}`, parentId: null, timestamp: "2026-07-01T00:00:00.000Z" };
}

/** Compute the identity keys the adapter WOULD emit — via identityLadder (no hand-typed NS separator). */
function keysOf(records: readonly AdapterRecord[], sessionId: string): string[] {
  const ctx = makeIdentityContext(sessionId, copilotHash);
  return records.map((r) => identityLadder(r, ctx).key);
}

describe("parseCopilotEvents — the typed event stream", () => {
  test("keeps real user turns + non-empty assistant messages, in linear append order", () => {
    const content = jsonl([
      { type: "session.start", data: { sessionId: "S" }, id: "e0", parentId: null, timestamp: "t" },
      { type: "system.message", data: { role: "system", content: "INJECTED-SYSTEM-PROMPT" }, id: "e1", parentId: null, timestamp: "t" },
      userEvent("ix0", "hello"),
      asstEvent("ix0", "msg0", "hi there"),
      userEvent("ix1", "do a thing"),
      { type: "assistant.turn_start", data: { turnId: "0", interactionId: "ix1" }, id: "e5", parentId: null, timestamp: "t" },
      asstEvent("ix1", "msg1", "", "0"), // tool-call-only sub-turn: empty content ⇒ dropped
      { type: "tool.execution_start", data: { turnId: "0" }, id: "e7", parentId: null, timestamp: "t" },
      asstEvent("ix1", "msg2", "done", "1"),
    ]);
    const recs = parseCopilotEvents(content, "S");
    expect(recs.map((r) => `${r.role}:${r.text}`)).toEqual(["user:hello", "assistant:hi there", "user:do a thing", "assistant:done"]);
    expect(recs.every((r) => r.sessionId === "S")).toBe(true);
  });

  test("an injected tool-result user.message (reusing a live interactionId) is NOT a turn", () => {
    const content = jsonl([
      userEvent("ix0", "the operator question"),
      asstEvent("ix0", "msg0", "narration"),
      // Copilot re-delivers large tool output back to the model as a user.message on the SAME interaction:
      userEvent("ix0", "HUGE-TOOL-RESULT-INJECTED", null),
      asstEvent("ix0", "msg1", "final answer", "1"),
    ]);
    const recs = parseCopilotEvents(content, "S");
    expect(recs.map((r) => `${r.role}:${r.text}`)).toEqual(["user:the operator question", "assistant:narration", "assistant:final answer"]);
  });

  test("assistant messages ride the native-uuid rung (messageId); user messages ride content-hash", () => {
    const recs = parseCopilotEvents(jsonl([userEvent("ix0", "q"), asstEvent("ix0", "msg0", "a")]), "S");
    const ctx = makeIdentityContext("S", copilotHash);
    expect(recs.map((r) => identityLadder(r, ctx).rung)).toEqual(["content-hash", "native-uuid"]);
  });
});

describe("adapter contract", () => {
  test("name + appendOnly (Copilot-CLI orphans, never deletes)", () => {
    expect(copilotCliAdapter.name).toBe("copilot-cli");
    expect(copilotCliAdapter.appendOnly).toBe(true);
  });

  test("currentBranch is the linear chain, keyed via identityLadder", () => {
    const recs = parseCopilotEvents(jsonl([userEvent("ix0", "q0"), asstEvent("ix0", "msg0", "a0")]), "S");
    expect(copilotCliAdapter.currentBranch(recs)).toEqual(keysOf(recs, "S"));
  });

  test("perAppSignal carries no new sibling (no out-of-file fork)", () => {
    const recs = parseCopilotEvents(jsonl([userEvent("ix0", "q"), asstEvent("ix0", "msg0", "a")]), "S");
    expect(copilotCliAdapter.perAppSignal(recs, []).hasNewSibling).toBe(false);
  });
});

describe("rewind shape — appendOnly gates the emit to reharvest", () => {
  const before = parseCopilotEvents(jsonl([
    userEvent("ix0", "q0"), asstEvent("ix0", "msg0", "a0"),
    userEvent("ix1", "q1"), asstEvent("ix1", "msg1", "a1"),
    userEvent("ix2", "q2"), asstEvent("ix2", "msg2", "a2"),
  ]), "S");

  test("a dropped tail turn reads gone and reharvests (TAIL_TRUNCATE)", () => {
    const after = parseCopilotEvents(jsonl([
      userEvent("ix0", "q0"), asstEvent("ix0", "msg0", "a0"),
      userEvent("ix1", "q1"), asstEvent("ix1", "msg1", "a1"),
    ]), "S");
    const finding = analyzeSession(copilotCliAdapter, { records: after, prior: keysOf(before, "S") });
    expect(finding?.kind).toBe("TAIL_TRUNCATE");
    expect(finding?.emit).toBe("reharvest");
    expect(finding?.goneKeys).toEqual(keysOf(before, "S").slice(-2));
  });

  test("a regenerated assistant message (new messageId) supersedes the old ⇒ reharvest", () => {
    const after = parseCopilotEvents(jsonl([
      userEvent("ix0", "q0"), asstEvent("ix0", "msg0", "a0"),
      userEvent("ix1", "q1"), asstEvent("ix1", "msg1", "a1"),
      userEvent("ix2", "q2"), asstEvent("ix2", "msg2-REGEN", "a2-regenerated"), // new id + text
    ]), "S");
    const finding = analyzeSession(copilotCliAdapter, { records: after, prior: keysOf(before, "S") });
    expect(finding?.emit).toBe("reharvest");
    expect(finding?.goneKeys).toEqual([keysOf(before, "S").at(-1)]); // the old msg2 key left the live set
  });

  test("no rewind ⇒ no finding", () => {
    expect(analyzeSession(copilotCliAdapter, { records: before, prior: keysOf(before, "S") })).toBeNull();
  });
});

describe("redacted real-shape fixture (fixtures/copilot-cli.events.jsonl)", () => {
  test("parses the real event structure into user + assistant records on the right rungs", () => {
    const recs = parseCopilotEvents(readFileSync(FIXTURE, "utf8"), "FIX");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.role === "user")).toBe(true);
    expect(recs.some((r) => r.role === "assistant" && r.uuid !== null)).toBe(true); // messageId native-uuid rung
    const ctx = makeIdentityContext("FIX", copilotHash);
    const rungs = new Set(recs.map((r) => identityLadder(r, ctx).rung));
    expect(rungs.has("content-hash")).toBe(true);
    expect(rungs.has("native-uuid")).toBe(true);
    // a linear branch with all-unique keys (no collisions across turns)
    const branch = copilotCliAdapter.currentBranch(recs);
    expect(new Set(branch).size).toBe(recs.length);
  });
});

// ── Live-box grounding (guarded — no-op when the box carries no Copilot-CLI session with events) ──
describe("live ~/.copilot bytes", () => {
  test("any present events.jsonl parses into transcript records without throwing", () => {
    const stateDir = join(homedir(), ".copilot", "session-state");
    if (!existsSync(stateDir)) { expect(true).toBe(true); return; }
    for (const dir of readdirSync(stateDir)) {
      const file = join(stateDir, dir, "events.jsonl");
      if (!existsSync(file)) continue;
      const recs = parseCopilotEvents(readFileSync(file, "utf8"), dir);
      expect(Array.isArray(recs)).toBe(true);
      // user records ride content-hash (uuid null); assistant records may carry a messageId native-uuid.
      expect(recs.every((r) => r.role === "user" ? r.uuid === null : true)).toBe(true);
    }
  });
});
