/**
 * worker-data-verbs — read-only data-plane reactors that run IN the daemon worker.
 *
 * Sovereign-worker model (lararium-canonical-model, project-sovereign-worker-model):
 * the data-plane lives in the worker, registered via makeDaemonBehavior's `wireWorkerVerbs`
 * hook over the IslandContext, riding the dispatcher's verify-then-delegate gate for free.
 *
 * Two shapes here, per the grounded read/command rule:
 *  - READS (where · resolve · list-wikis) — read the worker's OWN synced replica
 *    (ctx.composite over syncPort); zero round-trip to main.
 *  - MUTATORS (pin · unpin · register-cold) — gate in-worker, then COMMAND the
 *    main-resident BagResidencyManager fire-and-forget via daemon:residency-op (policy
 *    decides in the worker; the main mechanism executes).
 * Runtime-only reads (residency `stats`) stay at the resource (main) — no askMain.
 */

import { tiddlerText, mkDaemonResidencyOp, mkDaemonWikiAlert, bagStackFromRec, recipeUri, wikiBagUri, type CompositeStore, type DaemonMsg_ResidencyOp, type DaemonMsg_WikiAlert, type LarDoc, type LarTiddlerRecord, type Repo } from "@lararium/mesh";
import { ACTIVE_WIKI_URI } from "./active-wiki.js";
import type { VerbReactor } from "./verb-dispatcher.js";
import { makeCatalogAccessor, type CatalogAccessor } from "./catalog-accessor.js";

/** Registry options for access-based reads: the daemon reaches ANY registered bag
 *  across both oracle planes (@catalog user + @oracle system) without mounting it. */
export interface RegistryReach {
  repo:       Repo;
  catalogUrl: string | null;
  oracleUrl:  string | null;
}

/** Titles in a registry doc that point at a resolvable doc (an `automerge:` URL) —
 *  the bags/wikis/drafts the accessor can reach. */
function listRegisteredDocUris(doc: LarDoc | undefined): string[] {
  const out: string[] = [];
  for (const [title, rec] of Object.entries(doc?.tiddlers ?? {})) {
    const text = tiddlerText(rec as LarTiddlerRecord);
    if (text && text.startsWith("automerge:")) out.push(title);
  }
  return out;
}

const WIKI_PREFIX = "lar:///ha.ka.ba/@lararium/wikis/";

/** A fire-and-forget poster for worker→main commands: residency-op (pin/unpin/
 *  register-cold) and wiki-alert (reboot-pending notice to affected live islands). */
export type ResidencyOpPost = (msg: DaemonMsg_ResidencyOp | DaemonMsg_WikiAlert) => void;
let _opSeq = 0;

