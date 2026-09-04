/**
 * dyad-read-path — a vessel enumerates its OWN relationships, from what it already holds.
 *
 * ── WHY THIS VECTOR EXISTS ──────────────────────────────────────────────────────────────────────
 * `dyad.ts` carries the identity model whole and, until this path, nothing outside its own unit test
 * ever called it. A model specified in code and reached by no live path reads as built and behaves as
 * absent — the state `crossingDirection` and the recovery keel also stand in.
 *
 * THE READ PATH NEEDS NO RULING. It mints no key, changes no wire format, and touches no ceremony: it
 * reads the delegation edge a vessel already holds and presents it as the relationship it already is.
 * The BINDING stays null, honestly, because nothing has signed one — and a dyad carrying `binding:
 * null` joins no fleet, which `fleetOfGroup` enforces rather than merely documents.
 *
 * ⚠ WHAT THIS VECTOR MAKES VISIBLE RATHER THAN HIDES. A vessel holds its edge at ONE key —
 * `DEVICE_DELEGATION_SELF_TIDDLER`, a single `self` — while `DYAD_SLOT_PREFIX` exists precisely so a
 * vessel carrying three faces carries three slots. So the read path returns one dyad today, and the
 * gap between one and N stops being theoretical the moment something counts them.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-circle
 */

import { describe, expect, test } from "vitest";
import {
  dyadFromEdge, dyadId, dyadsOnVessel, fleetOfGroup, dyadsFromDoc, writeDyad, dyadSlotKey,
  type DyadRecord,
} from "../src/dyad.js";
import { emptyLarDoc, type LarDoc } from "../src/base-doc.js";
import type { DeviceDelegationTiddler } from "../src/device-delegation.js";

const ROOT   = "0x" + "aa".repeat(32);
const DEVICE = "0x" + "bb".repeat(32);
const OTHER  = "0x" + "cc".repeat(32);

const edge = (deviceDid: string, rootDid = ROOT): DeviceDelegationTiddler => ({
  kind: "device-delegation",
  personaRootDid: rootDid as never,
  deviceDid: deviceDid as never,
  deviceVerifyingKey: deviceDid.slice(2),
  hearthTrueName: "",
  issuedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2027-01-01T00:00:00.000Z",
} as DeviceDelegationTiddler);

describe("the read path — a vessel sees its own relationships", () => {
  test("★ an edge a vessel already holds reads back as a dyad ★", () => {
    const d = dyadFromEdge(edge(DEVICE));
    expect(d.ref.vesselDid).toBe(DEVICE);
    expect(d.dyadId).toBe(dyadId(d.ref));
    // The id content-addresses the ORDERED pair, so it never collides with the reverse relation.
    expect(dyadId({ vesselDid: DEVICE, veilDid: ROOT })).not.toBe(dyadId({ vesselDid: ROOT, veilDid: DEVICE }));
  });

  test("an unbound dyad joins NO fleet — absence of a binding is not membership in a default group", () => {
    const d = dyadFromEdge(edge(DEVICE));
    expect(d.binding).toBeNull();
    expect(fleetOfGroup([d], ROOT)).toEqual([]);
  });

  test("a vessel filters the dyads that name IT, and not another place", () => {
    const mine = dyadFromEdge(edge(DEVICE));
    const theirs = dyadFromEdge(edge(OTHER));
    expect(dyadsOnVessel([mine, theirs], DEVICE)).toEqual([mine]);
  });

  /**
   * THE SLOT IS THE N-SLOT SHAPE, and a doc round-trips through it. This is what the live vessel does
   * NOT yet do — it holds one edge at one `self` key — so the vector stands as the shape the wiring
   * has to reach rather than as a claim that it has.
   */
  test("★ N dyads land in N slots and read back whole ★", () => {
    let doc: LarDoc = emptyLarDoc();
    const a = dyadFromEdge(edge(DEVICE));
    const b = dyadFromEdge(edge(OTHER));
    for (const d of [a, b]) writeDyad(doc, d);
    const back = dyadsFromDoc(doc);
    expect(back.map((d) => d.dyadId).sort()).toEqual([a.dyadId, b.dyadId].sort());
    expect(dyadSlotKey(a.dyadId)).not.toBe(dyadSlotKey(b.dyadId));
  });
});
