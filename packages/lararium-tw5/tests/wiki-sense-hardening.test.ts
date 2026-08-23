/**
 * wiki-sense-hardening (node tier) — the aftermath guards witnessed, one probe per cure:
 * the idf-lite stop-shingle cut (a saturated corpus stops reading as grammar), the boundary
 * loci cap (+ lociTotal), the ask-wire error frames (both ends fail loud), the non-finite
 * recall limit, the unknown filter-suffix refusal, and the non-default proofBag round-trip.
 *
 * Meme: lar:///ha.ka.ba/lares/api/wiki-sensorium-cap
 */

import { describe, test, expect } from "vitest";
import {
  foldCorpus,
  corpusPlanes,
  summarizeCoherence,
  LOCI_CAP,
  type WikiSenseDoc,
  type WikiCoherenceVerdict,
} from "../src/wiki-sense-fold.js";
import { wikisense } from "../src/filters/wikisense.js";
import type { TW5FilterOperator, TW5FilterSource, TW5Wiki } from "../src/types/tiddlywiki.js";
import {
  hasWikiSensorium,
  createWikiSensorium,
  SENSORIUM_SIGNAL,
} from "../src/wiki-sensorium-cap.js";
import { buildFixtureIsland, GLUE_SEEDS } from "../src/wiki-store-adapter.js";
import {
  createWikiSenseSupervisor,
  buildProofRecordTiddler,
  parseProofRecord,
  isProofRecordUri,
  proofLedgerPrefix,
} from "../src/wiki-sense-supervision.js";
import type { IslandContext } from "../src/island-context.js";

const doc = (title: string, text: string): WikiSenseDoc => ({
  title,
  fields: { text },
  heads: null,
});

describe("the stop-shingle cut — saturation reads as texture, not grammar", () => {
  const AMBIENT = "the ambient tide phrase that saturates every single document body here";
  const RARE = "a rare recurring signature phrase shared by just two docs";

  test("an ambient shingle (df > corpus/2) stops counting; a rare recurrence still counts", () => {
    const fold = foldCorpus([
      doc("a", `${AMBIENT} ${RARE}`),
      doc("b", `${AMBIENT} ${RARE}`),
      doc("c", `${AMBIENT} zebra quartz umbra`),
      doc("d", `${AMBIENT} violet nomad ember`),
      doc("e", `${AMBIENT} keel harbor stone`),
    ]);
    const form = corpusPlanes(fold).restrictions[1]!.value;
    // a and b share the RARE phrase (df 2 <= max(2, 5/2)) — genuine recurring grammar.
    expect(form.get("a")).toBe(1);
    expect(form.get("b")).toBe(1);
    // c/d/e carry ONLY the saturated ambient phrase (df 5 > 5/2) — the cut reads them bare.
    expect(form.get("c")).toBe(0);
    expect(form.get("d")).toBe(0);
    expect(form.get("e")).toBe(0);
  });
});

describe("the boundary loci cap — serialized surfaces stay bounded", () => {
  test("summarizeCoherence caps the locus and carries the true count", () => {
    const loci = Array.from({ length: LOCI_CAP + 8 }, (_, i) => `tiddler-${String(i).padStart(3, "0")}`);
    const verdict: WikiCoherenceVerdict = {
      consistency: {
        radius: 1, glues: false, vacuous: false, pairs: [],
        obstructionLocus: loci, signalKind: "disagreement-signal",
      },
      gate: { kind: "ontological", dimH1: 1, cost: 0 },
      corpusSize: loci.length,
      asOf: [],
    };
    const summary = summarizeCoherence(verdict);
    expect(summary.obstructionLocus).toHaveLength(LOCI_CAP);
    expect(summary.lociTotal).toBe(LOCI_CAP + 8);
    expect(summary.obstructionLocus[0]).toBe("tiddler-000");
  });
});

