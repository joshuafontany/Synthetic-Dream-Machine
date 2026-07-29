/**
 * Integration — the LIVE content-graph trajectory source feeds the worker's permainan
 * substrate. The worldline-trajectory verb (open-node-vessel) sources its turn stubs from the CONTENT
 * graph (client.turnsForHandle → orderHandleTurnsToStubs) and ships them to the in-VM functor. This
 * proves the COMPOSITION the verb performs, hermetically (no daemon boot): content-graph turns →
 * ordered full-fidelity stubs → the mesh-pure Turn→Trajectory functor → a sensible move-space path,
 * with the form-vector join hitting on the EXACT content-graph verbatim_sha.
 *
 * The holder I/O + the where-filter are witnessed in @lararium/mempalace's
 * worldline-trajectory-source.test.ts; this composes the downstream legs that ride in the verb.
 */
import { describe, it, expect } from "vitest";
import { orderHandleTurnsToStubs, type HandleTurn } from "@lararium/mempalace";
import { orderTrajectory, joinFormVectors, type SparseFormVector, type TrajectoryStep } from "@lararium/mesh";

describe("content-graph stubs → worldline trajectory (the verb composition)", () => {
  // Three content drawers for one handle, OUT of order on the wire (the palace returns no order).
  const turns: HandleTurn[] = [
    { drawerId: "d2", verbatimSha: "sha-ccc", filedAt: "2026-06-29T00:02:00Z", chunkIndex: 0 },
    { drawerId: "d0", verbatimSha: "sha-aaa", filedAt: "2026-06-29T00:00:00Z", chunkIndex: 0 },
    { drawerId: "d1", verbatimSha: "sha-bbb", filedAt: "2026-06-29T00:01:00Z", chunkIndex: 0 },
  ];

  it("the live content-graph shas drive an ordered path (full fidelity, not transcript text)", () => {
    const stubs = orderHandleTurnsToStubs(turns);
    // The verb hands the worker these stubs; the in-VM functor orders by tickCounter.
    const traj = orderTrajectory("sessABC.xyz", stubs.map((s) => ({ verbatimSha: s.verbatimSha, tickCounter: s.tickCounter } as TrajectoryStep)));
    expect(traj.handle).toBe("sessABC.xyz");
    expect(traj.steps.map((s) => s.verbatimSha)).toEqual(["sha-aaa", "sha-bbb", "sha-ccc"]);
    expect(traj.steps.map((s) => s.tickCounter)).toEqual([0, 1, 2]);
  });

  it("the form-vector join hits on the EXACT content-graph verbatim_sha (the fidelity win)", () => {
    const stubs = orderHandleTurnsToStubs(turns);
    const traj = orderTrajectory("sessABC.xyz", stubs.map((s) => ({ verbatimSha: s.verbatimSha, tickCounter: s.tickCounter } as TrajectoryStep)));
    // The form store keyed by the exact capture sha — a transcript-text re-hash would MISS these keys.
    const forms: Record<string, SparseFormVector> = {
      "sha-aaa": { indices: [0], values: [1] },
      "sha-bbb": { indices: [1], values: [1] },
      "sha-ccc": { indices: [2], values: [1] },
    };
    const joined = joinFormVectors(traj, (sha) => forms[sha] ?? null);
    // Every step joined a real move-space position — the path is measurable end-to-end.
    expect(joined.steps.every((s) => s.formVector !== null)).toBe(true);
    expect(joined.steps.map((s) => s.formVector?.indices?.[0])).toEqual([0, 1, 2]);
  });

  it("an empty handle → an empty trajectory (graceful)", () => {
    const traj = orderTrajectory("sessABC.ghost", orderHandleTurnsToStubs([]).map((s) => ({ ...s } as TrajectoryStep)));
    expect(traj.steps).toEqual([]);
  });
});
