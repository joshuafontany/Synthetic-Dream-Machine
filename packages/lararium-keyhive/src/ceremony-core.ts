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
 *     └─▶ PersonGroup sentinel Document (Gate B at boot)
 *              └─▶ MeshCabal sentinel Document (Gate C at boot)
 *
 * At t=0, founding operator's PersonGroup is the only MeshCabal member.
 * invite-send adds co-operators. The MeshCabal grows; this path never re-runs.
 *
 * Identity planes (5-scale): the seed mints the Vessel Individual = Plane 0
 * (device-vessel, the user×vessel bond); the PersonGroup = Plane 1 (the OPERATOR,
 * a group of vessels). TODAY one seed is SHARED across a user's vessels (Model A —
 * a temporary stopgap, the copy-the-key antipattern); the target mints a DISTINCT
 * per-vessel seed delegated into the PersonGroup by a signed edge. runDeviceAdmitAccept
 * sketches that path (Model B) but waits on encrypted-content transport (Beelay,
 * Rust-only) — to be stood in temporarily behind a swap surface. See
 * lar:///ha.ka.ba/@lares/v0.1/docs/lares/federation.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/keyhive/ceremony-core
 */

import type { Repo } from "@lararium/mesh";
import {
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
  PERSON_GROUP_SENTINEL_URI, MESH_CABAL_SENTINEL_URI,
  PERSON_GROUP_DOC_ID_TIDDLER, PERSON_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  SIGNER_DID_TIDDLER, HEARTH_TRUE_NAME_TIDDLER, DEVICE_DELEGATION_SELF_TIDDLER,
  CAP_EVENT_TAG,
  seedIdentitiesDoc, seedCirclesDoc, seedSessionsDoc, seedAdminDoc,
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
import { capEventTitle } from "./admin-event-store.js";
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
  adminUrl:              string;
  personGroupDocIdHex:   string;
  personGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
  /** The operator's self-certifying ContactCard JSON, minted once during the
   *  ceremony. The caller caches it for the light leaf-identity path (OP-AP5). */
  contactCardJson:       string;
  /** The PINNED signer DID ("0x"+hex) every Gate B verifies the edge against — self for an anon,
   *  a granting root for a delegated/operator vessel. */
  signerDid:       string;
  /** This vessel's OWN signed device-delegation edge (signer→vessel) — the public binding
   *  (vessel × hearthTrueName). */
  founderEdge:           DeviceDelegationTiddler;
}

/**
 * Seed social docs, run the Keyhive founding ceremony, flush cap events to
 * the admin doc, and write oracle tiddlers. Returns handles and sentinel IDs.
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
  const adminHandle      = seedAdminDoc(repo);

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

  const personGroup = await keyhive.createSentinelDoc(PERSON_GROUP_SENTINEL_URI);
  await keyhive.addSentinelMember(vesselIdentifierHex, personGroup.docIdHex);

  const meshCabal = await keyhive.createSentinelDoc(MESH_CABAL_SENTINEL_URI);
  await keyhive.addSentinelMember(personGroup.agentIdHex, meshCabal.docIdHex);

  // Flush Keyhive events to admin doc in AdminEventStore-compatible format.
  const initEvents = await store.list();
  for (const evt of initEvents) {
    const hashBuf = await crypto.subtle.digest("SHA-256", evt.bytes.slice());
    const hash    = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const title   = capEventTitle(hash);
    adminHandle.change((doc) => {
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
  adminHandle.change((doc) => {
    doc.tiddlers[PERSON_GROUP_DOC_ID_TIDDLER] = {
      tiddler: { title: PERSON_GROUP_DOC_ID_TIDDLER, text: personGroup.docIdHex, kind: "sentinel-id" },
      meta: { authority: "lares-init" },
    };
    doc.tiddlers[PERSON_GROUP_AGENT_ID_TIDDLER] = {
      tiddler: { title: PERSON_GROUP_AGENT_ID_TIDDLER, text: personGroup.agentIdHex, kind: "sentinel-id" },
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
  adminHandle.change((doc) => {
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
    adminUrl:              adminHandle.url      as string,
    personGroupDocIdHex:   personGroup.docIdHex,
    personGroupAgentIdHex: personGroup.agentIdHex,
    meshCabalDocIdHex:     meshCabal.docIdHex,
    contactCardJson,
    signerDid,
    founderEdge,
  };
}

// ---------------------------------------------------------------------------
// Device-admit payload production
// ---------------------------------------------------------------------------

export interface DeviceAdmitCoreInput {
  operatorSeed:          Uint8Array;
  personGroupDocIdHex:   string;
  personGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
  /** Cap events in AdminEventStore-compatible form: base64 bytes + variant string. */
  capEvents:             ReadonlyArray<{ variant: string; bytes: string }>;
  syncUrl:               string | null;
  /** Automerge URL of the issuing vessel's genesis island — for peer-sync delivery. */
  islandDocUrl?:         string | null;
}

