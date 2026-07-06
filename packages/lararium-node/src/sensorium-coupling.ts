/**
 * sensorium-coupling — the READER that makes `coupling.children` load-bearing (it was write-only). The
 * setup path STAMPS `coupling.children[]` on the mesh + memetic-wikitext trees, but nothing ever READ
 * them back — the coupling plane sat decorative. This module resolves those child edges → the child
 * sensorium dirs → each child's SECTION over a shared comparison stalk → the H¹-GATED fusion
 * (@lararium/mesh `fuse`):
 *
 *   • H¹ = 0  → FUSE: the children's pairwise agreements admit a global section — diffuse toward the
 *               consensus (Chebyshev sheaf-Laplacian), return the fused pseudosection.
 *   • H¹ ≠ 0  → HOLD-OPEN: a genuine cocycle (pairwise-agreeing, globally obstructed) — never averaged,
 *               surfaced as SIGNAL with its reconciliation cost `R*_sem = log₂ dim H¹`, routed to Talk-Story.
 *
 * The read reads H¹ BEFORE it diffuses (the cohomological-gate law) — so the coupling merge never
 * fabricates a global-now it cannot ground. With fewer than two readable children the read reports
 * `fusion: null` (insufficient — the honest no-coupling), NEVER a silent average.
 *
 * Each child becomes ONE sheaf plane; its per-unit salience over the shared stalk comes from the
 * pluggable {@link ChildRestriction}. The default reads an optional `saliences.json` sidecar (a
 * `{unit: value}` map the parallel writes per child); a child with no sidecar drops out of the fusion
 * (graceful — never fabricated). The comparison stalk is the UNION of the readable children's observed
 * units (the engineered overlap; disjoint peers glue vacuously and the note says so).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cohomological-gate · lar:///ha.ka.ba/@lares/api/lares/memetic-wikitext-sensorium
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { memeticWikitextSensoriumDir } from "./vessel-paths.js";
import { readManifest, resolveCapDir } from "./sensorium.js";
import type { SensoriumChild, SensoriumManifest } from "./sensorium.js";
import { fuse } from "@lararium/mesh";
import type { FuseOptions, FuseResult, SheafAssignment, PlaneRestriction } from "@lararium/mesh";

/** The per-child SALIENCE sidecar filename — a `{ unit: [0,1] }` map the parallel writes per peer. */
export const SALIENCES_SIDECAR = "saliences.json";

/**
 * The pluggable per-child section reader: map a resolved child (its edge, dir, manifest) to a
 * {@link PlaneRestriction} over the shared stalk — or `null` when the child carries no readable section
 * yet (it then drops out of the fusion, never fabricated). The returned restriction MUST be `sheaf`
 * (the H¹ gate admits sheaf planes only); the default builds a sheaf plane.
 */
export type ChildRestriction = (args: {
  readonly child: SensoriumChild;
  readonly childDir: string;
  readonly manifest: SensoriumManifest | null;
}) => PlaneRestriction | null;

/**
 * The DEFAULT child section reader — read the child dir's optional `saliences.json` (`{unit: value}`),
 * clamped to [0,1], as the plane's per-unit salience. Absent / malformed / empty ⇒ `null` (the child
 * drops out; graceful). The plane name is the child's `sensorium` role.
 */
