/**
 * ceremony-core — isomorphic DreamNet founding and vessel-admission ceremonies.
 *
 * This module contains zero vessel-specific code. It runs identically in:
 *   - Node vessel (lararium-node wraps it with NodeFS + disk keypair)
 *   - Browser vessel (lararium-browser wraps it with IndexedDB + WebCrypto keypair)
 *   - Mobile vessel (any future vessel with its own storage adapter)
 *
 * The four vessel-specific seams the caller provides:
 *   repo         — Automerge Repo backed by any StorageAdapter
 *   operatorSeed — 32-byte Ed25519 seed from any secure store
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
 * Identity planes (5-scale): the seed mints the Vessel Individual = Plane 0
 * (device-vessel, the user×vessel bond); the PersonaGroup = Plane 1 (the OPERATOR,
 * a group of vessels). TODAY one seed is SHARED across a user's vessels (Model A —
 * a temporary stopgap, the copy-the-key antipattern); the target mints a DISTINCT
 * per-vessel seed delegated into the PersonaGroup by a signed edge. runDeviceAdmitAccept
 * sketches that path (Model B) but waits on encrypted-content transport (Beelay,
 * Rust-only) — to be stood in temporarily behind a swap surface. See
 * lar:///ha.ka.ba/lares/docs/lares/federation.
 *
 * Meme: lar:///ha.ka.ba/lararium/keyhive/ceremony-core
 */

import type { Repo } from "@lararium/mesh";
import {
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, DAEMON_BAG_ID,
  PERSONA_GROUP_SENTINEL_URI, MESH_CABAL_SENTINEL_URI,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  SIGNER_DID_TIDDLER, HEARTH_TRUE_NAME_TIDDLER, DEVICE_DELEGATION_SELF_TIDDLER,
  CAP_EVENT_TAG,
  seedIdentitiesDoc, seedCirclesDoc, seedSessionsDoc, seedDaemonDoc, seedPersonaDoc,
  buildDeviceDelegation, type DeviceDelegationTiddler,
} from "@lararium/mesh";

// A device-delegation edge's expiry is a generous replay BACKSTOP only — the
// epoch-lease is the live authority (device-delegation.ts). 100 years keeps the
// founding edge well clear of the wall while the lease does the real work.
const EDGE_BACKSTOP_MS = 100 * 365 * 24 * 60 * 60 * 1000;

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
import { buildCeremonyTiddlers } from "@lararium/mesh";
import { KeyhiveProvider } from "./keyhive-provider.js";
import { InMemoryEventStore } from "./event-store.js";
import { capEventTitle } from "./daemon-event-store.js";
import type { DeviceAdmitPayload } from "./index.js";

// ---------------------------------------------------------------------------
// Founding ceremony
// ---------------------------------------------------------------------------

export interface FoundingCeremonyInput {
  repo:                Repo;
  /** The PER-VESSEL device signing seed — inits Keyhive (this vessel IS the Individual). */
  operatorSeed:        Uint8Array;
  /** Hex-encoded 32-byte Ed25519 verifying key of the per-vessel device — the delegate. */
  operatorVerifyingKey: string;
  /** Display name for the device identity tiddler. */
  operatorDisplayName:  string;
  /** The SIGNER 32-byte seed — SIGNS the device-delegation edge. For an anon this IS the vessel's
   *  own seed (self-signed; signerDid == deviceDid); for a delegated/operator vessel it is a granting
   *  root. It NEVER inits Keyhive (the per-vessel key stays the Individual). REQUIRED: every founding binds. */
  signerSeed: Uint8Array;
  /** The hearth true-name (engine content-CID) this vessel binds TO — the place in (vessel × hearthTrueName).
   *  REQUIRED: a founding with no place to bind to is no founding. */
  hearthTrueName:      string;
}

export interface FoundingCeremonyResult {
  /** Automerge URL strings — vessel-agnostic, serializable into the bootstrap artifact. */
  identitiesUrl:         string;
  circlesUrl:            string;
  sessionsUrl:           string;
  daemonUrl:              string;
  /** The @persona (PersonaGroup veiled-identity) doc URL — founded alongside @daemon. */
  personaUrl:             string;
  personaGroupDocIdHex:   string;
  personaGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
  /** The operator's self-certifying ContactCard JSON, minted once during the
   *  ceremony. The caller caches it for the light leaf-identity path (OP-AP5). */
  contactCardJson:       string;
  /** The PINNED signer DID ("0x"+hex) the Binding Gate verifies the edge against — self for an anon,
   *  a granting root for a delegated/operator vessel. */
  signerDid:       string;
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
  const { repo, operatorSeed, operatorVerifyingKey, operatorDisplayName } = input;

  const identitiesHandle = seedIdentitiesDoc(repo);
  const circlesHandle    = seedCirclesDoc(repo);
  const sessionsHandle   = seedSessionsDoc(repo);
  const daemonHandle      = seedDaemonDoc(repo);
  // The @persona bag — the operator's veiled-identity doc, founded alongside @daemon.
  const personaHandle     = seedPersonaDoc(repo);

