/**
 * lar-uris — lar:/// URI constants and builders for the Lararium namespace.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/lar-uris
 * Grammar doc: lar:///ha.ka.ba/@lararium/mesh/lar-uris (bags/@lararium/mesh/lar-uris.md)
 */

import type { LarDoc } from "./base-doc.js";
import { emptyLarDoc } from "./base-doc.js";

export const STABLE_L_SPACE = "ha.ka.ba";
export const LAR_PREFIX = `lar:///${STABLE_L_SPACE}/` as const;
export const TAG_PREFIX = `${LAR_PREFIX}tags/` as const;

// ── Volatile VM l-space ───────────────────────────────────────────────────
// Ha/domain=lararium · Ka/quality=local · Ba/dynamic=vm
// Tiddlers here are scratch — never persisted through IslandAdaptor, never
// synced via Automerge. Each vessel's daemon VM owns its own volatile namespace.
export const VOLATILE_VM_L_SPACE = "lararium.local.vm";
export const VOLATILE_VM_PREFIX   = `lar:///${VOLATILE_VM_L_SPACE}/` as const;

export function volatileVmUri(path: string): string {
  return `${VOLATILE_VM_PREFIX}${path.replace(/^\/+/, "")}`;
}

export function isVolatileVmUri(uri: string): boolean {
  return uri.startsWith(VOLATILE_VM_PREFIX);
}

// ── Petname l-space regions (the NAMING / addressing layer) ───────────────
// Petnames and TW5 titles ride the lar: grammar as their own abstraction layer,
// SEPARATE from both federation and persistence
// (lar:///ha.ka.ba/@lares/api/pono/lararium-identity#capability-and-petnames).
// This layer classifies an address by NAME-STABILITY only:
//   STABLE   — root ha.ka.ba — a canonical, permanent, shared address.
//   UNSTABLE — any other three-term attitude root — a session/per-relationship/
//              per-place LOCAL name a vessel grows for the peers and places it meets.
// Two axes stay ORTHOGONAL to this naming layer — neither is decided by the namespace:
//   · FEDERATION  — what crosses to peers — is controlled by the RESIDENCY BAG
//                   (which bag holds the content) + capability, never by the name.
//   · PERSISTENCE — local-store writes — covers every meme; only the reserved
//                   volatile VM root (lararium.local.vm) is pure scratch (see below).

/** The authority-less root token of a local-form `lar:///<root>/…` URI; undefined for session-form or non-lar. */
export function larRoot(uri: string): string | undefined {
  const m = /^lar:\/\/\/([^/]+)(?:\/|$)/.exec(uri);
  return m ? m[1] : undefined;
}

/** Stable l-space (ha.ka.ba) — a canonical, permanent, shared address (NAMING only; says nothing about federation or persistence). */
export function isStableLarUri(uri: string): boolean {
  return larRoot(uri) === STABLE_L_SPACE;
}

/** An unstable petname — a session/per-relationship/per-place LOCAL name (any three-term root but the reserved volatile VM). NAMING only. */
export function isUnstablePetnameUri(uri: string): boolean {
  const root = larRoot(uri);
  return root !== undefined && root !== STABLE_L_SPACE && root !== VOLATILE_VM_L_SPACE;
}

/** A lar: URI persists to the local store unless it is pure volatile-VM scratch — every meme persists, stable and unstable alike. */
export function isPersistableLarUri(uri: string): boolean {
  return uri.startsWith("lar:") && !isVolatileVmUri(uri);
}

export function stableLarUri(path: string): string {
  return `${LAR_PREFIX}${path.replace(/^\/+/, "")}`;
}

export function stableTagUri(name: string): string {
  return `${TAG_PREFIX}${name.replace(/^\/+/, "")}`;
}

// ── Content plane ─────────────────────────────────────────────────────────

// @oracle = the runtime SYSTEM ISLAND (genesis-loaded: engine BLOBs + bag→doc
// oracle + genesis-cid); the universal floor of every wiki-recipe. Split from
// the @lararium memetic corpus (disk-projection #oracle-split).
export const ORACLE_DOC_URI    = stableLarUri("@oracle");
// @lararium = the engine's memetic CORPUS (authored self-doc memes; a library bag).
export const LARARIUM_DOC_URI  = stableLarUri("@lararium");
export const CATALOG_DOC_URI   = stableLarUri("@catalog");
export const LARES_DOC_URI     = stableLarUri("@lares");
// The memetic-wikitext engine plugin — a named blob CARRIED IN @oracle's blobs,
// but its identity-title keeps the @lararium namespace (plugin.info + the TW5
// pack pipeline key on this exact title; the doc that holds the blob is @oracle).
export const LARES_MEMETIC_WIKITEXT_PLUGIN_URI = stableLarUri("@lararium/plugins/lares/memetic-wikitext");

