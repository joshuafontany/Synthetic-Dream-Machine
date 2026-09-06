/**
 * memetic-wikitext-sensorium — the concrete neither-top, co-located-peers instance.
 *
 * Proves: the reader stratifies a real memetic-wikitext sample into a skeletal tier (black) + red/base
 * strata + autosegmental associations; a fine-grain inline `<<~ confidence…>>` reads as a CROSS-BAND
 * signal (two axes, not forced-outer); the peer sub-sensoria compose (`#has {formal, informal}`,
 * coupling.children, neither top); and the coupling edge reads formal↔informal (directed) — through the
 * mesh keel's windowed-coupling RUNTIME over FFZ-aligned ticks, screened by the linearity gate.
 */

import { describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  stratify, bandForSpanLength, sigilInjectionQuery, SIGIL_INJECTION,
  stratumTicks, readKiStratum, ffzAlignTicks, readKiCorpus, coupleAligned,
  isFrameSigil, repairWellFormedness, intersectTiers, normalizeOcp,
  type AlignedTick, type FfzCell, type Stratification,
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
  "<<~ confidence Synthesis 12/20>>" +
  " the claim generates within the band it vows and the prose runs on after the marker leads it here " +
  "through the paragraph that follows in plain black text before the ward draws at the close of the turn. " +
  "<<~ ward ! · ↻ L-Prime>>";

describe("the reader — stratify (LI face): skeletal tier + red/base strata + associations", () => {
  test("splits into black skeletal anchors + red/base strata, source-CID pinned", () => {
    const s = stratify(SAMPLE);
    expect(s.sourceCid).toMatch(/^sha256:[0-9a-f]{64}$/);   // canonical algorithm-tagged form
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
    // TYPED multigraph: the edge is labeled by the sigil head; SEED-FORWARD spreads RIGHTWARD (marker-leads)
    expect(edge!.relation).toBe("confidence");
    expect(edge!.direction).toBe("rightward");
    // the ward at the CLOSE has no following prose → it docks LEFTWARD (the fallback)
    const wardIdx = s.strata.findIndex((st) => st.head === "ward");
    const wardEdge = s.associations.find((a) => a.stratum === wardIdx);
    expect(wardEdge!.relation).toBe("ward");
    expect(wardEdge!.direction).toBe("leftward");
  });

  test("the associations form a TYPED multigraph — distinct relations over one skeleton", () => {
    const s = stratify(SAMPLE);
    const relations = new Set(s.associations.map((a) => a.relation));
    // confidence-line ≠ ward-line — labeled, distinct typed relations (not one undifferentiated edge)
    expect(relations.has("confidence")).toBe(true);
    expect(relations.has("ward")).toBe(true);
    expect(relations.size).toBeGreaterThanOrEqual(2);
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
        lar: "lar:///ha.ka.ba/lares/api/memetic-wikitext-sensorium",
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

describe("the KI face — FFZ-aligned ticks through the windowed-coupling runtime", () => {
  test('the stratum scale walks Pulse-grain ticks and REFUSES to emit on a short text ("what it does")', () => {
    // the fine sample yields fewer Pulse cells than L ⇒ the runtime warms and emits NOTHING — the
    // anti-false-sovereign behavior, honest by construction (no fabricated coupling on thin data).
    const ticks = stratumTicks(SAMPLE);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]!.length).toBe(2);                 // one vector per child (red, black), aligned
    const read = readKiStratum(SAMPLE);
    expect(read.ticks).toBe(ticks.length);
    expect(read.warming).toBe(true);
    expect(read.coupling).toBeNull();
  });

  test("the corpus scale JOINS on a shared FFZ address — no shared grain ⇒ no ticks (no ordinal fakery)", () => {
    const formal: FfzCell[] = [
      { ffz: "session/T.A.M.1.0", vec: [0.9, 0.1] },
      { ffz: "session/T.A.M.1.1", vec: [0.7, 0.3] },
      { ffz: "session/T.A.M.2.0", vec: [0.4, 0.6] },
    ];
    // shares the first two addresses; the third informal address has NO formal match
    const informalShared: FfzCell[] = [
      { ffz: "session/T.A.M.1.0", vec: [0.8, 0.2] },
      { ffz: "session/T.A.M.1.1", vec: [0.6, 0.4] },
      { ffz: "session/T.A.M.9.9", vec: [0.1, 0.9] },
    ];
    expect(ffzAlignTicks(formal, informalShared).length).toBe(2);   // only the two SHARED addresses pair
    // disjoint addresses ⇒ ZERO ticks ⇒ warming, no coupling (the honest no-coupling)
    const informalDisjoint: FfzCell[] = [{ ffz: "session/T.A.M.5.5", vec: [0.5, 0.5] }];
    const read = readKiCorpus(formal, informalDisjoint);
    expect(read.ticks).toBe(0);
    expect(read.warming).toBe(true);
    expect(read.coupling).toBeNull();
  });

  test("the runtime reads the DIRECTED edge over aligned ticks: formal LEADS informal (a lagged echo)", () => {
    // a deterministic pseudo-random driver; informal is formal's PAST plus light noise → formal→informal
    const N = 260;
    let a = 123456789, b = 987654321;
    const rng = (): number => { a = (1103515245 * a + 12345) & 0x7fffffff; return (a / 0x7fffffff) - 0.5; };
    const noise = (): number => { b = (1103515245 * b + 54321) & 0x7fffffff; return ((b / 0x7fffffff) - 0.5) * 0.1; };
    const drive: number[] = Array.from({ length: N }, () => rng());
    const ticks: AlignedTick[] = drive.map((x, t) => [[x + noise()], [(t > 0 ? drive[t - 1]! : 0) + noise()]]);
    // L=30 window, high change-threshold so the stationary echo is not spuriously reset mid-stream
    const read = coupleAligned(["formal", "informal"], ticks, { L: 30, lag: 1, alpha: 0.05, changeThreshold: 12 });
    expect(read.warming).toBe(false);
    expect(read.coupling).not.toBeNull();
    expect(read.coupling!.strongestEdge).not.toBeNull();
    expect(read.coupling!.strongestEdge!.from).toBe("formal");
    expect(read.coupling!.strongestEdge!.to).toBe("informal");
    // the Tier-0 linearity screen ran on the primary channel (a verdict, not silence)
    expect(read.linearity).not.toBeNull();
    expect(typeof read.escalate).toBe("boolean");
  });
});

// A two-frame sample: an `ahu` block A holds a MID steer (governs in-block prose) + a TAIL steer that
// reaches past the block boundary into block B — the NCC case (Coleman & Local). Then block B's prose.
const TWO_FRAME =
  "<<~ ahu #alpha>>\n" +
  "Alpha prose runs here as plain black text before the mid marker leads it forward in this block. " +
  "<<~ confidence Synthesis 12/20>>" +
  " the mid steer governs this in-block prose that follows it directly inside the very same frame here. " +
  "<<~ ward ! · ↻ L-Prime>>" +
  "\n<<~/ahu>>\n" +
  "<<~ ahu #beta>>\n" +
  "Beta prose runs here after the boundary and belongs to a wholly different frame than the alpha block. " +
  "<<~/ahu>>";

describe("the autosegmental follow-ups — NCC float-dock (Coleman & Local, crucible-F2)", () => {
  test("ahu / control sigils read as FRAMING boundaries; named sigils do not", () => {
    expect(isFrameSigil("ahu")).toBe(true);
    expect(isFrameSigil("control-stx")).toBe(true);
    expect(isFrameSigil("confidence")).toBe(false);
    expect(isFrameSigil("ward")).toBe(false);
  });

  test("a steer reaching PAST a framing boundary FLOATS + DOCKS (never spreads across)", () => {
    const s = stratify(TWO_FRAME);
    // the ahu strata are framing, not steering — and they emit NO association (they bound, not spread)
    const ahus = s.strata.map((st, i) => ({ st, i })).filter(({ st }) => st.frame);
    expect(ahus.length).toBeGreaterThanOrEqual(2);
    for (const { i } of ahus) expect(s.associations.some((a) => a.stratum === i)).toBe(false);

    // the MID confidence steer governs in-block prose — an ordinary domain-local spread (no float)
    const confIdx = s.strata.findIndex((st) => st.head === "confidence");
    const confEdge = s.associations.find((a) => a.stratum === confIdx)!;
    expect(confEdge.direction).toBe("rightward");
    expect(confEdge.floatDock).toBe(false);

    // the TAIL ward steer's nearest prose sits in block BETA, past two frame boundaries → FLOAT + DOCK
    const wardIdx = s.strata.findIndex((st) => st.head === "ward");
    const wardEdge = s.associations.find((a) => a.stratum === wardIdx)!;
    expect(wardEdge.direction).toBe("rightward");
    expect(wardEdge.floatDock).toBe(true);   // the licensed hand-off, not a spread-across
    // it docks at block BETA's boundary anchor, never governing the intervening frame
    const beta = s.skeletal[wardEdge.anchor]!;
    expect(TWO_FRAME.slice(beta.span[0], beta.span[1])).toContain("Beta prose");
  });
});

describe("the autosegmental follow-ups — WFC minimal-repair (Goldsmith Proposal 4)", () => {
  test("an unmarked prose anchor DEFAULT-FILLS the ambient register (repair, never reject)", () => {
    const s = stratify(SAMPLE);
    // the opening paragraph anchor is UNMARKED — confidence spreads right, ward docks to the middle
    const before = new Set(s.associations.map((a) => a.anchor));
    expect(before.has(0)).toBe(false);

    const r = repairWellFormedness(s);
    // the li (strata · skeletal) is untouched — repair only ADDS association edges
    expect(r.strata).toBe(s.strata);
    expect(r.skeletal).toBe(s.skeletal);
    expect(r.associations.length).toBeGreaterThan(s.associations.length);

    // anchor 0 now carries a DEFAULT-FILL edge — the ambient register spread onto it (no rejection)
    const fill = r.associations.find((a) => a.anchor === 0 && a.defaultFill);
    expect(fill).toBeDefined();
    expect(fill!.relation).toBe("confidence");   // the nearest in-domain steer spread leftward
    expect(fill!.direction).toBe("leftward");
  });

  test("a text with NO steer leaves black prose well-formed (pure ambient, no float added)", () => {
    const plain = stratify("Just plain black prose here with no red sigils at all in the whole span.");
    const r = repairWellFormedness(plain);
    expect(r.associations.length).toBe(0);   // nothing to spread — the ambient IS black, well-formed
  });
});

describe("the autosegmental follow-ups — B&E FST-intersection validity (Bird & Ellison 1994)", () => {
  test("a well-formed parse synchronizes → NON-EMPTY intersection (valid)", () => {
    expect(intersectTiers(stratify(SAMPLE)).valid).toBe(true);
    expect(intersectTiers(stratify(TWO_FRAME)).valid).toBe(true);
    // the repaired parse stays well-formed
    expect(intersectTiers(repairWellFormedness(stratify(SAMPLE))).valid).toBe(true);
  });

  test("a hand-CROSSED association graph → EMPTY intersection (invalid, the honest rejection)", () => {
    const s = stratify(SAMPLE);
    const crossed: Stratification = {
      ...s,
      associations: [
        { stratum: 0, anchor: 1, relation: "a", direction: "rightward", crossBand: false, floatDock: false, defaultFill: false },
        { stratum: 1, anchor: 0, relation: "b", direction: "leftward", crossBand: false, floatDock: false, defaultFill: false },
      ],
    };
    const v = intersectTiers(crossed);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/cross|No-Crossing/i);
  });
});

describe("the autosegmental follow-ups — OCP normalization (adjacent-identical collapse)", () => {
  test("two adjacent identical red autosegments collapse to one", () => {
    const doubled =
      "Some black prose leads in here before the doubled marker appears twice in the stream. " +
      "<<~ confidence Synthesis 12/20>> <<~ confidence Synthesis 12/20>>" +
      " and the prose runs on after the collapsed contour settles into one register cleanly.";
    const s = stratify(doubled);
    expect(s.strata.length).toBe(2);                 // two identical islands before OCP
    const n = normalizeOcp(s);
    expect(n.strata.length).toBe(1);                 // OCP collapses adjacent-identical → one
    expect(n.strata[0]!.head).toBe("confidence");
    // the surviving stratum spans BOTH originals (the merged contour)
    expect(n.strata[0]!.span[0]).toBe(s.strata[0]!.span[0]);
    expect(n.strata[0]!.span[1]).toBe(s.strata[1]!.span[1]);
  });

  test("a NON-identical contour (different value) does NOT collapse", () => {
    const distinct =
      "Lead prose here now before two DIFFERENT markers appear back to back in the same stream span. " +
      "<<~ confidence Synthesis 12/20>> <<~ confidence Provisional 3/20>>" +
      " tail prose runs on here after the genuine contour that OCP must preserve intact and whole.";
    const s = stratify(distinct);
    expect(s.strata.length).toBe(2);
    expect(normalizeOcp(s).strata.length).toBe(2);   // a real contour survives — OCP does not over-collapse
  });
});
