/**
 * epoch-handlers — DXOS-style snapshot-restart on a bag.
 *
 * The only local-first CRDT mechanism that actually bounds history. Mints
 * a NEW Automerge doc with the source bag's current materialized tiddlers
 * (no history); updates catalog oracle + composite layer to point at the
 * new doc; old doc remains in the repo (operator prunes later via OS-level
 * means or future GC sprint).
 *
 * Lossy by design. Pre-Epoch vessels that haven't synced through cannot
 * reconstruct the change graph from the new doc alone — they'd need the
 * old doc URL to recover. Acceptable at hobbyist scale per operator's
 * named version-bump-with-migration policy.
 *
 * Cassandra-derived rule honored: tombstones (records with deleted=true)
 * survive the Epoch. They migrate as first-class state, not history. A
 * tiddler deleted in bag-H to unshadow bag-L's copy must persist after
 * the Epoch or the deletion gets lost on restart.
 */

import type { Repo, AutomergeUrl } from "@lararium/mesh";
import type { ChangeOrigin, LarTiddlerRecord } from "@lararium/mesh";
import {
  type CompositeStore,
  type LarDoc,
  emptyLarDoc, mutableLarRecord, mkAdminResidencyOp,
  wikiLarUri, LARARIUM_DOC_URI, recipeUri,
} from "@lararium/mesh";
import { bagStackFromRec } from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";
import type { CatalogAccessor } from "./catalog-accessor.js";
import type { ResidencyOpPost } from "./worker-data-verbs.js";
import { stringArg, makeRequestId } from "./handler-args.js";

export interface EpochHandlerOptions {
  readonly repo:    Repo;
  /** Catalog accessor — updates the oracle tiddler that points at the bag's
   *  Automerge doc URL, via the registry doc (access≠load). */
  readonly catalog: CatalogAccessor;
}

/**
 * `lares bag epoch <bag-url>` — snapshot-restart a single bag.
 *
 * Steps (pono web3 — admin holds ACCESS, never reaches into a mounted wiki):
 *   1. Resolve old Automerge URL via the catalog accessor (access≠load).
 *   2. Open old doc; read all tiddlers (including tombstones).
 *   3. Mint new LarDoc with the materialized tiddler set.
 *   4. Update the catalog oracle tiddler's text to the new doc URL.
 *
 * The change SYNCS to every island holding the bag; each reconciles on its own
 * cadence (live recipe-watch is F-arc; today, next boot). The admin does NOT
 * hot-swap any running wiki's composite layer — that was web2 residue. Residency
 * needs no re-pin: the manager keys by the bag's lar-URI, which is unchanged
 * across the epoch (only the doc the oracle points at moves).
 *
 * Returns { bagUrl, oldDocUrl, newDocUrl, tiddlerCount, tombstoneCount }.
 */
