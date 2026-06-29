/**
 * node-capture-engine — node's composition of the isomorphic engine (subprocess flush +
 * fs-WAL reserve): enqueue annotates + write-aheads; tick spawns the flush; recover replays.
 */

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CaptureRecord, FlushGate } from "@lararium/mesh";
import type { MoveSkeleton, SerializedBasis } from "@lararium/tw5/form-layer";
import { describe, expect, test } from "vitest";

import {
  makeNodeCaptureEngine, makeFormSplitFlush, readFormBasisCache,
  type NodeCaptureEngineOptions,
} from "../src/node-capture-engine.js";
import type { FormMetadata, FormPalace, FormStoreResult } from "../src/formpalace.js";

const GATE: FlushGate = {
  depth: 1,
  maxWaitMs: 2000,
  maxDepth: 16,
  maxRetries: 5,
  backoffBaseMs: 100,
  backoffMaxMs: 5000,
};

async function opts(extra: Partial<NodeCaptureEngineOptions> = {}): Promise<NodeCaptureEngineOptions> {
  const dir = await mkdtemp(join(tmpdir(), "nodeeng-"));
  return {
    palacePath: join(dir, "palace"),
    spoolDir: join(dir, "spool"),
    walPath: join(dir, "nalu.wal"),
    quarantinePath: join(dir, "q.ndjson"),
    annotate: (_turn, sourceFile) => ({ lar_test: "1", lar_source: sourceFile }),
    gate: GATE,
    ...extra,
  };
}

describe("makeNodeCaptureEngine", () => {
  test("enqueue annotates + write-aheads; tick spawns the flush with the annotated record", async () => {
    let captured: Array<{ content: string; metadata: Record<string, string> }> = [];
    const o = await opts({
      spawn: async (_bin, args) => {
        captured = (await readFile(args[args.length - 1], "utf-8"))
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l));
        return { stdout: "Drawers filed: 1" };
      },
    });
    const engine = makeNodeCaptureEngine(o);
    await engine.enqueue("the verb leads", "nalu://run/1");
    expect(await engine.tick(50)).toBe(1);
    expect(captured[0].content).toBe("the verb leads");
    expect(captured[0].metadata.lar_test).toBe("1");
  });

  test("recover replays the WAL on boot (open sessions survive a restart)", async () => {
    const o = await opts({ spawn: async () => ({ stdout: "Drawers filed: 0" }) });
    const a = makeNodeCaptureEngine(o);
    await a.enqueue("a", "x/1");
    await a.enqueue("b", "x/2");

    const rebooted = makeNodeCaptureEngine(o); // same WAL = a reboot
    expect(await rebooted.recover()).toBe(2);
    expect(rebooted.stats().depth).toBe(2);
  });
});

describe("makeFormSplitFlush — the aperture stamp + the basis cache (P6 + jurus enabling seams)", () => {
  const skeleton: MoveSkeleton = {
    stream: [], graph: [], band: "raw",
    counts: { tokens: 0, content: 0, water: 0, voices: 0, wards: 0, phases: 0, sigils: 0 },
    bearing: { aim: [], yield: [], primary: null, facets: {} },
  };
  const basis: SerializedBasis = {
    axes: [{ id: "voice:council", category: "voice", label: "council", layer: "x-memetic", parentFamily: null, sigilKind: null }],
    dimension: 12,
  };
  function fakeFormPalace(stamped: FormMetadata[]): FormPalace {
    return {
      async encodeStore({ metadata }) {
        stamped.push(metadata);
        return { key: metadata.verbatim_sha, dimension: basis.dimension, count: 1, conformance: 1,
          slor: { live: false, model: null, reason: "test" },
          form_vector: { indices: [], values: [] } } satisfies FormStoreResult;
      },
      async query() { return []; },
      async filter() { return []; },
      async get() { return null; },
      async close() {},
    };
  }
  function rec(content: string): CaptureRecord {
    return {
      content, source_file: "x/1",
      metadata: { lar_skeleton: JSON.stringify(skeleton), lar_basis: JSON.stringify(basis), lar_sigils: 2 },
    } as unknown as CaptureRecord;
  }

  test("stamps the declared HUD aperture into the form metadata, and caches the basis to disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "formsplit-"));
    const stamped: FormMetadata[] = [];
    const flush = makeFormSplitFlush(async (b) => b.length, fakeFormPalace(stamped), dir);

    const n = await flush([rec("a turn <<~ hud Aperture(10) OODA-HA(3) >> the verb leads")]);
    expect(n).toBe(1);
    expect(stamped[0]!.aperture).toBe(10);                 // the paragraph grain, re-harvested
    // the in-VM basis is cached to disk so a node-side recall queries in the SAME space
    const cached = readFormBasisCache(dir);
    expect(cached).not.toBeNull();
    expect(cached!.dimension).toBe(12);
  });

  test("a turn with NO declared aperture stamps no aperture facet (graceful)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "formsplit-"));
    const stamped: FormMetadata[] = [];
    const flush = makeFormSplitFlush(async (b) => b.length, fakeFormPalace(stamped), dir);
    await flush([rec("a turn with no hud panel")]);
    expect(stamped[0]!.aperture).toBeUndefined();
  });
});
