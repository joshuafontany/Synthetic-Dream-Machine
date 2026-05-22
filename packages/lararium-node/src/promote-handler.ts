/**
 * promote-handler — node projection for the TW5-native promote ceremony.
 *
 * Capability verification and bag mutation run vessel-local: the ceremony
 * executes inside the primary TW5 wiki engine (quine-law local to the VM)
 * and the node vessel contributes only hostful capabilities (disk, key access).
 */

import { type CompositeStore, bagScopedStore, type TW5TiddlerInputFieldsWithTitle } from "@lararium/mesh";
import { IslandAdaptor, planPromoteUris, type TW5Engine, type TW5Wiki } from "@lararium/tw5";
import { toLarTiddlerRecord } from "@lararium/mesh";
import type { JobHandler } from "./job-dispatcher.js";
import { stringArg, optionalStringArg } from "./handler-args.js";

function stringListField(value: unknown): string | string[] | undefined {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return typeof value === "string" ? value : undefined;
}

export interface PromoteHandlerOptions {
  readonly composite: CompositeStore;
  readonly getPrimaryEngine: () => TW5Engine;
  readonly getMirrorLookupWiki: () => TW5Wiki;
}

export function createPromoteHandler(opts: PromoteHandlerOptions): JobHandler {
  return async (args, ctx) => {
    const tiddler = stringArg(args, "tiddler");
    const toBag = stringArg(args, "toBag");
    const fromBagOpt = optionalStringArg(args, "fromBag");

    if (!tiddler) {
      throw new Error("args.tiddler is required (lar: URI of the tiddler to promote)");
    }
    if (!toBag) {
      throw new Error("args.toBag is required (target bag id)");
    }

    const proof = await ctx.cap("admin", toBag);
    if (!proof.ok) {
      throw new Error(`cap-denied: admin on ${toBag} required (${proof.reason ?? "no reason"})`);
    }

    const liveBags = await opts.composite.listBagsHolding(tiddler);
    if (liveBags.length === 0) {
      throw new Error(`tiddler not found in any live bag: ${tiddler}`);
    }

    const fallbackFromBag = liveBags[0];
    if (!fallbackFromBag) {
      throw new Error(`tiddler not found in any live bag: ${tiddler}`);
    }

    const actualFromBag = fromBagOpt && liveBags.includes(fromBagOpt)
      ? fromBagOpt
      : fallbackFromBag;

    if (fromBagOpt && !liveBags.includes(fromBagOpt)) {
      throw new Error(
        `source mismatch: args.fromBag=${fromBagOpt} doesn't hold a live record for ${tiddler}; live bags: ${liveBags.join(", ")}`,
      );
    }
    if (actualFromBag === toBag) {
      throw new Error(`target equals source: tiddler already lives in ${toBag}`);
    }
    if (!opts.composite.hasWritableBag(toBag)) {
      throw new Error(`target bag is not writable in this composite: ${toBag}`);
    }
    if (!opts.composite.hasWritableBag(actualFromBag)) {
      throw new Error(`source bag is not writable in this composite: ${actualFromBag}`);
    }

    const vm = opts.getPrimaryEngine();
    const result = planPromoteUris(vm.wiki, [tiddler], toBag, opts.getMirrorLookupWiki(), {
      actor: ctx.job.requestedBy,
      sourceBag: actualFromBag,
      vesselId: "node",
      receiptId: ctx.job.requestId,
    });

    if (result.error) {
      throw new Error(result.error);
    }
    if (!result.promoted.includes(tiddler)) {
      throw new Error(`tw5 promote did not produce a target copy for ${tiddler}`);
    }

    const sourceAdaptor = new IslandAdaptor(
      vm,
      bagScopedStore(opts.composite, actualFromBag),
      `promote-source:${ctx.job.requestId}`,
      actualFromBag,
    );
    const targetAdaptor = new IslandAdaptor(
      vm,
      bagScopedStore(opts.composite, toBag),
      `promote-target:${ctx.job.requestId}`,
      toBag,
    );

    for (const copy of result.copies) {
      const { title, tags, list, ...rest } = copy.fields;
      const nextRecord: TW5TiddlerInputFieldsWithTitle = { ...rest, title };
      const nextTags = stringListField(tags);
      const nextList = stringListField(list);
      if (nextTags !== undefined) nextRecord.tags = nextTags;
      if (nextList !== undefined) nextRecord.list = nextList;
      await targetAdaptor.saveRecord(toLarTiddlerRecord(nextRecord));
    }
    if (result.receiptRecord) {
      const { title, tags, list, ...rest } = result.receiptRecord.fields;
      const nextRecord: TW5TiddlerInputFieldsWithTitle = { ...rest, title };
      const nextTags = stringListField(tags);
      const nextList = stringListField(list);
      if (nextTags !== undefined) nextRecord.tags = nextTags;
      if (nextList !== undefined) nextRecord.list = nextList;
      await targetAdaptor.saveRecord(toLarTiddlerRecord(nextRecord));
    }
    for (const title of result.tombstones) {
      await sourceAdaptor.deleteTiddler(title);
    }

    return {
      tiddler,
      promotedFrom: actualFromBag,
      promotedTo: result.promotedTo,
      promotedAt: result.promotedAt,
      childrenPromoted: result.childrenPromoted,
      skipped: result.skipped,
      receipt: result.receipt,
    };
  };
}
