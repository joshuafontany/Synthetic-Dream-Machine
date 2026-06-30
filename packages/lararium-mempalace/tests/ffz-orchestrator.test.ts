/**
 * ffz-orchestrator — the FFZ node-side fluid-band pipeline (integration, injected seams).
 *
 * A synthetic session → the orchestrator reads vectors → runs the Measure servo (+ Theme
 * cluster + Beat) → the drawers gain Measure (+ Theme/Beat) cells in `lar_ffz`. Proven:
 * the topic-shift gong commits a new Measure segment; Beat = chunk_index; the stamp-back is
 * idempotent (a re-run = byte-identical patches); the Theme MDL guard gates the stamp;
 * the run degrades gracefully when the cluster plane is absent and (porously) to the planes
 * present; and ZERO causal/edge/itc key ever rides the patch (`lar_ffz` only). PURE — the
 * python I/O is injected, so no chroma/venv is touched.
 */

import { describe, expect, test } from "vitest";

import {
  orchestrateWing,
  parseFfzCells,
  overlayFfzAddress,
  deriveMeasureLabels,
  type DrawerVector,
  type ClusterReading,
  type OrchestrateDeps,
} from "../src/ffz-orchestrator.js";

/** An 8-dim one-hot-ish content vector (a deterministic, embedder-free stand-in). */
function vec(axis: number): number[] {
  const v = new Array(8).fill(0);
  v[axis] = 1;
  return v;
}

/** A drawer with the capture-time `lar_ffz` (Arc + Pulse stamped, fluid bands porous). */
function drawer(source: string, arc: string, chunk: number, axis: number, extra: Partial<DrawerVector> = {}): DrawerVector {
  return {
    id: `${arc}#${chunk}`,
    embedding: vec(axis),
    chunkIndex: chunk,
    sourceFile: source,
    ffz: `session/_.${arc}._._.p${arc}${chunk}`, // theme _, arc, measure _, beat _, pulse
    ...extra,
  };
}

/** Session A: a clear topic shift mid-session (axis 0 → axis 1) forces a Measure gong. */
function sessionA(): DrawerVector[] {
  return [0, 1, 2].map((c) => drawer("a.jsonl", "a", c, 0)).concat([3, 4, 5].map((c) => drawer("a.jsonl", "a", c, 1)));
}
/** Session B: coherent throughout — no gong. */
function sessionB(): DrawerVector[] {
  return [0, 1].map((c) => drawer("b.jsonl", "b", c, 0));
}

/** A capturing patch writer — records what would be merged, returns the applied count. */
function capture(): { writePatches: OrchestrateDeps["writePatches"]; patches: { id: string; patch: Record<string, string | number> }[] } {
  const patches: { id: string; patch: Record<string, string | number> }[] = [];
  return {
    patches,
    writePatches: (ps) => {
      patches.push(...ps.map((p) => ({ id: p.id, patch: { ...p.patch } })));
      return ps.length;
    },
  };
}

describe("parse ⇄ overlay (the address round-trip)", () => {
  test("parseFfzCells reads back what ffzMembershipAddress wrote", () => {
    const cells = parseFfzCells("session/_.a._._.paX");
    expect(cells.arc).toBe("a");
    expect(cells.pulse).toBe("paX");
    expect(cells.theme).toBeUndefined();
    expect(cells.measure).toBeUndefined();
    expect(cells.beat).toBeUndefined();
  });

  test("overlay sets Measure + Beat, keeps Arc + Pulse, leaves Theme porous", () => {
    const addr = overlayFfzAddress("session/_.a._._.paX", { measure: "1", beat: 3 });
    expect(addr).toBe("session/_.a.1.3.paX");
  });

  test("overlay treats segment 0 / chunk 0 as real labels (not absent)", () => {
    const addr = overlayFfzAddress("session/_.a._._.paX", { measure: "0", beat: 0 });
    expect(addr).toBe("session/_.a.0.0.paX");
  });

  test("overlay adds the Theme cell at the head while keeping everything below", () => {
    const addr = overlayFfzAddress("session/_.a._._.paX", { measure: "1", beat: 3, theme: 2 });
    expect(addr).toBe("session/2.a.1.3.paX");
  });
});

