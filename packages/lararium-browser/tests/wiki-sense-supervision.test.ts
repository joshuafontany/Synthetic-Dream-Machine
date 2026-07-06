/**
 * wiki-sense-supervision (browser tier) — the supervision-reads witness over a REAL worker wire.
 *
 * The node tier proves the supervisor's hull in-process; THIS tier proves the whole crossing in
 * Chromium: the pool mounts a genuine Web Worker island carrying the wiki-sensorium cap (the sensorium fixture),
 * the supervisor's cohere/recall asks ride `placeSensoriumSignal` over postMessage, the island's
 * SENSORIUM_FRAME events route back through onWorkerEvent, and the proof-hold record lands in the
 * daemon-side store — daemon→island→back, end to end. The confused-deputy ward fires on an
 * un-supervised designation (both the supervisor's grant check and the pool's live-island check
 * fail loud), and proof-federate refuses typed.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-sense-supervision
 */

import { describe, test, expect, afterEach } from "vitest";
import { DAEMON_BAG_ID } from "@lararium/mesh";
import {
  createWikiSenseSupervisor,
  parseProofRecord,
  proofRecordUri,
  MemoryTiddlerStore,
  SENSORIUM_FRAME,
  GLUE_SEEDS,
} from "@lararium/tw5";
import type { WikiSenseSupervisor } from "@lararium/tw5";
import { BrowserVesselIslandPool } from "../src/browser-vessel-island-pool.js";

const FIXTURE_URL = new URL("./fixtures/browser-sensorium-island.mjs", import.meta.url);

const ISLAND_A = "lar:///ha.ka.ba/@sense-worker-a";
const STRANGER = "lar:///ha.ka.ba/@sense-worker-stranger";

const MOUNT_SPEC = {
  coreHash: null,
  recipe: { wikiSlug: "sense" },
  grants: { islandUrl: "automerge:fixture-lararium-url" },
};

describe("wiki-sense supervision reads — browser tier (real worker wire)", () => {
  let pool: BrowserVesselIslandPool | null = null;
  let supervisor: WikiSenseSupervisor | null = null;

  afterEach(async () => {
    supervisor?.dispose();
    supervisor = null;
    await pool?.disposeAll();
    pool = null;
  });

  /** Stand the vessel-side plumbing: pool + supervisor + the SENSORIUM_FRAME return leg. */
  async function standSupervised(proofStore?: MemoryTiddlerStore): Promise<WikiSenseSupervisor> {
    const p = new BrowserVesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      onWorkerEvent: (id, msg) => {
        if (msg.listenable === SENSORIUM_FRAME) supervisor?.acceptFrame(id, msg.payload);
      },
    });
    pool = p;
    const s = createWikiSenseSupervisor(
      {
        supervises: (island) => p.has(island),
        sendSignal: (island, msg) => p.placeSensoriumSignal(island, msg),
      },
      proofStore ? { proofStore } : {},
    );
    supervisor = s;
    await p.mountWiki(ISLAND_A, MOUNT_SPEC);
    return s;
  }

  test("a cohere read crosses the worker wire and holds the PROOF daemon-side", async () => {
    const proofStore = new MemoryTiddlerStore(DAEMON_BAG_ID);
    const s = await standSupervised(proofStore);

    const reading = await s.cohere(ISLAND_A, { hold: true });
    // the wiki-sensorium cap's verbs answered from INSIDE the worker (GLUE corpus → glues, gate reconcilable).
    expect(reading.verdict.consistency.glues).toBe(true);
    expect(reading.verdict.gate.kind).toBe("reconcilable");
    expect(reading.verdict.corpusSize).toBe(3);

    // the proof-hold record persisted + re-readable in the daemon's own store.
    expect(reading.proof).toBeDefined();
    const stored = await proofStore.get(proofRecordUri(DAEMON_BAG_ID, reading.proof!.eventId));
    expect(stored).not.toBeNull();
    expect(parseProofRecord(stored!.tiddler as Record<string, unknown>)).toEqual(reading.proof);

    // "serialize the PROOF, never the carrier" — no corpus body crossed into the ledger.
    const serialized = JSON.stringify(stored!.tiddler);
    for (const seed of GLUE_SEEDS) expect(serialized).not.toContain(seed.text);
  });

  test("recall rides the same wire — the cap's tiers answer from the worker island", async () => {
    const s = await standSupervised();
    const result = await s.recall(ISLAND_A, { likeTitle: "canon-a" });
    expect(result.form.length).toBeGreaterThan(0);
    expect(result.form[0]!.title).toBe("canon-b");
    expect(result.semantic).toBeNull();   // no embedder rides the fixture — honest absence
  });

  test("an ask naming an island this daemon does not supervise FAILS LOUD", async () => {
    const s = await standSupervised();
    await expect(s.cohere(STRANGER)).rejects.toThrow(/does not supervise/);
    // and the pool's mechanism wards independently — a raw signal to a cold name refuses loud.
    expect(() => pool!.placeSensoriumSignal(STRANGER, { signal: "sensorium:cohere", requestId: "r" }))
      .toThrow(/no live island/);
  });

  test("proof-federate refuses typed — the membrane Act stays the operator's", async () => {
    const s = await standSupervised();
    expect(s.proofFederate(ISLAND_A)).toEqual({
      status:   "operator-gated",
      awaits:   "membrane-Act",
      crossing: "proof-hold(local @daemon ledger) -> proof-federate(disclosure membrane)",
      island:   ISLAND_A,
    });
  });
});
