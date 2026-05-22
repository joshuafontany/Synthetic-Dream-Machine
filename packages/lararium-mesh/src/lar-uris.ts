/**
 * lar-uris — lar:/// URI constants and builders for the Lararium namespace.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/v0.1/lar-uris
 * Grammar doc: lar:///ha.ka.ba/@lararium/mesh/v0.1/lar-uris (bags/@lararium/mesh/v0.1/lar-uris.md)
 */

import type { LarDoc } from "./base-doc.js";
import { emptyLarDoc } from "./base-doc.js";

export const STABLE_TAGSPACE = "ha.ka.ba";
export const LAR_PREFIX = `lar:///${STABLE_TAGSPACE}/` as const;
export const TAG_PREFIX = `${LAR_PREFIX}tags/` as const;

// ── Volatile VM tagspace ───────────────────────────────────────────────────
// Ha/domain=lararium · Ka/quality=local · Ba/dynamic=vm
// Tiddlers here are scratch — never persisted through IslandAdaptor, never
// synced via Automerge. Each vessel's admin VM owns its own volatile namespace.
export const VOLATILE_VM_TAGSPACE = "lararium.local.vm";
export const VOLATILE_VM_PREFIX   = `lar:///${VOLATILE_VM_TAGSPACE}/` as const;

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

export const LARARIUM_DOC_URI  = stableLarUri("@lararium");
export const CATALOG_DOC_URI   = stableLarUri("@catalog");
export const LARES_DOC_URI     = stableLarUri("@lares");
export const LARES_MEMETIC_WIKITEXT_PLUGIN_URI = stableLarUri("@lararium/plugins/lares/memetic-wikitext");

// Shared tag/state law — consumed by vessel projections, not owned by any one runtime.
export const GRAMMAR_TAG = stableTagUri("SharktoothSigil");
export const PARSE_WARNING_TAG = stableTagUri("lararium-parse-warnings");
export const LARARIUM_BAG_MIRROR_TAG = stableTagUri("lararium-bag-mirror");
export const LARES_JOB_TAG = stableTagUri("lares-job");
export const LARES_JOB_EVENT_TAG = stableTagUri("lares-job-event");
export const LARES_PIN_TAG = stableTagUri("lares-pin");
export const PROMOTION_RECEIPT_TAG = stableTagUri("lararium-promotion-receipt");
export const BOOT_SPLASH_ACTIVE_URI = stableLarUri("state/boot-splash/active");

// ── Social plane ──────────────────────────────────────────────────────────

export const IDENTITIES_DOC_URI = stableLarUri("@identities");
export const CIRCLES_DOC_URI    = stableLarUri("@circles");
export const SESSIONS_DOC_URI   = stableLarUri("@sessions");

// ── URI builders ──────────────────────────────────────────────────────────

/** e.g. corpusLarUri("elyncia") → "lar:///ha.ka.ba/@catalog/@elyncia" */
export function corpusLarUri(slug: string): string {
  return stableLarUri(`@catalog/@${slug}`);
}

/** e.g. wikiLarUri("altar-fire") → "lar:///ha.ka.ba/@lararium/wikis/altar-fire" */
export function wikiLarUri(slug: string): string {
  return stableLarUri(`@lararium/wikis/${slug}`);
}

/** e.g. wikiDraftLarUri("altar-fire") → "lar:///ha.ka.ba/@lararium/wikis/altar-fire/draft" */
export function wikiDraftLarUri(slug: string): string {
  return `${wikiLarUri(slug)}/draft`;
}

// ── Admin bag ─────────────────────────────────────────────────────────────

export const ADMIN_WIKI_SLUG = "admin";
export const ADMIN_WIKI_URI  = wikiLarUri(ADMIN_WIKI_SLUG);
/** Admin doc sits at pos-2 under @lararium — distinct from the /wikis/admin leaf path. */
export const ADMIN_BAG_ID    = stableLarUri("@lararium/@admin");

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

// ── Well-known bag slot IDs ────────────────────────────────────────────────
// Six root docs (two planes) + in-memory leaves.
// Bag ID = lar: URI of the owning Automerge doc.

export const BAG_IDS = {
  lararium:   LARARIUM_DOC_URI,
  catalog:    CATALOG_DOC_URI,
  lares:      LARES_DOC_URI,
  identities: IDENTITIES_DOC_URI,
  groups:     CIRCLES_DOC_URI,
  sessions:   SESSIONS_DOC_URI,
  draft:      "draft",
  projection: "projection",
} as const;
