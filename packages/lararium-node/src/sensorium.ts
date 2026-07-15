/**
 * sensorium — the SHEAF-TRUE composition primitive: a sensorium is a DIRECTORY that `#has` caps,
 * and the filetree IS the composition (has-stack.md#runtime-twin — "a palace IS its cap-stack").
 *
 * The operator's sheaf ruling splits a sensorium's caps into two kinds, and this manifest encodes
 * exactly that split — NO more:
 *
 *   FIBER caps  — content · structure · form. Each STORES bytes (a chroma leaf-DIR). They ride
 *                 `has.*`: a THIN edge `{dir, engine}` naming WHICH cap + WHERE its bytes live.
 *   BASE caps   — bands · coupling. NO persistent bytes. `bands` = the interval-grain metadata the
 *                 FFZ membership-tree address carries (a prefix code computed from the worldline's
 *                 own path — ffz_address); `coupling` = the dumb child-edges that glue
 *                 sub-sensoriums (the coupling APERTURES — surrogate-gated ETE, Gaussian cTE,
 *                 salience fusion — read on demand elsewhere, each naming its focus). They live IN
 *                 the manifest STRUCTURE, never as leaf-dirs.
 *
 * THIN / dumb edges (has-stack clause 7): `has.*` declares which caps + where the bytes, and nothing
 * richer — the semantics stay in each cap's own meme, never in this edge. We do NOT enrich `has.*`
 * with role-vocabulary (that would be the interface-ontology sneaking back). `has` is an OPEN record
 * (clause 4: no fixed enum of blessed caps); the `memory` sensorium happens to wear content/structure/
 * form, but the type never mandates that set.
 *
 * A cap's `dir` reads RELATIVE to the sensorium dir when the bytes sit INSIDE it (the consolidated
 * SHEAF-TRUE tree relocates/rsyncs as one), and ABSOLUTE when they sit outside it. The `memory`
 * sensorium now reads FULLY RELATIVE — content joined structure/form inside the tree when the
 * content-cap-home ruling retired (the lararium owns its content plane; a guest `~/.mempalace` is
 * imported FROM, never bound to). The absolute form stays live for caps that genuinely sit outside.
 * {@link capDecl} chooses; {@link resolveCapDir} inverts. The manifest thus stays a FAITHFUL snapshot
 * of where the bytes actually are, never a wishful canonical claim.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#palace-instance · lar:///ha.ka.ba/lares/api/pono/has-stack#runtime-twin
 */

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import type { PersistencePolicy, SensoriumContract, SensoriumOrderEvidence, Variance } from "@lararium/mesh";
import { declareSensoriumContract, SHEAF_PLANES, COSHEAF_PLANES } from "@lararium/mesh";
import { atomicWriteFileSync } from "./fs-atomic.js";

/** The manifest schema version — bump only on a breaking shape change. */
export const SENSORIUM_SCHEMA = 1 as const;

/** The manifest filename a sensorium dir carries (a self-describing marker, like island.manifest.json). */
export const SENSORIUM_MANIFEST = "manifest.json";

/**
 * The gluing POSTURE a plane's cap takes — the li/ki dual pair the sensorium holds SEPARATELY
 * (li-ki-integrities.md#crucible-tested). The taxonomy LIVES in `@lararium/mesh` beside the organ
 * that enforces it (sensorium-consistency); this hull re-imports and re-surfaces it for node callers:
 *
 *   `sheaf`   — li (理). CONTRAVARIANT restriction, global→local: a value defined over a region
 *               RESTRICTS onto a sub-region. content/structure/form ride here.
 *   `cosheaf` — ki (氣). COVARIANT extension, local→global: a local value EXTENDS outward. bands/coupling
 *               ride here — read via {@link planeVariance}.
 *
 * The keystone: mixing them under ONE contravariant gluing SILENTLY corrupts — it penalizes
 * the flow (ki) for failing to be static (li). Consistency runs SEPARATELY per posture, never merged.
 */
export { SHEAF_PLANES, COSHEAF_PLANES } from "@lararium/mesh";
export type { Variance } from "@lararium/mesh";

/**
 * A FIBER-cap edge — THIN by law (has-stack clause 7): `dir` (relative-if-inside / absolute-if-outside)
 * + `engine` (the holder that stores the bytes) + `variance` (the gluing posture; li-sheaf by default).
 * No role vocabulary rides here — `variance` names the DUAL-PAIR side, not a role.
 */
