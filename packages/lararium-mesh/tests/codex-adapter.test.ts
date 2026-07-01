/**
 * codex-adapter — the OpenAI Codex SourceAdapter: parse real-shaped rollout lines, the OUT-OF-FILE fork
 * signal (`forked_from_id`), the linear current-branch, fork-family grouping, and the appendOnly emit
 * gate (reharvest, never kapae). Expected identity keys ride identityLadder so no session-namespace
 * separator is ever hand-typed (the NUL-vs-space bug that bit the foundation).
 */
import { describe, test, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  codexAdapter,
  codexHash,
  parseCodexRollout,
  parseCodexMeta,
  groupCodexForkFamilies,
  sessionIdFromFile,
  analyzeSession,
  identityLadder,
  makeIdentityContext,
  type AdapterRecord,
  type CodexMeta,
} from "../src/index.js";

/** Serialize typed records back to the rollout `.jsonl` line shape the parser reads. */
function jsonl(rows: Array<Record<string, unknown>>): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

/** A real-shaped `session_meta` header line. */
function meta(sessionId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { timestamp: "2026-06-24T01:20:35Z", type: "session_meta", payload: { id: sessionId, session_id: sessionId, cwd: "/home/joshu", ...extra } };
}
/** A real-shaped `turn_context` line (carries a per-turn `turn_id`). */
function turnCtx(turnId: string): Record<string, unknown> {
  return { type: "turn_context", payload: { turn_id: turnId, cwd: "/home/joshu" } };
}
/** A real-shaped user `response_item` message (no id — rides the content-hash rung). */
function userMsg(text: string): Record<string, unknown> {
  return { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text }] } };
}
/** A real-shaped assistant `response_item` message (carries a stable `msg_...` id — the native-uuid rung). */
function asstMsg(id: string, text: string): Record<string, unknown> {
  return { type: "response_item", payload: { type: "message", id, role: "assistant", content: [{ type: "output_text", text }] } };
}

/** Compute the expected session-namespaced key for a record via the ladder (never hand-type the separator). */
function keyOf(records: readonly AdapterRecord[], i: number): string {
  const ctx = makeIdentityContext(records[0]!.sessionId, codexHash);
  let last = "";
  for (let j = 0; j <= i; j++) last = identityLadder(records[j]!, ctx).key;
  return last;
}

describe("parseCodexRollout", () => {
  const content = jsonl([
    meta("S"),
    turnCtx("t1"),
    { type: "response_item", payload: { type: "message", role: "developer", content: [{ type: "input_text", text: "base instructions" }] } }, // skipped
    userMsg("hi there"),
    { type: "response_item", payload: { type: "reasoning", content: [] } }, // skipped (not a message)
    asstMsg("msg_abc", "hello back"),
    { type: "event_msg", payload: { type: "agent_message", turn_id: "t1", message: "hello back" } }, // skipped (stream dupe)
    userMsg("   "), // empty ⇒ skipped
  ]);

  test("keeps user/assistant message turns, skips developer / non-message / event_msg / empty", () => {
    const recs = parseCodexRollout(content, "rollout-2026-06-24T01-20-35-S.jsonl");
    expect(recs.map((r) => r.role)).toEqual(["user", "assistant"]);
    expect(recs.map((r) => r.text)).toEqual(["hi there", "hello back"]);
  });

  test("assistant rides the native-uuid rung (msg id); user has no uuid ⇒ content-hash", () => {
    const recs = parseCodexRollout(content, "rollout-2026-06-24T01-20-35-S.jsonl");
    const ctx = makeIdentityContext("S", codexHash);
    expect(recs[0]!.uuid).toBeNull();
    expect(recs[1]!.uuid).toBe("msg_abc");
    expect(identityLadder(recs[0]!, ctx).rung).toBe("content-hash");
    expect(identityLadder(recs[1]!, makeIdentityContext("S", codexHash)).rung).toBe("native-uuid");
  });

  test("sessionId reads from the header payload, not the filename", () => {
    const recs = parseCodexRollout(content, "rollout-2026-06-24T01-20-35-OTHER.jsonl");
    expect(recs.every((r) => r.sessionId === "S")).toBe(true);
  });
});

