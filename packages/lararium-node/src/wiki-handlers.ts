/**
 * wiki-handlers — command-tiddler handlers for whole-wiki operations.
 *
 * Reads composite for wiki oracle tiddlers under
 * `lar:///ha.ka.ba/@lararium/wikis/{slug}`. Each oracle tiddler's `text`
 * field carries the wiki's Automerge doc URL.
 *
 * E.4 ships the read-only handlers (list, which). E.5+ adds write handlers
 * (init, sync, pin, etc.) when the per-wiki mint ceremony lands.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Repo, DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import type { LarTiddlerRecord, ChangeOrigin } from "@lararium/mesh";
import { bagStackFromRec } from "@lararium/mesh";
import {
  type CompositeStore, type LarDoc, type BagResidencyManager,
  emptyLarDoc, ADMIN_BAG_ID, wikiLarUri, wikiDraftLarUri,
  CATALOG_DOC_URI, LARARIUM_DOC_URI, LARES_DOC_URI,
  AutomergeDocStore, mutableLarRecord, bagScopedStore, tiddlerText, recipeUri,
} from "@lararium/mesh";
import { IslandAdaptor, TW5Engine } from "@lararium/tw5";
import type { CommandHandler } from "./command-dispatcher.js";
import { stringArg, numberArg, makeRequestId } from "./handler-args.js";

const WIKI_PREFIX = "lar:///ha.ka.ba/@lararium/wikis/";


export interface WikiHandlerOptions {
  readonly composite: CompositeStore;
}

/** Options for handlers that need raw repo access to mint new docs.
 *  operatorDid resolves lazily so the registry can register before the
 *  keyhive bridge has finished booting.
 *  getPrimaryEngine resolves lazily (thunk) so the handler closure can
 *  capture it before TW5 finishes booting; safe because handlers only
 *  execute at command-dispatch time, well after the daemon reaches live. */
export interface WikiMintHandlerOptions {
  readonly composite:        CompositeStore;
  readonly repo:             Repo;
  readonly catalogHandle:    DocHandle<LarDoc>;
  readonly islandHandle:     DocHandle<LarDoc>;
  readonly operatorDid:      () => Promise<string> | string;
  readonly rootDir:          string;
  /** Returns the daemon's already-booted primary TW5Engine. */
  readonly getPrimaryEngine: () => TW5Engine;
}

/** Options for whole-wiki residency operations (pin/unpin). */
export interface WikiResidencyOptions {
  readonly composite: CompositeStore;
  readonly residency: BagResidencyManager;
}

/** Options for recipe-composition operations (add-bag / remove-bag).
 *  Combines mint surface (repo + composite) with residency for pin-on-add. */
export interface WikiComposeOptions {
  readonly composite: CompositeStore;
  readonly repo:      Repo;
  readonly residency: BagResidencyManager;
}

/**
 * `lares wiki list` — enumerate wikis registered in the catalog.
 *
 * Walks composite.listVisible(), filters titles matching the wiki oracle
 * shape, returns each as `{ slug, uri, automergeUrl }`. The Automerge URL
 * comes from the oracle tiddler's `text` field.
 */
export function createListWikisHandler(opts: WikiHandlerOptions): CommandHandler {
  return async () => {
    const titles  = await opts.composite.listVisible();
    const wikis: Array<{ slug: string; uri: string; automergeUrl: string | null }> = [];
    for (const title of titles) {
      if (!title.startsWith(WIKI_PREFIX)) continue;
      // Filter to direct children only — slug has no further `/`.
      const tail = title.slice(WIKI_PREFIX.length);
      if (tail.includes("/")) continue;
      const rec  = await opts.composite.get(title);
      wikis.push({
        slug:         tail,
        uri:          title,
        automergeUrl: tiddlerText(rec),
      });
    }
    return { wikis };
  };
}

// ---------------------------------------------------------------------------
// init — mint a new wiki end-to-end
// ---------------------------------------------------------------------------

