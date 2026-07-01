/**
 * memetic-wikitext-sensorium — the concrete neither-top, co-located-peers instance.
 *
 * Proves: the reader stratifies a real memetic-wikitext sample into a skeletal tier (black) + red/base
 * strata + autosegmental associations; a fine-grain inline `<<~ confidence… >>` reads as a CROSS-BAND
 * signal (two axes, not forced-outer); the peer sub-sensoria compose (`#has {formal, informal}`,
 * coupling.children, neither top); and the coupling edge reads formal↔informal (directed) via coupleMesh.
 */

import { describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChildSignalMV } from "@lararium/mesh";
import {
  stratify, bandForSpanLength, sigilInjectionQuery, SIGIL_INJECTION,
  channelSignals, readKiStratum, corpusSignals, readKiCorpus, coupleStreams,
  buildMemeticWikitextSensorium, buildPeerSensorium,
} from "../src/memetic-wikitext-sensorium.js";

// A realistic memetic-wikitext sample: a coarse prose paragraph, a FINE inline control-sigil mid-flow,
// more prose, then a `ward` base-sigil carrying a bare Mu operator.
const PARA =
  "The house speaks a living grammar and this palace remembers how it moved not only what it " +
  "said while the verbatim mempalace keeps the content the words a turn carried and the form names " +
  "the moves the constructicon in use across the whole arc of the session as it settles into shape. ";
const SAMPLE =
  PARA +
  "<<~ confidence Synthesis 12/20 >>" +
  " the claim generates within the band it vows and the prose runs on after the marker leads it here " +
  "through the paragraph that follows in plain black text before the ward draws at the close of the turn. " +
  "<<~ ward ! · ↻ L-Prime >>";

describe("the reader — stratify (LI face): skeletal tier + red/base strata + associations", () => {
  test("splits into black skeletal anchors + red/base strata, source-CID pinned", () => {
    const s = stratify(SAMPLE);
    expect(s.sourceCid).toMatch(/^sha256-[0-9a-f]{64}$/);
    // two sigils → two strata; the prose gaps → skeletal anchors
    expect(s.strata.length).toBe(2);
    expect(s.skeletal.length).toBeGreaterThanOrEqual(2);
    // every stratum pins the same source
    for (const st of s.strata) expect(st.sourceCid).toBe(s.sourceCid);
  });

  test("the `ward !` sigil tags the BASE channel with its Mu operator (base-4 refinement)", () => {
    const s = stratify(SAMPLE);
    const ward = s.strata.find((st) => SAMPLE.slice(st.span[0], st.span[1]).includes("ward"));
    expect(ward).toBeDefined();
    expect(ward!.channel).toBe("base");
    expect(ward!.muOp).toBe("!");
    // the plain confidence sigil is RED, not base (a named control-sigil, not a bare Mu operator)
    const conf = s.strata.find((st) => SAMPLE.slice(st.span[0], st.span[1]).includes("confidence"));
    expect(conf!.channel).toBe("red");
    expect(conf!.muOp).toBeUndefined();
  });
});

describe("the two axes — span × channel: the cross-band proof", () => {
  test("a FINE inline control-sigil keeps its own span-band AND crosses to a COARSE anchor", () => {
    const s = stratify(SAMPLE);
    const confIdx = s.strata.findIndex((st) => SAMPLE.slice(st.span[0], st.span[1]).includes("confidence"));
    const conf = s.strata[confIdx]!;
    // SPAN axis: the sigil's own bytes are few → Pulse (fine), NOT forced up to the paragraph band
    expect(conf.band).toBe("Pulse");
    // CHANNEL axis: independent of span — red, a categorical KIND
    expect(conf.channel).toBe("red");
    // the association edge crosses bands: fine stratum on a coarse anchor
    const edge = s.associations.find((a) => a.stratum === confIdx);
    expect(edge).toBeDefined();
    const anchor = s.skeletal[edge!.anchor]!;
    expect(anchor.band === "Measure" || anchor.band === "Arc").toBe(true);   // the paragraph is coarse
    expect(edge!.crossBand).toBe(true);                                       // NOT flattened to the outer band
  });

  test("bandForSpanLength maps length → aperture band, fine→coarse", () => {
    expect(bandForSpanLength(10)).toBe("Pulse");
    expect(bandForSpanLength(80)).toBe("Beat");
    expect(bandForSpanLength(250)).toBe("Measure");
    expect(bandForSpanLength(800)).toBe("Arc");
    expect(bandForSpanLength(5000)).toBe("Theme");
  });
});

