/**
 * constructicon-basis.test.ts — P0: the discrete-plane axis basis.
 *
 * The basis must be STABLE (same grammar → same axis-list every wake), cover the
 * three grammar layers + the Voices + the OODA-HA phases + the ward-states, and
 * carry each sigil's parent family + grammar-layer band.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#two-planes
 */

import { describe, test, expect } from "vitest";
import {
  buildConstructiconBasis,
  GRAMMAR_LAYERS,
  VOICE_ROLES,
  OODA_HA_PHASES,
  WARD_STATES,
  CATEGORY_ORDER,
  resolveVoiceRole,
  phaseForGlyph,
  wardStateForGlyph,
  type ConstructiconBasis,
  type GrammarRules,
} from "../src/form-layer/index.js";

// A grammar fixture mirroring the real sigil-*.tid kinds + families.
const GRAMMAR: GrammarRules = {
  families: [
    { name: "relation", dagRequired: false, roleRecommended: false, confidenceBounded: false },
    { name: "dataflow", dagRequired: false, roleRecommended: true, confidenceBounded: false },
    { name: "control", dagRequired: true, roleRecommended: true, confidenceBounded: false },
    { name: "observe", dagRequired: false, roleRecommended: false, confidenceBounded: true },
  ],
  sigils: [
    { name: "lares", kind: "metadata" },
    { name: "hud", kind: "metadata" },
    { name: "ward", kind: "metadata" },
    { name: "confidence", kind: "metadata" },
    { name: "syad", kind: "metadata" },
    { name: "oracle", kind: "metadata" },
    { name: "loulou", kind: "edge-sugar", defaultFamily: "relation" },
    { name: "aka", kind: "edge-sugar", defaultFamily: "observe" },
    { name: "kahea", kind: "edge-sugar", defaultFamily: "dataflow" },
    { name: "pranala", kind: "edge", defaultFamily: "relation" },
    { name: "if", kind: "conditional" },
    { name: "ahu", kind: "header" },
  ],
};

describe("buildConstructiconBasis — canon axes always present", () => {
  const basis = buildConstructiconBasis(GRAMMAR);

  test("covers the 3 grammar layers", () => {
    for (const layer of GRAMMAR_LAYERS) {
      expect(basis.index.has(`layer:${layer}`)).toBe(true);
    }
    expect(GRAMMAR_LAYERS.length).toBe(3);
  });

  test("covers the 13 Voices", () => {
    for (const role of VOICE_ROLES) {
      expect(basis.index.has(`voice:${role}`)).toBe(true);
    }
    expect(VOICE_ROLES.length).toBe(13);
  });

  test("covers the 5 OODA-HA phases", () => {
    for (const phase of OODA_HA_PHASES) {
      expect(basis.index.has(`phase:${phase.name}`)).toBe(true);
    }
    expect(OODA_HA_PHASES.length).toBe(5);
  });

  test("covers the 5 ward-states", () => {
    for (const ward of WARD_STATES) {
      expect(basis.index.has(`ward:${ward.name}`)).toBe(true);
    }
    expect(WARD_STATES.length).toBe(5);
  });
});

describe("buildConstructiconBasis — grammar-derived axes", () => {
  const basis = buildConstructiconBasis(GRAMMAR);

  test("one axis per family + per sigil", () => {
    for (const fam of GRAMMAR.families) expect(basis.index.has(`family:${fam.name}`)).toBe(true);
    for (const sig of GRAMMAR.sigils) expect(basis.index.has(`sigil:${sig.name}`)).toBe(true);
  });

  test("a sigil axis carries its parent family + x-memetic layer + kind", () => {
    const i = basis.index.get("sigil:loulou")!;
    const loulou = basis.axes[i]!;
    expect(loulou.parentFamily).toBe("relation");
    expect(loulou.layer).toBe("x-memetic");
    expect(loulou.sigilKind).toBe("edge-sugar");
  });

  test("a sigil without a declared family carries a null parent", () => {
    const i = basis.index.get("sigil:hud")!;
    expect(basis.axes[i]!.parentFamily).toBeNull();
  });

  test("dimension = canon (3+13+5+5=26) + families + sigils", () => {
    const canon = 3 + 13 + 5 + 5;
    expect(basis.dimension).toBe(canon + GRAMMAR.families.length + GRAMMAR.sigils.length);
  });
});

