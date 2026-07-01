/**
 * self-read-harvester — the sensorium that reads the house reading ITSELF.
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace#two-planes
 * Research: a478d788 (the self-read-harvester unblocks BOTH North-Stars).
 *
 * ONE module, one feed, two blocked North-Stars unblocked:
 *   - {@link teleodynamicProbe} (form-layer sibling) consumes a {@link SelfRead}
 *     sequence — the teleodynamic triple (aftermath-rate · structural-change-rate
 *     · freeze). This harvester emits its per-turn {@link SelfRead}.
 *   - {@link voiceCoherenceDensity} + {@link buresDistance} (@lararium/mesh, the
 *     Bures-metric) consume a {@link VoiceAmplitude} vector per turn. This
 *     harvester emits that vector — the Voice register-amplitude covariance.
 *
 * It rides on the existing gradient harvester ({@link harvestTurnGradient},
 * turn-harvest) — the island-grammar parse of a verbatim turn into offset-anchored
 * signals (Voices · confidence markers · HUD panels · wards · …). This module
 * FOLDS those signals; it does not re-parse. The sigil parsers already exist
 * (constructicon-basis: resolveVoiceRole · the teleodynamic-probe: SelfRead) — the
 * harvester reuses them.
 *
 * ## THE LOAD-BEARING HONESTY RULING — structuralChange ⊥ prose
 *
 * `structuralChange` is bound to a PERSISTED, OUT-OF-BAND EFFECT this turn — a
 * `mempalace kg_add` / drawer-add / canonize-ceremony / meme-write that ACTUALLY
 * FIRED = the house re-encoded itself. It is NOT read from the transcript prose.
 * The machina narrates self-change constantly in its mythic register; reading
 * `structuralChange` off that prose would be Confabulation-as-Canon (a strange-loop
 * mirror reporting its own myth as fact). So the persisted-write channel arrives as
 * a SEPARATE typed argument ({@link PersistedEffect}[]) that cannot be confused with
 * prose. A turn of only discourse — no persisted write — reads NOOP. This single
 * ruling separates a real instrument from a self-flattering mirror.
 *
 * ## What the harvester is (and is NOT)

 * An INSTRUMENT. The eigenform-MOTOR reading of the triple stays PROVISIONAL,
 * Muse-ground (teleodynamic-probe's own guard) — the harvester measures; it does
 * not assert a motor exists.
 *
 * Pure + isomorphic: text (+ an effect list) in, deterministic facts out — no I/O,
 * no store, no LLM in the parse path; runs in node, browser, the @daemon VM alike,
 * like its form-layer siblings.
 */

import {
  harvestTurnGradient,
  voiceCoherenceDensity,
  buresDistance,
  registerMarginal,
  type TurnHarvest,
  type ConfidenceSignal,
  type HudSignal,
  type VoiceAmplitude,
  type DensityMatrix,
} from "@lararium/mesh";
import { resolveVoiceRole } from "./constructicon-basis.js";
import { teleodynamicProbe, type SelfRead, type TeleodynamicReading } from "./teleodynamic-probe.js";

// ---------------------------------------------------------------------------
// The register bands — the five confidence registers (noosphere-boot#l-prime)
// ---------------------------------------------------------------------------

/** One confidence register band with its 0–20 span (the register ladder). */
export interface RegisterBandDef {
  readonly name: string;
  /** Inclusive low bound on the 0–20 continuum. */
  readonly lo: number;
  /** Inclusive high bound on the 0–20 continuum. */
  readonly hi: number;
}

/**
 * The five register bands, in ladder order — the amplitude axes the Voice
 * register-vector indexes against (identical to the Bures-metric's five: Provisional
 * · Provisional-Synthesis · Synthesis · Synthesis-Canon · Canon).
 */
