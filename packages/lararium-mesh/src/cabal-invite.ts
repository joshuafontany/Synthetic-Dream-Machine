/**
 * cabal-invite — the SECOND SIGNAL, and the dial that decides whether a realm demands it.
 *
 * A DreamNet grows from spores in a hostile field (lar:///…/lararium-identity #the-siege-gate). A
 * capability alone reads as SIGNAL-1: cheap, and forgeable at scale by anyone who can mint keys. The
 * VOUCH rides as signal-2, gatekept by an already-licensed member — `rb > c`, the voucher supplying
 * the `r`. Two signals, because a Sybil flood already holds one.
 *
 * THE DIAL, NOT A WALL. The cost of crossing runs MARGINAL, never absolute: a fixed toll reads too cheap
 * for a funded attacker and too dear for an honest newcomer. So this carries a POLICY the operator sets,
 * never a legitimacy answer baked into the code — `cabalRealmJoinGate` stands fenced for exactly that reason,
 * and the fence holds: the answer arrives as a parameter, and the operator turns it.
 *
 *   invite-only — signal-2 REQUIRED. The DreamNet's opening setting: no invite, no crossing.
 *   open        — signal-1 suffices. A later setting, and the same shore.
 *
 * REFUSAL IS ANERGY, NEVER A BAN. A joiner without a vouch does not get destroyed, blacklisted, or
 * remembered as an enemy — it STAYS AT THE FLOOR, hyporesponsive, free to re-present later WITH a vouch.
 * Fail-closed reads stay-at-the-floor. That lets an agent survive a hostile field long enough for
 * someone to vouch for it.
 *
 * THE INVITE IS CARRIED, NEVER FETCHED. A member signs it; it verifies on its own; a carrier may withhold
 * it and can never forge it. It therefore crosses any channel — and needs no reachable issuer, which keeps
 * an invite usable in a mesh cut off for five hundred years.
 * ── THE LEASE ASKS A TENDING QUESTION AND A CLOCK ANSWERS A DIFFERENT ONE ─────────────────────────────
 * The comment below states the intent exactly: a vouch lapses so it can be withdrawn from a mesh the
 * voucher can no longer reach. That question reads WHETHER THE VOUCHER STILL TENDS THIS — and a calendar
 * cannot tell a hand that feeds its vouch daily from one that abandoned it, since both age identically.
 *
 * The honest instrument decays along the GRAPH: has this voucher acted since. A wall clock stands in for
 * it, and stands in badly — worse because a device owner sets that clock freely, and an operator more
 * freely still. Held as DEBT, named here so the next hand sees the substitution rather than inheriting it.
 *
 */
import { CABAL_INVITE_DOMAIN } from "./domains.js";
import { canonicalJsonBytes, hex } from "./crypto.js";

/** The domain string an invite signs over. A signature is meaningless without the domain it was made in. */
export { CABAL_INVITE_DOMAIN } from "./domains.js";
/**
 * How a realm answers "may this joiner cross?".
 *
 * The operator turns this. The code never decides it — a legitimacy signal baked into a function closes
 * the unswept corner silently, and wrong.
 */
export type CabalJoinPolicy =
  /** Signal-2 REQUIRED: a joiner presents an invite signed by a member, or it does not cross. */
  | { readonly kind: "invite-only" }
  /** Signal-1 suffices: a capability alone admits. The open-protocol setting. */
  | { readonly kind: "open" };

/** The FAIL-CLOSED default a realm falls back to when its charter seats no dial — invite-only, signal-2
 *  required. Each Nexus turns its own (`joinPolicyFromDoc`); this names no mesh-wide setting. */
export const DEFAULT_JOIN_POLICY: CabalJoinPolicy = { kind: "invite-only" };

/**
 * A signed invitation into a cabal-realm. The VOUCHER stakes their own standing on it — a referral's
 * misbehavior decays the voucher's invite-capacity (co-pay, slashing-by-revocation), so every voucher stands
 * sentinel over the one they let in. Hence the voucher's DID rides in the clear: an invite nobody can
 * attribute binds nobody.
 */
