/**
 * bag-tracker.test.ts — the relay-side `cid → holders` index that makes cad discovery DHT-FREE.
 *
 * Proofs: an installed sealed body ANNOUNCES to the tracker (the encrypt-path side-effect); `holdersOf` answers
 * the announced holders (the DHT-free discovery hint); `forget` prunes an offline holder; an empty tracker is an
 * honest miss (fail-closed discovery until a body announces). The tracker moves NO bytes — cids + holders only.
 */
import { describe, test, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { CONVERGENCE_SECRET_LEN } from "@lararium/mesh";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";
import { installSealedBody } from "../src/ciphertext-cas-seal.js";
import { makeBagTracker, noteInstalledBody } from "../src/bag-tracker.js";
import type { NexusEpochSecret } from "../src/nexus-convergence-keyring.js";

const casDir = mkdtempSync(join(tmpdir(), "lar-cad-tracker-"));
const epochSecret: NexusEpochSecret = { epoch: 0, secret: new Uint8Array(randomBytes(CONVERGENCE_SECRET_LEN)) };

describe("the bag-tracker indexes announced holders — DHT-free discovery", () => {
  test("an empty tracker is an honest miss (fail-closed until a body announces)", () => {
    const tracker = makeBagTracker();
    expect(tracker.size).toBe(0);
    expect(tracker.holdersOf("blake3:" + "00".repeat(32))).toEqual([]);
  });

  test("installing a sealed body announces it under the sealing member's holder handle", () => {
    const tracker = makeBagTracker();
    const registry = makeSealedPlaneRegistry();
    const body = new TextEncoder().encode("a cad body this member holds and announces");
    const installed = installSealedBody(registry, casDir, body, epochSecret);

    noteInstalledBody(tracker, installed, "member-self");     // the side-effect off the encrypt path
    expect(tracker.holdersOf(installed.cid)).toEqual(["member-self"]);

    // A second holder announces the SAME cid — discovery now names both.
    tracker.note(installed.cid, "member-peer");
    expect(new Set(tracker.holdersOf(installed.cid))).toEqual(new Set(["member-self", "member-peer"]));
  });

  test("forget prunes an offline holder; dropping the last holder drops the cid", () => {
    const tracker = makeBagTracker();
    const cid = "blake3:" + "ab".repeat(32);
    tracker.note(cid, "peer-1");
    tracker.note(cid, "peer-2");
    tracker.forget(cid, "peer-1");
    expect(tracker.holdersOf(cid)).toEqual(["peer-2"]);
    tracker.forget(cid, "peer-2");
    expect(tracker.holdersOf(cid)).toEqual([]);   // last holder gone → the cid is unknown again
    expect(tracker.size).toBe(0);
  });
});
