/**
 * spectral-keel-cap — the ocap capability line over the spectral keel (Sprint-2 R3). The READ/WRITE verb-
 * split IS the capability boundary: an island composes `project` always (read the frozen anchor), and gains
 * `track` (drift the live subspace) ONLY when the `capture-island` write-authority cap rides its
 * #has-cap-stack. Miller's facet pattern (Robust Composition, 2006) on the existing composeVessel present-
 * optional: the keel cap-module mints the full keel ONCE (parenthood, the powerbox — the handle never leaves
 * the build frame), reads the write grant at COMPOSE time (not a call-time `if (!hasCap) throw`), and hands
 * out the attenuated facet. A capless island's reference simply LACKS `.track` — blind by composition, the
 * poisoning surface closed by structure. `freeze` + the anchorFacet (re-anchor cap) ride the next sprint.
 *
 * Confused-deputy ward (two levels): compose-time POLA (the resolver reaches only declared deps) + call-time
 * direct closure (each verb closes over ITS keel's own state — no ambient keel registry, no Π-by-id lookup).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

import type { CapModule } from "./cap-compose.js";
import { buildSpectralKeel, type SpectralKeel, type KeelOpts, type Projection } from "./spectral-keel.js";
import type { Reading } from "./subspace-track.js";
import type { MeshCoupling } from "./mesh-coupling.js";

/** The keel cap-id (mints + exposes the facet). */
export const SPECTRAL_KEEL_CAP = "spectral-keel";
/** The write-authority marker — its PRESENCE in the stack grants `track`. */
export const CAPTURE_ISLAND_CAP = "capture-island";

/** The READ facet — `project` only. A capless island holds this; it carries no `.track` to call. */
export interface ReadFacet {
  project(frame: readonly number[]): Projection;
}
/** The WRITE facet — `project` + `track`. Granted only when `capture-island` composes. */
export interface WriteFacet extends ReadFacet {
  track(frame: readonly number[]): Reading;
}

/** Attenuate the keel to its READ facet — a fresh object bearing only `project` (the keel + its `track`
 *  stay closed-over, unreachable through this reference). */
export function readFacet(keel: SpectralKeel): ReadFacet {
  return { project: (f) => keel.project(f) };
}
/** Attenuate the keel to its READ+WRITE facet — `project` + `track`. */
export function writeFacet(keel: SpectralKeel): WriteFacet {
  return { project: (f) => keel.project(f), track: (f) => keel.track(f) };
}

/**
 * The keel cap-module — mints the keel ONCE (parenthood), reads the write grant at compose time via the
 * present-optional resolver, and returns the granted facet: writeFacet when `capture-island` rides the
 * stack, else readFacet. The full handle never leaves this build frame (the powerbox). The compose-time
 * branch (NOT a call-time authority check) draws the capability line — Miller's "choose the facet at grant
 * time"; a capless island's reference has no `.track` method at all.
 */
export function spectralKeelCap(coupling: MeshCoupling, opts: KeelOpts = {}): CapModule<ReadFacet> {
  return {
    id: SPECTRAL_KEEL_CAP,
    optional: [CAPTURE_ISLAND_CAP],
    build: (resolve) => {
      const keel = buildSpectralKeel(coupling, opts); // MINT — parenthood, once
      const canWrite = resolve(CAPTURE_ISLAND_CAP) !== undefined; // compose-time grant read, once
      return canWrite ? writeFacet(keel) : readFacet(keel);
    },
  };
}

/** The write-authority marker cap — its PRESENCE grants `track`. An island whose stack omits it composes a
 *  readFacet with no `.track` reachable (blind by structure, never a runtime flag). */
export function captureIslandCap(): CapModule<Record<string, never>> {
  return { id: CAPTURE_ISLAND_CAP, build: () => ({}) };
}
