/**
 * sensorium-cohere — the READER that makes the li-radius (H⁰ gluing) load-bearing over a sensorium's
 * OWN sheaf planes, the sheaf twin of {@link readCoupling}'s cosheaf coupling read. It resolves the
 * planes the manifest declares `sheaf` (`planeVariance` → `"sheaf"`), reads each plane's SECTION over a
 * shared cid stalk, and runs BOTH mesh organs over the one assignment:
 *
 *   • {@link consistencyRadius} — the Robinson li-radius: do the planes AGREE on the shared cids
 *     (radius 0 ⟺ a global section glues), and WHERE do they disagree (the localizable loci).
 *   • {@link fuse} — the H¹ gate over the SAME assignment: FUSE (H¹=0, the sections admit a global
 *     section) or HOLD-OPEN (H¹≠0, a genuine cocycle routed to Talk-Story, never averaged).
 *
 * THE BOUNDARY, NOT THE CODOMAIN. The radius certifies a health verdict ONLY at a LIVE boundary — the
 * SAME plane read across two contexts (island A ⋈ island B, pass ⋈ pass) that share cids, where H¹ can
 * genuinely stand nonzero. The DEFAULT read here glues a sensorium's OWN `content ↠ structure ↠ form`
 * planes, which NEST (structure carries the bulk of a record's bits) and so agree by construction — a
 * tautological 0 the mesh math cannot catch (`consistencyRadius` flags `vacuous` only for an EMPTY
 * stalk, never for a non-empty nested cover). So this reader carries the guard the mesh lacks: the
 * default single-stream cover reports `dependenceRisk: "nested-cover"` and reads as a PLUMBING witness
 * (the planes plumb through to the same cids), never as health. A caller that supplies its own
 * {@link PlaneReader} — the same plane over two contexts — asserts a live boundary and clears the flag.
 *
 * COVER-AGNOSTIC by construction: the reader takes a cover (the sheaf planes + a per-plane section
 * reader), never a hardcoded plane triple, so the ONE organ serves whichever boundary earns the cap.
 * It keys by cid and reads planes by declared variance — media-general; text pours first.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cohomological-gate · lar:///ha.ka.ba/lares/api/pono/sensorium-machina
 */

import { readManifest, resolveCapDir, capDir, planeVariance, SHEAF_PLANES } from "./sensorium.js";
import type { SensoriumManifest } from "./sensorium.js";
import { enumerateStoreDocs } from "./doctor.js";
import { consistencyRadius, fuse } from "@lararium/mesh";
import type {
  ConsistencyRadius, ComparisonStalk, PlaneRestriction, SheafAssignment, FuseResult, FuseOptions,
} from "@lararium/mesh";

/**
 * The pluggable per-plane SECTION reader: map a declared sheaf plane (its name, resolved store dir, and
 * the parent manifest) to a {@link PlaneRestriction} over the shared cid stalk — or `null` when the
 * plane carries no readable section (it drops out of the cover, never fabricated). The returned
 * restriction MUST read `sheaf` (the li-radius admits sheaf planes only). The DEFAULT reader
 * ({@link coveragePlaneReader}) reads each plane's OWN store — a single-stream nested cover; a caller
 * supplying a two-context reader asserts a live boundary and clears the nested-cover flag.
 */
export type PlaneReader = (args: {
  readonly plane: string;
  readonly capDir: string;
  readonly manifest: SensoriumManifest;
}) => PlaneRestriction | null;

/**
 * The DEFAULT plane reader — read a plane's OWN store as a COVERAGE indicator: every cid the store holds
 * gets salience 1 (the plane covers that record). Over a sensorium's own `content/structure/form` planes
 * this glues a tautological 0 (the planes nest through to the same cids) — which is exactly why the read
 * that uses it carries `dependenceRisk: "nested-cover"`. Absent / empty store ⇒ `null` (the plane drops).
 */
export const coveragePlaneReader: PlaneReader = ({ plane, capDir }) => {
  const cids = enumerateStoreDocs(capDir);
  if (cids.length === 0) return null;
  const value = new Map<string, number>();
  for (const cid of cids) value.set(cid, 1);
  return { plane, variance: "sheaf", value };
};

/** The cohere read — the resolved sheaf planes + the li-radius AND the H¹ gate over the shared stalk. */
export interface CohereRead {
  /** the sensorium whose sheaf planes were glued (or `"(no-manifest)"`). */
  readonly sensorium: string;
  /** every sheaf plane the read tried, marked whether a section reading was obtained. */
  readonly planes: readonly { readonly plane: string; readonly read: boolean }[];
  /** how many planes yielded a section (the plane count fed to the organs). */
  readonly readable: number;
  /** the shared-cid count over the readable planes (0 ⇒ disjoint planes — a vacuous glue). */
  readonly sharedUnits: number;
  /** the Robinson li-radius over the cover (`null` when fewer than two planes read). */
  readonly consistency: ConsistencyRadius | null;
  /** the H¹-gated verdict over the SAME assignment (`fuse` / `hold-open`; `null` when insufficient). */
  readonly fusion: FuseResult | null;
  /**
   * carried when the cover glues one stream's OWN nested planes — a PLUMBING witness (the planes plumb
   * through to the same cids), NOT a health verdict. A live-boundary cover (a caller's own two-context
   * {@link PlaneReader}) leaves it absent.
   */
  readonly dependenceRisk?: "nested-cover";
  /** a human note — why insufficient / vacuous, or the verdict summary with its honesty caveat. */
  readonly note: string;
}