describe("buildConstructiconBasis — stability + ordering", () => {
  test("same grammar → identical axis-list (deterministic)", () => {
    const a = buildConstructiconBasis(GRAMMAR);
    const b = buildConstructiconBasis(GRAMMAR);
    expect(a.axes.map((x) => x.id)).toEqual(b.axes.map((x) => x.id));
  });

  test("a re-ordered grammar → identical axis-list (sorted inside wells)", () => {
    const shuffled: GrammarRules = {
      families: [...GRAMMAR.families].reverse(),
      sigils: [...GRAMMAR.sigils].reverse(),
    };
    const a = buildConstructiconBasis(GRAMMAR);
    const b = buildConstructiconBasis(shuffled);
    expect(a.axes.map((x) => x.id)).toEqual(b.axes.map((x) => x.id));
  });

  test("categories ride CATEGORY_ORDER, never interleaved", () => {
    const basis = buildConstructiconBasis(GRAMMAR);
    const seen: string[] = [];
    for (const ax of basis.axes) {
      if (seen[seen.length - 1] !== ax.category) seen.push(ax.category);
    }
    // each category appears as one contiguous run, in CATEGORY_ORDER
    expect(seen).toEqual(CATEGORY_ORDER.filter((c) => seen.includes(c)));
  });

  test("array position matches the index map", () => {
    const basis = buildConstructiconBasis(GRAMMAR);
    basis.index.forEach((pos, id) => {
      expect(basis.axes[pos]!.id).toBe(id);
    });
  });

  test("a duplicate sigil name pins exactly once", () => {
    const withDup: GrammarRules = {
      families: GRAMMAR.families,
      sigils: [...GRAMMAR.sigils, { name: "loulou", kind: "edge-alias", aliasFor: "loulou" }],
    };
    const basis = buildConstructiconBasis(withDup);
    const count = basis.axes.filter((a) => a.id === "sigil:loulou").length;
    expect(count).toBe(1);
  });
});

describe("buildConstructiconBasis — canon-only (no grammar)", () => {
  test("returns just the 26 canon axes", () => {
    const basis: ConstructiconBasis = buildConstructiconBasis();
    expect(basis.dimension).toBe(3 + 13 + 5 + 5);
    expect(basis.axes.every((a) => a.category !== "sigil" && a.category !== "family")).toBe(true);
  });
});

describe("resolvers — harvested marker → canonical axis", () => {
  test("resolveVoiceRole: role wins, then name, then handle", () => {
    expect(resolveVoiceRole("Lares", "Council")).toBe("council");
    expect(resolveVoiceRole("Scryer", null)).toBe("scryer");
    expect(resolveVoiceRole("Map-Wisp", null)).toBe("scryer"); // named handle
    expect(resolveVoiceRole("Ink-Clerk", null)).toBe("lorekeeper");
    expect(resolveVoiceRole("Lares", null)).toBeNull(); // bare default persona
    expect(resolveVoiceRole("Mara", "Quartermaster")).toBeNull(); // novel
  });

  test("phaseForGlyph maps the five OODA-HA glyphs", () => {
    expect(phaseForGlyph("✶")).toBe("observe");
    expect(phaseForGlyph("⏿")).toBe("orient");
    expect(phaseForGlyph("◇")).toBe("decide");
    expect(phaseForGlyph("▶")).toBe("act");
    expect(phaseForGlyph("↺")).toBe("aftermath");
    expect(phaseForGlyph("x")).toBeNull();
  });

  test("wardStateForGlyph maps the five Mu tools", () => {
    expect(wardStateForGlyph("*")).toBe("wand");
    expect(wardStateForGlyph("0")).toBe("arcana");
    expect(wardStateForGlyph("_")).toBe("pentacle");
    expect(wardStateForGlyph("?")).toBe("cup");
    expect(wardStateForGlyph("!")).toBe("sword");
    expect(wardStateForGlyph(null)).toBeNull();
  });
});
