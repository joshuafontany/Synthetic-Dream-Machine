/**
 * cas-wire — the @cad WIRE CONSUMER: a member CARRIES a sealed ciphertext body peer-to-peer over a real
 * request-response hop, gated by the member blind-transit lane, and the immune denial draws Mu on the same hop.
 *
 * THE TRANSPORT. The request-response rides the swappable `MembershipChannel` (offer/poll, deliver-once,
 * vessel→vessel) — the InMemory impl stands a real two-vessel hop for the proof; a live-WS impl drops in behind
 * the SAME interface, so the wire logic here never changes. A member `want-block(cid)`s a holder; the holder
 * answers a `cas-block` (the ciphertext) or `cas-mu` (the void).
 *
 * THE GATE (carry ⊥ read ⊥ contract). On a `want-block`, the server consults `memberCarryShareDecision` over the
 * cid's docId (`docIdForCiphertextCid`): a proven Nexus MEMBER over a PROVABLY-sealed plane opens the carry lane
 * and the server serves the CIPHERTEXT; a STRANGER, a NON-member, or a KAPAE'd presenter draws Mu. The server
 * serves ciphertext only — the read-cap NEVER rides this seam (it stays on the private keyring), so a member
 * carries what it may not be able to read (carry ⊥ read), and the requester re-verifies `BLAKE3(ciphertext)==cid`
 * SECRET-FREE (verify-cap) before trusting a byte.
 *
 * MU BYTE-INDISTINGUISHABILITY (denial ≡ satiety). The server draws the IDENTICAL `muVoidBytes()` for BOTH a
 * DENIED presenter (non-member / Kapae'd) AND a NOTHING-TO-SERVE peer (the cid is not held / already caught up).
 * An adversary reading the wire cannot tell "you are banned" from "there is nothing here" — the void closes the
 * surveillance seam at the same stroke it closes the immune one. A successful carry (`cas-block`) is naturally
 * different bytes — the indistinguishability is between DENY and CAUGHT-UP, never between deny and a served body.
 *
 * NO-GLOBAL-NOW: the antigen the gate consults is a local replica read as-of-last-sync — a partitioned peer sees
 * a ban only after re-sync (bounded, never instant). The antigen MUST be quorum-signed (the gate's `AntigenRing`
 * folds only quorum-verified bans) — never a lone-node censorship weapon.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/cas-wire
 */

import {
  memberCarryShareDecision, muVoidBytes, verifyCiphertextCid,
  type MembershipChannel,
  type AntigenRing, type FederationGate, type NexusMembership, type PlaneSeal,
} from "@lararium/mesh";
import type { DocumentId } from "@automerge/automerge-repo";
import { docIdForCiphertextCid } from "./ciphertext-cas-seal.js";
import { readCasBlobFromFs } from "./node-cas.js";

/** The wire message kinds — a served ciphertext block, a want-block ask, or the byte-identical void. */
export const CAS_WANT_BLOCK = "cas-want-block" as const;
export const CAS_BLOCK      = "cas-block" as const;
export const CAS_MU         = "cas-mu" as const;

/** The carry-lane gate + the served bytes the server composes on each request. */
export interface CasWireServerDeps {
  /** The @cad ciphertext tier the server serves bytes from (readCasBlobFromFs). */
  readonly cadDir:     string;
  /** The live sealed-plane oracle — only a PROVABLY-sealed docId carries (fail-closed: unknown → deny → Mu). */
  readonly seal:       PlaneSeal;
  /** The @nexus MEMBER consult — a STRANGER / non-member draws Mu (fail-closed: unconsultable → not a member). */
  readonly membership: NexusMembership;
  /** The Kapae antigen — a quorum-signed-banned presenter draws Mu (never a lone-node ban). */
  readonly antigen:    AntigenRing;
  /** The federatable-public floor gate — a sealed docId falls OUTSIDE it, so the member lane decides. */
  readonly fedGate:    FederationGate;
}

/**
 * Decide + serve ONE want-block: the member-lane gate over the cid's docId, then serve the ciphertext or the void.
 * Returns the RESPONSE PAYLOAD BYTES the server offers back — a served ciphertext, or `muVoidBytes()`. The void is
 * byte-identical whether the peer is DENIED or the cid is simply not held (denial ≡ satiety). Serves ciphertext
 * ONLY; the read-cap never rides here.
 */
