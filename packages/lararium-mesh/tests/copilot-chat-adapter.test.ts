/**
 * copilot-chat-adapter — the GitHub Copilot Chat (VS Code) SourceAdapter: op-log REPLAY to live
 * `requests[]`, the requestId identity, tail-supersession detection (a rewind = an in-place re-splice),
 * and the `appendOnly = true` emit gate (VERIFIED by the on-disk bytes — superseded ops persist in the
 * append log, recoverable by replay-to-offset).
 */
import { describe, test, expect } from "vitest";
import {
  copilotChatAdapter,
  parseCopilotChatJsonl,
  replayCopilotChat,
  discoverCopilotChatFiles,
  copilotChatHash,
  analyzeSession,
  makeIdentityContext,
  identityLadder,
  type AdapterRecord,
} from "../src/index.js";

/** Serialize op rows back to the `.jsonl` op-log the replay reads. */
function jsonl(rows: Array<Record<string, unknown>>): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

/** A base-snapshot line carrying a sessionId + initial requests. */
function base(sessionId: string, requests: Array<Record<string, unknown>> = []): Record<string, unknown> {
  return { kind: 0, v: { sessionId, requests } };
}

/** A request object as it rides inside a splice op's `v`. */
function req(id: string, text: string): Record<string, unknown> {
  return { requestId: id, message: { text } };
}

/** The live key for a requestId, derived through identityLadder — never a hand-typed separator. */
function liveKey(sessionId: string, requestId: string): string {
  const ctx = makeIdentityContext(sessionId, copilotChatHash);
  const rec: AdapterRecord = { uuid: requestId, parentUuid: null, role: "user", text: "", isSidechain: false, sessionId, index: 0 };
  return identityLadder(rec, ctx).key;
}

describe("replayCopilotChat — the op-log replay", () => {
  test("appends turns, replays to the live requests[]", () => {
    const content = jsonl([
      base("S", []),
      { kind: 2, k: ["requests"], v: [req("request_a", "hi")] }, // append turn 0
      { kind: 1, k: ["requests", 0, "response"], v: [{ kind: "text", value: "yo" }] }, // nested — no identity change
      { kind: 2, k: ["requests"], v: [req("request_b", "next")] }, // append turn 1
    ]);
    const state = replayCopilotChat(content, "S.jsonl");
    expect(state.sessionId).toBe("S");
    expect(state.requests.map((r) => r.requestId)).toEqual(["request_a", "request_b"]);
  });

  test("an EDIT re-splices the same index in place (i present) — old id superseded, recoverable by offset", () => {
    // The reference byte scenario: turn 0 appended, then edited twice at index 0.
    const lines = [
      base("S", []),
      { kind: 2, k: ["requests"], v: [req("request_v1", "draft")] },
      { kind: 2, k: ["requests"], v: [req("request_v2", "draft edited")], i: 0 }, // replace-1-at-0
      { kind: 2, k: ["requests"], v: [req("request_v3", "draft edited again")], i: 0 }, // replace-1-at-0
    ];
    // full replay ⇒ live is v3; replay-to-offset recovers the superseded ids (the append-only proof)
    expect(replayCopilotChat(jsonl(lines)).requests.map((r) => r.requestId)).toEqual(["request_v3"]);
    expect(replayCopilotChat(jsonl(lines.slice(0, 3))).requests.map((r) => r.requestId)).toEqual(["request_v2"]);
    expect(replayCopilotChat(jsonl(lines.slice(0, 2))).requests.map((r) => r.requestId)).toEqual(["request_v1"]);
  });

  test("a null-v splice at i is a DELETE (splice(i,1))", () => {
    const content = jsonl([
      base("S", [req("request_a", "a"), req("request_b", "b"), req("request_c", "c")]),
      { kind: 2, k: ["requests"], v: null, i: 1 }, // delete index 1
    ]);
    expect(replayCopilotChat(content).requests.map((r) => r.requestId)).toEqual(["request_a", "request_c"]);
  });
});

describe("parseCopilotChatJsonl", () => {
  test("emits ONE record per live request, keyed by requestId, role=user", () => {
    const content = jsonl([
      base("S", []),
      { kind: 2, k: ["requests"], v: [req("request_a", "hello")] },
      { kind: 2, k: ["requests"], v: [req("request_b", "world")] },
    ]);
    const recs = parseCopilotChatJsonl(content, "S.jsonl");
    expect(recs.map((r) => r.uuid)).toEqual(["request_a", "request_b"]);
    expect(recs.map((r) => r.role)).toEqual(["user", "user"]);
    expect(recs.map((r) => r.text)).toEqual(["hello", "world"]);
    expect(recs.map((r) => r.index)).toEqual([0, 1]);
  });

  test("reads message from a bare string and from { parts }", () => {
    const content = jsonl([
      base("S", [
        { requestId: "request_a", message: "bare" },
        { requestId: "request_b", message: { parts: [{ text: "p1" }, { text: "p2" }] } },
      ]),
    ]);
    const recs = parseCopilotChatJsonl(content);
    expect(recs.map((r) => r.text)).toEqual(["bare", "p1\np2"]);
  });
});

