/**
 * boot-daemon-keyhive — the isomorphic keyhive boot+gate sequence for the daemon
 * island. ONE function, called identically on every platform's daemon worker.
 *
 * Stage 1 of the isomorphic-vessel epic moves authn/z off the host and into the
 * daemon island. This function is the heart of that move, extracted PURE (no
 * worker, no platform API) so it unit-tests in-process. The daemon island's
 * `onEa` calls it with the seed (delivered via the manifest) and the daemon
 * CompositeStore (the cap-event EventStore backing); the host no longer boots
 * keyhive at all (keyhive cannot double-boot — `generateDocument` mints a fresh
 * CSPRNG doc-id each call, so two instances diverge).
 *
 * Founding never happens here: a new operator's first boot founds on the host
 * (`runFoundingCeremony` via the platform `loadBootstrap`) BEFORE the daemon
 * worker spawns. This function always receives an already-founded operator and
 * GATES — identical whether the operator is new (just founded this boot) or
 * returning.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lararium/vessel-platform#authn-home
 */

import { KeyhiveProvider } from "./keyhive-provider.js";
import type { CapabilityProviderInitOpts } from "./capability-provider.js";
import { verifyEdgeAgainstPersonaKel, type DeviceDelegationTiddler, type PersonaKelEvent } from "@lararium/mesh";

export interface BootDaemonKeyhiveInput {
  /** 32-byte operator signing seed (delivered to the worker via the manifest). */
  readonly seed: Uint8Array;
  /** Cap-event store — DaemonEventStore over the daemon CompositeStore in-island. */
  readonly eventStore: CapabilityProviderInitOpts["eventStore"];
  /** Hex Ed25519 verifying key the keyhive identity MUST resolve to (Gate A). */
  readonly vesselVerifyingKey: string;
  /** PersonaGroup sentinel Document id hex. ABSENT names a vessel at the WAKING FLOOR — see `face` below. */
  readonly personaGroupDocIdHex?: string;
  /** PersonaGroup agent id hex — the affiliation layer's membership subject. */
  readonly personaGroupAgentIdHex?: string;
  /** MeshCabal sentinel Document id hex — the affiliation layer's membership target, face-side. */
  readonly meshCabalDocIdHex?: string;
  /** Writable bag URIs to register so `verify`/`delegate` resolve (lar: URIs). */
  readonly registerBags: readonly string[];
  /** The PINNED signer DID — provenance ONLY (the founding op-key = the KEL inception op-key). The Binding
   *  Gate NO LONGER pins this; it pins `personaKel.prefix` and walks the KEL to the current head (no hybrid —
   *  accepting both a raw op-key pin AND the prefix would open a downgrade). */
  readonly signerDid?: string;
  /** The persona-KEL PIN + the LOCAL-replica chain the gate walks (identity-classes#the-continuity-anchor).
   *  `prefix` is the stable identifier (AID) read from @daemon (the pin's root of trust); `chain` is the
   *  seq-sorted key-event-log the caller read from its per-Nexus KEL board replica "as of last sync". The gate
   *  asserts `chain[0].prefix === prefix`, walks to the current authoritative head op-key (structural + every
   *  rotation quorum verified), and verifies the edge against THAT head — a rotated key still binds a fresh
   *  edge; a superseded key rejects. FAIL-CLOSED: an absent / broken / unreachable-head chain HALTS the boot
   *  (never a global lookup — a not-yet-synced replica simply denies). */
  readonly personaKel?: { readonly prefix: string; readonly chain: readonly PersonaKelEvent[] };
  /** This vessel's signed device-delegation edge (root→vessel) — the public, Beelay-free binding. */
  readonly deviceEdge?: DeviceDelegationTiddler;
  /** OPTIONAL prior-identity Archive (a previous `exportArchive()`), persisted encrypted-at-rest. A joinee
   *  admitted into a PersonaGroup restores from it so its prekeys match the card the founder minted-to —
   *  without it, a fresh boot regenerates prekeys and the shared content reads "Key not found". */
  readonly archiveBytes?: Uint8Array;
}

export interface BootDaemonKeyhiveResult {
  /** The booted provider — serves as the island VerbDispatcher verifier and the
   *  answerer for host→island verify-proxy queries. */
  readonly keyhive: KeyhiveProvider;
  /** The operator DID (keyhive whoami) this boot resolved to. */
  readonly did: string;
}

/**
 * Boot keyhive from the operator seed, re-hydrate cap state from the daemon doc,
 * clear the three sovereignty gates, and register the operator's writable bags.
 *
 * Throws (HALT) on any gate failure — the daemon island must post `fault` so the
 * vessel never declares itself live with a diverged or unauthorized identity.
 */
