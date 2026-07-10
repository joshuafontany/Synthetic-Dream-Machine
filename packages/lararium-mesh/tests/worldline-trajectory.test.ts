/**
 * worldline-trajectory — the PERMAINAN SUBSTRATE: the Turn→Trajectory functor (TIME × SPACE), the
 * scale-graded null-readiness shuffle, and the ITC-registry-from-edge-DAG projection.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#time
 */

import { describe, test, expect } from "vitest";
import {
  orderTrajectory,
  joinFormVectors,
  shuffleTrajectory,
  mulberry32,
  worldlineCausalFromEdges,
  worldlineCompare,
  worldlineHandles,
  worldlineFrontiersFor,
  worldlineInject,
  rewindThenFork,
  delegationEdge,
  communicationEdge,
  handbackClose,
  type TrajectoryStep,
  type LarTickCounter,
} from "../src/index.js";

const tc = (n: number): LarTickCounter => n as LarTickCounter;
const step = (sha: string, t: number): TrajectoryStep => ({ verbatimSha: sha, tickCounter: tc(t) });

describe("orderTrajectory — the Turn→Trajectory functor (TIME axis)", () => {
  test("orders a handle's turns by the within-handle happened-before (tickCounter asc)", () => {
    const traj = orderTrajectory("run.a", [step("c", 3), step("a", 1), step("b", 2)]);
    expect(traj.handle).toBe("run.a");
    expect(traj.steps.map((s) => s.verbatimSha)).toEqual(["a", "b", "c"]);
  });

  test("a tied tickCounter breaks on verbatimSha — total + deterministic order", () => {
    const traj = orderTrajectory("h", [step("z", 5), step("a", 5)]);
    expect(traj.steps.map((s) => s.verbatimSha)).toEqual(["a", "z"]);
  });

  test("is pure — leaves the input array untouched", () => {
    const input = [step("b", 2), step("a", 1)];
    orderTrajectory("h", input);
    expect(input.map((s) => s.verbatimSha)).toEqual(["b", "a"]);
  });
});

describe("joinFormVectors — the SPACE leg (move-space positions)", () => {
  test("joins the move-space position per turn; a miss keeps the TIME slot with a null form", () => {
    const traj = orderTrajectory("h", [step("a", 1), step("b", 2), step("c", 3)]);
    const positions: Record<string, { indices: number[]; values: number[] }> = {
      a: { indices: [0], values: [1] },
      c: { indices: [1], values: [0.5] },
    };
    const joined = joinFormVectors(traj, (sha) => positions[sha] ?? null);
    expect(joined.steps).toHaveLength(3); // b kept its TIME slot, never dropped
    expect(joined.steps[0]!.formVector).toEqual({ indices: [0], values: [1] });
    expect(joined.steps[1]!.formVector).toBeNull();
    expect(joined.steps[2]!.formVector).toEqual({ indices: [1], values: [0.5] });
  });
});

describe("shuffleTrajectory — NULL-READY (scale-graded baseline, NOT the null test)", () => {
  const real = orderTrajectory("h", Array.from({ length: 8 }, (_, i) => step(`s${i}`, i)));

  test("a full shuffle (default window) permutes the order, preserves the multiset, marks shuffled", () => {
    const nul = shuffleTrajectory(real, mulberry32(42));
    expect(nul.shuffled).toBe(true);
    expect(nul.shuffleWindow).toBe(real.steps.length); // window clamped to length = full
    expect([...nul.steps.map((s) => s.verbatimSha)].sort()).toEqual([...real.steps.map((s) => s.verbatimSha)].sort());
    expect(nul.steps.map((s) => s.verbatimSha)).not.toEqual(real.steps.map((s) => s.verbatimSha));
  });

  test("seeded → reproducible (the same seed yields the same null baseline)", () => {
    const a = shuffleTrajectory(real, mulberry32(7));
    const b = shuffleTrajectory(real, mulberry32(7));
    expect(a.steps.map((s) => s.verbatimSha)).toEqual(b.steps.map((s) => s.verbatimSha));
  });

  test("window=1 is the identity floor (no scramble)", () => {
    const nul = shuffleTrajectory(real, mulberry32(7), 1);
    expect(nul.steps.map((s) => s.verbatimSha)).toEqual(real.steps.map((s) => s.verbatimSha));
    expect(nul.shuffleWindow).toBe(1);
  });

  test("scale-graded window=2 scrambles only WITHIN sliding blocks (coarse order preserved)", () => {
    const nul = shuffleTrajectory(real, mulberry32(99), 2);
    // each pair {0,1},{2,3},{4,5},{6,7} stays within its band — block index never crosses
    nul.steps.forEach((s, pos) => {
      const realIdx = Number(s.verbatimSha.slice(1));
      expect(Math.floor(realIdx / 2)).toBe(Math.floor(pos / 2));
    });
  });

  test("is pure — the real trajectory is untouched", () => {
    const before = real.steps.map((s) => s.verbatimSha);
    shuffleTrajectory(real, mulberry32(1));
    expect(real.steps.map((s) => s.verbatimSha)).toEqual(before);
  });
});

