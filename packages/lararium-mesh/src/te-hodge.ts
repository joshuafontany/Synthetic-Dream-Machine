/**
 * te-hodge — the coupling plane's OWN co-consistency instrument: a discrete Helmholtz-Hodge decomposition
 * of the directed transfer-entropy flow, read for its CIRCULATION. This re-founds the ki (cosheaf)
 * co-restrictions on the flow BETWEEN streams — retiring the MODWT-MRA wavelet scaffold that answered a
 * change-point question (a regime turnover) with spurious low-frequency power (a bandpass reports where
 * energy at its scale concentrates; a regime turnover is not a period the signal ever held).
 *
 * THE FLOW carries no presupposed name. It arrives as `MeshCoupling.te` — a directed nagare between the
 * children (`te[i][j]` = TE i→j bits), gathered by the coupler, not asserted here. The decomposition hands
 * the flow's parts working handles by what they DO, never by an essence:
 *
 *   • the GRADIENT part — the flow a single node POTENTIAL carries: `grad(i,j) = s(j) − s(i)`. A flow that
 *     reduces to such a potential collapses to one stream's "who-leads-whom" ranking and holds NO fact a
 *     coarsening of one stream could not already reach — the reducible part.
 *   • the ROTATIONAL part — the residual `r = w − grad`, whose CIRCULATION around a cycle admits no
 *     potential. This is the part that stays a relation between two streams: the irreducible coupling the
 *     ki-radius reads.
 *
 * The net flow rides the COMPLETE graph on the children (a χ²-gated edge carries net flow 0, a legitimate
 * "no significant asymmetry" reading — not a missing edge), so the HodgeRank potential closes in one line:
 * `s = div / n` (the graph Laplacian of K_n acts as `n·s` on the mean-zero divergence, and the net flow's
 * divergence is mean-zero by antisymmetry). On K_n there is no harmonic part — the residual is pure curl.
 *
 * The circulation around each triangle `(i,j,k)` is `w(i,j) + w(j,k) + w(k,i)` (the gradient telescopes to
 * 0 around any cycle). {@link teFlowHodgeCoRestrictions} carries the two Hodge parts as cosheaf faces over
 * the triangle cofaces — the gradient face reads circulation 0 everywhere (a theorem), the rotational face
 * reads the actual curl — so {@link kiCoConsistency} co-extends (radius 0) exactly when the flow is
 * curl-free (a pure lead-lag potential, no irreducible coupling), and localizes any residual circulation to
 * the offending triangle. Drop-in for the retired MODWT-MRA co-restriction seam, zero call-site change.
 *
 * Whether the convergence this reads estimates one real quantity (inflationary) or grows wherever any
 * instrument imposes structure (deflationary) stays LIVE — this organ files the flow's parts by what they
 * carry and lets the aperture (the triangle cofaces) narrow them; it names no quantity it then hunts for.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/sensorium-machina#ki · lar:///ha.ka.ba/lares/api/pono/cohomological-gate
 */

import type { MeshCoupling } from "./mesh-coupling.js";
import type { PlaneCoRestriction, CofaceStalk } from "./sensorium-consistency.js";

/** A directed transfer-entropy matrix + its node names — the shape {@link MeshCoupling} carries, taken thin. */
export interface TEFlow {
  readonly children: readonly string[];
  /** `te[i][j]` = directed TE(child_i → child_j) in bits; the diagonal reads 0. */
  readonly te: readonly (readonly number[])[];
}

/** One triangle's circulation — the flow's rotational content around the 3-cycle `(i,j,k)`, i<j<k. */
export interface TriangleCirculation {
  /** the three child indices, ascending. */
  readonly triangle: readonly [number, number, number];
  /** the coface id `t{i}-{j}-{k}` — the stalk cell this triangle contributes. */
  readonly coface: string;
  /** the signed circulation `w(i,j) + w(j,k) + w(k,i)` (bits); |value| is the irreducible-coupling magnitude. */
  readonly circulation: number;
}

