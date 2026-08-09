/**
 * Repo helpers shared between VM openers.
 *
 * `waitHandleLocal` names mesh's `waitHandle` for the node-side callers that reach it here. ONE
 * implementation serves both vessels, which is what lets the keel's "unified strategy" mean something a
 * reader can check: it races local readiness against a short window and merges a late remote into the
 * fallback rather than dropping it.
 *
 * The tideline-class boot resolver (resolveBootDoc / StillJoining) lives in @lararium/mesh too, so the
 * vessel keel (open-vessel-core) can reach it — mesh cannot import this node package. Re-exported here
 * for the node-side callers that import it from this module.
 */

export { resolveBootDoc, isStillJoining } from "@lararium/mesh";
export type { Tideline, StillJoining, MeshScale } from "@lararium/mesh";

/** The node-side name for mesh's one boot resolver. */
export { waitHandle as waitHandleLocal, LOCAL_READY_MS } from "@lararium/mesh";
