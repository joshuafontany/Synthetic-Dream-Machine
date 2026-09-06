/**
 * turn-harvest — the graceful-gradient harvester (island grammar over the boot HUD).
 * Meme: lar:///ha.ka.ba/lararium/mesh/turn-harvest
 *
 * The boot frame names a GRAMMAR, never a deterministic output. A grammar
 * manifests PROVISIONALLY in use — the juru in the fight rarely matches the
 * jurusan on the pancer; one never reads the Capital/lowercase chart aloud. So a
 * real turn carries degraded, partial, missing, or freshly-invented grammar:
 * frames that don't cleanly open/close, several confidence ratings in one
 * selection, Voices and Syad/Tools in varied glyphs and words.
 *
 * This harvester reads that gradient. It follows the ISLAND-GRAMMAR discipline
 * (Moonen): each sigil family forms an ISLAND, precisely matched; everything
 * between forms WATER, swallowed and COUNTED, never dropped. The `<<~` opener
 * serves as the panic-sync anchor. What reads clean harvests with confidence;
 * what reads degraded records gracefully at a lower band; below the floor a turn
 * abstains on structure and keeps its RAW source (never-drop-the-source).
 *
 * It widens {@link harvest} (the aim/yield bearing) to the whole house HUD —
 * Voices, the HUD gauges (Focus, Feedback, the Drift-Ward firing), Syad stances, the confidence
 * markers, oracle —
 * and keeps MULTIPLE in-turn signals as an offset-anchored set, never collapsed.
 *
 * Pure + isomorphic: text in, a {@link TurnHarvest} out — no I/O, no store, no
 * holder, no LLM in the parse path. The expensive salvage tier (an LLM reading
 * the residue) lives downstream, behind a causal-island boundary, so harvested
 * signal enters the stack as deterministic facts.
 */

import { harvest, type Bearing } from "./bearing-harvest.js";

/** A single in-stream signal, anchored to where it sounded (offset into the turn). */
export interface OffsetSignal {
  /** Verbatim span, exactly as written. */
  readonly raw: string;
  /** Character offset of the signal's opener within the turn text. */
  readonly offset: number;
}

/** A Voice surfacing — `Lares (Council):`, `**Map-Wisp (Scryer):**`, `Mask: Name (Role):`. */
export interface VoiceSignal extends OffsetSignal {
  /** The surfaced name (`Lares`, `Map-Wisp`, …). */
  readonly name: string;
  /** The parenthesized role (`Council`, `Scryer`, …), or null when none rode along. */
  readonly role: string | null;
  /** A mask name when the form read `Mask: Name (Role)`, else null. */
  readonly mask: string | null;
}

/** A `<<~ confidence <Register> N/M>>` marker — or a degraded/novel variant of one. */
export interface ConfidenceSignal extends OffsetSignal {
  /** The register word (`Synthesis`, `Canon`, …), or null when the form dropped it. */
  readonly register: string | null;
  /** The numerator, or null when unparseable (a novel form like `< 4`). */
  readonly value: number | null;
  /** The denominator (defaults to 20 when the `/M` was omitted). */
  readonly max: number;
}

/** A `<<~ hud Focus(..) Feedback(..) Drift-Ward(..)>>` panel (open or close). */
export interface HudSignal extends OffsetSignal {
  /** Focus target/actual numerator (the last number when a `->` slide appeared), or null. */
  readonly focus: number | null;
  /** The Feedback payload verbatim (`3`, `0◇:fork.depends`, `1↺ + ▶:…`), or null. */
  readonly feedback: string | null;
  /**
   * The Drift-Ward firing carried inside this panel, or null.
   *
   * THE WARD RIDES IN THE PANEL, so a harvester that scans for a ward SIGIL finds none and reports
   * a turn that warded as a turn that did not. It reads the params instead — last position at open,
   * first at close — and that positional difference is the only thing distinguishing the two
   * firings, since they answer to each other not at all.
   */
  readonly ward: WardSignal | null;
}

