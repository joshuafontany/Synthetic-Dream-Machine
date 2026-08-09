/**
 * ceremony-core — isomorphic DreamNet founding and vessel-admission ceremonies.
 *
 * This module contains zero vessel-specific code. It runs identically in:
 *   - Node vessel (lararium-node wraps it with NodeFS + disk keypair)
 *   - Browser vessel (lararium-browser wraps it with IndexedDB + WebCrypto keypair)
 *   - Mobile vessel (any future vessel with its own storage adapter)
 *
 * The four vessel-specific shores the caller provides:
 *   repo         — Automerge Repo backed by any StorageAdapter
 *   vesselSeed — the PLACE's own 32-byte Ed25519 seed, from any secure store
 *   (founding ceremony also needs verifyingKey + displayName for identity tiddler)
 *
 * The result types carry all minted data; the caller decides where to persist
 * the bootstrap artifact (disk, IndexedDB, stdout, etc.).
 *
 * Identity lattice produced by runFoundingCeremony:
 *   Vessel Individual (from seed)
 *     └─▶ PersonaGroup sentinel Document (Gate B at boot)
 *              └─▶ MeshCabal sentinel Document (Gate C at boot)
 *
 * At t=0, founding operator's PersonaGroup is the only MeshCabal member.
 * invite-send adds co-operators. The MeshCabal grows; this path never re-runs.
 *
 * The TRUE NAME MODEL the ceremony enacts — two DISTINCT keys, one signed edge:
 *   · `vesselSeed` carries the PLACE's own key — minted per-install,
 *     never copied to another vessel. It mints the Vessel Individual and inits Keyhive.
 *   · `binding` carries the PERSONA ROOT's authority — the HUMAN's side. A SELF-STOOD binding holds
 *     that root's seed, which ONLY signs and never inits Keyhive; a CONTRACTED binding holds no seed
 *     at all, carrying instead an edge some other operator already signed.
 *   · `buildDeviceDelegation` binds them without merging them: the persona root signs
 *     "Operator O delegates to Device D AT PLACE P", where `hearthTrueName` names P — the
 *     hearth's True Name. Peers pin the root and verify that edge offline.
 * `runDeviceAdmitEdge` carries the same shape outward: the founder's root signs a joinee's
 * OWN vessel key into the PersonaGroup, so no seed ever crosses the wire. A single key
 * copied across vessels would present one collector to every verifier and link every self —
 * the split is what the veil rests on. See lar:///ha.ka.ba/lares/docs/lares/federation.
 *
 * Meme: lar:///ha.ka.ba/lararium/keyhive/ceremony-core
 */

import type { Repo } from "@lararium/mesh";
import {
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, DAEMON_BAG_ID,
  PERSONA_GROUP_SENTINEL_URI, MESH_CABAL_SENTINEL_URI,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  SIGNER_DID_TIDDLER, HEARTH_TRUE_NAME_TIDDLER, DEVICE_DELEGATION_SELF_TIDDLER, PERSONA_KEL_PREFIX_TIDDLER,
  CAP_EVENT_TAG,
  seedIdentitiesDoc, seedCirclesDoc, seedSessionsDoc, seedDaemonDoc, seedPersonaDoc, personaBagIdFor,
  buildDeviceDelegation, type DeviceDelegationTiddler,
  mintPersonaInception, personaKelBoardDocUrl, writePersonaKelEvent, materializeSharedLarDoc,
  type PersonaKelEvent,
} from "@lararium/mesh";

// A device-delegation edge's expiry is a generous replay BACKSTOP only — the
// epoch-lease is the live authority (device-delegation.ts). 100 years keeps the
// founding edge well clear of the wall while the lease does the real work.
const EDGE_BACKSTOP_MS = 100 * 365 * 24 * 60 * 60 * 1000;

import { bytesToBase64, base64ToBytes } from "./bytes-base64.js";
import { buildCeremonyTiddlers } from "@lararium/mesh";
import { KeyhiveProvider } from "./keyhive-provider.js";
import { InMemoryEventStore } from "./event-store.js";
import { capEventTitle } from "./daemon-event-store.js";
import type { DeviceAdmitPayload } from "./index.js";

// ---------------------------------------------------------------------------
// Founding ceremony
// ---------------------------------------------------------------------------

