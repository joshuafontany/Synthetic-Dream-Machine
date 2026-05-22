/*\
title: lar:///ha.ka.ba/@lararium/tw5/modules/lar-promote
type: application/javascript
module-type: library
\*/
// @heleuma:required
/**
 * lar-promote — wiki-internal bag promotion library.
 *
 * Runs inside a TW5 wiki VM. The wiki's recipe stack surfaces oracle tiddlers
 * (kind="oracle") from the @lararium bag; each oracle tiddler's title is the
 * bag's lar: URI and carries `path-filter` + `mirror-root` fields so this
 * module can compute the correct `file-path` entirely inside the wiki layer.
 *
 * module-type: library  →  require()able by widgets and actions.
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/modules/lar-promote
 *
 * Design invariants:
 *   - Oracle tiddler title = bag URI (e.g. "lar:///ha.ka.ba/@lares").
 *   - `path-filter` field = TW5 filter operator string (e.g. "lar-bag-path[lares]").
 *   - `mirror-root` field = repo-relative path (e.g. "bags/@lares").
 *   - file-path = mirror-root + "/" + relPath  (pure string concat, no path.join).
 *   - Promote = write target bag copy first, tombstone wiki-bag copy second.
 *   - Tombstone routes to the default writable bag (wiki bag) via IslandAdaptor.
 *   - The @lares copy surfaces through the recipe stack once the wiki-bag copy
 *     is removed (wiki bag has HIGHER priority than @lares in recipe order).
 *
 * Imports only peer-law constants; Vite inlines them into the plugin module body.
 */

import { canonicalMirrorRelPathForBag } from "@lararium/mesh/mirror-paths";
import { buildPromotionReceiptFields } from "@lararium/mesh/promotion-ceremony";
import { LARARIUM_BAG_MIRROR_TAG, LARARIUM_DOC_URI, LARES_DOC_URI } from "@lararium/mesh/lar-uris";
import type { TW5Tiddler, TW5TiddlerConstructor, TW5Wiki } from "../types/tiddlywiki.d.ts";

/** Minimal promote contract over the real TW5 wiki surface. */
export type PromoteWiki = Pick<TW5Wiki, "getTiddler" | "filterTiddlers" | "addTiddler" | "deleteTiddler">;
type PromoteTiddler = Pick<TW5Tiddler, "fields">;
type PromoteFields = Readonly<Record<string, unknown> & { title: string }>;

export interface PromotePlannedRecord {
  title: string;
  fields: PromoteFields;
}

export interface PromoteResult {
  promoted: string[];
  skipped:  string[];
  childrenPromoted: string[];
  promotedTo: string;
  promotedAt: string;
  receipt?: string;
  error?:   string;
}

export interface PromotePlan extends PromoteResult {
  copies: PromotePlannedRecord[];
  tombstones: string[];
  receiptRecord?: PromotePlannedRecord;
}

export interface PromotePlanOptions {
  /** Operator identifier for the CRDT receipt. */
  actor?: string;
  /** Source bag, when the caller knows it. Browser/TW5 promotion may leave this implicit. */
  sourceBag?: string;
  /** Local runtime/vessel id for audit. */
  vesselId?: string;
  /** Deterministic receipt id supplied by job/ceremony dispatchers. */
  receiptId?: string;
  /** Set false only for dry-run planning. */
  writeReceipt?: boolean;
}

const BAG_MIRROR_TAG = LARARIUM_BAG_MIRROR_TAG;
const LARES_BAG_ID = LARES_DOC_URI;
const LARARIUM_BAG_ID = LARARIUM_DOC_URI;

function uniquePush(seen: Set<string>, target: string[], value: string): void {
  if (seen.has(value)) return;
  seen.add(value);
  target.push(value);
}

function expandPromotionUris(wiki: PromoteWiki, uris: readonly string[]): {
  ordered: string[];
  children: string[];
} {
  const ordered: string[] = [];
  const children: string[] = [];
  const seen = new Set<string>();

  for (const uri of uris) {
    uniquePush(seen, ordered, uri);
    const childPrefix = `${uri}#`;
    for (const child of wiki.filterTiddlers(`[prefix[${childPrefix}]]`)) {
      if (seen.has(child)) continue;
      seen.add(child);
      ordered.push(child);
      children.push(child);
    }
  }

  return { ordered, children };
}

function resolveOracle(lookupWiki: PromoteWiki, targetBagId: string): PromoteTiddler | undefined {
  if (targetBagId === LARES_BAG_ID) {
    return { fields: { title: targetBagId, "path-filter": "lar-bag-path[lares]", "mirror-root": "bags/@lares" } };
  }
  if (targetBagId === LARARIUM_BAG_ID) {
    return { fields: { title: targetBagId, "path-filter": "lar-bag-path[engine]", "mirror-root": "bags/@lararium" } };
  }

  const direct = lookupWiki.getTiddler(targetBagId);
  if (direct) return direct;

  const mirrorConfigTitle = lookupWiki.filterTiddlers(
    `[tag[${BAG_MIRROR_TAG}]field:bag-id[${targetBagId}]]`,
  )[0];
  return mirrorConfigTitle ? lookupWiki.getTiddler(mirrorConfigTitle) : undefined;
}

