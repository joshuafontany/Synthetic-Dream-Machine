/**
 * wiki-sense-supervision (node tier) — the supervision-reads witness, node substrate.
 *
 * Stands a REAL perceiver island (the consistency keystone's GLUE corpus + `hasWikiSensorium`) behind an in-process
 * channel shaped exactly like the worker wire (signal message in → SENSORIUM_FRAME back), then
 * drives the supervisor across it: a cohere read flows daemon→island→back and leaves a proof-hold
 * record in the daemon's own store, re-readable; recall rides the same surface; an ask naming an
 * UN-supervised island fails loud (the confused-deputy ward, both legs); proof-federate refuses
 * typed. The Chromium twin (browser/tests) drives the SAME asks over a real Web Worker wire.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/wiki-sense-supervision
 */

import { describe, test, expect } from "vitest";
import { isVesselToIslandMsg, mkSensoriumSignal } from "@lararium/mesh";
import {
  createWikiSenseSupervisor,
  buildProofRecordTiddler,
  parseProofRecord,
  proofRecordUri,
  isProofRecordUri,
} from "../src/wiki-sense-supervision.js";
import type { WikiSenseSupervisor, WikiSenseShores } from "../src/wiki-sense-supervision.js";
import { hasWikiSensorium, SENSORIUM_FRAME } from "../src/wiki-sensorium-cap.js";
import { buildFixtureIsland, GLUE_SEEDS } from "../src/wiki-store-adapter.js";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import type { IslandContext } from "../src/island-context.js";
import type { IslandCap } from "../src/island-caps.js";

const ISLAND_A = "lar:///ha.ka.ba/bags/@sense-supervised";
const ISLAND_B = "lar:///ha.ka.ba/bags/@sense-elsewhere";
const STRANGER = "lar:///ha.ka.ba/bags/@sense-unsupervised";

/** One supervised island behind an in-process channel wearing the wire's message shape. */
interface ChannelHarness {
  shores: WikiSenseShores;
  /** binds the supervisor the frames route back to (the vessel's onWorkerEvent leg). */
  bind(supervisor: WikiSenseSupervisor): void;
  /** re-route frames as if they arrived from a different island (the return-leg ward probe). */
  spoofFramesFrom(designation: string | null): void;
  teardown(): Promise<void>;
}

async function standChannel(designations: readonly string[]): Promise<ChannelHarness> {
  let supervisor: WikiSenseSupervisor | null = null;
  let spoof: string | null = null;
  const caps = new Map<string, { cap: IslandCap; ctx: IslandContext; down: (() => void | Promise<void>) | void }>();

  for (const designation of designations) {
    const island = await buildFixtureIsland(designation, GLUE_SEEDS);
    const cap = hasWikiSensorium();
    const ctx = {
      composite: island,
      wikiUri: designation,
      post: (msg: unknown) => {
        const m = msg as { listenable?: string; payload?: Record<string, string | number | boolean> };
        if (m.listenable !== SENSORIUM_FRAME || !m.payload) return;
        // the vessel's return leg: the FRAME's origin island pins the answer to its designation.
        supervisor?.acceptFrame(spoof ?? designation, m.payload);
      },
    } as unknown as IslandContext;
    const down = await cap.onEa!(ctx);
    caps.set(designation, { cap, ctx, down: typeof down === "function" ? down : undefined });
  }

  return {
    shores: {
      supervises: (designation) => caps.has(designation),
      sendSignal: (designation, msg) => {
        const c = caps.get(designation);
        // the mechanism-level ward (the pool's placeSensoriumSignal twin): no live island → loud.
        if (!c) throw new Error(`no live island for ${designation} — sensorium signal refused`);
        // the wire shape: type = the signal name itself; fields ride `args` (mkSensoriumSignal).
        const wire = mkSensoriumSignal(msg);
        c.cap.onSignal!(wire.type, wire, c.ctx);
      },
    },
    bind: (s) => { supervisor = s; },
    spoofFramesFrom: (d) => { spoof = d; },
    teardown: async () => {
      for (const c of caps.values()) await c.down?.();
      caps.clear();
    },
  };
}

