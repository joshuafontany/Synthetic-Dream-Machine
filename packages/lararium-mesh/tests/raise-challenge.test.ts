/**
 * The door a recognised operator walks through to raise a vessel.
 *
 * The starred tests carry the security properties rather than the mechanics. Each of them, failing, still
 * leaves a system that raises vessels correctly on every honest input — which is exactly why they exist.
 */
import { RAISE_CHALLENGE_DOMAIN } from "../src/domains.js";
import { describe, expect, test } from "vitest";

import {
  mintRaiseChallenge, raiseChallengeBytes, signRaiseGrant, verifyRaiseGrant,
  type RaiseChallenge, type RaiseGrant,
} from "../src/raise-challenge.js";
import { raiseStands, standingClass } from "../src/vessel-standing.js";

const VESSEL = "vessel-key-hex";
const NEXUS  = "nexus-key-hex";
const KAI    = "kai-nym";

const challenge = (over: Partial<RaiseChallenge> = {}): RaiseChallenge =>
  mintRaiseChallenge({ vesselId: VESSEL, nexus: NEXUS, epoch: 7, nonce: "nonce-A", ...over });

/** A signer that stamps the bytes it saw, so a test can tell a real verify from a waved-through one. */
const stamp = (nym: string) => (bytes: Uint8Array) => `${nym}:${Buffer.from(bytes).toString("hex")}`;
const verifyStamp = (nym: string, bytes: Uint8Array, sig: string) =>
  sig === `${nym}:${Buffer.from(bytes).toString("hex")}`;

const grantFor = async (c: RaiseChallenge, nym = KAI): Promise<RaiseGrant> =>
  signRaiseGrant({ challenge: c, byNym: nym, sign: stamp(nym) });

const read = (grant: RaiseGrant, live: RaiseChallenge | null, recognised = [KAI]) =>
  verifyRaiseGrant({ grant, live, recognises: (n) => recognised.includes(n), verify: verifyStamp });

describe("the honest path", () => {
  test("a recognised signer's answer to the live challenge raises the vessel", async () => {
    const c = challenge();
    const r = await read(await grantFor(c), c);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.caps).toEqual({ byNym: KAI, nexus: NEXUS, boundEpoch: 7 });
  });

  test("the minted caps stand under the fence, and fall when it rolls past", async () => {
    // The whole point of binding to an epoch: `vessel-standing` reads these caps and nothing else.
    const c = challenge();
    const r = await read(await grantFor(c), c);
    if (!r.ok) throw new Error("expected a raise");
    expect(raiseStands(r.caps, { nexus: NEXUS, effective: 7 })).toBe(true);
    expect(raiseStands(r.caps, { nexus: NEXUS, effective: 8 })).toBe(false);
    expect(standingClass("herm", r.caps, { nexus: NEXUS, effective: 7 })).toBe("hearth");
    expect(standingClass("herm", r.caps, { nexus: NEXUS, effective: 8 })).toBe("herm");
  });
});

describe("★ the freshness is VERIFIER-CHOSEN — no pre-baked blob ★", () => {
  test("★ a captured grant REPLAYED against a new challenge refuses ★", async () => {
    // The break this door exists to close: a vessel at the floor holds no clock, so material PRESENTED to
    // it would replay forever. A thief with the disk and one captured packet must get nothing.
    const first  = challenge({ nonce: "nonce-A" });
    const stolen = await grantFor(first);
    const second = challenge({ nonce: "nonce-B" });        // the vessel asked again, with a fresh nonce
    const r = await read(stolen, second);
    expect(r).toEqual({ ok: false, why: "stale-challenge" });
  });

  test("★ a grant answers NOTHING when the vessel asked nothing ★", async () => {
    // No live challenge = no invitation. A grant arriving unbidden is exactly the bearer credential.
    expect(await read(await grantFor(challenge()), null)).toEqual({ ok: false, why: "stale-challenge" });
  });

  test("★ a grant minted under a PRIOR epoch refuses even with the right nonce ★", async () => {
    const old = challenge({ epoch: 6 });
    const now = challenge({ epoch: 7 });                    // same nonce, the fence moved
    expect(await read(await grantFor(old), now)).toEqual({ ok: false, why: "stale-challenge" });
  });
});

describe("★ a grant is answerable only where it was provoked ★", () => {
  test("★ a grant for ANOTHER vessel refuses ★", async () => {
    // Otherwise one recogniser's answer raises every vessel in a fleet at once.
    const elsewhere = challenge({ vesselId: "some-other-vessel" });
    expect(await read(await grantFor(elsewhere), challenge())).toEqual({ ok: false, why: "wrong-vessel" });
  });

  test("★ a grant naming another NEXUS refuses ★", async () => {
    const foreign = challenge({ nexus: "other-nexus" });
    expect(await read(await grantFor(foreign), challenge())).toEqual({ ok: false, why: "wrong-nexus" });
  });
});

describe("★ recognition is required, and so is the signature ★", () => {
  test("★ a stranger's valid signature refuses — recognition is not the same as cryptography ★", async () => {
    const c = challenge();
    expect(await read(await grantFor(c, "stranger"), c, [KAI])).toEqual({ ok: false, why: "unrecognised" });
  });

  test("★ a recognised nym with a FORGED signature refuses ★", async () => {
    // The mirror of the test above: membership never substitutes for proof of the key.
    const c = challenge();
    const forged: RaiseGrant = { challenge: c, byNym: KAI, sig: "not-the-bytes" };
    expect(await read(forged, c)).toEqual({ ok: false, why: "bad-signature" });
  });

  test("★ a signature over DIFFERENT bytes than the challenge refuses ★", async () => {
    // Signing something adjacent must not pass — the bytes carry the vessel, nexus, epoch and nonce.
    const c = challenge();
    const other = challenge({ nonce: "nonce-Z" });
    const swapped: RaiseGrant = { challenge: c, byNym: KAI, sig: await grantFor(other).then((g) => g.sig) };
    expect(await read(swapped, c)).toEqual({ ok: false, why: "bad-signature" });
  });
});

describe("the signed bytes", () => {
  test("carry the whole challenge — no field can move without breaking the signature", async () => {
    const base = challenge();
    const seen = new Set<string>();
    for (const c of [
      base,
      challenge({ vesselId: "v2" }), challenge({ nexus: "n2" }),
      challenge({ epoch: 8 }),       challenge({ nonce: "nonce-B" }),
    ]) seen.add(Buffer.from(raiseChallengeBytes(c)).toString("hex"));
    expect(seen.size).toBe(5);
  });

  test("carry a domain tag, so a raise signature replays as no other act", () => {
    expect(Buffer.from(raiseChallengeBytes(challenge())).toString("utf8")).toContain(RAISE_CHALLENGE_DOMAIN);
  });

  test("carry NOTHING of the vessel's contents — a challenge is not a disclosure", () => {
    // A floor vessel emits this to whoever asks. It must name what is being raised, never what it holds.
    const text = Buffer.from(raiseChallengeBytes(challenge())).toString("utf8");
    const fields = Object.keys(JSON.parse(text) as Record<string, unknown>).sort();
    expect(fields).toEqual(["epoch", "kind", "nexus", "nonce", "vesselId"]);
  });
});
