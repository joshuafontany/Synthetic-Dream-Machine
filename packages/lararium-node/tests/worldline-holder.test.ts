/**
 * worldline-holder — the node-side worldline read surface: the LIVE ITC registry (Well 1, compare),
 * the Turn→Trajectory assembler joining the FORM store (Well 3), and the null baseline (Well 4).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#time
 */

import { describe, test, expect } from "vitest";
import { delegationEdge, communicationEdge, handbackClose, sha256HexSync } from "@lararium/mesh";
import { makeWorldlineHolder, verbatimShaOf, type TurnStub } from "../src/worldline-holder.js";
import type { FormPalace, FormEntry } from "../src/formpalace.js";

/** A fake FORM store — returns a per-key axis_activation document (the move-space position). */
function fakeFormPalace(positions: Record<string, Record<string, number>>): FormPalace {
  return {
    async encodeStore() { throw new Error("unused"); },
    async query() { return []; },
    async filter() { return []; },
    async get(key: string): Promise<FormEntry | null> {
      if (!(key in positions)) return null;
      return { key, metadata: {}, document: JSON.stringify({ axis_activation: positions[key], turn_conformance: 1 }) };
    },
    async close() { /* noop */ },
  };
}

describe("Well 1 — ITC LIVE-READ (compare against the held registry)", () => {
  test("ingest spawn + inject edges, then compare two handles → concurrent-capable verdict", () => {
    const h = makeWorldlineHolder();
    h.ingestEdges(
      [
        delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
        delegationEdge("run", "run.b", { validFrom: "2026-06-29T00:00:01Z" }),
        communicationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:02Z" }), // a works
        communicationEdge("run", "run.b", { validFrom: "2026-06-29T00:00:03Z" }), // b works
      ],
      [],
      "run",
    );
    expect(h.compare("run", "run.a")).toBe("before");
    expect(h.compare("run.a", "run.b")).toBe("concurrent");
    expect(h.compare("run.a", "run.a")).toBe("equal");
  });

  test("ingest is idempotent re-derive — re-ingesting the same edges keeps one stable verdict", () => {
    const h = makeWorldlineHolder();
    const opens = [
      delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
      communicationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:02Z" }),
    ];
    h.ingestEdges(opens, [], "run");
    h.ingestEdges(opens, [], "run");
    expect(h.compare("run", "run.a")).toBe("before");
    expect(Object.keys(h.causal().stamps).sort()).toEqual(["run", "run.a"]);
  });

  test("a handback retires the child from the live registry", () => {
    const h = makeWorldlineHolder();
    h.ingestEdges(
      [delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" })],
      [handbackClose("run", "run.a", "2026-06-29T00:00:05Z")],
      "run",
    );
    expect(() => h.compare("run", "run.a")).toThrow();
  });
});

describe("Well 3 — the TRAJECTORY (worldline-ordered form-vector path)", () => {
  const stubs: TurnStub[] = [
    { verbatimSha: "sha-c", tickCounter: 3 },
    { verbatimSha: "sha-a", tickCounter: 1 },
    { verbatimSha: "sha-b", tickCounter: 2 },
  ];

  test("orders by happened-before AND joins each turn's move-space position from the FORM store", async () => {
    const h = makeWorldlineHolder({
      formPalace: fakeFormPalace({
        "sha-a": { wand: 1 },
        "sha-b": { sword: 0.5 },
        "sha-c": { cup: 0.25 },
      }),
    });
    const traj = await h.trajectory("run.x", stubs);
    expect(traj.handle).toBe("run.x");
    expect(traj.steps.map((s) => s.verbatimSha)).toEqual(["sha-a", "sha-b", "sha-c"]); // TIME order
    expect(traj.steps.every((s) => s.formVector && s.formVector.values.length > 0)).toBe(true); // SPACE joined
  });

  test("a FORM miss keeps the turn's TIME slot with a null move-space position (never dropped)", async () => {
    const h = makeWorldlineHolder({ formPalace: fakeFormPalace({ "sha-a": { wand: 1 } }) });
    const traj = await h.trajectory("run.x", stubs);
    expect(traj.steps).toHaveLength(3);
    expect(traj.steps[0]!.formVector).not.toBeNull(); // sha-a present
    expect(traj.steps[1]!.formVector).toBeNull();      // sha-b absent → null slot
  });

  test("joinForm:false → a TIME-only skeleton (no FORM store touched)", async () => {
    const h = makeWorldlineHolder({ formPalace: fakeFormPalace({}) });
    const traj = await h.trajectory("run.x", stubs, { joinForm: false });
    expect(traj.steps.map((s) => s.verbatimSha)).toEqual(["sha-a", "sha-b", "sha-c"]);
    expect(traj.steps.every((s) => s.formVector === undefined)).toBe(true);
  });
});

describe("Well 4 — NULL-READY (the shuffle baseline rides alongside)", () => {
  const stubs: TurnStub[] = Array.from({ length: 6 }, (_, i) => ({ verbatimSha: `s${i}`, tickCounter: i }));

  test("nullBaseline returns the SAME multiset, a scrambled order, marked shuffled + reproducible", async () => {
    const h = makeWorldlineHolder({ formPalace: fakeFormPalace({}) });
    const real = await h.trajectory("h", stubs, { joinForm: false });
    const nul = await h.nullBaseline("h", stubs, { joinForm: false, seed: 5 });
    expect(nul.shuffled).toBe(true);
    expect([...nul.steps.map((s) => s.verbatimSha)].sort()).toEqual([...real.steps.map((s) => s.verbatimSha)].sort());
    const nul2 = await h.nullBaseline("h", stubs, { joinForm: false, seed: 5 });
    expect(nul.steps.map((s) => s.verbatimSha)).toEqual(nul2.steps.map((s) => s.verbatimSha)); // seeded → reproducible
  });
});

describe("verbatimShaOf — the content↔form join key matches capture's hash", () => {
  test("hashes turn text identically to node-capture-engine (sha256Hex of utf8)", () => {
    expect(verbatimShaOf("the verbatim turn")).toBe(sha256HexSync("the verbatim turn"));
  });
});