/**
 * How a founding binds its device to its hearth — the two modes, made explicit rather than inferred.
 *
 * SELF-STOOD carries a seed that SIGNS: the vessel builds its own device-delegation and seats a fresh
 * persona-KEL inception. It never inits Keyhive with that seed (the per-vessel key stays the Individual).
 *
 * CONTRACTED carries no seed at all. A trusted operator, already contracted with the kahu, signed the edge
 * on THEIR vessel; this one carries the edge, the pinned identifier prefix, and the operator's KEL chain.
 * The chain rides ALONG because the Binding Gate walks it from the LOCAL replica — a vessel that founded
 * without it would boot fail-closed with no head to reach, waiting on a federation it cannot yet perform.
 * Carried, never fetched: a crossroads that holds no human key also holds no way to go ask for one.
 */
export type FoundingBinding =
  | {
      readonly mode:       "self-stood";
      /** The 32-byte seed that SIGNS the edge — a persona root, or the vessel's own for an anon. */
      readonly signerSeed: Uint8Array;
    }
  | {
      readonly mode:             "contracted";
      /** The edge the contracting operator signed elsewhere — this vessel holds it, never the seed behind it. */
      readonly edge:             DeviceDelegationTiddler;
      /** The identifier PREFIX the Binding Gate pins — the contracting operator's, not this vessel's. */
      readonly personaKelPrefix: string;
      /** That operator's KEL, carried so the first boot walks prefix→head off its own replica. */
      readonly personaKelChain:  readonly PersonaKelEvent[];
    };

export interface FoundingCeremonyInput {
  repo:                Repo;
  /** The PER-VESSEL device signing seed — inits Keyhive (this vessel IS the Individual). */
  vesselSeed:        Uint8Array;
  /** Hex-encoded 32-byte Ed25519 verifying key of the per-vessel device — the delegate. */
  vesselVerifyingKey: string;
  /** Display name for the device identity tiddler. */
  vesselDisplayName:  string;
  /** HOW this founding binds its device — the two modes `vessel-standing` names. REQUIRED: every
   *  founding binds, and the mode says whether this vessel signs its own binding or carries one. */
  binding: FoundingBinding;
  /** The hearth true-name (engine content-CID) this vessel binds TO — the place in (vessel × hearthTrueName).
   *  REQUIRED: a founding with no place to bind to is no founding. */
  hearthTrueName:      string;
  /** The Nexus pubkey (this node's own gate key) the per-Nexus persona-KEL board derives from. The founding
   *  seats the KEL INCEPTION onto that board so the very first boot walks the identifier→head mapping locally.
   *  REQUIRED: a founding that seats no inception leaves the Binding Gate with no head to walk (it fails closed). */
  nexusPubkey:         string;
}

export interface FoundingCeremonyResult {
  /** Automerge URL strings — vessel-agnostic, serializable into the bootstrap artifact. */
  identitiesUrl:         string;
  circlesUrl:            string;
  sessionsUrl:           string;
  daemonUrl:              string;
  /** The mounted PersonaGroup plane's doc URL — founded alongside @daemon. */
  personaUrl:             string;
  /** That plane's BAG ID, derived from the PersonaGroup's own doc id. One name, everywhere it is reached. */
  personaBagId:           string;
  personaGroupDocIdHex:   string;
  personaGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
  /** The operator's self-certifying ContactCard JSON, minted once during the
   *  ceremony. The caller caches it for the light leaf-identity path (OP-AP5). */
  contactCardJson:       string;
  /** The PINNED signer DID ("0x"+hex) — provenance (the founding op-key = the KEL inception op-key). The
   *  Binding Gate pins `personaKelPrefix` instead and walks the KEL to the current head (no raw-pin hybrid). */
  signerDid:       string;
  /** The persona-KEL identifier PREFIX (AID) the Binding Gate PINS — stable across every op-key rotation.
   *  Its inception seats the founding op-key; a later Reading-B rotation advances the head beneath it. */
  personaKelPrefix:      string;
  /** This vessel's OWN signed device-delegation edge (signer→vessel) — the public binding
   *  (vessel × hearthTrueName). */
  founderEdge:           DeviceDelegationTiddler;
}