export async function decideAndServeWantBlock(
  deps: CasWireServerDeps,
  peerId: string,
  cid: string,
): Promise<{ kind: typeof CAS_BLOCK; cid: string; bytes: Uint8Array } | { kind: typeof CAS_MU; bytes: Uint8Array }> {
  const docId: DocumentId = docIdForCiphertextCid(cid);
  // The carry-lane gate: a proven MEMBER over a PROVABLY-sealed plane, not Kapae'd. A relay peer is gated (in the
  // relayPeers set); a STRANGER / non-member / Kapae'd draws `false` — the SAME `false` a caught-up peer draws.
  const mayCarry = await memberCarryShareDecision(
    new Set<string>([peerId]),   // the requester is a gated relay peer
    deps.fedGate,                // the sealed docId is not federatable → the floor denies → the member lane decides
    deps.antigen,                // a Kapae'd presenter → Mu
    null,                        // the self-slot inner ring stays inert (identity = null), as everywhere
    deps.membership,             // MEMBER vs STRANGER
    deps.seal,                   // PROVABLY-sealed only
    peerId,
    docId,
  );
  if (!mayCarry) return { kind: CAS_MU, bytes: muVoidBytes() };            // DENY → Mu (byte-identical to satiety)
  const bytes = readCasBlobFromFs(cid, deps.cadDir);
  if (!bytes) return { kind: CAS_MU, bytes: muVoidBytes() };              // NOTHING TO SERVE → the SAME Mu (satiety)
  return { kind: CAS_BLOCK, cid, bytes };                                  // MEMBER + sealed + held → carry the ciphertext
}

/**
 * Drain every pending `want-block` addressed to `serverAddr` and offer back the decided response. One pass (a
 * caller loops / schedules it). A server never interprets a read-cap — it serves ciphertext or the void, nothing
 * else crosses. Returns how many requests it answered (audit / test).
 */
export async function serveCasWire(
  channel: MembershipChannel,
  serverAddr: string,
  deps: CasWireServerDeps,
): Promise<number> {
  const inbound = await channel.poll(serverAddr);
  let answered = 0;
  for (const env of inbound) {
    if (env.kind !== CAS_WANT_BLOCK) continue;
    const cid = typeof (env.payload as { cid?: unknown })?.cid === "string" ? (env.payload as { cid: string }).cid : "";
    if (!cid) continue;
    const response = await decideAndServeWantBlock(deps, env.from, cid);
    await channel.offer({ kind: response.kind, from: serverAddr, to: env.from, payload: response });
    answered += 1;
  }
  return answered;
}

/** The carried outcome of a wire fetch: the verified ciphertext (carry-cap held), or `null` (Mu / no verify). */
export interface CasWireFetch {
  /** The verified ciphertext bytes (BLAKE3==cid re-checked secret-free), or null on Mu / a mis-verify. */
  readonly ciphertext: Uint8Array | null;
  /** True when the response was the void (denied OR nothing-to-serve — the requester cannot tell which). */
  readonly drewMu:     boolean;
}

/**
 * FETCH a sealed cid over the hop: offer a `want-block`, run the server a turn, poll the response. On a `cas-block`
 * the requester re-verifies `BLAKE3(ciphertext)==cid` SECRET-FREE before trusting it (a mis-verifying block is
 * rejected → null); on `cas-mu` it drew the void (denied or nothing — indistinguishable). The read-cap is NOT used
 * here: this returns CIPHERTEXT (the carry). Reading (decrypt) is a SEPARATE step, only for a keyring-holder.
 */
export async function fetchSealedCidOverWire(args: {
  readonly channel:    MembershipChannel;
  readonly requester:  string;
  readonly serverAddr: string;
  readonly cid:        string;
  readonly serverDeps: CasWireServerDeps;
}): Promise<CasWireFetch> {
  await args.channel.offer({ kind: CAS_WANT_BLOCK, from: args.requester, to: args.serverAddr, payload: { cid: args.cid } });
  await serveCasWire(args.channel, args.serverAddr, args.serverDeps);   // the server answers the pending want-block
  const responses = await args.channel.poll(args.requester);
  for (const env of responses) {
    if (env.kind === CAS_BLOCK) {
      const bytes = (env.payload as { bytes?: Uint8Array }).bytes;
      if (bytes && verifyCiphertextCid(bytes, args.cid)) return { ciphertext: bytes, drewMu: false };   // verify-cap holds
      return { ciphertext: null, drewMu: false };   // a mis-verifying block is rejected (a hostile holder cannot poison)
    }
    if (env.kind === CAS_MU) return { ciphertext: null, drewMu: true };   // the void — denied OR nothing (indistinguishable)
  }
  return { ciphertext: null, drewMu: true };   // no response → the same void (the requester learns nothing more)
}

/** The exact bytes the server puts on the wire for a void response — for a byte-identical-Mu proof across reasons. */
export function muWireBytes(): Uint8Array {
  return muVoidBytes();
}
