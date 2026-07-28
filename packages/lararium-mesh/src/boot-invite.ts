/**
 * boot-invite — the TRACELESS alpha boot capability: a sealed, single-use token spent-on-boot that leaves NO
 * record on any board and names NO voucher. It gates invite-only alpha the way cabal-invite gates a cabal, but
 * it is the deliberate CONTRAST to it (membership-doctrine #the-invite): a cabal-invite names its `voucherDid`
 * in the clear (attributable, reputation-priced, board-tracked) BECAUSE a cabal is a mutual, consented graph; a
 * boot-invite manufactures NO social graph, so it carries no inviter identity and writes no who-invited-whom
 * edge anywhere.
 *
 * WHAT IT IS, AND IS NOT:
 *   · CARRIED, never fetched — the recipient holds it; no relay and no issuer sees it in transit (admit-carriage's
 *     discipline). It verifies OFFLINE against the Nexus pubkey, so it needs no reachable authority (an isolated
 *     mesh is the only kind that ever really needs an invite).
 *   · SEALED by the NEXUS, not by a person — the signature is the charter/Nexus authority's, IDENTICAL in shape
 *     for every invite it mints, so two invites reveal nothing about who minted which. A random `nonce` makes each
 *     token unique (and is the local burn key); the nonce carries no meaning, only freshness.
 *   · SINGLE-USE, burned LOCALLY. Spend-on-boot: the receiving vessel records the invite's fingerprint in its OWN
 *     local spent-set and refuses a second spend. There is deliberately NO federated burn-registry — a mesh-wide
 *     "which invites are spent" list would re-introduce exactly the tracking the doctrine forbids (and it would
 *     demand a global now the mesh does not have). The burn is a causal-island-local fact.
 *   · WITHHOLD, never forge. A garbled / absent / expired / already-spent invite does NOT throw and does NOT
 *     admit — it means the invite DID NOT ARRIVE, and the vessel then founds its OWN group and stands at the anon
 *     floor (a correct outcome, never an attack; a human's typo must not read as a breach).
 *
 * ── AUTHN ⊥ AUTHZ, AND THE EXPIRY SITS ON THE WRONG SIDE (operator ruling) ────────────────────────────
 * A signature does not expire. What bounds a capability is not its token's age but the SCOPE of the act it
 * authorizes — a specific space, a specific deed, spent once. This invite already carries that scope: it
 * binds to ONE nexus and spends SINGLE-USE, and those two facts do the work the wall-clock `expiresAt` was
 * hired for. The clock adds nothing the binding lacks, and it adds a dependency on an instant that a device
 * owner sets freely — more freely still if they operate the box, since skew is a testing FEATURE there.
 *
 * The expiry therefore reads as DEBT, not design. Retiring it wants the scope stated explicitly enough to
 * stand alone; until then it rides, named.
 *
 * Platform-blind: rides ./crypto only. NO node: imports — the LOCAL spent-set (the burn) lives in the boot host
 * (node: boot-invite-burn; browser: an IndexedDB/localStorage sibling), which this module consults through an
 * injected `isSpent` shore and never reaches itself.
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-invite
 */

import * as ed25519 from "@noble/ed25519";
import { canonicalJsonBytes, hex, hexToBytes } from "./crypto.js";

/** The domain a boot-invite signs over. A signature is meaningless without the domain it was made in. */
export const BOOT_INVITE_DOMAIN = "lar-boot-invite/v1" as const;

/**
 * A sealed, single-use, TRACELESS boot capability. Note what is ABSENT by construction: no `voucherDid`, no
 * joiner identity, no place edge — a boot-invite is bearer within its Nexus and names nobody. The Nexus seals
 * it; the recipient carries it; the local burn spends it once.
 */
export interface BootInvite {
  readonly kind:        typeof BOOT_INVITE_DOMAIN;
  /** The Nexus this invite boots INTO — the pubkey its `sig` verifies against. An invite is never a general pass. */
  readonly nexusPubkey: string;
  /** A random freshness nonce (hex) — makes each token unique and IS the local burn key. Carries no identity. */
  readonly nonce:       string;
  /** ISO-8601 expiry. An invite that never expires is a key left under a mat; the seal decays unless re-minted. */
  readonly expiresAt:   string;
  /** Ed25519 over the canonical bytes of everything above, by the NEXUS authority key. Unforgeable; anonymous. */
  readonly sig:         string;
}

/** The bytes a boot-invite signs over. Canonical, so one invite yields one signature. */
export function bootInviteBytes(parts: Omit<BootInvite, "sig">): Uint8Array {
  return canonicalJsonBytes({
    kind:        parts.kind,
    nexusPubkey: parts.nexusPubkey,
    nonce:       parts.nonce,
    expiresAt:   parts.expiresAt,
  });
}

/**
 * Mint a boot-invite. The caller supplies the NEXUS authority signer (this module holds no key and mints no
 * authority) and a random nonce (a fresh CSPRNG hex — the caller owns the RNG so the module stays platform-blind).
 * The signer is the SAME for every invite the Nexus mints, so the seal reveals no inviter.
 */
