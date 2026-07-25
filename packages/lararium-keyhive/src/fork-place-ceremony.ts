/**
 * fork-place-ceremony — FORK a captured cabal-realm over real Keyhive: found a FRESH
 * sentinel place, carry ONLY the survivors into it, leave the captors on the dead shell.
 * The escape half of the capture-answer (canon cabal-realm#the-unswept-corner).
 *
 * Exclude-by-omission: the captors are simply never added to the fresh sentinel, so they
 * hold no key to the fork — cleaner + stronger than convergent-removal (which evicts from
 * a place you keep; a fork is a place you leave). The survivors must already be KNOWN
 * agents to `provider` (they were members of the old place, so their contact cards are
 * in-scope — mirrors joinCabalRealm's precondition).
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { forkSurvivors, forkGenesisUri, type CabalRealm, type PlaceFork } from "@lararium/mesh";
import { foundCabalRealm, joinCabalRealm } from "./cabal-realm-ceremony.js";
import type { KeyhiveProvider } from "./keyhive-provider.js";

export interface ForkCabalRealmOpts {
  /** The fork's lar: bearing — defaults to the old genesis + a /fork path segment. */
  readonly newUri?: string;
  /** The fork's substrate URL — defaults to the old substrate + "-fork". */
  readonly substrateUrl?: string;
}

/**
 * FORK `oldPlace`, excluding `excludeHexes` (the captors). Founds a fresh sentinel place,
 * joins the survivors (old roster minus captors) to it, and returns the PlaceFork with the
 * continuity link. The captors are structurally absent — they were never added, so they
 * hold no membership key to the fork.
 */
export async function forkCabalRealm(
  provider:     KeyhiveProvider,
  oldPlace:     CabalRealm,
  oldRoster:    readonly string[],
  excludeHexes: readonly string[],
  opts:         ForkCabalRealmOpts = {},
): Promise<PlaceFork> {
  const survivors = forkSurvivors(oldRoster, excludeHexes);
  const newUri = opts.newUri ?? forkGenesisUri(oldPlace.genesisUri);
  const substrateUrl = opts.substrateUrl ?? `${oldPlace.substrateUrl}-fork`;

  const newPlace = await foundCabalRealm(provider, newUri, substrateUrl);
  for (const s of survivors) await joinCabalRealm(provider, newPlace, s);   // captors NOT in this set

  return { forkedFromDocIdHex: oldPlace.placeDocIdHex, newPlace, survivors, excluded: [...excludeHexes] };
}