// Shared tag/state law — consumed by vessel projections, not owned by any one runtime.
export const GRAMMAR_TAG = stableTagUri("SharktoothSigil");
export const PARSE_WARNING_TAG = stableTagUri("lararium-parse-warnings");
export const LARARIUM_BAG_MIRROR_TAG = stableTagUri("lararium-bag-mirror");
export const LARES_VERB_TAG = stableTagUri("lares-verb");
export const LARES_VERB_EVENT_TAG = stableTagUri("lares-verb-event");
export const LARES_PIN_TAG = stableTagUri("lares-pin");
/** Keyhive capability events persisted in the daemon doc. Sub-tags: .../prekey, .../cgka, .../delegation, .../revocation */
export const CAP_EVENT_TAG = stableTagUri("cap-event");
export const CAP_EVENT_PREKEY_TAG     = stableTagUri("cap-event/prekey");
export const CAP_EVENT_CGKA_TAG       = stableTagUri("cap-event/cgka");
export const CAP_EVENT_DELEGATION_TAG = stableTagUri("cap-event/delegation");
export const CAP_EVENT_REVOCATION_TAG = stableTagUri("cap-event/revocation");
export const BOOT_SPLASH_ACTIVE_URI = stableLarUri("state/boot-splash/active");

// ── Social plane ──────────────────────────────────────────────────────────

export const IDENTITIES_DOC_URI = stableLarUri("@identities");
export const CIRCLES_DOC_URI    = stableLarUri("@circles");
export const SESSIONS_DOC_URI   = stableLarUri("@sessions");

// ── URI builders ──────────────────────────────────────────────────────────

/**
 * Canonical URI of a corpus bag.
 *   corpusLarUri("elyncia") → "lar:///ha.ka.ba/@elyncia"
 *
 * Every corpus is a first-class bag at child[1] under the bag-tag rule
 * (see lar:///ha.ka.ba/@lares/api/pono/lar-uri#bag-tag-rule).
 */
export function corpusLarUri(slug: string): string {
  return stableLarUri(`@${slug}`);
}

/**
 * Registry-entry URI inside @catalog that points at a corpus bag.
 *   catalogCorpusEntryUri("elyncia") → "lar:///ha.ka.ba/@catalog/corpus/elyncia"
 *
 * The tiddler at this title lives in the @catalog bag and carries the
 * corpus bag's AutomergeUrl as its `text` field. Registry pattern: catalog
 * catalogs; it does not host.
 */
export function catalogCorpusEntryUri(slug: string): string {
  return stableLarUri(`@catalog/corpus/${slug}`);
}

/** Prefix used to discover catalog corpus-registry entries. */
export const CATALOG_CORPUS_PREFIX = stableLarUri("@catalog/corpus/");

// ── Federation scale (the RESIDENCY-BAG axis) ─────────────────────────────
// A catalog/residency entry MAY declare the federation scale of the bag it
// registers — what controls how far the bag federates and (at boot) how long a
// joiner waits for it. The five scales map to the five aperture bands; reach
// (so patience) grows. Federation is governed HERE, on the bag's residency
// entry — never by the lar: namespace (which is the naming layer above).
export type MeshScale = "vessel" | "persona-group" | "cabal" | "nexus" | "dreamnet";
export const MESH_SCALES: readonly MeshScale[] = ["vessel", "persona-group", "cabal", "nexus", "dreamnet"];

/** Read a declared scale off a catalog entry; undefined when absent or unrecognized (the caller then defaults patience). */
export function parseMeshScale(s: string | null | undefined): MeshScale | undefined {
  return typeof s === "string" && (MESH_SCALES as readonly string[]).includes(s) ? (s as MeshScale) : undefined;
}

// The wiki canon/draft URI builders moved to wiki-recipe.ts (wikiBagUri /
// wikiDraftBagUri) — a wiki's own canon IS the `@{slug}` bag (the quine),
// never nested under the @lararium corpus (the pre-plane-split `@lararium/wikis/`
// form is retired).

// ── Daemon bag + Persona bag ─────────────────────────────────────────────────