/** A Syad standpoint invocation — by name, emoji, or glyph. */
export interface StanceSignal extends OffsetSignal {
  /** The standpoint token(s) following `syad`, verbatim. */
  readonly token: string;
}

/** A `Drift-Ward(..)` firing inside a HUD panel (Wand, lift, brace, appeal, or Sword close). */
export interface WardSignal extends OffsetSignal {
  /** The leading tool/office glyph inside the firing (`*`,`0`,`_`,`?`,`!`), or null. */
  readonly tool: string | null;
  /** The confidence level the firing vows (`Confidence 12/20` → 12), or null. */
  readonly vow: number | null;
}

/** A recognized but non-specialized sigil (`kahea`, `mu`, `lares` non-aim/yield, …). */
export interface OtherSigil extends OffsetSignal {
  /** The leading keyword that classified the island. */
  readonly kind: string;
}

/** The band a turn's overall confidence lands in (the house register ladder). */
export type HarvestBand = "canon" | "synthesis" | "provisional" | "raw";

/** Everything one turn yielded, on the gradient. */
export interface TurnHarvest {
  /** The aim/yield bearing (reuses {@link harvest}); null when no frame appeared. */
  readonly bearing: Bearing | null;
  readonly voices: readonly VoiceSignal[];
  /** ALL confidence markers, never collapsed — a selection may carry several. */
  readonly confidences: readonly ConfidenceSignal[];
  /** HUD panels (an open and a close both count). */
  readonly huds: readonly HudSignal[];
  readonly stances: readonly StanceSignal[];
  readonly wards: readonly WardSignal[];
  readonly oracles: readonly OffsetSignal[];
  /** Recognized-but-generic sigils (kahea, mu, …). */
  readonly others: readonly OtherSigil[];
  /** Count of recognized sigil islands (every classified `<<~ …>>`). */
  readonly sigilCount: number;
  /** Count of `<<~` openers that did NOT classify — the water, panic-synced. */
  readonly waterCount: number;
  /** Overall 0..20 gradient standing — the parse earns it BACKWARD (low = drifted / sparse structure). */
  readonly standing: number;
  /** The band {@link standing} lands in. */
  readonly band: HarvestBand;
  readonly driftFlags: readonly string[];
  /** Below the floor: abstain on structure, but keep the raw source. */
  readonly recordRaw: boolean;
}

/**
 * Standing floor (0..20). At or above, a turn's structure harvests; below, the
 * turn abstains on structure (`recordRaw`) and the raw source is kept for a later
 * pass. The operator's rule: work the gradient down to here, no further.
 */
export const HARVEST_FLOOR = 4;

/** Band thresholds on the 0..20 continuum (house register ladder). */
export const HARVEST_BANDS = {
  canon: 13, // synthesis-canon and up
  synthesis: 9, // working synthesis
  provisional: HARVEST_FLOOR, // the play register, down to the floor
} as const;

export function harvestBand(standing: number): HarvestBand {
  if (standing >= HARVEST_BANDS.canon) return "canon";
  if (standing >= HARVEST_BANDS.synthesis) return "synthesis";
  if (standing >= HARVEST_BANDS.provisional) return "provisional";
  return "raw";
}

// --- Island regexes -------------------------------------------------------
// Each sigil opener `<<~` anchors an island; SIGIL_RE walks them in order. A
// body that fails to close (`>>`) before the next `<<~` reads as water.

const SIGIL_RE = /<<~\s*([\s\S]*?)>>/g;
const SIGIL_OPENER_RE = /<<~/g;