/**
 * `lares wiki init <slug>` — mint a fresh wiki.
 *
 * Idempotent: if the wiki oracle tiddler already exists in the catalog,
 * returns the existing URLs without re-minting.
 *
 * Creates:
 *   - canonical bag: a fresh LarDoc Automerge doc, oracle tiddler
 *     in catalog at title `wikiLarUri(slug)`.
 *   - per-wiki draft bag: a fresh LarDoc, oracle tiddler in catalog
 *     at `${wikiLarUri(slug)}/drafts/${operatorDid}`.
 *   - recipe tiddler at `recipeUri("@lararium", slug)` with the default
 *     bag stack: catalog → lararium → lares → corpus children → wiki
 *     canonical → per-wiki draft.
 */
export function createInitWikiHandler(opts: WikiMintHandlerOptions): CommandHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required (the wiki name)");
    if (slug.includes("/") || slug.includes(" ")) {
      throw new Error(`invalid slug: "${slug}" (no slashes or spaces)`);
    }

    const did          = await opts.operatorDid();
    const wikiKey      = wikiLarUri(slug);
    const draftBagId   = wikiDraftLarUri(slug);
    const draftKey     = `${wikiKey}/drafts/${encodeURIComponent(did)}`;
    const recipeTitle  = recipeUri("@lararium", slug);

    // Idempotent skip — operator runs init twice, second run reports.
    const existingWikiRec   = await opts.composite.get(wikiKey);
    const existingDraftRec  = await opts.composite.get(draftKey);
    const existingRecipeRec = await opts.composite.get(recipeTitle);
    if (existingWikiRec && existingDraftRec && existingRecipeRec) {
      return {
        slug,
        status: "already-exists",
        wikiUri:     wikiKey,
        wikiDocUrl:  tiddlerText(existingWikiRec),
        draftBagId,
        draftDocUrl: tiddlerText(existingDraftRec),
        recipeUri:   recipeTitle,
      };
    }

    // Mint the docs we need.
    const wikiDocUrl = tiddlerText(existingWikiRec);
    const draftDocUrl = tiddlerText(existingDraftRec);
    const wikiHandle  = wikiDocUrl
      ? await opts.repo.find<LarDoc>(wikiDocUrl as AutomergeUrl)
      : opts.repo.create<LarDoc>(emptyLarDoc());
    const draftHandle = draftDocUrl
      ? await opts.repo.find<LarDoc>(draftDocUrl as AutomergeUrl)
      : opts.repo.create<LarDoc>(emptyLarDoc());

    // Wait for handle readiness before writing oracles (avoids URL race).
    if (!existingWikiRec)  await wikiHandle.whenReady();
    if (!existingDraftRec) await draftHandle.whenReady();

    // Write catalog oracles. Idempotent — overwrites with same values when
    // the doc already existed.
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

    // Write recipe tiddler directly into the lararium island doc via
    // islandHandle.change() — same authority-write pattern as catalog oracles.
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
      wikiUri:     wikiKey,
      wikiDocUrl:  wikiHandle.url,
      draftBagId,
      draftDocUrl: draftHandle.url,
      recipeUri:   recipeTitle,
    };
  };
}

// ---------------------------------------------------------------------------
// open — switch the daemon's active wiki (write an admin marker; restart-required)
// ---------------------------------------------------------------------------

const ACTIVE_WIKI_URI = `${ADMIN_BAG_ID}/active-wiki`;

/**
 * `lares wiki open <slug>` — set the daemon's active wiki marker.
 *
 * Writes a tiddler at `lar:///ha.ka.ba/@lararium/@admin/active-wiki` whose
 * `text` field carries the slug. The daemon reads this marker at boot and
 * mounts the matching wiki. Live re-mount lands in E.7 (hot-reload sprint);
 * E.5 minimum requires a daemon restart.
 *
 * Idempotent: setting to the current value returns "no-op".
 */
export function createOpenWikiHandler(opts: WikiHandlerOptions): CommandHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const wikiKey = wikiLarUri(slug);
    const wikiRec = await opts.composite.get(wikiKey);
    if (!wikiRec) {
      throw new Error(`wiki "${slug}" not registered — run \`lares wiki init ${slug}\` first`);
    }

    const marker = await opts.composite.get(ACTIVE_WIKI_URI);
    if (tiddlerText(marker) === slug) {
      return { slug, status: "already-active", restartRequired: false };
    }

    const origin: ChangeOrigin = { kind: "lares-command", requestId: makeRequestId("wiki") };
    const record: LarTiddlerRecord = {
      tiddler: {
        title: ACTIVE_WIKI_URI,
        text: slug,
        "updated-at": new Date().toISOString(),
      },
      meta: { authority: "lares-cli:wiki-open" },
    };
    await opts.composite.put(record, origin, { bag: ADMIN_BAG_ID });

    return {
      slug,
      status: "marker-set",
      restartRequired: true,
      hint: "restart `lares serve` to mount this wiki as the active wiki",
    };
  };
}

