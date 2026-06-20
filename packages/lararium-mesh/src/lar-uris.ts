/**
 * lar-uris — lar:/// URI constants and builders for the Lararium namespace.
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-uris
 * Grammar doc: lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-uris (bags/@lararium/v0.1/mesh/lar-uris.md)
 */

import type { LarDoc } from "./base-doc.js";
import { emptyLarDoc } from "./base-doc.js";

export const STABLE_L_SPACE = "ha.ka.ba";
export const LAR_PREFIX = `lar:///${STABLE_L_SPACE}/` as const;
export const TAG_PREFIX = `${LAR_PREFIX}tags/` as const;

// ── Volatile VM l-space ───────────────────────────────────────────────────
// Ha/domain=lararium · Ka/quality=local · Ba/dynamic=vm
// Tiddlers here are scratch — never persisted through IslandAdaptor, never
// synced via Automerge. Each vessel's admin VM owns its own volatile namespace.
export const VOLATILE_VM_L_SPACE = "lararium.local.vm";
export const VOLATILE_VM_PREFIX   = `lar:///${VOLATILE_VM_L_SPACE}/` as const;

export function volatileVmUri(path: string): string {
  return `${VOLATILE_VM_PREFIX}${path.replace(/^\/+/, "")}`;
}

export function isVolatileVmUri(uri: string): boolean {
  return uri.startsWith(VOLATILE_VM_PREFIX);
}

/** A lar: URI is persistable when it is stable (ha.ka.ba) — volatile VM URIs are not. */
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
// the @lararium memetic corpus (disk-projection #oracle-split, 2026-06-15).
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
/** Keyhive capability events persisted in the admin doc. Sub-tags: .../prekey, .../cgka, .../delegation, .../revocation */
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
 * (see lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri#bag-tag-rule).
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

// The wiki canon/draft URI builders moved to wiki-recipe.ts (wikiBagUri /
// wikiDraftBagUri) — a wiki's own canon IS the `@{slug}` bag (the quine),
// never nested under the @lararium corpus (the pre-plane-split `@lararium/wikis/`
// form is retired).

// ── Admin bag ─────────────────────────────────────────────────────────────

/** Admin wiki bag id — the admin control plane's own `@admin` bag (one-recipe model). */
export const ADMIN_BAG_ID    = stableLarUri("@admin");

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
//   PersonGroup  — vessels belonging to one operator (Vessel Individual → PersonGroup)
//   MeshCabal    — operators participating in one Nexus (PersonGroup → MeshCabal)

/** Sentinel URI for a vessel's PersonGroup membership document. */
export const PERSON_GROUP_SENTINEL_URI = stableLarUri("@operator/person-group");
/** Sentinel URI for a Nexus's MeshCabal membership document. */
export const MESH_CABAL_SENTINEL_URI   = stableLarUri("@mesh/admin-cabal");

/** Admin oracle tiddler: PersonGroup Document ID (hex). Used by boot Gate B. */
export const PERSON_GROUP_DOC_ID_TIDDLER   = `${ADMIN_BAG_ID}/sentinel/person-group/doc-id`;
/** Admin oracle tiddler: PersonGroup agent Identifier (hex). Used by boot Gate C. */
export const PERSON_GROUP_AGENT_ID_TIDDLER = `${ADMIN_BAG_ID}/sentinel/person-group/agent-id`;
/** Admin oracle tiddler: MeshCabal Document ID (hex). Used by boot Gate C. */
export const MESH_CABAL_DOC_ID_TIDDLER     = `${ADMIN_BAG_ID}/sentinel/mesh-cabal/doc-id`;

// ── @personal / @draft binding tiddler prefixes ───────────────────────────
// The (PersonGroup × recipe-fingerprint) → docUrl bindings live as tiddlers in
// the admin doc under these prefixes. One fingerprint produces THREE bindings
// (@personal, @draft, @working) that share a lifecycle. The binding tiddler
// title is `${PREFIX}/${fingerprintHex}`; its `text` carries the bound URL.
// Canon: lar:///ha.ka.ba/@lararium/v0.1/api/personal-slot#core-claim
export const PERSONAL_BINDINGS_PREFIX = `${ADMIN_BAG_ID}/personal-bindings`;
export const DRAFT_BINDINGS_PREFIX    = `${ADMIN_BAG_ID}/draft-bindings`;
// @working binds like @personal (PersonGroup×fingerprint, cross-device) — the
// SAVED live write layer; normal edits route here, canon publishes on promotion.
export const WORKING_BINDINGS_PREFIX  = `${ADMIN_BAG_ID}/working-bindings`;

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
