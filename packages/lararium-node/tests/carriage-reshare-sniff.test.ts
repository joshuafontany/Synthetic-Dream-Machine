/**
 * carriage-reshare-sniff.test.ts — the RE-SHARE tooth: the relay's bag-tracker learns holders FROM THE WIRE.
 *
 * The carriage relay's `cid → holders` bag-tracker stood empty — the announce leg was never populated from the
 * wire. This proves the sniff + prune + re-announce round-trip:
 *   1. a holder broadcasts `cas-have(cid)` over the relay → the tracker NOTES `cid → holder` (the sniff),
 *   2. the holder DROPS → the tracker PRUNES that holder (an offline holder never lingers),
 *   3. the holder RECONNECTS + re-announces → the tracker RE-LEARNS it (the RE-SHARE),
 *   4. HINT-ONLY: the tracker indexes cids + holder keys, moves no bytes — a member re-verifies the bytes itself.
 *
 * REVERT-VERIFY: unwire the sniff (drop the `onEnvelope` note) → the announced holder never lands → step 1 fails.
 *
 * Gate: lar:///ha.ka.ba/lararium/node/carriage-relay#reshare-sniff
 */
import { afterEach, describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex, MEMBERSHIP_BROADCAST } from "@lararium/mesh";
import { AuthenticatedWSMembershipChannel } from "../src/authenticated-membership-relay.js";
import { startCarriageRelay, type CarriageRelay } from "../src/carriage-relay.js";
import { CAS_HAVE } from "../src/cas-wire.js";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const pubOf = (seed: Uint8Array): Promise<string> => ed.getPublicKeyAsync(seed).then(hex);
const CID = "blake3:" + "cd".repeat(32);

/** Poll a predicate to a deadline (the sniff lands async after the relay stamps + surfaces the envelope). */
async function until(pred: () => boolean, budgetMs = 5_000): Promise<boolean> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) { if (pred()) return true; await sleep(20); }
  return pred();
}

describe("carriage RE-SHARE — the relay bag-tracker sniffs holders from the wire, prunes on drop, re-learns", () => {
  let relay: CarriageRelay | null = null;
  const channels: AuthenticatedWSMembershipChannel[] = [];
  afterEach(async () => {
    for (const c of channels.splice(0)) { try { c.close(); } catch { /* down */ } }
    if (relay) { try { await relay.close(); } catch { /* down */ } relay = null; }
  });

  test("announce → note; drop → prune; reconnect + re-announce → re-learn (HINT-only, no bytes)", async () => {
    const holderSeed = new Uint8Array(32).fill(21);
    const holderKey = await pubOf(holderSeed);
    relay = await startCarriageRelay({ gateSeed: new Uint8Array(32).fill(99) });
    expect(relay.tracker.size).toBe(0);   // stands empty until a body announces (fail-closed discovery)
    const url = `ws://127.0.0.1:${relay.port}`;

    // 1. ANNOUNCE — the holder broadcasts cas-have(cid); the relay stamps `from` with the proven key + sniffs it.
    const holderCh = await AuthenticatedWSMembershipChannel.connect(url, holderSeed);
    channels.push(holderCh);
    await holderCh.offer({ kind: CAS_HAVE, from: holderKey, to: MEMBERSHIP_BROADCAST, payload: { cid: CID } });
    expect(await until(() => relay!.tracker.holdersOf(CID).includes(holderKey))).toBe(true);

    // HINT-ONLY: the tracker holds the holder KEY (a string), never bytes — a member re-verifies the fetched bytes.
    expect(relay.tracker.holdersOf(CID)).toEqual([holderKey]);
    expect(relay.tracker.size).toBe(1);

    // 2. DROP — the holder's socket departs → the relay prunes every cid it announced.
    holderCh.close();
    channels.length = 0;
    expect(await until(() => relay!.tracker.holdersOf(CID).length === 0)).toBe(true);
    expect(relay.tracker.size).toBe(0);   // last holder gone → the cid is unknown again

    // 3. RECONNECT + RE-ANNOUNCE — the same holder re-dials and re-announces → the tracker re-learns it.
    const holderCh2 = await AuthenticatedWSMembershipChannel.connect(url, holderSeed);
    channels.push(holderCh2);
    await holderCh2.offer({ kind: CAS_HAVE, from: holderKey, to: MEMBERSHIP_BROADCAST, payload: { cid: CID } });
    expect(await until(() => relay!.tracker.holdersOf(CID).includes(holderKey))).toBe(true);
    expect(relay.tracker.size).toBe(1);
  }, 20_000);
});
