/**
 * fork-realm-ceremony — FORK a captured cabal-realm over real Keyhive: found a FRESH
 * sentinel realm, carry ONLY the survivors into it, leave the captors on the dead shell.
 * The escape half of the capture-answer (canon cabal-realm#the-unswept-corner).
 *
 * Exclude-by-omission: no hand ever adds the captors to the fresh sentinel, so they
 * hold no key to the fork — cleaner + stronger than convergent-removal (which evicts from
 * a realm you keep; a fork names a realm you leave). The survivors must already stand KNOWN
 * agents to `provider` (they dwelt in the old realm, so their contact cards already stand
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
 * FORK `oldRealm`, excluding `excludeHexes` (the captors). Founds a fresh sentinel realm,
 * joins the survivors (old roster minus captors) to it, and returns the RealmFork with the
 * continuity link. The captors stand structurally absent — no hand ever added them, so they
 * hold no membership key to the fork.
 */
export async function forkCabalRealm(
  provider:     KeyhiveProvider,
  oldRealm:     CabalRealm,
  oldDwellers:    readonly string[],
  excludeHexes: readonly string[],
  opts:         ForkCabalRealmOpts = {},
): Promise<RealmFork> {
  const survivors = forkSurvivors(oldDwellers, excludeHexes);
  const newUri = opts.newUri ?? forkGenesisUri(oldRealm.genesisUri);
  const substrateUrl = opts.substrateUrl ?? `${oldRealm.substrateUrl}-fork`;

  const newRealm = await foundCabalRealm(provider, newUri, substrateUrl);
  // EXCLUDE BY OMISSION — the survivors open dwellings in the fresh realm and no hand ever opens the
  // captors one. No eviction exists to run, because a realm holds no container to put a party out of.
  for (const s of survivors) await openDwelling(provider, newRealm, s);

  return { forkedFromDocIdHex: oldRealm.realmDocIdHex, newRealm, survivors, excluded: [...excludeHexes] };
}