export function makeEpochBagReactor(opts: EpochHandlerOptions): VerbReactor {
  return async (args) => {
    const bagUrl = stringArg(args, "bagUrl");
    if (!bagUrl) throw new Error("args.bagUrl is required");

    // Find the oracle for the bag — the bag→doc-URL mapping is a @catalog
    // registry entry, read via the accessor (access≠load), not the composite.
    const oldDocUrl = await opts.catalog.urlOf(bagUrl);
    if (!oldDocUrl) {
      throw new Error(`bag has no oracle: ${bagUrl}`);
    }

    // Open the old doc; enumerate every tiddler, tombstones included.
    const oldHandle = await opts.repo.find<LarDoc>(oldDocUrl as AutomergeUrl);
    await oldHandle.whenReady();
    const oldDoc   = oldHandle.doc();
    const oldEntry = (oldDoc?.tiddlers ?? {}) as Record<string, LarTiddlerRecord>;

    let tiddlerCount   = 0;
    let tombstoneCount = 0;

    // Mint a fresh doc and populate it with the materialized state.
    const newHandle = opts.repo.create<LarDoc>(emptyLarDoc());
    await newHandle.whenReady();
    newHandle.change((doc) => {
      const target = doc.tiddlers as Record<string, LarTiddlerRecord>;
      for (const [title, rec] of Object.entries(oldEntry)) {
        // Honor the Cassandra rule: tombstones survive Epochs as first-class
        // state. Carry deleted flag forward unchanged.
        target[title] = { ...rec };
        if (rec.meta?.deleted) tombstoneCount++;
        else             tiddlerCount++;
      }
    });

    // Update the catalog oracle tiddler. Reached through the registry doc —
    // same pattern as wiki-init's oracle write.
    const catalogHandle = await opts.catalog.handle();
    catalogHandle.change((doc) => {
      const tiddlers = doc.tiddlers as Record<string, LarTiddlerRecord>;
      const existing = tiddlers[bagUrl];
      tiddlers[bagUrl] = {
        tiddler: {
          ...(existing?.tiddler ?? { title: bagUrl }),
          title: bagUrl,
          text: newHandle.url,
          "epoch-at": new Date().toISOString(),
          "epoch-prev": oldDocUrl,
        },
        meta: {
          ...(existing?.meta ?? {}),
          authority: existing?.meta?.authority ?? "lares-cli:bag-epoch",
        },
      };
    });

    // No live-composite layer swap, no residency re-pin: the oracle change syncs;
    // islands reconcile on their own; the manager keys by the unchanged bag lar-URI.

    return {
      bagUrl,
      oldDocUrl,
      newDocUrl:    newHandle.url,
      tiddlerCount,
      tombstoneCount,
      note: "old doc retained in repo; oracle change syncs to islands (reconcile on next boot / F-arc live-watch); prune via OS-level means or future GC",
    };
  };
}

// ---------------------------------------------------------------------------
// rotate-recipe — Nix-generations stack rotation
// ---------------------------------------------------------------------------
//
// Whole-wiki "fresh start" lever. Composes Epoch (mint new canonical doc)
// with recipe mutation (insert old canonical as a previous-canon underlay
// slot at lower priority). Operator wants a clean canonical surface but
// keeps the old generation accessible read-only. Mirrors Nix's
// generation-pinning + GC pattern at the recipe granularity.

export interface RotateRecipeOptions extends EpochHandlerOptions {
  /** Recipe lives in @lararium (a loaded layer) — read/written via the composite. */
  readonly composite: CompositeStore;
  /** Residency-op poster — register-cold the previous-canon underlay (worker→main). */
  readonly post:      ResidencyOpPost;
}

/**
 * `lares wiki rotate-recipe <slug>` — fresh canonical, old retained as
 * previous-canon underlay.
 *
 * Steps:
 *   1. Mint a NEW canonical Automerge doc (fresh, empty).
 *   2. Compute the previous-canon underlay URI: wikiLarUri/canon/vN.
 *   3. Update catalog: wiki oracle's text → new doc URL; mint a
 *      previous-canon oracle whose text → old doc URL.
 *   4. Mutate recipe: keep wiki URI in stack at the same position
 *      (now points at new doc); insert previous-canon URI just BELOW
 *      it (lower priority). Old generations accumulate as deeper
 *      underlays.
 *   5. Re-pin residency for both URIs.
 *
 * Draft-drain into new canonical is deferred to F-arc routing rules.
 * Today the draft layer continues unchanged; operator can lift
 * draft → new canonical via residency ACTION verbs (Sprint 5 of the
 * Residency Model Epic ships `lares act MOVE`/`ADD`/`COPY`).
 */
