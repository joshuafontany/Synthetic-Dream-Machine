/** Node daemon-island entry point.
 *
 * The node vessel contributes transport and custody only.  Session capture lives in the
 * Python source-stream service; this worker deliberately receives no capture sink, payload,
 * spool, or vector-store configuration.
 */

import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeOperatorDaemonBehavior } from "@lararium/keyhive/operator-daemon-behavior";
import { persistIdentityArchive } from "./identity-anchors.js";
import { runVaultVerb } from "./archive-passphrase.js";
import { seedDaemonFlowTiddlers } from "@lararium/tw5";
import { HULLS_FULL } from "@lararium/mesh";

// The Boundary-1 inversion, in the worker: keyhive stays fs-blind, node supplies the writer that
// lands the keyhive Archive in the sovereign identity home. The worker inherits process.env, so it
// resolves the SAME `<state>/identity` path as main — the archive persists direct, no worker→main hop.
//
// `vault` — the SAME inversion for the at-rest seal LIFECYCLE (#60). It runs IN this worker (the one that
// owns the M3 re-seal), so seal/rotate re-persist the carriers AND update THIS process.env seal policy in
// one act — no un-rotate. keyhive stays fs-blind; node supplies the fs+crypto lifecycle handler.
runSovereignWorker((manifest) => {
  const base = makeOperatorDaemonBehavior(manifest, {
    persistArchive: (bytes) => persistIdentityArchive(bytes),
    vault:          (verb, args) => runVaultVerb(verb, args),
  });
  // Cap-gated flow seed: a NODE vessel reaches py/R, so it seeds its FULL enactable flow-set (all three)
  // into its own sovereign @daemon bag — a ts-only vessel seeds only crystal. `onEa` fires once the wiki
  // is live, before the drain loop. The seeded set IS this vessel's advertised enactable-list: a
  // personagroup peer reads it, then summons a flow with the Verb `aud` narrowed to this vessel — the
  // delegation an unable vessel makes to an able one.
  return {
    onEa:     (ctx) => { seedDaemonFlowTiddlers(ctx.tw5, HULLS_FULL); return base.onEa(ctx); },
    onSignal: (type, raw, ctx) => base.onSignal(type, raw, ctx),
    onHooAnu: (ctx) => base.onHooAnu(ctx),
  };
});
