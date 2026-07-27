/**
 * cas-transit — the REMOTE leg of `@cad` resolution: a member FETCHES a sealed ciphertext body it does not hold
 * locally, across the mesh, and VERIFIES it secret-free before it ever returns.
 *
 * THE SHAPE (modeled, not libp2p). A minimal Bitswap-style exchange over our OWN member↔relay transport — the
 * five messages, no dependency pulled: `want-have` / `have` / `dont-have` (discovery) and `want-block` / `block`
 * (fetch). A member broadcasts `want-have(cid)` to its session peers + the bag-tracker relay; holders answer
 * `have`, the rest `dont-have`; the member then `want-block`s a holder and receives the ciphertext `block`.
 *
 * DHT-FREE DISCOVERY (canon: hint → peers → bag-tracker). Discovery rides the EXISTING member↔relay connections
 * plus the relay's bag-tracker index (`cid → holders`) — NEVER a global DHT. Stock Bitswap falls to a DHT when no
 * session peer answers; HERE the bag-tracker IS that fallback authority, so the path stays inside the Nexus causal
 * island. A DHT, if ever added, sits BEHIND an `@oracle` rendezvous (its own causal-island boundary) — never this
 * path.
 *
 * SECRET-FREE VERIFY (verify-cap ⊥ read-cap). The relay serving the block AND the fetcher receiving it BOTH run
 * `verifyCiphertextCid(bytes, cid)` — `BLAKE3(bytes) == cid`, holding NO key, NO per-Nexus secret, NO read-cap.
 * The cid IS the integrity check (no auth tag — an immutable content-address). A tampered byte fails the recompute
 * at both ends. Only AFTER verify does the member decrypt with the read-cap it holds on the private keyhive lane —
 * the transit layer carries ciphertext and reads nothing.
 *
 * FAIL-CLOSED: bytes failing `BLAKE3(bytes) == cid` are REJECTED — never cached, never returned (a corrupt/hostile
 * relay cannot poison the local CAS). `dont-have` from every peer + the tracker resolves to `null` (an explicit
 * miss) — never a partial or unverified body. The relay holds only ciphertext + cid, so it cannot leak plaintext.
 *
 * DEFERRED (follow-on): the bao/BLAKE3 outboard tree for INCREMENTAL / range verification (Iroh's model — verify a
 * sub-range without the whole blob). Whole-blob `verifyCiphertextCid` is correct and sufficient today; bao is the
 * streaming upgrade, wire-compatible, and lands when large-body range-fetch needs it.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/content-resolution#cad-transit
 */

import { verifyCiphertextCid } from "./ciphertext-cas.js";

/** A holder handle — an opaque peer id the transport routes a `want-block` to (a session peer or the relay). */
export type CasHolder = string;

/** The five wire messages, modeled as a discriminated union — the shape, carried over our own transport. */
export type CasTransitMessage =
  | { readonly type: "want-have";  readonly cid: string }                         // discovery ask
  | { readonly type: "have";       readonly cid: string }                         // "I hold it"
  | { readonly type: "dont-have";  readonly cid: string }                         // "I do not"
  | { readonly type: "want-block"; readonly cid: string }                         // fetch ask
  | { readonly type: "block";      readonly cid: string; readonly bytes: Uint8Array };  // the ciphertext

/** Build a `want-have` (discovery broadcast). */
export const wantHave  = (cid: string): CasTransitMessage => ({ type: "want-have",  cid });
/** Build a `have` (a holder's affirmative). */
export const have      = (cid: string): CasTransitMessage => ({ type: "have",       cid });
/** Build a `dont-have` (a peer's miss). */
export const dontHave  = (cid: string): CasTransitMessage => ({ type: "dont-have",  cid });
/** Build a `want-block` (fetch a named holder). */
export const wantBlock = (cid: string): CasTransitMessage => ({ type: "want-block", cid });
/** Build a `block` (the ciphertext answer). */
export const block     = (cid: string, bytes: Uint8Array): CasTransitMessage => ({ type: "block", cid, bytes });

/**
 * The member's view of the transport — DHT-free by construction. `discover` broadcasts `want-have(cid)` to the
 * session peers + the bag-tracker relay and resolves the holders that answered `have` (empty = nobody has it).
 * `fetchBlock` `want-block`s ONE holder and resolves its ciphertext bytes, or `null` on a `dont-have` / a failed
 * transfer. NEITHER call carries any secret — the transport moves ciphertext + cids only.
 */
export interface CasTransitTransport {
  /** DHT-free discovery: want-have → the holders that answered HAVE (session peers ∪ bag-tracker). */
  discover(cid: string): Promise<readonly CasHolder[]>;
  /** want-block ONE holder → its ciphertext bytes, or `null` (dont-have / failed transfer). */
  fetchBlock(cid: string, holder: CasHolder): Promise<Uint8Array | null>;
}

/**
 * FETCH a sealed body over the mesh, verifying secret-free BEFORE returning. Discovers holders (DHT-free), then
 * `want-block`s each in turn until one returns bytes that recompute to the cid. The FETCHER re-verifies every
 * candidate (`verifyCiphertextCid`) — a relay's own serve-side check is never trusted blindly. Returns the
 * verified ciphertext, or `null` when NO holder yields verifying bytes (an explicit miss — never a partial or
 * unverified body). A holder that returns MIS-verifying bytes is skipped (a hostile relay cannot poison the read).
 */
export async function fetchCidOverTransit(
  cid: string,
  transport: CasTransitTransport,
): Promise<Uint8Array | null> {
  const holders = await transport.discover(cid);
  for (const holder of holders) {
    const bytes = await transport.fetchBlock(cid, holder);
    if (bytes === null) continue;                          // dont-have / failed — try the next holder
    if (verifyCiphertextCid(bytes, cid)) return bytes;     // secret-free verify PASSES → the one right answer
    // bytes present but BLAKE3(bytes) != cid → tampered/corrupt → REJECT, never cache, try the next holder
  }
  return null;                                             // dont-have everywhere → explicit fail-closed miss
}

/** A local CAS read: the bytes for a cid held on THIS island, or `null` on a local miss (the existing shore). */
export type LocalCasRead = (cid: string) => Uint8Array | null | Promise<Uint8Array | null>;
/** A local CAS write-through: cache a REMOTELY-fetched, ALREADY-VERIFIED body so the next read is local. */
export type LocalCasCache = (cid: string, bytes: Uint8Array) => void | Promise<void>;

/**
 * Compose the LOCAL-first `resolveByCid` with the REMOTE transit leg: try local; on a miss, fetch over transit
 * (DHT-free discovery + secret-free verify); cache the verified body write-through; return it. A remote body that
 * fails verify never reaches `cache` (only `fetchCidOverTransit`'s verified return path feeds it), so the local
 * CAS holds ONLY self-proving bytes. Still a miss everywhere → `null` (the caller faults, never reads a wrong body).
 */
export function makeCidResolver(
  local: LocalCasRead,
  transit: CasTransitTransport,
  cache: LocalCasCache,
): (cid: string) => Promise<Uint8Array | null> {
  return async (cid: string): Promise<Uint8Array | null> => {
    const localBytes = await local(cid);
    if (localBytes !== null) return localBytes;            // local hit — no transit
    const remote = await fetchCidOverTransit(cid, transit);
    if (remote === null) return null;                      // fail-closed miss
    await cache(cid, remote);                              // write-through the VERIFIED body (fetch already re-verified)
    return remote;
  };
}