/** Build a residency mutator reactor: gate the verb in-worker, command main's manager. */
function residencyVerb(op: "pin" | "unpin" | "register-cold", post: ResidencyOpPost): VerbReactor {
  return async (args) => {
    const bagId  = typeof args["url"] === "string" ? args["url"] : "";
    if (!bagId) throw new Error("args.url is required");
    const reason = typeof args["reason"] === "string" ? args["reason"] : undefined;
    post(mkDaemonResidencyOp({ requestId: `resop-${++_opSeq}`, op, bagId, ...(reason !== undefined ? { reason } : {}) }));
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

/** `where` — global membership query: which registered bags hold a tiddler.
 *  Access≠load (operator ruling, reopened hoike 2026-06-16): the daemon reaches
 *  EVERY registered bag across both oracle planes (@catalog user + @oracle
 *  system) plus its mounted composite — no mounting required. Returns membership.
 *  `scope` names the horizon: THIS operator's registry, never the DreamNet
 *  universe (no global now). Cascade-`primaryBag` only means something inside a
 *  recipe — it lives in `resolve`, recipe-scoped; here `primaryBag` is just the
 *  first holder found (membership convenience, not a cascade verdict). */
export function makeWhereReactor(composite: CompositeStore, reach?: RegistryReach): VerbReactor {
  return async (args) => {
    const tiddler = typeof args["tiddler"] === "string" ? args["tiddler"] : "";
    if (!tiddler) throw new Error("args.tiddler is required");
    // Fast base: the mounted composite (cascade order preserved here).
    const holding = new Set<string>(await composite.listBagsHolding(tiddler));
    // Extend by ACCESS across both registry planes — reach each registered doc.
    const planes = [reach?.catalogUrl, reach?.oracleUrl].filter((u): u is string => !!u);
    for (const planeUrl of planes) {
      if (!reach?.repo) break;
      const accessor = makeCatalogAccessor(reach.repo, planeUrl);
      const regDoc   = (await accessor.handle().catch(() => null))?.doc();
      for (const bagUri of listRegisteredDocUris(regDoc)) {
        if (holding.has(bagUri) || composite.hasBag(bagUri)) continue;
        const h   = await accessor.find(bagUri).catch(() => null);
        const rec = h?.doc()?.tiddlers?.[tiddler] as LarTiddlerRecord | undefined;
        if (rec && !rec.meta?.deleted) holding.add(bagUri);
      }
    }
    const bags = [...holding];
    return { tiddler, bags, primaryBag: bags[0] ?? null, scope: "operator-registry" };
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

/** `list-wikis` — enumerate the wikis registered in the catalog (oracle tiddlers).
 *  Reads @catalog via the accessor (access≠load) — the registry is NOT a loaded
 *  composite layer, so the old composite.listVisible() read returned nothing. */
export function makeListWikisReactor(catalog: CatalogAccessor, sysPlane?: CatalogAccessor): VerbReactor {
  return async () => {
    const wikis: Array<{ slug: string; uri: string; automergeUrl: string | null; kind: string }> = [];
    // User wikis — @catalog WIKI_PREFIX oracle pointers.
    const cat = await catalog.handle();
    for (const [title, rec] of Object.entries((cat.doc()?.tiddlers ?? {}) as Record<string, LarTiddlerRecord>)) {
      if (!title.startsWith(WIKI_PREFIX)) continue;
      if (rec.meta?.deleted) continue;               // skip tombstones (listVisible parity)
      const tail = title.slice(WIKI_PREFIX.length);
      if (tail.includes("/")) continue;
      wikis.push({ slug: tail, uri: title, automergeUrl: tiddlerText(rec), kind: "user" });
    }
    // System wikis — @oracle recipes (the @lares/@lararium quine system bags; two-plane
    // ruling 2026-06-16). Their recipe lives in @oracle, the wiki bag IS the @ bag.
    if (sysPlane) {
      const sys = await sysPlane.handle();
      const recipePrefix = recipeUri("@oracle", "");
      for (const [title, rec] of Object.entries((sys.doc()?.tiddlers ?? {}) as Record<string, LarTiddlerRecord>)) {
        if (!title.startsWith(recipePrefix)) continue;
        if (rec.meta?.deleted) continue;
        const slug = title.slice(recipePrefix.length);
        if (!slug || slug.includes("/")) continue;
        const bagUri = wikiBagUri(slug);
        wikis.push({ slug, uri: bagUri, automergeUrl: await sysPlane.urlOf(bagUri), kind: "system" });
      }
    }
    return { wikis };
  };
}

// ── Whole-wiki residency policy (pin-wiki / unpin-wiki) — worker-ward ──────────
// Pure policy: read the recipe (USER registry data in @catalog, via the accessor —
// access≠load), walk its bag-stack, COMMAND main's BagResidencyManager per bag via
// daemon:residency-op (the mechanism stays at the resource — the manager is pool-driven
// bookkeeping). No live composite layer mutation, so unlike add-bag/remove-bag these
// move cleanly.

/** `pin-wiki` — pin every bag in the wiki's recipe (worker policy → main manager). */
export function makeWikiPinReactor(catalog: CatalogAccessor, post: ResidencyOpPost): VerbReactor {
  return async (args) => {
    const slug = typeof args["slug"] === "string" ? args["slug"] : "";
    if (!slug) throw new Error("args.slug is required");
    const recipeTitle = recipeUri("@catalog", slug);
    const recipeRec = await catalog.recordOf(recipeTitle);
    if (!recipeRec) throw new Error(`recipe not found for "${slug}" — run \`lares wiki init ${slug}\` first`);
    const bagStack = bagStackFromRec(recipeRec);
    const pinned: Array<{ bagUrl: string; reason: string }> = [];
    for (const bagUrl of bagStack) {
      const reason = `wiki:${slug}`;
      post(mkDaemonResidencyOp({ requestId: `resop-${++_opSeq}`, op: "pin", bagId: bagUrl, reason }));
      pinned.push({ bagUrl, reason });
    }
    return { slug, recipeUri: recipeTitle, pinned, commanded: true };
  };
}

/** `unpin-wiki` — unpin every bag in the wiki's recipe (worker policy → main manager). */
export function makeWikiUnpinReactor(catalog: CatalogAccessor, post: ResidencyOpPost): VerbReactor {
  return async (args) => {
    const slug = typeof args["slug"] === "string" ? args["slug"] : "";
    if (!slug) throw new Error("args.slug is required");
    const recipeTitle = recipeUri("@catalog", slug);
    const recipeRec = await catalog.recordOf(recipeTitle);
    if (!recipeRec) throw new Error(`recipe not found for "${slug}"`);
    const bagStack = bagStackFromRec(recipeRec);
    const unpinned: string[] = [];
    for (const bagUrl of bagStack) {
      post(mkDaemonResidencyOp({ requestId: `resop-${++_opSeq}`, op: "unpin", bagId: bagUrl }));
      unpinned.push(bagUrl);
    }
    return { slug, recipeUri: recipeTitle, unpinned, commanded: true };
  };
}

// ── ward-alert — the disk ward's signal surfaces in the daemon VM ────────────
//
// A wiki island's projector refused a write (sovereign-island disk ward,
// disk-projection#write-ward). The signal rides the generic worker.event →
// placeVerb bridge into the daemon VM, which (a) writes a DURABLE audit record
// into @daemon — the operators-with-admin-grants surface — and (b) injects a
// $:/tags/Alert into the operator's currently PINNED VM via the existing
// wiki-alert rail (kind "disk-ward"). No cap-gate: the signal originates from
// the island's own mechanism, grants nothing, and only writes audit + alert.

/** Register as "ward-alert". `post` = ctx.post (DaemonMsg_WikiAlert rides it). */
export function makeWardAlertReactor(
  composite: CompositeStore,
  post: (msg: DaemonMsg_WikiAlert) => void,
): VerbReactor {
  return async (args) => {
    const bagId  = typeof args["bagId"]  === "string" ? args["bagId"]  : "(unknown bag)";
    const uri    = typeof args["uri"]    === "string" ? args["uri"]    : "(unknown uri)";
    const reason = typeof args["reason"] === "string" ? args["reason"] : "(no reason)";
    const ts     = new Date().toISOString();

    // (a) Durable audit in @daemon — append-only ledger, never coalesced.
    const auditTitle = `lar:///ha.ka.ba/@daemon/ledger/ward/${Date.now().toString(32)}-${Math.floor(Math.random() * 1e6).toString(32)}`;
    await composite.put(
      { tiddler: { title: auditTitle, "alert-kind": "disk-ward", bag: bagId, uri, reason, ts }, meta: { authority: "disk-ward" } },
      { kind: "lares-verb", requestId: `ward-${ts}` },
    );

    // (b) Alert the operator's currently pinned VM (the active wiki marker in @daemon).
    const marker = await composite.get(ACTIVE_WIKI_URI);
    const slug   = tiddlerText(marker) ?? null;
    if (slug) {
      post(mkDaemonWikiAlert({
        wikiSlug: slug,
        message:  `Disk ward refused a write (${bagId}): ${reason}`,
        cause:    "disk-ward",
        kind:     "disk-ward",
      }));
    }
    return { audited: auditTitle, alerted: slug ?? "none", bagId, uri };
  };
}
