/**
 * boot-admin-keyhive — the isomorphic keyhive boot+gate sequence for the admin
 * island. ONE function, called identically on every platform's admin worker.
 *
 * Stage 1 of the isomorphic-vessel epic moves authn/z off the host and into the
 * admin island. This function is the heart of that move, extracted PURE (no
 * worker, no platform API) so it unit-tests in-process. The admin island's
 * `onEa` calls it with the seed (delivered via the manifest) and the admin
 * CompositeStore (the cap-event EventStore backing); the host no longer boots
 * keyhive at all (keyhive cannot double-boot — `generateDocument` mints a fresh
 * CSPRNG doc-id each call, so two instances diverge).
 *
 * Founding never happens here: a new operator's first boot founds on the host
 * (`runFoundingCeremony` via the platform `loadBootstrap`) BEFORE the admin
 * worker spawns. This function always receives an already-founded operator and
 * GATES — identical whether the operator is new (just founded this boot) or
 * returning.
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/api/lararium/vessel-platform#authn-home
 */

import { KeyhiveProvider } from "./keyhive-provider.js";
import type { CapabilityProviderInitOpts } from "./capability-provider.js";
import { verifyDeviceDelegation, type DeviceDelegationTiddler } from "@lararium/mesh";

export interface BootAdminKeyhiveInput {
  /** 32-byte operator signing seed (delivered to the worker via the manifest). */
  readonly seed: Uint8Array;
  /** Cap-event store — AdminEventStore over the admin CompositeStore in-island. */
  readonly eventStore: CapabilityProviderInitOpts["eventStore"];
  /** Hex Ed25519 verifying key the keyhive identity MUST resolve to (Gate A). */
  readonly operatorVerifyingKey: string;
  /** PersonGroup sentinel Document id hex — Gate B membership target. */
  readonly personGroupDocIdHex: string;
  /** PersonGroup agent id hex — Gate C membership subject. */
  readonly personGroupAgentIdHex: string;
  /** MeshCabal sentinel Document id hex — Gate C membership target. */
  readonly meshCabalDocIdHex: string;
  /** Writable bag URIs to register so `verify`/`delegate` resolve (lar: URIs). */
  readonly registerBags: readonly string[];
  /** The PINNED signer DID — Gate B verifies the edge against THIS (self for an anon, a
   *  granting root for a delegated/operator vessel). */
  readonly signerDid: string;
  /** This vessel's signed device-delegation edge (root→vessel) — the public, Beelay-free Gate B. */
  readonly deviceEdge: DeviceDelegationTiddler;
}

export interface BootAdminKeyhiveResult {
  /** The booted provider — serves as the island VerbDispatcher verifier and the
   *  answerer for host→island verify-proxy queries. */
  readonly keyhive: KeyhiveProvider;
  /** The operator DID (keyhive whoami) this boot resolved to. */
  readonly did: string;
}

/**
 * Boot keyhive from the operator seed, re-hydrate cap state from the admin doc,
 * clear the three sovereignty gates, and register the operator's writable bags.
 *
 * Throws (HALT) on any gate failure — the admin island must post `fault` so the
 * vessel never declares itself live with a diverged or unauthorized identity.
 */
export async function bootAdminKeyhive(input: BootAdminKeyhiveInput): Promise<BootAdminKeyhiveResult> {
  const keyhive = new KeyhiveProvider();
  await keyhive.init({ seed: input.seed, eventStore: input.eventStore });

  // Re-ingest cap events the founding ceremony (or a prior boot) persisted to
  // the admin doc — reconstructs the PersonGroup / MeshCabal sentinels + edges.
  await keyhive.hydrateFromEventStore();

  const did = await keyhive.whoami();

  // Gate A — keyhive identity MUST match the operator's persisted verifying key.
  if (!did.endsWith(input.operatorVerifyingKey)) {
    throw new Error(
      `[admin-keyhive] Gate A: identity drift — whoami=${did.slice(0, 18)}… ` +
      `does not match verifyingKey=${input.operatorVerifyingKey.slice(0, 16)}…`,
    );
  }

  // Gate B — the vessel's binding edge, verified against the PINNED signer (self for an anon,
  // a granting root for a delegated/operator vessel). The edge IS Gate B: a self-contained signed
  // (vessel × hearthTrueName) proof that rides public CRDT state — no Beelay, no encrypted-graph
  // walk. Fail-closed: verify returns {ok:false} on bad signature / expiry / unpinned signer, HALT.
  const gateB = await verifyDeviceDelegation(input.deviceEdge, input.signerDid, { now: Date.now() });
  if (!gateB.ok) {
    throw new Error(`[admin-keyhive] Gate B: device-delegation edge failed verification against the pinned signer. ${gateB.reason ?? ""}`);
  }
  // Bind-check: the edge MUST delegate to THIS vessel's key (designation carries authority —
  // a valid edge for a DIFFERENT vessel is not authority for this one).
  if (input.deviceEdge.deviceVerifyingKey !== input.operatorVerifyingKey) {
    throw new Error(
      `[admin-keyhive] Gate B: edge delegates to ${input.deviceEdge.deviceVerifyingKey.slice(0, 16)}…, ` +
      `not this vessel ${input.operatorVerifyingKey.slice(0, 16)}…`,
    );
  }

  // Gate C — the operator's PersonGroup belongs to the Nexus MeshCabal.
  const gateC = await keyhive.verifySentinelMembership(input.personGroupAgentIdHex, input.meshCabalDocIdHex);
  if (!gateC.ok) {
    throw new Error(`[admin-keyhive] Gate C: PersonGroup lacks MeshCabal membership. ${gateC.reason ?? ""}`);
  }

  // Register the operator's writable bags so cap checks resolve against lar: URIs.
  for (const bagUrl of input.registerBags) {
    await keyhive.registerBag(bagUrl);
  }

  return { keyhive, did };
}
