import type { AutomergeUrl, Repo } from "@automerge/automerge-repo";
import type { ChangeOrigin, LarTiddlerRecord } from "@lararium/mesh";
import {
  type LarDoc,
  AutomergeDocStore,
  LARARIUM_DOC_URI,
  bagStackFromRec,
  recipeUri,
} from "@lararium/mesh";
import type { VerbReactor } from "./job-dispatcher.js";
import { makeRequestId, stringArg } from "./handler-args.js";
import type { WikiComposeOptions } from "./wiki-handlers.js";

/**
 * `lares wiki add-bag <slug> <bag-uri> [--at <position>]` — add a bag to
 * the wiki's recipe at runtime.
 *
 * Idempotent: if the bag URL is already in the recipe stack, returns
 * "already-in-stack" without mutation.
 *
 * The bag must already resolve to an Automerge doc the daemon's repo
 * can find. Minting fresh bags is out of scope (`wiki init` or specific
 * mint ceremonies handle that).
 */
export function makeAddBagReactor(opts: WikiComposeOptions): VerbReactor {
  return async (args) => {
    const slug = stringArg(args, "slug");
    const bagUrl = stringArg(args, "bagUrl");
    if (!slug) throw new Error("args.slug is required");
    if (!bagUrl) throw new Error("args.bagUrl is required (the bag's lar: URI)");

    const recipeTitle = recipeUri("@lararium", slug);
    const recipeRec = await opts.composite.get(recipeTitle);
    if (!recipeRec) {
      throw new Error(`recipe not found for "${slug}" — run \`lares wiki init ${slug}\` first`);
    }

    const stack = bagStackFromRec(recipeRec);
    if (stack.includes(bagUrl)) {
      return { slug, recipeUri: recipeTitle, status: "already-in-stack", bagUrl };
    }

    const nextStack = [...stack, bagUrl];

    const origin: ChangeOrigin = { kind: "lares-job", requestId: makeRequestId("wiki") };
    const updated: LarTiddlerRecord = {
      tiddler: {
        ...recipeRec.tiddler,
        title: recipeRec.tiddler.title,
        "bag-stack": nextStack.join(" "),
        "updated-at": new Date().toISOString(),
      },
      meta: {
        ...(recipeRec.meta ?? {}),
        authority: recipeRec.meta?.authority ?? "lares-cli:wiki-add-bag",
      },
    };
    await opts.composite.put(updated, origin, { bag: LARARIUM_DOC_URI });

    let layerAdded = false;
    if (!opts.composite.hasBag(bagUrl)) {
      try {
        const oracleRec = await opts.composite.get(bagUrl);
        const docUrl = typeof oracleRec?.tiddler.text === "string" ? oracleRec.tiddler.text : null;
        if (docUrl) {
          const handle = await opts.repo.find<LarDoc>(docUrl as AutomergeUrl);
          await handle.whenReady();
          opts.composite.addLayer({
            bagId: bagUrl,
            store: new AutomergeDocStore(handle, bagUrl),
            writable: true,
          });
          layerAdded = true;
        }
      } catch (err) {
        return {
          slug,
          recipeUri: recipeTitle,
          status: "recipe-updated-layer-not-mounted",
          bagUrl,
          stack: nextStack,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    await opts.residency.pin(bagUrl, `wiki:${slug}`);

    return {
      slug,
      recipeUri: recipeTitle,
      status: layerAdded ? "added" : "added-recipe-only",
      bagUrl,
      stack: nextStack,
    };
  };
}

/**
 * `lares wiki remove-bag <slug> <bag-uri>` — remove a bag from the wiki's
 * recipe at runtime.
 *
 * Idempotent: if the bag URL isn't in the recipe stack, returns
 * "not-in-stack" without mutation.
 *
 * Soft remove: drops from the composite layer set; unpins residency.
 * Active StoryList reconciliation (Pattern 3 MNT_DETACH drain) lands in
 * F-arc when the TW5 vm refresh pipeline gets touched. For now, operator
 * tabs/state pointing into the removed bag may resolve to nothing.
 */
export function makeRemoveBagReactor(opts: WikiComposeOptions): VerbReactor {
  return async (args) => {
    const slug = stringArg(args, "slug");
    const bagUrl = stringArg(args, "bagUrl");
    if (!slug) throw new Error("args.slug is required");
    if (!bagUrl) throw new Error("args.bagUrl is required");

    const recipeTitle = recipeUri("@lararium", slug);
    const recipeRec = await opts.composite.get(recipeTitle);
    if (!recipeRec) {
      throw new Error(`recipe not found for "${slug}"`);
    }

    const stack = bagStackFromRec(recipeRec);
    if (!stack.includes(bagUrl)) {
      return { slug, recipeUri: recipeTitle, status: "not-in-stack", bagUrl };
    }

    const nextStack = stack.filter((u) => u !== bagUrl);

    const origin: ChangeOrigin = { kind: "lares-job", requestId: makeRequestId("wiki") };
    const updated: LarTiddlerRecord = {
      tiddler: {
        ...recipeRec.tiddler,
        title: recipeRec.tiddler.title,
        "bag-stack": nextStack.join(" "),
        "updated-at": new Date().toISOString(),
      },
      meta: {
        ...(recipeRec.meta ?? {}),
        authority: recipeRec.meta?.authority ?? "lares-cli:wiki-remove-bag",
      },
    };
    await opts.composite.put(updated, origin, { bag: LARARIUM_DOC_URI });

    let layerRemoved = false;
    if (opts.composite.hasBag(bagUrl)) {
      opts.composite.removeLayer(bagUrl);
      layerRemoved = true;
    }
    opts.residency.unpin(bagUrl);

    return {
      slug,
      recipeUri: recipeTitle,
      status: layerRemoved ? "removed" : "removed-recipe-only",
      bagUrl,
      stack: nextStack,
    };
  };
}