/**
 * Seed social docs, run the Keyhive founding ceremony, flush cap events to
 * the daemon doc, and write oracle tiddlers. Returns handles and sentinel IDs.
 *
 * The caller is responsible for repo.flush() and persisting the bootstrap
 * artifact (the mapping of lar URIs → Automerge URLs + sentinel IDs).
 */
export async function runFoundingCeremony(
  input: FoundingCeremonyInput,
): Promise<FoundingCeremonyResult> {
  const { repo, vesselSeed, vesselVerifyingKey, vesselDisplayName } = input;

  const identitiesHandle = seedIdentitiesDoc(repo);
  const circlesHandle    = seedCirclesDoc(repo);
  const sessionsHandle   = seedSessionsDoc(repo);
  const daemonHandle      = seedDaemonDoc(repo);

  // Write operator identity + circles tiddlers
  const ceremonyTiddlers = buildCeremonyTiddlers(vesselVerifyingKey, vesselDisplayName);
  for (const t of ceremonyTiddlers) {
    if (t.bag === IDENTITIES_DOC_URI) {
      identitiesHandle.change((doc) => {
        if (!doc.tiddlers[t.title]) {
          doc.tiddlers[t.title] = { tiddler: { title: t.title, ...t.fields }, meta: { authority: t.authority } };
        }
      });
    } else {
      circlesHandle.change((doc) => {
        if (!doc.tiddlers[t.title]) {
          doc.tiddlers[t.title] = { tiddler: { title: t.title, ...t.fields }, meta: { authority: t.authority } };
        }
      });
    }
  }

  // ── Keyhive founding ceremony ──────────────────────────────────────────────
  const keyhive = new KeyhiveProvider();
  const store   = new InMemoryEventStore();
  await keyhive.init({ seed: vesselSeed, eventStore: store });

  const vesselIdentifierHex = await keyhive.vesselIdentifierHex();

  const personaGroup = await keyhive.createSentinelDoc(PERSONA_GROUP_SENTINEL_URI);
  await keyhive.addSentinelMember(vesselIdentifierHex, personaGroup.docIdHex);

  // The PersonaGroup's private plane, seeded only NOW — its bag name derives from the group's own doc id,
  // so the group must exist before its plane can stand under its true name. A plane seeded under one name
  // and renamed later would leave behind a document the capability layer still seeds from the old string.
  const personaBagId  = personaBagIdFor(personaGroup.docIdHex);
  const personaHandle = seedPersonaDoc(repo, personaBagId);

  const meshCabal = await keyhive.createSentinelDoc(MESH_CABAL_SENTINEL_URI);
  await keyhive.addSentinelMember(personaGroup.agentIdHex, meshCabal.docIdHex);

  // Flush Keyhive events to daemon doc in DaemonEventStore-compatible format.
  const initEvents = await store.list();
  for (const evt of initEvents) {
    const hashBuf = await crypto.subtle.digest("SHA-256", evt.bytes.slice());
    const hash    = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const title   = capEventTitle(hash);
    daemonHandle.change((doc) => {
      if (!doc.tiddlers[title]) {
        doc.tiddlers[title] = {
          tiddler: {
            title,
            text:        bytesToBase64(evt.bytes),
            tags:        CAP_EVENT_TAG,
            variant:     evt.variant,
            hash,
            "bytes-len": String(evt.bytes.length),
          },
          meta: { authority: "lares-init" },
        };
      }
    });
  }

  // Write sentinel oracle tiddlers so boot gates can reconstruct DocumentIds.
  daemonHandle.change((doc) => {
    doc.tiddlers[PERSONA_GROUP_DOC_ID_TIDDLER] = {
      tiddler: { title: PERSONA_GROUP_DOC_ID_TIDDLER, text: personaGroup.docIdHex, kind: "sentinel-id" },
      meta: { authority: "lares-init" },
    };
    doc.tiddlers[PERSONA_GROUP_AGENT_ID_TIDDLER] = {
      tiddler: { title: PERSONA_GROUP_AGENT_ID_TIDDLER, text: personaGroup.agentIdHex, kind: "sentinel-id" },
      meta: { authority: "lares-init" },
    };
    doc.tiddlers[MESH_CABAL_DOC_ID_TIDDLER] = {
      tiddler: { title: MESH_CABAL_DOC_ID_TIDDLER, text: meshCabal.docIdHex, kind: "sentinel-id" },
      meta: { authority: "lares-init" },
    };
  });

  // ── The binding edge: (vessel × hearthTrueName), SIGNED here or CARRIED in ──
  // A held seed only ever SIGNS — it never inits Keyhive (the per-vessel key stays the Individual).
  // Self-signed when that seed IS the vessel's own (an anon: signerDid == deviceDid); root-signed when
  // a granting root delegates (known-user / operator); and CARRIED when the vessel holds no root to
  // sign with at all. The cap-TIER stays a DERIVED read over the edge's lease-freshness — the
  // boundEpoch below is the decay hook — never a stamped field, whichever way the edge arrived.
  const founderEdge = input.binding.mode === "self-stood"
    ? await buildDeviceDelegation({
        personaRootSeed:    input.binding.signerSeed,  // the root SIGNS
        deviceVerifyingKey: vesselVerifyingKey,      // the per-vessel device is the delegate
        hearthTrueName:     input.hearthTrueName,      // the place this binds TO
        issuedAt:           new Date().toISOString(),
        expiresAt:          new Date(Date.now() + EDGE_BACKSTOP_MS).toISOString(),
        boundEpoch:         0,                         // genesis lease epoch (effectiveLeaseEpoch starts at 0)
      })
    // CONTRACTED — the edge arrived signed. This vessel binds under a root it does not hold, so it
    // verifies what it carries rather than trusting the hand that carried it: the edge MUST name THIS
    // device, and MUST bind the hearth this founding stands at. A bundle for another vessel or another
    // hearth REFUSES here, where a founding can still be abandoned cleanly.
    : (() => {
        const e = input.binding.edge;
        if (e.deviceVerifyingKey.toLowerCase() !== vesselVerifyingKey.toLowerCase()) {
          throw new Error(
            "[founding] contracted edge names a different device — it delegates to " +
            `${e.deviceVerifyingKey.slice(0, 16)}…, this vessel holds ${vesselVerifyingKey.slice(0, 16)}….`,
          );
        }
        if (e.hearthTrueName !== input.hearthTrueName) {
          throw new Error("[founding] contracted edge binds a different hearth true-name — refusing to found under it.");
        }
        return e;
      })();
  const signerDid = founderEdge.personaRootDid;

  // ── The persona-KEL INCEPTION — the continuity anchor (identity-classes#the-continuity-anchor) ──
  // Seat seq-0 over the founding op-key (== signerDid, the edge's personaRootDid). The identifier PREFIX derives
  // from (founding op-key + the recovery-set pre-commit); it stays FIXED across every future Reading-B rotation,
  // so the Binding Gate pins the PREFIX and the op-key rotates beneath it. Recovery arms UNARMED here (empty
  // pre-commit): the live founding gathers no guardians, so no rotation can attest yet — arming rides the
  // separate recovery-keel wiring (provisionThresholdRecoveryAtFounding). The pin-move stands regardless: an
  // unarmed inception still walks to a head, and at inception the head IS signerDid (zero behavior change today).
  // SELF-STOOD mints its own inception. CONTRACTED mints NONE — the contracting operator's identifier
  // already stands, and minting a second one here would fork the very continuity the pin exists to hold.
  const seatedEvents: readonly PersonaKelEvent[] = input.binding.mode === "self-stood"
    ? [mintPersonaInception(signerDid, "")]
    : input.binding.personaKelChain;
  const personaKelPrefix = input.binding.mode === "self-stood"
    ? seatedEvents[0]!.prefix
    : input.binding.personaKelPrefix;
  if (seatedEvents.length === 0 || seatedEvents.some((e) => e.prefix !== personaKelPrefix)) {
    throw new Error("[founding] the carried KEL is empty or names a prefix other than the pinned one — refusing to found on a chain the Binding Gate could not walk.");
  }
  // Seat the inception onto the per-Nexus KEL board (deterministic id) so the very first boot walks the
  // identifier→head mapping from its OWN local replica — no advertisement, no mint-race (materialize converges
  // on byte-identical blank bytes). The board federates once (DeterministicFederationGate).
  const kelBoard = await materializeSharedLarDoc(repo, personaKelBoardDocUrl(input.nexusPubkey), "@persona-kel");
  kelBoard.change((draft) => { for (const e of seatedEvents) writePersonaKelEvent(draft, e); });

  daemonHandle.change((doc) => {
    doc.tiddlers[SIGNER_DID_TIDDLER] = {
      tiddler: { title: SIGNER_DID_TIDDLER, text: signerDid, kind: "operator-root-did" },
      meta: { authority: "lares-init" },
    };
    // The PINNED identifier — the pin's root of trust (the operator's own sovereign @daemon home). The boot
    // path reads THIS prefix, threads it beside the local KEL chain, and the worker asserts chain[0].prefix === it.
    doc.tiddlers[PERSONA_KEL_PREFIX_TIDDLER] = {
      tiddler: { title: PERSONA_KEL_PREFIX_TIDDLER, text: personaKelPrefix, kind: "persona-kel-prefix" },
      meta: { authority: "lares-init" },
    };
    doc.tiddlers[HEARTH_TRUE_NAME_TIDDLER] = {
      tiddler: { title: HEARTH_TRUE_NAME_TIDDLER, text: input.hearthTrueName, kind: "hearth-true-name" },
      meta: { authority: "lares-init" },
    };
    doc.tiddlers[DEVICE_DELEGATION_SELF_TIDDLER] = {
      tiddler: { title: DEVICE_DELEGATION_SELF_TIDDLER, ...founderEdge },
      meta: { authority: "lares-init" },
    };
  });

  // Mint the operator's self-certifying ContactCard ONCE, before the ceremony
  // keyhive disposes. The card carries no expiry/nonce, so a short-lived LEAF
  // actor (CLI run / agent turn) re-presents this cached JSON forever without
  // booting keyhive — the light-identity path (operator-peer #actor-parity
  // OP-AP5). The caller persists it beside the operator key (0o600).
  const contactCardJson = new TextDecoder().decode(await keyhive.contactCard());

  await keyhive.dispose();

  return {
    identitiesUrl:         identitiesHandle.url as string,
    circlesUrl:            circlesHandle.url    as string,
    sessionsUrl:           sessionsHandle.url   as string,
    daemonUrl:              daemonHandle.url      as string,
    personaUrl:            personaHandle.url    as string,
    personaBagId,
    personaGroupDocIdHex:   personaGroup.docIdHex,
    personaGroupAgentIdHex: personaGroup.agentIdHex,
    meshCabalDocIdHex:     meshCabal.docIdHex,
    contactCardJson,
    signerDid,
    personaKelPrefix,
    founderEdge,
  };
}

