/**
 * open-vessel — back-compat surface over the GRANULAR keel (core-caps).
 *
 * Canon: lar:///ha.ka.ba/@lararium/mesh/open-vessel + …/api/composable-keel. The monolithic
 * `openVesselCore` linear sequence RETIRED — its body decomposed into the six granular cap-modules
 * in `core-caps.ts` (substrate · wikislot · daemon · wiki · pool · mount), composed by
 * `composeCoreVessel`. This module keeps the historical export NAME as a thin alias so callers
 * outside (node + browser recipes) that import `openVesselCore` / the surface types stay unbroken.
 *
 * A capability the recipe omits simply does not run (absent = not-yet-held, Ink & Switch).
 */

import { composeCoreVessel } from "./core-caps.js";

/** Historical name → the granular composer. `openVesselCore(o)` runs `composeCoreVessel(o)`. */
export const openVesselCore = composeCoreVessel;

export {
  composeCoreVessel,
  substrateCap, daemonCap,
  wikiSlotCap, wikiCap, poolCap, mountCap,
  CORE_CAP,
} from "./core-caps.js";
export type {
  VesselOrchestration, VesselCoreResult, VesselDaemonVm, VesselWikiSlot,
  WikiSlotComponent, DaemonCapDeps,
} from "./core-caps.js";