export interface ReadCohereOptions extends FuseOptions {
  /** override the per-plane section reader (default {@link coveragePlaneReader}). Supplying one asserts a
   *  live boundary — the read then omits the nested-cover flag. */
  readonly planeReader?: PlaneReader;
  /** restrict the cover to these plane names (default: every declared sheaf plane). */
  readonly planes?: readonly string[];
}

/**
 * Glue a sensorium's sheaf planes through the li-radius AND the H¹ gate. Enumerate the planes the
 * manifest declares `sheaf`, read each plane's section (via {@link PlaneReader}) over the shared cid
 * stalk, and run {@link consistencyRadius} + {@link fuse}. Fewer than two readable planes ⇒ honest
 * insufficient (`consistency: null`), never a fabricated glue. The DEFAULT reader glues a single-stream
 * nested cover and flags `dependenceRisk: "nested-cover"` — a plumbing witness, never health.
 */
export function readCohere(sensoriumDir: string, opts: ReadCohereOptions = {}): CohereRead {
  const manifest = readManifest(sensoriumDir);
  if (manifest === null) {
    return { sensorium: "(no-manifest)", planes: [], readable: 0, sharedUnits: 0, consistency: null,
             fusion: null, note: `no sensorium manifest at ${sensoriumDir}` };
  }
  const reader = opts.planeReader ?? coveragePlaneReader;
  // a caller's own reader asserts a live boundary (two contexts of one plane); the default glues one
  // stream's own nested planes and owes the nested-cover honesty flag.
  const liveBoundary = opts.planeReader !== undefined;

  // the cover = the planes the manifest declares sheaf (narrowed by opts.planes when given). The canonical
  // li planes ride SHEAF_PLANES; a declared fiber cap with `variance:"sheaf"` joins the cover too.
  const candidates = opts.planes
    ? opts.planes.filter((p) => planeVariance(manifest, p) === "sheaf")
    : [...new Set([...SHEAF_PLANES, ...Object.keys(manifest.has)])].filter((p) => planeVariance(manifest, p) === "sheaf");

  const planes: { plane: string; read: boolean }[] = [];
  const restrictions: PlaneRestriction[] = [];
  for (const plane of candidates) {
    const dir = capDir(sensoriumDir, manifest, plane) ?? resolveCapDir(sensoriumDir, plane);
    const r = reader({ plane, capDir: dir, manifest });
    planes.push({ plane, read: r !== null });
    if (r !== null) restrictions.push(r);
  }

  const nestedFlag = liveBoundary ? {} : { dependenceRisk: "nested-cover" as const };

  if (restrictions.length < 2) {
    return {
      sensorium: manifest.sensorium, planes, readable: restrictions.length, sharedUnits: 0,
      consistency: null, fusion: null,
      note: candidates.length < 2
        ? `only ${candidates.length} sheaf plane(s) declared — no cover to glue`
        : `insufficient readable planes (${restrictions.length}/${candidates.length}) — the honest no-cohere, never fabricated`,
    };
  }

  // the comparison stalk = the union of the readable planes' observed cids (the engineered overlap).
  const units = new Set<string>();
  for (const r of restrictions) for (const u of r.value.keys()) units.add(u);
  // shared cids = those ≥ 2 planes observe (the overlap the radius can actually constrain on).
  const seen = new Map<string, number>();
  for (const r of restrictions) for (const u of r.value.keys()) seen.set(u, (seen.get(u) ?? 0) + 1);
  let sharedUnits = 0;
  for (const c of seen.values()) if (c >= 2) sharedUnits++;

  const stalk: ComparisonStalk = { units: [...units] };
  const assignment: SheafAssignment = { restrictions, stalk };
  const consistency = consistencyRadius(restrictions, stalk);
  const fusion: FuseResult = fuse(assignment, opts);

  const witness = liveBoundary
    ? sharedUnits === 0
      ? `${restrictions.length} planes glue over NO shared cid (disjoint) — a vacuous ${fusion.verdict}`
      : fusion.verdict === "fuse"
        ? `${restrictions.length} planes glue (H¹=0, radius ${consistency.radius.toFixed(3)}) over ${sharedUnits} shared cid(s)`
        : `${restrictions.length} planes hold open (H¹=${fusion.obstruction.dimH1}, cost ${fusion.obstruction.cost.toFixed(3)}) — route to Talk-Story`
    : `nested cover: ${restrictions.length} of one stream's own planes plumb through ${sharedUnits} shared cid(s) — a PLUMBING witness (the planes nest), NOT health; place the gate at a live boundary (two contexts of one plane)`;

  return {
    sensorium: manifest.sensorium, planes, readable: restrictions.length, sharedUnits,
    consistency, fusion, ...nestedFlag, note: witness,
  };
}