export async function bootDaemonKeyhive(input: BootDaemonKeyhiveInput): Promise<BootDaemonKeyhiveResult> {
  const keyhive = new KeyhiveProvider();
  await keyhive.init({
    seed: input.seed, eventStore: input.eventStore,
    ...(input.archiveBytes ? { archiveBytes: input.archiveBytes } : {}),
  });

  // Re-ingest cap events the founding ceremony (or a prior boot) persisted to
  // the daemon doc — reconstructs the PersonaGroup / MeshCabal sentinels + edges.
  await keyhive.hydrateFromEventStore();

  const did = await keyhive.whoami();

  // ── DOES A FACE STAND HERE? ────────────────────────────────────────────────────────────────
  // A place founded without a face (`lares vessel found`, no `persona new 0`) carries no persona pins
  // at all, and canon says it still stands: the Herm "boots permissionlessly on its own key… it asks no
  // blessing to exist" (identity-classes#herm-establishment).
  //
  // THE GATE NEVER SOFTENS. It runs in FULL or the vessel carries no persona caps — absence of a face is
  // not a weaker check, it is FEWER CAPS. That is what keeps the confused-deputy / PCD cure intact: you
  // cannot skip the Binding Gate by deleting the edge, because deleting the edge deletes the authority
  // the gate would have granted. A HALF face refuses outright — a vessel holding some pins and not others
  // has a torn founding, and guessing which half to trust is exactly the deputy confusion.
  const facePins = [input.personaGroupDocIdHex, input.signerDid, input.personaKel, input.deviceEdge];
  const facesHeld = facePins.filter((p) => p !== undefined).length;
  if (facesHeld > 0 && facesHeld < facePins.length) {
    throw new Error("[daemon-keyhive] the face this vessel pins reads TORN — some persona pins stand and others do not. Re-found the face (`lares persona new 0`) rather than booting on half of one.");
  }
  const facelessFloor = facesHeld === 0;

  // Gate A — keyhive identity MUST match the operator's persisted verifying key.
  if (!did.endsWith(input.vesselVerifyingKey)) {
    throw new Error(
      `[daemon-keyhive] Gate A: identity drift — whoami=${did.slice(0, 18)}… ` +
      `does not match verifyingKey=${input.vesselVerifyingKey.slice(0, 16)}…`,
    );
  }

  // THE BINDING GATE — the canon identity path, now on the PERSONA-KEL PIN (the continuity anchor). The
  // vessel's signed device-delegation edge verifies against the CURRENT head op-key the pinned identifier
  // (`personaKel.prefix`) resolves to on the local KEL replica — the op-key rotates BENEATH a fixed prefix
  // (Reading-B recovery), so continuity rides the log, never a frozen key. The edge IS the binding: a
  // self-contained signed (vessel × hearthTrueName) proof over public CRDT state — no Beelay, no
  // encrypted-graph walk. FAIL-CLOSED and HALT on: a chain whose genesis prefix mismatches the pin (a
  // mis-threaded log), an unreachable / broken / below-quorum head, or an edge that does not chain to the head.
  if (!facelessFloor) {
  const { prefix, chain } = input.personaKel!;
  if (chain.length === 0 || chain[0]!.prefix !== prefix) {
    throw new Error(`[daemon-keyhive] Binding Gate: persona-KEL pin/chain mismatch — the local chain does not head the pinned identifier ${prefix.slice(0, 20)}…`);
  }
  const binding = await verifyEdgeAgainstPersonaKel(input.deviceEdge!, chain, { now: Date.now() });
  if (!binding.ok) {
    throw new Error(`[daemon-keyhive] Binding Gate: device-delegation edge failed verification against the persona-KEL head op-key. ${binding.reason ?? ""}`);
  }
  // Bind-check: the edge MUST delegate to THIS vessel's key (designation carries authority —
  // a valid edge for a DIFFERENT vessel is not authority for this one).
  if (input.deviceEdge!.deviceVerifyingKey !== input.vesselVerifyingKey) {
    throw new Error(
      `[daemon-keyhive] Binding Gate: edge delegates to ${input.deviceEdge!.deviceVerifyingKey.slice(0, 16)}…, ` +
      `not this vessel ${input.vesselVerifyingKey.slice(0, 16)}…`,
    );
  }
  }

  // Cabal/Nexus membership (the former "Gate C") has LEFT the boot path — it is AFFILIATION,
  // not identity (see api/pono/identity-vs-affiliation). A PersonaGroup
  // belongs to MANY cabals/nexuses or none (M:N), so membership is a HELD CAPABILITY checked at
  // ACCESS to a cabal's shared canon, local-first — never a single boot gate (a boot gate
  // conflated ID-with-authz, assumed single-membership, and read a global "now"). Boot proves
  // IDENTITY ONLY: Gate A (key self-consistency) + the Binding Gate (the signed delegation edge).
  // `personaGroupAgentIdHex` / `meshCabalDocIdHex` stay on the input for the founding sentinel
  // dance + the affiliation layer; boot itself proves identity only and does not read them.

  // Register the operator's writable bags so cap checks resolve against lar: URIs.
  for (const bagUrl of input.registerBags) {
    await keyhive.registerBag(bagUrl);
  }

  return { keyhive, did };
}