/** Daemon wiki bag id — the lararium's own central daemon `@daemon` bag (one-recipe model).
 *  SOVEREIGN-per-vessel: this vessel's own control-plane, never shared across vessels. */
export const DAEMON_BAG_ID    = stableLarUri("@daemon");

/** Persona bag id — the operator's veiled-identity `@persona` bag (the PersonaGroup).
 *  Carries the Shadowtalk veiled True-name; the membership-sync surface that crosses the
 *  operator's vessels (vs `@daemon`, which stays sovereign-per-vessel). Founded alongside
 *  `@daemon` via the bootstrap (not in BAG_IDS — both ride the founding ceremony). The ONE
 *  daemon VM tends BOTH bags. */
export const PERSONA_BAG_ID    = stableLarUri("@persona");

// ── Recipe + bag descriptor URI builders ──────────────────────────────────

/** e.g. recipeUri("@lararium", "default") → "lar:///ha.ka.ba/@lararium/recipes/default" */
export function recipeUri(root: string, name: string): string {
  const rootSlug = root.startsWith("@") ? root : `@${root}`;
  return stableLarUri(`${rootSlug}/recipes/${name}`);
}

/** e.g. bagDescriptorUri("lar:///ha.ka.ba/@lararium") → "lar:///ha.ka.ba/@lararium/descriptor" */
export function bagDescriptorUri(bagId: string): string {
  return `${bagId}/descriptor`;
}

// ── Social plane URI builders ──────────────────────────────────────────────

/** e.g. identityTiddlerUri("did:key:z…") → "lar:///ha.ka.ba/@identities/did:key:z…" */
export function identityTiddlerUri(did: string): string {
  return stableLarUri(`@identities/${did}`);
}

/** e.g. circleTiddlerUri("admins") → "lar:///ha.ka.ba/@circles/admins" */
export function circleTiddlerUri(id: string): string {
  return stableLarUri(`@circles/${id}`);
}

/** e.g. sessionTiddlerUri("sess-abc") → "lar:///ha.ka.ba/@sessions/sess-abc" */
export function sessionTiddlerUri(id: string): string {
  return stableLarUri(`@sessions/${id}`);
}

/** e.g. sessionEventLogUri("sess-abc") → "lar:///ha.ka.ba/@sessions/sess-abc/events" */
export function sessionEventLogUri(sessionId: string): string {
  return stableLarUri(`@sessions/${sessionId}/events`);
}

/** e.g. deviceDelegationUri(opDid, devDid) → "lar:///ha.ka.ba/@identities/{opDid}/devices/{devDid}" */
export function deviceDelegationUri(operatorDid: string, deviceDid: string): string {
  return stableLarUri(`@identities/${encodeURIComponent(operatorDid)}/devices/${encodeURIComponent(deviceDid)}`);
}

/** e.g. nexusTrustUri("abcdef…") → "lar:///ha.ka.ba/@identities/trust/nexus/abcdef…" */
export function nexusTrustUri(nexusPubkey: string): string {
  return stableLarUri(`@identities/trust/nexus/${nexusPubkey}`);
}

// ── Social plane doc-type aliases + empty constructors ────────────────────

/** IdentitiesDoc — each principal = one tiddler at identityTiddlerUri(did). */
export type IdentitiesDoc = LarDoc;
/** CirclesDoc — each group = one tiddler at circleTiddlerUri(id). */
export type CirclesDoc = LarDoc;
/** SessionsDoc — each session = one tiddler at sessionTiddlerUri(id). */
export type SessionsDoc = LarDoc;

export function emptyIdentitiesDoc(): IdentitiesDoc { return emptyLarDoc(); }
export function emptyCirclesDoc(): CirclesDoc       { return emptyLarDoc(); }
export function emptySessionsDoc(): SessionsDoc     { return emptyLarDoc(); }

// ── DreamNet identity sentinel URIs ──────────────────────────────────────
// These URIs serve as ChangeId seeds for Keyhive sentinel Documents that carry
// DreamNet membership chains. DocumentId uniqueness comes from Keyhive's internal
// EphemeralSigner (CSPRNG) — the URI is a semantic label only.
//
// Two-level identity lattice:
//   PersonaGroup  — vessels belonging to one operator (Vessel Individual → PersonaGroup)
//   MeshCabal    — operators participating in one Nexus (PersonaGroup → MeshCabal)

