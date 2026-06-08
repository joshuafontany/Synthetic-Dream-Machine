/**
 * worker-data-verbs — read-only data-plane reactors that run IN the admin worker.
 *
 * Sovereign-worker model (lararium-canonical-model, project-sovereign-worker-model):
 * the data-plane lives in the worker, registered via makeAdminBehavior's `wireWorkerVerbs`
 * hook over the IslandContext, riding the dispatcher's verify-then-delegate gate for free.
 *
 * Two shapes here, per the grounded read/command rule:
 *  - READS (where · resolve · list-wikis) — read the worker's OWN synced replica
 *    (ctx.composite over syncPort); zero round-trip to main.
 *  - MUTATORS (pin · unpin · register-cold) — gate in-worker, then COMMAND the
 *    main-resident BagResidencyManager fire-and-forget via admin:residency-op (policy
 *    decides in the worker; the main mechanism executes).
 * Runtime-only reads (residency `stats`) stay at the resource (main) — no askMain.
 */

import { tiddlerText, mkAdminResidencyOp, type CompositeStore, type AdminMsg_ResidencyOp } from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";

const WIKI_PREFIX = "lar:///ha.ka.ba/@lararium/wikis/";

/** A fire-and-forget poster for worker→main residency-op commands. */
export type ResidencyOpPost = (msg: AdminMsg_ResidencyOp) => void;
let _opSeq = 0;

/** Build a residency mutator reactor: gate the verb in-worker, command main's manager. */
function residencyVerb(op: "pin" | "unpin" | "register-cold", post: ResidencyOpPost): VerbReactor {
  return async (args) => {
    const bagId  = typeof args["url"] === "string" ? args["url"] : "";
    if (!bagId) throw new Error("args.url is required");
    const reason = typeof args["reason"] === "string" ? args["reason"] : undefined;
    post(mkAdminResidencyOp({ requestId: `resop-${++_opSeq}`, op, bagId, ...(reason !== undefined ? { reason } : {}) }));
    // Policy granted in-worker (keyhive-gated); main's BagResidencyManager executes.
    return { url: bagId, op, commanded: true, ...(reason !== undefined ? { reason } : {}) };
  };
}

/** `pin` — grant a bag pinned residency (worker policy → main manager). */
export const makePinReactor = (post: ResidencyOpPost): VerbReactor => residencyVerb("pin", post);
/** `unpin` — release a pin. */
export const makeUnpinReactor = (post: ResidencyOpPost): VerbReactor => residencyVerb("unpin", post);
/** `register-cold` — mark a bag known-but-not-loaded. */
export const makeRegisterColdReactor = (post: ResidencyOpPost): VerbReactor => residencyVerb("register-cold", post);

/** `where` — recipe-presence query: which bags hold a tiddler, highest-priority first. */
export function makeWhereReactor(composite: CompositeStore): VerbReactor {
  return async (args) => {
    const tiddler = typeof args["tiddler"] === "string" ? args["tiddler"] : "";
    if (!tiddler) throw new Error("args.tiddler is required");
    const bags = await composite.listBagsHolding(tiddler);
    return { tiddler, bags, primaryBag: bags[0] ?? null };
  };
}

/** `resolve` — Residency Model coordinate-inspection: live manifestations + tombstones. */
export function makeResolveReactor(composite: CompositeStore): VerbReactor {
  return async (args) => {
    const tiddler = typeof args["tiddler"] === "string" ? args["tiddler"] : "";
    if (!tiddler) throw new Error("args.tiddler is required");
    const live       = await composite.resolveAll(tiddler);
    const tombstones = await composite.listKapaeBags(tiddler);
    const manifestations = live.map((entry) => {
      const changeId = entry.record.meta?.changeId;
      return changeId !== undefined ? { bagId: entry.bagId, changeId } : { bagId: entry.bagId };
    });
    return { tiddler, manifestations, tombstones, winningBag: live[0]?.bagId ?? null };
  };
}

/** `list-wikis` — enumerate the wikis registered in the catalog (oracle tiddlers). */
export function makeListWikisReactor(composite: CompositeStore): VerbReactor {
  return async () => {
    const titles = await composite.listVisible();
    const wikis: Array<{ slug: string; uri: string; automergeUrl: string | null }> = [];
    for (const title of titles) {
      if (!title.startsWith(WIKI_PREFIX)) continue;
      const tail = title.slice(WIKI_PREFIX.length);
      if (tail.includes("/")) continue;
      const rec = await composite.get(title);
      wikis.push({ slug: tail, uri: title, automergeUrl: tiddlerText(rec) });
    }
    return { wikis };
  };
}
