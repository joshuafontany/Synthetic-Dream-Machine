/** Node daemon-island entry point.
 *
 * The node vessel contributes transport and custody only.  Session capture lives in the
 * Python source-stream service; this worker deliberately receives no capture sink, payload,
 * spool, or vector-store configuration.
 */

import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeOperatorDaemonBehavior } from "@lararium/keyhive/operator-daemon-behavior";
import { persistIdentityArchive } from "./identity-anchors.js";

// The Boundary-1 inversion, in the worker: keyhive stays fs-blind, node supplies the writer that
// lands the keyhive Archive in the sovereign identity home. The worker inherits process.env, so it
// resolves the SAME `<state>/identity` path as main — the archive persists direct, no worker→main hop.
runSovereignWorker((manifest) =>
  makeOperatorDaemonBehavior(manifest, { persistArchive: (bytes) => persistIdentityArchive(bytes) }),
);
