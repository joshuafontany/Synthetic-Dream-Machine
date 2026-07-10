import type { AutomergeUrl } from "@lararium/mesh";
import type { ChangeOrigin, LarTiddlerRecord } from "@lararium/mesh";
import { type LarDoc, wikiDraftBagUri, wikiDraftDocKey } from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";
import { numberArg, stringArg } from "./handler-args.js";
import type { DraftHandlerOptions, PruneStaleOptions } from "./wiki-handler-options.js";

export function makeDraftReactor(opts: DraftHandlerOptions): VerbReactor {
  return async (args, ctx) => {
    const tiddler = stringArg(args, "tiddler");
    let toBag = stringArg(args, "toBag");
    if (!tiddler) throw new Error("args.tiddler is required (lar: URI to draft)");

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

    const origin: ChangeOrigin = { kind: "lares-verb", requestId: ctx.invocation.requestId };
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
      status: "drafted",
      draftedAt: new Date().toISOString(),
    };
  };
}

export function makePruneStaleReactor(opts: PruneStaleOptions): VerbReactor {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");
    const daysThreshold = numberArg(args, "daysThreshold", 7);

    const draftBagId = wikiDraftBagUri(slug);
    const did = await opts.operatorDid();
    const draftKey = wikiDraftDocKey(slug, did);
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