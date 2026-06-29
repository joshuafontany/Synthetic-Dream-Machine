/**
 * move-skeleton.test.ts — P1: the move-skeleton emitter, on real turns.
 *
 * The emitter folds a TurnHarvest + a meme-ast tree into (a) the linear marker
 * stream with prose stripped to `_`, and (b) the placeholdered graph. It is
 * validated against turn-harvest's own corpora (real turns).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace#two-planes
 */

import { describe, test, expect } from "vitest";
import { harvestTurnGradient } from "@lararium/mesh";
import {
  emitMoveSkeleton,
  placeholderTree,
  type MoveToken,
  type MemeAstNode,
} from "../src/form-layer/index.js";

// Hand-built meme-ast fixtures. The emitter is PURE over a tree shape; the tree
// is the VM-sovereign parser's output, so the unit test constructs the shape
// directly rather than reaching into the meme-ast parser (vm-grammar-boundary).
function ahu(slot: string, body: MemeAstNode[]): MemeAstNode {
  return { kind: "Ahu", pos: 0, raw: "", slot, uri: `lar:///x${slot}`, delegate: null, body } as unknown as MemeAstNode;
}
function text(content: string, pos = 0): MemeAstNode {
  return { kind: "Text", pos, raw: content, content } as unknown as MemeAstNode;
}
function sugar(sigil: string, family: string, pos = 0): MemeAstNode {
  return {
    kind: "PranalaSugar",
    pos,
    raw: "",
    sigil,
    slot: null,
    fromRaw: null,
    toRaw: "lar:///x.y.z/target",
    family,
    role: null,
    listenable: null,
    subscribable: null,
  } as unknown as MemeAstNode;
}
function sigilNode(name: string, attrs: Record<string, string>, pos = 0): MemeAstNode {
  return { kind: "Sigil", pos, raw: "", sigilName: name, attrs, body: [] } as unknown as MemeAstNode;
}

// The clean worked turn (mirrors turn-harvest.test.ts CLEAN_TURN).
const CLEAN_TURN = `<<~ lares aim lar://mara:operator@crossroads/operator.weighs.deps -> lar://compita:agent@crossroads/council.options.cuts >>
<<~ hud Aperture(11) OODA-HA(9) >>
<<~ ward * L-Prime >>

Lares (Council): two libraries, both viable. <<~ confidence Synthesis 11/20 >> the fork holds.

<<~ oracle ↯11 ⁂ ⚃ (4) ✲⬡◈⟁ >>
<<~ ward ! · ↻ L-Prime >>
<<~ hud Aperture(11 -> 12) OODA-HA(1↺) >>
<<~ lares yield lar://compita:agent@crossroads/council.fork.named -> ? >>`;

function tokensOfKind(stream: readonly MoveToken[], kind: MoveToken["kind"]): MoveToken[] {
  return stream.filter((t) => t.kind === kind);
}

describe("emitMoveSkeleton — the clean turn", () => {
  const h = harvestTurnGradient(CLEAN_TURN);
  const sk = emitMoveSkeleton(h);

  test("the bearing frame brackets the stream (aim first, yield last)", () => {
    const first = sk.stream[0]!;
    const last = sk.stream[sk.stream.length - 1]!;
    expect(first.kind).toBe("bearing");
    expect(first.token).toBe("aim");
    expect(last.kind).toBe("bearing");
    expect(last.token).toBe("yield");
  });

  test("the Voice resolves to its canonical role axis", () => {
    const voices = tokensOfKind(sk.stream, "voice");
    expect(voices.length).toBe(1);
    expect(voices[0]!.token).toBe("council");
    expect(voices[0]!.axisId).toBe("voice:council");
  });

  test("ward-states resolve via their Mu glyph (wand open, sword close)", () => {
    const wards = tokensOfKind(sk.stream, "ward");
    expect(wards.map((w) => w.token)).toEqual(["wand", "sword"]);
    expect(wards.map((w) => w.axisId)).toEqual(["ward:wand", "ward:sword"]);
  });

  test("a phase token rides off the closing HUD's OODA-HA glyph", () => {
    const phases = tokensOfKind(sk.stream, "phase");
    expect(phases.some((p) => p.token === "aftermath")).toBe(true);
    expect(phases.every((p) => p.axisId?.startsWith("phase:"))).toBe(true);
  });

  test("prose is stripped — no source words survive in the stream", () => {
    const content = tokensOfKind(sk.stream, "content");
    expect(content.length).toBeGreaterThan(0);
    expect(content.every((c) => c.token === "_")).toBe(true);
    const blob = sk.stream.map((t) => t.token).join(" ");
    expect(blob).not.toContain("libraries");
    expect(blob).not.toContain("viable");
    expect(blob).not.toContain("fork");
  });

  test("order is preserved (offsets ascend between the frame legs)", () => {
    const inner = sk.stream.filter((t) => t.kind !== "bearing" && t.kind !== "water");
    const offsets = inner.map((t) => t.offset);
    const sorted = [...offsets].sort((a, b) => a - b);
    expect(offsets).toEqual(sorted);
  });

  test("the harvest band carries through", () => {
    expect(sk.band).toBe(h.band);
    expect(sk.band).toBe("canon");
  });

  test("counts agree with the stream", () => {
    expect(sk.counts.tokens).toBe(sk.stream.length);
    expect(sk.counts.content).toBe(tokensOfKind(sk.stream, "content").length);
    expect(sk.counts.voices).toBe(1);
    expect(sk.counts.wards).toBe(2);
  });
});

