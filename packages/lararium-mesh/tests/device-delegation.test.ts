import { describe, it, expect } from "vitest";
import * as ed25519 from "@noble/ed25519";
import { hex } from "../src/crypto.js";
import { buildDeviceDelegation, verifyDeviceDelegation } from "../src/device-delegation.js";

const opSeed  = new Uint8Array(32).fill(7);
const devSeed = new Uint8Array(32).fill(9);
const ISSUED  = "2026-06-24T00:00:00.000Z";

async function vkOf(seed: Uint8Array): Promise<string> {
  return hex(await ed25519.getPublicKeyAsync(seed));
}

describe("device-delegation — the signed capability edge", () => {
  it("builds + verifies a sound edge", async () => {
    const devVk = await vkOf(devSeed);
    const edge = await buildDeviceDelegation({ operatorSeed: opSeed, deviceVerifyingKey: devVk, issuedAt: ISSUED });
    expect(edge.kind).toBe("device-delegation");
    expect(edge.deviceDid).toBe(`0x${devVk}`);
    expect((await verifyDeviceDelegation(edge)).ok).toBe(true);
  });

  it("rejects a tampered deviceVerifyingKey (substituted delegate)", async () => {
    const edge = await buildDeviceDelegation({ operatorSeed: opSeed, deviceVerifyingKey: await vkOf(devSeed), issuedAt: ISSUED });
    const otherVk = await vkOf(new Uint8Array(32).fill(11));
    const tampered = { ...edge, deviceVerifyingKey: otherVk, deviceDid: `0x${otherVk}` };
    expect((await verifyDeviceDelegation(tampered)).ok).toBe(false);
  });

  it("rejects a tampered issuedAt", async () => {
    const edge = await buildDeviceDelegation({ operatorSeed: opSeed, deviceVerifyingKey: await vkOf(devSeed), issuedAt: ISSUED });
    expect((await verifyDeviceDelegation({ ...edge, issuedAt: "2030-01-01T00:00:00.000Z" })).ok).toBe(false);
  });

  it("rejects a forged operator (attacker swaps operatorDid, cannot re-sign)", async () => {
    const edge = await buildDeviceDelegation({ operatorSeed: opSeed, deviceVerifyingKey: await vkOf(devSeed), issuedAt: ISSUED });
    const attackerVk = await vkOf(new Uint8Array(32).fill(13));
    expect((await verifyDeviceDelegation({ ...edge, operatorDid: `0x${attackerVk}` })).ok).toBe(false);
  });

  it("rejects a deviceDid not bound to its verifying key", async () => {
    const edge = await buildDeviceDelegation({ operatorSeed: opSeed, deviceVerifyingKey: await vkOf(devSeed), issuedAt: ISSUED });
    const res = await verifyDeviceDelegation({ ...edge, deviceDid: `0x${"ff".repeat(32)}` });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/deviceDid/);
  });

  it("rejects malformed signature without throwing", async () => {
    const edge = await buildDeviceDelegation({ operatorSeed: opSeed, deviceVerifyingKey: await vkOf(devSeed), issuedAt: ISSUED });
    expect((await verifyDeviceDelegation({ ...edge, signature: "deadbeef" })).ok).toBe(false);
  });
});