function resolveRelPath(wiki: PromoteWiki, uri: string, targetBagId: string, pathFilter: string): string | null {
  const canonical = canonicalMirrorRelPathForBag(uri, targetBagId);
  if (canonical) return canonical;

  const filterExpr = "[title[" + uri + "]" + pathFilter + "]";
  const relPaths = wiki.filterTiddlers(filterExpr);
  return relPaths && relPaths.length > 0 ? relPaths[0] ?? null : null;
}

/**
 * promoteUris — move tiddlers from the wiki bag into a canon bag.
 *
 * For each URI in `uris`:
 *   1. Read the target bag's oracle tiddler (title = targetBagId).
 *   2. Evaluate oracle's `path-filter` over [uri] to get the mirror-relative path.
 *   3. Set `bag` and `file-path` on the tiddler; write via wiki.addTiddler().
 *   4. Tombstone the wiki-bag copy via wiki.deleteTiddler() so @lares surfaces.
 *
 * @param tw     — the TW5 root object (provides Tiddler constructor)
 * @param wiki   — the TW5 wiki object ($tw.wiki)
 * @param uris   — lar: URIs to promote
 * @param targetBagId — e.g. "lar:///ha.ka.ba/@lares"
 */
export function promoteUris(
  tw:          { Tiddler: TW5TiddlerConstructor },
  wiki:        PromoteWiki,
  uris:        string[],
  targetBagId: string,
  lookupWiki:  PromoteWiki = wiki,
  options:     PromotePlanOptions = {},
): PromoteResult {
  const plan = planPromoteUris(wiki, uris, targetBagId, lookupWiki, options);
  if (plan.error) {
    return plan;
  }

  for (const copy of plan.copies) {
    wiki.addTiddler(new tw.Tiddler(copy.fields));
  }
  if (plan.receiptRecord) {
    wiki.addTiddler(new tw.Tiddler(plan.receiptRecord.fields));
  }
  for (const title of plan.tombstones) {
    wiki.deleteTiddler(title);
  }

  return {
    promoted: plan.promoted,
    skipped: plan.skipped,
    childrenPromoted: plan.childrenPromoted,
    promotedTo: plan.promotedTo,
    promotedAt: plan.promotedAt,
    ...(plan.receipt !== undefined && { receipt: plan.receipt }),
  };
}

export function planPromoteUris(
  wiki:        PromoteWiki,
  uris:        string[],
  targetBagId: string,
  lookupWiki:  PromoteWiki = wiki,
  options:     PromotePlanOptions = {},
): PromotePlan {
  const promotedAt = new Date().toISOString();
  const oracle = resolveOracle(lookupWiki, targetBagId);
  if (!oracle) {
    return {
      promoted: [],
      skipped: uris.slice(),
      childrenPromoted: [],
      promotedTo: targetBagId,
      promotedAt,
      copies: [],
      tombstones: [],
      error: "no oracle tiddler: " + targetBagId,
    };
  }

  const pathFilter = typeof oracle.fields["path-filter"] === "string" ? oracle.fields["path-filter"] : "";
  const mirrorRoot = typeof oracle.fields["mirror-root"] === "string" ? oracle.fields["mirror-root"] : "";
  if (!pathFilter || !mirrorRoot) {
    return {
      promoted: [],
      skipped:  uris.slice(),
      childrenPromoted: [],
      promotedTo: targetBagId,
      promotedAt,
      copies: [],
      tombstones: [],
      error:    "oracle missing path-filter/mirror-root: " + targetBagId,
    };
  }

  const expanded = expandPromotionUris(wiki, uris);
  const promoted: string[] = [];
  const skipped:  string[] = [];
  const copies: PromotePlannedRecord[] = [];
  const tombstones: string[] = [];

  for (const uri of expanded.ordered) {
    const existing = wiki.getTiddler(uri);
    if (!existing) { skipped.push(uri); continue; }

    const relPath = resolveRelPath(wiki, uri, targetBagId, pathFilter);
    if (!relPath) { skipped.push(uri); continue; }

    const filePath = mirrorRoot + "/" + relPath;

    copies.push({
      title: uri,
      fields: {
        ...existing.fields,
        title: uri,
        bag: targetBagId,
        "file-path": filePath,
      },
    });
    tombstones.push(uri);

    promoted.push(uri);
  }

  const childrenPromoted = expanded.children.filter((uri) => promoted.includes(uri));
  const receiptFields = (options.writeReceipt !== false && promoted.length > 0)
    ? buildPromotionReceiptFields({
          ...(options.receiptId !== undefined && { receiptId: options.receiptId }),
          actor: options.actor ?? "tw5-peer",
          ...(options.sourceBag !== undefined && { sourceBag: options.sourceBag }),
          targetBag: targetBagId,
          promoted,
          tombstoned: tombstones,
          skipped,
          childrenPromoted,
          promotedAt,
          ...(options.vesselId !== undefined && { vesselId: options.vesselId }),
        })
    : undefined;
  const receiptRecord = receiptFields ? { title: receiptFields.title, fields: receiptFields } : undefined;

  return {
    promoted,
    skipped,
    childrenPromoted,
    promotedTo: targetBagId,
    promotedAt,
    copies,
    tombstones,
    ...(receiptRecord !== undefined && { receiptRecord, receipt: receiptRecord.fields.title }),
  };
}
