/**
 * Pono Level — canonical SDM+ scalar instrument.
 *
 * Local-first authority dials use integer Levels on the closed 0–20 range.
 * Former 0.00–1.00 scalar values map by round(old * 20); keep that converter
 * explicit so legacy ratios cannot silently re-enter current protocol surfaces.
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/iam
 */

export type PonoLevel = number & { readonly __ponoLevel: unique symbol };

export const PONO_LEVEL_MIN = 0;
export const PONO_LEVEL_MAX = 20;

export function isPonoLevel(value: unknown): value is PonoLevel {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= PONO_LEVEL_MIN &&
    value <= PONO_LEVEL_MAX
  );
}

export function clampPonoLevel(value: number): PonoLevel {
  if (!Number.isFinite(value)) return PONO_LEVEL_MIN as PonoLevel;
  return Math.min(PONO_LEVEL_MAX, Math.max(PONO_LEVEL_MIN, Math.round(value))) as PonoLevel;
}

export function legacyScalarToPonoLevel(value: number): PonoLevel {
  return clampPonoLevel(value * PONO_LEVEL_MAX);
}

export interface ParsePonoLevelOptions {
  /** Explicit migration bridge for known legacy 0.00–1.00 values. Default: false. */
  legacy01?: boolean;
}

export function parsePonoLevel(raw: unknown, opts: ParsePonoLevelOptions = {}): PonoLevel | null {
  const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw.trim()) : raw;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (isPonoLevel(value)) return value;
  if (opts.legacy01 === true && value >= 0 && value <= 1) return legacyScalarToPonoLevel(value);
  return null;
}

export function formatPonoLevel(level: PonoLevel): string {
  return String(level);
}
