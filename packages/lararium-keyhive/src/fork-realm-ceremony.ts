/**
 * fork-realm-ceremony — FORK a captured cabal-realm over real Keyhive: found a FRESH
 * sentinel place, carry ONLY the survivors into it, leave the captors on the dead shell.
 * The escape half of the capture-answer (canon cabal-realm#the-unswept-corner).
 *
 * Exclude-by-omission: the captors are simply never added to the fresh sentinel, so they
 * hold no key to the fork — cleaner + stronger than convergent-removal (which evicts from
 * a place you keep; a fork is a place you leave). The survivors must already be KNOWN
 * agents to `provider` (they were members of the old place, so their contact cards are
 * in-scope — mirrors openDwelling's precondition).
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { forkSurvivors, forkGenesisUri, type CabalRealm, type RealmFork } from "@lararium/mesh";
import { foundCabalRealm, openDwelling } from "./cabal-realm-ceremony.js";
import type { KeyhiveProvider } from "./keyhive-provider.js";

export interface ForkCabalRealmOpts {
  /** The fork's lar: bearing — defaults to the old genesis + a /fork path segment. */
  readonly newUri?: string;
  /** The fork's substrate URL — defaults to the old substrate + "-fork". */
  readonly substrateUrl?: string;
}

/**
 * FORK `oldPlace`, excluding `excludeHexes` (the captors). Founds a fresh sentinel place,
 * joins the survivors (old roster minus captors) to it, and returns the RealmFork with the
 * continuity link. The captors are structurally absent — they were never added, so they
 * hold no membership key to the fork.
 */
export async function forkCabalRealm(
  provider:     KeyhiveProvider,
  oldPlace:     CabalRealm,
  oldDwellers:    readonly string[],
  excludeHexes: readonly string[],
  opts:         ForkCabalRealmOpts = {},
): Promise<RealmFork> {
  const survivors = forkSurvivors(oldDwellers, excludeHexes);
  const newUri = opts.newUri ?? forkGenesisUri(oldPlace.genesisUri);
  const substrateUrl = opts.substrateUrl ?? `${oldPlace.substrateUrl}-fork`;

  const newPlace = await foundCabalRealm(provider, newUri, substrateUrl);
  // EXCLUDE BY OMISSION — the survivors open dwellings in the fresh realm and the captors are simply
  // never opened. No eviction exists to run, because a realm holds no container to be put out of.
  for (const s of survivors) await openDwelling(provider, newPlace, s);

  return { forkedFromDocIdHex: oldPlace.placeDocIdHex, newPlace, survivors, excluded: [...excludeHexes] };
}
