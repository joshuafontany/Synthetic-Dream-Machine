/**
 * sensorium — the SHEAF-TRUE composition primitive: a sensorium is a DIRECTORY that `#has` caps,
 * and the filetree IS the composition (has-stack.md#runtime-twin — "a palace IS its cap-stack").
 *
 * The operator's sheaf ruling splits a sensorium's caps into two kinds, and this manifest encodes
 * exactly that split — NO more:
 *
 *   FIBER caps  — content · structure · form. Each STORES bytes (a chroma leaf-DIR). They ride
 *                 `has.*`: a THIN edge `{dir, engine}` naming WHICH cap + WHERE its bytes live.
 *   BASE caps   — bands · coupling. NO persistent bytes. `bands` = the interval-grain metadata for
 *                 the wavelet decomposition computed ON READ; `coupling` = the dumb child-edges that
 *                 glue sub-sensoriums (transfer-entropy read on demand elsewhere). They live IN the
 *                 manifest STRUCTURE, never as leaf-dirs.
 *
 * THIN / dumb edges (has-stack clause 7): `has.*` declares which caps + where the bytes, and nothing
 * richer — the semantics stay in each cap's own meme, never in this edge. We do NOT enrich `has.*`
 * with role-vocabulary (that would be the interface-ontology sneaking back). `has` is an OPEN record
 * (clause 4: no fixed enum of blessed caps); the `memory` sensorium happens to wear content/structure/
 * form, but the type never mandates that set.
 *
 * A cap's `dir` reads RELATIVE to the sensorium dir when the bytes sit INSIDE it (structure/form — the
 * consolidated SHEAF-TRUE tree relocates/rsyncs as one), and ABSOLUTE when they sit outside it (the
 * `content` cap, by the content-cap-home ruling, stays external at the upstream-default `~/.mempalace`).
 * The `memory` sensorium is thus a MIXED layout — absolute content + relative structure/form.
 * {@link capDecl} chooses; {@link resolveCapDir} inverts. The manifest thus stays a FAITHFUL snapshot
 * of where the bytes actually are, never a wishful canonical claim.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace#palace-instance · lar:///ha.ka.ba/@lares/api/pono/has-stack#runtime-twin
 */

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { atomicWriteFileSync } from "./fs-atomic.js";

/** The manifest schema version — bump only on a breaking shape change. */
export const SENSORIUM_SCHEMA = 1 as const;

/** The manifest filename a sensorium dir carries (a self-describing marker, like island.manifest.json). */
export const SENSORIUM_MANIFEST = "manifest.json";

/**
 * A FIBER-cap edge — THIN by law (has-stack clause 7): `dir` (relative-if-inside / absolute-if-outside)
 * + `engine` (the holder that stores the bytes). No role vocabulary rides here.
 */
export interface CapDecl {
  /** where the bytes live — relative to the sensorium dir, or absolute when they sit outside it. */
  readonly dir: string;
  /** the store engine that holds this cap (e.g. "mempalace"); a WHERE-hint, never a role claim. */
  readonly engine: string;
}

/**
 * A COUPLING child-edge — a dumb declaration that a sub-sensorium hangs here. It names the child +
 * where its own manifest dir sits (relative-if-nested / absolute). The transfer-entropy that the
 * coupling READS on demand lives in its own domain, never in this edge.
 */
export interface SensoriumChild {
  /** the child sensorium's name (its own manifest's `sensorium`). */
  readonly sensorium: string;
  /** where the child sensorium dir sits — relative to THIS sensorium dir, or absolute. */
  readonly dir: string;
}

/** The base-cap COUPLING structure: the child-edges that glue sub-sensoriums. No bytes. */
export interface SensoriumCoupling {
  readonly children: readonly SensoriumChild[];
}

/**
 * The base-cap BANDS structure: interval-grain metadata for the wavelet decomposition computed on
 * read. No bytes, no role vocabulary — an open metadata bag the read-path consults for its grain.
 */
export type SensoriumBands = Readonly<Record<string, unknown>>;