export const defaultChildRestriction: ChildRestriction = ({ child, childDir }) => {
  const p = join(childDir, SALIENCES_SIDECAR);
  if (!existsSync(p)) return null;
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = new Map<string, number>();
  for (const [u, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    value.set(u, Math.max(0, Math.min(1, v)));
  }
  if (value.size === 0) return null;
  return { plane: child.sensorium, variance: "sheaf", value };
};

/** One resolved coupling child — its role, its resolved dir, and whether a section reading was obtained. */
export interface CouplingChildRead {
  readonly sensorium: string;
  readonly dir: string;
  readonly read: boolean;
}

/** The coupling read — the resolved children + the H¹-gated fusion (or `null` when insufficient). */
export interface CouplingRead {
  /** the parent sensorium whose coupling was read (or `"(no-manifest)"`). */
  readonly sensorium: string;
  /** every `coupling.children` edge, resolved to a dir, marked read/unread. */
  readonly children: readonly CouplingChildRead[];
  /** how many children yielded a section reading (the plane count fed to the gate). */
  readonly readable: number;
  /** the shared-unit count over the readable children (0 ⇒ disjoint peers — a vacuous glue). */
  readonly sharedUnits: number;
  /**
   * the H¹-GATED fusion verdict when ≥ 2 children read (a `fuse` pseudosection OR a `hold-open`
   * obstruction) — NEVER a silent average. `null` ⟺ fewer than two readable children (insufficient).
   */
  readonly fusion: FuseResult | null;
  /** a human note — why insufficient / disjoint, or the verdict summary. */
  readonly note: string;
}

export interface ReadCouplingOptions extends FuseOptions {
  /** override the per-child section reader (default {@link defaultChildRestriction}). */
  readonly childRestriction?: ChildRestriction;
}

/**
 * Read a sensorium's coupling plane through the H¹ gate. Resolve `coupling.children` → child dirs →
 * each child's section (via {@link ChildRestriction}) → {@link fuse}. Reads H¹ BEFORE diffusing:
 * reconcilable ⇒ a fused pseudosection, ontological ⇒ a held-open obstruction. Fewer than two readable
 * children ⇒ `fusion: null` (insufficient, honest), never averaged.
 */
export function readCoupling(sensoriumDir: string, opts: ReadCouplingOptions = {}): CouplingRead {
  const manifest = readManifest(sensoriumDir);
  if (manifest === null) {
    return { sensorium: "(no-manifest)", children: [], readable: 0, sharedUnits: 0, fusion: null,
             note: `no sensorium manifest at ${sensoriumDir}` };
  }
  const childReader = opts.childRestriction ?? defaultChildRestriction;

  const children: CouplingChildRead[] = [];
  const restrictions: PlaneRestriction[] = [];
  for (const child of manifest.coupling.children) {
    const childDir = resolveCapDir(sensoriumDir, child.dir);
    const r = childReader({ child, childDir, manifest: readManifest(childDir) });
    children.push({ sensorium: child.sensorium, dir: childDir, read: r !== null });
    if (r !== null) restrictions.push(r);
  }

  if (restrictions.length < 2) {
    return {
      sensorium: manifest.sensorium, children, readable: restrictions.length, sharedUnits: 0, fusion: null,
      note: manifest.coupling.children.length === 0
        ? "no coupling children — the plane glues nothing"
        : `insufficient readable children (${restrictions.length}/${manifest.coupling.children.length}) — the honest no-coupling, never averaged`,
    };
  }

  // the comparison stalk = the union of the readable children's observed units (the engineered overlap).
  const units = new Set<string>();
  for (const r of restrictions) for (const u of r.value.keys()) units.add(u);
  // shared units = those ≥ 2 children observe (a real overlap the gate can constrain on).
  const seen = new Map<string, number>();
  for (const r of restrictions) for (const u of r.value.keys()) seen.set(u, (seen.get(u) ?? 0) + 1);
  let sharedUnits = 0;
  for (const c of seen.values()) if (c >= 2) sharedUnits++;

  const assignment: SheafAssignment = { restrictions, stalk: { units: [...units] } };
  const fusion: FuseResult = fuse(assignment, opts);

  const note = sharedUnits === 0
    ? `${restrictions.length} peers glue over NO shared unit (disjoint) — a vacuous ${fusion.verdict}`
    : fusion.verdict === "fuse"
      ? `${restrictions.length} peers reconcile (H¹=0) over ${sharedUnits} shared unit(s) — fused`
      : `${restrictions.length} peers hold open (H¹=${fusion.obstruction.dimH1}, cost ${fusion.obstruction.cost.toFixed(3)}) — route to Talk-Story`;

  return { sensorium: manifest.sensorium, children, readable: restrictions.length, sharedUnits, fusion, note };
}

/**
 * Read the `memetic-wikitext` sensorium's coupling — the formal ⋈ informal peers through the H¹ gate.
 * The vessel-facing caller: resolves the stood memetic-wikitext sensorium dir and runs {@link readCoupling}.
 * Until the peers' salience sidecars fill, this reports the honest insufficient/no-coupling; once they
 * fill it flows a fused reading OR a held-open obstruction — never a silent average.
 */
export function readMemeticWikitextCoupling(opts: ReadCouplingOptions = {}): CouplingRead {
  return readCoupling(memeticWikitextSensoriumDir(), opts);
}