/** Sentinel URI for a vessel's PersonaGroup membership document. */
export const PERSONA_GROUP_SENTINEL_URI = stableLarUri("@operator/persona-group");
/** Sentinel URI for a Nexus's MeshCabal membership document. */
export const MESH_CABAL_SENTINEL_URI   = stableLarUri("@mesh/admin-cabal");

// PersonaGroup-identity sentinel tiddlers re-home to the @persona namespace — they name
// the operator's veiled identity (the PersonaGroup), the membership-sync surface. MeshCabal
// (nexus-affiliation, NOT personGroup-identity) stays under @daemon.
/** Persona oracle tiddler: PersonaGroup Document ID (hex). Legacy sentinel target (the Binding Gate superseded it). */
export const PERSONA_GROUP_DOC_ID_TIDDLER   = `${PERSONA_BAG_ID}/sentinel/persona-group/doc-id`;
/** Persona oracle tiddler: PersonaGroup agent Identifier (hex). Used by boot Gate C. */
export const PERSONA_GROUP_AGENT_ID_TIDDLER = `${PERSONA_BAG_ID}/sentinel/persona-group/agent-id`;
/** Daemon oracle tiddler: MeshCabal Document ID (hex) — NEXUS-affiliation, sovereign-per-vessel. Used by boot Gate C. */
export const MESH_CABAL_DOC_ID_TIDDLER     = `${DAEMON_BAG_ID}/sentinel/mesh-cabal/doc-id`;
/** Persona oracle tiddler: the PINNED signer DID ("0x"+hex) the Binding Gate verifies the edge against —
 *  self-DID for an anon (self-signed), a granting root-DID for a delegated/operator vessel. */
export const SIGNER_DID_TIDDLER            = `${PERSONA_BAG_ID}/binding/signer-did`;
/** Persona oracle tiddler: the hearth true-name (engine content-CID) this vessel binds TO — the place in (vessel × hearthTrueName). */
export const HEARTH_TRUE_NAME_TIDDLER      = `${PERSONA_BAG_ID}/hearth/true-name`;
/** Persona oracle tiddler: this vessel's OWN signed device-delegation edge (signer→vessel) — the public binding the Binding Gate verifies. */
export const DEVICE_DELEGATION_SELF_TIDDLER = `${PERSONA_BAG_ID}/delegation/self`;

// ── @personal / @draft binding tiddler prefixes ───────────────────────────
// The (PersonaGroup × recipe-fingerprint) → docUrl bindings live as tiddlers
// under these prefixes (now @persona-namespaced — PersonaGroup-scoped, cross-device).
// One fingerprint produces THREE bindings (@personal, @draft, @working) that
// share a lifecycle. The binding tiddler title is `${PREFIX}/${fingerprintHex}`;
// its `text` carries the bound URL.
// Canon: lar:///ha.ka.ba/@lararium/api/personal-slot#core-claim
export const PERSONAL_BINDINGS_PREFIX = `${PERSONA_BAG_ID}/personal-bindings`;
export const DRAFT_BINDINGS_PREFIX    = `${PERSONA_BAG_ID}/draft-bindings`;
// @working binds like @personal (PersonaGroup×fingerprint, cross-device) — the
// SAVED live write layer; normal edits route here, canon publishes on promotion.
export const WORKING_BINDINGS_PREFIX  = `${PERSONA_BAG_ID}/working-bindings`;

// ── Well-known bag slot IDs ────────────────────────────────────────────────
// Six root docs (two planes) + in-memory leaves.
// Bag ID = lar: URI of the owning Automerge doc.

/**
 * Vessel-wide system bag URIs. These exist once per vessel and serve all wikis.
 *
 * Per-wiki recipe slots (`@temp`, `@draft`, `@<wiki-slug>`, library bags) live
 * in `wiki-recipe.ts` — slot URIs in the same lar:///ha.ka.ba/@<name>
 * namespace. Structural slots arrive as typed IslandGrants on the manifest;
 * @lares rides the @lararium doc's well-known tiddlers; library bags resolve
 * island-side from @catalog.
 */
export const BAG_IDS = {
  oracle:     ORACLE_DOC_URI,
  lararium:   LARARIUM_DOC_URI,
  catalog:    CATALOG_DOC_URI,
  lares:      LARES_DOC_URI,
  identities: IDENTITIES_DOC_URI,
  groups:     CIRCLES_DOC_URI,
  sessions:   SESSIONS_DOC_URI,
} as const;