describe("the tree-sitter injection config — disjoint-partition ≅ injection", () => {
  test("emits an injection query over the sharktooth ranges", () => {
    const scm = sigilInjectionQuery();
    expect(scm).toContain(SIGIL_INJECTION.rangeNode);
    expect(scm).toContain(`injection.language "${SIGIL_INJECTION.injected}"`);
    expect(scm).toContain("@injection.content");
  });
});

describe("the compose — `#has {formal, informal}`: neither top", () => {
  test("the top sensorium holds NO fiber cap and TWO peers as coupling.children", () => {
    const root = mkdtempSync(join(tmpdir(), "lar-mw-sensorium-"));
    try {
      const m = buildMemeticWikitextSensorium(root, {
        lar: "lar:///ha.ka.ba/@lares/api/lares/memetic-wikitext-sensorium",
        formalDir: join(root, "formal"),
        informalDir: join(root, "informal"),
        created: "2026-07-01T00:00:00.000Z",
      });
      // NEITHER top: the peers ride coupling.children, not has.*
      expect(Object.keys(m.has)).toEqual([]);
      expect(m.coupling.children.map((c) => c.sensorium)).toEqual(["formal", "informal"]);
      expect(m.coupling.children.map((c) => c.dir)).toEqual(["formal", "informal"]);   // nested-relative
      // the ki base-cap: the aperture-ladder grain
      expect(m.bands["grain"]).toBe("aperture");
      // the peers are themselves sensoria (content-cap)
      const f = buildPeerSensorium(join(root, "formal"), "formal", "lar:///f", "memes-on-disk");
      const i = buildPeerSensorium(join(root, "informal"), "informal", "lar:///i", "chat-sessions");
      expect(f.has["content"]!.engine).toBe("memes-on-disk");
      expect(i.has["content"]!.engine).toBe("chat-sessions");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the KI face — the fractal coupler through coupleMesh", () => {
  test("the stratum scale reads red↔black on a real text", () => {
    const streams = channelSignals(SAMPLE, 24);
    expect(streams.map((s) => s.name)).toEqual(["red", "black"]);
    // both children share the SAME window grid (aligned time axis)
    expect(streams[0]!.signal.length).toBe(streams[1]!.signal.length);
    const mc = readKiStratum(SAMPLE, 24);
    expect(mc.children).toEqual(["red", "black"]);
    expect(mc.te.length).toBe(2);
  });

  test("the corpus scale reads formal↔informal — the SAME coupler, one scale up", () => {
    const streams = corpusSignals(PARA, SAMPLE, 24);
    expect(streams.map((s) => s.name)).toEqual(["formal", "informal"]);
    expect(streams[0]!.signal.length).toBe(streams[1]!.signal.length);
    const mc = readKiCorpus(PARA, SAMPLE, 24);
    expect(mc.children).toEqual(["formal", "informal"]);
  });

  test("coupleStreams reads the DIRECTED edge: formal LEADS informal (a lagged echo)", () => {
    // a deterministic pseudo-random driver; informal is formal's PAST plus light noise → formal→informal
    const N = 220;
    let a = 123456789, b = 987654321;
    const rng = (): number => { a = (1103515245 * a + 12345) & 0x7fffffff; return (a / 0x7fffffff) - 0.5; };
    const noise = (): number => { b = (1103515245 * b + 54321) & 0x7fffffff; return ((b / 0x7fffffff) - 0.5) * 0.15; };
    const drive: number[] = Array.from({ length: N }, () => rng());
    const formal: ChildSignalMV = { name: "formal", signal: drive.map((x) => [x + noise()]) };
    const informal: ChildSignalMV = {
      name: "informal",
      signal: drive.map((_, t) => [(t > 0 ? drive[t - 1]! : 0) + noise()]),
    };
    const mc = coupleStreams([formal, informal], { alpha: 0.05, lag: 1 });
    expect(mc.strongestEdge).not.toBeNull();
    expect(mc.strongestEdge!.from).toBe("formal");
    expect(mc.strongestEdge!.to).toBe("informal");
    expect(mc.strongestEdge!.coupling).toBeGreaterThan(0);
  });
});