// ---------------------------------------------------------------------------
// sync — ingest wikis/@<slug>/memes/** files into the canonical bag
// ---------------------------------------------------------------------------

/**
 * `lares wiki sync <slug>` — disk → CRDT ingest.
 *
 * Walks `wikis/@<slug>/memes/**` for `.md` files. For each file, derives a
 * tiddler title from the iam `uri-path` field (or falls back to a path-
 * based URI), then hands the full carrier text to the target TW5 VM via
 * its normal deserializer ingestion path. The registered TW5
 * text/x-memetic-wikitext deserializer decomposes the carrier into parent
 * + `#fragment` children inside the VM. This handler then routes those
 * materialized VM tiddlers through the IslandAdaptor save path so every bag
 * mutation travels through the same VM-owned boundary as UI edits.
 *
 * Returns { slug, scanned, ingested, skipped, recordsIngested, errors[] }.
 */
export function createSyncWikiHandler(opts: WikiMintHandlerOptions): CommandHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const wikiKey = wikiLarUri(slug);
    const wikiRec = await opts.composite.get(wikiKey);
    if (!wikiRec || typeof wikiRec.tiddler.text !== "string") {
      throw new Error(`wiki "${slug}" not registered — run \`lares wiki init ${slug}\` first`);
    }

    const memesRoot = join(opts.rootDir, "wikis", `@${slug}`, "memes");
    if (!existsSync(memesRoot)) {
      return { slug, scanned: 0, ingested: 0, skipped: 0, errors: [], note: "no wikis/@<slug>/memes/ directory" };
    }

    const files: string[] = [];
    walkMemes(memesRoot, files);

    // Pono ingest law: decomposition happens inside the target TW5 VM. In
    // this alpha node the target VM is the mounted primary wiki; syncing an
    // unmounted wiki would require resurrecting the old host-side path, so it
    // is rejected until a real target-VM mount exists for that bag.
    if (!opts.composite.hasWritableBag(wikiKey)) {
      throw new Error(`wiki "${slug}" is not mounted in this daemon — open it before sync`);
    }
    const store = bagScopedStore(opts.composite, wikiKey);
    const vm = opts.getPrimaryEngine();
    const adaptor = new IslandAdaptor(vm, store, `wiki-sync:${slug}`, wikiKey);
    adaptor.start();
    adaptor.onSyncComplete("automerge");

    const errors: string[] = [];
    let ingested       = 0;
    let skipped        = 0;
    let recordsIngested = 0;

    try {
      for (const file of files) {
        try {
          const text = readFileSync(file, "utf8");
          const uri  = extractIamUri(text) ?? deriveUriFromPath(slug, memesRoot, file);
          const sourceFile = file.startsWith(opts.rootDir) ? file.slice(opts.rootDir.length + 1) : file;
          const syncedAt   = new Date().toISOString();

          const vmTiddlers = vm.ingestCarrier(uri, text, {
            "source-file": sourceFile,
            "synced-at":   syncedAt,
          });
          if (vmTiddlers.length === 0) {
            skipped++;
            continue;
          }

          const recordTitles = new Set(vmTiddlers.map((record) => record.tiddler.title));
          const staleTitles  = (await store.listVisible())
            .filter((title) => title.startsWith(`${uri}#`))
            .filter((title) => !recordTitles.has(title));

          let fileChanged = false;
          let fileRecordWrites = 0;

          for (const record of vmTiddlers) {
            await adaptor.saveRecord(record);
            fileRecordWrites++;
            fileChanged = true;
          }

          for (const title of staleTitles) {
            await adaptor.deleteTiddler(title);
            fileRecordWrites++;
            fileChanged = true;
          }

          recordsIngested += fileRecordWrites;
          if (fileChanged) ingested++;
          else skipped++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${file}: ${msg}`);
        }
      }
    } finally {
      adaptor.stop();
    }

    return { slug, scanned: files.length, ingested, skipped, recordsIngested, errors };
  };
}

// ---------------------------------------------------------------------------
// pin / unpin — whole-recipe residency operations
// ---------------------------------------------------------------------------

/**
 * `lares wiki pin <slug>` — pin every bag in the wiki's recipe.
 *
 * Reads the recipe tiddler, walks `bag-stack`, calls residency.pin for
 * each bag URI. Reason field encodes "wiki:<slug>:<bagSlot>" so unpin can
 * identify which pins belong to this wiki.
 *
 * Returns { slug, recipeUri, pinned: [{ bagUrl, reason }] }.
 */
export function createPinWikiHandler(opts: WikiResidencyOptions): CommandHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const recipeTitle = recipeUri("@lararium", slug);
    const recipeRec   = await opts.composite.get(recipeTitle);
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
export function createUnpinWikiHandler(opts: WikiResidencyOptions): CommandHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const recipeTitle = recipeUri("@lararium", slug);
    const recipeRec   = await opts.composite.get(recipeTitle);
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

// ---------------------------------------------------------------------------
// add-bag / remove-bag — recipe composition (E.7, hot-reload)
// ---------------------------------------------------------------------------
//
// Hot-reload patterns (research-informed):
//   * Pattern 5 (SQLite refcount) — addLayer/removeLayer respect refcount;
//     the composite already supports both operations natively.
//   * Pattern 3 (MNT_DETACH drain) — remove-bag does not eagerly drop the
//     handle; LRU sweeper handles eventual GC. Title-set delta + StoryList
//     reconciliation lands in F-arc.
//   * Pattern 1 (VS Code per-title delta) — composite emits subscribe
//     events for layer changes today; F-arc adds per-title delta wrapping
//     for the TW5 vm's refresh pipeline.
//
// E.7 minimum: mutate recipe + addLayer/removeLayer at runtime. Auto-pin
// on add (operator just declared the bag relevant). Soft remove on
// remove-bag — bag drops from layer set; residency loses its wiki:<slug>
// pin reference; LRU eventually evicts.

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
export function createAddBagHandler(opts: WikiComposeOptions): CommandHandler {
  return async (args) => {
    const slug   = stringArg(args, "slug");
    const bagUrl = stringArg(args, "bagUrl");
    if (!slug)   throw new Error("args.slug is required");
    if (!bagUrl) throw new Error("args.bagUrl is required (the bag's lar: URI)");

    const recipeTitle = recipeUri("@lararium", slug);
    const recipeRec   = await opts.composite.get(recipeTitle);
    if (!recipeRec) {
      throw new Error(`recipe not found for "${slug}" — run \`lares wiki init ${slug}\` first`);
    }

    const stack   = bagStackFromRec(recipeRec);
    if (stack.includes(bagUrl)) {
      return { slug, recipeUri: recipeTitle, status: "already-in-stack", bagUrl };
    }

    // Append to the end (highest priority slot — overlays everything below).
    const nextStack = [...stack, bagUrl];

    // Mutate the recipe tiddler.
    const origin: ChangeOrigin = { kind: "lares-command", requestId: makeRequestId("wiki") };
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

    // Add the layer to the live composite if not already present.
    let layerAdded = false;
    if (!opts.composite.hasBag(bagUrl)) {
      try {
        // Resolve the Automerge URL via composite read OR direct repo find.
        // The bag URL must already exist as a doc; try discovering its
        // automerge URL via a catalog oracle tiddler at the same URI.
        const oracleRec = await opts.composite.get(bagUrl);
        const docUrl = typeof oracleRec?.tiddler.text === "string" ? oracleRec.tiddler.text : null;
        if (docUrl) {
          const handle = await opts.repo.find<LarDoc>(docUrl as AutomergeUrl);
          await handle.whenReady();
          opts.composite.addLayer({
            bagId:    bagUrl,
            store:    new AutomergeDocStore(handle, bagUrl),
            writable: true,
          });
          layerAdded = true;
        }
      } catch (err) {
        // Layer-add failed; recipe mutation persists. Operator can retry.
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

    // Auto-pin: operator just declared this bag relevant. Pattern 5.
    await opts.residency.pin(bagUrl, `wiki:${slug}`);

    return {
      slug,
      recipeUri:  recipeTitle,
      status:     layerAdded ? "added" : "added-recipe-only",
      bagUrl,
      stack:      nextStack,
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
 * tabs/state pointing into the removed bag may resolve to nothing —
 * acceptable at hobbyist scale.
 */
export function createRemoveBagHandler(opts: WikiComposeOptions): CommandHandler {
  return async (args) => {
    const slug   = stringArg(args, "slug");
    const bagUrl = stringArg(args, "bagUrl");
    if (!slug)   throw new Error("args.slug is required");
    if (!bagUrl) throw new Error("args.bagUrl is required");

    const recipeTitle = recipeUri("@lararium", slug);
    const recipeRec   = await opts.composite.get(recipeTitle);
    if (!recipeRec) {
      throw new Error(`recipe not found for "${slug}"`);
    }

    const stack  = bagStackFromRec(recipeRec);
    if (!stack.includes(bagUrl)) {
      return { slug, recipeUri: recipeTitle, status: "not-in-stack", bagUrl };
    }

    const nextStack = stack.filter((u) => u !== bagUrl);

    // Mutate the recipe.
    const origin: ChangeOrigin = { kind: "lares-command", requestId: makeRequestId("wiki") };
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

    // Soft remove: composite.removeLayer + residency.unpin. The Automerge
    // doc handle stays in the repo; future re-add reuses it.
    let layerRemoved = false;
    if (opts.composite.hasBag(bagUrl)) {
      opts.composite.removeLayer(bagUrl);
      layerRemoved = true;
    }
    opts.residency.unpin(bagUrl);

    return {
      slug,
      recipeUri:    recipeTitle,
      status:       layerRemoved ? "removed" : "removed-recipe-only",
      bagUrl,
      stack:        nextStack,
    };
  };
}

// ---------------------------------------------------------------------------
// draft-from — copy a tiddler from a lower bag into a writable draft bag
// ---------------------------------------------------------------------------
//
// Operator wants to edit a meme that lives in a lower (read-only or non-
// active) bag. `lares draft <uri>` reads the current composite resolution
// for the URI, copies it into a writable draft bag (default: the composite's
// default-writable layer — the active wiki's draft), and leaves the source
// alone. Unlike promote, no tombstone is written and no source-writable
// check fires. The new draft copy overlays the original via composite
// priority; subsequent edits land in the draft; `lares promote` later
// publishes the draft into canon.
//
// This is the missing third leg of the promote ceremony for cross-wiki
// content: pull-into-draft → edit → promote. Without it, a meme synced
// from another wiki's bag (e.g. via `wiki sync`) is stuck — its record.bag
// points at a non-writable layer, and promote's source-writable assertion
// trips.

export interface DraftHandlerOptions {
  readonly composite: CompositeStore;
}

export function createDraftHandler(opts: DraftHandlerOptions): CommandHandler {
  return async (args, ctx) => {
    const tiddler = stringArg(args, "tiddler");
    let toBag     = stringArg(args, "toBag");
    if (!tiddler) throw new Error("args.tiddler is required (lar: URI to draft)");

    // Default target: the composite's default-writable bag — by convention the
    // active wiki's draft bag. Operator can override with explicit toBag.
    if (!toBag) {
      const fallback = opts.composite.defaultWritableBagId();
      if (!fallback) {
        throw new Error("no default writable bag available — pass toBag explicitly");
      }
      toBag = fallback;
    }

    const proof = await ctx.cap("admin", toBag);
    if (!proof.ok) {
      throw new Error(`cap-denied: admin on ${toBag} required (${proof.reason ?? "no reason"})`);
    }

    const record = await opts.composite.get(tiddler);
    if (!record) throw new Error(`tiddler not found: ${tiddler}`);

    const fromBag = (await opts.composite.listBagsHolding(tiddler))[0] ?? null;
    if (fromBag === toBag) {
      return { tiddler, toBag, fromBag, status: "already-in-target" };
    }

    if (!opts.composite.hasWritableBag(toBag)) {
      throw new Error(`target bag is not writable in this composite: ${toBag}`);
    }

    const origin: ChangeOrigin = { kind: "lares-command", requestId: ctx.command.requestId };
    const drafted: LarTiddlerRecord = {
      tiddler: {
        ...record.tiddler,
        title: record.tiddler.title,
        "drafted-from": fromBag ?? "(none)",
        "drafted-at": new Date().toISOString(),
      },
      meta: {
        ...(record.meta ?? {}),
        authority: "lares-draft",
      },
    };
    await opts.composite.put(drafted, origin, { bag: toBag });

    return {
      tiddler,
      fromBag,
      toBag,
      status:    "drafted",
      draftedAt: new Date().toISOString(),
    };
  };
}

// ---------------------------------------------------------------------------
// prune-stale — surface draft tiddlers that haven't been touched recently
// ---------------------------------------------------------------------------
//
// Read-only inspection. The "junk-drawer working bag" risk the research
// flagged: tiddlers edited into the draft bag that never get promoted to
// canon accumulate forever. Operator wants visibility before operator
// decides promote-or-prune (no mutation in this handler — operator runs
// `lares promote` or future `lares wiki sweep-draft` to act).
//
// Args: { slug, daysThreshold? } — default 7 days.
// Result: { slug, draftBagId, scanned, stale: [{ title, lastUpdate, daysIdle }] }.

export function createPruneStaleHandler(opts: WikiMintHandlerOptions): CommandHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");
    const daysThreshold = numberArg(args, "daysThreshold", 7);

    const draftBagId = wikiDraftLarUri(slug);
    const did        = await opts.operatorDid();
    const draftKey   = `${wikiLarUri(slug)}/drafts/${encodeURIComponent(did)}`;
    const draftOracle = await opts.composite.get(draftKey);
    if (!draftOracle || typeof draftOracle.tiddler.text !== "string") {
      throw new Error(`draft bag oracle missing for "${slug}" — run \`lares wiki init ${slug}\` first`);
    }

    const handle = await opts.repo.find<LarDoc>(draftOracle.tiddler.text as AutomergeUrl);
    await handle.whenReady();
    const docState = handle.doc();
    const tiddlers = (docState?.tiddlers ?? {}) as Record<string, LarTiddlerRecord>;

    const cutoffMs = Date.now() - daysThreshold * 86_400_000;
    const stale: Array<{ title: string; lastUpdate: string | null; daysIdle: number }> = [];
    let scanned = 0;
    for (const [title, rec] of Object.entries(tiddlers)) {
      if (rec.meta?.deleted) continue;
      scanned++;
      const lastUpdate = (typeof rec.tiddler["synced-at"] === "string" ? rec.tiddler["synced-at"] : undefined)
        ?? (typeof rec.tiddler["updated-at"] === "string" ? rec.tiddler["updated-at"] : undefined)
        ?? null;
      if (!lastUpdate) {
        // No timestamp at all — definitely stale-candidate.
        stale.push({ title, lastUpdate: null, daysIdle: -1 });
        continue;
      }
      const ts = Date.parse(lastUpdate);
      if (Number.isFinite(ts) && ts < cutoffMs) {
        const daysIdle = Math.floor((Date.now() - ts) / 86_400_000);
        stale.push({ title, lastUpdate, daysIdle });
      }
    }

    return {
      slug,
      draftBagId,
      daysThreshold,
      scanned,
      stale,
    };
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function walkMemes(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkMemes(full, out);
    } else if (entry.endsWith(".md")) {
      out.push(full);
    }
  }
}


/**
 * Extract the `uri-path` value from a memetic-wikitext iam toml block.
 * Cheap regex; we don't need full TOML parsing for this single field.
 * Returns the lar:/// URI, or null when no iam block matches.
 */
function extractIamUri(text: string): string | null {
  const iamMatch = text.match(/```toml iam\s*\n([\s\S]*?)\n```/);
  if (!iamMatch) return null;
  const block = iamMatch[1] ?? "";
  const uriPathMatch = block.match(/^uri-path\s*=\s*["']([^"']+)["']/m);
  if (!uriPathMatch) return null;
  const raw = uriPathMatch[1]!;
  return raw.startsWith("lar:///") ? raw : `lar:///${raw}`;
}

/**
 * Fallback URI derivation when no iam block declares uri-path. Uses the
 * file's path under wikis/@<slug>/memes/ as the URI suffix.
 */
function deriveUriFromPath(slug: string, memesRoot: string, file: string): string {
  const rel = file.slice(memesRoot.length + 1).replace(/\.md$/, "").replace(/\\/g, "/");
  return `${wikiLarUri(slug)}/memes/${rel}`;
}
