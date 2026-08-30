/**
 * cabal-invite.test.ts — the second signal, and the dial that demands it.
 *
 * The DreamNet opens INVITE-ONLY (operator ruling): a capability alone carries signal-1, cheap and forgeable
 * at scale; the vouch carries signal-2, gatekept by an already-licensed member who stakes their own standing.
 * Later the same dial turns to OPEN, and not one line here changes — which is what a dial buys.
 *
 * Every case runs offline: a fixed clock, a fixed key, no network, no issuer to reach. An invite that
 * needed its issuer REACHABLE would fail in an isolated mesh — and an isolated mesh names the only kind
 * that ever really needs one.
 */
import { describe, test, expect } from "vitest";
import * as ed25519 from "@noble/ed25519";
import {
  signCabalInvite, decideCabalJoin, cabalInviteBytes,
  CABAL_INVITE_DOMAIN, DEFAULT_JOIN_POLICY,
  type CabalInvite,
} from "../src/cabal-invite.js";
import { hex, hexToBytes } from "../src/crypto.js";

const VOUCHER_SEED = new Uint8Array(32).fill(3);
const REALM = "aa".repeat(16);
const JOINER = "bb".repeat(16);
const NOW = new Date("2026-07-13T00:00:00.000Z");
const LATER = new Date("2027-01-01T00:00:00.000Z");

const sign = (bytes: Uint8Array) => ed25519.signAsync(bytes, VOUCHER_SEED).then(hex);
const verify = async (bytes: Uint8Array, sigHex: string, voucherDid: string) =>
  ed25519.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(voucherDid));

async function mint(over: Partial<CabalInvite> = {}): Promise<CabalInvite> {
  const voucherDid = hex(await ed25519.getPublicKeyAsync(VOUCHER_SEED));
  const inv = await signCabalInvite({
    realmDocIdHex:     REALM,
    joinerIdentityHex: JOINER,
    voucherDid,
    expiresAt:         "2026-08-13T00:00:00.000Z",
    boundEpoch:        "0",
  }, sign);
  return { ...inv, ...over };
}

/** The realm's lease epoch these readings price against — a fence, never an instant. */
const EPOCH = 0;

/** A crossing priced against the realm's FENCE — the second argument is an epoch, never an instant. */
const decide = (invite: CabalInvite | null, effectiveEpoch = EPOCH, policy = DEFAULT_JOIN_POLICY) =>
  decideCabalJoin({ policy, realmDocIdHex: REALM, joinerIdentityHex: JOINER, invite, effectiveEpoch, verify });

describe("the DreamNet opens invite-only", () => {
  test("a vouched joiner crosses — and the VOUCHER is named, because the co-pay needs someone to charge", async () => {
    const v = await decide(await mint());
    expect(v.admitted).toBe(true);
    expect(v.voucherDid).toBeTruthy();
  });

  test("an UNVOUCHED joiner does not cross — signal-1 alone is what a Sybil flood already has", async () => {
    const v = await decide(null);
    expect(v).toEqual({ admitted: false, refusal: "no-invite" });
  });

  test("a REFUSAL names itself — a joiner must know what would change the answer", async () => {
    // Anergy, not a ban: the joiner stays at the floor and may re-present LATER, with a vouch. A refusal
    // that says nothing teaches nothing, and the applicant re-presents blind forever.
    expect((await decide(null)).refusal).toBe("no-invite");
    expect((await decide(await mint({ realmDocIdHex: "cc".repeat(16) }))).refusal).toBe("wrong-realm");
    expect((await decide(await mint({ joinerIdentityHex: "dd".repeat(16) }))).refusal).toBe("wrong-joiner");
    expect((await decide(await mint(), LATER)).refusal).toBe("expired");
    expect((await decide(await mint({ sig: "00".repeat(64) }))).refusal).toBe("bad-signature");
  });

  test("an invite is NEVER BEARER — a stolen one names its thief and refuses them", async () => {
    const stolen = await mint();                       // signed for JOINER, valid, unexpired
    const v = await decideCabalJoin({
      policy: DEFAULT_JOIN_POLICY, realmDocIdHex: REALM,
      joinerIdentityHex: "ee".repeat(16),              // ← a different joiner presents it
      invite: stolen, effectiveEpoch: EPOCH, verify,
    });
    expect(v).toEqual({ admitted: false, refusal: "wrong-joiner" });
  });

  test("SUBJECT before SIGNATURE — a real invite for someone ELSE must never read as proof", async () => {
    // A signature over the wrong subject still VERIFIES and still admits WRONGLY. Verifying first
    // and checking subject second would let a genuine invite, addressed to another, pass the crypto and
    // then sail past a caller who only looked at `admitted`.
    const forSomeoneElse = await mint({ joinerIdentityHex: "ff".repeat(16) });
    const ok = await verify(cabalInviteBytes(forSomeoneElse), forSomeoneElse.sig, forSomeoneElse.voucherDid);
    expect(ok, "the signature over the tampered subject must FAIL — the subject is signed over").toBe(false);
    expect((await decide(forSomeoneElse)).refusal).toBe("wrong-joiner");
  });

  test("the VOUCH LAPSES — the realm rolls its fence, and a lapse is not a revocation", async () => {
    // THE ROLL IS THE LAPSE. An invite bound at epoch 0 stands until the realm's lease epoch passes
    // it; rolling to 1 lapses it on every replica at once, with no clock consulted and no message
    // sent. Nothing here supplies a time, so nothing here can be moved by owning a machine.
    const v = await decide(await mint(), EPOCH + 1);
    expect(v.refusal).toBe("expired");
    // A vouch that never lapsed leaves no way to withdraw it from a mesh the voucher can no longer reach —
    // precisely the mesh where a stale vouch does the most damage.
  });

  test("THE DIAL TURNS — the same shore, opened, admits without a vouch and changes no code", async () => {
    const open = await decide(null, EPOCH, { kind: "open" });
    expect(open.admitted).toBe(true);
    // Invite-only and open protocol ride as two SETTINGS of one dial, never two implementations. That is what
    // makes "invite-only at first, open protocol later" a ruling the operator turns rather than a rewrite.
  });

  test("a payload of the wrong DOMAIN is not an invite, whatever it claims", async () => {
    const notAnInvite = { ...(await mint()), kind: "nexus-treaty/v1" } as unknown as CabalInvite;
    expect((await decide(notAnInvite)).refusal).toBe("no-invite");
    // The NAME and the version, never the whole address: a literal here would be a domain written
    // outside the registry, which is exactly what `domain-registry-witness` refuses — and it refused
    // this line within a minute of my writing it.
    expect(CABAL_INVITE_DOMAIN).toMatch(/\/domain\/cabal-invite\/v1$/);
  });
});
