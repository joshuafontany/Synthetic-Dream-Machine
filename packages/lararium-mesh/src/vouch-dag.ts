/**
 * vouch-dag — fold issued invites into the seed-rooted vouch DAG the lineage price walks.
 *
 * THE FEEDER. `admission-price` prices a crossing against a vouch DAG; nothing produced that DAG from the
 * invites the mesh actually issues. This is the seam: an accepted `CabalInvite` IS a directed edge
 * (voucher → joiner), and a run of them folds into the `VouchEdge[]` that `rankLineage` scores. Each
 * admission adds an edge, so the graph the NEXT admission prices against is the trace of every crossing
 * before it.
 *
 * CANONICALISE AT THE BOUNDARY, OR THE FOLD SILENTLY SEVERS. A principal appears twice in a lineage — once
 * as the JOINER of the invite that admitted it, once as the VOUCHER of an invite it later signs — and the
 * seed-rooted fold connects the two ONLY when both read as the same vertex. Transitivity IS the composition
 * "j vouches i ∧ i vouches k" over one `i` (EigenTrust, personalized PageRank, Advogato all require it;
 * UCAN makes it the `aud`=`iss` rule). Our identifiers arrive in two forms — a DID `0x<key>` and a raw
 * `<key>` hex — so the SAME principal would mint two vertices, its subtree would detach from the seed, and
 * its score would collapse to the ε-floor. The cure is one canonicaliser run over EVERY endpoint before it
 * touches the graph: connectivity becomes a byte-equality test on the raw key.
 *
 * CAP THE OUT-DEGREE, BECAUSE THE ATTACK EDGE IS THE CHOKE. By mass conservation a voucher's score SPLITS
 * across everyone it vouches for, so minting sybils downstream only re-divides the mass that already crossed
 * the voucher's own edge — a node cannot raise its impact by issuing more vouches (Appleseed's bottleneck
 * property; Levien's Advogato min-cut). The remaining lever is the number of attack EDGES, so a per-voucher
 * out-degree cap bounds the mass any one hand can inject. The cap never silently truncates — the fold reports
 * every edge it dropped.
 *
 * KEY SEPARATION IS A PRIVACY PLANE, NOT A SYBIL ONE. The `vouchKeyOf` resolver maps a joiner's
 * join-identity to the identity it will later present as a voucher. Its DEFAULT is identity — the
 * sybil-strong, privacy-weak baseline where a member vouches under the key it joined with. A non-identity
 * resolver enacts the persona key-separation (join under A, vouch under B), which buys UNLINKABILITY and
 * NOTHING for the sybil bound: a derived key never manufactures a second human, so the bound must already
 * hold at the join gate. A separated resolver additionally needs a common-origin proof to keep the graph
 * connected without publishing A↔B — that proof, and who anchors it, live on the privacy plane above this
 * module, never here.
 *
 * Platform-blind: rides ./cabal-invite + ./lineage-rank only. NO node: imports, no key, no I/O.
 * Meme: lar:///ha.ka.ba/lares/api/pono/lararium-identity#the-siege-gate
 */
import type { CabalInvite } from "./cabal-invite.js";
import type { VouchEdge } from "./lineage-rank.js";

/**
 * Canonicalise an identifier to the raw ed25519 verifying-key hex — the one form every graph endpoint reads
 * in, so a principal is ONE vertex whether it arrives as a DID or a raw key.
 *
 * Accepts the hex family the vouch graph carries: a `0x`-prefixed DID (`LarDid`) and a bare 64-char hex key.
 * A `did:key:z…` multibase form encodes the same key under a different alphabet; folding it in needs a
 * base58btc decode this module does not yet carry, so it FAILS LOUD rather than mint a second vertex for a
 * key already in the graph. A silent mis-canonicalisation is the exact bug this function exists to prevent.
 */
export function canonicalIdentity(id: string): string {
  const raw = id.startsWith("0x") || id.startsWith("0X") ? id.slice(2) : id;
  const lower = raw.toLowerCase();
  if (/^[0-9a-f]{64}$/.test(lower)) return lower;
  if (id.startsWith("did:key:")) {
    throw new Error(
      `canonicalIdentity: did:key form not yet decodable to raw key (${id.slice(0, 24)}…) — ` +
      `add a base58btc decode before folding did:key identifiers into the vouch graph`,
    );
  }
  throw new Error(`canonicalIdentity: not a canonicalisable identity (expected 0x<64hex> or <64hex>): ${id.slice(0, 24)}…`);
}

/** Maps a joiner's join-identity to the identity it will present as a voucher. Default: identity. */
export type VouchKeyResolver = (joinIdentity: string) => string;
const IDENTITY_RESOLVER: VouchKeyResolver = (id) => id;

/**
 * Derive the vouch edge an accepted invite declares: the signer VOUCHES for the invited key.
 *
 * `source` is the voucher (the invite's signer), `target` the joiner it names. Both endpoints run through
 * the canonicaliser; the target additionally runs through the resolver, so a key-separated joiner appears in
 * the graph under the identity it will later vouch with (default: the same identity it joined under).
 */
export function inviteToVouchEdge(
  invite: CabalInvite,
  vouchKeyOf: VouchKeyResolver = IDENTITY_RESOLVER,
): VouchEdge {
  return {
    voucher: canonicalIdentity(invite.voucherDid),
    joiner:  canonicalIdentity(vouchKeyOf(invite.joinerIdentityHex)),
  };
}

/** An invite dropped by the out-degree cap — surfaced, never silently swallowed. */
export interface CappedVouch {
  readonly voucher: string;
  readonly joiner:  string;
}

export interface VouchDag {
  /** The canonicalised edges the lineage fold scores. */
  readonly edges:  readonly VouchEdge[];
  /** Edges the per-voucher cap turned away, in arrival order — the attack-edge budget made visible. */
  readonly capped: readonly CappedVouch[];
}

/**
 * Fold a run of issued invites into the seed-rooted vouch DAG.
 *
 * Every endpoint is canonicalised (so one principal is one vertex), and each voucher's out-degree is capped
 * at `maxVouchesPerVoucher` — the choke that bounds the mass any single hand injects. Order matters: the cap
 * keeps a voucher's FIRST N vouches and turns the rest away into `capped`, so a caller reads exactly what the
 * budget dropped rather than trusting a silently shorter graph.
 *
 * The invites arrive already verified — `decideCabalJoin` / `admitToPlace` gate them; this fold assumes a
 * clean signed set and only shapes it into edges.
 */
export function vouchDagFromInvites(
  invites: readonly CabalInvite[],
  opts: { readonly vouchKeyOf?: VouchKeyResolver; readonly maxVouchesPerVoucher?: number } = {},
): VouchDag {
  const resolver = opts.vouchKeyOf ?? IDENTITY_RESOLVER;
  const cap      = opts.maxVouchesPerVoucher ?? Infinity;
  if (!(cap > 0)) throw new Error(`vouchDagFromInvites: maxVouchesPerVoucher must be > 0, got ${cap}`);

  const edges:  VouchEdge[]   = [];
  const capped: CappedVouch[] = [];
  const issued = new Map<string, number>();   // per-voucher out-degree spent so far

  for (const invite of invites) {
    const edge  = inviteToVouchEdge(invite, resolver);
    const spent = issued.get(edge.voucher) ?? 0;
    if (spent >= cap) {
      capped.push({ voucher: edge.voucher, joiner: edge.joiner });
      continue;
    }
    issued.set(edge.voucher, spent + 1);
    edges.push(edge);
  }
  return { edges, capped };
}
