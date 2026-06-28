/**
 * handler-args — job-handler argument helpers.
 *
 * Every VerbReactor receives `args: Readonly<Record<string, unknown>>`.
 * These helpers coerce values safely so handler bodies stay declarative.
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/handler-args
 */

export function stringArg(args: Readonly<Record<string, unknown>>, key: string): string {
  const v = args[key];
  return typeof v === "string" ? v : "";
}

export function optionalStringArg(args: Readonly<Record<string, unknown>>, key: string): string | null {
  const v = args[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function numberArg(args: Readonly<Record<string, unknown>>, key: string, fallback: number): number {
  const v = args[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Generate a stable-ish requestId for internal ChangeOrigin records when no
 *  job context supplies one (wiki-open, add-bag, etc.). */
export function makeRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