/**
 * Self-verify Gates B + C, then produce a device-admit/v1 payload.
 * The caller loads cap events from its admin doc and provides the oracle IDs.
 * Throws if either gate fails (sentinel state inconsistent — re-run lares init).
 */
export async function runDeviceAdmitCore(
  input: DeviceAdmitCoreInput,
): Promise<DeviceAdmitPayload> {
  const {
    operatorSeed, personGroupDocIdHex, personGroupAgentIdHex,
    meshCabalDocIdHex, capEvents, syncUrl, islandDocUrl,
  } = input;

  const keyhive = new KeyhiveProvider();
  const store   = new InMemoryEventStore();

  for (const r of capEvents) {
    const bytes   = base64ToBytes(r.bytes);
    const hashBuf = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
    const hash    = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    await store.put({ hash, variant: r.variant, bytes });
  }

  await keyhive.init({ seed: operatorSeed, eventStore: store });
  const { ingested } = await keyhive.hydrateFromEventStore();
  console.log(`[ceremony] hydrated ${ingested} events — verifying sentinel state`);

  const vesselHex = await keyhive.vesselIdentifierHex();
  const gateB = await keyhive.verifySentinelMembership(vesselHex, personGroupDocIdHex);
  const gateC = await keyhive.verifySentinelMembership(personGroupAgentIdHex, meshCabalDocIdHex);

  if (!gateB.ok) throw new Error(`[ceremony] Gate B self-check failed: ${gateB.reason}`);
  if (!gateC.ok) throw new Error(`[ceremony] Gate C self-check failed: ${gateC.reason}`);
  console.log(`[ceremony] self-check: Gates B + C ✓`);

  await keyhive.dispose();

  return {
    kind: "device-admit/v1",
    personGroupDocIdHex,
    personGroupAgentIdHex,
    meshCabalDocIdHex,
    capEvents,
    syncUrl,
    ...(islandDocUrl != null ? { islandDocUrl } : {}),
  };
}

// ---------------------------------------------------------------------------
// Device-admit ACCEPT (Model-B: delegate a DISTINCT new-device key into the group)
// ---------------------------------------------------------------------------

export interface DeviceAdmitAcceptInput {
  /** The FOUNDER's operator seed (the admitting vessel). */
  operatorSeed:          Uint8Array;
  personGroupDocIdHex:   string;
  personGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
  /** The founder's existing cap events (base64 bytes + variant), from its admin doc. */
  capEvents:             ReadonlyArray<{ variant: string; bytes: string }>;
  /** The JOINEE's self-certifying ContactCard JSON (its public identity), out-of-band. */
  newDeviceContactCardJson: string;
  syncUrl:               string | null;
  islandDocUrl?:         string | null;
}

/**
 * Model-B accept: the founder receives a NEW device's public ContactCard, delegates
 * that distinct DID into the PersonGroup (a fresh DELEGATED event), and repackages
 * ALL cap events (existing + the new delegation) as a device-admit/v1 payload.
 *
 * ⚠ PROVISIONAL — founder-side only; NOT a complete cross-peer admit (witnessed
 * 2026-06-21). The delegation is correct (delegated id == joinee Individual, the
 * DELEGATED + CGKA events fire). BUT a joinee that ingests these cap events still
 * FAILS Gate B: the key-chain/membership is necessary but NOT sufficient — the joinee
 * also needs the encrypted DOCUMENT content, which keyhive moves via sedimentree/Beelay
 * (Rust-only; NOT in the keyhive_wasm JS surface). From JS the gap closes only by
 * transporting the document ourselves — ship an `Archive` (Archive.toBytes →
 * ingestArchive, whole keyhive state incl. the CiphertextStore) or the ciphertext
 * blobs over our own transport, then `tryDecrypt`. Until that (or a Beelay JS binding)
 * lands, Model-A (shared key = same Individual) is the working federation path; this
 * accept stands as the founder-side foundation. (substrate map: lar:///…/docs/lares/federation)
 *
 * No secret crosses the wire: in = the joinee's public card; out = public cap events.
 */
