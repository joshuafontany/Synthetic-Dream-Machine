/**
 * sensorium-square — the JING read: the li∘ki square over a child-hosting sensorium's cover. Where `li`
 * reads grain-gluing within one stream and `ki` reads flow-coupling across peers, JING reads the JOINT —
 * whether a node's lobes express ONE coherent trained force, or whether the grain and the flow fail to
 * round-trip. It is neither leg; it composes both and measures their commutation on the children-nerve.
 *
 * THE ROUND-TRIP (the map pair). The cover is the sensorium's `coupling.children` — for the load-bearing
 * mesh sensorium, the WHO ⊥ AUTHORITY ⊥ FLOW lobes the node federates onto DreamNet. Each lobe carries a
 * local section over the shared cid stalk. The square runs the two composite maps:
 *   • EXTEND (ki, local→global): `fuse` the lobes into a consensus — the reconciled self.
 *   • RESTRICT (li, global→local): carry that consensus back down to each lobe and compare to its own section.
 * The node COHERES (radius 0) exactly when extend-then-restrict returns the identity — every lobe's local
 * view equals the reconciled self restricted back. A residual pushes the radius positive, LOCALIZED to the
 * offending lobe: the self stops cohering THERE — the map the node shows the mesh diverges from the
 * territory it holds. When the extension itself holds open (H¹≠0), the lobes admit no common self at all.
 *
 * This carries the sheaf `H¹` obstruction the canon names for the square (Hansen–Ghrist cellular-sheaf
 * cohomology on the cover-nerve) — a DIFFERENT obstruction from the TE-flow circulation (te-hodge), which
 * reads local curl on the flow-graph; JING never certifies off that circulation, nor it off this. The two
 * stand complementary at two grains: this glues the self on the nerve, that reads coupling on the flow.
 *
 * The lobes wear working handles (who/authority/flow, or the child names) — no presupposed "coherence
 * quantity" is named and then hunted; the read files each lobe by what it carries and lets the shared cid
 * stalk narrow them. Inflationary ⊥ deflationary stays live.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/mesh-palace · lar:///ha.ka.ba/lares/api/pono/li-ki-integrities#the-lattice
 */

import { readManifest, resolveCapDir } from "./sensorium.js";
import { defaultChildRestriction, type ChildRestriction } from "./sensorium-coupling.js";
import { consistencyRadius, fuse } from "@lararium/mesh";
import type { ConsistencyRadius, PlaneRestriction, ComparisonStalk, FuseResult, FuseOptions } from "@lararium/mesh";

/** below this the round-trip counts as the identity — a glued consensus restricts back to its own sections exactly. */
const COHERE_EPS = 1e-12;

/** One lobe's round-trip — how far its own section sits from the reconciled self restricted back to it. */
export interface LobeRoundTrip {
  /** the lobe handle (who/authority/flow, or the child sensorium name). */
  readonly lobe: string;
  /** whether a section reading was obtained for this lobe. */
  readonly read: boolean;
  /** L∞ between the lobe's own section and the consensus restricted to its domain; 0 ⟺ it round-trips clean. */
  readonly disagreement: number;
  /** the cid(s) where the lobe diverges most from the reconciled self — where it stops cohering. */
  readonly locus: readonly string[];
}

/** The jing read — the li∘ki round-trip over the children cover, plus the two legs it composes. */
export interface JingRead {
  /** the child-hosting sensorium whose lobes were squared (or `"(no-manifest)"`). */
  readonly sensorium: string;
  /** every lobe, its round-trip, marked read/unread. */
  readonly lobes: readonly LobeRoundTrip[];
  /** how many lobes yielded a section (the cover size fed to the square). */
  readonly readable: number;
  /** the round-trip is the identity — the lobes express one coherent self (the jing lands). */
  readonly coheres: boolean;
  /** the round-trip obstruction — the sup lobe disagreement (or the ki hold-open cost). 0 ⟺ coheres. */
  readonly radius: number;
  /** the lobe where the self stops cohering (`null` when it coheres or the extension holds open). */
  readonly offendingLobe: string | null;
  /** the li leg — the direct grain-gluing of the lobes over the shared stalk (`null` when insufficient). */
  readonly consistency: ConsistencyRadius | null;
  /** the ki leg — the extension to a reconciled self (`fuse`/`hold-open`; `null` when insufficient). */
  readonly fusion: FuseResult | null;
  /** a human note — the coherence verdict, or why insufficient. */
  readonly note: string;
}

