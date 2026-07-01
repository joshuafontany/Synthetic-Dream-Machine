/**
 * source-adapter — the shared spine of the multi-app rewind-hardening: the 4-rung identity ladder, the
 * classify-by-shape, and the appendOnly emit gate.
 */
import { describe, test, expect } from "vitest";
import {
  identityLadder,
  makeIdentityContext,
  classifyByShape,
  emitFor,
  diffGone,
  reconcileFinding,
  type AdapterRecord,
} from "../src/index.js";

const N = String.fromCharCode(0); // the session-namespace separator (matches source-adapter NS)
const k = (session: string, id: string) => `${session}${N}${id}`;

const hash = (s: string) => "h" + s.length.toString(36) + (s.charCodeAt(0) || 0).toString(36);

function rec(p: Partial<AdapterRecord>): AdapterRecord {
  return {
    uuid: null, parentUuid: null, role: "user", text: "", isSidechain: false,
    sessionId: "S", index: 0, ...p,
  };
}

describe("identityLadder — the 4 rungs, session-namespaced, parent-linked", () => {
  test("rung 1: a native uuid is used verbatim", () => {
    const ctx = makeIdentityContext("S", hash);
    const id = identityLadder(rec({ uuid: "u1", parentUuid: "u0" }), ctx);
    expect(id.rung).toBe("native-uuid");
    expect(id.key).toBe(k("S", "u1"));
    expect(id.parentKey).toBe(k("S", "u0"));
  });

  test("rung 2: no uuid but a native monotonic seq ⇒ session-index", () => {
    const ctx = makeIdentityContext("S", hash);
    const id = identityLadder(rec({ nativeSeq: 7 }), ctx);
    expect(id.rung).toBe("session-index");
    expect(id.key).toBe(k("S", "#7"));
  });

  test("rung 3: uuid absent ⇒ content-hash + occurrence OFFSET (identical turns disambiguate)", () => {
    const ctx = makeIdentityContext("S", hash);
    const a = identityLadder(rec({ role: "user", text: "hello" }), ctx);
    const b = identityLadder(rec({ role: "user", text: "hello" }), ctx); // same content, later occurrence
    expect(a.rung).toBe("content-hash");
    expect(a.key.endsWith("#0")).toBe(true);
    expect(b.key.endsWith("#1")).toBe(true);
    expect(a.key).not.toBe(b.key);
  });

  test("rung 4: no uuid, no seq, empty text ⇒ positional", () => {
    const ctx = makeIdentityContext("S", hash);
    const id = identityLadder(rec({ text: "   ", index: 4 }), ctx);
    expect(id.rung).toBe("positional");
    expect(id.key).toBe(k("S", "@4"));
  });
});

describe("classifyByShape — the four rewind shapes", () => {
  const none = { hasNewSibling: false } as const;

  test("nothing gone ⇒ null (no rewind)", () => {
    expect(classifyByShape({ prior: ["a", "b"], currentBranch: ["a", "b", "c"], signal: none })).toBeNull();
  });

  test("all prior gone ⇒ DELETE", () => {
    const r = classifyByShape({ prior: ["a", "b"], currentBranch: ["x"], signal: none });
    expect(r?.kind).toBe("DELETE");
  });

  test("a contiguous suffix gone ⇒ TAIL_TRUNCATE", () => {
    const r = classifyByShape({ prior: ["a", "b", "c", "d"], currentBranch: ["a", "b"], signal: none });
    expect(r?.kind).toBe("TAIL_TRUNCATE");
    expect(r?.goneKeys).toEqual(["c", "d"]);
  });

  test("an interior hole gone ⇒ INTERIOR_DELETE", () => {
    const r = classifyByShape({ prior: ["a", "b", "c", "d"], currentBranch: ["a", "d"], signal: none });
    expect(r?.kind).toBe("INTERIOR_DELETE");
  });

  test("a new sibling signal ⇒ FORK (overrides tail/interior shape)", () => {
    const r = classifyByShape({ prior: ["a", "b", "c"], currentBranch: ["a", "b2"], signal: { hasNewSibling: true } });
    expect(r?.kind).toBe("FORK");
  });
});

describe("emitFor — appendOnly gates kapae vs reharvest", () => {
  test("FORK always emits fork", () => {
    expect(emitFor("FORK", true)).toBe("fork");
    expect(emitFor("FORK", false)).toBe("fork");
  });
  test("append-only truncate/delete ⇒ reharvest (the source keeps the orphan)", () => {
    expect(emitFor("TAIL_TRUNCATE", true)).toBe("reharvest");
    expect(emitFor("DELETE", true)).toBe("reharvest");
  });
  test("mutable truncate/delete ⇒ kapae (we are the last keeper)", () => {
    expect(emitFor("TAIL_TRUNCATE", false)).toBe("kapae");
    expect(emitFor("INTERIOR_DELETE", false)).toBe("kapae");
  });
});

describe("diffGone + reconcileFinding", () => {
  test("diffGone = prior minus the live branch, order = prior, deduped", () => {
    expect(diffGone(["a", "a", "b", "c"], ["a"])).toEqual(["b", "c"]);
  });
  test("reconcileFinding assembles kind + emit + goneKeys + forkRootKey", () => {
    const f = reconcileFinding({ kind: "FORK", goneKeys: ["x"] }, true, { hasNewSibling: true, forkRootKey: k("S", "p") });
    expect(f).toEqual({ kind: "FORK", emit: "fork", goneKeys: ["x"], forkRootKey: k("S", "p") });
  });
  test("reconcileFinding on null ⇒ null", () => {
    expect(reconcileFinding(null, true, { hasNewSibling: false })).toBeNull();
  });
});
