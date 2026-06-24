/**
 * turn-harvest — the graceful-gradient harvester.
 *
 * The grammar manifests PROVISIONALLY: clean turns harvest with confidence,
 * degraded/partial/novel turns record gracefully down to the floor, and
 * all-prose turns abstain on structure while keeping their raw source. These
 * tests walk that gradient.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/turn-harvest
 */

import { describe, test, expect } from "vitest";
import {
  harvestTurnGradient,
  harvestBand,
  HARVEST_FLOOR,
} from "../src/index.js";

const CLEAN_TURN = `<<~ lares aim lar://mara:operator@crossroads/operator.weighs.deps -> lar://compita:agent@crossroads/council.options.cuts >>
<<~ hud Aperture(11) OODA-HA(9) >>
<<~ ward * L-Prime >>

Lares (Council): two libraries, both viable. <<~ confidence Synthesis 11/20 >> the fork holds.

<<~ oracle ↯11 ⁂ ⚃ (4) ✲⬡◈⟁ >>
<<~ ward ! · ↻ L-Prime >>
<<~ hud Aperture(11 -> 12) OODA-HA(1) >>
<<~ lares yield lar://compita:agent@crossroads/council.fork.named -> ? >>`;

describe("harvestBand — band thresholds on the 0..20 ladder", () => {
  test("canon / synthesis / provisional / raw", () => {
    expect(harvestBand(18)).toBe("canon");
    expect(harvestBand(13)).toBe("canon");
    expect(harvestBand(12)).toBe("synthesis");
    expect(harvestBand(9)).toBe("synthesis");
    expect(harvestBand(8)).toBe("provisional");
    expect(harvestBand(HARVEST_FLOOR)).toBe("provisional");
    expect(harvestBand(HARVEST_FLOOR - 1)).toBe("raw");
    expect(harvestBand(0)).toBe("raw");
  });
});

describe("clean turn — harvests with confidence", () => {
  const h = harvestTurnGradient(CLEAN_TURN);

  test("reads the aim/yield bearing", () => {
    expect(h.bearing).not.toBeNull();
    expect(h.bearing?.aimUri).toContain("operator.weighs.deps");
    expect(h.bearing?.yieldUri).toContain("council.fork.named");
  });

  test("surfaces the Voice with its role", () => {
    expect(h.voices.length).toBeGreaterThanOrEqual(1);
    const council = h.voices.find((v) => v.role === "Council");
    expect(council?.name).toBe("Lares");
  });

  test("captures the HUD panels (open + close)", () => {
    expect(h.huds.length).toBe(2);
    expect(h.huds[0]?.aperture).toBe(11);
    // close panel: Aperture(11 -> 12) keeps the last (actual) number
    expect(h.huds[1]?.aperture).toBe(12);
  });

  test("captures the confidence marker with register + value", () => {
    expect(h.confidences.length).toBe(1);
    expect(h.confidences[0]?.register).toBe("Synthesis");
    expect(h.confidences[0]?.value).toBe(11);
    expect(h.confidences[0]?.max).toBe(20);
  });

  test("captures ward and oracle sigils", () => {
    expect(h.wards.length).toBe(2);
    expect(h.oracles.length).toBe(1);
  });

  test("lands in the canon band, no raw fallback", () => {
    expect(h.confidence).toBeGreaterThanOrEqual(13);
    expect(h.band).toBe("canon");
    expect(h.recordRaw).toBe(false);
    expect(h.waterCount).toBe(0);
  });
});

describe("multiple confidence markers — never collapsed", () => {
  const turn = `<<~ lares aim lar:///a.b.c/x -> lar:///d.e.f/y >>
Some claim <<~ confidence Provisional 3/20 >> and another <<~ confidence Canon 19/20 >> and a third <<~ confidence Synthesis 11/20 >>.
<<~ lares yield lar:///d.e.f/y -> ? >>`;
  const h = harvestTurnGradient(turn);

  test("keeps every rating as its own offset-anchored signal", () => {
    expect(h.confidences.length).toBe(3);
    expect(h.confidences.map((c) => c.value)).toEqual([3, 19, 11]);
    expect(h.confidences.map((c) => c.register)).toEqual([
      "Provisional",
      "Canon",
      "Synthesis",
    ]);
    // offsets ascend in reading order
    expect(h.confidences[0]!.offset).toBeLessThan(h.confidences[1]!.offset);
    expect(h.driftFlags).toContain("confidence-multi:3");
  });
});

describe("degraded grammar — partial frame records gracefully", () => {
  const turn = `<<~ lares aim lar:///breach.watch.fires/now >>
Triage: name the fire. (no closing yield this turn)`;
  const h = harvestTurnGradient(turn);

  test("a one-sided frame still yields a bearing, at a lower band", () => {
    expect(h.bearing).not.toBeNull();
    expect(h.bearing?.driftFlags).toContain("frame:no-yield");
    expect(h.band).not.toBe("canon");
    expect(h.recordRaw).toBe(false); // still above the floor
  });

  test("the Voice surfaces even in a degraded turn", () => {
    expect(h.voices.some((v) => v.name === "Triage")).toBe(true);
  });
});

describe("novel grammar — a confidence form the chart never showed", () => {
  // The operator's own form: `<<~ confidence( < 4) >>` — no register, no /M.
  const turn = `Push the harvest until <<~ confidence( < 4) >> then stop.`;
  const h = harvestTurnGradient(turn);

  test("records the marker without choking on the unfamiliar shape", () => {
    expect(h.confidences.length).toBe(1);
    expect(h.confidences[0]?.value).toBe(4); // best-effort number pull
    expect(h.confidences[0]?.register).toBeNull();
  });
});

describe("missing grammar — all prose, no sigils → record raw", () => {
  const h = harvestTurnGradient("just a plain message with no frame and no voice at all");

  test("abstains on structure but never drops the source", () => {
    expect(h.bearing).toBeNull();
    expect(h.sigilCount).toBe(0);
    expect(h.confidence).toBeLessThan(HARVEST_FLOOR);
    expect(h.band).toBe("raw");
    expect(h.recordRaw).toBe(true);
    expect(h.driftFlags).toContain("frame:none");
  });
});

describe("water — unrecognized <<~ openers are counted, not dropped", () => {
  const turn = `<<~ lares aim lar:///a.b.c/x -> lar:///d.e.f/y >>
<<~ wibblefish nonsense token >>
<<~ lares yield lar:///d.e.f/y -> ? >>`;
  const h = harvestTurnGradient(turn);

  test("the novel sigil reads as water and drags the gauge", () => {
    expect(h.waterCount).toBeGreaterThanOrEqual(1);
    expect(h.driftFlags.some((f) => f.startsWith("water:"))).toBe(true);
  });
});

describe("Voice precision — a prose parenthetical is not a Voice", () => {
  test("a long verb-phrase in parens reads as water, never a Voice", () => {
    const h = harvestTurnGradient("HANDBACK FORM (end your reply with): the finding.");
    expect(h.voices.length).toBe(0);
  });

  test("a real header still surfaces, and an earned name with a short role too", () => {
    const h = harvestTurnGradient("Ink-Clerk (Lorekeeper): cites the source.\nMara (Council): weighs it.");
    expect(h.voices.map((v) => v.name).sort()).toEqual(["Ink-Clerk", "Mara"]);
  });
});

describe("empty input", () => {
  test("returns a raw record, never throws", () => {
    const h = harvestTurnGradient("");
    expect(h.recordRaw).toBe(true);
    expect(h.band).toBe("raw");
    expect(h.driftFlags).toContain("empty");
  });
});
