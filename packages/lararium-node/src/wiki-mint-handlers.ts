import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { ChangeOrigin, LarTiddlerRecord } from "@lararium/mesh";
import { ACTIVE_WIKI_URI, buildActiveWikiRecord, readActiveWikiSlug } from "@lararium/tw5";
import {
  ADMIN_BAG_ID,
  CATALOG_DOC_URI,
  LARES_DOC_URI,
  LARARIUM_DOC_URI,
  emptyLarDoc,
  mutableLarRecord,
  recipeUri,
  tiddlerText,
  wikiDraftLarUri,
  wikiLarUri,
} from "@lararium/mesh";
import type { VerbReactor } from "@lararium/tw5";
import { makeRequestId, stringArg } from "./handler-args.js";
import type { WikiHandlerOptions, WikiMintHandlerOptions } from "./wiki-handlers.js";

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
    const recipeTitle = recipeUri("@lararium", slug);

    const existingWikiRec = await opts.composite.get(wikiKey);
    const existingDraftRec = await opts.composite.get(draftKey);
    const existingRecipeRec = await opts.composite.get(recipeTitle);
    if (existingWikiRec && existingDraftRec && existingRecipeRec) {
      return {
        slug,
        status: "already-exists",
        wikiUri: wikiKey,
        wikiDocUrl: tiddlerText(existingWikiRec),
        draftBagId,
        draftDocUrl: tiddlerText(existingDraftRec),
        recipeUri: recipeTitle,
      };
    }

    const wikiDocUrl = tiddlerText(existingWikiRec);
    const draftDocUrl = tiddlerText(existingDraftRec);
    const wikiHandle = wikiDocUrl
      ? await opts.repo.find(wikiDocUrl as AutomergeUrl)
      : opts.repo.create(emptyLarDoc());
    const draftHandle = draftDocUrl
      ? await opts.repo.find(draftDocUrl as AutomergeUrl)
      : opts.repo.create(emptyLarDoc());

    if (!existingWikiRec) await wikiHandle.whenReady();
    if (!existingDraftRec) await draftHandle.whenReady();

    opts.catalogHandle.change((doc) => {
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
    });

    const updatedAt = new Date().toISOString();
    opts.islandHandle.change((doc) => {
      const tiddlers = doc.tiddlers as Record<string, LarTiddlerRecord>;
      tiddlers[recipeTitle] = mutableLarRecord(recipeTitle, {
        label: slug,
        "bag-stack": `${CATALOG_DOC_URI} ${LARARIUM_DOC_URI} ${LARES_DOC_URI} ${wikiKey} ${draftBagId}`,
        "writable-bag": draftBagId,
        "updated-at": updatedAt,
      }, "lares-cli:wiki-init");
    });

    return {
      slug,
      status: existingWikiRec ? "completed-partial" : "minted",
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
    const wikiRec = await opts.composite.get(wikiKey);
    if (!wikiRec) {
      throw new Error(`wiki "${slug}" not registered — run \`lares wiki init ${slug}\` first`);
    }

    const marker = await opts.composite.get(ACTIVE_WIKI_URI);
    if (readActiveWikiSlug(marker) === slug) {
      return { slug, status: "already-active", liveApplied: true };
    }

    const origin: ChangeOrigin = { kind: "lares-verb", requestId: makeRequestId("wiki") };
    const record: LarTiddlerRecord = buildActiveWikiRecord(slug, "lares-cli:wiki-open");
    await opts.composite.put(record, origin, { bag: ADMIN_BAG_ID });

    return {
      slug,
      status: "selected-for-next-boot",
      liveApplied: false,
      note: "active wiki marker updated; the current vessel keeps its mounted wiki until the next `lares serve` boot",
    };
  };
}