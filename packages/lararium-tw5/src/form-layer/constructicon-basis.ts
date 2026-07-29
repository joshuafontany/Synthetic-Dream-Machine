/**
 * constructicon-basis — P0 of the living-grammar form-layer (the discrete plane).
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#two-planes
 *
 * The two-planes form-capture rides a DISCRETE constructicon (the canonical
 * score — the grammar-SEED / spec / axes) ⋈ a CONTINUOUS fuzzy-membership
 * vector (the performance). This module pins the DISCRETE plane: it enumerates
 * the constructicon AXES the form-vector will index against — a stable, ordered
 * axis-list, deterministic given the grammar.
 *
 * The axes draw from five wells:
 *  - the 3-layer grammar-STACK (html ⊂ wikitext ⊂ x-memetic) — the construction-
 *    depth bands (living-grammar-palace#grammar-stack);
 *  - the pranala FAMILIES (relation, dataflow, control, …) — the parent groups;
 *  - the SIGIL constructions (one per SigilRule from the live grammar) — each
 *    carrying its parent family + its grammar-layer band;
 *  - the VOICES (the 13 jurusan of the Voice House, noosphere-boot#voice-house);
 *  - the OODA-HA PHASES (observe · orient · decide · act · aftermath);
 *  - the WARD-STATES (the five Mu tools: wand · arcana · pentacle · cup · sword).
 *
 * The canon axes (layers/voices/phases/wards) are FIXED in this module —
 * noosphere-boot is their source-of-truth, not a .tid. The sigil + family axes
 * derive from a `GrammarRules` the caller supplies (the @daemon loads it from
 * its TW5 VM via grammar-cache; tests construct it). The basis stays the
 * grammar-SEED side of the two-planes — no store, no vector, no holder.
 *
 * Pure + isomorphic: no fs/path/DOM imports; runs in node, browser, the @daemon
 * VM alike.
 */

import type { GrammarRules } from "../meme-ast/types.js";

// ---------------------------------------------------------------------------
// Grammar-stack layers (the construction-depth tower; base → top)
// ---------------------------------------------------------------------------

/** The 3-layer nested superset tower a construction may seat at. */
export type GrammarLayer = "html" | "wikitext" | "x-memetic";

/** Ordered base → top: the never-fail floor up to the `<<~` overlay. */
export const GRAMMAR_LAYERS: readonly GrammarLayer[] = ["html", "wikitext", "x-memetic"] as const;

// ---------------------------------------------------------------------------
// Voices (the 13 jurusan; canon order, noosphere-boot#voice-house)
// ---------------------------------------------------------------------------

/** The 13 Voice roles, in canon order. The role IS the stable handle. */
export const VOICE_ROLES: readonly string[] = [
  "gatekeeper",
  "lorekeeper",
  "scryer",
  "council",
  "muse",
  "artificer",
  "advocate",
  "diplomat",
  "pedagogue",
  "hierophant",
  "triage",
  "stranger",
  "liminal",
] as const;

/**
 * Named Voice handles → their role. A turn may surface a Voice by its named
 * handle (`Map-Wisp`) rather than its role (`Scryer`); this folds the handle to
 * the canonical role axis. `Lares` is the DEFAULT persona across many roles —
 * it carries no single role and resolves only when a role rides alongside.
 */
export const VOICE_HANDLE_TO_ROLE: Readonly<Record<string, string>> = {
  "ink-clerk": "lorekeeper",
  "map-wisp": "scryer",
  "mischief-muse": "muse",
  "tide-caller": "hierophant",
  "breach-watch": "triage",
} as const;

const VOICE_ROLE_SET = new Set(VOICE_ROLES);

/**
 * Resolve a surfaced Voice (name + optional role) to its canonical role axis id,
 * or null when it cannot resolve (a novel name, or a bare `Lares`). Role wins
 * over name; a named handle folds via VOICE_HANDLE_TO_ROLE.
 */
