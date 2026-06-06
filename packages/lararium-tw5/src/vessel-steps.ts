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
  type Repo,
  type DocHandle,
  type AutomergeUrl,
  type LarDoc,
  type CompositeStore,
} from "@lararium/mesh";

/** Resolve one bag's doc handle. Encodes the platform/office seed policy
 *  (node relay → throw on miss; browser keeper → create blank). */
export type ResolveBagHandle = (
  url: AutomergeUrl,
  bag: string,
) => Promise<DocHandle<LarDoc>>;

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
