/**
 * Repo helpers shared between VM openers.
 *
 * `waitHandle` reaches here from mesh, where one implementation serves both vessels — which is what lets
 * the keel's "unified strategy" mean something a reader can check: it races local readiness against a
 * short window and merges a late remote into the fallback rather than dropping it.
 *
 * The tideline-class boot resolver (resolveBootDoc / StillJoining) lives in @lararium/mesh too, so the
 * vessel keel (open-vessel-core) can reach it — mesh cannot import this node package. Re-exported here
 * for the node-side callers that import it from this module.
 */

export { resolveBootDoc, isStillJoining } from "@lararium/mesh";
export type { Tideline, StillJoining, MeshScale } from "@lararium/mesh";

export { waitHandle, LOCAL_READY_MS } from "@lararium/mesh";
