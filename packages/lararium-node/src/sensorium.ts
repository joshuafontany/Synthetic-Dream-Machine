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
 * sensorium reads FULLY RELATIVE — content joins structure/form inside the tree, the
 * lararium owning its content plane (a guest `~/.mempalace` is
 * imported FROM, never bound to). The absolute form stays live for caps that genuinely sit outside.
 * {@link capDecl} chooses; {@link resolveCapDir} inverts. The manifest thus stays a FAITHFUL snapshot
 * of where the bytes actually are, never a wishful canonical claim.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#palace-instance · lar:///ha.ka.ba/lares/api/pono/has-stack#runtime-twin
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type {
  PersistencePolicy, SensoriumContract, SensoriumOrderEvidence, Variance,
  Testimony, Witness, StoreCode,
} from "@lararium/mesh";
import {
  declareSensoriumContract, SHEAF_PLANES, COSHEAF_PLANES,
  canonicalJsonBytes, defaultCryptoProvider, sha256Hex,
  reentryPrior, admit as keelAdmit, storeCodeFrom, observeClaim,
  verifyWitnessSig, WITNESS_POLICY,
  deriveLifecycle, isLifecycleState, type SensoriumLifecycleState,
  parseRetirementRecord, type RetirementRecord,
} from "@lararium/mesh";
import {
  resolveHolderCapEnv, resolveFormEncoderSpawn, resolveContentPalaceSpawn, resolvePersistencePalaceSpawn,
  resolveStructurePalaceSpawn,
} from "@lararium/mempalace";
import type { MoveSkeleton, ConstructiconBasis, BearingFacets } from "@lararium/tw5/form-layer";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { makeSearchCap, type SearchCap, type SearchCapOptions } from "./search-cap.js";
import { makeKgCap, type KgCap, type KgCapOptions } from "./kg-cap.js";
import { makeGraphCap, type GraphCap, type GraphCapOptions } from "./graph-cap.js";

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
   * persistence cap. ORTHOGONAL to {@link ephemeral} (the un-fuse path: `ephemeral` stays swept-on-
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
  /**
   * BASE cap — the DECLARED lifecycle STATE a reconciler drives (pioneer → hardening → durable, then a
   * judged tombstone). A manifest with no declared value reads one DERIVED from `ephemeral`+`halfLife`
   * ({@link deriveLifecycle}) — lossless migration, zero disk edit until the next write. The graduated
   * state ladder rides the DURABLE manifest here; the binary `ephemeral` bool of the scratch leak-record
   * (sense-sensorium.ts `sensorium.json`) stays its own `docker run --rm` concern.
   */
  readonly lifecycle: SensoriumLifecycleState;
  /**
   * BASE cap (optional) — the recorded RETIREMENT (a judged tombstone): the MUSTIE grounds, when, and
   * the state to restore on un-retire (move-not-delete). Present only when `lifecycle === "tombstone"`;
   * a live sensorium carries none. The bytes never delete on retire — only the explicit HITL `purge` GCs.
   */
  readonly retirement?: RetirementRecord;
  /** ISO-8601 mint time. */
  readonly created: string;
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`sensorium manifest: ${label} needs an object`);
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`sensorium manifest: ${label} needs a non-empty string`);
  }
  return value;
}

/** Validate an incoming rooted declaration before any cap resolves its local bytes. */
export function parseSensoriumManifest(value: unknown): SensoriumManifest {
  const raw = objectValue(value, "root");
  if (raw.schema !== SENSORIUM_SCHEMA) {
    throw new Error(`sensorium manifest: schema needs ${SENSORIUM_SCHEMA}`);
  }
  const rawHas = objectValue(raw.has, "has");
  const has: Record<string, CapDecl> = {};
  for (const [name, rawCap] of Object.entries(rawHas)) {
    const cap = objectValue(rawCap, `has.${name}`);
    if (!name) throw new Error("sensorium manifest: every #has capability needs a non-empty name");
    const variance = cap.variance;
    if (variance !== "sheaf" && variance !== "cosheaf") {
      throw new Error(`sensorium manifest: has.${name}.variance needs sheaf or cosheaf`);
    }
    has[name] = {
      dir: nonEmptyString(cap.dir, `has.${name}.dir`),
      engine: nonEmptyString(cap.engine, `has.${name}.engine`),
      variance,
    };
  }
  const contract = declareSensoriumContract({
    has: Object.keys(has),
    ...(raw.order === undefined ? {} : { order: raw.order as SensoriumOrderEvidence }),
    ...(raw.apertures === undefined ? {} : { apertures: raw.apertures as Record<string, string> }),
  });
  const coupling = objectValue(raw.coupling, "coupling");
  if (!Array.isArray(coupling.children)) {
    throw new Error("sensorium manifest: coupling.children needs an array");
  }
  const children = coupling.children.map((value, index) => {
    const child = objectValue(value, `coupling.children[${index}]`);
    return {
      sensorium: nonEmptyString(child.sensorium, `coupling.children[${index}].sensorium`),
      dir: nonEmptyString(child.dir, `coupling.children[${index}].dir`),
    };
  });
  const persistence = raw.persistencePolicy === undefined ? undefined : objectValue(raw.persistencePolicy, "persistencePolicy");
  if (persistence && persistence.halfLife !== null &&
      (typeof persistence.halfLife !== "number" || !Number.isFinite(persistence.halfLife) || persistence.halfLife <= 0)) {
    throw new Error("sensorium manifest: persistencePolicy.halfLife needs a positive number or null");
  }
  const created = nonEmptyString(raw.created, "created");
  if (!Number.isFinite(Date.parse(created))) {
    throw new Error("sensorium manifest: created needs an ISO-8601 timestamp");
  }
  if (typeof raw.ephemeral !== "boolean") {
    throw new Error("sensorium manifest: ephemeral needs a boolean");
  }
  // The lifecycle reader-default: a declared state stands; an absent/unknown one re-derives from
  // ephemeral+halfLife, so a manifest that predates the field reads a lifecycle with zero disk edit.
  const halfLife = persistence ? (persistence.halfLife as number | null) : undefined;
  const lifecycle = isLifecycleState(raw.lifecycle) ? raw.lifecycle : deriveLifecycle(raw.ephemeral, halfLife);
  const retirement = parseRetirementRecord(raw.retirement);
  return {
    schema: SENSORIUM_SCHEMA,
    sensorium: nonEmptyString(raw.sensorium, "sensorium"),
    lar: nonEmptyString(raw.lar, "lar"),
    has,
    bands: objectValue(raw.bands, "bands"),
    ...(contract.order ? { order: contract.order } : {}),
    coupling: { children },
    ...(persistence ? { persistencePolicy: { halfLife: persistence.halfLife as number | null } } : {}),
    ...(contract.apertures ? { apertures: contract.apertures } : {}),
    ephemeral: raw.ephemeral,
    lifecycle,
    ...(retirement ? { retirement } : {}),
    created,
  };
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
  /** the DECLARED lifecycle state; absent → derived from ephemeral+halfLife ({@link deriveLifecycle}).
   *  A fresh `build --ephemeral` passes `pioneer`; most mints let it derive. */
  readonly lifecycle?: SensoriumLifecycleState;
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
    lifecycle: opts.lifecycle ?? deriveLifecycle(opts.ephemeral ?? false, opts.persistencePolicy?.halfLife),
    created: opts.created ?? new Date().toISOString(),
  };
}