describe("emitMoveSkeleton — multiple confidence markers (never collapsed)", () => {
  const turn = `<<~ lares aim lar:///a.b.c/x -> lar:///d.e.f/y >>
Some claim <<~ confidence Provisional 3/20 >> and another <<~ confidence Canon 19/20 >> and a third <<~ confidence Synthesis 11/20 >>.
<<~ lares yield lar:///d.e.f/y -> ? >>`;
  const h = harvestTurnGradient(turn);
  const sk = emitMoveSkeleton(h);

  test("every confidence marker rides the stream as its own token", () => {
    const conf = tokensOfKind(sk.stream, "confidence");
    expect(conf.length).toBe(3);
    expect(conf.every((c) => c.axisId === "sigil:confidence")).toBe(true);
  });
});

describe("emitMoveSkeleton — degraded turn (one-sided frame)", () => {
  const turn = `<<~ lares aim lar:///breach.watch.fires/now >>
Triage: name the fire. (no closing yield this turn)`;
  const h = harvestTurnGradient(turn);
  const sk = emitMoveSkeleton(h);

  test("aim opens, no yield closes — the frame degrades, never throws", () => {
    expect(sk.stream[0]!.token).toBe("aim");
    expect(tokensOfKind(sk.stream, "bearing").some((b) => b.token === "yield")).toBe(false);
  });

  test("the Triage Voice still surfaces and resolves", () => {
    const voices = tokensOfKind(sk.stream, "voice");
    expect(voices.some((v) => v.token === "triage")).toBe(true);
  });
});

describe("emitMoveSkeleton — water (unrecognized openers)", () => {
  const turn = `<<~ lares aim lar:///a.b.c/x -> lar:///d.e.f/y >>
<<~ wibblefish nonsense token >>
<<~ lares yield lar:///d.e.f/y -> ? >>`;
  const h = harvestTurnGradient(turn);
  const sk = emitMoveSkeleton(h);

  test("water tokens trail the stream, count-matched", () => {
    const water = tokensOfKind(sk.stream, "water");
    expect(water.length).toBe(h.waterCount);
    expect(water.length).toBeGreaterThanOrEqual(1);
  });
});

describe("emitMoveSkeleton — all-prose turn (record raw)", () => {
  const turn = "just a plain message with no frame and no voice at all";
  const h = harvestTurnGradient(turn);
  const sk = emitMoveSkeleton(h);

  test("no markers → an empty-or-content stream, band raw, never throws", () => {
    expect(sk.band).toBe("raw");
    expect(tokensOfKind(sk.stream, "voice").length).toBe(0);
    expect(tokensOfKind(sk.stream, "bearing").length).toBe(0);
  });
});

describe("placeholderTree — leaf content blanked, structure kept", () => {
  // An Ahu scope holding prose + a loulou edge — the shape a real turn parses to.
  const tree: MemeAstNode[] = [
    ahu("#section", [
      text("a claim with real words inside."),
      sugar("loulou", "relation"),
    ]),
  ];
  const graph = placeholderTree(tree);

  test("every node's content is the `_` placeholder, recursively", () => {
    const walk = (nodes: ReturnType<typeof placeholderTree>): void => {
      for (const n of nodes) {
        expect(n.content).toBe("_");
        walk(n.children as ReturnType<typeof placeholderTree>);
      }
    };
    walk(graph);
  });

  test("no source words survive anywhere in the graph", () => {
    const blob = JSON.stringify(graph);
    expect(blob).not.toContain("claim");
    expect(blob).not.toContain("words");
    expect(blob).not.toContain("inside");
  });

  test("kind + slot + sigil + family survive as shape", () => {
    const root = graph[0]!;
    expect(root.kind).toBe("Ahu");
    expect(root.slot).toBe("#section");
    const edge = root.children[1]!;
    expect(edge.kind).toBe("PranalaSugar");
    expect(edge.sigil).toBe("loulou");
    expect(edge.family).toBe("relation");
  });

  test("attrs reduce to KEYS only (values blanked)", () => {
    const t = placeholderTree([sigilNode("kau", { name: "topspeed", value: "88", scope: "global" })]);
    const node = t[0]!;
    // keys kept, sorted; values gone; no raw `attrs` object survives.
    expect(node.attrKeys).toEqual(["name", "scope", "value"]);
    const blob = JSON.stringify(t);
    expect(blob).not.toMatch(/"attrs"\s*:/);
    expect(blob).not.toContain("topspeed");
    expect(blob).not.toContain("88");
  });

  test("the resilient gradient (recoveredAs · confidence) is carried through", () => {
    const errored: MemeAstNode = {
      kind: "Error",
      pos: 0,
      raw: "<<~ broken",
      content: "broken span verbatim",
      reason: "unclosed-frame",
      recoveredAs: "water",
      confidence: 3,
    } as unknown as MemeAstNode;
    const node = placeholderTree([errored])[0]!;
    expect(node.recoveredAs).toBe("water");
    expect(node.confidence).toBe(3);
    expect(node.content).toBe("_");
    expect(JSON.stringify(node)).not.toContain("verbatim");
  });
});