// ---------------------------------------------------------------------------
// Device-admit payload production
// ---------------------------------------------------------------------------

export interface DeviceAdmitEdgeInput {
  /** The founder's PersonaGroup ROOT 32-byte seed — SIGNS the joinee's edge (never inits Keyhive). */
  signerSeed:             Uint8Array;
  /** The joinee's raw Ed25519 verifying-key hex (64, lowercase) — the delegate (its PUBLIC key). */
  joineeVerifyingKey:     string;
  /** The founder's persona-KEL identifier PREFIX (AID) the joinee PINS — REQUIRED (the joinee's Binding Gate
   *  walks the KEL to the head; a founding always seats an inception, so a prefix always stands). */
  personaKelPrefix:       string;
  /** The founder's persona-KEL chain SNAPSHOT — the joinee seeds its LOCAL board from it (immediate boot, no
   *  sync wait). Optional: absent → the joinee relies on the federated board (fail-closed until sync). */
  personaKelChain?:       readonly PersonaKelEvent[];
  /** The hearth true-name (engine CID) the joinee binds TO. */
  hearthTrueName:         string;
  /** Founder sentinel oracle IDs — carried through for the founding sentinel + future affiliation layer. */
  personaGroupDocIdHex:   string;
  personaGroupAgentIdHex: string;
  meshCabalDocIdHex:      string;
  syncUrl:                string | null;
  /** Automerge URL of the issuing vessel's genesis island — for peer-sync delivery. */
  islandDocUrl?:          string | null;
  /** The founder's @persona doc URL — the joinee receives it to SYNC the shared veiled identity
   *  (the membership-sync foundation). Mirrors islandDocUrl: a founder doc the joinee syncs. */
  personaUrl?:            string | null;
}

