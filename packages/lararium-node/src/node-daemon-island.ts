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

// The Boundary-1 inversion, in the worker: keyhive stays fs-blind, node supplies the writer that
// lands the keyhive Archive in the sovereign identity home. The worker inherits process.env, so it
// resolves the SAME `<state>/identity` path as main — the archive persists direct, no worker→main hop.
//
// `vault` — the SAME inversion for the at-rest seal LIFECYCLE (#60). It runs IN this worker (the one that
// owns the M3 re-seal), so seal/rotate re-persist the carriers AND update THIS process.env seal policy in
// one act — no un-rotate. keyhive stays fs-blind; node supplies the fs+crypto lifecycle handler.
runSovereignWorker((manifest) =>
  makeOperatorDaemonBehavior(manifest, {
    persistArchive: (bytes) => persistIdentityArchive(bytes),
    vault:          (verb, args) => runVaultVerb(verb, args),
  }),
);
