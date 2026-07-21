/**
 * boot-invite.test.ts — the TRACELESS boot-invite: sealed, single-use, no voucher, no board.
 *
 * Proven:
 *   · a valid sealed invite (in-date, right Nexus, unspent) ADMITS + names its local burn id,
 *   · SINGLE-USE — once `isSpent` reports the burn id, a re-present draws `already-spent` (withhold, never a throw),
 *   · a GARBLED / ABSENT invite → `no-invite` (found your own group at the anon floor — never a crash),
 *   · a WRONG-NEXUS seal, an EXPIRED lease, and a BAD signature each refuse (fail-closed),
 *   · NO RECORD — the invite carries NO voucher DID / joiner id / inviter edge (the cabal-invite contrast); the
 *     decision is pure (writes nothing anywhere),
 *   · the OPEN policy admits with no invite at all.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex, hexToBytes } from "../src/crypto.js";
import {
  signBootInvite, bootInviteBytes, bootInviteId, decideBootInvite,
  BOOT_INVITE_DOMAIN, type BootInvite,
} from "../src/boot-invite.js";

const NEXUS_SEED = new Uint8Array(32).fill(9);   // the Nexus authority key
const nexusSign  = (bytes: Uint8Array) => ed.signAsync(bytes, NEXUS_SEED).then(hex);
const verify = async (bytes: Uint8Array, sigHex: string, keyHex: string): Promise<boolean> => {
  try { return await ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(keyHex)); } catch { return false; }
};
const neverSpent = () => false;

let NEXUS = "";
async function invite(over: Partial<Omit<BootInvite, "kind" | "sig">> = {}): Promise<BootInvite> {
  NEXUS = NEXUS || (await ed.getPublicKeyAsync(NEXUS_SEED).then(hex));
  return signBootInvite({
    nexusPubkey: over.nexusPubkey ?? NEXUS,
    nonce:       over.nonce       ?? "a1b2c3d4e5f60718",
    expiresAt:   over.expiresAt   ?? new Date(Date.now() + 86_400_000).toISOString(),
  }, nexusSign);
}

describe("decideBootInvite — sealed, single-use, traceless", () => {
  test("a valid sealed invite ADMITS and names its local burn id", async () => {
    const inv = await invite();
    const v = await decideBootInvite({ policy: { kind: "invite-only" }, nexusPubkey: NEXUS, invite: inv, now: new Date(), verify, isSpent: neverSpent });
    expect(v.admitted).toBe(true);
    expect(v.burnId).toBe(bootInviteId(inv));
  });

  test("SINGLE-USE — a burned invite draws `already-spent` (withhold, not a throw)", async () => {
    const inv = await invite();
    const id  = bootInviteId(inv);
    const v = await decideBootInvite({ policy: { kind: "invite-only" }, nexusPubkey: NEXUS, invite: inv, now: new Date(), verify, isSpent: (b) => b === id });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("already-spent");
  });

  test("a GARBLED / ABSENT invite → no-invite (found your own group at the anon floor)", async () => {
    const v = await decideBootInvite({ policy: { kind: "invite-only" }, nexusPubkey: NEXUS, invite: null, now: new Date(), verify, isSpent: neverSpent });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("no-invite");
  });

  test("a WRONG-NEXUS seal refuses", async () => {
    const inv = await invite({ nexusPubkey: "ff".repeat(32) });   // sealed for a DIFFERENT nexus
    const v = await decideBootInvite({ policy: { kind: "invite-only" }, nexusPubkey: NEXUS, invite: inv, now: new Date(), verify, isSpent: neverSpent });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("wrong-nexus");
  });

  test("an EXPIRED lease refuses", async () => {
    const inv = await invite({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    const v = await decideBootInvite({ policy: { kind: "invite-only" }, nexusPubkey: NEXUS, invite: inv, now: new Date(), verify, isSpent: neverSpent });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("expired");
  });

  test("a BAD signature refuses (tampered nonce)", async () => {
    const inv = await invite();
    const tampered: BootInvite = { ...inv, nonce: "deadbeefdeadbeef" };   // sig now over the old nonce
    const v = await decideBootInvite({ policy: { kind: "invite-only" }, nexusPubkey: NEXUS, invite: tampered, now: new Date(), verify, isSpent: neverSpent });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("bad-signature");
  });

  test("OPEN policy admits with NO invite at all", async () => {
    const v = await decideBootInvite({ policy: { kind: "open" }, nexusPubkey: NEXUS, invite: null, now: new Date(), verify, isSpent: neverSpent });
    expect(v.admitted).toBe(true);
  });
});

describe("TRACELESS — no voucher, no joiner id, no inviter edge (the cabal-invite contrast)", () => {
  test("the invite + its signed bytes carry ONLY nexus · nonce · expiry — no identity of any party", async () => {
    const inv = await invite();
    expect(inv.kind).toBe(BOOT_INVITE_DOMAIN);
    // The type has no voucherDid / joinerIdentityHex field, and the signed bytes carry only the sealed floor.
    const decoded = JSON.parse(new TextDecoder().decode(bootInviteBytes(inv))) as Record<string, unknown>;
    expect(Object.keys(decoded).sort()).toEqual(["expiresAt", "kind", "nexusPubkey", "nonce"]);
    expect(JSON.stringify(inv)).not.toMatch(/voucher|joiner|inviter|did:/i);
  });
});
