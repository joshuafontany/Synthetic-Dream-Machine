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
  makeNodeCaptureEngine, makeFormSplitFlush, makeAstSplitFlush,
  type NodeCaptureEngineOptions,
} from "../src/node-capture-engine.js";
import type { FormMetadata, FormPalace, FormStoreResult } from "../src/formpalace.js";
import type { StructurePalace, StructureKapaeResult } from "../src/structurepalace.js";

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

describe("makeAstSplitFlush — strand-B: turn_key rides to the .structurepalace, stripped from the drawer", () => {
  type PutCall = { tree: unknown; verbatim: { source_file: string; content: string; turnKey?: string } };
  function fakeStructurePalace(puts: PutCall[]): StructurePalace {
    return {
      async put(tree, verbatim) { puts.push({ tree, verbatim }); return { hash: "h".repeat(64), verbatimSha: "v".repeat(64) }; },
      async get() { return null; },
      async kapae(turnKey): Promise<StructureKapaeResult> { return { closed: 0, tombstoned: [], verbatim_shas: [], turn_key: turnKey }; },
      async hashOf() { return "h".repeat(64); },
      async close() {},
    };
  }

  test("lar_turn_key is passed to put() and STRIPPED from the routed drawer (provenance, not content)", async () => {
    const puts: PutCall[] = [];
    let routed: CaptureRecord[] = [];
    const flush = makeAstSplitFlush(async (b) => { routed = [...b]; return b.length; }, fakeStructurePalace(puts));
    await flush([{ content: "the verb leads", source_file: "wing/s.jsonl",
      metadata: { lar_ast: JSON.stringify({ t: 1 }), lar_turn_key: "turn-uuid-9", lar_sigils: 2 } } as unknown as CaptureRecord]);
    // turn_key reached the .structurepalace put as provenance.
    expect(puts[0]!.verbatim.turnKey).toBe("turn-uuid-9");
    // the routed drawer carries the joins but NOT lar_ast / lar_turn_key.
    const m = routed[0]!.metadata as Record<string, unknown>;
    expect(m["lar_turn_key"]).toBeUndefined();
    expect(m["lar_ast"]).toBeUndefined();
    expect(m["lar_ast_hash"]).toBe("h".repeat(64));
    expect(m["lar_verbatim_sha"]).toBe("v".repeat(64));
    expect(m["lar_sigils"]).toBe(2); // unrelated metadata preserved
  });

  test("no inline AST: lar_turn_key is still stripped off the drawer (no leak)", async () => {
    const puts: PutCall[] = [];
    let routed: CaptureRecord[] = [];
    const flush = makeAstSplitFlush(async (b) => { routed = [...b]; return b.length; }, fakeStructurePalace(puts));
    await flush([{ content: "plain", source_file: "wing/s.jsonl",
      metadata: { lar_turn_key: "turn-uuid-2", lar_sigils: 0 } } as unknown as CaptureRecord]);
    expect(puts).toHaveLength(0); // nothing to split
    expect((routed[0]!.metadata as Record<string, unknown>)["lar_turn_key"]).toBeUndefined();
    expect((routed[0]!.metadata as Record<string, unknown>)["lar_sigils"]).toBe(0);
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

  test("stamps the declared HUD aperture into the form metadata (no disk basis-cache — recall derives in-VM)", async () => {
    const stamped: FormMetadata[] = [];
    const flush = makeFormSplitFlush(async (b) => b.length, fakeFormPalace(stamped));

    const n = await flush([rec("a turn <<~ hud Aperture(10) OODA-HA(3) >> the verb leads")]);
    expect(n).toBe(1);
    expect(stamped[0]!.aperture).toBe(10);                 // the paragraph grain, re-harvested
  });

  test("a turn with NO declared aperture stamps no aperture facet (graceful)", async () => {
    const stamped: FormMetadata[] = [];
    const flush = makeFormSplitFlush(async (b) => b.length, fakeFormPalace(stamped));
    await flush([rec("a turn with no hud panel")]);
    expect(stamped[0]!.aperture).toBeUndefined();
  });
});