/** One context of the SAME plane — a pass, an island, a policy — that a live-boundary read glues against. */
export interface CohereContext {
  /** the context handle (a working pet-name — "daydream", "deep-dream", island B); it labels the face. */
  readonly context: string;
  /** where this context's sensorium dir sits. */
  readonly sensoriumDir: string;
}

/**
 * Glue ONE plane across TWO OR MORE CONTEXTS — the LIVE-boundary read the single-stream cover cannot give.
 * The canonical use is the dream-pass comparison: a daydream ⊥ deep-dream re-encoding of the SAME cids,
 * each a re-reading of one plane under a different policy, glued to ask whether they still agree. Because
 * the faces read the same plane from GENUINELY DIFFERENT contexts (not one stream's nested planes), the
 * li-radius CAN obstruct — a divergence means one pass drifted from the shared ground, localized to the
 * cids where they split. The read carries NO nested-cover flag: this IS the boundary the flag asks for.
 *
 * The eventual home of this cross-context glue is the DreamNet-mesh FEDERATION tier — the same organ reads
 * a plane across two Lararia once "what is a mesh record" is settled; here it rides two local passes first.
 * Fewer than two readable contexts ⇒ honest insufficient, never a fabricated glue.
 */
export function readCohereAcrossContexts(
  plane: string, contexts: readonly CohereContext[], opts: ReadCohereOptions = {},
): CohereRead {
  const reader = opts.planeReader ?? coveragePlaneReader;
  const facePlanes: { plane: string; read: boolean }[] = [];
  const restrictions: PlaneRestriction[] = [];

  for (const ctx of contexts) {
    const manifest = readManifest(ctx.sensoriumDir);
    const faceName = `${plane}@${ctx.context}`;
    if (manifest === null || planeVariance(manifest, plane) !== "sheaf") {
      facePlanes.push({ plane: faceName, read: false });
      continue;
    }
    const dir = capDir(ctx.sensoriumDir, manifest, plane) ?? resolveCapDir(ctx.sensoriumDir, plane);
    const r = reader({ plane, capDir: dir, manifest });
    // relabel to the context face so two readings of the SAME plane stand as distinct sections.
    facePlanes.push({ plane: faceName, read: r !== null });
    if (r !== null) restrictions.push({ plane: faceName, variance: "sheaf", value: r.value });
  }

  const sensorium = `${plane} × ${contexts.map((c) => c.context).join(" ⋈ ")}`;
  if (restrictions.length < 2) {
    return {
      sensorium, planes: facePlanes, readable: restrictions.length, sharedUnits: 0,
      consistency: null, fusion: null,
      note: `insufficient readable contexts (${restrictions.length}/${contexts.length}) for a live-boundary glue`,
    };
  }

  const units = new Set<string>();
  for (const r of restrictions) for (const u of r.value.keys()) units.add(u);
  const seen = new Map<string, number>();
  for (const r of restrictions) for (const u of r.value.keys()) seen.set(u, (seen.get(u) ?? 0) + 1);
  let sharedUnits = 0;
  for (const c of seen.values()) if (c >= 2) sharedUnits++;

  const stalk: ComparisonStalk = { units: [...units] };
  const consistency = consistencyRadius(restrictions, stalk);
  const fusion: FuseResult = fuse({ restrictions, stalk }, opts);

  // the li-radius carries the gluing verdict; the H¹ gate only fires an irreducible cocycle at ≥3 contexts.
  const note = sharedUnits === 0
    ? `${restrictions.length} contexts glue over NO shared cid (disjoint) — a vacuous read`
    : consistency.glues
      ? `${restrictions.length} contexts of "${plane}" GLUE (radius 0) over ${sharedUnits} shared cid(s) — the passes agree`
      : fusion.verdict === "hold-open"
        ? `${restrictions.length} contexts of "${plane}" hold open (H¹=${fusion.obstruction.dimH1}, cost ${fusion.obstruction.cost.toFixed(3)}) — irreducible drift, route to Talk-Story`
        : `${restrictions.length} contexts of "${plane}" DIVERGE (radius ${consistency.radius.toFixed(3)}) over ${sharedUnits} shared cid(s) — a pass drifted (reconcilable), review`;

  return { sensorium, planes: facePlanes, readable: restrictions.length, sharedUnits, consistency, fusion, note };
}
