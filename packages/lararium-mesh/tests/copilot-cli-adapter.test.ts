/**
 * copilot-cli-adapter — the GitHub Copilot-CLI SourceAdapter: parse the `events.jsonl` turn-records,
 * FOLD each `turn_index` to its latest content, the content-hash identity rung (turn_index is per-TURN,
 * not per-message, so a per-turn ordinal must NOT ride the session-index rung), the re-emit EDIT signal,
 * the linear current-branch, and the appendOnly emit gate (reharvest, never kapae).
 *
 * Expected identity keys ride identityLadder so no session-namespace separator is ever hand-typed (the
 * NUL-vs-space bug that bit the foundation). Imports the adapter module DIRECTLY (not the barrel) to stay
 * disjoint from the parallel adapter swarm.
 */
import { describe, test, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  copilotCliAdapter,
  copilotHash,
  parseCopilotEvents,
  editedTurnIndices,
} from "../src/copilot-cli-adapter.js";
import {
  analyzeSession,
  identityLadder,
  makeIdentityContext,
  type AdapterRecord,
} from "../src/source-adapter.js";

/** Serialize turn-record rows back to the `events.jsonl` line shape the parser reads. */
function jsonl(rows: Array<Record<string, unknown>>): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

/** A real-shaped Copilot-CLI turn event: one row carries BOTH sides + the per-turn `turn_index`. */
function turnRow(turn_index: number, user: string, assistant: string): Record<string, unknown> {
  return { turn_index, user_message: user, assistant_response: assistant, timestamp: "2026-06-24T17:33:52Z" };
}

/** Compute the content-hash keys the adapter WOULD emit for these records — via identityLadder (no hand-typed NS). */
function keysOf(records: readonly AdapterRecord[], sessionId: string): string[] {
  const ctx = makeIdentityContext(sessionId, copilotHash);
  return records.map((r) => identityLadder(r, ctx).key);
}

describe("parseCopilotEvents", () => {
  test("parses per-turn rows, folds each turn_index to its LATEST content, ascending order", () => {
    const content = jsonl([
      turnRow(0, "u0", "a0"),
      turnRow(1, "u1", "a1"),
      turnRow(2, "u2", "a2"),
      turnRow(1, "u1", "a1-EDITED"), // re-emit turn 1 (UPSERT) — the latest wins
    ]);
    const recs = parseCopilotEvents(content, "S");
    expect(recs).toHaveLength(3); // three live turns, the superseded turn-1 emission folded out
    expect(recs.map((r) => r.text)).toEqual(["u0\na0", "u1\na1-EDITED", "u2\na2"]);
    // content-hash rung: no native uuid, no session-index ordinal
    expect(recs.every((r) => r.uuid === null && r.nativeSeq == null)).toBe(true);
    expect(recs.every((r) => r.role === "turn" && r.sessionId === "S")).toBe(true);
  });

  test("skips rows with no turn_index and empty-text turns", () => {
    const content = jsonl([
      { note: "no turn_index here" },
      turnRow(0, "hello", "hi"),
      { turn_index: 1, user_message: "", assistant_response: "" }, // no text ⇒ skipped
    ]);
    const recs = parseCopilotEvents(content, "S");
    expect(recs.map((r) => r.text)).toEqual(["hello\nhi"]);
  });

  test("an identical re-emit (idempotent UPSERT) stays a single live turn", () => {
    const content = jsonl([turnRow(0, "u0", "a0"), turnRow(0, "u0", "a0")]);
    expect(parseCopilotEvents(content, "S")).toHaveLength(1);
  });
});

describe("editedTurnIndices — the EDIT / new-content signal", () => {
  test("a re-emitted turn_index with NEW content flags as an edit", () => {
    const content = jsonl([
      turnRow(0, "u0", "a0"),
      turnRow(1, "u1", "a1"),
      turnRow(1, "u1", "a1-regenerated"), // same index, new content ⇒ EDIT
    ]);
    expect(editedTurnIndices(content)).toEqual([1]);
  });

  test("an identical re-emit is NOT an edit", () => {
    const content = jsonl([turnRow(0, "u0", "a0"), turnRow(0, "u0", "a0")]);
    expect(editedTurnIndices(content)).toEqual([]);
  });
});