/**
 * Produce a device-admit/v1 payload for the UPGRADE event: the founder's PersonaGroup root SIGNS
 * a root→joinee device-delegation edge (joinee vessel key × hearthTrueName). The joinee verifies
 * that edge at its Binding Gate against the pinned signer — no Keyhive cap events, no Beelay. No
 * secret crosses the wire: in = the joinee's PUBLIC verifying key; out = the public signed edge +
 * the pinned signer DID. Fail-closed: a malformed joinee key throws BEFORE signing.
 */
export async function runDeviceAdmitEdge(
  input: DeviceAdmitEdgeInput,
): Promise<DeviceAdmitPayload> {
  if (!/^[0-9a-f]{64}$/.test(input.joineeVerifyingKey)) {
    throw new Error("[ceremony] runDeviceAdmitEdge: joineeVerifyingKey must be 64-char lowercase hex");
  }
  // Fail-closed: the joinee's Binding Gate PINS this prefix — a payload with no pin would admit a vessel that
  // then boots with nothing to walk. A founding always seats an inception, so a prefix is always available.
  if (typeof input.personaKelPrefix !== "string" || input.personaKelPrefix.length === 0) {
    throw new Error("[ceremony] runDeviceAdmitEdge: personaKelPrefix required — the joinee pins the founder's persona-KEL identifier");
  }
  const issuedAt  = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EDGE_BACKSTOP_MS).toISOString();
  const deviceEdge = await buildDeviceDelegation({
    personaRootSeed:    input.signerSeed,          // the founder's PersonaGroup root SIGNS
    deviceVerifyingKey: input.joineeVerifyingKey,  // the joinee's vessel key is the delegate
    hearthTrueName:     input.hearthTrueName,
    issuedAt,
    expiresAt,
    boundEpoch:         0,
  });
  return {
    kind:                   "device-admit/v1",
    signerDid:              deviceEdge.personaRootDid,
    personaKelPrefix:       input.personaKelPrefix,
    ...(input.personaKelChain ? { personaKelChain: input.personaKelChain } : {}),
    deviceEdge,
    hearthTrueName:         input.hearthTrueName,
    personaGroupDocIdHex:   input.personaGroupDocIdHex,
    personaGroupAgentIdHex: input.personaGroupAgentIdHex,
    meshCabalDocIdHex:      input.meshCabalDocIdHex,
    syncUrl:                input.syncUrl,
    ...(input.islandDocUrl != null ? { islandDocUrl: input.islandDocUrl } : {}),
    ...(input.personaUrl   != null ? { personaUrl:   input.personaUrl }   : {}),
  };
}