// Voice headers ride the prose, not a sigil: `Name (Role):`, optionally bold,
// optionally `Mask: Name (Role):`. Names allow hyphen/apostrophe compounds.
const VOICE_RE =
  /(?:^|\n)\s*(?:\*\*\s*)?(?:(Mask|[A-Za-z][\w'-]*)\s*:\s*)?([A-Z][\w'’-]*(?:[ -][A-Z][\w'’-]*)*)\s*\(([^)\n]{1,40})\)\s*:/g;

// A bare `Name:` surfacing (degraded — no role parens). Accepted only when the
// name reads as a known house Voice, so prose `Note:` / `Thread:` stay water.
const BARE_VOICE_RE = /(?:^|\n)\s*(?:\*\*\s*)?([A-Z][\w'’-]*(?:[ -][A-Z][\w'’-]*)*)\s*:/g;
const KNOWN_VOICES = new Set([
  "lares",
  "ink-clerk",
  "lorekeeper",
  "map-wisp",
  "scryer",
  "council",
  "mischief-muse",
  "muse",
  "artificer",
  "advocate",
  "diplomat",
  "pedagogue",
  "tide-caller",
  "hierophant",
  "breach-watch",
  "triage",
  "stranger",
  "liminal",
  "gatekeeper",
]);

const CONF_RE = /<<~\s*confidence\b([\s\S]*?)>>/gi;
const CONF_NUM_RE = /(-?\d+)\s*\/\s*(\d+)/;

const HUD_RE = /<<~\s*hud\b([\s\S]*?)>>/gi;
// The announced faces lead; the true-names stay readable so a turn written either way harvests.
const FOCUS_RE = /(?:Focus|Aperture)\s*\(\s*([^)]*?)\)/i;
const FEEDBACK_RE = /(?:Feedback|OODA-?HA)\s*\(\s*([^)]*?)\)/i;
// The firing closes where the next gauge begins or where the panel body ends — an open panel
// carries the ward LAST, so end-of-body must terminate it or the open firing never matches.
const WARD_RE = /Drift-(?:Ward|Watch)\s*\(\s*([\s\S]*?)\)\s*(?=Focus\b|Feedback\b|$)/i;
const WARD_VOW_RE = /Confidence\s+(-?\d+)\s*\/\s*\d+/i;

/**
 * A ward standing as its OWN sigil — the shape carried by every transcript written before the firing
 * moved inside the panel.
 *
 * A CORPUS STATES ONE GRAMMAR; A READER TOLERATES EVERY GRAMMAR IT WILL MEET. `bags/` authors its own
 * contents and carries current pono alone. This harvester receives input it never authored, so
 * refusing the older shape here would read a month of real turns as turns that never warded — the
 * silence being indistinguishable from a turn that skipped the instrument.
 */
const STANDALONE_WARD_RE = /<<~\s*ward\b\s*([^\s>]*)?([\s\S]*?)>>/gi;
const SYAD_RE = /<<~\s*syad\b([\s\S]*?)>>/gi;
const ORACLE_RE = /<<~\s*oracle\b([\s\S]*?)>>/gi;

/** Leading keyword of a sigil body → its island family (for water vs. recognized). */
const KNOWN_KINDS = new Set([
  "lares",
  "hud",
  "ward",
  "confidence",
  "syad",
  "mu",
  "oracle",
  "kahea",
  "aim",
  "yield",
  "ranks",
  "loops",
  "flows",
  "moves",
  "holds",
  "confidence",
]);

function leadingWord(body: string): string {
  const m = /^[\s~]*([A-Za-z][\w-]*)/.exec(body);
  return m ? (m[1] ?? "").toLowerCase() : "";
}

function lastNumber(s: string): number | null {
  const all = s.match(/-?\d+/g);
  if (!all || all.length === 0) return null;
  const n = Number(all[all.length - 1]);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Harvest one verbatim turn on the gradient. Always returns a record for any
 * non-empty text — an unframed, all-prose turn comes back at a raw band with
 * `recordRaw` set, never null (the silence is recorded, never fabricated into a
 * bearing). The widening signals corroborate: a clean bearing flanked by a HUD
 * and named Voices reads canon; a lone drifted frame, or bare water, falls.
 */
export function harvestTurnGradient(text: string): TurnHarvest {
  const empty: TurnHarvest = {
    bearing: null,
    voices: [],
    confidences: [],
    huds: [],
    stances: [],
    wards: [],
    oracles: [],
    others: [],
    sigilCount: 0,
    waterCount: 0,
    standing: 0,
    band: "raw",
    driftFlags: ["empty"],
    recordRaw: true,
  };
  if (!text) return empty;

  const bearing = harvest(text);

  // --- confidence markers (all of them) ---
  const confidences: ConfidenceSignal[] = [];
  for (const m of text.matchAll(CONF_RE)) {
    const body = m[1] ?? "";
    const num = CONF_NUM_RE.exec(body);
    const register = (/^[\s~]*([A-Za-z][\w-]*)/.exec(body)?.[1] ?? null) || null;
    confidences.push({
      raw: m[0],
      offset: m.index ?? 0,
      register: register && !/^\d/.test(register) ? register : null,
      value: num ? Number(num[1]) : lastNumber(body),
      max: num ? Number(num[2]) : 20,
    });
  }

  // --- HUD panels (each carrying its Drift-Ward firing) ---
  const wards: WardSignal[] = [];
  const huds: HudSignal[] = [];
  for (const m of text.matchAll(HUD_RE)) {
    const body = m[1] ?? "";
    const ap = FOCUS_RE.exec(body);
    const fb = FEEDBACK_RE.exec(body);
    const wm = WARD_RE.exec(body);
    const ward: WardSignal | null = wm
      ? {
          raw:    wm[0],
          offset: (m.index ?? 0) + (wm.index ?? 0),
          tool:   ((wm[1] ?? "").trim()[0]) ?? null,
          vow:    (() => { const v = WARD_VOW_RE.exec(wm[1] ?? ""); return v ? Number(v[1]) : null; })(),
        }
      : null;
    huds.push({
      raw: m[0],
      offset: m.index ?? 0,
      focus: ap ? lastNumber(ap[1] ?? "") : null,
      feedback: fb ? (fb[1] ?? "").trim() || null : null,
      ward,
    });
    if (ward) wards.push(ward);
  }

  // Wards written as their own sigil, gathered after the panels so a turn carrying both reads both.
  for (const m of text.matchAll(STANDALONE_WARD_RE)) {
    const tool = (m[1] ?? "").trim();
    const vow  = WARD_VOW_RE.exec(m[2] ?? "");
    wards.push({
      raw:    m[0],
      offset: m.index ?? 0,
      tool:   tool ? (tool[0] ?? null) : null,
      vow:    vow ? Number(vow[1]) : null,
    });
  }
  wards.sort((a, b) => a.offset - b.offset);

  // --- syad stances ---
  const stances: StanceSignal[] = [];
  for (const m of text.matchAll(SYAD_RE)) {
    stances.push({ raw: m[0], offset: m.index ?? 0, token: (m[1] ?? "").trim() });
  }

  // --- oracle ---
  const oracles: OffsetSignal[] = [];
  for (const m of text.matchAll(ORACLE_RE)) {
    oracles.push({ raw: m[0], offset: m.index ?? 0 });
  }

  // --- Voices ---
  const voices: VoiceSignal[] = [];
  for (const m of text.matchAll(VOICE_RE)) {
    const prefix = m[1] ?? null; // "Mask" or a stray word
    const name = (m[2] ?? "").trim();
    const role = (m[3] ?? "").trim() || null;
    // Precision guard (tier-0 stays high-precision): a Voice header carries a
    // SHORT name and a SHORT role. A long verb-phrase in the parens — a prose
    // aside like "(end your reply with)" — reads as water, never a Voice.
    const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;
    const knownish =
      KNOWN_VOICES.has(name.toLowerCase()) ||
      (role !== null && KNOWN_VOICES.has(role.toLowerCase()));
    if (!knownish && (words(name) > 3 || (role !== null && words(role) > 3))) continue;
    const isMask = prefix !== null && prefix.toLowerCase() === "mask";
    voices.push({
      raw: m[0].trim(),
      offset: m.index ?? 0,
      name,
      role,
      mask: isMask ? name : null,
    });
  }
  // Degraded surfacing: a bare `KnownVoice:` with no role parens.
  const claimedVoiceOffsets = new Set(voices.map((v) => v.offset));
  for (const m of text.matchAll(BARE_VOICE_RE)) {
    const name = (m[1] ?? "").trim();
    if (!KNOWN_VOICES.has(name.toLowerCase())) continue;
    const offset = m.index ?? 0;
    // Skip when the role-form already claimed this surfacing (overlapping span).
    if ([...claimedVoiceOffsets].some((o) => Math.abs(o - offset) <= 4)) continue;
    voices.push({ raw: m[0].trim(), offset, name, role: null, mask: null });
  }
  voices.sort((a, b) => a.offset - b.offset);

  // --- island census: classify every <<~ …>> body; the rest is water ---
  const others: OtherSigil[] = [];
  let classifiedSigils = 0;
  const specialized =
    confidences.length + huds.length + wards.length + stances.length + oracles.length;
  // aim/yield sigils count toward recognized too (the bearing reads them).
  let bearingSigils = 0;
  for (const m of text.matchAll(SIGIL_RE)) {
    const body = m[1] ?? "";
    const kind = leadingWord(body);
    if (kind === "lares") {
      const sub = /^[\s~]*lares\s+([A-Za-z]+)/i.exec(body)?.[1]?.toLowerCase() ?? "";
      if (sub === "aim" || sub === "yield") bearingSigils += 1;
      else others.push({ raw: m[0], offset: m.index ?? 0, kind: "lares" });
      classifiedSigils += 1;
    } else if (["confidence", "hud", "ward", "syad", "oracle"].includes(kind)) {
      // already captured by the specialized passes
      classifiedSigils += 1;
    } else if (KNOWN_KINDS.has(kind)) {
      others.push({ raw: m[0], offset: m.index ?? 0, kind });
      classifiedSigils += 1;
    }
    // unknown leading word → not classified here; counted as water below.
  }

  // Water = `<<~` openers that no closed, recognized island claimed.
  const totalOpeners = (text.match(SIGIL_OPENER_RE) ?? []).length;
  const waterCount = Math.max(0, totalOpeners - classifiedSigils);

  const sigilCount = classifiedSigils;

  // --- overall standing on the gradient (the parse EARNS it backward) ---
  const driftFlags: string[] = [...(bearing?.driftFlags ?? [])];
  let standing: number;

  if (bearing) {
    // Start from the bearing's own drift standing, corroborate with the HUD body.
    standing = bearing.standing;
    if (huds.length > 0) standing = clamp(standing + 1, 0, 18);
    if (voices.length > 0) standing = clamp(standing + 1, 0, 18);
    if (confidences.length > 0) standing = clamp(standing + 1, 0, 20);
  } else {
    driftFlags.push("frame:none");
    if (specialized + bearingSigils > 0) {
      // Structure without an aim/yield frame — degraded but real.
      standing = 8;
      if (voices.length > 0) standing = clamp(standing + 1, 0, 12);
    } else if (voices.length > 0) {
      // A Voice surfaced in prose, no sigils — partial.
      standing = 6;
    } else {
      // All prose, no structure — below the floor; keep raw.
      standing = 2;
    }
  }

  // Water drags the gauge: mostly-unrecognized openers read as drift.
  if (waterCount > 0) {
    driftFlags.push(`water:${waterCount}`);
    if (sigilCount === 0) standing = Math.min(standing, HARVEST_FLOOR);
    else if (waterCount >= sigilCount) standing = clamp(standing - 2, 0, 20);
  }
  if (voices.length > 0) driftFlags.push(`voices:${voices.length}`);
  if (confidences.length > 1) driftFlags.push(`confidence-multi:${confidences.length}`);

  const band = harvestBand(standing);
  return {
    bearing,
    voices,
    confidences,
    huds,
    stances,
    wards,
    oracles,
    others,
    sigilCount,
    waterCount,
    standing,
    band,
    driftFlags,
    recordRaw: standing < HARVEST_FLOOR,
  };
}
