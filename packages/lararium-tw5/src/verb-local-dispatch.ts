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
  ADMIN_BAG_ID,
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

/**
 * deriveRoutedCap — the capability a routed verb requires, derived at the WORKER
 * gate BEFORE it delegates the verb to main (verify-then-delegate; the keyholder
 * worker verifies, then main trusts the worker→main channel as the capability —
 * see project_verification_placement).
 *
 * Conservative by construction so the gate NEVER under-protects: access defaults
 * to "admin" (admin ⊇ read, so a read-only verb merely over-gates in alpha, which
 * a per-verb table refines later); the target bag derives from the common arg
 * shapes; absent one it falls back to the admin bag (must-hold-admin-here).
 */
export function deriveRoutedCap(invocation: VerbInvocation): { access: CapabilityAccess; bagUrl: string } {
  const a = invocation.args as Record<string, unknown>;
  const pick = (k: string): string | null => (typeof a[k] === "string" ? (a[k] as string) : null);
  const bagUrl = pick("bagUrl") ?? pick("toBag") ?? pick("dest") ?? pick("bag") ?? pick("targetBag") ?? ADMIN_BAG_ID;
  return { access: "admin", bagUrl };
}

export async function runLocalVerb(invocation: VerbInvocation, opts: RunLocalVerbOptions): Promise<Record<string, unknown>> {
  const handler: VerbReactor | undefined = opts.registry.get(invocation.verb);

  if (!handler) {
    throw new Error(`no handler registered for "${invocation.verb}"`);
  }

  const cap = makeCapVerify(opts.verifier, invocation.requestedBy);
  return handler(invocation.args, { admin: opts.admin, invocation, cap });
}
