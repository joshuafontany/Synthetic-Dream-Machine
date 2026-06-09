/**
 * vessel-steps — shared cascade steps for the vessel boot.
 *
 * Pair 3/5 collapses the two vessel factories (open-node-vessel ⇆
 * open-browser-vessel) NOT into one monolithic core but into a CASCADE of
 * composable steps each factory sequences — the vessel IS a recipe. Genuinely
 * divergent stations (node WS relay office, browser IDB batching / genesis,
 * the node verb-registry) stay platform steps; only the shared spine extracts
 * here, by subtraction.
 *
 * Office divergence rides IN as composition, never as a branch: e.g. the social
 * plane's seed policy (a node relay FINDS-never-seeds; a browser keeper may
 * SEED) arrives as the caller's `resolveHandle`, not an `if (platform)`.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/vessel-steps
 */

import {
  AutomergeDocStore,
  BAG_IDS,
  computeRecipeFingerprint,
  wikiBagUri,
  LARARIUM_BAG, PERSONAL_BAG, DRAFT_BAG,
  LARES_DOC_URI, LARARIUM_DOC_URI,
  type Repo,
  type DocHandle,
  type AutomergeUrl,
  type LarDoc,
  type CompositeStore,
  type WikiRecipe,
  type WikiMountSpec,
} from "@lararium/mesh";
import type { VerbTable } from "./verb-dispatcher.js";

/** Resolve one bag's doc handle. Encodes the platform/office seed policy
 *  (node relay → throw on miss; browser keeper → create blank). */
export type ResolveBagHandle = (
  url: AutomergeUrl,
  bag: string,
) => Promise<DocHandle<LarDoc>>;

// ── Layer-role vocabulary ─────────────────────────────────────────────────────
// A vessel composite IS a cascade of typed layer-roles. These name the shared
// config intent so it cannot drift across factories; handle RESOLUTION (genesis
// sourcing etc.) stays a platform concern, passed in as the resolved handle.

/**
 * Canon layer (@lararium / @lares): writable so residency actions can land
 * tiddlers, but `defaultWritable:false` so unbagged TW5 saves keep routing to
 * the wiki — only an explicit `record.bag === bagId` write lands here.
 */
export function addCanonLayer(composite: CompositeStore, bagId: string, handle: DocHandle<LarDoc>): void {
  composite.addLayer({
    bagId,
    store:           new AutomergeDocStore(handle, bagId),
    writable:        true,
    defaultWritable: false,
  });
}

/** Read-only layer (@catalog, corpus bags): synced for reads, never written. */
export function addReadOnlyLayer(composite: CompositeStore, bagId: string, handle: DocHandle<LarDoc>): void {
  composite.addLayer({ bagId, store: new AutomergeDocStore(handle, bagId), writable: false });
}

/**
 * Seed the base verbs every vessel answers, regardless of platform or office.
 * Office-specific powers (node's residency/wiki reactors, etc.) compose ON TOP
 * by registering further verbs — the base set stays shared.
 */
export function seedVesselDefaults(registry: VerbTable): void {
  // echo — universal protocol smoke verb.
  if (!registry.has("echo")) {
    registry.register("echo", async (args) => ({ echoed: args }));
  }
}

// ── Primary wiki mount — the isomorphic keystone step ─────────────────────────

/** Any vessel island pool: one isomorphic mount signature (pair 1 cc24f3b9).
 *  `opts.pinned` is a node residency capability; a pool without residency
 *  ignores it (composition by capability, never a per-platform branch). */
export interface PrimaryMountPool {
  mountWiki(id: string, spec: WikiMountSpec, opts?: { pinned?: boolean }): Promise<void>;
}

/** Any admin vessel that can resolve the operator's @personal/@draft binding —
 *  island-side, where keyhive lives. Both vessels expose this (pair 2). */
export interface BindingResolver {
  resolveBinding(
    fingerprint: string,
    recipeTrace: { wikiDocId: string; canonBagDocIds: readonly string[] },
  ): Promise<{ personalUrl: string; draftUrl: string }>;
}

export interface PrimaryMountInputs {
  activeWikiId: string;
  wikiSlug:     string;
  coreHash:     string | null;
  /** @lararium island doc url. */
  islandUrl:    string;
  /** primary wiki doc url. */
  wikiUrl:      string;
}