export interface CabalInvite {
  readonly kind:        typeof CABAL_INVITE_DOMAIN;
  /** The realm this invite crosses INTO. An invite is never a general pass. */
  readonly realmDocIdHex: string;
  /** The joiner this invite names. An invite is never bearer — a stolen one names its thief. */
  readonly joinerIdentityHex: string;
  /** The VOUCHER: an already-licensed member, staking their standing. Attributable by construction. */
  readonly voucherDid:  string;
  /**
   * A HINT for the voucher's own tools, and NEVER a gate.
   *
   * A causal island holds no global now: two members reading one board at the same causal moment
   * differ by exactly their clock skew, and the divergence runs the dangerous way — a fast clock
   * refuses a live vouch, a SLOW one admits a dead one. So the lease that the machine being gated
   * could extend cannot be the lease that gates it. Admission reads `boundEpoch`; this reads to a
   * human.
   */
  readonly expiresAt:   string;
  /**
   * THE FENCE. The realm's lease epoch this invite is bound to — a 1-15 digit decimal, mirroring
   * `device-delegation`. `epoch-lease` holds that epoch as a coordinator-free MAX-REGISTER in
   * per-writer slots, so it converges without a coordinator and never decreases. Roll the realm's
   * epoch and every invite bound behind it lapses at once, on every replica, with no clock consulted
   * and no message sent.
   */
  readonly boundEpoch:  string;
  /** Ed25519 over the canonical bytes of everything above, hex. */
  readonly sig:         string;
}

/** The bytes an invite signs over. Canonical, so two signers over one invite produce one signature. */
export function cabalInviteBytes(parts: Omit<CabalInvite, "sig">): Uint8Array {
  return canonicalJsonBytes({
    kind:              parts.kind,
    realmDocIdHex:     parts.realmDocIdHex,
    joinerIdentityHex: parts.joinerIdentityHex,
    voucherDid:        parts.voucherDid,
    expiresAt:         parts.expiresAt,
    boundEpoch:        parts.boundEpoch,
  });
}

