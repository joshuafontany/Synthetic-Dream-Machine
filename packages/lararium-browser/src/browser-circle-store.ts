/**
 * browser-circle-store — the IndexedDB LOCAL adapters for the IoC follow on the browser: the private
 * CIRCLE-membership graph + the recogniser's HANDLE-BOOK, plus the compose wrapper the follow panel drives.
 *
 * The browser twins of the node-fs circle/handle-book stores. "Adding to a circle IS the follow; the graph
 * never federates; private to the owning node" (social-seed) — here the graph is an IndexedDB store, the same
 * local-first posture as the persona-petname store beside it. The never-federates wall is STRUCTURAL: no board
 * write exists in either seam. A future device-fleet adapter wraps the SAME `CircleStore` shape over a PRIVATE
 * bag for cross-vessel sync; the interface never moves.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-two-stacks
 */

import {
  HandleBook, composeFollow, composeUnfollow, listFollows,
  type HandleBookSnapshot, type CircleStore, type FollowResult, type FollowView, type HandleCard,
} from "@lararium/mesh";
import { openVesselIdb, idbGet, idbPut, idbKeys, CIRCLE_STORE, HANDLE_BOOK_STORE } from "./browser-vessel-identity.js";

const HANDLE_BOOK_KEY = "snapshot";

/**
 * Build the IDB CircleStore — the private follow-graph, keyed by circleId → nym[]. Every op reads/writes only
 * this vessel's IndexedDB; no board write exists on it, so the graph cannot reach the wire.
 */
export function makeBrowserCircleStore(idbName = "lares:vessel"): CircleStore {
  return {
    async add(circleId, nym) {
      const db = await openVesselIdb(idbName);
      const cur = (await idbGet<string[]>(db, CIRCLE_STORE, circleId)) ?? [];
      const set = new Set(cur); set.add(nym);
      await idbPut(db, CIRCLE_STORE, circleId, [...set].sort());
      db.close();
    },
    async remove(circleId, nym) {
      const db = await openVesselIdb(idbName);
      const cur = (await idbGet<string[]>(db, CIRCLE_STORE, circleId)) ?? [];
      const set = new Set(cur); set.delete(nym);
      await idbPut(db, CIRCLE_STORE, circleId, [...set].sort());
      db.close();
    },
    async members(circleId) {
      const db = await openVesselIdb(idbName);
      const cur = (await idbGet<string[]>(db, CIRCLE_STORE, circleId)) ?? [];
      db.close();
      return [...cur].sort();
    },
    async circles() {
      const db = await openVesselIdb(idbName);
      const keys = await idbKeys(db, CIRCLE_STORE);
      db.close();
      return keys.sort();
    },
  };
}

/** Load the recogniser's handle-book from IDB (empty when none / a torn record). The caller persists mutations
 *  via {@link saveBrowserHandleBook} after a follow — the book itself stays pure + I/O-free. */
export async function loadBrowserHandleBook(idbName = "lares:vessel"): Promise<HandleBook> {
  const db = await openVesselIdb(idbName);
  const snapshot = await idbGet<HandleBookSnapshot>(db, HANDLE_BOOK_STORE, HANDLE_BOOK_KEY);
  db.close();
  try { return new HandleBook(snapshot); }
  catch { return new HandleBook(); }   // a torn book reads empty — re-ingesting a card re-learns the nym
}

/** Persist the handle-book snapshot to IDB — the recogniser's private memory of others' keys + labels. */
export async function saveBrowserHandleBook(book: HandleBook, idbName = "lares:vessel"): Promise<void> {
  const db = await openVesselIdb(idbName);
  await idbPut(db, HANDLE_BOOK_STORE, HANDLE_BOOK_KEY, book.snapshot());
  db.close();
}

/**
 * browserComposeFollow — the browser's one-gesture follow: load the handle-book, run composeFollow over it +
 * the IDB CircleStore, persist the book. All three stores stay LOCAL; nothing hits the wire (federated:false).
 */
export async function browserComposeFollow(args: {
  readonly idbName?: string;
  readonly nym:      string;
  readonly circleId: string;
  readonly petname?: string | null;
  readonly card?:    HandleCard;
  readonly now?:     number;
}): Promise<FollowResult> {
  const idbName = args.idbName ?? "lares:vessel";
  const book    = await loadBrowserHandleBook(idbName);
  const circles = makeBrowserCircleStore(idbName);
  const result  = await composeFollow({
    book, circles, nym: args.nym, circleId: args.circleId,
    ...(args.petname !== undefined ? { petname: args.petname } : {}),
    ...(args.card ? { card: args.card } : {}),
    ...(args.now !== undefined ? { now: args.now } : {}),
  });
  await saveBrowserHandleBook(book, idbName);   // persist the card ingest / petname that landed on it
  return result;
}

/** The browser's unfollow — drop a nym from a circle (the handle-book memory stays). LOCAL only. */
export async function browserComposeUnfollow(args: {
  readonly idbName?: string; readonly nym: string; readonly circleId: string;
}): Promise<{ readonly nym: string; readonly circleId: string; readonly federated: false }> {
  return composeUnfollow({ circles: makeBrowserCircleStore(args.idbName ?? "lares:vessel"), nym: args.nym, circleId: args.circleId });
}

/** Read one circle's members back under the recogniser's OWN names (petname + last-seen glamour). A pure read. */
export async function browserListFollows(circleId: string, idbName = "lares:vessel"): Promise<FollowView[]> {
  const book = await loadBrowserHandleBook(idbName);
  return listFollows(book, makeBrowserCircleStore(idbName), circleId);
}
