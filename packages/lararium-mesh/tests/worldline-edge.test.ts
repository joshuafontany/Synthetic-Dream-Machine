/**
 * worldline-edge — the pure prov-triple builders (spawn → Delegation, inject → Communication,
 * handback → close). Descriptors only; the node seam (lararium-mempalace/worldline-kg) writes them.
 */
import { describe, test, expect } from "vitest";
import {
  delegationEdge,
  communicationEdge,
  handbackClose,
  PRED_DELEGATION,
  PRED_COMMUNICATION,
} from "../src/index.js";

describe("delegationEdge — the SPAWN prov:Delegation triple (parent → child)", () => {
  test("carries handles, predicate, valid_from, turnKey", () => {
    const e = delegationEdge("run", "run.child", { validFrom: "2026-06-29T00:00:00Z", turnKey: "t1" });
    expect(e).toEqual({
      subject: "run",
      predicate: PRED_DELEGATION,
      object: "run.child",
      valid_from: "2026-06-29T00:00:00Z",
      turnKey: "t1",
    });
  });

  test("omits optional fields when absent (no fabricated timestamp)", () => {
    const e = delegationEdge("run", "run.child");
    expect(e).toEqual({ subject: "run", predicate: PRED_DELEGATION, object: "run.child" });
    expect("valid_from" in e).toBe(false);
  });

  test("rejects empty handles", () => {
    expect(() => delegationEdge("", "x")).toThrow();
    expect(() => delegationEdge("x", "")).toThrow();
  });
});

describe("communicationEdge — the INJECT prov:Communication triple (injector → target)", () => {
  test("the rhizome leg carries its own predicate", () => {
    const e = communicationEdge("operator", "run.grandchild", { validFrom: "2026-06-29T01:00:00Z", turnKey: "t2" });
    expect(e.predicate).toBe(PRED_COMMUNICATION);
    expect(e.subject).toBe("operator");
    expect(e.object).toBe("run.grandchild");
    expect(e.turnKey).toBe("t2");
  });
});

describe("handbackClose — the twin-reunion interval close (the spawn edge)", () => {
  test("closes the SAME parent→child Delegation edge, optional ended", () => {
    const c = handbackClose("run", "run.child", "2026-06-29T02:00:00Z");
    expect(c).toEqual({ subject: "run", predicate: PRED_DELEGATION, object: "run.child", ended: "2026-06-29T02:00:00Z" });
  });

  test("ended omitted ⇒ the KG defaults it (today); not fabricated here", () => {
    const c = handbackClose("run", "run.child");
    expect("ended" in c).toBe(false);
  });
});