/** Read a sensorium manifest; `null` when absent (a dir without a manifest is not yet a sensorium). */
export function readManifest(sensoriumDir: string): SensoriumManifest | null {
  const p = manifestPath(sensoriumDir);
  if (!existsSync(p)) return null;
  return parseSensoriumManifest(JSON.parse(readFileSync(p, "utf8")));
}

/** Write a sensorium manifest atomically (write-temp-then-rename) so a reader/crash never tears it. */
export function writeManifest(sensoriumDir: string, m: SensoriumManifest): void {
  atomicWriteFileSync(manifestPath(sensoriumDir), JSON.stringify(parseSensoriumManifest(m), null, 2) + "\n");
}

// ============================================================================
// palace-holder — the SHARED palace-instance transport cap (folded from palace-holder.ts)
// ============================================================================
/**
 * palace-holder — the SHARED palace-instance transport cap (the @daemon's TS side).
 *
 * The nameless palace-instance model, one level up from the python holder-caps collapse
 * (b18235f6): a palace client = its #has-stack of caps composed at a root, NOT a bespoke
 * holder per store with copy-pasted serve machinery. This module IS the one cap every
 * local palace-instance #has — the NDJSON line-RPC transport over a persistent python
 * `serve` holder, ref-counted to ONE process per canonical palace dir (reap-don't-pile).
 *
 * The caps a palace-instance composes from here:
 *   - the TRANSPORT cap  → {@link PalaceHolder} (this module): spawn-once, line-RPC, stderr
 *     surfacing, ping handshake, self-healing registry, ref-counted singleton-per-dir.
 *   - the REGISTRY cap   → {@link PalaceHolderRegistry}: ONE map per palace TYPE, so two
 *     palace types serving the SAME dir never collide (structurepalace ⟂ formpalace).
 * Each store (structurepalace · formpalace) then #has only its own OP SURFACE — a thin typed
 * facade of `holder.send(op, fields)` calls — and nothing of the transport machinery.
 *
 * The honest grain (NOT a god base-class — the holder 2-shapes lesson carried up): the
 * two LOCAL stores split by op-surface, but BOTH ride the identical transport, so the
 * transport collapses to ONE file while the op-surfaces stay distinct. A third shape, the
 * MESHPALACE, would compose this SAME transport plus a SOURCE-FEED cap (see {@link PalaceFeedCap})
 * — modeled here, federation deferred.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */


/** A child process plus the read-only stream surface the line-RPC needs (test-injectable). */
export interface PalaceHolderProc {
  readonly stdin: NodeJS.WritableStream | null;
  readonly stdout: NodeJS.ReadableStream | null;
  readonly stderr: NodeJS.ReadableStream | null;
  on(event: "exit", cb: (code: number | null) => void): void;
  on(event: "error", cb: (err: Error) => void): void;
  kill(): void;
}

/** Test shore: produce the holder process for a canonical palace dir (defaults to a python helper). */
export type PalaceHolderSpawn = (canonicalDir: string) => PalaceHolderProc;

/** The resolved spawn inputs a python `serve` holder needs (the shape StructurePalaceSpawn / FormEncoderSpawn share). */
export interface ResolvedServeSpawn {
  /** the venv-aware interpreter, or null when none holds mempalace */
  readonly python: string | null;
  /** the helper script (full path) to run `serve` on */
  readonly script: string;
  /** the mempalace submodule root — the spawn cwd + PYTHONPATH so `import mempalace` resolves */
  readonly submoduleRoot: string;
  /** whether {@link ResolvedServeSpawn.script} exists on disk */
  readonly scriptPresent: boolean;
}

/**
 * Build the default holder spawn for a python `serve` palace store: resolve the venv-aware python
 * + helper script (lazily, per spawn, via `resolveSpawn`), then run `<python> <script> serve
 * --palace <dir>` with PYTHONPATH reaching the mempalace submodule. structurepalace + formpalace share
 * this verbatim — the only divergence was the resolve fn, lifted to a parameter here.
 */
export function makeServeSpawn(resolveSpawn: () => ResolvedServeSpawn, opts: { readonly palaceless?: boolean } = {}): PalaceHolderSpawn {
  return (canonicalDir: string): PalaceHolderProc => {
    const { python, script, submoduleRoot, scriptPresent } = resolveSpawn();
    if (!python) throw new Error("no python holds mempalace — create ~/.venv and install the sidecar (`lares wake --install`)");
    if (!scriptPresent) throw new Error(`serve helper missing at ${script}`);
    // PYTHONPATH=submoduleRoot makes `import mempalace` resolve (it is not pip-installed); the venv
    // python supplies chromadb. `python script.py` sets sys.path[0] to the SCRIPT dir, so PYTHONPATH
    // is the shore that reaches the submodule package.
    // The GPU compute cap (LD_LIBRARY_PATH → CUDA runtime libs + the device hint): the `serve` holder
    // opens its chroma collection, which builds the default onnxruntime embedder — and onnxruntime-gpu
    // HARD-fails to import (`libcudart.so.NN`) without the CUDA libs on the loader path. resolveComputeCapEnv
    // walks torch's bundled nvidia wheels; absent (the QA box) it adds only the device hint and degrades to CPU.
    const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveHolderCapEnv(python) };
    // A palace-less holder (the embed cap) serves `serve` with NO --palace: the model is the
    // resource, not a store dir; `canonicalDir` is only the registry KEY, never passed to python.
    const argv = opts.palaceless ? [script, "serve"] : [script, "serve", "--palace", canonicalDir];
    return spawn(python, argv, {
      cwd: submoduleRoot,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    }) as unknown as PalaceHolderProc;
  };
}