export function makeRotateRecipeReactor(opts: RotateRecipeOptions): VerbReactor {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const wikiKey     = wikiLarUri(slug);
    const recipeTitle = recipeUri("@lararium", slug);

    const recipeRec = await opts.composite.get(recipeTitle);
    if (!recipeRec) throw new Error(`recipe not found for "${slug}" — run \`lares wiki init ${slug}\` first`);

    // Wiki oracle lives in @catalog — accessor read (recipe above stays composite,
    // it lives in @lararium, a real load layer).
    const oldDocUrl = await opts.catalog.urlOf(wikiKey);
    if (!oldDocUrl) throw new Error(`wiki oracle missing for "${slug}"`);

    // Compute the previous-canon URI. Walk existing stack to find the next
    // generation number; previous-canon URIs match canon/v\d+.
    const stack   = bagStackFromRec(recipeRec);
    const canonRe = new RegExp(`^${escapeRegExp(wikiKey)}/canon/v(\\d+)$`);
    let nextGen = 1;
    for (const url of stack) {
      const m = url.match(canonRe);
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n >= nextGen) nextGen = n + 1;
      }
    }
    const previousCanonUri = `${wikiKey}/canon/v${nextGen}`;

    // Mint fresh canonical doc.
    const newHandle = opts.repo.create<LarDoc>(emptyLarDoc());
    await newHandle.whenReady();

    // Update catalog: wiki oracle → new URL; previous-canon oracle → old URL.
    const catalogHandle = await opts.catalog.handle();
    catalogHandle.change((doc) => {
      const tiddlers = doc.tiddlers as Record<string, LarTiddlerRecord>;
      const existingWiki = tiddlers[wikiKey];
      tiddlers[wikiKey] = {
        tiddler: {
          ...(existingWiki?.tiddler ?? { title: wikiKey }),
          title: wikiKey,
          text: newHandle.url,
          "rotated-at": new Date().toISOString(),
          "rotated-prev": oldDocUrl,
          "rotation-gen": String(nextGen),
        },
        meta: {
          ...(existingWiki?.meta ?? {}),
          authority: existingWiki?.meta?.authority ?? "lares-cli:rotate-recipe",
        },
      };
      tiddlers[previousCanonUri] = mutableLarRecord(previousCanonUri, {
        text: oldDocUrl,
        kind: "previous-canon",
        rotation: String(nextGen),
        "frozen-at": new Date().toISOString(),
      }, "lares-cli:rotate-recipe");
    });

    // Mutate recipe: insert previous-canon just BELOW the wiki slot.
    const wikiIdx = stack.indexOf(wikiKey);
    const nextStack: string[] = wikiIdx >= 0
      ? [...stack.slice(0, wikiIdx), previousCanonUri, ...stack.slice(wikiIdx)]
      : [...stack, previousCanonUri, wikiKey];

    const origin: ChangeOrigin = { kind: "lares-verb", requestId: makeRequestId("rotate") };
    const updatedRecipe: LarTiddlerRecord = {
      tiddler: {
        ...recipeRec.tiddler,
        title: recipeRec.tiddler.title,
        "bag-stack": nextStack.join(" "),
        "updated-at": new Date().toISOString(),
        "rotation-gen": String(nextGen),
      },
      meta: {
        ...(recipeRec.meta ?? {}),
        authority: recipeRec.meta?.authority ?? "lares-cli:rotate-recipe",
      },
    };
    await opts.composite.put(updatedRecipe, origin, { bag: LARARIUM_DOC_URI });

    // No live-composite layer swap (oracle + recipe changes sync; islands reconcile),
    // no wiki re-pin (manager keys by the unchanged wikiKey lar-URI). Previous-canon is
    // a NEW bag → command main to register it cold via admin:residency-op.
    opts.post(mkAdminResidencyOp({ requestId: makeRequestId("resop"), op: "register-cold", bagId: previousCanonUri }));

    return {
      slug,
      generation:        nextGen,
      newCanonDocUrl:    newHandle.url,
      previousCanonUri,
      previousCanonDocUrl: oldDocUrl,
      stack:              nextStack,
      note: "oracle + recipe changes sync to islands (reconcile next boot / F-arc live-watch); draft-drain into new canonical reserved for F-arc (`lares act MOVE`/`ADD`)",
    };
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// Origin tag used by Epoch — reserved for future audit-log integration.
export const EPOCH_ORIGIN: ChangeOrigin = { kind: "lares-verb", requestId: "epoch" };
