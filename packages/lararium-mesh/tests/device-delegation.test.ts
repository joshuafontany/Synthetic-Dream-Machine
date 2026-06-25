import { describe, it, expect } from "vitest";
import * as ed25519 from "@noble/ed25519";
import { hex } from "../src/crypto.js";
import {
  buildDeviceDelegation,
  verifyDeviceDelegation,
  type DeviceDelegationTiddler,
} from "../src/device-delegation.js";

const opSeed  = new Uint8Array(32).fill(7);
const devSeed = new Uint8Array(32).fill(9);
const ISSUED  = "2026-06-24T00:00:00.000Z";
const EXPIRES = "2026-12-31T00:00:00.000Z";
const NOW     = Date.parse("2026-08-01T00:00:00.000Z"); // inside [ISSUED, EXPIRES]
const PLACE   = "bafkreic7r3jrao44srh5bp47uryotaqp62bnmovzpqccbfy2kclf447bra";

const vkOf = async (s: Uint8Array): Promise<string> => hex(await ed25519.getPublicKeyAsync(s));
const opDidP = vkOf(opSeed).then((vk) => `0x${vk}`);

async function mint(boundEpoch = 5): Promise<DeviceDelegationTiddler> {
  return buildDeviceDelegation({
    operatorSeed: opSeed,
    deviceVerifyingKey: await vkOf(devSeed),
    placeId: PLACE,
    issuedAt: ISSUED,
    expiresAt: EXPIRES,
    boundEpoch,
  });
}

describe("device-delegation — the signed capability edge (v2, post-verification)", () => {
  it("builds + verifies against the pinned root", async () => {
    const edge = await mint();
    expect(edge.kind).toBe("device-delegation");
    expect((await verifyDeviceDelegation(edge, await opDidP)).ok).toBe(true);
  });

  it("enforces the operator-root PIN — a self-consistent attacker edge is rejected", async () => {
    // attacker mints their OWN edge under their OWN root: internally valid, but not the pin.
    const attackerSeed = new Uint8Array(32).fill(13);
    const attackerEdge = await buildDeviceDelegation({
      operatorSeed: attackerSeed, deviceVerifyingKey: await vkOf(devSeed), placeId: PLACE, issuedAt: ISSUED, expiresAt: EXPIRES, boundEpoch: 5,
    });
    const res = await verifyDeviceDelegation(attackerEdge, await opDidP); // pin = the REAL operator
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/pinned root/);
  });

  it("rejects a tampered deviceVerifyingKey", async () => {
    const edge = await mint();
    const otherVk = await vkOf(new Uint8Array(32).fill(11));
    expect((await verifyDeviceDelegation({ ...edge, deviceVerifyingKey: otherVk, deviceDid: `0x${otherVk}` }, await opDidP)).ok).toBe(false);
  });

  it("rejects tampered placeId / issuedAt / expiresAt (signature mismatch)", async () => {
    const edge = await mint();
    expect((await verifyDeviceDelegation({ ...edge, placeId: "bafotherplace" }, await opDidP)).ok).toBe(false);
    expect((await verifyDeviceDelegation({ ...edge, issuedAt: "2030-01-01T00:00:00.000Z" }, await opDidP)).ok).toBe(false);
    expect((await verifyDeviceDelegation({ ...edge, expiresAt: "2099-01-01T00:00:00.000Z" }, await opDidP)).ok).toBe(false);
  });

  it("rejects a deviceDid not bound to its verifying key", async () => {
    const edge = await mint();
    const res = await verifyDeviceDelegation({ ...edge, deviceDid: `0x${"ff".repeat(32)}` }, await opDidP);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/deviceDid/);
  });

  it("NEVER throws on malformed/undefined fields (untrusted CRDT input)", async () => {
    const edge = await mint();
    // operatorDid undefined would have thrown in v1 (startsWith on non-string) — must now fail loud.
    await expect(verifyDeviceDelegation({ ...edge, operatorDid: undefined as unknown as string }, await opDidP)).resolves.toMatchObject({ ok: false });
    await expect(verifyDeviceDelegation({ ...edge, signature: "deadbeef" }, await opDidP)).resolves.toMatchObject({ ok: false });
    await expect(verifyDeviceDelegation({ ...edge, issuedAt: 12345 as unknown as string }, await opDidP)).resolves.toMatchObject({ ok: false });
  });

  it("rejects non-canonical operatorDid (no 0x / uppercase)", async () => {
    const edge = await mint();
    const vkUpper = (await vkOf(opSeed)).toUpperCase();
    expect((await verifyDeviceDelegation({ ...edge, operatorDid: vkUpper }, await opDidP)).ok).toBe(false); // missing 0x
    expect((await verifyDeviceDelegation({ ...edge, operatorDid: `0x${vkUpper}` }, await opDidP)).ok).toBe(false); // uppercase
  });

  it("enforces the freshness window when `now` is supplied", async () => {
    const edge = await mint();
    expect((await verifyDeviceDelegation(edge, await opDidP, { now: NOW })).ok).toBe(true);
    const expired = await verifyDeviceDelegation(edge, await opDidP, { now: Date.parse("2027-06-01T00:00:00.000Z") });
    expect(expired.ok).toBe(false);
    expect(expired.reason).toMatch(/expired/);
    const tooEarly = await verifyDeviceDelegation(edge, await opDidP, { now: Date.parse("2026-01-01T00:00:00.000Z") });
    expect(tooEarly.ok).toBe(false);
    expect(tooEarly.reason).toMatch(/not yet valid/);
  });

  it("rejects an edge with an illegal-character placeId at mint", async () => {
    await expect(buildDeviceDelegation({
      operatorSeed: opSeed, deviceVerifyingKey: await vkOf(devSeed), placeId: "evil|injection", issuedAt: ISSUED, expiresAt: EXPIRES, boundEpoch: 5,
    })).rejects.toThrow(/placeId/);
  });

  it("enforces the LEASE epoch when `expectedEpoch` is supplied (non-renewal)", async () => {
    const edge = await mint(5);  // grant binds to lease epoch 5
    // fresh — the resource's epoch has not rolled past 5
    expect((await verifyDeviceDelegation(edge, await opDidP, { expectedEpoch: 5 })).ok).toBe(true);
    expect((await verifyDeviceDelegation(edge, await opDidP, { expectedEpoch: 3 })).ok).toBe(true);
    // stale — the resource rolled to 6; the grant must re-mint or expire
    const stale = await verifyDeviceDelegation(edge, await opDidP, { expectedEpoch: 6 });
    expect(stale.ok).toBe(false);
    expect(stale.reason).toMatch(/lease stale/);
    // omitting expectedEpoch leaves the lease unenforced (signature + pin only) — single-vessel/pure-crypto path
    expect((await verifyDeviceDelegation(edge, await opDidP)).ok).toBe(true);
  });

  it("rejects a forged boundEpoch (signature mismatch — can't outlive a roll by editing the field)", async () => {
    const edge = await mint(5);
    expect((await verifyDeviceDelegation({ ...edge, boundEpoch: "999" }, await opDidP)).ok).toBe(false);
  });

  it("rejects a non-numeric boundEpoch at mint", async () => {
    await expect(buildDeviceDelegation({
      operatorSeed: opSeed, deviceVerifyingKey: await vkOf(devSeed), placeId: PLACE, issuedAt: ISSUED, expiresAt: EXPIRES, boundEpoch: -1,
    })).rejects.toThrow(/boundEpoch/);
  });
});