  // Write operator identity + circles tiddlers
  const ceremonyTiddlers = buildCeremonyTiddlers(operatorVerifyingKey, operatorDisplayName);
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
  await keyhive.init({ seed: operatorSeed, eventStore: store });

  const vesselIdentifierHex = await keyhive.vesselIdentifierHex();

  const personaGroup = await keyhive.createSentinelDoc(PERSONA_GROUP_SENTINEL_URI);
  await keyhive.addSentinelMember(vesselIdentifierHex, personaGroup.docIdHex);

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

  // ── The binding edge (the ONE TRUE PATH): the signer SIGNS (vessel × hearthTrueName) ──
  // The signer seed only signs — it NEVER inits Keyhive (the per-vessel key stays the Individual).
  // Self-signed when signerSeed == the vessel seed (an anon: signerDid == deviceDid); root-signed
  // when a granting root delegates (known-user / operator). The cap-TIER is a DERIVED read over the
  // edge's lease-freshness — the boundEpoch below is the decay hook — never a stamped field.
  const edgeIssuedAt  = new Date().toISOString();
  const edgeExpiresAt = new Date(Date.now() + EDGE_BACKSTOP_MS).toISOString();
  const founderEdge = await buildDeviceDelegation({
    operatorSeed:       input.signerSeed,   // the root SIGNS
    deviceVerifyingKey: operatorVerifyingKey,        // the per-vessel device is the delegate
    hearthTrueName:     input.hearthTrueName,         // the place this binds TO
    issuedAt:           edgeIssuedAt,
    expiresAt:          edgeExpiresAt,
    boundEpoch:         0,                            // genesis lease epoch (effectiveLeaseEpoch starts at 0)
  });
  const signerDid = founderEdge.operatorDid;
  daemonHandle.change((doc) => {
    doc.tiddlers[SIGNER_DID_TIDDLER] = {
      tiddler: { title: SIGNER_DID_TIDDLER, text: signerDid, kind: "operator-root-did" },
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
    personaGroupDocIdHex:   personaGroup.docIdHex,
    personaGroupAgentIdHex: personaGroup.agentIdHex,
    meshCabalDocIdHex:     meshCabal.docIdHex,
    contactCardJson,
    signerDid,
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
  const issuedAt  = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EDGE_BACKSTOP_MS).toISOString();
  const deviceEdge = await buildDeviceDelegation({
    operatorSeed:       input.signerSeed,          // the founder's PersonaGroup root SIGNS
    deviceVerifyingKey: input.joineeVerifyingKey,  // the joinee's vessel key is the delegate
    hearthTrueName:     input.hearthTrueName,
    issuedAt,
    expiresAt,
    boundEpoch:         0,
  });
  return {
    kind:                   "device-admit/v1",
    signerDid:              deviceEdge.operatorDid,
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
  operatorVerifyingKey: string;
  operatorDisplayName:  string;
  payload:              DeviceAdmitPayload;
}

export interface ApplyAdmitResult {
  identitiesUrl: string;
  circlesUrl:    string;
  sessionsUrl:   string;
  daemonUrl:      string;
  /** The @persona doc URL the joinee resolves — the founder's shared doc (membership-sync)
   *  when the payload carries it, else a fresh local seed (older payloads). */
  personaUrl:     string;
}

/**
 * Apply a device-admit/v1 payload to bootstrap a second vessel.
 * Seeds social docs identically to the founding path, then writes oracle
 * tiddlers and cap events from the payload so boot Gates B and C pass.
 */
export async function runApplyAdmitPayload(
  input: ApplyAdmitInput,
): Promise<ApplyAdmitResult> {
  const { repo, operatorVerifyingKey, operatorDisplayName, payload } = input;

  // Fail-closed: the binding is the joinee's whole authority — a missing field MUST halt,
  // never write a half-bound daemon doc (the confused-deputy / mycelium-PCD hole).
  if (!payload.signerDid || !payload.deviceEdge || !payload.hearthTrueName) {
    throw new Error("[ceremony] runApplyAdmitPayload: payload lacks signerDid/deviceEdge/hearthTrueName — refusing to admit.");
  }

  const identitiesHandle = seedIdentitiesDoc(repo);
  const circlesHandle    = seedCirclesDoc(repo);
  const sessionsHandle   = seedSessionsDoc(repo);
  const daemonHandle      = seedDaemonDoc(repo);
  // @persona: the joinee RECEIVES the founder's shared veiled-identity doc to SYNC it
  // (the membership-sync foundation). Older payloads without it fall back to a fresh local seed.
  const personaUrl = payload.personaUrl ?? (seedPersonaDoc(repo).url as string);

  const ceremonyTiddlers = buildCeremonyTiddlers(operatorVerifyingKey, operatorDisplayName);
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
  });

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

  return {
    identitiesUrl: identitiesHandle.url as string,
    circlesUrl:    circlesHandle.url    as string,
    sessionsUrl:   sessionsHandle.url   as string,
    daemonUrl:      daemonHandle.url      as string,
    personaUrl,
  };
}