// ---------------------------------------------------------------------------
// Apply admit payload (vessel-admission path)
// ---------------------------------------------------------------------------

export interface ApplyAdmitInput {
  repo:                 Repo;
  /** The joinee's OWN 32-byte seed. An admitted vessel still needs its own self-certifying ContactCard —
   *  the founding path mints one and the admit path did not, so an admitted vessel came up with no card
   *  and could never present itself at a gate. The card is the vessel's OWN identity, never the founder's;
   *  the admit supplies the BINDING, and the vessel supplies the SELF. */
  vesselSeed:         Uint8Array;
  vesselVerifyingKey: string;
  vesselDisplayName:  string;
  payload:              DeviceAdmitPayload;
  /** The joinee's own Nexus pubkey (its gate key) — the per-Nexus KEL board the joinee seeds the founder's
   *  inception snapshot onto, so its LOCAL boot walks to a head with no sync wait (no-global-now). */
  nexusPubkey:          string;
}

export interface ApplyAdmitResult {
  /** The joinee's own self-certifying ContactCard JSON — the leaf identity it presents at the V3 gate. */
  contactCardJson: string;
  identitiesUrl: string;
  circlesUrl:    string;
  sessionsUrl:   string;
  daemonUrl:      string;
  /** The PersonaGroup plane's doc URL the joinee resolves — the founder's shared doc
   *  (membership-sync) when the payload carries it, else a fresh local seed. */
  personaUrl:     string;
  /** That plane's bag id, derived from the SAME group doc id the founder used. Both devices name one
   *  plane identically or they sync nothing — the derivation is what makes that hold without a roster. */
  personaBagId:   string;
}