/** A sensorium manifest — schema 1. The whole composition, declared thin. */
export interface SensoriumManifest {
  readonly schema: typeof SENSORIUM_SCHEMA;
  /** the sensorium name (== the dir's role in the tree, e.g. "memory"). */
  readonly sensorium: string;
  /** the sensorium's stable graph address. */
  readonly lar: string;
  /** FIBER caps — open record, THIN `{dir, engine}` edges (clause 4 + 7). */
  readonly has: Readonly<Record<string, CapDecl>>;
  /** BASE cap — interval-grain for the on-read wavelet bands. No bytes. */
  readonly bands: SensoriumBands;
  /** BASE cap — the dumb child-edges gluing sub-sensoriums. No bytes. */
  readonly coupling: SensoriumCoupling;
  /** does this sensorium's bytes live in ephemeral scratch (swept), or durable store? */
  readonly ephemeral: boolean;
  /** ISO-8601 mint time. */
  readonly created: string;
}

/** The manifest path for a sensorium dir. */
export function manifestPath(sensoriumDir: string): string {
  return join(sensoriumDir, SENSORIUM_MANIFEST);
}

/**
 * Build a THIN fiber-cap edge for a cap whose bytes live at `absDir`. Stores a RELATIVE dir when
 * `absDir` sits inside `sensoriumDir` (the consolidated tree), else the ABSOLUTE dir (the strangler
 * window). The relative form uses POSIX separators so the manifest stays portable.
 */
export function capDecl(sensoriumDir: string, absDir: string, engine: string): CapDecl {
  const rel = relative(sensoriumDir, absDir);
  const inside = rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
  return { dir: inside ? rel.split(/[\\/]/).join("/") : absDir, engine };
}

/** Invert {@link capDecl}: resolve a cap/child `dir` back to an absolute path against the sensorium dir. */
export function resolveCapDir(sensoriumDir: string, dir: string): string {
  return isAbsolute(dir) ? dir : join(sensoriumDir, dir);
}

/** Resolve one fiber cap's absolute store dir; `null` when the cap is absent (declared-unresolved is lawful). */
export function capDir(sensoriumDir: string, m: SensoriumManifest, cap: string): string | null {
  const decl = m.has[cap];
  return decl ? resolveCapDir(sensoriumDir, decl.dir) : null;
}

/** Options for {@link buildSensoriumManifest}. `caps` maps cap-name → its resolved absolute store dir + engine. */
export interface BuildSensoriumOptions {
  readonly sensorium: string;
  readonly lar: string;
  /** cap-name → { absDir, engine } — each becomes a THIN `has.*` fiber edge via {@link capDecl}. */
  readonly caps: Readonly<Record<string, { readonly absDir: string; readonly engine: string }>>;
  readonly bands?: SensoriumBands;
  /** child sub-sensoriums — each { sensorium, absDir } becomes a dumb `coupling.children[]` edge. */
  readonly children?: ReadonlyArray<{ readonly sensorium: string; readonly absDir: string }>;
  readonly ephemeral?: boolean;
  /** override the mint time (tests); defaults to now. */
  readonly created?: string;
}

/** Construct a schema-1 manifest from resolved absolute dirs, choosing relative/absolute per cap. */
export function buildSensoriumManifest(sensoriumDir: string, opts: BuildSensoriumOptions): SensoriumManifest {
  const has: Record<string, CapDecl> = {};
  for (const [name, { absDir, engine }] of Object.entries(opts.caps)) {
    has[name] = capDecl(sensoriumDir, absDir, engine);
  }
  const children: SensoriumChild[] = (opts.children ?? []).map((c) => {
    const decl = capDecl(sensoriumDir, c.absDir, "");
    return { sensorium: c.sensorium, dir: decl.dir };
  });
  return {
    schema: SENSORIUM_SCHEMA,
    sensorium: opts.sensorium,
    lar: opts.lar,
    has,
    bands: opts.bands ?? {},
    coupling: { children },
    ephemeral: opts.ephemeral ?? false,
    created: opts.created ?? new Date().toISOString(),
  };
}

/** Read a sensorium manifest; `null` when absent (a dir without a manifest is not yet a sensorium). */
export function readManifest(sensoriumDir: string): SensoriumManifest | null {
  const p = manifestPath(sensoriumDir);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as SensoriumManifest;
}

/** Write a sensorium manifest atomically (write-temp-then-rename) so a reader/crash never tears it. */
export function writeManifest(sensoriumDir: string, m: SensoriumManifest): void {
  atomicWriteFileSync(manifestPath(sensoriumDir), JSON.stringify(m, null, 2) + "\n");
}
