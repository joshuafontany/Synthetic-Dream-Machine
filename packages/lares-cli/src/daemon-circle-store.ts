/**
 * daemon-circle-store — the @circles-backed CircleStore adapter (the follow-graph's SOURCE OF TRUTH).
 *
 * The CircleStore shore composeFollow consumes (mesh/compose-follow). Where the node-fs adapter wrote a LOCAL
 * private JSON file (Build 2a — per-device, never fleet-synced), THIS adapter drives the daemon FOLLOW-GRAPH
 * verbs (circle-add / circle-remove / circle-list) over the pono sock: the follow lands in the sovereign
 * @circles Automerge doc, which the self-slot FLEET-syncs to the operator's OWN device fleet (PRIVATE-but-
 * same-operator, matching @catalog) and NEVER federates to a stranger. One graph, every device of the human.
 *
 * The INTERFACE never moved — composeFollow still RECOGNISES a nym in the LOCAL handle-book (fail-closed on an
 * unknown nym) BEFORE the membership write reaches @circles; only the graph's BACKING moved from a local file
 * to the daemon-held circles doc. NEVER-FEDERATES, STRUCTURALLY: the adapter reaches ONLY the three circle-*
 * verbs; no @crossroads / board / announce verb is on it, so a follow leaves no central trace.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-two-stacks
 */

import type { CircleStore } from "@lararium/mesh";
import { runVerb, type RunVerbOptions } from "./verb-call.js";
import { summaryOutput } from "./verb-result.js";

/**
 * Build the @circles-backed CircleStore. Every op drives a daemon FOLLOW-GRAPH verb over the sock; the daemon
 * writes-then-syncs @circles. `requestedBy` (the operator DID) rides each invocation for the verify-then-
 * delegate gate. A daemon error surfaces as itself (never a silent local fallback — the graph's home moved).
 */
export function makeDaemonCircleStore(requestedBy: string, opts: RunVerbOptions = {}): CircleStore {
  const call = async (verb: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const r = await runVerb(verb, args, requestedBy, opts);
    if (r.status === "error") throw new Error(r.errorMessage ?? `${verb} failed`);
    return summaryOutput(r) ?? {};
  };
  return {
    async add(circleId, nym)    { await call("circle-add",    { circle: circleId, nym }); },
    async remove(circleId, nym) { await call("circle-remove", { circle: circleId, nym }); },
    async members(circleId) {
      const out = await call("circle-list", { circle: circleId });
      return Array.isArray(out["members"]) ? (out["members"] as string[]) : [];
    },
    async circles() {
      const out  = await call("circle-list", {});
      const rows = Array.isArray(out["circles"]) ? (out["circles"] as Array<{ circle: string }>) : [];
      return rows.map((r) => r.circle).sort();
    },
  };
}
