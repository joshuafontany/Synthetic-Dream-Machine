/**
 * worldline-read-vm.test.ts — the IN-VM worldline reads (the permainan substrate, lifted into the
 * sovereign daemon worker; the worldline twin of query-derive-vm).
 *
 * Proves the reads run IN-VM: the compute fns hold the registry + order/join/shuffle (Wells 1/3/4),
 * the startup publishes them on `$tw.lares`, and the daemon-behavior channel round-trips a compare +
 * a trajectory request through those in-VM fns. Graceful when the VM is cold (the plugin-absent path).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#time
 */

import { describe, test, expect, afterEach } from "vitest";
import {
  delegationEdge,
  communicationEdge,
  handbackClose,
  worldlineHandles,
  mkDaemonWorldlineCompareRequest,
  mkDaemonWorldlineTrajectoryRequest,
} from "@lararium/mesh";
import {
  computeWorldlineCompare,
  computeWorldlineTrajectory,
  worldlineRegistry,
  startup,
  type WorldlineStubInput,
} from "../src/worldline-read-vm.js";
import { makeDaemonBehavior } from "../src/daemon-behavior.js";
import type { IslandContext } from "../src/island-context.js";

// ── Well 1 — the ITC LIVE-READ (the worker holds the registry + answers the causal verdict) ──────
describe("computeWorldlineCompare — Well 1 (registry held in-VM, concurrent-capable verdict)", () => {
  test("project the edge-DAG, hold the registry, answer before/concurrent/equal", () => {
    const opens = [
      delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
      delegationEdge("run", "run.b", { validFrom: "2026-06-29T00:00:01Z" }),
      communicationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:02Z" }),
      communicationEdge("run", "run.b", { validFrom: "2026-06-29T00:00:03Z" }),
    ];
    expect(computeWorldlineCompare({ a: "run", b: "run.a", opens, root: "run" }).order).toBe("before");
    expect(computeWorldlineCompare({ a: "run.a", b: "run.b", opens, root: "run" }).order).toBe("concurrent");
    expect(computeWorldlineCompare({ a: "run.a", b: "run.a", opens, root: "run" }).order).toBe("equal");
    // the registry is HELD in module state (the future read→filter-compute chain leans on it).
    // Read through the accessor: the stamps key by composite (handle × frontier), never bare handle.
    expect(worldlineHandles(worldlineRegistry()!).sort()).toEqual(["run", "run.a", "run.b"]);
  });

  test("a compare with NO fresh edges reads the HELD registry (cross-read persistence)", () => {
    // delegation (spawn) + communication (inject) → run is "before" run.a (a bare fork reads "equal").
    const opens = [
      delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
      communicationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:02Z" }),
    ];
    computeWorldlineCompare({ a: "run", b: "run.a", opens, root: "run" }); // ingest
    // no edges this call → the held registry serves it (the worker holds state across reads)
    expect(computeWorldlineCompare({ a: "run", b: "run.a", opens: [], root: "run" }).order).toBe("before");
  });

  test("a handback retires the child — an unknown handle THROWS (the host wraps the helpful error)", () => {
    const opens = [delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" })];
    const closes = [handbackClose("run", "run.a", "2026-06-29T00:00:05Z")];
    expect(() => computeWorldlineCompare({ a: "run", b: "run.a", opens, closes, root: "run" })).toThrow();
  });
});

// ── Well 3 + Well 4 — the TRAJECTORY + the NULL baseline (order, join, shuffle, all in-VM) ────────
describe("computeWorldlineTrajectory — Well 3 (order + form-join) + Well 4 (null baseline)", () => {
  const stubs: WorldlineStubInput[] = [
    { verbatimSha: "sha-c", tickCounter: 3, formVector: { indices: [0], values: [0.25] } },
    { verbatimSha: "sha-a", tickCounter: 1, formVector: { indices: [0], values: [1] } },
    { verbatimSha: "sha-b", tickCounter: 2, formVector: { indices: [0], values: [0.5] } },
  ];

  test("orders by happened-before AND joins each turn's shipped move-space position", () => {
    const { trajectory } = computeWorldlineTrajectory({ handle: "run.x", stubs });
    expect(trajectory.handle).toBe("run.x");
    expect(trajectory.steps.map((s) => s.verbatimSha)).toEqual(["sha-a", "sha-b", "sha-c"]); // TIME order
    expect(trajectory.steps.every((s) => s.formVector && s.formVector.values.length > 0)).toBe(true); // SPACE joined
  });

  test("a FORM miss (null shipped) keeps the turn's TIME slot with a null position (never dropped)", () => {
    const partial: WorldlineStubInput[] = [
      { verbatimSha: "sha-a", tickCounter: 1, formVector: { indices: [0], values: [1] } },
      { verbatimSha: "sha-b", tickCounter: 2, formVector: null },
      { verbatimSha: "sha-c", tickCounter: 3 },
    ];
    const { trajectory } = computeWorldlineTrajectory({ handle: "run.x", stubs: partial });
    expect(trajectory.steps).toHaveLength(3);
    expect(trajectory.steps[0]!.formVector).not.toBeNull(); // sha-a present
    expect(trajectory.steps[1]!.formVector).toBeNull();      // sha-b null slot
    expect(trajectory.steps[2]!.formVector).toBeNull();      // sha-c absent → null slot
  });

  test("joinForm:false → a TIME-only skeleton (no form positions)", () => {
    const { trajectory } = computeWorldlineTrajectory({ handle: "run.x", stubs, joinForm: false });
    expect(trajectory.steps.map((s) => s.verbatimSha)).toEqual(["sha-a", "sha-b", "sha-c"]);
    expect(trajectory.steps.every((s) => s.formVector === undefined)).toBe(true);
  });

  test("includeNull → the SAME multiset, scrambled order, marked shuffled + reproducible (seeded)", () => {
    const six: WorldlineStubInput[] = Array.from({ length: 6 }, (_, i) => ({ verbatimSha: `s${i}`, tickCounter: i }));
    const r1 = computeWorldlineTrajectory({ handle: "h", stubs: six, joinForm: false, includeNull: true, seed: 5 });
    expect(r1.nullBaseline!.shuffled).toBe(true);
    expect([...r1.nullBaseline!.steps.map((s) => s.verbatimSha)].sort())
      .toEqual([...r1.trajectory.steps.map((s) => s.verbatimSha)].sort());
    const r2 = computeWorldlineTrajectory({ handle: "h", stubs: six, joinForm: false, includeNull: true, seed: 5 });
    expect(r1.nullBaseline!.steps.map((s) => s.verbatimSha)).toEqual(r2.nullBaseline!.steps.map((s) => s.verbatimSha));
  });

  test("empty stubs → an empty trajectory (total, graceful — like a derive null)", () => {
    const { trajectory } = computeWorldlineTrajectory({ handle: "h", stubs: [] });
    expect(trajectory.steps).toEqual([]);
  });
});

// ── startup publishes the in-VM reads on $tw.lares ────────────────────────────────────────────────
describe("startup — the in-VM reads land on $tw.lares (the worker's read surface)", () => {
  afterEach(() => { delete (globalThis as Record<string, unknown>)["$tw"]; });

  test("publishes worldlineCompareVm + worldlineTrajectoryVm, computing live", () => {
    (globalThis as Record<string, unknown>)["$tw"] = { lares: {} };
    startup();
    const lares = ((globalThis as Record<string, unknown>)["$tw"] as { lares: Record<string, unknown> }).lares;
    expect(typeof lares["worldlineCompareVm"]).toBe("function");
    expect(typeof lares["worldlineTrajectoryVm"]).toBe("function");
    const cmp = lares["worldlineCompareVm"] as (i: unknown) => { order: string };
    const opens = [
      delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
      communicationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:02Z" }),
    ];
    expect(cmp({ a: "run", b: "run.a", opens, root: "run" }).order).toBe("before");
  });
});

// ── the daemon-behavior channel round-trip (request → in-VM fn → result envelope) ─────────────────
describe("daemon-behavior channel — worldline reads round-trip through the in-VM fns", () => {
  /** A minimal island ctx: only `tw5` (the in-VM read surface) + `post` (the result sink) are read. */
  function fakeCtx(posted: unknown[]): IslandContext {
    return {
      tw5: { $tw: { lares: { worldlineCompareVm: computeWorldlineCompare, worldlineTrajectoryVm: computeWorldlineTrajectory } } },
      post: (msg: unknown) => { posted.push(msg); },
    } as unknown as IslandContext;
  }

  test("a compare request routes to the in-VM fn → an order result", () => {
    const behavior = makeDaemonBehavior({});
    const posted: unknown[] = [];
    const req = mkDaemonWorldlineCompareRequest({
      requestId: "wl-1", a: "run", b: "run.a",
      opens: [
        delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" }),
        communicationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:02Z" }),
      ],
      root: "run",
    });
    const claimed = behavior.onSignal("daemon:worldline-compare-request", req, fakeCtx(posted));
    expect(claimed).toBe(true);
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: "daemon:worldline-compare-result", requestId: "wl-1", order: "before" });
  });

  test("a trajectory request routes to the in-VM fn → an ordered trajectory (+ null) result", () => {
    const behavior = makeDaemonBehavior({});
    const posted: Array<{ type: string; trajectory?: { steps: { verbatimSha: string }[] }; nullBaseline?: unknown }> = [];
    const req = mkDaemonWorldlineTrajectoryRequest({
      requestId: "wl-2", handle: "run.x",
      stubs: [
        { verbatimSha: "sha-b", tickCounter: 2 },
        { verbatimSha: "sha-a", tickCounter: 1 },
      ],
      joinForm: false, includeNull: true, seed: 3,
    });
    const claimed = behavior.onSignal("daemon:worldline-trajectory-request", req, fakeCtx(posted) );
    expect(claimed).toBe(true);
    expect(posted[0]!.type).toBe("daemon:worldline-trajectory-result");
    expect(posted[0]!.trajectory!.steps.map((s) => s.verbatimSha)).toEqual(["sha-a", "sha-b"]);
    expect(posted[0]!.nullBaseline).toBeDefined();
  });

  test("plugin absent ($tw.lares unwired) → a graceful error result (cold-VM, like the derive)", () => {
    const behavior = makeDaemonBehavior({});
    const posted: Array<{ type: string; error?: string }> = [];
    const coldCtx = { tw5: { $tw: { lares: {} } }, post: (m: unknown) => { posted.push(m as { type: string }); } } as unknown as IslandContext;
    behavior.onSignal("daemon:worldline-compare-request",
      mkDaemonWorldlineCompareRequest({ requestId: "wl-cold", a: "x", b: "y", opens: [] }), coldCtx);
    expect(posted[0]!.type).toBe("daemon:worldline-compare-result");
    expect(posted[0]!.error).toMatch(/absent/);
  });
});
