/**
 * cabal-realm-verbs — FEED a realm, and READ who feeds it, over the sovereign @daemon doc.
 *
 * A cabal-realm lives by being fed. Members roll a per-realm LEASE EPOCH — one slot per writer under the
 * @daemon bag — and the realm's liveness reads off that max-register. `realm-feed` rolls this writer's own
 * slot (the offering); `realm-clock` reads every slot back and reports who feeds and how deep.
 *
 * ONE WRITER, ONE SLOT. A writer touches only the slot it owns, so two members feeding concurrently never
 * clobber each other and the effective epoch never moves backward. That is the whole reason the lease rides a
 * slot-map rather than a scalar: a bare counter would let a concurrent write DROP a higher value, un-staling
 * grants the roll was meant to stale.
 *
 * THE CLOCK SURFACES, IT NEVER JUDGES. `realm-clock` hands back per-maintainer standing, the spread, and the
 * leading-set size as raw numbers, and emits no "captured" verdict — what spread counts as capture stays the
 * operator's calibration, and mechanizing it here would recreate the root the realm exists without. It also
 * reports a LOCAL SIGHTING: a maintainer whose roll has not synced reads as absent, and a realm nobody here
 * has synced reads as unfed. Under no-global-now those two generate identically.
 *
 * WHOSE HAND FEEDS. The writer rides as the persona-root DID the operator named — a FACE feeds a realm, not a
 * device, so adding vessels never inflates a standing. The honest bound: this daemon cannot re-verify from its
 * side that the caller custodies that root (the vault sits on the CLI's side of the sock), so the writer names
 * WHICH of the operator's own faces fed and never makes a claim about a stranger. A human running several of
 * their own faces at one realm reads as the Sybil-of-one the plane already prices socially, never in crypto.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import {
  realmLeaseSlotsFromBoard, realmFeedWrite, cabalRealmMaintenanceProvenance,
  type LarTiddlerStore, type LarTiddlerRecord, type LarDoc,
} from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";

/** Resolve a read+write store over the @daemon doc — where the per-writer lease slots live. */
export type ResolveDaemonStore = () => Promise<LarTiddlerStore>;

export interface CabalRealmVerbOptions {
  readonly resolveStore: ResolveDaemonStore;
}

/** A 64-hex realm doc id — a stray value never becomes a lease prefix. */
const REALM_RE = /^[0-9a-f]{64}$/;

function realmArg(args: Record<string, unknown>, verb: string): string {
  const raw = typeof args["realm"] === "string" ? (args["realm"] as string).trim().toLowerCase() : "";
  if (!REALM_RE.test(raw)) {
    throw new Error(`${verb}: \`realm\` must read as a 64-hex cabal-realm doc id`);
  }
  return raw;
}

/**
 * Gather the realm's lease slots by scanning the store for its prefix.
 *
 * The clock's own board read takes a whole LarDoc; a tiddler store hands titles one at a time, so this walks
 * the visible titles and rebuilds the same map. Reading through the store keeps the daemon's ONE access path
 * (access≠load) rather than reaching for a document the registry never named.
 */
async function leaseSlotsOf(store: LarTiddlerStore, realm: string): Promise<Map<string, string>> {
  const tiddlers: Record<string, LarTiddlerRecord> = {};
  for (const title of await store.listVisible()) {
    const record = await store.get(title);
    if (record) tiddlers[title] = record;
  }
  const doc: LarDoc = { schemaVersion: "lar/1", tiddlers };
  return realmLeaseSlotsFromBoard(doc, realm);
}

/**
 * realm-feed — the OFFERING: roll this writer's own lease slot for a realm, warming it.
 *
 * Idempotent in effect rather than in value: feeding twice rolls twice, and that reads as the point — the
 * clock measures how hard each hand feeds, so a repeated offering SHOULD register. Nothing here judges whether
 * enough hands fed.
 */
export function makeRealmFeedReactor(opts: CabalRealmVerbOptions): VerbReactor {
  return async (args) => {
    const realm  = realmArg(args, "realm-feed");
    const writer = typeof args["writer"] === "string" ? (args["writer"] as string).trim().toLowerCase() : "";
    if (!writer) throw new Error("realm-feed: `writer` is required — a realm is fed by a named face, never anonymously");

    const store = await opts.resolveStore();
    const slots = await leaseSlotsOf(store, realm);
    const feed  = realmFeedWrite(realm, writer, slots);

    const next: LarTiddlerRecord = {
      tiddler: { title: feed.slotUri, text: String(feed.epoch) } as LarTiddlerRecord["tiddler"],
      meta: { authority: "lares-verb" },
    };
    await store.put(next, { kind: "lares-verb", requestId: `realm-feed-${realm.slice(0, 8)}-${writer.slice(0, 8)}-${feed.epoch}` });

    return {
      verb: "realm-feed", realm, writer,
      epoch: feed.epoch, priorEffective: feed.priorEffective, first: feed.first,
      federated: false,
    };
  };
}

/**
 * realm-clock — the CAPTURE-CLOCK read: who feeds this realm, and how deep each has rolled.
 *
 * Verdict-free by construction. It reports the numbers a human reads to SEE a minority out-feeding a realm
 * while exit still costs little — the sight half of an answer whose other half is fork-as-exit, never a gate.
 */
export function makeRealmClockReactor(opts: CabalRealmVerbOptions): VerbReactor {
  return async (args) => {
    const realm = realmArg(args, "realm-clock");
    const store = await opts.resolveStore();
    const provenance = cabalRealmMaintenanceProvenance(realm, await leaseSlotsOf(store, realm));
    return { verb: "realm-clock", realm, ...provenance, federated: false };
  };
}

/** The two cabal-realm reactors over one @daemon store resolver — the bundle the daemon registers. */
export function makeCabalRealmReactors(opts: CabalRealmVerbOptions): { feed: VerbReactor; clock: VerbReactor } {
  return { feed: makeRealmFeedReactor(opts), clock: makeRealmClockReactor(opts) };
}