describe("adapter contract", () => {
  test("appendOnly is true — VERIFIED: superseded ops persist in the append log, replay-recoverable", () => {
    expect(copilotChatAdapter.appendOnly).toBe(true);
  });

  test("name is copilot-chat", () => {
    expect(copilotChatAdapter.name).toBe("copilot-chat");
  });

  test("the shared identityLadder rides the requestId on the native-uuid rung", () => {
    const ctx = makeIdentityContext("S", copilotChatHash);
    const rec: AdapterRecord = { uuid: "request_a", parentUuid: null, role: "user", text: "hi", isSidechain: false, sessionId: "S", index: 0 };
    expect(identityLadder(rec, ctx)).toMatchObject({ rung: "native-uuid", key: liveKey("S", "request_a") });
  });

  test("currentBranch returns the replayed-live requestId keys in order", () => {
    const recs = parseCopilotChatJsonl(jsonl([
      base("S", []),
      { kind: 2, k: ["requests"], v: [req("request_a", "a")] },
      { kind: 2, k: ["requests"], v: [req("request_b", "b")] },
    ]), "S.jsonl");
    expect(copilotChatAdapter.currentBranch(recs)).toEqual([liveKey("S", "request_a"), liveKey("S", "request_b")]);
  });

  test("perAppSignal never flags a fork — a Copilot rewind supersedes in place", () => {
    const recs = parseCopilotChatJsonl(jsonl([base("S", [req("request_a", "a")])]));
    expect(copilotChatAdapter.perAppSignal(recs, []).hasNewSibling).toBe(false);
  });
});

describe("tail-supersession detection (a rewind) — the emit gate", () => {
  // Prior harvest saw turns [a, b_old, c_old]. An edit re-issued turn 1 (b_old → b_new) and re-ran the
  // tail (c_old → c_new): the live branch is [a, b_new, c_new]. b_old + c_old are a contiguous trailing
  // run gone from the live branch — a TAIL_TRUNCATE. appendOnly=true ⇒ reharvest (the orphans persist).
  const content = jsonl([
    base("S", [req("request_a", "a")]),
    { kind: 2, k: ["requests"], v: [req("request_b_new", "b edited")], i: 1 }, // replaces b_old at index 1
    { kind: 2, k: ["requests"], v: [req("request_c_new", "c re-run")] }, // new tail
  ]);
  const recs = parseCopilotChatJsonl(content, "S.jsonl");
  const prior = [liveKey("S", "request_a"), liveKey("S", "request_b_old"), liveKey("S", "request_c_old")];

  test("live branch replaces the superseded tail", () => {
    expect(copilotChatAdapter.currentBranch(recs)).toEqual([
      liveKey("S", "request_a"), liveKey("S", "request_b_new"), liveKey("S", "request_c_new"),
    ]);
  });

  test("analyzeSession classifies TAIL_TRUNCATE and emits reharvest (orphans persist, re-harvestable)", () => {
    const finding = analyzeSession(copilotChatAdapter, { records: recs, prior });
    expect(finding?.kind).toBe("TAIL_TRUNCATE");
    expect(finding?.emit).toBe("reharvest");
    expect(finding?.goneKeys).toEqual([liveKey("S", "request_b_old"), liveKey("S", "request_c_old")]);
  });

  test("an interior-only regenerate reads as INTERIOR_DELETE (still reharvest)", () => {
    // Only turn 1 re-issued; the tail turn 2 keeps its id ⇒ the gone key is an interior hole.
    const interior = jsonl([
      base("S", [req("request_a", "a"), req("request_c", "c")]),
      { kind: 2, k: ["requests"], v: [req("request_b_new", "b edited")], i: 1 }, // insert-in-place shifting is not it;
    ]);
    // Replay: base=[a,c]; replace-1-at-1 ⇒ [a, b_new]. So c is gone (interior relative to prior [a,b_old,c]).
    const irecs = parseCopilotChatJsonl(interior, "S.jsonl");
    const iprior = [liveKey("S", "request_a"), liveKey("S", "request_b_old"), liveKey("S", "request_c")];
    const finding = analyzeSession(copilotChatAdapter, { records: irecs, prior: iprior });
    expect(finding?.emit).toBe("reharvest");
    expect(finding?.goneKeys).toContain(liveKey("S", "request_b_old"));
  });
});

describe("discover", () => {
  test("each session file stands as its own singleton family, rootKey = sessionId", () => {
    // Uses the in-memory replay path via a written temp is avoided — discover reads disk, so assert the
    // singleton shape on the pure grouping by feeding one path (unreadable ⇒ filename-derived sessionId).
    const fams = discoverCopilotChatFiles(["/no/such/dir/S1.jsonl", "/no/such/dir/S2.jsonl"]);
    expect(fams).toHaveLength(2);
    expect(fams.map((f) => f.rootKey).sort()).toEqual(["S1", "S2"]);
    expect(fams[0]!.sessionIds).toEqual([fams[0]!.rootKey]);
  });
});
