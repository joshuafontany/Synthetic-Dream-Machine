/**
 * job-local-dispatch — run a single job against a VerbTable with cap verification.
 *
 * Called by JobDispatcher for every job that resolves to a local handler.
 * Capability verification: S7 keyhive integration lands here without handler changes.
 *
 * Isomorphic: no Node or browser platform APIs. Runs in any sovereign Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/job-local-dispatch
 */

import {
  type CapabilityAccess,
  type CapabilityVerifyResult,
  type CapabilityVerifier,
  type CompositeStore,
  type JobTiddler,
} from "@lararium/mesh";
import type { VerbReactor, VerbTable } from "./job-dispatcher.js";

export type CapVerify = (access: CapabilityAccess, bagUrl: string) => Promise<CapabilityVerifyResult>;

export interface RunLocalJobOptions {
  readonly admin:     CompositeStore;
  readonly registry:  VerbTable;
  readonly verifier?: CapabilityVerifier;
}

export function makeCapVerify(verifier: CapabilityVerifier | undefined, requestedBy: string): CapVerify {
  return verifier
    ? (access, bagUrl) => verifier.verify({ presenter: requestedBy, bagUrl, access })
    : async () => ({ ok: true, reason: "no-verifier" });
}

export async function runLocalJob(job: JobTiddler, opts: RunLocalJobOptions): Promise<Record<string, unknown>> {
  const handler: VerbReactor | undefined = opts.registry.get(job.verb);

  if (!handler) {
    throw new Error(`no handler registered for "${job.verb}"`);
  }

  const cap = makeCapVerify(opts.verifier, job.requestedBy);
  return handler(job.args, { admin: opts.admin, job, cap });
}