/** Mint an invite. The caller supplies the signer — this module holds no key and mints no authority. */
export async function signCabalInvite(
  parts: Omit<CabalInvite, "kind" | "sig">,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<CabalInvite> {
  const unsigned = { ...parts, kind: CABAL_INVITE_DOMAIN } as Omit<CabalInvite, "sig">;
  return { ...unsigned, sig: await sign(cabalInviteBytes(unsigned)) };
}

/** Why a crossing was refused. A refusal names itself, so a joiner knows what would change the answer. */
export type JoinRefusal =
  | "no-invite"          // invite-only, and none was presented
  | "wrong-realm"        // the invite names a different realm
  | "wrong-joiner"       // the invite names someone else — an invite is never bearer
  | "expired"            // the vouch lapsed; standing decays unless fed
  | "bad-signature";     // nobody licensed vouched for this

export interface JoinVerdict {
  readonly admitted: boolean;
  /** Present only on a refusal. A refused joiner ANERGIZES — it stays at the floor, never gets banned. */
  readonly refusal?: JoinRefusal;
  /** The voucher who staked their standing, on an admission. The co-pay needs someone to charge. */
  readonly voucherDid?: string;
}

/**
 * THE GATE. Decide whether a joiner crosses into a realm.
 *
 * Verification runs OFFLINE and needs no clock beyond the one the caller hands in: `verify` checks the
 * signature, `now` bounds the lease. Nothing here reaches a network, and nothing asks an authority — an
 * invite that needed a REACHABLE issuer would fail in an isolated mesh, which names the only
 * kind of mesh that ever really needs one.
 *
 * `verify` MUST come from the caller: this module holds no trust root and never decides which keys count.
 */
export async function decideCabalJoin(args: {
  readonly policy:            CabalJoinPolicy;
  readonly realmDocIdHex:     string;
  readonly joinerIdentityHex: string;
  readonly invite:            CabalInvite | null;
  /**
   * The realm's effective lease epoch — the max over `epoch-lease`'s per-writer slots.
   *
   * THIS REPLACES A CLOCK, and the replacement had to remove the clock rather than stop reading it.
   * A `now` this gate merely ignored would still be suppliable, and the next hand to touch the file
   * would find an instant sitting in the arguments and reach for it.
   */
  readonly effectiveEpoch:    number;
  /** Verify an Ed25519 signature against the voucher's DID. The CALLER owns which vouchers count. */
  readonly verify:            (bytes: Uint8Array, sigHex: string, voucherDid: string) => Promise<boolean>;
}): Promise<JoinVerdict> {
  // OPEN: signal-1 suffices. The capability the joiner already presented IS the admission.
  if (args.policy.kind === "open") return { admitted: true };

  // INVITE-ONLY: signal-2 or nothing.
  const inv = args.invite;
  if (!inv || inv.kind !== CABAL_INVITE_DOMAIN) return { admitted: false, refusal: "no-invite" };

  // An invite crosses into ONE realm and names ONE joiner. Both checks run BEFORE the signature, because
  // a signature over the wrong subject still verifies cleanly and still admits wrongly — verifying first
  // would let a real invite for someone else read as proof.
  if (inv.realmDocIdHex !== args.realmDocIdHex) return { admitted: false, refusal: "wrong-realm" };
  if (inv.joinerIdentityHex !== args.joinerIdentityHex) return { admitted: false, refusal: "wrong-joiner" };

  // THE LEASE, READ AS A FENCE. Standing decays unless fed, and a vouch that never lapses leaves the
  // voucher no way to withdraw it from a mesh they can no longer reach. But the shelf life cannot be a
  // timestamp: the reader supplies the instant, so the party being gated would hold the dial. The
  // realm's lease epoch is a max-register every replica converges on, and rolling it lapses every
  // invite bound behind it at once — no clock consulted, no message sent.
  const lease = inviteLeaseVerdict({ boundEpoch: inv.boundEpoch, effectiveEpoch: args.effectiveEpoch });
  if (!lease.live) return { admitted: false, refusal: "expired" };

  const ok = await args.verify(cabalInviteBytes(inv), inv.sig, inv.voucherDid);
  if (!ok) return { admitted: false, refusal: "bad-signature" };

  return { admitted: true, voucherDid: inv.voucherDid };
}

/** A stable fingerprint of an invite — for a seen-cache, so one vouch admits one joiner one time. */
export function cabalInviteId(inv: CabalInvite): Promise<string> {
  return Promise.resolve(hex(cabalInviteBytes(inv)));
}

/** A 1-15 digit decimal epoch — the same shape `device-delegation` binds to. */
const INVITE_EPOCH_RE = /^[0-9]{1,15}$/;

/** Whether an invite still stands against the realm's effective lease epoch. */
export interface InviteLeaseVerdict {
  readonly live: boolean;
  readonly why:  string;
}

/**
 * Read an invite's lease against the realm's epoch — the whole admission clock, and it holds no time.
 *
 * TAKES NO `now`, BY CONSTRUCTION. A reading that accepted an instant could be handed one by the very
 * party it gates, and a lease the gated party can extend is not a lease. The only inputs are the fence
 * the voucher signed and the epoch the realm converged on.
 *
 * Fails CLOSED on an unreadable bound: a fence nobody can parse is not an open gate.
 */
export function inviteLeaseVerdict(args: { boundEpoch: string; effectiveEpoch: number }): InviteLeaseVerdict {
  if (!INVITE_EPOCH_RE.test(args.boundEpoch)) {
    return { live: false, why: `the bound epoch ${JSON.stringify(args.boundEpoch)} reads as no epoch at all — an unreadable fence stands closed` };
  }
  const bound = Number(args.boundEpoch);
  if (bound < args.effectiveEpoch) {
    return { live: false, why: `the realm's lease epoch has rolled to ${args.effectiveEpoch}, past this invite's bound of ${bound} — the vouch has lapsed` };
  }
  return { live: true, why: `bound at ${bound}, and the realm stands at ${args.effectiveEpoch}` };
}