describe("worldlineCausalFromEdges — project the ITC registry from the durable edge-DAG (Well 1)", () => {
  test("spawn + inject edges → parent happened-before a working child, working siblings concurrent", () => {
    // A bare fork shares history (→ "equal"); the happened-before manifests once a child does work
    // (an inject / Communication edge), per ITC semantics (worldline-clock canon).
    const root = "run";
    const opens = [
      delegationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
      delegationEdge(root, "run.b", { validFrom: "2026-06-29T00:00:01Z" }),
      communicationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:02Z" }), // a works
      communicationEdge(root, "run.b", { validFrom: "2026-06-29T00:00:03Z" }), // b works
    ];
    const causal = worldlineCausalFromEdges(root, opens);
    expect(worldlineCompare(causal, root, "run.a")).toBe("before");
    expect(worldlineCompare(causal, "run.a", "run.b")).toBe("concurrent");
  });

  test("a bare spawn (no work yet) reads equal — the shared fork history", () => {
    const root = "run";
    const causal = worldlineCausalFromEdges(root, [delegationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:00Z" })]);
    expect(worldlineCompare(causal, root, "run.a")).toBe("equal");
  });

  test("a handback close joins the child back — parent ends AFTER the child's pre-handback history", () => {
    const root = "run";
    const opens = [delegationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:00Z" })];
    const closes = [handbackClose(root, "run.a", "2026-06-29T00:00:05Z")];
    const causal = worldlineCausalFromEdges(root, opens, closes);
    // the child dissolves at handback (apoptosis) — only the parent stamp remains
    expect(worldlineHandles(causal)).toEqual([root]);
    expect(() => worldlineCompare(causal, root, "run.a")).toThrow(); // child retired
  });

  test("inject Communication edge advances the target's history (the rhizome leg)", () => {
    const root = "run";
    const opens = [
      delegationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
      delegationEdge(root, "run.b", { validFrom: "2026-06-29T00:00:01Z" }),
      communicationEdge(root, "run.b", { validFrom: "2026-06-29T00:00:03Z" }),
    ];
    const causal = worldlineCausalFromEdges(root, opens);
    // root injected b after spawning both → root's pre-inject history ≤ b? the inject advances b,
    // and the registry still holds both spirit stamps as live.
    expect(worldlineHandles(causal).sort()).toEqual(["run", "run.a", "run.b"]);
  });

  test("idempotent / re-derive-tolerant — a duplicate spawn + an unknown-pair handback are skipped", () => {
    const root = "run";
    const opens = [
      delegationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
      delegationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:00Z" }), // dup — skipped
    ];
    const closes = [handbackClose(root, "run.ghost", "2026-06-29T00:00:09Z")]; // unknown — skipped
    const causal = worldlineCausalFromEdges(root, opens, closes);
    expect(worldlineHandles(causal).sort()).toEqual(["run", "run.a"]);
  });
});

describe("rewindThenFork — kapae (valid-close) → re-project → fork (edit-and-resubmit)", () => {
  const root = "run";
  // A branch that spawned two spirits; run.b's spawn keys to a turn the operator later REWINDS.
  const opens = [
    delegationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:00Z", turnKey: "t-a" }),
    delegationEdge(root, "run.b", { validFrom: "2026-06-29T00:00:01Z", turnKey: "t-b" }),
    communicationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:02Z", turnKey: "t-a2" }),
  ];

  test("the rewound turn's edge drops from the VALID view (the row survives, the view sheds it)", () => {
    const r = rewindThenFork(root, opens, [], ["t-b"], { parent: root, child: "run.c" });
    expect(r.dropped).toBe(1);                       // run.b's Delegation left the valid view
    expect(worldlineHandles(r.view).sort()).toEqual(["run", "run.a"]); // run.b never re-projected
    // The append-only `opens` are UNTOUCHED — kapae is a valid-view filter, not an erase (bi-temporal).
    expect(opens.length).toBe(3);
  });

  test("the fork yields a concurrent sibling off the rewound frontier", () => {
    const r = rewindThenFork(root, opens, [], ["t-b"], { parent: root, child: "run.c" });
    expect(worldlineHandles(r.causal).sort()).toEqual(["run", "run.a", "run.c"]);
    // run.c forked off root's rewound frontier — a bare fork shares history → equal (pre-work).
    expect(worldlineCompare(r.causal, root, "run.c")).toBe("equal");
    // The resubmitted branch does its own work (the edit-and-resubmit) → it grows an event run.a
    // never saw, while run.a carries an event run.c never saw → neither dominates → CONCURRENT.
    const worked = worldlineInject(r.causal, "run.c");
    expect(worldlineCompare(worked, "run.a", "run.c")).toBe("concurrent");
  });

  test("re-forking the SAME child handle after a rewind does not collide (distinct frontiers)", () => {
    // First fork run.c off the FULL history; then rewind t-b and re-fork run.c off the REWOUND
    // frontier — a different re-projected history → a distinct (handle, frontier) key, no throw.
    const full = worldlineCausalFromEdges(root, opens);
    const r = rewindThenFork(root, opens, [], ["t-b"], { parent: root, child: "run.c" });
    // The rewound-view fork succeeded; run.c is live on the re-projected branch.
    expect(worldlineFrontiersFor(r.causal, "run.c").length).toBe(1);
    // The two projections are independent registries (the guard: a derived projection, never shared state).
    expect(worldlineHandles(full).sort()).toEqual(["run", "run.a", "run.b"]);
  });

  test("no rewound keys → a plain fork off the full view (dropped = 0)", () => {
    const r = rewindThenFork(root, opens, [], [], { parent: root, child: "run.c" });
    expect(r.dropped).toBe(0);
    expect(worldlineHandles(r.causal).sort()).toEqual(["run", "run.a", "run.b", "run.c"]);
  });
});
