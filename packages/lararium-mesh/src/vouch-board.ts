/**
 * vouch-board — the DOC face of the JOIN axis: the issued `CabalInvite`s a place has minted, from which the
 * seed-rooted lineage folds. Sibling to `carriage-board` (who carries) and `antigen-board` (who stands
 * banned) under one nexus-pubkey; this board answers WHO VOUCHED FOR WHOM.
 *
 * A vouch RIDES a board precisely because it carries attribution — a cabal-invite names its `voucherDid` in
 * the clear, and an invite nobody can attribute holds nobody to anything. The TRACELESS boot-invite
 * draws the deliberate contrast: it names no voucher, manufactures no social graph, and must NEVER gain a board.
 *
 * ── THE VERIFY RIDES MANDATORY, WHICH IS WHY NO UNVERIFIED READ EXISTS ───────────────────────────────────
 * `vouchDagFromInvites` states its precondition plainly: the invites arrive ALREADY VERIFIED. A reader that
 * handed back whatever tiddlers a board carried would break that precondition silently — and the break cuts
 * deeper than cosmetics: every invite reaching the DAG becomes a VOUCH EDGE, so anyone able to write the
 * board could mint unbounded lineage mass and price their own crossing to nothing. The carriage board can afford a
 * permissive extractor because its forgeries die at a quorum fold downstream; a vouch has no such second gate.
 *
 * So this module exposes ONE read, and that read takes a verifier. No `invitesFromBoard()` stands beside it
 * to reach for by mistake — designation carries authority, the same discipline the rest of the mesh
 * holds. A signature that fails against the `voucherDid` the invite itself names DROPS, and a
 * dropped invite reads as one that never arrived (withhold, never forge).
 *
 * STORAGE CONVENTION (mirrors carriage-board): each invite rides ONE tiddler whose `text` carries the invite
 * JSON. Keyed by place/voucher/joiner, so distinct vouchers vouching the SAME joiner accrete as the distinct
 * edges they carry, while one voucher re-issuing to one joiner stays idempotent — a voucher cannot inflate its
 * own out-degree by re-minting, which would otherwise dilute its other children for free.
 *
 * Platform-blind: rides ./base-doc + ./cabal-invite only. NO node: imports — the repo resolution of the board
 * handle lives in the node holder, which hands a read `LarDoc` in.
 * Meme: lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage#the-standing
 */

import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord, tiddlerText } from "./base-doc.js";
import { CABAL_INVITE_DOMAIN, cabalInviteBytes, type CabalInvite } from "./cabal-invite.js";
import { sha256HexSync, canonicalJson } from "./crypto.js";

/**
 * The relationship id a vouch presents to the kāpae plane — the voucher→joiner edge inside one place.
 *
 * A voucher WITHDRAWING a vouch raises a shadow over this id. That reads differently from an EXPIRY: an
 * expired vouch simply no longer stands and a fresh one may replace it, while a withdrawn one stays set
 * aside, so re-minting the same edge cannot resurrect the standing it once carried.
 */
export function vouchEdgeId(invite: CabalInvite): string {
  return sha256HexSync(canonicalJson({
    kind: "lar-vouch-edge/v1",
    placeDocIdHex:     invite.placeDocIdHex,
    voucherDid:        invite.voucherDid,
    joinerIdentityHex: invite.joinerIdentityHex,
  }));
}

/** The tiddler-key prefix every issued vouch rides under — on the DreamNet plane, namespaced apart. */
export const VOUCH_ENTRY_PREFIX = "lar:///ha.ka.ba/dreamnet/vouch-registry/" as const;

/**
 * The tiddler key one vouch rides under. Place + voucher + joiner: two vouchers vouching one joiner land on
 * DISTINCT keys and both survive (two real edges), while one voucher re-issuing to one joiner lands on the
 * SAME key and stays one edge — re-minting must never buy out-degree.
 */
export function vouchEntryKey(placeDocIdHex: string, voucherDid: string, joinerIdentityHex: string): string {
  return `${VOUCH_ENTRY_PREFIX}${placeDocIdHex}/${voucherDid}/${joinerIdentityHex}`;
}

/**
 * Land a signed invite onto a board draft — the EXACT shape `verifiedVouchesFromBoard` reads back. Call
 * INSIDE a `handle.change()` callback. The signature rides inside the JSON, so re-carrying never re-signs;
 * this write adjudicates nothing, exactly as the read trusts nothing it has yet to verify.
 */
export function writeVouch(draft: LarDoc, invite: CabalInvite): void {
  const key = vouchEntryKey(invite.placeDocIdHex, invite.voucherDid, invite.joinerIdentityHex);
  draft.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(invite) }, invite.placeDocIdHex);
}

/** A parsed payload reads as an invite only at the exact FLOOR shape — else null. Extra fields are dropped. */
function coerceInvite(parsed: unknown): CabalInvite | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (p["kind"] !== CABAL_INVITE_DOMAIN) return null;                  // not a vouch tiddler → skip
  for (const field of ["placeDocIdHex", "joinerIdentityHex", "voucherDid", "expiresAt", "sig"]) {
    const v = p[field];
    if (typeof v !== "string" || v.length === 0) return null;          // any missing/torn field → skip whole
  }
  return {
    kind:              CABAL_INVITE_DOMAIN,
    placeDocIdHex:     p["placeDocIdHex"] as string,
    joinerIdentityHex: p["joinerIdentityHex"] as string,
    voucherDid:        p["voucherDid"] as string,
    expiresAt:         p["expiresAt"] as string,
    sig:               p["sig"] as string,
  };
}

/**
 * Every invite the board carries WHOSE SIGNATURE VERIFIES against the voucherDid it names — the only read,
 * because an unverified vouch grants unbounded mass (see the header). A torn, foreign, or forged tiddler
 * DROPS in silence: it means the invite did not arrive, never that an attack occurred.
 *
 * `place` scopes the fold to one cabal-realm, so a board carrying several places' vouches yields only the
 * lineage of the place being crossed — an invite into somewhere else evidences nothing here.
 *
 * The result feeds `vouchDagFromInvites` with its precondition already satisfied.
 */
export async function verifiedVouchesFromBoard(
  doc: LarDoc | undefined | null,
  place: string,
  verify: (bytes: Uint8Array, sigHex: string, voucherDid: string) => Promise<boolean>,
  shadowed: ReadonlySet<string> = new Set(),
): Promise<CabalInvite[]> {
  const tiddlers = doc?.tiddlers;
  if (!tiddlers) return [];                                            // absent board → no lineage, fail-closed
  const candidates: CabalInvite[] = [];
  for (const record of Object.values(tiddlers)) {
    const text = tiddlerText(record);
    if (text === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }             // a non-JSON tiddler is not a vouch
    const invite = coerceInvite(parsed);
    if (invite !== null && invite.placeDocIdHex === place) candidates.push(invite);
  }
  // Verify each against the voucher the invite ITSELF names — a forged tiddler naming a real voucher fails
  // here, and one naming a key it does hold simply carries that voucher's own edge, the honest reading.
  const verdicts = await Promise.all(candidates.map((inv) => {
    const { sig: _sig, ...unsigned } = inv;
    return verify(cabalInviteBytes(unsigned), inv.sig, inv.voucherDid).catch(() => false);
  }));
  // A withdrawn vouch drops even when its signature verifies — a voucher who sets a vouch aside removes the
  // MASS it lent to the lineage, which the price walks. Leaving it standing would let withdrawn standing keep
  // discounting a crossing forever.
  return candidates.filter((c, i) => verdicts[i] === true && !shadowed.has(vouchEdgeId(c)));
}
