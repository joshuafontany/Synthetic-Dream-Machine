/**
 * worldline-inject-detect — the rhizome's branch-points: a SendMessage-continue in a spirit
 * transcript → a prov:Communication edge. Tested against the transcript SHAPE (the live signal awaits
 * a real continuation sample — see the module's feasibility flag).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#attribution
 */

import { describe, test, expect } from "vitest";
import {
  classifyTranscriptTurn,
  detectInjectionTurns,
  deriveInjectionEdges,
  PRED_COMMUNICATION,
  type TranscriptTurn,
} from "../src/index.js";

// Transcript line shapes — the harness jsonl forms the classifier reasons over.
const userPrompt = (uuid: string, ts: string, text: string) =>
  JSON.stringify({ type: "user", uuid, timestamp: ts, message: { role: "user", content: text } });
const userToolResult = (uuid: string, ts: string) =>
  JSON.stringify({ type: "user", uuid, timestamp: ts, message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } });
const assistant = (uuid: string, ts: string) =>
  JSON.stringify({ type: "assistant", uuid, timestamp: ts, message: { role: "assistant", content: [{ type: "text", text: "..." }] } });

describe("classifyTranscriptTurn", () => {
  test("a plain-text user message reads as a prompt (not a tool result)", () => {
    const t = classifyTranscriptTurn(userPrompt("u1", "2026-06-29T00:00:00Z", "do the thing"));
    expect(t).toEqual({ role: "user", uuid: "u1", ts: "2026-06-29T00:00:00Z", isToolResult: false });
  });

  test("a user message carrying a tool_result block reads as a tool-result echo", () => {
    const t = classifyTranscriptTurn(userToolResult("u2", "2026-06-29T00:00:01Z"));
    expect(t?.isToolResult).toBe(true);
  });

  test("assistant turns classify; blank + system + unparseable lines drop to null", () => {
    expect(classifyTranscriptTurn(assistant("a1", "t"))?.role).toBe("assistant");
    expect(classifyTranscriptTurn("")).toBeNull();
    expect(classifyTranscriptTurn("  ")).toBeNull();
    expect(classifyTranscriptTurn("{not json")).toBeNull();
    expect(classifyTranscriptTurn(JSON.stringify({ type: "summary" }))).toBeNull();
  });
});

describe("detectInjectionTurns — the SendMessage-continue signal", () => {
  test("one-handoff/run-to-completion transcript → ZERO injections (the common case)", () => {
    const turns = [
      classifyTranscriptTurn(userPrompt("u1", "t0", "task")),
      classifyTranscriptTurn(assistant("a1", "t1")),
      classifyTranscriptTurn(userToolResult("u2", "t2")), // tool round-trip, not an injection
      classifyTranscriptTurn(assistant("a2", "t3")),
    ].filter((t): t is TranscriptTurn => t !== null);
    expect(detectInjectionTurns(turns)).toHaveLength(0);
  });

  test("a second user PROMPT after output → one injection point (the re-entry)", () => {
    const turns = [
      classifyTranscriptTurn(userPrompt("u1", "t0", "task")), // spawn task — the anchor
      classifyTranscriptTurn(assistant("a1", "t1")),
      classifyTranscriptTurn(userToolResult("u2", "t2")),
      classifyTranscriptTurn(assistant("a2", "t3")),
      classifyTranscriptTurn(userPrompt("u3", "t4", "actually, also do X")), // SendMessage-continue
      classifyTranscriptTurn(assistant("a3", "t5")),
    ].filter((t): t is TranscriptTurn => t !== null);
    const injections = detectInjectionTurns(turns);
    expect(injections.map((t) => t.uuid)).toEqual(["u3"]);
  });

  test("multiple re-entries → multiple injection points", () => {
    const turns = [
      classifyTranscriptTurn(userPrompt("u1", "t0", "task")),
      classifyTranscriptTurn(assistant("a1", "t1")),
      classifyTranscriptTurn(userPrompt("u2", "t2", "more")),
      classifyTranscriptTurn(assistant("a2", "t3")),
      classifyTranscriptTurn(userPrompt("u3", "t4", "even more")),
    ].filter((t): t is TranscriptTurn => t !== null);
    expect(detectInjectionTurns(turns).map((t) => t.uuid)).toEqual(["u2", "u3"]);
  });
});

describe("deriveInjectionEdges — a re-entry → a prov:Communication edge", () => {
  test("emits one Communication edge per injection, keyed turnKey=uuid + valid_from=ts", () => {
    const turns = [
      classifyTranscriptTurn(userPrompt("u1", "t0", "task")),
      classifyTranscriptTurn(assistant("a1", "t1")),
      classifyTranscriptTurn(userPrompt("u3", "2026-06-29T00:00:04Z", "also do X")),
    ].filter((t): t is TranscriptTurn => t !== null);
    const edges = deriveInjectionEdges("run", "run.spirit", turns);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      subject: "run",
      predicate: PRED_COMMUNICATION,
      object: "run.spirit",
      turnKey: "u3",
      valid_from: "2026-06-29T00:00:04Z",
    });
  });

  test("a clean one-handoff transcript yields no Communication edges", () => {
    const turns = [
      classifyTranscriptTurn(userPrompt("u1", "t0", "task")),
      classifyTranscriptTurn(assistant("a1", "t1")),
    ].filter((t): t is TranscriptTurn => t !== null);
    expect(deriveInjectionEdges("run", "run.spirit", turns)).toHaveLength(0);
  });
});