export interface CapDecl {
  /** where the bytes live — relative to the sensorium dir, or absolute when they sit outside it. */
  readonly dir: string;
  /** the store engine that holds this cap (e.g. "mempalace"); a WHERE-hint, never a role claim. */
  readonly engine: string;
  /**
   * the gluing posture (li-ki-integrities.md#crucible-tested) — `sheaf` (li, restriction) by default;
   * a cosheaf-natured fiber cap declares `cosheaf` explicitly. Fiber caps (content/structure/form) are
   * sheaves; the cap SELF-DESCRIBES its variance rather than relying on a central name check (clause 4:
   * `has` is an OPEN record, so the partition reads the tag, never a hardcoded enum).
   */
  readonly variance: Variance;
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

/** Evidence a projector may use to order durable vectors for a derived reading. */
export type SensoriumOrder = SensoriumOrderEvidence;

/** A sensorium manifest — schema 1. The whole composition, declared thin. */
export interface SensoriumManifest {
  readonly schema: typeof SENSORIUM_SCHEMA;
  /** the sensorium name (== the dir's role in the tree, e.g. "memory"). */
  readonly sensorium: string;
  /** the sensorium's stable graph address. */
  readonly lar: string;
  /** FIBER caps — open record, THIN `{dir, engine, variance}` edges (clause 4 + 7); li-sheaves by default. */
  readonly has: Readonly<Record<string, CapDecl>>;
  /** BASE cap — the FFZ membership-address grain (li-side stamp metadata; not a consistency plane). No bytes. */
  readonly bands: SensoriumBands;
  /** BASE cap — declared ordering evidence. It does not grant an aperture by itself. */
  readonly order?: SensoriumOrder;
  /** BASE cap — the dumb child-edges gluing sub-sensoriums. No bytes. KI cosheaf (see {@link planeVariance}). */
  readonly coupling: SensoriumCoupling;
  /**
   * BASE cap (optional) — the persistence dials for this sensorium's `has.persistence` cap (the 5th
   * part). `halfLife` = the maturation MODE:
   * null = append-only-witness (authority, never cools — the Mempalace) · finite = affinity-
   * maturation (ephemeral exploratory sensoria; standing cools). Absent = the sensorium composes no
   * persistence cap. ORTHOGONAL to {@link ephemeral} (path-A un-fuse: `ephemeral` stays swept-on-
   * process-exit; the maturation mode lives HERE in `halfLife`, never overloaded onto the bool).
   */
  readonly persistencePolicy?: PersistencePolicy;
  /**
   * BASE cap (optional) — the APERTURE declarations: which membership cells this sensorium's mood
   * can EARN, and the provider that earns each (`{beat: "worldline-dag"}` for a rhizome — grounding
   * acts exist; `{measure: "boundary-changepoint"}` for geology — discovered strata). An enricher
   * fills ONLY declared cells through the named provider — declaration-carries-authority; an
   * undeclared fill refuses loud. Absent = this sensorium earns nothing beyond capture-given cells.
   */
  readonly apertures?: Readonly<Record<string, string>>;
  /** does this sensorium's bytes live in ephemeral scratch (swept-on-exit), or durable store? */
  readonly ephemeral: boolean;
  /** ISO-8601 mint time. */
  readonly created: string;
}

/** Derive the platform-blind cap contract from this rooted Node manifest. */
export function sensoriumContract(m: SensoriumManifest): SensoriumContract {
  return declareSensoriumContract({
    has: Object.keys(m.has),
    ...(m.order ? { order: m.order } : {}),
    ...(m.apertures ? { apertures: m.apertures } : {}),
  });
}

/** The manifest path for a sensorium dir. */
export function manifestPath(sensoriumDir: string): string {
  return join(sensoriumDir, SENSORIUM_MANIFEST);
}

/**
 * Build a THIN fiber-cap edge for a cap whose bytes live at `absDir`. Stores a RELATIVE dir when
 * `absDir` sits inside `sensoriumDir` (the consolidated tree — structure/form), else the ABSOLUTE dir
 * (a cap whose bytes sit outside, e.g. the external `content` cap at `~/.mempalace`). The relative form
 * uses POSIX separators so the manifest stays portable.
 */
export function capDecl(
  sensoriumDir: string, absDir: string, engine: string, variance: Variance = "sheaf",
): CapDecl {
  const rel = relative(sensoriumDir, absDir);
  // The SELF cap — its bytes ARE the sensorium dir (a peer whose content leaf IS its own dir). `relative`
  // returns "" there; store it as the absolute-self-path `"."` (a real inside-relative), never the
  // absolute dir (which would falsely read as "outside" and break the relocate-as-one invariant).
  if (rel === "") return { dir: ".", engine, variance };
  const inside = !rel.startsWith("..") && !isAbsolute(rel);
  return { dir: inside ? rel.split(/[\\/]/).join("/") : absDir, engine, variance };
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

/**
 * The gluing posture of any plane — the li/ki dual-pair partition, read from the manifest itself:
 * a declared fiber cap reports its OWN `variance` tag; the base-cap `bands`/`coupling` planes report
 * their canonical `cosheaf` posture (they live in the manifest's own base-cap fields, not `has.*`);
 * an unknown plane reports `null`. The consistency reads route through here so the li-radius runs only
 * over the sheaf planes and the ki co-consistency only over the cosheaf planes — never merged.
 */
export function planeVariance(m: SensoriumManifest, plane: string): Variance | null {
  const decl = m.has[plane];
  if (decl) return decl.variance;
  if ((COSHEAF_PLANES as readonly string[]).includes(plane)) return "cosheaf";
  if ((SHEAF_PLANES as readonly string[]).includes(plane)) return "sheaf";
  return null;
}

/** Options for {@link buildSensoriumManifest}. `caps` maps cap-name → its resolved absolute store dir + engine. */
export interface BuildSensoriumOptions {
  readonly sensorium: string;
  readonly lar: string;
  /**
   * cap-name → { absDir, engine, variance? } — each becomes a THIN `has.*` fiber edge via {@link capDecl}.
   * `variance` defaults to `sheaf` (li); a cosheaf-natured fiber cap declares it (bands/coupling ride the
   * base-cap fields, not `has`, so they carry their cosheaf posture structurally — see {@link planeVariance}).
   */
  readonly caps: Readonly<Record<string, {
    readonly absDir: string; readonly engine: string; readonly variance?: Variance;
  }>>;
  readonly bands?: SensoriumBands;
  /** declared ordering evidence for a derived reading. */
  readonly order?: SensoriumOrder;
  /** child sub-sensoriums — each { sensorium, absDir } becomes a dumb `coupling.children[]` edge. */
  readonly children?: ReadonlyArray<{ readonly sensorium: string; readonly absDir: string }>;
  /** the persistence dials (see {@link SensoriumManifest.persistencePolicy}); paired with a `has.persistence` cap. */
  readonly persistencePolicy?: PersistencePolicy;
  /**
   * BASE cap (optional) — the APERTURE declarations: which membership cells this sensorium's mood
   * can EARN, and the provider that earns each (`{beat: "worldline-dag"}` for a rhizome — grounding
   * acts exist; `{measure: "boundary-changepoint"}` for geology — discovered strata). An enricher
   * fills ONLY declared cells through the named provider — declaration-carries-authority; an
   * undeclared fill refuses loud. Absent = this sensorium earns nothing beyond capture-given cells.
   */
  readonly apertures?: Readonly<Record<string, string>>;
  readonly ephemeral?: boolean;
  /** override the mint time (tests); defaults to now. */
  readonly created?: string;
}

/** Construct a schema-1 manifest from resolved absolute dirs, choosing relative/absolute per cap. */
export function buildSensoriumManifest(sensoriumDir: string, opts: BuildSensoriumOptions): SensoriumManifest {
  const has: Record<string, CapDecl> = {};
  for (const [name, { absDir, engine, variance }] of Object.entries(opts.caps)) {
    has[name] = capDecl(sensoriumDir, absDir, engine, variance ?? "sheaf");
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
    ...(opts.order ? { order: opts.order } : {}),
    coupling: { children },
    ...(opts.persistencePolicy ? { persistencePolicy: opts.persistencePolicy } : {}),
    ...(opts.apertures ? { apertures: opts.apertures } : {}),
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