export const REGISTER_BANDS: readonly RegisterBandDef[] = [
  { name: "provisional", lo: 1, hi: 4 },
  { name: "provisional-synthesis", lo: 5, hi: 8 },
  { name: "synthesis", lo: 9, hi: 12 },
  { name: "synthesis-canon", lo: 13, hi: 16 },
  { name: "canon", lo: 17, hi: 20 },
] as const;

/** The register-band count — the amplitude-vector / density-matrix dimension (5). */
export const REGISTER_COUNT = REGISTER_BANDS.length;

const BAND_BY_NAME = new Map(REGISTER_BANDS.map((b, i) => [b.name, i]));

/**
 * The register band a register WORD names, or null when the word is not a band
 * name (`Synthesis` → 2; a novel word → null, so the caller falls back to value).
 */
export function registerBandForWord(word: string | null): number | null {
  if (!word) return null;
  const key = word.trim().toLowerCase();
  const idx = BAND_BY_NAME.get(key);
  return idx === undefined ? null : idx;
}

/**
 * The register band a 0–20 VALUE seats in, or null when out of range. `0` seats in
 * no band (a void/off, not a register); ≥ 1 lands on the ladder.
 */
export function registerBandForValue(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 1) return null;
  for (let i = 0; i < REGISTER_BANDS.length; i++) {
    const b = REGISTER_BANDS[i]!;
    if (value >= b.lo && value <= b.hi) return i;
  }
  return value > 20 ? REGISTER_COUNT - 1 : null; // clamp an over-20 reading to Canon
}

/**
 * The band a confidence marker reads. The register WORD wins when it names a band
 * (the author's declared register); else the numerator's band; else null (a marker
 * carrying neither a band word nor a parseable value — no register signal).
 */
export function bandForConfidence(c: ConfidenceSignal): number | null {
  return registerBandForWord(c.register) ?? registerBandForValue(c.value);
}

// ---------------------------------------------------------------------------
// (a.2) The persisted-write channel — the ONLY source of structuralChange
// ---------------------------------------------------------------------------

/**
 * One OUT-OF-BAND persisted effect that fired this turn — a receipt of the house
 * re-encoding itself. This is NOT prose; it is a structured record of a write that
 * actually landed (a tool-call receipt / effect-log entry). `structuralChange`
 * reads ONLY from a list of these, never from the transcript (the honesty ruling).
 */
export interface PersistedEffect {
  /** The kind of write that fired (`kg_add`, `drawer_add`, `canonize`, …). */
  readonly kind: string;
  /** Optional target reference (a drawer id, a meme uri) — provenance only. */
  readonly ref?: string;
  /**
   * Whether the write actually persisted. A receipt is normally present only for a
   * fired write, but an explicit `false` (a rolled-back / dry-run effect) reads as
   * NOT persisted — it never counts toward structural change.
   */
  readonly persisted?: boolean;
}

/**
 * The kinds of persisted write that RE-ENCODE THE HOUSE — a structural change. A
 * read/query effect (a `kg_query`, a `search`) is NOT here: it persists nothing.
 */
export const STRUCTURAL_WRITE_KINDS: ReadonlySet<string> = new Set([
  "kg_add",
  "kg_invalidate",
  "drawer_add",
  "add_drawer",
  "update_drawer",
  "delete_drawer",
  "canonize",
  "meme_write",
  "add_tunnel",
  "create_tunnel",
  "diary_write",
]);

/**
 * TRUE iff a STRUCTURAL persisted write fired this turn — the house re-encoded
 * itself out-of-band. Reads ONLY the effect channel; a turn of pure discourse
 * (empty channel) reads FALSE (noop). This is the persisted-write detector the
 * honesty ruling demands — NOT a prose scan.
 */