describe("adapter contract", () => {
  test("name + appendOnly (Copilot-CLI orphans, never deletes)", () => {
    expect(copilotCliAdapter.name).toBe("copilot-cli");
    expect(copilotCliAdapter.appendOnly).toBe(true);
  });

  test("normalizeIdentity rides the content-hash rung (turn_index is per-turn, never the ordinal)", () => {
    const ctx = makeIdentityContext("S", copilotHash);
    const rec: AdapterRecord = { uuid: null, parentUuid: null, role: "turn", text: "u0\na0", isSidechain: false, sessionId: "S", index: 0 };
    expect(copilotCliAdapter.normalizeIdentity(rec, ctx).rung).toBe("content-hash");
  });

  test("currentBranch is the linear live-turn chain, keyed via identityLadder", () => {
    const recs = parseCopilotEvents(jsonl([turnRow(0, "u0", "a0"), turnRow(1, "u1", "a1")]), "S");
    expect(copilotCliAdapter.currentBranch(recs)).toEqual(keysOf(recs, "S"));
  });

  test("perAppSignal carries no new sibling (no out-of-file fork)", () => {
    const recs = parseCopilotEvents(jsonl([turnRow(0, "u0", "a0"), turnRow(1, "u1", "a1v2"), turnRow(1, "u1", "a1")]), "S");
    expect(copilotCliAdapter.perAppSignal(recs, []).hasNewSibling).toBe(false);
  });
});

describe("the in-log EDIT — appendOnly gates the emit to reharvest", () => {
  // Turns 0,1,2 harvested; then turn 1 regenerated + turn 2 re-authored. The superseded old contents
  // leave the live set ⇒ they read gone ⇒ appendOnly ⇒ reharvest (the orphan is preserved, re-harvestable).
  const before = parseCopilotEvents(jsonl([turnRow(0, "u0", "a0"), turnRow(1, "u1", "a1"), turnRow(2, "u2", "a2")]), "S");
  const afterContent = jsonl([
    turnRow(0, "u0", "a0"),
    turnRow(1, "u1", "a1"),
    turnRow(2, "u2", "a2"),
    turnRow(1, "u1", "a1-regenerated"),
    turnRow(2, "u2-redone", "a2-redone"),
  ]);

  test("the raw log flags turns 1 and 2 as edited", () => {
    expect(editedTurnIndices(afterContent)).toEqual([1, 2]);
  });

  test("analyzeSession reharvests the superseded contents, keeping the new turns live", () => {
    const prior = keysOf(before, "S");
    const after = parseCopilotEvents(afterContent, "S");
    expect(after.map((r) => r.text)).toEqual(["u0\na0", "u1\na1-regenerated", "u2-redone\na2-redone"]);
    const finding = analyzeSession(copilotCliAdapter, { records: after, prior });
    expect(finding?.emit).toBe("reharvest"); // appendOnly gate
    // the two superseded (old) turn contents are the gone keys; the shared turn-0 key stays live
    expect(finding?.goneKeys.sort()).toEqual(keysOf(before, "S").slice(1).sort());
    expect(finding?.kind).toBe("TAIL_TRUNCATE");
  });
});

describe("a DELETE (turn present-then-absent) — reharvest via the appendOnly gate", () => {
  test("a dropped tail turn reads gone and reharvests", () => {
    const before = parseCopilotEvents(jsonl([turnRow(0, "u0", "a0"), turnRow(1, "u1", "a1"), turnRow(2, "u2", "a2")]), "S");
    const after = parseCopilotEvents(jsonl([turnRow(0, "u0", "a0"), turnRow(1, "u1", "a1")]), "S");
    const finding = analyzeSession(copilotCliAdapter, { records: after, prior: keysOf(before, "S") });
    expect(finding?.kind).toBe("TAIL_TRUNCATE");
    expect(finding?.emit).toBe("reharvest");
    expect(finding?.goneKeys).toEqual([keysOf(before, "S")[2]]);
  });

  test("no rewind ⇒ no finding", () => {
    const recs = parseCopilotEvents(jsonl([turnRow(0, "u0", "a0"), turnRow(1, "u1", "a1")]), "S");
    expect(analyzeSession(copilotCliAdapter, { records: recs, prior: keysOf(recs, "S") })).toBeNull();
  });
});

// ── Real-bytes grounding (guarded — no-op when the box carries no Copilot-CLI session) ──────────────
describe("real ~/.copilot bytes", () => {
  test("any present events.jsonl parses without throwing, onto the content-hash rung", () => {
    const stateDir = join(homedir(), ".copilot", "session-state");
    if (!existsSync(stateDir)) { expect(true).toBe(true); return; }
    let sawAny = false;
    for (const dir of readdirSync(stateDir)) {
      const file = join(stateDir, dir, "events.jsonl");
      if (!existsSync(file)) continue;
      sawAny = true;
      const recs = parseCopilotEvents(readFileSync(file, "utf8"), dir);
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.every((r) => r.uuid === null && r.nativeSeq == null)).toBe(true);
    }
    // On this box the session persisted only metadata (no events.jsonl); the guard keeps the suite green.
    expect(sawAny || true).toBe(true);
  });
});
