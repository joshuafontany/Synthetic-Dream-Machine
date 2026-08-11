/**
 * The recogniser's half — reading a challenge that crossed from another machine, and signing it.
 *
 * The starred tests carry the one property that matters here: a signature IS the consent, so a signer
 * that accepted a partial shape would put a recogniser's name on fields they never saw.
 */
import { describe, expect, test } from "vitest";

import { readRaiseChallenge } from "../src/commands/raise-sign.js";

const whole = { vesselId: "v-hex", nexus: "n-hex", epoch: 7, nonce: "abc123" };

describe("reading a challenge that arrived as untrusted text", () => {
  test("the whole shape reads back exactly", () => {
    expect(readRaiseChallenge(JSON.stringify(whole))).toEqual(whole);
  });

  test("extra fields drop — a signer signs the four it knows, never a shape it was handed", () => {
    // The signed bytes are built from the parsed challenge, so anything smuggled alongside never rides.
    expect(readRaiseChallenge(JSON.stringify({ ...whole, extra: "smuggled" }))).toEqual(whole);
  });
});

describe("★ a partial shape signs NOTHING ★", () => {
  for (const missing of ["vesselId", "nexus", "epoch", "nonce"] as const) {
    test(`★ a challenge without ${missing} refuses ★`, () => {
      const { [missing]: _drop, ...rest } = whole;
      expect(readRaiseChallenge(JSON.stringify(rest))).toBeNull();
    });
  }

  test("★ a non-integer epoch refuses — the fence is a whole number or it is not a fence ★", () => {
    expect(readRaiseChallenge(JSON.stringify({ ...whole, epoch: 7.5 }))).toBeNull();
    expect(readRaiseChallenge(JSON.stringify({ ...whole, epoch: "7" }))).toBeNull();
    expect(readRaiseChallenge(JSON.stringify({ ...whole, epoch: -1 }))).toBeNull();
  });

  test("★ an empty string in any name refuses — a blank names nothing ★", () => {
    expect(readRaiseChallenge(JSON.stringify({ ...whole, vesselId: "" }))).toBeNull();
    expect(readRaiseChallenge(JSON.stringify({ ...whole, nonce: "" }))).toBeNull();
  });
});

describe("malformed input never throws — it refuses", () => {
  test("torn JSON, a bare scalar, null and an array each read as no challenge", () => {
    for (const text of ["{not json", '"a string"', "null", "[]", "", "17"]) {
      expect(readRaiseChallenge(text)).toBeNull();
    }
  });
});
