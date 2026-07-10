/**
 * Pono Level — canonical SDM+ scalar instrument.
 *
 * Integer Levels on the closed 0–20 range.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/loci/iam
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

export function parsePonoLevel(raw: unknown): PonoLevel | null {
  const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw.trim()) : raw;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (isPonoLevel(value)) return value;
  return null;
}

export function formatPonoLevel(level: PonoLevel): string {
  return String(level);
}
