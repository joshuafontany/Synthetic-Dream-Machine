/**
 * fork-realm — FORK-AS-EXIT, the capture-answer's ESCAPE half (pairs the capture-CLOCK's
 * sight). When persistence ≠ legitimacy bites — a hostile minority out-maintains an
 * apathetic majority and holds a captured realm — the legitimate maintainers carry the
 * realm's life into a FRESH realm that STRUCTURALLY EXCLUDES the captors (a new
 * content-addressed identity + epoch they cannot follow), and each vessel RE-POINTS its
 * own petname to the fork. The captured shell cools alone.
 *
 * Canon: cabal-realm#the-unswept-corner (fork-as-exit PRIMARY; the Steem→Hive
 * airdrop-exclusion made native). Two moves, both cheap (Hirschman: exit disciplines a
 * captor only while forking stays cheap):
 *   · EXCLUDE BY OMISSION — the fork is a NEW realm; the captors are simply never added
 *     to it (cleaner than convergent-removal, which evicts from a realm you KEEP; a fork
 *     is a realm you LEAVE). They hold the dead shell, not the living fork.
 *   · RE-POINT (Zooko) — each vessel updates its OWN local realm-pointer old→new. The id
 *     changing is the FEATURE: no global consensus, no admitter re-anchors the name.
 * Legitimacy re-anchors via CONTINUITY (Vitalik #1): the fork records forkedFrom, so the
 * fork that preserves the pre-capture membership inherits the default legitimacy.
 *
 * This floor is pure MODEL (survivor computation · re-point · continuity link); the actual
 * founding of the fresh realm rides the Keyhive ceremony (fork-realm-ceremony.ts).
 *
 * Platform-blind: rides ./cabal-realm only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import type { CabalRealm } from "./cabal-realm.js";

/**
 * A fork of a captured realm — a fresh realm-identity carrying the legitimate maintainers,
 * the captors structurally absent, linked to the old realm for continuity.
 */
export interface RealmFork {
  /** CONTINUITY — the captured realm this forked FROM (legitimacy re-anchors via it). */
  readonly forkedFromDocIdHex: string;
  /** The fork — a fresh realm identity the captors cannot follow. */
  readonly newRealm: CabalRealm;
  /** The legitimate maintainers carried across into the fork. */
  readonly survivors: readonly string[];
  /** The captors — named for the record; NEVER added to the fork (excluded by omission). */
  readonly excluded: readonly string[];
}

/**
 * Compute the survivor set a fork carries — the old roster MINUS the captors. The captors
 * are excluded by omission (never added to the fresh realm), not by removal.
 */
export function forkSurvivors(oldDwellers: readonly string[], excludeHexes: readonly string[]): string[] {
  const ex = new Set(excludeHexes);
  return oldDwellers.filter((m) => !ex.has(m));
}

/**
 * Derive a fork's lar: bearing from the captured realm's genesis — a `/fork` path segment
 * (the three-term ROOT stays intact; the fork rides a path refinement). The realm's true
 * identity is its fresh content-addressed sentinel, not this bearing (lar: NAMES).
 */
export function forkGenesisUri(oldGenesisUri: string): string {
  return `${oldGenesisUri.replace(/\/+$/, "")}/fork`;
}

/**
 * A vessel RE-POINTS its own local realm-pointer to the fork (the Zooko move — local, no
 * consensus). A pointer at the captured realm moves to the fork; any other pointer is left
 * untouched. A captor's pointer stays on the dead shell (it is not in the fork).
 */
export function repointToFork(currentRealmDocIdHex: string, fork: RealmFork): string {
  return currentRealmDocIdHex === fork.forkedFromDocIdHex ? fork.newRealm.realmDocIdHex : currentRealmDocIdHex;
}