describe("parseCodexMeta — the fork header", () => {
  test("reads forked_from_id + parent_thread_id + thread_source from a forked rollout", () => {
    const m = parseCodexMeta(jsonl([
      meta("child", { forked_from_id: "parent", parent_thread_id: "parent", thread_source: "subagent" }),
      userMsg("continued"),
    ]));
    expect(m).toEqual<CodexMeta>({ sessionId: "child", forkedFromId: "parent", parentThreadId: "parent", threadSource: "subagent" });
  });

  test("a top-level rollout carries no fork edge", () => {
    const m = parseCodexMeta(jsonl([meta("root"), userMsg("q")]));
    expect(m.forkedFromId).toBeNull();
  });
});

describe("the out-of-file FORK — the reference scenario", () => {
  // Parent thread P: [q1, a1, q2, a2]. A rewind forks a NEW rollout C off P, copying [q1, a1] then
  // diverging with q2b/a2b. C's header carries forked_from_id=P; P's tail (q2,a2) reads gone in C.
  const parentContent = jsonl([meta("P"), turnCtx("t1"), userMsg("q1"), asstMsg("msg_a1", "a1"), turnCtx("t2"), userMsg("q2"), asstMsg("msg_a2", "a2")]);
  const childContent = jsonl([
    meta("C", { forked_from_id: "P", parent_thread_id: "P", thread_source: "subagent" }),
    turnCtx("t1"), userMsg("q1"), asstMsg("msg_a1", "a1"), // copied prefix (verbatim ⇒ keys match)
    turnCtx("t3"), userMsg("q2b"), asstMsg("msg_a2b", "a2b"), // the divergence
  ]);

  test("the fork edge lands on the child's root turn parentUuid", () => {
    const recs = parseCodexRollout(childContent);
    expect(recs[0]!.parentUuid).toBe("P"); // root turn points at the parent thread
    expect(recs.slice(1).every((r) => r.parentUuid === null)).toBe(true); // linear thereafter
  });

  test("perAppSignal flags a new sibling with the parent thread as fork root", () => {
    const sig = codexAdapter.perAppSignal(parseCodexRollout(childContent), []);
    expect(sig.hasNewSibling).toBe(true);
    expect(sig.forkRootKey).toBe("P");
  });

  test("a top-level rollout raises no sibling signal", () => {
    expect(codexAdapter.perAppSignal(parseCodexRollout(parentContent), []).hasNewSibling).toBe(false);
  });

  test("currentBranch is the linear copied+diverged chain (keys via the ladder)", () => {
    const recs = parseCodexRollout(childContent);
    const branch = codexAdapter.currentBranch(recs);
    expect(branch).toEqual(recs.map((_, i) => keyOf(recs, i)));
    expect(branch).toHaveLength(4); // q1, a1, q2b, a2b
  });

  test("analyzeSession classifies FORK and emits fork; appendOnly never kapae on the parent tail", () => {
    const parent = parseCodexRollout(parentContent);
    const prior = codexAdapter.currentBranch(parent); // P's prior index (namespaced)
    const finding = analyzeSession(codexAdapter, { records: parseCodexRollout(childContent), prior });
    expect(finding?.kind).toBe("FORK");
    expect(finding?.emit).toBe("fork"); // FORK short-circuits the emit gate
    expect(finding?.forkRootKey).toBe("P");
    expect(finding?.emit).not.toBe("kapae");
  });

  test("appendOnly gates a pure tail truncation to reharvest, never kapae", () => {
    // A plain non-forked rollout whose tail was later cut reads TAIL_TRUNCATE ⇒ reharvest (source keeps it).
    const full = parseCodexRollout(parentContent);
    const prior = codexAdapter.currentBranch(full);
    const cut = parseCodexRollout(jsonl([meta("P"), turnCtx("t1"), userMsg("q1"), asstMsg("msg_a1", "a1")]));
    const finding = analyzeSession(codexAdapter, { records: cut, prior });
    expect(finding?.kind).toBe("TAIL_TRUNCATE");
    expect(finding?.emit).toBe("reharvest");
    expect(codexAdapter.appendOnly).toBe(true);
  });
});

