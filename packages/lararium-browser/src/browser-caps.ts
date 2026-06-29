/**
 * browser-caps — the browser vessel's #has-cap-stack, wired by the composable-keel engine.
 *
 * composeBrowser — the browser vessel composed over the SHARED keel: its single `browser-core` cap
 * delegates the VM sequence to `openVesselCore` (the one keel both node + browser walk), so the
 * browser's boot stays verbatim and the keel stays ONE. The mirror of node-caps' composeLararium —
 * with this, all three vessel-KINDS (Lararium · Herm · browser) compose over the one composeVessel.
 *
 * Canon: lar:///ha.ka.ba/@lararium/api/composable-keel
 */

import { composeVessel, type ComposedVessel } from "@lararium/mesh";
import {
  openVesselCore,
  type VesselOrchestration, type VesselCoreResult, type PrimaryMountPool,
} from "@lararium/tw5";

/**
 * composeBrowser — the browser #has-cap-stack. Runs the shared `openVesselCore` orchestrator verbatim
 * inside a delegating `browser-core` cap, so browser behaviour stays unchanged and the keel stays one.
 */
export async function composeBrowser<TPool extends PrimaryMountPool>(
  orchestration: VesselOrchestration<TPool>,
): Promise<{ vessel: ComposedVessel; core: VesselCoreResult<TPool> }> {
  let core: VesselCoreResult<TPool> | undefined;
  const vessel = await composeVessel([
    { id: "browser-core", build: async () => { core = await openVesselCore(orchestration); return core; } },
  ]);
  return { vessel, core: core! };
}
