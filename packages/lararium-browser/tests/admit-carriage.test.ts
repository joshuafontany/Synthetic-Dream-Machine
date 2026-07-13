/**
 * admit-carriage.test.ts — the carried admission, decoded deterministically.
 *
 * The whole point of carrying the admit rather than fetching it is that the crossing becomes a PURE
 * FUNCTION OF ITS BYTES. No relay stands up here, no clock ticks, no socket opens: a fixed payload goes
 * in and the same vessel-binding comes out, every time. A `GET /admit/<key>` design could never have been
 * tested this way — it would need a server, a reachable issuer, and a moment at which both were true.
 */
import { describe, test, expect } from "vitest";
import { parseAdmitCarriage, toAdmitCarriage, ADMIT_KIND } from "../src/admit-carriage.js";
import type { DeviceAdmitPayload } from "@lararium/keyhive";

/** A payload shaped like the founder's root signs — fixed bytes, so the test is a constant. */
const PAYLOAD = {
  kind: ADMIT_KIND,
  signerDid: "0xf00dcafe",
  deviceEdge: { title: "edge", deviceKey: "0xdeadbeef", sig: "0xabc123" },
  hearthTrueName: "bafyEngineCid",
  personaGroupDocIdHex: "aa11",
  personaGroupAgentIdHex: "bb22",
  meshCabalDocIdHex: "cc33",
  syncUrl: null,
  personaUrl: "automerge:persona",
  islandDocUrl: "automerge:island",
} as unknown as DeviceAdmitPayload;

describe("the carried admission", () => {
  test("round-trips: what the CLI prints is what the vessel reads", () => {
    expect(parseAdmitCarriage(toAdmitCarriage(PAYLOAD))).toEqual(PAYLOAD);
  });

  test("the carriage is CHANNEL-BLIND — a fragment, a query, or a bare string all carry it", () => {
    const c = toAdmitCarriage(PAYLOAD).slice(1);   // strip the leading '#'
    expect(parseAdmitCarriage(`#${c}`)).toEqual(PAYLOAD);
    expect(parseAdmitCarriage(`?${c}`)).toEqual(PAYLOAD);
    expect(parseAdmitCarriage(c)).toEqual(PAYLOAD);
    expect(parseAdmitCarriage(`#relay=ws://x&${c}`)).toEqual(PAYLOAD);
  });

  test("no carriage → null: the vessel founds its own group and stands at the floor", () => {
    expect(parseAdmitCarriage("")).toBeNull();
    expect(parseAdmitCarriage("#relay=ws://localhost:8080/ws&gate=0xabc")).toBeNull();
  });

  test("a garbled paste REFUSES, never throws — a human's typo is not an attack", () => {
    expect(parseAdmitCarriage("#admit=not-base64-at-all!!")).toBeNull();
    expect(parseAdmitCarriage("#admit=aGVsbG8")).toBeNull();          // decodes, but not JSON
    expect(parseAdmitCarriage("#admit=eyJhIjoxfQ")).toBeNull();       // JSON, but no kind
  });

  test("a payload of the wrong KIND gets refused, never guessed at", () => {
    const wrong = toAdmitCarriage({ ...PAYLOAD, kind: "nexus-invite/v1" } as unknown as DeviceAdmitPayload);
    expect(parseAdmitCarriage(wrong)).toBeNull();
  });

  test("the BINDING is refused at the door when incomplete — never half-applied downstream", () => {
    // signerDid · deviceEdge · hearthTrueName ARE the joinee's whole authority. runApplyAdmitPayload fails
    // closed on the same three; refusing here keeps the carriage re-carryable instead of half-writing a
    // daemon doc (the confused-deputy hole).
    for (const missing of ["signerDid", "hearthTrueName", "deviceEdge"] as const) {
      const partial = { ...PAYLOAD } as Record<string, unknown>;
      delete partial[missing];
      const carriage = toAdmitCarriage(partial as unknown as DeviceAdmitPayload);
      expect(parseAdmitCarriage(carriage), `a payload without ${missing} must not admit`).toBeNull();
    }
  });

  test("an EMPTY binding field refuses as hard as a missing one", () => {
    const hollow = toAdmitCarriage({ ...PAYLOAD, signerDid: "" } as unknown as DeviceAdmitPayload);
    expect(parseAdmitCarriage(hollow)).toBeNull();
  });
});