/** Canonicalize a palace dir the way the python side will (realpath when it exists, else resolve). */
export function canonicalDirOf(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    return resolve(dir);
  }
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * The TRANSPORT cap — one live holder for one canonical palace dir. Owns the child, speaks
 * NDJSON line-RPC ({id, op, ...fields} → {id, ok, result|error}) over stdin/stdout, buffers
 * the stderr tail and folds it into faults (the silent-error footgun cure), ref-counts its
 * users, and self-heals (drops itself from its registry on death so the next call respawns ONE).
 */
export class PalaceHolder {
  private proc: PalaceHolderProc | null = null;
  private starting: Promise<void> | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private stdoutBuf = "";
  /** Last ~4KB of stderr — a ChromaDB permission/disk-full error surfaces here, never swallowed. */
  private stderrTail = "";
  refs = 0;

  constructor(
    /** the canonical palace dir this holder serves — the registry key */
    readonly canonicalDir: string,
    private readonly spawnProc: PalaceHolderSpawn,
    private readonly timeoutMs: number,
    /** error-message prefix, e.g. "structurepalace" | "form_encoder" */
    private readonly label: string,
    /** drop this holder from its registry on death (self-heal) */
    private readonly dropSelf: (holder: PalaceHolder) => void,
  ) {}

  private async ensure(): Promise<void> {
    if (this.proc) return;
    if (this.starting) return this.starting;
    this.starting = new Promise<void>((res, rej) => {
      const proc = this.spawnProc(this.canonicalDir);
      this.proc = proc;
      proc.stdout?.setEncoding?.("utf8");
      proc.stdout?.on?.("data", (chunk: string) => this.onStdout(chunk));
      proc.stderr?.setEncoding?.("utf8");
      // stderr carries library/banner noise on a healthy boot, but ALSO the real fault on a sick one
      // (ChromaDB permission denied, disk full, an import blow-up). BUFFER its tail and SURFACE it on
      // failure — never swallow it to a noop. stdout stays the JSON-RPC channel.
      proc.stderr?.on?.("data", (chunk: string) => { this.stderrTail = (this.stderrTail + chunk).slice(-4096); });
      proc.on("exit", (code) => this.onDown(this.withStderr(new Error(`${this.label} holder exited (code ${code ?? "null"})`))));
      proc.on("error", (err) => this.onDown(this.withStderr(err)));
      // Handshake: a ping confirms the holder (and its chroma collection) opened before any op rides.
      this.request("ping", {}).then(() => res()).catch(rej);
    });
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  private onStdout(chunk: string): void {
    this.stdoutBuf += chunk;
    let idx: number;
    while ((idx = this.stdoutBuf.indexOf("\n")) !== -1) {
      const line = this.stdoutBuf.slice(0, idx).trim();
      this.stdoutBuf = this.stdoutBuf.slice(idx + 1);
      if (!line) continue;
      let msg: { id?: unknown; ok?: boolean; result?: unknown; error?: string };
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // non-JSON on stdout (stray banner) — ignore
      }
      if (typeof msg.id !== "number") continue;
      const p = this.pending.get(msg.id);
      if (!p) continue;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok === false) p.reject(new Error(msg.error ?? `${this.label} error`));
      else p.resolve(msg.result);
    }
  }

  /** Fold the buffered stderr tail into an error so a python-side fault reaches the caller, not a noop. */
  private withStderr(err: Error): Error {
    const tail = this.stderrTail.trim();
    if (tail) err.message = `${err.message}\n  holder stderr: ${tail}`;
    return err;
  }

  private onDown(err: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
    this.proc = null;
    // Self-healing: drop from the registry so the next call respawns ONE fresh holder.
    this.dropSelf(this);
  }

  private request(op: string, fields: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((res, rej) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error(`${this.label} '${op}' timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve: res, reject: rej, timer });
      try {
        if (!this.proc?.stdin) throw new Error(`${this.label} holder not started`);
        this.proc.stdin.write(JSON.stringify({ id, op, ...fields }) + "\n");
      } catch (err) {
        this.pending.delete(id);
        clearTimeout(timer);
        rej(err as Error);
      }
    });
  }

  /** Ensure the holder is up (handshake once), then issue one RPC and await its result. */
  async send(op: string, fields: Record<string, unknown> = {}): Promise<unknown> {
    await this.ensure();
    return this.request(op, fields);
  }

  shutdown(): void {
    this.onDown(new Error(`${this.label} holder closed`));
    try {
      this.proc?.stdin?.end?.();
    } catch { /* ignore */ }
    this.proc?.kill?.();
  }
}

/**
 * The REGISTRY cap — ONE holder per canonical palace dir, scoped to ONE palace TYPE. Each
 * palace store instantiates its OWN registry, so structurepalace's holders and formpalace's holders
 * stay separate even when they happen to serve the same dir. Makes "one holder, never a pile"
 * true and gives the store a uniform acquire/release lifecycle.
 */
export class PalaceHolderRegistry {
  private readonly holders = new Map<string, PalaceHolder>();

  /** @param label error-message prefix shared by every holder this registry makes. */
  constructor(private readonly label: string) {}

  /** Get-or-create the singleton holder for `canonicalDir` and add a reference to it. */
  acquire(canonicalDir: string, spawnProc: PalaceHolderSpawn, timeoutMs: number): PalaceHolder {
    let holder = this.holders.get(canonicalDir);
    if (!holder) {
      holder = new PalaceHolder(canonicalDir, spawnProc, timeoutMs, this.label, (h) => {
        if (this.holders.get(h.canonicalDir) === h) this.holders.delete(h.canonicalDir);
      });
      this.holders.set(canonicalDir, holder);
    }
    holder.refs += 1;
    return holder;
  }

  /** Release one reference; kill the process (and drop it) when the last reference closes. */
  release(holder: PalaceHolder): void {
    holder.refs -= 1;
    if (holder.refs <= 0) {
      holder.shutdown(); // shutdown → onDown → dropSelf removes it from the map
    }
  }

  /** How many holder processes are live — proves "one holder per palace, never a pile". */
  size(): number {
    return this.holders.size;
  }
}

/**
 * A COMPOSED HOLDER — the send/close handle onto one held line-RPC subprocess. The shape every
 * cap that rides a python holder returns (palace store · encoder · a future consume-holder).
 */
export interface ComposedHolder {
  /** issue one line-RPC to the holder (the op-surface's single verb). */
  send(op: string, fields?: Record<string, unknown>): Promise<unknown>;
  /** release this reference; the holder process dies when the last reference closes. Idempotent. */
  close(): Promise<void>;
}

/** ONE registry per label — module-global so a label's holders singleton across composes. */
const holderRegistries = new Map<string, PalaceHolderRegistry>();

/**
 * composeHolder — the GENERAL held-subprocess cap: one ref-counted line-RPC holder per `key` within
 * a `label` registry (+ a `send`/`close` pair). Knows NOTHING of "palace" — a nameless entity that
 * #has {held-process · line-RPC · one-per-key registry}. `composePalace` and `composeEncoder` both
 * COMPOSE this (siblings, neither over the other — the IoC that dissolves the palace-less sentinel):
 * a palace keys by its store DIR; an encoder keys by its LABEL (the model is the resource, no dir).
 * `key` is handed to `spawn` too — a palace-spawn reads it as the dir; an encoder-spawn ignores it.
 */
export function composeHolder(label: string, key: string, spawn: PalaceHolderSpawn, timeoutMs: number): ComposedHolder {
  let registry = holderRegistries.get(label);
  if (!registry) { registry = new PalaceHolderRegistry(label); holderRegistries.set(label, registry); }
  const reg = registry;
  const holder = reg.acquire(key, spawn, timeoutMs);
  let closed = false;
  return {
    send: (op: string, fields: Record<string, unknown> = {}) => holder.send(op, fields),
    close: async (): Promise<void> => { if (closed) return; closed = true; reg.release(holder); },
  };
}

/** A PALACE holder — composeHolder keyed by the canonical store DIR (one holder per dir per label). */
export function composePalace(label: string, dir: string, spawn: PalaceHolderSpawn, timeoutMs: number): ComposedHolder {
  return composeHolder(label, canonicalDirOf(dir), spawn, timeoutMs);
}

/** An ENCODER holder — composeHolder keyed by the LABEL (palace-less: ONE holder, the model is the
 *  resource; the spawn ignores the key). No sentinel dir — the sibling of composePalace. */
export function composeEncoder(label: string, spawn: PalaceHolderSpawn, timeoutMs: number): ComposedHolder {
  return composeHolder(label, label, spawn, timeoutMs);
}

/** How many holder processes a label holds live (proves "one holder per label, never a pile"). */
export function livePalaceHolderCount(label: string): number {
  return holderRegistries.get(label)?.size() ?? 0;
}

/**
 * MESHPALACE shape — FLAGGED, MODELED, NOT BUILT HERE.
 *
 * The meshpalace = a mempalace-instance fed by the @meshpalace Automerge doc through a FEED
 * ADAPTER, AND the cross-Lararium bridge (peer Lararia federate their ≥meme memes through it).
 * As a palace-instance it #has the SAME transport cap above PLUS this feed cap — the doc→palace
 * feed adapter. The op-surface would be read-oriented (search/get over
 * the federated corpus), the FEED replacing the per-turn local `encodeStore`/`put` write path.
 *
 * The full DreamNet peer-federation wiring (the @meshpalace AutomergeDocStore FLOW-map,
 * mesh-memegraph, manaoio, the read-face wire) is a SEPARATE, larger mesh-domain piece and
 * is NOT implemented here. This interface only names the shore so the shape is ready.
 */
export interface PalaceFeedCap {
  /** Pull the next batch of source records (e.g. ≥meme drawers off the @meshpalace doc) to index. */
  pull(sinceWatermark?: string): Promise<{ records: readonly unknown[]; watermark: string }>;
}

// ============================================================================
// content-palace — the Li-triple CONTENT plane (folded from content-palace.ts)
// ============================================================================
/**
 * content-palace — the Li-triple's CONTENT plane for NON-MEMORY targeted content: a caller-vector
 * store over arbitrary target corpora (Twain · TiddlyWiki5 · the Kumulipo · Discordian Catma · any
 * ingest target) that are NOT the operator's session-memory (the mempalace stays the private
 * interoception content). Each target gets its own content palace dir.
 *
 * THE CAP-STACK: content-palace = the SHARED transport cap ({@link composePalace}, palace-holder.ts)
 * composed with its OWN thin op-surface — `put`/`get`/`search` over the python `content_io.py serve`
 * holder. Caller-vector (the embedding arrives on the wire, no model load) — uniform with structure/
 * form/persistence AND split-ready: the parallel-ingest embeds upstream, this commits the vector.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/nalu (the content plane)
 */



/** the palace label — the transport registry key. */
const LABEL_CONTENT = "content";

/** A stored content record read back by cid: the text (document) + its where-filterable metadata. */
export interface ContentEntry {
  readonly cid: string;
  readonly document: string;
  readonly metadata: Record<string, unknown>;
}

/** One content-similarity match — carries the document so recall needs no follow-up get. */
export interface ContentMatch {
  readonly cid: string;
  readonly distance: number | null;
  readonly document: string;
  readonly metadata: Record<string, unknown>;
}

/** One scanned record — carries its embedding OUT (the guest-import read leg: copy store→store). */
export interface ScannedRecord {
  readonly cid: string;
  readonly document: string;
  readonly embedding: number[] | null;
  readonly metadata: Record<string, unknown>;
}

/** A page of a scan: the records + the offset to resume from (`next` null = drained). */
export interface ScanPage {
  readonly records: ScannedRecord[];
  readonly next: number | null;
  readonly total: number;
}

/**
 * The status/taxonomy read: distinct wings/rooms/halls + an entity frequency map, over a census.
 *
 * `total` counts what the STORE holds; `scanned` counts what the aggregation WALKED, and `partial`
 * fires when the walk stopped short. A reader that collapses the two takes a scan limit for a
 * population — the aggregate fields below describe the `scanned` prefix, never the whole census.
 */
export interface Taxonomy {
  readonly total: number;
  readonly scanned: number;
  readonly partial: boolean;
  readonly wings: string[];
  readonly rooms: string[];
  readonly halls: string[];
  readonly entities: Record<string, number>;
}

export interface ContentPalace {
  /**
   * Store one content record: `cid` (a content-hash or stable target id), the `text` (rides the
   * document slot), the caller-supplied `embedding`, and where-filterable `metadata`. Idempotent on
   * cid (a re-put overwrites). THROWS if the holder did not persist.
   */
  put(cid: string, text: string, embedding: readonly number[], metadata?: Record<string, unknown>): Promise<{ cid: string }>;
  /** Read a content record back by cid, or null if absent. */
  get(cid: string): Promise<ContentEntry | null>;
  /** Nearest content by vector similarity, optional where-filter. */
  search(embedding: readonly number[], opts?: { k?: number; where?: Record<string, unknown> }): Promise<ContentMatch[]>;
  /** Read a PAGE of records WITH embeddings (the guest-import read leg — copy store→store, no re-embed). */
  scan(opts?: { offset?: number; limit?: number }): Promise<ScanPage>;
  /** The status/taxonomy read — distinct wings/rooms/halls + entity frequencies + drawer total. */
  taxonomy(opts?: { limit?: number }): Promise<Taxonomy>;
  /** Release this reference; the holder process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Test shore alias: how the holder process is produced (defaults to the python helper). */
export type ContentHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `content_io.py serve --palace <dir>`. */
const defaultContentHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveContentPalaceSpawn);

export interface ContentPalaceOptions {
  /** per-call RPC timeout (ms); default 30s (covers the one-time chroma open on first call). */
  readonly timeoutMs?: number;
  /** test shore: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: ContentHolderSpawn;
}

/**
 * Open a CONTENT store rooted at `dir` (a per-target palace dir). Composes the shared transport cap
 * with the content op-surface; `close()` releases this reference.
 */
export function makeContentPalace(dir: string, opts: ContentPalaceOptions = {}): ContentPalace {
  const p = composePalace(LABEL_CONTENT, dir, opts.spawn ?? defaultContentHolderSpawn, opts.timeoutMs ?? 30_000);

  return {
    async put(cid, text, embedding, metadata = {}): Promise<{ cid: string }> {
      await p.send("put", { cid, text, embedding, metadata });
      return { cid };
    },

    async get(cid: string): Promise<ContentEntry | null> {
      return (await p.send("get", { cid })) as ContentEntry | null;
    },

    async search(embedding, opts2 = {}): Promise<ContentMatch[]> {
      const res = (await p.send("search", {
        embedding, k: opts2.k ?? 8,
        ...(opts2.where !== undefined ? { where: opts2.where } : {}),
      })) as { matches: ContentMatch[] };
      return res.matches ?? [];
    },

    async scan(opts2 = {}): Promise<ScanPage> {
      const res = (await p.send("scan", { offset: opts2.offset ?? 0, limit: opts2.limit ?? 256 })) as Partial<ScanPage> | null;
      return { records: res?.records ?? [], next: res?.next ?? null, total: res?.total ?? 0 };
    },

    async taxonomy(opts2 = {}): Promise<Taxonomy> {
      const r = (await p.send("taxonomy", { limit: opts2.limit ?? 4096 })) as Partial<Taxonomy> | null;
      const total = r?.total ?? 0;
      const scanned = r?.scanned ?? 0;
      return {
        total,
        scanned,
        partial: r?.partial ?? scanned < total,
        wings: r?.wings ?? [],
        rooms: r?.rooms ?? [],
        halls: r?.halls ?? [],
        entities: r?.entities ?? {},
      };
    },

    close: p.close,
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveContentHolderCount(): number {
  return livePalaceHolderCount(LABEL_CONTENT);
}

// ============================================================================
// formpalace — the LIVING-GRAMMAR FORM store (folded from formpalace.ts)
// ============================================================================
/**
 * formpalace — the LIVING-GRAMMAR FORM store: a LOCAL, caller-vector store for the per-turn
 * FORM-vector (the two-planes form-capture's CONTINUOUS plane, encoded). Backed by a "form"
 * collection inside a mempalace instance (the same ChromaDB engine, the SECOND collection beside
 * the palace default), reached through ONE persistent Python holder (`form_encoder.py serve
 * --palace <dir>`). It NEVER federates — local, the eidetic↔grammatical bridge twin to `.structurepalace`.
 *
 * Each turn's move-skeleton (emitMoveSkeleton, P1) + constructicon basis (buildConstructiconBasis,
 * P0) ride to the holder, which ENCODES the sparse fuzzy-membership form-vector (form_encoder, P2)
 * and STORES it as a caller-supplied dense vector (densified to basis.dimension), keyed by the
 * turn's `verbatim_sha` — the SAME key the content drawer carries as `lar_verbatim_sha`, so the
 * FORM graph and the CONTENT graph (the existing verbatim mempalace) fuse on one join key. The
 * embedding model is never invoked (we always supply our own vector), mirroring `.structurepalace`.
 *
 * THE CAP-STACK (the palace-instance #has): formpalace = the SHARED palace transport
 * ({@link PalaceHolderRegistry}, palace-holder.ts) composed with its OWN op-surface —
 * `encode_store`/`query`/`filter`/`get` over the python form-encoder holder. DISTINCT from
 * structurepalace (per-turn form-vectors keyed by verbatim_sha vs per-structure AST drawers keyed by
 * structural hash, no AST payload stored here) but riding the IDENTICAL transport cap — two
 * op-surface shapes, one transport, no god base-class (the holder 2-shapes lesson, one up).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#two-planes
 */



/** the palace label — the transport registry key (one holder singleton per label per dir). */
const LABEL_FORM = "form";

/** The serializable basis shape the Python encoder consumes (its `index` is re-derived from order). */
export interface SerializedBasis {
  readonly axes: ConstructiconBasis["axes"];
  readonly dimension: number;
}

/** The metadata stamped on a form entry — the where-filterable facets + the content-join key.
 *  Carries the {@link BearingFacets} (bearing_w1/w2/w3/root/path/frag/grade) too: the aim/yield
 *  bearing descended into flat scalars, where-filterable for the STRUCTURED bearing recall path
 *  (multi-graph-recall#makeFormSearch). Stamped off `skeleton.bearing.facets` in
 *  node-capture-engine#makeFormSplitFlush; the python store carries any `bearing_*` key through. */
export interface FormMetadata extends BearingFacets {
  /** the confidence register band (e.g. "synthesis"), for where-filtering */
  readonly register?: string;
  /** the deepest grammar-stack layer the turn touched */
  readonly grammar_layer?: string;
  /** the DECLARED HUD attention grain (0..20 Aperture) — the paragraph-scale recall knob (P6) */
  readonly aperture?: number;
  /** sha256 of the canonical placeholdered-graph — the FORM recurrence key */
  readonly struct_hash?: string;
  /** sha256 of the verbatim turn — the CROSS-GRAPH join key to the content drawer */
  readonly verbatim_sha: string;
}

/** The outcome of an encode+store round-trip. */
export interface FormStoreResult {
  readonly key: string;
  readonly dimension: number;
  readonly count: number;
  readonly conformance: number;
  readonly slor: { readonly live: boolean; readonly model: string | null; readonly reason: string };
  readonly form_vector: { readonly indices: readonly number[]; readonly values: readonly number[] };
}

/** One form-similarity match. */
export interface FormMatch {
  readonly key: string;
  readonly distance: number | null;
  readonly metadata: Record<string, unknown>;
}

/** A stored form entry read back by key. */
export interface FormEntry {
  readonly key: string;
  readonly metadata: Record<string, unknown>;
  readonly document: string | null;
}

export interface FormPalace {
  /**
   * Encode a turn's move-skeleton against the basis, then STORE the form-vector keyed by its
   * `verbatim_sha`. Returns the encode+store outcome. THROWS if the holder did not persist, so the
   * caller never stamps a dangling form reference (the content path stays intact regardless).
   */
  encodeStore(input: {
    skeleton: MoveSkeleton;
    basis: SerializedBasis;
    key: string;
    metadata: FormMetadata;
  }): Promise<FormStoreResult>;
  /** Nearest turns by FORM similarity (encode the query skeleton, then search), optional where-filter. */
  query(input: {
    skeleton: MoveSkeleton;
    basis: SerializedBasis;
    nResults?: number;
    where?: Record<string, unknown>;
  }): Promise<FormMatch[]>;
  /**
   * METADATA-ONLY filter — NO vector. The structured bearing / keyword recall path: match form
   * entries by a `where`-clause alone (chroma `.get(where=…)`), so a bearing root or a register
   * scope yields matches without encoding a query skeleton. `distance` is null on each match (a
   * where-match carries no similarity ranking). A null/empty `where` returns up to `nResults` of
   * the collection; a where matching nothing returns []. (multi-graph-recall#makeFormSearch.)
   */
  filter(input: { where?: Record<string, unknown>; nResults?: number }): Promise<FormMatch[]>;
  /** Read a form entry back by its key (the verbatim_sha), or null if absent. */
  get(key: string): Promise<FormEntry | null>;
  /** Release this reference; the holder process is killed when the last reference closes. */
  close(): Promise<void>;
}

/** Test shore alias: how the holder process is produced (defaults to the python helper). */
export type FormHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `form_encoder.py serve --palace <dir>`. */
const defaultFormHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveFormEncoderSpawn);

export interface FormPalaceOptions {
  /** per-call RPC timeout (ms); default 60s (covers the one-time chroma open + first encode). */
  readonly timeoutMs?: number;
  /** test shore: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: FormHolderSpawn;
}

/**
 * Open the FORM store rooted at `dir` — a mempalace instance's "form" collection. Composes the
 * shared transport cap (ref-counted ONE holder per canonical dir) with the form op-surface;
 * `close()` releases this reference and kills the process when the last reference closes.
 */
export function makeFormPalace(dir: string, opts: FormPalaceOptions = {}): FormPalace {
  // Compose the SHARED transport cap; layer only the form op-surface below (the holder-2-shapes ward).
  const p = composePalace(LABEL_FORM, dir, opts.spawn ?? defaultFormHolderSpawn, opts.timeoutMs ?? 60_000);

  return {
    async encodeStore({ skeleton, basis, key, metadata }): Promise<FormStoreResult> {
      return (await p.send("encode_store", { key, skeleton, basis, metadata })) as FormStoreResult;
    },

    async query({ skeleton, basis, nResults, where }): Promise<FormMatch[]> {
      const res = (await p.send("query", {
        skeleton, basis, n_results: nResults ?? 10,
        ...(where !== undefined ? { where } : {}),
      })) as { matches: FormMatch[] };
      return res.matches ?? [];
    },

    async filter({ where, nResults }): Promise<FormMatch[]> {
      const res = (await p.send("filter", {
        n_results: nResults ?? 10,
        ...(where !== undefined ? { where } : {}),
      })) as { matches: FormMatch[] };
      return res.matches ?? [];
    },

    async get(key: string): Promise<FormEntry | null> {
      return (await p.send("get", { key })) as FormEntry | null;
    },

    close: p.close,
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveFormHolderCount(): number {
  return livePalaceHolderCount(LABEL_FORM);
}

// ============================================================================
// structurepalace — the STRUCTURE read-client (twin to the form/content clients)
// ============================================================================
/**
 * structurepalace — the STRUCTURE plane's read-client: a thin PalaceHolder client to the
 * `structurepalace_io.py serve` holder (twin to {@link makeFormPalace}/{@link makeContentPalace}). It
 * carries the plane's OWN query semantics — text → detect-kind + parse-tree → STRUCTURAL embed → nearest
 * shapes (NEVER a content vector; the independence law holds through the door), so a recall over the
 * structure lens rides the structure engine rather than a content query forced onto a non-content store.
 * Each match carries its `verbatim_sha` (the cross-plane join key) so a multi-graph recall can fuse the
 * structure leg against content by that sha.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#dual-graph
 */

/** One nearest-shape match from the structure query face. `verbatim_sha` is the cross-plane join key. */
export interface StructureMatch {
  readonly hash: string;
  readonly distance: number | null;
  readonly count?: number;
  readonly verbatim_sha?: string;
  readonly source_file?: string;
}

/** The structure query-face result: the parsed query `kind`, its nearest-shape matches, an optional note
 *  (a kind the router holds no grammar for → empty matches + note). */
export interface StructureQueryResult {
  readonly kind: string | null;
  readonly matches: StructureMatch[];
  readonly note?: string;
}

/** A structure entry resolved from a content cid through the provenance join — the by-cid cross-plane door. */
export interface StructureEntryForCid {
  readonly hash: string;
  readonly count?: number;
  readonly provenance_cids?: string[];
}

export interface StructurePalace {
  /** Nearest STRUCTURES to a free-text query — the clean query face (text → tree → structural embed). */
  query(input: { text: string; nResults?: number }): Promise<StructureQueryResult>;
  /** Read a structure entry back by its structural hash, or null if absent. */
  get(hash: string): Promise<unknown | null>;
  /** Resolve a content cid to its STRUCTURE entry through the provenance join (the cross-plane by-cid door). */
  entryForCid(cid: string): Promise<StructureEntryForCid | null>;
  /** Release this reference; the holder process is killed when the last reference closes. */
  close(): Promise<void>;
}

const LABEL_STRUCTURE = "structure";

/** Default holder spawn: the venv-aware python running `structurepalace_io.py serve --palace <dir>`. */
const defaultStructureHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveStructurePalaceSpawn);

export interface StructurePalaceOptions {
  /** per-call RPC timeout (ms); default 60s (covers the one-time chroma open). */
  readonly timeoutMs?: number;
  /** test shore: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: PalaceHolderSpawn;
}

/**
 * Open the STRUCTURE store rooted at `dir` — a memory sensorium's "structure" collection. Composes the
 * shared transport cap (ref-counted ONE holder per canonical dir) with the structure op-surface;
 * `close()` releases this reference and kills the process when the last reference closes.
 */
export function makeStructurePalace(dir: string, opts: StructurePalaceOptions = {}): StructurePalace {
  const p = composePalace(LABEL_STRUCTURE, dir, opts.spawn ?? defaultStructureHolderSpawn, opts.timeoutMs ?? 60_000);
  return {
    async query({ text, nResults }): Promise<StructureQueryResult> {
      return (await p.send("query", { query: text, k: nResults ?? 8 })) as StructureQueryResult;
    },
    async get(hash: string): Promise<unknown | null> {
      return (await p.send("get", { hash })) as unknown | null;
    },
    async entryForCid(cid: string): Promise<StructureEntryForCid | null> {
      return (await p.send("entry_for_cid", { cid })) as StructureEntryForCid | null;
    },
    close: p.close,
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveStructureHolderCount(): number {
  return livePalaceHolderCount(LABEL_STRUCTURE);
}

// ============================================================================
// persistence-palace — the Testimony cosheaf cap (folded from persistence-palace.ts)
// ============================================================================
/**
 * persistence-palace — the TS op-surface for a PersistencePalace instance: the cap ANY sensorium
 * composes to persist its readings as Testimony atoms. It BRIDGES the two halves that must never
 * fuse — the DUMB python store (persistence_io.py: put/get/witness/neighbors, no logic) and the
 * SOVEREIGN TS keel (persistence-keel.ts: the standing law, the admit gate, mode=halfLife). The
 * store persists; the keel decides; this surface wires them over the shared holder transport.
 *
 * THE CAP-STACK: persistence-palace = the SHARED palace transport ({@link PalaceHolder} +
 * {@link PalaceHolderRegistry}, palace-holder.ts) composed with its OWN op-surface over the python
 * `persistence_io.py serve` holder. It owns NONE of the transport machinery (that lives once in the
 * shared cap) and NONE of the lifecycle law (that lives once in the mesh keel) — a thin bridge only.
 *
 * The atom's id is CONTENT-ADDRESSED (sha256 of {signer, frontier, assertion}) — pure-TS, computed
 * here, so an identical testimony collides idempotently and neither side waits on the other's id.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/persistence-keel · lar:///ha.ka.ba/lares/api/pono/has-stack
 */



/** the palace label — the transport registry key. */
const LABEL_PERSISTENCE = "persistence";

/** A testimony's provenance as the caller presents it (attribution + causal position). */
export interface RecordProvenance {
  readonly signer: string;
  readonly frontier: string;
}

export interface PersistencePalace {
  /**
   * Record a reading as a Testimony (born silent). Content-addressed by {signer, frontier,
   * assertion} — an identical re-record collides idempotently. `document` is the OPTIONAL text
   * projection (the "past text" slot). Returns the testimony id. THROWS if the store did not persist.
   */
  record(kind: string, assertion: readonly number[], provenance: RecordProvenance, pubinfo?: Record<string, unknown>, document?: string): Promise<{ claimCid: string }>;
  /** Load a Testimony by id, or null if absent. */
  get(claimCid: string): Promise<Testimony | null>;
  /** Append a witness edge (corroboration polarity +1 / defeat −1) — the store persists it (move-not-delete). */
  witness(claimCid: string, edge: Witness): Promise<{ ok: boolean; witnesses: number }>;
  /**
   * The FEP re-entry read THROUGH the keel: load the testimony, derive standing+voice under the
   * policy (mode = policy.halfLife), return the low-standing prior. Null if the testimony is absent.
   */
  reentry(claimCid: string, policy?: PersistencePolicy, now?: number): Promise<{ value: readonly number[]; standing: number; voice: "silent" | "spoken" } | null>;
  /**
   * The admit gate THROUGH the keel: score the candidate against the store's OWN code — the diagonal
   * predictive against its pooled-scale sibling — and admit iff the store's code cannot beat ignorance
   * on it. The write-time decision the caller enacts before {@link record}. Carries no threshold.
   */
  admit(candidate: readonly number[], policy?: PersistencePolicy): Promise<{ admit: boolean; score: number; bitsSaved: number }>;
  /** Release this reference to the shared holder; the process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Default holder spawn: the venv-aware python running `persistence_io.py serve --palace <dir>`. */
const defaultPersistenceHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolvePersistencePalaceSpawn);

export interface PersistencePalaceOptions {
  /** per-call RPC timeout (ms); default 30s (covers the one-time chroma open on first call). */
  readonly timeoutMs?: number;
  /** test shore: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: PalaceHolderSpawn;
}

/**
 * Open a PersistencePalace instance rooted at `dir`. Composes the shared transport cap (ref-counted
 * ONE holder per canonical dir) with the persistence op-surface + the mesh keel; `close()` releases
 * this reference. Each sensorium composes its OWN instance — persistence is a cap, not a singleton.
 */
export function makePersistencePalace(dir: string, opts: PersistencePalaceOptions = {}): PersistencePalace {
  // Compose the SHARED transport cap; layer the persistence op-surface + the mesh keel below.
  const p = composePalace(LABEL_PERSISTENCE, dir, opts.spawn ?? defaultPersistenceHolderSpawn, opts.timeoutMs ?? 30_000);

  const claimCidOf = (kind: string, assertion: readonly number[], prov: RecordProvenance): Promise<string> =>
    sha256Hex(canonicalJsonBytes({ signer: prov.signer, frontier: prov.frontier, assertion }), defaultCryptoProvider);

  // The store's CODE, held here and updated in O(d) per record. The keel's gate reads sufficient statistics
  // over the ADMITTED store — never a neighbourhood, never a per-candidate refit — so one cold seed from a
  // uniform draw of the store, then Welford forever after. A candidate cannot steer this.
  let code: StoreCode | null = null;
  const seedCode = async (dims: number): Promise<StoreCode> => {
    if (code !== null && code.dims === dims) return code;
    const r = (await p.send("sample", { k: 4096, seed: 4241 })) as { population?: number[][] } | null;
    code = storeCodeFrom(r?.population ?? [], dims);
    return code;
  };

  return {
    async record(kind, assertion, provenance, pubinfo = {}, document = ""): Promise<{ claimCid: string }> {
      const claimCid = await claimCidOf(kind, assertion, provenance);
      await p.send("put", {
        claim_cid: claimCid, kind, assertion, signer: provenance.signer, frontier: provenance.frontier, pubinfo, document,
      });
      // The code follows what the store actually holds; a recorded claim joins it, and only then.
      if (code !== null && code.dims === assertion.length) code = observeClaim(code, assertion);
      return { claimCid };
    },

    async get(claimCid: string): Promise<Testimony | null> {
      return (await p.send("get", { claim_cid: claimCid })) as Testimony | null;
    },

    async witness(claimCid: string, edge: Witness): Promise<{ ok: boolean; witnesses: number }> {
      // THE VERIFY GATE — deny-by-default. Verification lives HERE at the async gate (it holds the claimCid
      // + the signer's verifying key), so the sync standing dial downstream trusts every edge in the log
      // without re-checking. An absent or invalid signature NEVER appends — no unsigned path exists.
      if (!(await verifyWitnessSig(claimCid, edge))) return { ok: false, witnesses: 0 };
      const r = (await p.send("witness", {
        // The signature rides through so it persists end-to-end; the dumb py store keeps the string as the
        // owed cross-language fixture (persistence_io must store + return it) — the keel mints and checks it.
        claim_cid: claimCid, signer: edge.signer, frontier: edge.frontier, polarity: edge.polarity,
        signature: edge.signature,
        ...(edge.tick !== undefined ? { tick: edge.tick } : {}),
      })) as { ok?: boolean; witnesses?: number } | null;
      return { ok: r?.ok ?? false, witnesses: r?.witnesses ?? 0 };
    },

    async reentry(claimCid, policy = WITNESS_POLICY, now?): Promise<{ value: readonly number[]; standing: number; voice: "silent" | "spoken" } | null> {
      const t = (await p.send("get", { claim_cid: claimCid })) as Testimony | null;
      if (t === null) return null;
      return reentryPrior(t, policy, now);   // the keel derives standing+voice — the store never does
    },

    async admit(candidate, policy = WITNESS_POLICY): Promise<{ admit: boolean; score: number; bitsSaved: number }> {
      // A code the candidate cannot select. The `neighbors` op stays available for RECALL, and it must never
      // feed this gate: a k-nearest population makes the model a function of the candidate (so it normalizes
      // to nothing and stops being a code at all), and in high dimension the k-NN list skews toward hubs near
      // the centroid anyway, which admits antihubs on geometry rather than on novelty.
      const c = await seedCode(candidate.length);
      const v = keelAdmit(candidate, c, policy);   // the keel prices — the store only ever supplied the statistics
      return { admit: v.admit, score: v.score, bitsSaved: v.bitsSaved };
    },

    close: p.close,
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _livePersistenceHolderCount(): number {
  return livePalaceHolderCount(LABEL_PERSISTENCE);
}

// ============================================================================
// palace-caps — the UNIFIED cap-stack every palace #has (folded from palace-caps.ts)
// ============================================================================
/**
 * palace-caps — the UNIFIED cap-stack every palace entity #has. A palace is a nameless entity whose
 * behavior IS its composed caps; this composer hands ANY palace dir the full stack — content store,
 * hybrid search, bitemporal KG, structure/graph — so every instance (contentpalace, structurepalace,
 * formpalace, persistencepalace, the mesh children, the memetic-wikitext peers) carries the same
 * capabilities uniformly. Each cap is dir-keyed (composeHolder), so the caps flow to every palace by
 * construction; this makes that flow explicit + closes them as one.
 *
 * The consumed engine + code (chroma · search_memories · KnowledgeGraph · palace_graph) sit behind
 * the causal-island boundary; the caps that produce results depend on the palace's data SHAPE (graph
 * needs `entities` metadata; search needs documents) — but the stack COMPOSES on every palace.
 * The meta-model cap is palace-LESS (a process-wide encoder), so it is NOT per-palace here.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/nalu
 */


/** The full cap-stack a palace entity #has — one per palace dir, closed together. */
export interface PalaceCaps {
  readonly content: ContentPalace;
  readonly search: SearchCap;
  readonly kg: KgCap;
  readonly graph: GraphCap;
  /** Release every cap's holder reference for this palace. */
  close(): Promise<void>;
}

export interface PalaceCapsOptions {
  readonly content?: ContentPalaceOptions;
  readonly search?: SearchCapOptions;
  readonly kg?: KgCapOptions;
  readonly graph?: GraphCapOptions;
}

/**
 * Compose the full cap-stack for a palace dir. Every palace entity gets the SAME caps uniformly — the
 * "all caps flow to all palaces" invariant made a single call. The per-cap holders (content/search/
 * kg/graph) each ref-count independently via composeHolder; `close()` releases all four.
 */
export function composePalaceCaps(dir: string, opts: PalaceCapsOptions = {}): PalaceCaps {
  const content = makeContentPalace(dir, opts.content ?? {});
  const search = makeSearchCap(dir, opts.search ?? {});
  const kg = makeKgCap(dir, opts.kg ?? {});
  const graph = makeGraphCap(dir, opts.graph ?? {});
  return {
    content,
    search,
    kg,
    graph,
    close: async (): Promise<void> => {
      // close each independently — one holder fault must not orphan the others
      await Promise.allSettled([content.close(), search.close(), kg.close(), graph.close()]);
    },
  };
}