export interface ReadJingOptions extends FuseOptions {
  /** override the per-lobe section reader (default {@link defaultChildRestriction} — the saliences sidecar). */
  readonly childRestriction?: ChildRestriction;
}

/**
 * Read the JING of a child-hosting sensorium — the li∘ki square over its `coupling.children`. Resolve each
 * lobe's section, EXTEND them to a reconciled self (`fuse`), RESTRICT that self back to each lobe, and read
 * the round-trip obstruction. Coheres (radius 0) ⟺ the round-trip is the identity. Fewer than two readable
 * lobes ⇒ honest insufficient, never a fabricated coherence.
 */
export function readJing(sensoriumDir: string, opts: ReadJingOptions = {}): JingRead {
  const manifest = readManifest(sensoriumDir);
  if (manifest === null) {
    return { sensorium: "(no-manifest)", lobes: [], readable: 0, coheres: false, radius: 0,
             offendingLobe: null, consistency: null, fusion: null, note: `no sensorium manifest at ${sensoriumDir}` };
  }
  const reader = opts.childRestriction ?? defaultChildRestriction;

  const resolved: { name: string; restriction: PlaneRestriction | null }[] = manifest.coupling.children.map((child) => {
    const childDir = resolveCapDir(sensoriumDir, child.dir);
    return { name: child.sensorium, restriction: reader({ child, childDir, manifest: readManifest(childDir) }) };
  });
  const restrictions = resolved.filter((l) => l.restriction !== null).map((l) => l.restriction!);

  if (restrictions.length < 2) {
    return {
      sensorium: manifest.sensorium,
      lobes: resolved.map((l) => ({ lobe: l.name, read: l.restriction !== null, disagreement: 0, locus: [] })),
      readable: restrictions.length, coheres: false, radius: 0, offendingLobe: null, consistency: null, fusion: null,
      note: manifest.coupling.children.length === 0
        ? "no lobes to square — this sensorium hosts no children"
        : `insufficient readable lobes (${restrictions.length}/${manifest.coupling.children.length}) — the honest no-square`,
    };
  }

  const units = new Set<string>();
  for (const r of restrictions) for (const u of r.value.keys()) units.add(u);
  const stalk: ComparisonStalk = { units: [...units] };
  const consistency = consistencyRadius(restrictions, stalk);   // the li leg — do the lobes glue directly?
  const fusion: FuseResult = fuse({ restrictions, stalk }, opts); // the ki leg — extend to a reconciled self

  // the ki extension itself holds open: the lobes admit no common self to restrict back — the square can't start.
  if (fusion.verdict === "hold-open") {
    return {
      sensorium: manifest.sensorium,
      lobes: resolved.map((l) => ({ lobe: l.name, read: l.restriction !== null, disagreement: 0, locus: [] })),
      readable: restrictions.length, coheres: false, radius: fusion.obstruction.cost, offendingLobe: null,
      consistency, fusion,
      note: `the extension holds open (H¹=${fusion.obstruction.dimH1}, cost ${fusion.obstruction.cost.toFixed(3)}) — the lobes admit no common self; route to Talk-Story`,
    };
  }

  // the round-trip: restrict the reconciled self back to each lobe, compare to the lobe's own section (L∞).
  const consensus = fusion.fused.consensus;
  const lobeRoundTrips: LobeRoundTrip[] = resolved.map((l) => {
    if (l.restriction === null) return { lobe: l.name, read: false, disagreement: 0, locus: [] };
    let disagreement = 0;
    let locus: string[] = [];
    for (const [cid, v] of l.restriction.value) {
      const diff = Math.abs(v - (consensus.get(cid) ?? 0));
      if (diff > disagreement) { disagreement = diff; locus = [cid]; }
      else if (diff === disagreement && diff > 0) locus.push(cid);
    }
    return { lobe: l.name, read: true, disagreement, locus };
  });

  const radius = lobeRoundTrips.reduce((m, l) => Math.max(m, l.disagreement), 0);
  const coheres = radius <= COHERE_EPS;
  const offendingLobe = coheres ? null
    : lobeRoundTrips.reduce((a, b) => (b.disagreement > a.disagreement ? b : a)).lobe;

  const note = coheres
    ? `the ${restrictions.length} lobes round-trip clean (radius 0) — the node coheres, its jing lands`
    : `round-trip obstruction radius ${radius.toFixed(3)} at "${offendingLobe}" — the extend→restrict is not the identity; the self diverges there`;

  return { sensorium: manifest.sensorium, lobes: lobeRoundTrips, readable: restrictions.length, coheres, radius, offendingLobe, consistency, fusion, note };
}