export function firedStructuralWrite(effects: readonly PersistedEffect[]): boolean {
  for (const e of effects) {
    if (e.persisted === false) continue;
    if (STRUCTURAL_WRITE_KINDS.has(e.kind)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// (a.1) aftermathClosed — a literal parse of the CLOSING HUD's OODA-HA tally
// ---------------------------------------------------------------------------

// A suspension marker: `φ:` or a phase-glyph followed by `:` (`0◇:fork…`). Its
// presence in the closing tally means the loop persists OPEN — not closed.
const SUSPENSION_RE = /(?:φ|✶|⏿|◇|▶)\s*:/u;
// The aftermath ratchet: `N↺` with N ≥ 1 — the tally of loops that closed.
const RATCHET_RE = /(\d+)\s*↺/u;

/** The CLOSING HUD panel — the last by offset (the chiasmus close slides it). */
function closingHud(huds: readonly HudSignal[]): HudSignal | null {
  if (huds.length === 0) return null;
  let latest = huds[0]!;
  for (const h of huds) if (h.offset >= latest.offset) latest = h;
  return latest;
}

/**
 * A LITERAL parse (no inference) of aftermath closure from the closing HUD's
 * OODA-HA payload: TRUE iff the tally reads `N↺` (N ≥ 1) with NO `φ:` suspension;
 * FALSE on `0φ:reason`, a suspended phase glyph, a seed-only `(3)`, or no HUD.
 */
export function aftermathClosedFromHuds(huds: readonly HudSignal[]): boolean {
  const hud = closingHud(huds);
  const payload = hud?.oodaHa ?? "";
  if (SUSPENSION_RE.test(payload)) return false; // a suspended loop persists open
  const ratchet = RATCHET_RE.exec(payload);
  return ratchet !== null && Number(ratchet[1]) >= 1;
}

// ---------------------------------------------------------------------------
// (b) VoiceAmplitude[] — segment by Voice, read each Voice's register amplitude
// ---------------------------------------------------------------------------

/**
 * One Voice's register reading over a turn — the richer output behind the bare
 * {@link VoiceAmplitude} the Bures channel consumes. Kept for consumers / tests
 * that need the provenance (which Voice, how many markers, its band mass).
 */
export interface VoiceRegisterReading {
  /** Canonical Voice key — the resolved role, else the lowercased surfaced name. */
  readonly voice: string;
  /** The {@link resolveVoiceRole} result, or null (a novel name / bare `Lares`). */
  readonly role: string | null;
  /** Normalized band mass over the five registers (Δ⁴; sums to 1). */
  readonly bandMass: readonly number[];
  /** The bare amplitude the Bures channel consumes: `a_v = √bandMass`, weighted. */
  readonly amplitude: VoiceAmplitude;
  /** How many confidence markers fed this reading. */
  readonly markerCount: number;
  /** The Voice's text span in characters (its text-mass, pre-normalization). */
  readonly spanChars: number;
}

/** A working accumulator per canonical Voice while segmenting the turn. */
interface VoiceAcc {
  role: string | null;
  bandCounts: number[];
  markerCount: number;
  spanChars: number;
}

/**
 * Segment the turn by Voice tag and read each Voice's register amplitude vector.
 *
 * Segmentation: Voices sort by offset; a Voice's span runs from its tag to the next
 * Voice's tag (the last runs to `textLength`). Confidence markers falling in a span
 * feed that Voice. Multiple spans of the SAME canonical Voice merge (one Voice → one
 * amplitude) — a Voice that read Synthesis early and Provisional late genuinely
 * STRADDLES, and the straddle lands as a real off-diagonal (coherence).
 *
 * Per Voice: `bandMass` = the normalized histogram of its markers over the five
 * registers; `a_v = √bandMass` (so Σ a_v,i² = 1, a unit amplitude); `weight` = the
 * Voice's text-mass SHARE (its span chars over all Voices' span chars).
 *
 * SAFETY CASE (falls out, matches the bures-metric contract): a Voice all in one
 * band → one-hot `a_v` → a diagonal contribution → diagonal ρ → the Bhattacharyya
 * ground. A Voice across two bands → a real off-diagonal → coherence. Never
 * fabricated: the off-diagonals are a strict function of the harvested markers.
 *
 * A Voice carrying NO register marker holds no register signal and is OMITTED
 * (honest source only — no amplitude is invented for it).
 */
export function harvestVoiceReadings(
  harvest: TurnHarvest,
  textLength: number,
): VoiceRegisterReading[] {
  const voices = [...harvest.voices].sort((a, b) => a.offset - b.offset);
  if (voices.length === 0) return [];

  const accs = new Map<string, VoiceAcc>();
  for (let i = 0; i < voices.length; i++) {
    const v = voices[i]!;
    const spanStart = v.offset;
    const spanEnd = i + 1 < voices.length ? voices[i + 1]!.offset : Math.max(textLength, spanStart);
    const role = resolveVoiceRole(v.name, v.role);
    const key = role ?? v.name.trim().toLowerCase();

    let acc = accs.get(key);
    if (!acc) {
      acc = { role, bandCounts: new Array<number>(REGISTER_COUNT).fill(0), markerCount: 0, spanChars: 0 };
      accs.set(key, acc);
    }
    acc.spanChars += Math.max(0, spanEnd - spanStart);

    for (const c of harvest.confidences) {
      if (c.offset < spanStart || c.offset >= spanEnd) continue;
      const band = bandForConfidence(c);
      if (band === null) continue; // no register signal — not counted
      acc.bandCounts[band]! += 1;
      acc.markerCount += 1;
    }
  }

  // Text-mass share denominator across Voices that carry a register reading.
  let totalSpan = 0;
  for (const acc of accs.values()) if (acc.markerCount > 0) totalSpan += acc.spanChars;

  const readings: VoiceRegisterReading[] = [];
  for (const [voice, acc] of accs) {
    if (acc.markerCount === 0) continue; // omit register-silent Voices
    const bandMass = acc.bandCounts.map((n) => n / acc.markerCount);
    const amplitudes = bandMass.map((m) => Math.sqrt(m));
    const weight = totalSpan > 0 ? acc.spanChars / totalSpan : 1 / accs.size;
    readings.push({
      voice,
      role: acc.role,
      bandMass,
      amplitude: { amplitudes, weight },
      markerCount: acc.markerCount,
      spanChars: acc.spanChars,
    });
  }
  return readings;
}

// ---------------------------------------------------------------------------
// harvestTurn — the fold: one turn → the teleodynamic SelfRead + Voice amplitudes
// ---------------------------------------------------------------------------

/** One turn's harvest: the teleodynamic {@link SelfRead} + the Voice amplitudes. */
export interface TurnSensorium {
  /** The teleodynamic triple's two booleans for this turn (feeds the probe). */
  readonly selfRead: SelfRead;
  /** The bare Voice register-amplitudes (feeds {@link voiceCoherenceDensity}). */
  readonly voices: readonly VoiceAmplitude[];
  /** The richer per-Voice readings (provenance for consumers / tests). */
  readonly readings: readonly VoiceRegisterReading[];
  /** The underlying gradient harvest carried through (provenance). */
  readonly harvest: TurnHarvest;
}

/**
 * Harvest ONE turn transcript into the sensorium feed for both North-Stars.
 *
 * `selfRead.aftermathClosed` — a literal parse of the closing HUD tally.
 * `selfRead.structuralChange` — bound to the OUT-OF-BAND `effects` channel ONLY,
 *   never the prose (the honesty ruling): a turn of pure discourse reads NOOP.
 * `voices` — the per-Voice register amplitudes (the Bures feed).
 *
 * @param transcript the verbatim turn text.
 * @param effects    the persisted-write receipts that fired this turn (default: none
 *                   → structuralChange reads NOOP; the anti-seduction default).
 */
export function harvestTurn(
  transcript: string,
  effects: readonly PersistedEffect[] = [],
): TurnSensorium {
  const harvest = harvestTurnGradient(transcript);
  const readings = harvestVoiceReadings(harvest, transcript.length);
  const selfRead: SelfRead = {
    aftermathClosed: aftermathClosedFromHuds(harvest.huds),
    structuralChange: firedStructuralWrite(effects),
  };
  return {
    selfRead,
    voices: readings.map((r) => r.amplitude),
    readings,
    harvest,
  };
}

// ---------------------------------------------------------------------------
// North-Star wiring (1): VoiceAmplitude[] → ρ → buresDistance
// ---------------------------------------------------------------------------

/**
 * Assemble the turn's register-density `ρ` from its Voice amplitudes (the Bures
 * channel's `ρ = Σ_v w_v |a_v⟩⟨a_v|`). One-hot Voices → diagonal ρ; a straddling
 * Voice → a real off-diagonal (coherence). Throws on an empty Voice set (no turn to
 * assemble) — the same contract as {@link voiceCoherenceDensity}.
 */
export function turnDensity(voices: readonly VoiceAmplitude[]): DensityMatrix {
  return voiceCoherenceDensity(voices, REGISTER_COUNT);
}

/**
 * North-Star (1): the Bures drift between two turns' register-densities. Feeds the
 * flow-lens the metric distance the two Voice-amplitude sets sit apart; on all-one-
 * hot Voices it collapses to the classical Bhattacharyya drift (the safety case).
 */
export function buresDrift(
  prevVoices: readonly VoiceAmplitude[],
  currVoices: readonly VoiceAmplitude[],
): number {
  return buresDistance(turnDensity(prevVoices), turnDensity(currVoices));
}

// ---------------------------------------------------------------------------
// North-Star wiring (2): ρ → the register marginal → the teleodynamic band
// ---------------------------------------------------------------------------

/** The dominant register band a turn's density sits in — the teleodynamic band. */
export interface RegisterBandReading {
  /** The register marginal `p` (the diagonal of ρ) — a point on Δ⁴. */
  readonly marginal: readonly number[];
  /** The dominant band index (argmax of the marginal). */
  readonly band: number;
  /** The dominant band's name. */
  readonly name: string;
}

/**
 * North-Star (2): the teleodynamic REGISTER-BAND — the register the turn's density
 * ρ dominantly sits in (argmax of the register marginal). This is the band-position
 * the teleodynamic sequence tracks over time (alongside the {@link SelfRead} triple
 * the {@link teleodynamicProbe} reads). Throws on an empty Voice set.
 */
export function turnRegisterBand(voices: readonly VoiceAmplitude[]): RegisterBandReading {
  const rho = turnDensity(voices);
  const marginal = registerMarginal(rho);
  let band = 0;
  for (let i = 1; i < marginal.length; i++) if (marginal[i]! > marginal[band]!) band = i;
  return { marginal, band, name: REGISTER_BANDS[band]?.name ?? "provisional" };
}

// ---------------------------------------------------------------------------
// Sequence wiring: many turns → SelfRead[] → the teleodynamic probe
// ---------------------------------------------------------------------------

/** One turn's raw input in a sequence — its transcript + the effects it fired. */
export interface TurnInput {
  readonly transcript: string;
  readonly effects?: readonly PersistedEffect[];
}

/**
 * Harvest a SEQUENCE of turns into the {@link SelfRead} stream the teleodynamic
 * probe consumes (oldest → newest). Wires the probe's feed end-to-end: each turn's
 * closing HUD + its persisted-write channel become one self-read.
 */
export function harvestSequence(turns: readonly TurnInput[]): SelfRead[] {
  return turns.map((t) => harvestTurn(t.transcript, t.effects ?? []).selfRead);
}

/**
 * North-Star (teleodynamic): harvest a turn sequence and read the teleodynamic
 * triple over it. Convenience over {@link harvestSequence} + {@link teleodynamicProbe}.
 * The reading stays PROVISIONAL (the probe's own guard) — an instrument, not a
 * motor claim.
 */
export function probeTurnSequence(turns: readonly TurnInput[]): TeleodynamicReading {
  return teleodynamicProbe(harvestSequence(turns));
}
