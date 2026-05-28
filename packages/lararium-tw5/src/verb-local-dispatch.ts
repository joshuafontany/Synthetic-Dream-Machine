/**
 * verb-local-dispatch — run a single verb invocation against a VerbTable with cap verification.
 *
 * Called by VerbDispatcher for every invocation that resolves to a local handler.
 * Capability verification: keyhive integration lands here without handler changes.
 *
 * Isomorphic: no Node or browser platform APIs. Runs in any sovereign Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/verb-local-dispatch
 */

import {
  type CapabilityAccess,
  type CapabilityVerifyResult,
  type CapabilityVerifier,
  type CompositeStore,
  type VerbInvocation,
} from "@lararium/mesh";
import type { VerbReactor, VerbTable } from "./verb-dispatcher.js";

export type CapVerify = (access: CapabilityAccess, bagUrl: string) => Promise<CapabilityVerifyResult>;

export interface RunLocalVerbOptions {
  readonly admin:     CompositeStore;
  readonly registry:  VerbTable;
  readonly verifier?: CapabilityVerifier;
}

export function makeCapVerify(verifier: CapabilityVerifier | undefined, requestedBy: string): CapVerify {
  return verifier
    ? (access, bagUrl) => verifier.verify({ presenter: requestedBy, bagUrl, access })
    : async () => ({ ok: true, reason: "no-verifier" });
}

export async function runLocalVerb(invocation: VerbInvocation, opts: RunLocalVerbOptions): Promise<Record<string, unknown>> {
  const handler: VerbReactor | undefined = opts.registry.get(invocation.verb);

  if (!handler) {
    throw new Error(`no handler registered for "${invocation.verb}"`);
  }

  const cap = makeCapVerify(opts.verifier, invocation.requestedBy);
  return handler(invocation.args, { admin: opts.admin, invocation, cap });
}