describe("wiki-sense supervision reads — node tier", () => {
  test("the wire admits the sensorium signals — mkSensoriumSignal passes the vessel→island guard", () => {
    const msg = mkSensoriumSignal({ signal: "sensorium:cohere", requestId: "r1" });
    expect(isVesselToIslandMsg(msg)).toBe(true);
    expect(msg.args?.["requestId"]).toBe("r1");
    expect(isVesselToIslandMsg(mkSensoriumSignal({ signal: "sensorium:recall", requestId: "r2", args: { likeTitle: "canon-a" } }))).toBe(true);
  });

  test("a cohere read flows daemon→island→back and holds the PROOF in the daemon's own store", async () => {
    const harness = await standChannel([ISLAND_A]);
    const proofStore = new MemoryTiddlerStore("lar:///ha.ka.ba/bags/@daemon");
    const supervisor = createWikiSenseSupervisor(harness.shores, { proofStore });
    harness.bind(supervisor);
    try {
      const reading = await supervisor.cohere(ISLAND_A, { hold: true });
      // the verdict — the wiki-sensorium cap's verbs answered, un-re-implemented (GLUE corpus glues, gate reconcilable).
      expect(reading.island).toBe(ISLAND_A);
      expect(reading.verdict.consistency.glues).toBe(true);
      expect(reading.verdict.gate.kind).toBe("reconcilable");
      expect(reading.verdict.corpusSize).toBe(3);
      // the as-of stamp rides the verdict (memory-backed fixture → no CRDT heads → empty, honest).
      expect(Array.isArray(reading.verdict.asOf)).toBe(true);

      // the proof-hold record persisted + re-readable — the effect-record ledger idiom.
      expect(reading.proof).toBeDefined();
      const proof = reading.proof!;
      expect(proof.island).toBe(ISLAND_A);
      expect(proof.glues).toBe(true);
      expect(proof.gateKind).toBe("reconcilable");
      const title = proofRecordUri("lar:///ha.ka.ba/bags/@daemon", proof.eventId);
      expect(isProofRecordUri(title)).toBe(true);
      const stored = await proofStore.get(title);
      expect(stored).not.toBeNull();
      const parsed = parseProofRecord(stored!.tiddler as Record<string, unknown>);
      expect(parsed).toEqual(proof);

      // "serialize the PROOF, never the carrier" — no tiddler body text rides the record.
      const serialized = JSON.stringify(stored!.tiddler);
      for (const seed of GLUE_SEEDS) expect(serialized).not.toContain(seed.text);
    } finally {
      supervisor.dispose();
      await harness.teardown();
    }
  });

  test("recall rides the same supervised surface — all the cap's tiers answer unchanged", async () => {
    const harness = await standChannel([ISLAND_A]);
    const supervisor = createWikiSenseSupervisor(harness.shores);
    harness.bind(supervisor);
    try {
      const result = await supervisor.recall(ISLAND_A, { likeTitle: "canon-a" });
      expect(result.form.length).toBeGreaterThan(0);
      expect(result.form[0]!.title).toBe("canon-b");
      expect(result.semantic).toBeNull();   // no embedder rides the island — honest absence carries over
    } finally {
      supervisor.dispose();
      await harness.teardown();
    }
  });

  test("an ask naming an UN-supervised island FAILS LOUD — designation carries the authority", async () => {
    const harness = await standChannel([ISLAND_A]);
    const supervisor = createWikiSenseSupervisor(harness.shores);
    harness.bind(supervisor);
    try {
      await expect(supervisor.cohere(STRANGER)).rejects.toThrow(/does not supervise/);
      await expect(supervisor.recall(STRANGER, { text: "canon" })).rejects.toThrow(/does not supervise/);
    } finally {
      supervisor.dispose();
      await harness.teardown();
    }
  });

  test("a frame from the WRONG island never settles the ask — the return-leg ward", async () => {
    const harness = await standChannel([ISLAND_A, ISLAND_B]);
    const supervisor = createWikiSenseSupervisor(harness.shores, { timeoutMs: 60 });
    harness.bind(supervisor);
    try {
      // every frame now claims to arrive from ISLAND_B; the ask names ISLAND_A → nothing settles.
      harness.spoofFramesFrom(ISLAND_B);
      await expect(supervisor.cohere(ISLAND_A)).rejects.toThrow(/timed out/);
    } finally {
      supervisor.dispose();
      await harness.teardown();
    }
  });

  test("a proof-hold without a daemon store fails loud — never a silent drop", async () => {
    const harness = await standChannel([ISLAND_A]);
    const supervisor = createWikiSenseSupervisor(harness.shores);   // no proofStore
    harness.bind(supervisor);
    try {
      await expect(supervisor.cohere(ISLAND_A, { hold: true })).rejects.toThrow(/no proofStore/);
    } finally {
      supervisor.dispose();
      await harness.teardown();
    }
  });

  test("proof-federate refuses typed — the shore Act stays the operator's", async () => {
    const harness = await standChannel([ISLAND_A]);
    const supervisor = createWikiSenseSupervisor(harness.shores);
    harness.bind(supervisor);
    try {
      expect(supervisor.proofFederate(ISLAND_A)).toEqual({
        status:   "operator-gated",
        awaits:   "shore-Act",
        crossing: "proof-hold(local @daemon ledger) -> proof-federate(disclosure shore)",
        island:   ISLAND_A,
      });
    } finally {
      supervisor.dispose();
      await harness.teardown();
    }
  });

  test("the proof tiddler round-trips through the ledger idiom (build → parse)", () => {
    const proof = {
      eventId: "ev-1", island: ISLAND_A, requestId: "sense-r1",
      asOf: ["h1", "h2"] as readonly string[],
      radius: 0.42, glues: false, vacuous: false,
      gateKind: "ontological" as const, dimH1: 2, cost: 1,
      obstructionLoci: ["ornate-novel"] as readonly string[], lociTotal: 1, corpusSize: 4,
    };
    const rec = buildProofRecordTiddler(proof, "lar:///ha.ka.ba/bags/@daemon");
    expect(parseProofRecord(rec.tiddler as Record<string, unknown>)).toEqual(proof);
  });
});