/** The Helmholtz-Hodge reading of a TE flow — the reducible potential, the net flow, and its circulation. */
export interface TEHodgeDecomposition {
  readonly children: readonly string[];
  /** the HodgeRank node potential `s[i] = div[i]/n` — the reducible lead-lag ranking (mean-zero). */
  readonly potential: readonly number[];
  /** the net antisymmetric edge flow `w[i][j] = te[i][j] − te[j][i]` (bits). */
  readonly netFlow: readonly (readonly number[])[];
  /** per-triangle circulation — the rotational (irreducible) content the ki-radius reads. */
  readonly circulations: readonly TriangleCirculation[];
  /** the sup circulation magnitude over triangles — 0 ⟺ the flow is a pure gradient (curl-free). */
  readonly maxCirculation: number;
}

/** The coface id a triangle contributes to the stalk — `t{i}-{j}-{k}`, indices ascending. */
function triangleCoface(i: number, j: number, k: number): string {
  return `t${i}-${j}-${k}`;
}

/**
 * Decompose a directed TE flow into its Hodge parts. Reads the net antisymmetric flow, closes the HodgeRank
 * potential `s = div/n` (the reducible lead-lag ranking), and reads the circulation of the residual around
 * every triangle. Diagnostic only — an effective/TE flow never mints geometry; this reads its shape.
 */
export function hodgeDecomposeTEFlow(flow: TEFlow): TEHodgeDecomposition {
  const n = flow.children.length;
  const te = flow.te;

  // the net edge flow on the COMPLETE graph — antisymmetric, so its divergence is mean-zero.
  const netFlow: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const div = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const w = (te[i]?.[j] ?? 0) - (te[j]?.[i] ?? 0);
      netFlow[i]![j] = w;
      div[i]! += w;
    }
  }

  // the HodgeRank potential closes in one line on K_n: L s = div, Σs = 0 ⇒ s = div/n.
  const potential = n > 0 ? div.map((d) => d / n) : [];

  // the circulation around each triangle — the gradient telescopes to 0, so this reads the residual's curl.
  const circulations: TriangleCirculation[] = [];
  let maxCirculation = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const c = netFlow[i]![j]! + netFlow[j]![k]! + netFlow[k]![i]!;
        circulations.push({ triangle: [i, j, k], coface: triangleCoface(i, j, k), circulation: c });
        if (Math.abs(c) > maxCirculation) maxCirculation = Math.abs(c);
      }
    }
  }

  return { children: flow.children, potential, netFlow, circulations, maxCirculation };
}

/** The plane handles the two Hodge parts wear — reducible (gradient) ⊥ irreducible (rotational). */
export const HODGE_GRADIENT_FACE = "gradient";
export const HODGE_ROTATIONAL_FACE = "rotational";

/**
 * Build the ki cosheaf co-restrictions from a TE flow's Hodge decomposition — the drop-in replacement for
 * the retired MODWT-MRA wavelet co-restrictions. The coface stalk is the triangle universe; the two faces carry
 * the flow's Hodge parts by their circulation there:
 *
 *   • `gradient`   — circulation 0 on every triangle (a gradient is curl-free, a theorem).
 *   • `rotational` — the actual per-triangle circulation.
 *
 * {@link kiCoConsistency} over these co-extends (radius 0) exactly when every triangle is curl-free — the
 * flow reduces to a lead-lag potential and carries no irreducible coupling. A residual circulation pushes
 * the rotational face off the gradient's 0 and the radius goes positive, localized to the offending triangle.
 * With fewer than three children there are no triangles: an empty coface stalk, a vacuous read.
 */
export function teFlowHodgeCoRestrictions(flow: TEFlow): {
  stalk: CofaceStalk; coRestrictions: PlaneCoRestriction[];
} {
  const decomp = hodgeDecomposeTEFlow(flow);
  const cofaces = decomp.circulations.map((c) => c.coface);

  const gradientValue = new Map<string, number>();
  const rotationalValue = new Map<string, number>();
  for (const c of decomp.circulations) {
    gradientValue.set(c.coface, 0);           // the gradient part carries no circulation, anywhere
    rotationalValue.set(c.coface, c.circulation);
  }

  const coRestrictions: PlaneCoRestriction[] = [
    { plane: HODGE_GRADIENT_FACE, variance: "cosheaf", value: gradientValue },
    { plane: HODGE_ROTATIONAL_FACE, variance: "cosheaf", value: rotationalValue },
  ];
  return { stalk: { cofaces }, coRestrictions };
}