/** Canonical disk-mirror DESIGNATION. A pool's held grant decides whether it
 *  actually mirrors (node holds a disk grant; browser's empty grant ignores). */
const PRIMARY_MIRROR_BAGS: readonly string[] = [LARES_DOC_URI, LARARIUM_DOC_URI];

/**
 * Mount the primary wiki island — the isomorphic keystone both vessels run.
 *
 * Every keeper, on every platform, binds its sovereign @personal/@draft slots
 * (resolved island-side per recipe-fingerprint) and mounts a pinned primary.
 * Persona/office divergence lives only in DATA + held capability: mirrorBags is
 * a universal designation a pool's disk-grant may or may not honor; pinned is a
 * residency capability a pool may or may not implement. No per-platform branch.
 */
export async function mountPrimaryWiki(
  pool:    PrimaryMountPool,
  binding: BindingResolver,
  inputs:  PrimaryMountInputs,
): Promise<{ personalUrl: string; draftUrl: string }> {
  // @personal + @draft bind TOGETHER per recipe-fingerprint (Q11). Fingerprint
  // covers wikiDocId + libraryBags only (@lares/@lararium excluded per Q4); the
  // live primary carries no libraryBags, so it keys on the wiki doc url alone.
  const recipeTrace = { wikiDocId: inputs.wikiUrl, canonBagDocIds: [] as readonly string[] };
  const fingerprint = await computeRecipeFingerprint(recipeTrace);
  const { personalUrl, draftUrl } = await binding.resolveBinding(fingerprint, recipeTrace);

  const resolver: Record<string, string | null> = {
    [LARARIUM_BAG]:                 inputs.islandUrl,
    [wikiBagUri(inputs.wikiSlug)]:  inputs.wikiUrl,
    ...(personalUrl ? { [PERSONAL_BAG]: personalUrl } : {}),
    ...(draftUrl    ? { [DRAFT_BAG]:    draftUrl    } : {}),
  };
  const recipe: WikiRecipe = { wikiSlug: inputs.wikiSlug, mirrorBags: [...PRIMARY_MIRROR_BAGS] };

  await pool.mountWiki(
    inputs.activeWikiId,
    { coreHash: inputs.coreHash, recipe, resolver },
    { pinned: true },
  );

  return { personalUrl, draftUrl };
}

export interface SocialPlaneUrls {
  identitiesUrl: string;
  circlesUrl:    string;
  sessionsUrl:   string;
}

export interface SocialPlaneHandles {
  identitiesHandle: DocHandle<LarDoc>;
  groupsHandle:     DocHandle<LarDoc>;
  sessionsHandle:   DocHandle<LarDoc>;
}

/**
 * Mount the social plane (@identities / @circles→groups / @sessions) onto the
 * composite as writable layers. Shared spine; the seed policy is the caller's
 * `resolveHandle`. Layer order (identities → groups → sessions) is preserved
 * so callers control overall composite priority by call-site placement.
 */
export async function mountSocialPlane(
  composite:     CompositeStore,
  urls:          SocialPlaneUrls,
  resolveHandle: ResolveBagHandle,
): Promise<SocialPlaneHandles> {
  const identitiesHandle = await resolveHandle(urls.identitiesUrl as AutomergeUrl, BAG_IDS.identities);
  const groupsHandle     = await resolveHandle(urls.circlesUrl    as AutomergeUrl, BAG_IDS.groups);
  const sessionsHandle   = await resolveHandle(urls.sessionsUrl   as AutomergeUrl, BAG_IDS.sessions);

  composite.addLayer({ bagId: BAG_IDS.identities, store: new AutomergeDocStore(identitiesHandle, BAG_IDS.identities), writable: true });
  composite.addLayer({ bagId: BAG_IDS.groups,     store: new AutomergeDocStore(groupsHandle,     BAG_IDS.groups),     writable: true });
  composite.addLayer({ bagId: BAG_IDS.sessions,   store: new AutomergeDocStore(sessionsHandle,   BAG_IDS.sessions),   writable: true });

  return { identitiesHandle, groupsHandle, sessionsHandle };
}