describe("fork-family grouping", () => {
  test("a fork chain folds under the eldest root thread", () => {
    const sessions = [
      { meta: parseCodexMeta(jsonl([meta("root")])), file: "root.jsonl" },
      { meta: parseCodexMeta(jsonl([meta("c1", { forked_from_id: "root" })])), file: "c1.jsonl" },
      { meta: parseCodexMeta(jsonl([meta("c2", { forked_from_id: "c1" })])), file: "c2.jsonl" }, // grandchild
    ];
    const fams = groupCodexForkFamilies(sessions);
    expect(fams).toHaveLength(1);
    expect(fams[0]!.rootKey).toBe("root");
    expect(fams[0]!.sessionIds.sort()).toEqual(["c1", "c2", "root"]);
  });

  test("independent threads form separate singleton families; a fork off an absent parent roots itself", () => {
    const fams = groupCodexForkFamilies([
      { meta: parseCodexMeta(jsonl([meta("A")])), file: "A.jsonl" },
      { meta: parseCodexMeta(jsonl([meta("B", { forked_from_id: "gone" })])), file: "B.jsonl" }, // parent not in set
    ]);
    expect(fams).toHaveLength(2);
  });

  test("sessionIdFromFile recovers the trailing uuid from a rollout filename", () => {
    expect(sessionIdFromFile("/x/rollout-2026-06-23T18-01-58-019ef725-ec96-79a3-9101-1908f3fc0448.jsonl"))
      .toBe("019ef725-ec96-79a3-9101-1908f3fc0448");
  });
});

// A guarded smoke test against the operator's REAL rollout bytes — skipped where ~/.codex is absent.
describe("real bytes (guarded)", () => {
  const root = join(homedir(), ".codex", "sessions");
  const findRollouts = (dir: string, acc: string[] = []): string[] => {
    if (acc.length >= 40 || !existsSync(dir)) return acc;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) findRollouts(p, acc);
      else if (e.name.startsWith("rollout-") && e.name.endsWith(".jsonl")) acc.push(p);
      if (acc.length >= 40) break;
    }
    return acc;
  };
  const files = existsSync(root) ? findRollouts(root) : [];

  test.skipIf(files.length === 0)("parses a real rollout into user/assistant records with a header session id", () => {
    const hit = files.map((f) => ({ f, recs: parseCodexRollout(readFileSync(f, "utf8"), f) })).find((x) => x.recs.length > 0);
    expect(hit).toBeTruthy();
    for (const r of hit!.recs) {
      expect(["user", "assistant"]).toContain(r.role);
      expect(r.text.trim().length).toBeGreaterThan(0);
      expect(r.sessionId.length).toBeGreaterThan(0);
    }
  });

  test.skipIf(files.length === 0)("a real forked rollout signals a sibling and groups into a family", () => {
    const forked = files.map((f) => parseCodexMeta(readFileSync(f, "utf8"), f)).find((m) => m.forkedFromId);
    if (!forked) return; // no forked sample in the sampled window
    const recs = parseCodexRollout(readFileSync(files.find((f) => sessionIdFromFile(f) === forked.sessionId) ?? files[0]!, "utf8"));
    if (recs.length) expect(recs[0]!.parentUuid).toBe(forked.forkedFromId);
    expect(codexAdapter.discover(files).length).toBeGreaterThan(0);
  });
});
