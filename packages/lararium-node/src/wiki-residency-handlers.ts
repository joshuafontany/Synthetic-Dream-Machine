import { bagStackFromRec, recipeUri } from "@lararium/mesh";
import type { JobHandler } from "./job-dispatcher.js";
import { stringArg } from "./handler-args.js";
import type { WikiResidencyOptions } from "./wiki-handlers.js";

/**
 * `lares wiki pin <slug>` — pin every bag in the wiki's recipe.
 *
 * Reads the recipe tiddler, walks `bag-stack`, calls residency.pin for
 * each bag URI. Reason field encodes "wiki:<slug>:<bagSlot>" so unpin can
 * identify which pins belong to this wiki.
 *
 * Returns { slug, recipeUri, pinned: [{ bagUrl, reason }] }.
 */
export function createPinWikiHandler(opts: WikiResidencyOptions): JobHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const recipeTitle = recipeUri("@lararium", slug);
    const recipeRec = await opts.composite.get(recipeTitle);
    if (!recipeRec) {
      throw new Error(`recipe not found for "${slug}" — run \`lares wiki init ${slug}\` first`);
    }

    const bagStack = bagStackFromRec(recipeRec);
    if (bagStack.length === 0) {
      return { slug, recipeUri: recipeTitle, pinned: [], note: "recipe has no bag-stack" };
    }

    const pinned: Array<{ bagUrl: string; reason: string }> = [];
    for (const bagUrl of bagStack) {
      const reason = `wiki:${slug}`;
      await opts.residency.pin(bagUrl, reason);
      pinned.push({ bagUrl, reason });
    }
    return { slug, recipeUri: recipeTitle, pinned };
  };
}

/**
 * `lares wiki unpin <slug>` — unpin every bag in the wiki's recipe.
 *
 * Walks the recipe's bag-stack and calls residency.unpin for each. Bags
 * that were pinned for OTHER reasons (e.g. boot:catalog from infrastructure
 * pins) lose their pin too — operator should re-pin those manually if they
 * want them back. The pin reason field doesn't gate unpin; it's
 * informational. Future refinement: scope unpin by reason prefix.
 */
export function createUnpinWikiHandler(opts: WikiResidencyOptions): JobHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const recipeTitle = recipeUri("@lararium", slug);
    const recipeRec = await opts.composite.get(recipeTitle);
    if (!recipeRec) {
      throw new Error(`recipe not found for "${slug}"`);
    }

    const bagStack = bagStackFromRec(recipeRec);
    const unpinned: string[] = [];
    for (const bagUrl of bagStack) {
      opts.residency.unpin(bagUrl);
      unpinned.push(bagUrl);
    }
    return { slug, recipeUri: recipeTitle, unpinned };
  };
}