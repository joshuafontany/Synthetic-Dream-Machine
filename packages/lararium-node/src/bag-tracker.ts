/**
 * bag-tracker — the relay-side `cid → holders` index that makes @cad discovery DHT-FREE.
 *
 * THE DISCOVERY AUTHORITY (canon: hint → peers → bag-tracker). A member fetching a sealed body broadcasts
 * `want-have(cid)` to its session peers and to the relay serving its Nexus; the relay answers from THIS index —
 * which members announced they hold that cid. That index REPLACES the global DHT stock Bitswap would fall to, so
 * discovery stays inside the Nexus causal island. A DHT, if ever added, sits behind an `@oracle` rendezvous (its
 * own causal-island boundary) — NEVER this path.
 *
 * SECRET-FREE, PLAINTEXT-BLIND. The tracker indexes CIDS and HOLDER handles only — never a body, never a read-cap,
 * never a per-Nexus secret. A cid is a self-proving content-address (`BLAKE3(ciphertext)`); the tracker moves no
 * bytes, so it can leak no plaintext. It is populated as a SIDE-EFFECT of a member sealing/announcing a body
 * (`noteInstalledBody` off `installSealedBody`) — the same encrypt-on-CAS path that lights the member lane.
 *
 * NO-GLOBAL-NOW. The index is a relay-LOCAL view: it holds what members have ANNOUNCED as-of-last-sync, never a
 * global truth of who holds what. A holder that drops offline lingers until `forget` prunes it; a member reads
 * "holders as the relay last heard", then verifies the fetched bytes itself (`verifyCiphertextCid`) — the tracker
 * is a HINT, never an authority on the bytes.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/bag-tracker
 */

import type { CasHolder } from "@lararium/mesh";
import type { InstalledSealedBody } from "./ciphertext-cas-seal.js";

/** A relay-local `cid → holders` hint index — DHT-free discovery over announced holders. */
export interface BagTracker {
  /** Announce that `holder` holds `cid` (idempotent — a holder is noted once per cid). */
  note(cid: string, holder: CasHolder): void;
  /** The holders the relay last heard for `cid`, in announce order (empty = the relay knows none — an honest miss). */
  holdersOf(cid: string): readonly CasHolder[];
  /** Prune a holder for one cid, or (holder omitted) drop the whole cid — an offline holder never lingers forever. */
  forget(cid: string, holder?: CasHolder): void;
  /** How many cids the index tracks (audit / test). */
  readonly size: number;
}

/** Stand an empty bag-tracker. Empty ⇒ every `holdersOf` is a miss (fail-closed discovery until a body announces). */
export function makeBagTracker(): BagTracker {
  const byCid = new Map<string, Set<CasHolder>>();
  return {
    note(cid: string, holder: CasHolder): void {
      let holders = byCid.get(cid);
      if (holders === undefined) { holders = new Set(); byCid.set(cid, holders); }
      holders.add(holder);
    },
    holdersOf(cid: string): readonly CasHolder[] {
      const holders = byCid.get(cid);
      return holders === undefined ? [] : [...holders];
    },
    forget(cid: string, holder?: CasHolder): void {
      if (holder === undefined) { byCid.delete(cid); return; }
      const holders = byCid.get(cid);
      if (holders === undefined) return;
      holders.delete(holder);
      if (holders.size === 0) byCid.delete(cid);
    },
    get size(): number { return byCid.size; },
  };
}

/**
 * The SIDE-EFFECT hook: note a freshly-installed sealed body on the tracker under the sealing member's holder
 * handle. Called RIGHT AFTER `installSealedBody` (which content-addresses + encrypts the body), so a cid reaches
 * the discovery index ONLY through the encrypt path — a cleartext body never announces, exactly as it never seals.
 */
export function noteInstalledBody(tracker: BagTracker, installed: InstalledSealedBody, self: CasHolder): void {
  tracker.note(installed.cid, self);
}
