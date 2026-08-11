/**
 * The live door — what a vessel stands as, and how a recogniser moves it.
 *
 * The starred tests carry the two properties that make the door safe rather than merely functional: one
 * challenge answers once, and the fence gets re-read rather than remembered.
 */
import { describe, expect, test } from "vitest";

import { signRaiseGrant, type RaiseChallenge } from "@lararium/mesh";
import { standRaiseDoor, type RaiseDoorOptions } from "../src/vessel-raise.js";

const VESSEL = "vessel-key";
const NEXUS  = "nexus-key";
const KAI    = "kai-nym";

const stamp = (nym: string) => (bytes: Uint8Array) => `${nym}:${Buffer.from(bytes).toString("hex")}`;

/** A door whose lease epoch a test can move under it, and whose nonces run in a readable sequence. */
function door(over: Partial<RaiseDoorOptions> = {}) {
  let epoch = 7;
  let n = 0;
  const d = standRaiseDoor({
    vesselId:   VESSEL,
    nexus:      NEXUS,
    floor:      "herm",
    leaseEpoch: () => epoch,
    recognises: (nym) => nym === KAI,
    verify:     (nym, bytes, sig) => sig === `${nym}:${Buffer.from(bytes).toString("hex")}`,
    nonce:      () => `nonce-${++n}`,
    ...over,
  });
  return { d, roll: (to: number) => { epoch = to; }, epochNow: () => epoch };
}

const answerWith = async (c: RaiseChallenge, nym = KAI) =>
  signRaiseGrant({ challenge: c, byNym: nym, sign: stamp(nym) });

describe("the honest path", () => {
  test("a vessel stands at its FLOOR until somebody raises it", async () => {
    const { d } = door();
    expect(await d.standing()).toBe("herm");
    expect(await d.raised()).toBeNull();
  });

  test("a recognised answer raises it, and names who carries the caps", async () => {
    const { d } = door();
    const r = await d.answer(await answerWith(await d.ask()));
    expect(r.ok).toBe(true);
    expect(await d.standing()).toBe("hearth");
    expect((await d.raised())?.byNym).toBe(KAI);
  });

  test("a refused answer leaves the vessel exactly where it stood", async () => {
    const { d } = door();
    const r = await d.answer(await answerWith(await d.ask(), "stranger"));
    expect(r).toEqual({ ok: false, why: "unrecognised" });
    expect(await d.standing()).toBe("herm");
  });
});

describe("★ one challenge, one answer ★", () => {
  test("★ the SAME grant replayed a second time refuses ★", async () => {
    // A challenge surviving its success would let one captured grant raise the vessel again and again.
    const { d } = door();
    const grant = await answerWith(await d.ask());
    expect((await d.answer(grant)).ok).toBe(true);
    expect(await d.answer(grant)).toEqual({ ok: false, why: "stale-challenge" });
  });

  test("★ a REFUSAL also burns the challenge — no grinding against one nonce ★", async () => {
    const { d } = door();
    const c = await d.ask();
    expect((await d.answer(await answerWith(c, "stranger"))).ok).toBe(false);
    // The honest holder now answers the SAME challenge — and finds it already spent.
    expect(await d.answer(await answerWith(c))).toEqual({ ok: false, why: "stale-challenge" });
  });

  test("asking again mints a FRESH nonce, so the old answer no longer fits", async () => {
    const { d } = door();
    const first = await d.ask();
    const second = await d.ask();
    expect(second.nonce).not.toBe(first.nonce);
    expect(await d.answer(await answerWith(first))).toEqual({ ok: false, why: "stale-challenge" });
  });
});

describe("★ the fence is re-read, never remembered ★", () => {
  test("★ a raise falls back to the floor when the epoch rolls past it — nobody lowers it ★", async () => {
    // The whole non-renewal ruling, measured: no lowering act runs anywhere, and the reading simply
    // stops coming back raised. A cached epoch here would keep a stale vessel raised forever.
    const { d, roll } = door();
    await d.answer(await answerWith(await d.ask()));
    expect(await d.standing()).toBe("hearth");
    roll(8);
    expect(await d.standing()).toBe("herm");
    expect(await d.raised()).toBeNull();
  });

  test("★ a challenge binds to the epoch standing when it was ASKED ★", async () => {
    // Ask under 7, roll to 8, then answer: the grant consented to a fence that has moved.
    const { d, roll } = door();
    const c = await d.ask();
    expect(c.epoch).toBe(7);
    roll(8);
    expect(await d.answer(await answerWith(c))).toEqual({ ok: false, why: "stale-challenge" });
  });

  test("a hearth floor stays a hearth — a raise adds caps, it never removes them", async () => {
    const { d, roll } = door({ floor: "hearth" });
    roll(9);
    expect(await d.standing()).toBe("hearth");
  });
});

describe("★ nothing is written, so nothing survives ★", () => {
  test("★ a fresh door over the same vessel stands at the floor — a raise is PRESENCE ★", async () => {
    // The reboot case. If a raise could be resumed from anywhere, a stolen disk would carry it.
    const first = door();
    await first.d.answer(await answerWith(await first.d.ask()));
    expect(await first.d.standing()).toBe("hearth");

    const second = door();                       // same vessel id, same nexus, new process
    expect(await second.d.standing()).toBe("herm");
    expect(await second.d.raised()).toBeNull();
  });
});