describe("Measure servo per session", () => {
  test("a topic shift commits a new segment; coherent runs hold one", () => {
    const a = deriveMeasureLabels(sessionA());
    expect(a.planes).toBe(1);
    expect(a.gongs).toBe(1);
    expect(sessionA().map((d) => a.labels.get(d.id))).toEqual(["0", "0", "0", "1", "1", "1"]);

    const b = deriveMeasureLabels(sessionB());
    expect(b.gongs).toBe(0);
    expect(sessionB().map((d) => b.labels.get(d.id))).toEqual(["0", "0"]);
  });

  test("a multi-plane drift feed routes through the quorum servo (graceful degradation by plane count)", () => {
    const recs: DrawerVector[] = [0, 1, 2, 3].map((c) =>
      drawer("q.jsonl", "q", c, 0, { planes: [c * 0.1, c * 0.05, c * 0.02] }),
    );
    const r = deriveMeasureLabels(recs);
    expect(r.planes).toBe(3);
    expect(recs.every((d) => r.labels.has(d.id))).toBe(true);
  });
});

describe("orchestrateWing — the full pipeline", () => {
  const reader = (): DrawerVector[] => [...sessionA(), ...sessionB()];

  test("drawers gain Measure + Beat cells; patch carries ONLY lar_ffz (zero causal key)", () => {
    const w = capture();
    const res = orchestrateWing("wing_x", { readEmbeddings: reader, writePatches: w.writePatches });

    expect(res.drawers).toBe(8);
    expect(res.sessions).toBe(2);
    expect(res.measured).toBe(8);
    expect(res.gongs).toBe(1);
    expect(res.applied).toBe(8);
    expect(res.planesPresent).toBe(1);
    expect(res.themeAccepted).toBe(false); // no cluster reader ⇒ Theme porous
    expect(res.themed).toBe(0);

    // every patch carries lar_ffz and NOTHING else — no edge/itc/causal field rides it
    for (const p of w.patches) expect(Object.keys(p.patch)).toEqual(["lar_ffz"]);

    const byId = new Map(w.patches.map((p) => [p.id, String(p.patch["lar_ffz"])]));
    expect(byId.get("a#0")).toBe("session/_.a.0.0.pa0"); // Measure 0, Beat 0
    expect(byId.get("a#3")).toBe("session/_.a.1.3.pa3"); // the gong: Measure 1, Beat 3
    expect(byId.get("b#1")).toBe("session/_.b.0.1.pb1");
  });

  test("idempotent — a second run derives byte-identical patches", () => {
    const w1 = capture();
    orchestrateWing("wing_x", { readEmbeddings: reader, writePatches: w1.writePatches });
    const w2 = capture();
    orchestrateWing("wing_x", { readEmbeddings: reader, writePatches: w2.writePatches });
    expect(w2.patches).toEqual(w1.patches);
  });

  test("Theme stamps when the MDL/modularity guard accepts, and the cell rides lar_ffz", () => {
    const cluster: ClusterReading = {
      communities: { "a#0": 0, "a#1": 0, "a#2": 0, "a#3": 1, "a#4": 1, "a#5": 1, "b#0": 2, "b#1": 2 },
      modularity: 0.7,
      members: 8,
      edges: 12,
    };
    const w = capture();
    const res = orchestrateWing(
      "wing_x",
      { readEmbeddings: reader, readClusters: () => cluster, writePatches: w.writePatches },
      { themeMdlBits: 0.5 }, // 0.7 * log2(8)=2.1 > 0.5 ⇒ accept
    );
    expect(res.themeAccepted).toBe(true);
    expect(res.themed).toBe(8);
    const byId = new Map(w.patches.map((p) => [p.id, String(p.patch["lar_ffz"])]));
    expect(byId.get("a#3")).toBe("session/1.a.1.3.pa3"); // Theme 1 at the head
    expect(byId.get("b#0")).toBe("session/2.b.0.0.pb0");
  });

  test("Theme guard REJECTS a low-modularity cluster — fluid bands stamp without it", () => {
    const cluster: ClusterReading = {
      communities: { "a#0": 0, "a#1": 0 },
      modularity: 0.05, // 0.05 * log2(8)=0.15 < 4 (default mdlBits) ⇒ reject
      members: 8,
      edges: 1,
    };
    const w = capture();
    const res = orchestrateWing("wing_x", { readEmbeddings: reader, readClusters: () => cluster, writePatches: w.writePatches });
    expect(res.themeAccepted).toBe(false);
    expect(res.themed).toBe(0);
    const byId = new Map(w.patches.map((p) => [p.id, String(p.patch["lar_ffz"])]));
    expect(byId.get("a#0")).toBe("session/_.a.0.0.pa0"); // no Theme — porous head
  });

  test("graceful when nothing reads back — no patches, no write", () => {
    let wrote = 0;
    const res = orchestrateWing("empty", { readEmbeddings: () => [], writePatches: (ps) => (wrote += ps.length) });
    expect(res.drawers).toBe(0);
    expect(res.applied).toBe(0);
    expect(wrote).toBe(0);
  });
});