/**
 * Apply a device-admit/v1 payload to bootstrap a second vessel.
 * Seeds social docs identically to the founding path, then writes oracle
 * tiddlers and cap events from the payload so boot Gates B and C pass.
 */
export async function runApplyAdmitPayload(
  input: ApplyAdmitInput,
): Promise<ApplyAdmitResult> {
  const { repo, vesselSeed, vesselVerifyingKey, vesselDisplayName, payload } = input;

  // Fail-closed: the binding is the joinee's whole authority — a missing field MUST halt,
  // never write a half-bound daemon doc (the confused-deputy / mycelium-PCD hole). The persona-KEL PREFIX
  // is part of that authority now: the joinee's Binding Gate pins it, so a payload with no pin would admit a
  // vessel that boots with nothing to walk (a fail-closed halt) — refuse it here, precisely, instead.
  if (!payload.signerDid || !payload.deviceEdge || !payload.hearthTrueName || !payload.personaKelPrefix) {
    throw new Error("[ceremony] runApplyAdmitPayload: payload lacks signerDid/deviceEdge/hearthTrueName/personaKelPrefix — refusing to admit.");
  }

  const identitiesHandle = seedIdentitiesDoc(repo);
  const circlesHandle    = seedCirclesDoc(repo);
  const sessionsHandle   = seedSessionsDoc(repo);
  const daemonHandle      = seedDaemonDoc(repo);
  // @persona: the joinee RECEIVES the founder's shared veiled-identity doc to SYNC it
  // (the membership-sync foundation). Older payloads without it fall back to a fresh local seed.
  // An admitted vessel joins a PersonaGroup that already stands, so its plane's name derives from the
  // SAME group doc id the founder used — the two devices name one plane identically or they sync nothing.
  const personaBagId = personaBagIdFor(payload.personaGroupDocIdHex);
  const personaUrl = payload.personaUrl ?? (seedPersonaDoc(repo, personaBagId).url as string);

  const ceremonyTiddlers = buildCeremonyTiddlers(vesselVerifyingKey, vesselDisplayName);
  for (const t of ceremonyTiddlers) {
    if (t.bag === IDENTITIES_DOC_URI) {
      identitiesHandle.change((doc) => {
        if (!doc.tiddlers[t.title]) {
          doc.tiddlers[t.title] = { tiddler: { title: t.title, ...t.fields }, meta: { authority: t.authority } };
        }
      });
    } else {
      circlesHandle.change((doc) => {
        if (!doc.tiddlers[t.title]) {
          doc.tiddlers[t.title] = { tiddler: { title: t.title, ...t.fields }, meta: { authority: t.authority } };
        }
      });
    }
  }

  // Write the joinee's BINDING into its own daemon doc — the pinned signer, the hearth true-name,
  // and the root→joinee edge (mirrors the founding write). The joinee boots through its Binding
  // Gate on these alone: verifyDeviceDelegation(edge, signerDid) — no cap events, no Beelay.
  daemonHandle.change((doc) => {
    doc.tiddlers[SIGNER_DID_TIDDLER] = {
      tiddler: { title: SIGNER_DID_TIDDLER, text: payload.signerDid, kind: "operator-root-did" },
      meta: { authority: "lares-init-admit" },
    };
    doc.tiddlers[HEARTH_TRUE_NAME_TIDDLER] = {
      tiddler: { title: HEARTH_TRUE_NAME_TIDDLER, text: payload.hearthTrueName, kind: "hearth-true-name" },
      meta: { authority: "lares-init-admit" },
    };
    doc.tiddlers[DEVICE_DELEGATION_SELF_TIDDLER] = {
      tiddler: { title: DEVICE_DELEGATION_SELF_TIDDLER, ...payload.deviceEdge },
      meta: { authority: "lares-init-admit" },
    };
    // The PINNED identifier — the joinee's Binding Gate walks THIS to the current head op-key (the founder's
    // persona-root, until a Reading-B rotation). The raw signer-DID above stays for provenance only.
    doc.tiddlers[PERSONA_KEL_PREFIX_TIDDLER] = {
      tiddler: { title: PERSONA_KEL_PREFIX_TIDDLER, text: payload.personaKelPrefix, kind: "persona-kel-prefix" },
      meta: { authority: "lares-init-admit" },
    };
  });

  // Seed the joinee's LOCAL KEL board from the founder's chain snapshot (when the payload carried it), so the
  // joinee's very first boot walks the identifier→head mapping from its OWN replica — no wait on a federated
  // sync of the founder's board (no-global-now: a local seed, never a global lookup). Absent snapshot → the
  // joinee relies on the federated board and boots only once it has synced the founder's inception (fail-closed).
  if (payload.personaKelChain && payload.personaKelChain.length > 0) {
    const kelBoard = await materializeSharedLarDoc(repo, personaKelBoardDocUrl(input.nexusPubkey), "@persona-kel");
    kelBoard.change((draft) => {
      for (const event of payload.personaKelChain!) writePersonaKelEvent(draft, event);
    });
  }

  // Write sentinel oracle tiddlers.
  daemonHandle.change((doc) => {
    doc.tiddlers[PERSONA_GROUP_DOC_ID_TIDDLER] = {
      tiddler: { title: PERSONA_GROUP_DOC_ID_TIDDLER, text: payload.personaGroupDocIdHex, kind: "sentinel-id" },
      meta: { authority: "lares-init-admit" },
    };
    doc.tiddlers[PERSONA_GROUP_AGENT_ID_TIDDLER] = {
      tiddler: { title: PERSONA_GROUP_AGENT_ID_TIDDLER, text: payload.personaGroupAgentIdHex, kind: "sentinel-id" },
      meta: { authority: "lares-init-admit" },
    };
    doc.tiddlers[MESH_CABAL_DOC_ID_TIDDLER] = {
      tiddler: { title: MESH_CABAL_DOC_ID_TIDDLER, text: payload.meshCabalDocIdHex, kind: "sentinel-id" },
      meta: { authority: "lares-init-admit" },
    };
  });

  // Keyhive membership cap-events (packPersonaCrossing), when the founder packed them: write each into this
  // vessel's @daemon in DaemonEventStore format, so boot's hydrateFromEventStore ingests them into the live
  // keyhive — admitting this vessel into the PersonaGroup so it can decrypt shared @catalog content. Absent
  // → the vessel joins by the Ed25519 edge alone. The `variant` field only needs to be PRESENT for the store
  // to read the record back; the crypto rides the bytes.
  for (const capEventB64 of payload.capEvents ?? []) {
    const bytes   = base64ToBytes(capEventB64);
    const hashBuf = await crypto.subtle.digest("SHA-256", bytes.slice());
    const hash    = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const title   = capEventTitle(hash);
    daemonHandle.change((doc) => {
      if (!doc.tiddlers[title]) {
        doc.tiddlers[title] = {
          tiddler: { title, text: capEventB64, tags: CAP_EVENT_TAG, variant: "cap-membership", hash, "bytes-len": String(bytes.length) },
          meta: { authority: "lares-init-admit" },
        };
      }
    });
  }

  // THE VESSEL'S OWN CARD. The admit supplies the BINDING (whose group this vessel joins); the vessel
  // supplies the SELF (who it is). A self-certifying ContactCard is the latter, and it is minted from the
  // vessel's OWN seed — never the founder's, who is not present and whose seed never crossed.
  //
  // Without it, an admitted vessel comes up bound and MUTE: the V3 handshake presents card + proof, so a
  // cardless vessel cannot speak at a gate at all. The founding path minted one and this path did not,
  // which is why an admitted vessel could be perfectly bound and still never dial.
  const keyhive = new KeyhiveProvider();
  await keyhive.init({ seed: vesselSeed, eventStore: new InMemoryEventStore() });
  const contactCardJson = new TextDecoder().decode(await keyhive.contactCard());
  await keyhive.dispose();

  return {
    contactCardJson,
    identitiesUrl: identitiesHandle.url as string,
    circlesUrl:    circlesHandle.url    as string,
    sessionsUrl:   sessionsHandle.url   as string,
    daemonUrl:      daemonHandle.url      as string,
    personaUrl,
    personaBagId,
  };
}
