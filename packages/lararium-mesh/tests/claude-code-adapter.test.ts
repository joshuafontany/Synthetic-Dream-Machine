/**
 * claude-code-adapter — the reference SourceAdapter: parse, current-branch reconstruction, the FORK
 * per-app signal (in-file /rewind that authored a new branch), and the appendOnly emit gate.
 */
import { describe, test, expect } from "vitest";
import {
  claudeCodeAdapter,
  parseClaudeJsonl,
  groupForkFamilies,
  rootUuidOf,
  analyzeSession,
  makeIdentityContext,
  identityLadder,
  claudeHash,
  type AdapterRecord,
} from "../src/index.js";

const N = String.fromCharCode(0); // the session-namespace separator (matches source-adapter NS)
const k = (session: string, id: string) => `${session}${N}${id}`;

/** Serialize records back to the `.jsonl` line shape the parser reads. */
function jsonl(rows: Array<Record<string, unknown>>): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

/** A fully-specified AdapterRecord for the branch tests. */
function ar(uuid: string, parentUuid: string | null, role: string, index: number): AdapterRecord {
  return { uuid, parentUuid, role, text: `t${index}`, isSidechain: false, sessionId: "S", index };
}

describe("parseClaudeJsonl", () => {
  test("parses user/assistant turns with uuid + parentUuid, skips meta + empty", () => {
    const content = jsonl([
      { type: "summary", summary: "x" },
      { type: "user", uuid: "u1", parentUuid: null, sessionId: "S", message: { content: "hi" } },
      { type: "assistant", uuid: "a1", parentUuid: "u1", sessionId: "S", message: { content: [{ type: "text", text: "yo" }] } },
      { type: "assistant", uuid: "a2", parentUuid: "a1", sessionId: "S", message: { content: [{ type: "tool_use" }] } }, // no text ⇒ skipped
    ]);
    const recs = parseClaudeJsonl(content, "S.jsonl");
    expect(recs.map((r) => r.uuid)).toEqual(["u1", "a1"]);
    expect(recs[0]!.role).toBe("user");
    expect(recs[1]!.parentUuid).toBe("u1");
  });

  test("agent-<id>.jsonl records read as sidechains", () => {
    const content = jsonl([{ type: "assistant", uuid: "s1", parentUuid: null, sessionId: "S", message: { content: "w" } }]);
    const recs = parseClaudeJsonl(content, "agent-42.jsonl");
    expect(recs[0]!.isSidechain).toBe(true);
  });
});

describe("adapter contract", () => {
  test("appendOnly is true (Claude orphans, never deletes)", () => {
    expect(claudeCodeAdapter.appendOnly).toBe(true);
  });

  test("the shared identityLadder rides the uuid rung (the ladder the core applies)", () => {
    const ctx = makeIdentityContext("S", claudeHash);
    const rec = ar("u1", null, "user", 0);
    expect(identityLadder(rec, ctx)).toMatchObject({ rung: "native-uuid", key: k("S", "u1") });
  });

  test("currentBranch returns session-namespaced leaf-chain keys", () => {
    // R→A→B is the old tail; D re-parents off A and becomes the live leaf. B orphaned.
    const recs = [ar("R", null, "user", 0), ar("A", "R", "assistant", 1), ar("B", "A", "user", 2), ar("D", "A", "user", 3)];
    expect(claudeCodeAdapter.currentBranch(recs)).toEqual([k("S", "R"), k("S", "A"), k("S", "D")]);
  });
});

describe("the in-file /rewind FORK — the reference scenario", () => {
  // R(user)→A(assistant)→U(user)→B(assistant) is the old branch. /rewind re-issues U as U2 off A, then
  // B2 continues. U + B orphan; U2 is the same-type (user) sibling under A ⇒ FORK with new content.
  const recs = [
    ar("R", null, "user", 0),
    ar("A", "R", "assistant", 1),
    ar("U", "A", "user", 2),
    ar("B", "U", "assistant", 3),
    ar("U2", "A", "user", 4),
    ar("B2", "U2", "assistant", 5),
  ];

  test("perAppSignal flags a new sibling with the fork root", () => {
    const sig = claudeCodeAdapter.perAppSignal(recs, []);
    expect(sig.hasNewSibling).toBe(true);
    expect(sig.forkRootKey).toBe(k("S", "A"));
  });

  test("analyzeSession classifies FORK and emits fork (the rewound tail is gone)", () => {
    const prior = [k("S", "R"), k("S", "A"), k("S", "U"), k("S", "B")]; // the prior index (namespaced)
    const finding = analyzeSession(claudeCodeAdapter, { records: recs, prior });
    expect(finding?.kind).toBe("FORK");
    expect(finding?.emit).toBe("fork");
    expect(finding?.goneKeys).toEqual([k("S", "U"), k("S", "B")]);
    expect(finding?.forkRootKey).toBe(k("S", "A"));
  });
});

describe("fork-family grouping", () => {
  test("two sessions sharing a root uuid group under one family", () => {
    const parent = parseClaudeJsonl(jsonl([
      { type: "user", uuid: "root", parentUuid: null, sessionId: "S1", message: { content: "q" } },
      { type: "assistant", uuid: "a", parentUuid: "root", sessionId: "S1", message: { content: "x" } },
    ]), "S1.jsonl");
    const fork = parseClaudeJsonl(jsonl([
      { type: "user", uuid: "root", parentUuid: null, sessionId: "S2", message: { content: "q" } }, // copied history
      { type: "assistant", uuid: "b", parentUuid: "root", sessionId: "S2", message: { content: "y" } },
    ]), "S2.jsonl");
    expect(rootUuidOf(parent)).toBe("root");
    const fams = groupForkFamilies([
      { sessionId: "S1", file: "S1.jsonl", records: parent },
      { sessionId: "S2", file: "S2.jsonl", records: fork },
    ]);
    expect(fams).toHaveLength(1);
    expect(fams[0]!.rootKey).toBe("root");
    expect(fams[0]!.sessionIds.sort()).toEqual(["S1", "S2"]);
  });

  test("independent roots form separate singleton families", () => {
    const s1 = parseClaudeJsonl(jsonl([{ type: "user", uuid: "r1", parentUuid: null, sessionId: "A", message: { content: "q" } }]), "A.jsonl");
    const s2 = parseClaudeJsonl(jsonl([{ type: "user", uuid: "r2", parentUuid: null, sessionId: "B", message: { content: "q" } }]), "B.jsonl");
    const fams = groupForkFamilies([
      { sessionId: "A", file: "A.jsonl", records: s1 },
      { sessionId: "B", file: "B.jsonl", records: s2 },
    ]);
    expect(fams).toHaveLength(2);
  });
});
