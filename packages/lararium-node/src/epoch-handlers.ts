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

import type { Repo, AutomergeUrl } from "@automerge/automerge-repo";
import type { ChangeOrigin, LarTiddlerRecord } from "@lararium/mesh";
import {
  type CompositeStore,
  type LarDoc,
  type BagResidencyManager,
  emptyLarDoc, AutomergeDocStore, mutableLarRecord,
  wikiLarUri, LARARIUM_DOC_URI, recipeUri,
} from "@lararium/mesh";
import { bagStackFromRec } from "@lararium/mesh";
import type { VerbReactor } from "@lararium/tw5";
import { stringArg, makeRequestId } from "./handler-args.js";

export interface EpochHandlerOptions {
  readonly composite: CompositeStore;
  readonly repo:      Repo;
  readonly residency: BagResidencyManager;
  /** Catalog handle — needed to update the oracle tiddler that points at
   *  the bag's Automerge doc URL. */
  readonly catalogHandle: import("@automerge/automerge-repo").DocHandle<LarDoc>;
}

/**
 * `lares bag epoch <bag-url>` — snapshot-restart a single bag.
 *
 * Steps:
 *   1. Resolve old Automerge URL via composite read of the bag oracle.
 *   2. Open old doc; read all tiddlers (including tombstones).
 *   3. Mint new LarDoc with the materialized tiddler set.
 *   4. Update the catalog oracle tiddler's text to the new doc URL.
 *   5. Swap composite layer: removeLayer(old) + addLayer(new).
 *   6. Re-pin residency if the old bag was pinned.
 *
 * Returns { bagUrl, oldDocUrl, newDocUrl, tiddlerCount, tombstoneCount }.
 */
export function makeEpochBagReactor(opts: EpochHandlerOptions): VerbReactor {
  return async (args) => {
    const bagUrl = stringArg(args, "bagUrl");
    if (!bagUrl) throw new Error("args.bagUrl is required");

    // Find the oracle for the bag — looks for a tiddler whose title equals
    // the bag URL with `text` carrying the Automerge URL.
    const oracleRec = await opts.composite.get(bagUrl);
    const oldDocUrl = typeof oracleRec?.tiddler.text === "string" ? oracleRec.tiddler.text : null;
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

    // Update the catalog oracle tiddler. Direct catalog change — same
    // pattern as wiki-init's oracle write.
    opts.catalogHandle.change((doc) => {
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

    // Swap composite layer if the bag was mounted.
    let layerSwapped = false;
    if (opts.composite.hasBag(bagUrl)) {
      opts.composite.removeLayer(bagUrl);
      const writable = true;
      opts.composite.addLayer({
        bagId:    bagUrl,
        store:    new AutomergeDocStore(newHandle, bagUrl),
        writable,
      });
      layerSwapped = true;
    }

    // Re-pin if pinned (residency.pin is idempotent + name-keyed by URL,
    // and URL stays the same — composite-bagId, not Automerge-doc-URL).
    if (opts.residency.tier(bagUrl) === "pinned") {
      await opts.residency.pin(bagUrl, `epoch-rebound`);
    }

    return {
      bagUrl,
      oldDocUrl,
      newDocUrl:    newHandle.url,
      tiddlerCount,
      tombstoneCount,
      layerSwapped,
      note: "old doc retained in repo; prune via OS-level means or future GC",
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

export interface RotateRecipeOptions extends EpochHandlerOptions {}

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

    const wikiOracle = await opts.composite.get(wikiKey);
    const oldDocUrl  = typeof wikiOracle?.tiddler.text === "string" ? wikiOracle.tiddler.text : null;
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
    opts.catalogHandle.change((doc) => {
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

    // Layer swap if mounted, residency re-pin.
    let layerSwapped = false;
    if (opts.composite.hasBag(wikiKey)) {
      opts.composite.removeLayer(wikiKey);
      opts.composite.addLayer({
        bagId:    wikiKey,
        store:    new AutomergeDocStore(newHandle, wikiKey),
        writable: true,
      });
      layerSwapped = true;
    }
    if (opts.residency.tier(wikiKey) === "pinned") {
      await opts.residency.pin(wikiKey, `rotated-gen-${nextGen}`);
    }
    // Previous-canon ships cold; operator pin if they want it hot.
    opts.residency.registerCold(previousCanonUri);

    return {
      slug,
      generation:        nextGen,
      newCanonDocUrl:    newHandle.url,
      previousCanonUri,
      previousCanonDocUrl: oldDocUrl,
      stack:              nextStack,
      layerSwapped,
      note: "draft-drain into new canonical reserved for F-arc; operator can lift draft → new canon via a residency ACTION verb (`lares act MOVE`/`ADD`, Sprint 5)",
    };
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// Origin tag used by Epoch — reserved for future audit-log integration.
export const EPOCH_ORIGIN: ChangeOrigin = { kind: "lares-verb", requestId: "epoch" };