describe("the ask-wire fails loud on BOTH ends", () => {
  test("a signal reaching a cap with NO live perceiver answers an ERROR frame (requestId echoed)", () => {
    const posted: Array<Record<string, unknown>> = [];
    const ctx = {
      wikiUri: "lar:///ha.ka.ba/bags/sense-cold",
      post: (msg: unknown) => { posted.push(msg as Record<string, unknown>); },
    } as unknown as IslandContext;

    const cap = hasWikiSensorium();
    // no onEa — the island never breathed; the claimed signal must still answer, loud.
    expect(cap.onSignal!(SENSORIUM_SIGNAL.cohere, { requestId: "cold-1" }, ctx)).toBe(true);
    expect(posted).toHaveLength(1);
    const payload = posted[0]!["payload"] as Record<string, unknown>;
    expect(payload["requestId"]).toBe("cold-1");
    expect(String(payload["error"])).toMatch(/no live perceiver/);
  });

  test("the supervisor rejects an ERROR frame and a null result — never resolves silently-null", async () => {
    const sent: Array<{ requestId: string }> = [];
    const supervisor = createWikiSenseSupervisor({
      supervises: () => true,
      sendSignal: (_island, msg) => { sent.push({ requestId: msg.requestId }); },
    }, { timeoutMs: 5_000 });
    try {
      const island = "lar:///ha.ka.ba/bags/sense-err";

      const errAsk = supervisor.cohere(island);
      expect(supervisor.acceptFrame(island, { requestId: sent[0]!.requestId, error: "the fold blew a shore" })).toBe(true);
      await expect(errAsk).rejects.toThrow(/the fold blew a shore/);

      const nullAsk = supervisor.cohere(island);
      expect(supervisor.acceptFrame(island, { requestId: sent[1]!.requestId, result: "null" })).toBe(true);
      await expect(nullAsk).rejects.toThrow(/null\/non-object/);
    } finally {
      supervisor.dispose();
    }
  });
});

describe("the non-finite recall limit falls back to the default", () => {
  test("recall with limit NaN answers exactly what the default-limit read answers", async () => {
    const island = await buildFixtureIsland("lar:///ha.ka.ba/bags/sense-limit", GLUE_SEEDS);
    const sense = createWikiSensorium(island);
    try {
      const poisoned = await sense.recall({ text: "canon", limit: Number.NaN });
      const defaulted = await sense.recall({ text: "canon" });
      expect(poisoned.content).toEqual(defaulted.content);
      expect(poisoned.content.length).toBeGreaterThan(0);
    } finally {
      sense.dispose();
    }
  });
});

describe("the unknown filter-suffix token refuses loud", () => {
  test("a residual token naming neither a tier nor ordinary answers the error string", () => {
    const op = { operator: "wikisense", operand: "canon", suffix: "recall:bogus" } as unknown as TW5FilterOperator;
    const out = wikisense(
      undefined as unknown as TW5FilterSource,
      op,
      { wiki: {} as TW5Wiki },
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/unknown suffix token "bogus"/);
  });
});

describe("a non-default proofBag round-trips", () => {
  const CUSTOM_BAG = "lar:///custom.heading.turns/proof-hold";

  test("build -> parse holds under a bag outside the @daemon shape", () => {
    const proof = {
      eventId: "ev-9", island: "lar:///ha.ka.ba/bags/sense-a", requestId: "sense-r9",
      asOf: [] as readonly string[],
      radius: 0, glues: true, vacuous: false,
      gateKind: "reconcilable" as const, dimH1: 0, cost: 0,
      obstructionLoci: [] as readonly string[], lociTotal: 0, corpusSize: 2,
    };
    const rec = buildProofRecordTiddler(proof, CUSTOM_BAG);
    expect(rec.tiddler.title.startsWith(proofLedgerPrefix(CUSTOM_BAG))).toBe(true);
    expect(isProofRecordUri(rec.tiddler.title, CUSTOM_BAG)).toBe(true);
    expect(parseProofRecord(rec.tiddler as Record<string, unknown>)).toEqual(proof);
  });
});