export async function runDeviceAdmitAccept(
  input: DeviceAdmitAcceptInput,
): Promise<DeviceAdmitPayload> {
  const keyhive = new KeyhiveProvider();
  const store   = new InMemoryEventStore();

  // Rehydrate the founder's group state from its existing cap events.
  for (const r of input.capEvents) {
    const bytes   = base64ToBytes(r.bytes);
    const hashBuf = await crypto.subtle.digest("SHA-256", bytes.slice());
    const hash    = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    await store.put({ hash, variant: r.variant, bytes });
  }
  await keyhive.init({ seed: input.operatorSeed, eventStore: store });
  await keyhive.hydrateFromEventStore();

  // Founder self-check: it must actually hold the PersonGroup before it can admit.
  const vesselHex = await keyhive.vesselIdentifierHex();
  const gateB = await keyhive.verifySentinelMembership(vesselHex, input.personGroupDocIdHex);
  if (!gateB.ok) throw new Error(`[ceremony] accept refused: founder not a PersonGroup member (${gateB.reason})`);

  // Import the joinee's public Individual, then DELEGATE it into the PersonGroup —
  // this fires the new DELEGATED event that makes the joinee a member.
  const { id: newDeviceHex } = await keyhive.receiveContactCard(
    new TextEncoder().encode(input.newDeviceContactCardJson),
  );
  await keyhive.addSentinelMember(newDeviceHex, input.personGroupDocIdHex);

  // Collect ALL events (existing + the new delegation) into the payload.
  const all = await store.list();
  const capEvents = all.map((e) => ({ variant: e.variant, bytes: bytesToBase64(e.bytes) }));

  await keyhive.dispose();

  return {
    kind: "device-admit/v1",
    personGroupDocIdHex:   input.personGroupDocIdHex,
    personGroupAgentIdHex: input.personGroupAgentIdHex,
    meshCabalDocIdHex:     input.meshCabalDocIdHex,
    capEvents,
    syncUrl: input.syncUrl,
    ...(input.islandDocUrl != null ? { islandDocUrl: input.islandDocUrl } : {}),
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
  adminUrl:      string;
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

  const identitiesHandle = seedIdentitiesDoc(repo);
  const circlesHandle    = seedCirclesDoc(repo);
  const sessionsHandle   = seedSessionsDoc(repo);
  const adminHandle      = seedAdminDoc(repo);

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

  // Write cap events from payload into admin doc.
  for (const evt of payload.capEvents) {
    const bytes   = base64ToBytes(evt.bytes);
    const hashBuf = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
    const hash    = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const title   = capEventTitle(hash);
    adminHandle.change((doc) => {
      if (!doc.tiddlers[title]) {
        doc.tiddlers[title] = {
          tiddler: {
            title,
            text:        evt.bytes,
            tags:        CAP_EVENT_TAG,
            variant:     evt.variant,
            hash,
            "bytes-len": String(bytes.length),
          },
          meta: { authority: "lares-init-admit" },
        };
      }
    });
  }

  // Write sentinel oracle tiddlers.
  adminHandle.change((doc) => {
    doc.tiddlers[PERSON_GROUP_DOC_ID_TIDDLER] = {
      tiddler: { title: PERSON_GROUP_DOC_ID_TIDDLER, text: payload.personGroupDocIdHex, kind: "sentinel-id" },
      meta: { authority: "lares-init-admit" },
    };
    doc.tiddlers[PERSON_GROUP_AGENT_ID_TIDDLER] = {
      tiddler: { title: PERSON_GROUP_AGENT_ID_TIDDLER, text: payload.personGroupAgentIdHex, kind: "sentinel-id" },
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
    adminUrl:      adminHandle.url      as string,
  };
}