export async function signBootInvite(
  parts: Omit<BootInvite, "kind" | "sig">,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<BootInvite> {
  const unsigned = { ...parts, kind: BOOT_INVITE_DOMAIN } as Omit<BootInvite, "sig">;
  return { ...unsigned, sig: await sign(bootInviteBytes(unsigned)) };
}

/** A stable fingerprint of an invite — the LOCAL burn key, so one invite spends exactly once on this island. */
export function bootInviteId(inv: BootInvite): string {
  return hex(bootInviteBytes(inv));
}

/**
 * The ready-made OFFLINE seal verifier — an Ed25519 check over @noble/ed25519 (browser-shippable, the same
 * library the handle-card and antigen seals ride). Pass it as `decideBootInvite.verify` from EITHER platform:
 * the browser needs no node crypto and no added dep, and the node burn may adopt it too. False on any
 * malformed input — a torn signature reads as withhold, never a throw.
 */
export async function verifyBootInviteSig(bytes: Uint8Array, sigHex: string, keyHex: string): Promise<boolean> {
  try { return await ed25519.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(keyHex)); }
  catch { return false; }
}

/** How the boot answers "may this vessel cross into the alpha?". The operator turns it — code never bakes it in. */
export type BootInvitePolicy =
  /** invite-only — a sealed, unspent, in-date, Nexus-signed invite is REQUIRED, or the vessel founds its own group. */
  | { readonly kind: "invite-only" }
  /** open — no invite required; every vessel boots into the Nexus. The later, opened setting. */
  | { readonly kind: "open" };

/** Why a boot crossing was refused. A refusal names itself; a refused vessel founds its own group at the anon floor. */
export type BootRefusal =
  | "no-invite"        // invite-only, and none arrived (absent / garbled)
  | "wrong-nexus"      // the invite seals a different Nexus
  | "expired"          // the seal lapsed
  | "already-spent"    // single-use: this invite was burned already (local island fact)
  | "bad-signature";   // the Nexus did not seal this — forged or torn

export interface BootVerdict {
  /** True → the vessel boots INTO the Nexus. False → it founds its own group + stands at the anon floor (never banned). */
  readonly admitted: boolean;
  /** Present only on a refusal. */
  readonly refusal?: BootRefusal;
  /** Present only on an admission — the caller MUST burn this id in its LOCAL spent-set before granting (spend-on-boot). */
  readonly burnId?:  string;
}

/**
 * THE GATE. Decide whether a vessel boots into the Nexus on a carried invite. OFFLINE + platform-blind:
 * `verify` checks the Nexus seal, `now` bounds the lease, `isSpent` reads the LOCAL burn set — nothing here
 * reaches a network or an authority. WITHHOLD-not-forge: every failure returns `admitted:false` (never throws),
 * and the caller reads that as "found your own group at the anon floor".
 *
 * The caller MUST, on an admission, burn `burnId` in its local spent-set BEFORE granting — this fn is pure and
 * does not mutate the set (the atomic decide-then-burn lives in the boot host, so a crash between cannot double-spend
 * a granted invite; the host burns first, then grants).
 *
 * `verify` MUST come from the caller: this module holds no trust root and never decides which key is the Nexus.
 */
export async function decideBootInvite(args: {
  readonly policy:      BootInvitePolicy;
  readonly nexusPubkey: string;
  readonly invite:      BootInvite | null;
  readonly now:         Date;
  /** Verify an Ed25519 signature against the Nexus pubkey. The CALLER owns which key is the Nexus authority. */
  readonly verify:      (bytes: Uint8Array, sigHex: string, nexusPubkey: string) => Promise<boolean>;
  /** Has this invite id been burned on THIS island already? A LOCAL fact — never a federated lookup. */
  readonly isSpent:     (burnId: string) => boolean | Promise<boolean>;
}): Promise<BootVerdict> {
  // OPEN: no invite required. Every vessel boots into the Nexus.
  if (args.policy.kind === "open") return { admitted: true };

  // INVITE-ONLY: a sealed, unspent, in-date, Nexus-signed invite or nothing.
  const inv = args.invite;
  if (!inv || inv.kind !== BOOT_INVITE_DOMAIN) return { admitted: false, refusal: "no-invite" };

  // Bind to THIS Nexus BEFORE the signature — a valid seal for another Nexus is a valid signature and an invalid
  // admission; verifying first would let a real invite for elsewhere read as proof here.
  if (inv.nexusPubkey !== args.nexusPubkey) return { admitted: false, refusal: "wrong-nexus" };

  const exp = Date.parse(inv.expiresAt);
  if (!Number.isFinite(exp) || exp <= args.now.getTime()) return { admitted: false, refusal: "expired" };

  const ok = await args.verify(bootInviteBytes(inv), inv.sig, inv.nexusPubkey);
  if (!ok) return { admitted: false, refusal: "bad-signature" };

  // SINGLE-USE — the local burn. A spent invite draws the same withhold as a garbled one: found your own group.
  const burnId = bootInviteId(inv);
  if (await args.isSpent(burnId)) return { admitted: false, refusal: "already-spent" };

  return { admitted: true, burnId };
}