export function resolveVoiceRole(name: string, role: string | null): string | null {
  const r = role?.trim().toLowerCase() ?? "";
  if (r && VOICE_ROLE_SET.has(r)) return r;
  const n = name.trim().toLowerCase();
  if (VOICE_ROLE_SET.has(n)) return n;
  if (n in VOICE_HANDLE_TO_ROLE) return VOICE_HANDLE_TO_ROLE[n] ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// OODA-HA phases (the five-phase loop; canon order, noosphere-boot#ooda-ha)
// ---------------------------------------------------------------------------

export interface PhaseDef {
  readonly name: string;
  readonly glyph: string;
}

/** The five OODA-HA phases with their HUD glyphs, in loop order. */
export const OODA_HA_PHASES: readonly PhaseDef[] = [
  { name: "observe", glyph: "✶" },
  { name: "orient", glyph: "⏿" },
  { name: "decide", glyph: "◇" },
  { name: "act", glyph: "▶" },
  { name: "aftermath", glyph: "↺" },
] as const;

const PHASE_BY_GLYPH = new Map(OODA_HA_PHASES.map((p) => [p.glyph, p.name]));

/** Map a HUD/marker glyph (`✶ ⏿ ◇ ▶ ↺`) to its phase name, or null. */
export function phaseForGlyph(glyph: string): string | null {
  return PHASE_BY_GLYPH.get(glyph) ?? null;
}

// ---------------------------------------------------------------------------
// Ward-states (the five Mu tools; canon order, noosphere-boot#l-prime)
// ---------------------------------------------------------------------------

export interface WardStateDef {
  readonly name: string;
  /** The leading tool/office glyph after `ward`. */
  readonly glyph: string;
}

/** The five ward-states keyed by their Mu tool glyph. */
export const WARD_STATES: readonly WardStateDef[] = [
  { name: "wand", glyph: "*" }, // lights the ward
  { name: "arcana", glyph: "0" }, // the lift (operator act)
  { name: "pentacle", glyph: "_" }, // braces primed ground
  { name: "cup", glyph: "?" }, // appeals to the navigator
  { name: "sword", glyph: "!" }, // drawn at close
] as const;

const WARD_BY_GLYPH = new Map(WARD_STATES.map((w) => [w.glyph, w.name]));

/** Map a ward tool glyph (`* 0 _ ? !`) to its ward-state name, or null. */
export function wardStateForGlyph(glyph: string | null): string | null {
  if (glyph === null) return null;
  return WARD_BY_GLYPH.get(glyph) ?? null;
}

// ---------------------------------------------------------------------------
// The axis record + basis
// ---------------------------------------------------------------------------

/** Which well a coordinate belongs to. Category order is fixed (see CATEGORY_ORDER). */
export type AxisCategory = "layer" | "family" | "sigil" | "voice" | "phase" | "ward";

/** Fixed category order — the spine of the stable axis-list. */
export const CATEGORY_ORDER: readonly AxisCategory[] = [
  "layer",
  "family",
  "sigil",
  "voice",
  "phase",
  "ward",
] as const;

/** One constructicon axis — a coordinate the form-vector indexes against. */
export interface ConstructiconAxis {
  /** Stable, unique coordinate key (e.g. `sigil:loulou`, `voice:council`). */
  readonly id: string;
  /** The well this coordinate belongs to. */
  readonly category: AxisCategory;
  /** Canonical token / human label. */
  readonly label: string;
  /** The grammar-stack layer this construction seats at. */
  readonly layer: GrammarLayer;
  /** Parent pranala family (for sigils that declare one), else null. */
  readonly parentFamily: string | null;
  /** For a sigil axis: the SigilRule kind; else null. */
  readonly sigilKind: string | null;
}

/** The pinned constructicon basis — an ordered axis-list + an index. */
export interface ConstructiconBasis {
  /** The ordered axis list — a coordinate's array position IS its vector index. */
  readonly axes: readonly ConstructiconAxis[];
  /** id → array position, for O(1) coordinate lookup. */
  readonly index: ReadonlyMap<string, number>;
  /** The vector dimension (axes.length). */
  readonly dimension: number;
}

// ---------------------------------------------------------------------------
// Canon axes — fixed, grammar-independent
// ---------------------------------------------------------------------------

function canonAxes(): ConstructiconAxis[] {
  const out: ConstructiconAxis[] = [];
  for (const layer of GRAMMAR_LAYERS) {
    out.push({
      id: `layer:${layer}`,
      category: "layer",
      label: layer,
      layer,
      parentFamily: null,
      sigilKind: null,
    });
  }
  for (const role of VOICE_ROLES) {
    out.push({
      id: `voice:${role}`,
      category: "voice",
      label: role,
      layer: "x-memetic",
      parentFamily: null,
      sigilKind: null,
    });
  }
  for (const phase of OODA_HA_PHASES) {
    out.push({
      id: `phase:${phase.name}`,
      category: "phase",
      label: phase.name,
      layer: "x-memetic",
      parentFamily: null,
      sigilKind: null,
    });
  }
  for (const ward of WARD_STATES) {
    out.push({
      id: `ward:${ward.name}`,
      category: "ward",
      label: ward.name,
      layer: "x-memetic",
      parentFamily: null,
      sigilKind: null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// buildConstructiconBasis — fold canon + grammar into the ordered basis
// ---------------------------------------------------------------------------

/**
 * Pin the constructicon basis. Canon axes (layers · voices · phases · wards) are
 * fixed; family + sigil axes derive from the supplied grammar. The result is
 * DETERMINISTIC: categories ride CATEGORY_ORDER; within the grammar-derived
 * categories, axes sort by id, so the same grammar yields the same axis-list
 * every wake — the stability the form-vector requires.
 *
 * @param grammar  the live GrammarRules (from grammar-cache in the @daemon VM,
 *                 or a fixture in tests). When omitted, only the canon axes ride.
 */
export function buildConstructiconBasis(grammar?: GrammarRules): ConstructiconBasis {
  const families: ConstructiconAxis[] = [];
  const sigils: ConstructiconAxis[] = [];

  if (grammar) {
    for (const fam of grammar.families) {
      families.push({
        id: `family:${fam.name}`,
        category: "family",
        label: fam.name,
        layer: "x-memetic",
        parentFamily: null,
        sigilKind: null,
      });
    }
    const seen = new Set<string>();
    for (const sig of grammar.sigils) {
      const id = `sigil:${sig.name}`;
      if (seen.has(id)) continue; // a sigil name may recur (alias rows) — pin once
      seen.add(id);
      sigils.push({
        id,
        category: "sigil",
        label: sig.name,
        // Every SharktoothSigil is the `<<~` overlay — the x-memetic layer.
        layer: "x-memetic",
        parentFamily: sig.defaultFamily ?? null,
        sigilKind: sig.kind,
      });
    }
  }

  // Deterministic ordering inside the grammar-derived wells.
  families.sort((a, b) => a.id.localeCompare(b.id));
  sigils.sort((a, b) => a.id.localeCompare(b.id));

  const canon = canonAxes();
  // Re-assemble in fixed category order.
  const byCategory: Record<AxisCategory, ConstructiconAxis[]> = {
    layer: canon.filter((a) => a.category === "layer"),
    family: families,
    sigil: sigils,
    voice: canon.filter((a) => a.category === "voice"),
    phase: canon.filter((a) => a.category === "phase"),
    ward: canon.filter((a) => a.category === "ward"),
  };

  const axes: ConstructiconAxis[] = [];
  for (const cat of CATEGORY_ORDER) axes.push(...byCategory[cat]);

  const index = new Map<string, number>();
  axes.forEach((a, i) => index.set(a.id, i));

  return { axes, index, dimension: axes.length };
}
