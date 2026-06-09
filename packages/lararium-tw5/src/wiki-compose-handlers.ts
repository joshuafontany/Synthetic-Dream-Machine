import type { LarTiddlerRecord } from "@lararium/mesh";
import {
  bagStackFromRec,
  recipeUri,
  mkAdminResidencyOp,
  mkAdminWikiAlert,
} from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";
import { makeRequestId, stringArg } from "./handler-args.js";
import type { WikiComposeOptions } from "./wiki-handler-options.js";

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

    // The user recipe lives in @catalog (registry) — read + write via the accessor.
    const recipeTitle = recipeUri("@catalog", slug);
    const recipeRec = await opts.catalog.recordOf(recipeTitle);
    if (!recipeRec) {
      throw new Error(`recipe not found for "${slug}" — run \`lares wiki init ${slug}\` first`);
    }

    const stack = bagStackFromRec(recipeRec);
    if (stack.includes(bagUrl)) {
      return { slug, recipeUri: recipeTitle, status: "already-in-stack", bagUrl };
    }

    const nextStack = [...stack, bagUrl];

    const updated: LarTiddlerRecord = {
      tiddler: {
        ...recipeRec.tiddler,
        title: recipeTitle,
        "bag-stack": nextStack.join(" "),
        "updated-at": new Date().toISOString(),
      },
      meta: {
        ...(recipeRec.meta ?? {}),
        authority: recipeRec.meta?.authority ?? "lares-cli:wiki-add-bag",
      },
    };
    const catalogHandle = await opts.catalog.handle();
    catalogHandle.change((doc) => { (doc.tiddlers as Record<string, LarTiddlerRecord>)[recipeTitle] = updated; });

    // Pono: no live-layer mount. The recipe change syncs; each island mounts the bag
    // when it reconciles its own stack. Command main to pin the bag's residency.
    opts.post(mkAdminResidencyOp({ requestId: makeRequestId("resop"), op: "pin", bagId: bagUrl, reason: `wiki:${slug}` }));
    // Reboot-pending: the recipe lives in @catalog (the island doesn't load it), so the
    // mount only applies on next boot — alert the live island.
    opts.post(mkAdminWikiAlert({ wikiSlug: slug, message: `Bag added to "${slug}" — reboot to mount it.`, cause: "add-bag" }));

    return {
      slug,
      recipeUri: recipeTitle,
      status: "added",
      bagUrl,
      stack: nextStack,
      rebootRequired: true,
      note: "recipe updated + synced; islands mount on reconcile (reboot — alert seeded to live island)",
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

    const recipeTitle = recipeUri("@catalog", slug);
    const recipeRec = await opts.catalog.recordOf(recipeTitle);
    if (!recipeRec) {
      throw new Error(`recipe not found for "${slug}"`);
    }

    const stack = bagStackFromRec(recipeRec);
    if (!stack.includes(bagUrl)) {
      return { slug, recipeUri: recipeTitle, status: "not-in-stack", bagUrl };
    }

    const nextStack = stack.filter((u) => u !== bagUrl);

    const updated: LarTiddlerRecord = {
      tiddler: {
        ...recipeRec.tiddler,
        title: recipeTitle,
        "bag-stack": nextStack.join(" "),
        "updated-at": new Date().toISOString(),
      },
      meta: {
        ...(recipeRec.meta ?? {}),
        authority: recipeRec.meta?.authority ?? "lares-cli:wiki-remove-bag",
      },
    };
    const catalogHandle = await opts.catalog.handle();
    catalogHandle.change((doc) => { (doc.tiddlers as Record<string, LarTiddlerRecord>)[recipeTitle] = updated; });

    // Pono: no live-layer unmount. The recipe change syncs; each island drops the bag
    // when it reconciles. Command main to release the bag's pin.
    opts.post(mkAdminResidencyOp({ requestId: makeRequestId("resop"), op: "unpin", bagId: bagUrl }));
    opts.post(mkAdminWikiAlert({ wikiSlug: slug, message: `Bag removed from "${slug}" — reboot to drop it.`, cause: "remove-bag" }));

    return {
      slug,
      recipeUri: recipeTitle,
      status: "removed",
      bagUrl,
      stack: nextStack,
      rebootRequired: true,
      note: "recipe updated + synced; islands drop on reconcile (reboot — alert seeded to live island)",
    };
  };
}