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
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/keyhive/ceremony-core
 */

import type { Repo } from "@lararium/mesh";
import {
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
  PERSON_GROUP_SENTINEL_URI, MESH_CABAL_SENTINEL_URI,
  PERSON_GROUP_DOC_ID_TIDDLER, PERSON_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  CAP_EVENT_TAG,
  seedIdentitiesDoc, seedCirclesDoc, seedSessionsDoc, seedAdminDoc,
} from "@lararium/mesh";

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
  operatorSeed:        Uint8Array;
  /** Hex-encoded 32-byte Ed25519 verifying key — used to build the operator identity tiddler. */
  operatorVerifyingKey: string;
  /** Display name for the operator identity tiddler. */
  operatorDisplayName:  string;
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

  await keyhive.dispose();

  return {
    identitiesUrl:         identitiesHandle.url as string,
    circlesUrl:            circlesHandle.url    as string,
    sessionsUrl:           sessionsHandle.url   as string,
    adminUrl:              adminHandle.url      as string,
    personGroupDocIdHex:   personGroup.docIdHex,
    personGroupAgentIdHex: personGroup.agentIdHex,
    meshCabalDocIdHex:     meshCabal.docIdHex,
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
    meshCabalDocIdHex, capEvents, syncUrl,
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
