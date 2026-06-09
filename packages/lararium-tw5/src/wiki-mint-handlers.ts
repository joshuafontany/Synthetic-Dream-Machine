import type { AutomergeUrl } from "@lararium/mesh";
import type { ChangeOrigin, LarTiddlerRecord } from "@lararium/mesh";
import { ACTIVE_WIKI_URI, buildActiveWikiRecord, readActiveWikiSlug } from "./active-wiki.js";
import {
  ADMIN_BAG_ID,
  CATALOG_DOC_URI,
  LARES_DOC_URI,
  LARARIUM_DOC_URI,
  emptyLarDoc,
  mutableLarRecord,
  mkAdminWikiAlert,
  recipeUri,
  wikiDraftLarUri,
  wikiLarUri,
} from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";
import { makeRequestId, stringArg } from "./handler-args.js";
import type { WikiHandlerOptions, WikiMintHandlerOptions } from "./wiki-handler-options.js";

// makeListWikisReactor RELOCATED to @lararium/tw5 (worker-data-verbs) — list-wikis now
// runs in every vessel's admin worker (sovereign-worker, verify-then-delegate gated).

export function makeInitWikiReactor(opts: WikiMintHandlerOptions): VerbReactor {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required (the wiki name)");
    if (slug.includes("/") || slug.includes(" ")) {
      throw new Error(`invalid slug: "${slug}" (no slashes or spaces)`);
    }

    const did = await opts.operatorDid();
    const wikiKey = wikiLarUri(slug);
    const draftBagId = wikiDraftLarUri(slug);
    const draftKey = `${wikiKey}/drafts/${encodeURIComponent(did)}`;
    // The user's wiki recipe is REGISTRY data (the user's composition choice) —
    // it lives in the user's @catalog, NOT @lararium (protocol substrate). Read
    // it through the accessor (access≠load), like the wiki/draft oracles.
    const recipeTitle = recipeUri("@catalog", slug);

    const existingWikiUrl = await opts.catalog.urlOf(wikiKey);
    const existingDraftUrl = await opts.catalog.urlOf(draftKey);
    const existingRecipeRec = await opts.catalog.recordOf(recipeTitle);
    if (existingWikiUrl && existingDraftUrl && existingRecipeRec) {
      return {
        slug,
        status: "already-exists",
        wikiUri: wikiKey,
        wikiDocUrl: existingWikiUrl,
        draftBagId,
        draftDocUrl: existingDraftUrl,
        recipeUri: recipeTitle,
      };
    }

    const wikiHandle = existingWikiUrl
      ? await opts.repo.find(existingWikiUrl as AutomergeUrl)
      : opts.repo.create(emptyLarDoc());
    const draftHandle = existingDraftUrl
      ? await opts.repo.find(existingDraftUrl as AutomergeUrl)
      : opts.repo.create(emptyLarDoc());

    if (!existingWikiUrl) await wikiHandle.whenReady();
    if (!existingDraftUrl) await draftHandle.whenReady();

    // Oracles AND the user recipe all land in @catalog (registry) — one write.
    const catalogHandle = await opts.catalog.handle();
    const updatedAt = new Date().toISOString();
    catalogHandle.change((doc) => {
      const tiddlers = doc.tiddlers as Record<string, LarTiddlerRecord>;
      tiddlers[wikiKey] = mutableLarRecord(wikiKey, {
        text: wikiHandle.url,
        kind: "oracle",
        "path-filter": "lar-bag-path[wiki-shadow]",
        "mirror-root": `wikis/@${slug}`,
      }, "lares-cli:wiki-init");
      tiddlers[draftKey] = mutableLarRecord(draftKey, {
        text: draftHandle.url,
        kind: "oracle",
      }, "lares-cli:wiki-init");
      tiddlers[recipeTitle] = mutableLarRecord(recipeTitle, {
        label: slug,
        "bag-stack": `${CATALOG_DOC_URI} ${LARARIUM_DOC_URI} ${LARES_DOC_URI} ${wikiKey} ${draftBagId}`,
        "writable-bag": draftBagId,
        "updated-at": updatedAt,
      }, "lares-cli:wiki-init");
    });

    return {
      slug,
      status: existingWikiUrl ? "completed-partial" : "minted",
      wikiUri: wikiKey,
      wikiDocUrl: wikiHandle.url,
      draftBagId,
      draftDocUrl: draftHandle.url,
      recipeUri: recipeTitle,
    };
  };
}

export function makeOpenWikiReactor(opts: WikiHandlerOptions): VerbReactor {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const wikiKey = wikiLarUri(slug);
    // Wiki oracle lives in @catalog — read via the accessor, not the composite.
    const wikiUrl = await opts.catalog.urlOf(wikiKey);
    if (!wikiUrl) {
      throw new Error(`wiki "${slug}" not registered — run \`lares wiki init ${slug}\` first`);
    }

    const marker = await opts.composite.get(ACTIVE_WIKI_URI);
    const currentSlug = readActiveWikiSlug(marker);
    if (currentSlug === slug) {
      return { slug, status: "already-active", liveApplied: true };
    }

    const origin: ChangeOrigin = { kind: "lares-verb", requestId: makeRequestId("wiki") };
    const record: LarTiddlerRecord = buildActiveWikiRecord(slug, "lares-cli:wiki-open");
    await opts.composite.put(record, origin, { bag: ADMIN_BAG_ID });

    // Reboot-pending: the active-wiki marker lives in @admin (the running wiki doesn't
    // load it) — the switch only takes effect on next boot. Alert the wiki being
    // switched AWAY from (the one currently live), if any.
    if (currentSlug) {
      opts.post(mkAdminWikiAlert({ wikiSlug: currentSlug, message: `Active wiki will switch to "${slug}" — reboot to load it.`, cause: "open-wiki" }));
    }

    return {
      slug,
      status: "selected-for-next-boot",
      liveApplied: false,
      rebootRequired: true,
      note: "active wiki marker updated; the current wiki keeps mounted until the next `lares serve` boot (alert seeded)",
    };
  };
}