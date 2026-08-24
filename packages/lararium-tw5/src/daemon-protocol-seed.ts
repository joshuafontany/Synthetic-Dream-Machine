/**
 * daemon-protocol-seed — the ONE cap-gated daemon protocol-seed site.
 *
 * Before this, the two vessel boots each re-seeded the daemon bag on their own hook: the browser entry
 * seeded Ui+Persona+Circle+Flow in `onBoot`, the node entry seeded Flow again in `onEa` — two sites, one
 * of them (node) missing the Ui/Persona/Circle seeds, the asymmetry the browser file's own comment flagged.
 *
 * seedDaemonProtocol folds all four seeds into ONE hull-gated call. makeDaemonBehavior runs it once (in
 * onEa, the hook BOTH boots reach), so neither entry re-seeds: the browser entry drops to mountProjection,
 * the node entry drops its lone flow seed. The vessel supplies its own `runnableHulls` — a ts-only vessel
 * (browser / TW5 VM) seeds only the flows it can enact (crystal); a full node vessel seeds all three. The
 * Ui/Persona/Circle seeds ride every vessel (they carry no hull).
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow · lar:///ha.ka.ba/lararium/browser/browser-daemon-island
 */

import { HULLS_TS_ONLY, type RunnableHulls } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";
import { seedDaemonUiTiddlers } from "./daemon-ui-tiddlers.js";
import { seedDaemonPersonaTiddlers } from "./daemon-persona-tiddlers.js";
import { seedDaemonCircleTiddlers } from "./daemon-circle-tiddlers.js";
import { seedDaemonFlowTiddlers } from "./daemon-flow-tiddlers.js";
import { seedDaemonRosterTiddlers } from "./daemon-roster-tiddlers.js";

/**
 * Seed the whole daemon protocol surface into the live wiki, ONCE: the UI widgets, the persona circle,
 * the circle-of-trust, and the cap-gated FLOW set. `runnableHulls` gates ONLY the flow seed (the flows a
 * vessel can enact); the Ui/Persona/Circle seeds are hull-blind. Idempotent (each seed setTiddler-overwrites).
 * A ts-only vessel seeds crystal alone; a full node vessel seeds all three flows.
 */
export function seedDaemonProtocol(tw5: TW5Engine, runnableHulls: RunnableHulls = HULLS_TS_ONLY): void {
  seedDaemonUiTiddlers(tw5);
  seedDaemonPersonaTiddlers(tw5);
  seedDaemonCircleTiddlers(tw5);
  seedDaemonRosterTiddlers(tw5);
  seedDaemonFlowTiddlers(tw5, runnableHulls);
}
