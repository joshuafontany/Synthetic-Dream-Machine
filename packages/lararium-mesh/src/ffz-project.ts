/**
 * ffz-project — the `lar_ffz` rhythmic address, a PURE CACHED PROJECTION.
 *
 * `lar_ffz` is the FfzClock RHYTHMIC read STAMPED onto a work-memory drawer — but
 * it is NOT a clock. There is no FfzClock instance to instantiate, tick, or sync:
 * this module projects data the drawer ALREADY holds (its captured wall-time, and —
 * when available — its session/turn position) onto the five attention-scale bands
 * (FFZ_REGISTER_NAMES: Pulse · Beat · Measure · Arc · Theme). "Capture whole,
 * project later" — the projection is deterministic, stateless, and recomputable.
 *
 * RHYTHM-ONLY (the PATH-B cut): `lar_ffz` carries ZERO causality. It paces the
 * grain, it never orders history — causal order rides the edge-DAG / ffzCausalCompare
 * (ffz-clock.ts), which this module does NOT touch. No entrainment, no coupling, no
 * sync: a rhythmic VIEW of the captured turn, nothing more.
 *
 * Address shape — `"<profile>/<Theme>.<Arc>.<Measure>.<Beat>.<Pulse>"`, ordered
 * COARSE→FINE so a coarser read drops trailing bands cleanly (prefix-truncatable;
 * see {@link ffzTruncate}). Distinct from ffzSerialize's fine→coarse `:` wire form.
 *   - Wall-time drives the coarse bands — Arc (day-of-cycle), Theme (epoch/cycle).
 *   - The session position (turn-index = L1 Beat count) drives the fine bands —
 *     Measure, Beat — and unlocks Pulse (the finest, sub-perceptual wall tick).
 *   - Absent a session position, only the coarse prefix `"<profile>/<Theme>.<Arc>"`
 *     projects — the fine bands stay UNSTAMPED rather than fabricated (no phantom phase).
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

import {
  type FfzLevel,
  FFZ_DEFAULT_BOUNDS,
  FFZ_PROFILES,
} from "./ffz-clock.js";

const MS_PER_DAY = 86_400_000;
const MS_PER_SECOND = 1_000;

/** The coarse→fine band order the `lar_ffz` address serializes in (Theme first). */
export const FFZ_ADDRESS_ORDER = ["Theme", "Arc", "Measure", "Beat", "Pulse"] as const;

/** The inputs a drawer ALREADY holds, projected onto the rhythmic bands. */
export interface FfzProjectInput {
  /** Epoch ms the turn was captured at — drives the coarse bands (Arc, Theme). */
  readonly capturedTime: number;
  /**
   * Turn-index within the session (= L1 Beat count) — drives the fine bands
   * (Beat, Measure). Absent ⇒ only the coarse prefix projects (no fabricated phase).
   */
  readonly sessionPosition?: number;
  /** FFZ_PROFILES key (default "session"); selects the cycling bounds. */
  readonly profile?: string;
}

/** Resolve a profile's bounds, falling back to the default set for an unknown name. */
function boundsFor(profile: string): FfzLevel {
  return FFZ_PROFILES[profile]?.bounds ?? FFZ_DEFAULT_BOUNDS;
}

/**
 * Project a drawer's captured time/position onto the `lar_ffz` rhythmic address —
 * pure, deterministic, STATELESS. Same inputs → same address. Returns null when no
 * usable wall-time is present (never fabricates a phase).
 *
 * Coarse bands (always, from wall-time): Theme = epoch/cycle index (unbounded),
 * Arc = day within the cycle. Fine bands (only when `sessionPosition` is present):
 * Measure + Beat from the turn-index, plus Pulse (the finest wall tick). Absent a
 * position, the address truncates to the coarse prefix `"<profile>/<Theme>.<Arc>"`.
 */
export function ffzProject(input: FfzProjectInput): string | null {
  const { capturedTime, sessionPosition, profile = "session" } = input;
  if (!Number.isFinite(capturedTime) || capturedTime < 0) return null;

  const b = boundsFor(profile);
  const b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];

  // --- coarse bands (wall-time) ---
  const days = Math.floor(capturedTime / MS_PER_DAY);
  const arc = b3 > 0 ? days % b3 : days; // Arc (L3) — day within the cycle
  const theme = b3 > 0 ? Math.floor(days / b3) : 0; // Theme (L4) — epoch, unbounded

  // --- fine bands (session position) ---
  const hasPos = sessionPosition != null && Number.isFinite(sessionPosition) && sessionPosition >= 0;
  if (!hasPos) {
    // Coarse prefix only — the fine bands stay unstamped (no phantom phase).
    return `${profile}/${theme}.${arc}`;
  }
  const p = Math.floor(sessionPosition);
  const beat = b1 > 0 ? p % b1 : p; // Beat (L1) — the anchor grain
  const measure = b1 > 0 && b2 > 0 ? Math.floor(p / b1) % b2 : 0; // Measure (L2)
  const pulse = b0 > 0 ? Math.floor(capturedTime / MS_PER_SECOND) % b0 : 0; // Pulse (L0) — finest wall tick

  return `${profile}/${theme}.${arc}.${measure}.${beat}.${pulse}`;
}

/**
 * Take a coarser rhythmic read by keeping the first `bands` segments (coarse→fine,
 * Theme first) and dropping the trailing finer ones — the prefix-truncation the
 * address shape guarantees. The `<profile>/` prefix is preserved. Clamps to the
 * available band count; `bands <= 0` keeps the profile prefix with no bands.
 */
export function ffzTruncate(address: string, bands: number): string {
  const slash = address.indexOf("/");
  if (slash < 0) {
    // No profile prefix — operate on the bare band tuple.
    return address.split(".").slice(0, Math.max(0, bands)).join(".");
  }
  const prefix = address.slice(0, slash);
  const tuple = address.slice(slash + 1).split(".");
  const kept = tuple.slice(0, Math.max(0, bands));
  return `${prefix}/${kept.join(".")}`;
}
