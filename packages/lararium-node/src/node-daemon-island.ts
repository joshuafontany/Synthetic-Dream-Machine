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
import { HULLS_FULL } from "@lararium/mesh";
import { runReconcileCadence } from "./sensorium-lifecycle-verbs.js";

// The Boundary-1 inversion, in the worker: keyhive stays fs-blind, node supplies the writer that
// lands the keyhive Archive in the sovereign identity home. The worker inherits process.env, so it
// resolves the SAME `<data>/identity` path as main — the archive persists direct, no worker→main hop.
//
// `vault` — the SAME inversion for the at-rest seal LIFECYCLE (#60). It runs IN this worker (the one that
// owns the M3 re-seal), so seal/rotate re-persist the carriers AND update THIS process.env seal policy in
// one act — no un-rotate. keyhive stays fs-blind; node supplies the fs+crypto lifecycle handler.
runSovereignWorker((manifest) => {
  // THE ISOMORPHIC SEED LIFT: a NODE vessel reaches py/R, so it passes HULLS_FULL — makeDaemonBehavior's
  // ONE cap-gated seedDaemonProtocol (onEa) then seeds this vessel's FULL enactable flow-set (all three)
  // plus the Ui/Persona/Circle seeds, from the single site. This entry no longer re-seeds (the two-site
  // wart is gone). The seeded flow-set IS this vessel's advertised enactable-list a personagroup peer reads.
  const base = makeOperatorDaemonBehavior(manifest, {
    persistArchive: (bytes) => persistIdentityArchive(bytes),
    vault:          (verb, args) => runVaultVerb(verb, args),
    runnableHulls:  HULLS_FULL,
  });
  return {
    onEa:     (ctx) => base.onEa(ctx),
    onSignal: (type, raw, ctx) => base.onSignal(type, raw, ctx),
    // The daemon-loop reconcile CADENCE at its real hook (F5), FEATURE-GATED OFF: runReconcileCadence()
    // reads LIFECYCLE_GATES_DEFAULT → daemonLoopReconcile:false → a no-op ({ran:false}). There and unused;
    // flipping the gate ON turns onHooAnu into the k8s-style continuous reconcile over every sensorium.
    onHooAnu: (ctx) => { runReconcileCadence(); return base.onHooAnu(ctx); },
  };
});
