/**
 * vessel-dyads — the live read path: a vessel enumerates the relationships it already holds.
 *
 * `mesh/dyad.ts` carries the identity model and, until this path, no live code called it. A model
 * specified in code and reached by nothing reads as built and behaves as absent.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-circle
 */
import { describe, expect, test } from "vitest";
import { emptyLarDoc, mutableLarRecord, DEVICE_DELEGATION_SELF_TIDDLER, dyadFromEdge, writeDyad,
         type LarDoc, type DeviceDelegationTiddler } from "@lararium/mesh";
import { vesselDyads } from "../src/vessel-dyads.js";

const ROOT   = "0x" + "aa".repeat(32);
const DEVICE = "0x" + "bb".repeat(32);

function wholeEdge(deviceDid: string): DeviceDelegationTiddler {
  return {
    kind: "device-delegation", personaRootDid: ROOT, deviceDid,
    deviceVerifyingKey: deviceDid.slice(2), hearthTrueName: "",
    issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z",
  } as unknown as DeviceDelegationTiddler;
}

function docWithSelfEdge(): LarDoc {
  const edge = {
    kind: "device-delegation", personaRootDid: ROOT, deviceDid: DEVICE,
    deviceVerifyingKey: DEVICE.slice(2), hearthTrueName: "",
    issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z",
  } as unknown as DeviceDelegationTiddler;
  const doc = emptyLarDoc();
  doc.tiddlers[DEVICE_DELEGATION_SELF_TIDDLER] =
    mutableLarRecord(DEVICE_DELEGATION_SELF_TIDDLER, edge as never, "vessel-dyads-test");
  return doc;
}

describe("vesselDyads — the vessel's own relationships, read from what it holds", () => {
  test("★ a vessel holding a self-edge reads back exactly one dyad ★", () => {
    const dyads = vesselDyads(docWithSelfEdge());
    expect(dyads).toHaveLength(1);
    expect(dyads[0]!.ref.vesselDid).toBe(DEVICE);
    expect(dyads[0]!.dyadId).toBe(dyadFromEdge(wholeEdge(DEVICE)).dyadId);
  });

  /** THE FLOOR, and it must not read as a fault: a place holding no face holds no relationship. */
  test("a vessel at the waking floor reads zero dyads, and never throws", () => {
    expect(vesselDyads(emptyLarDoc())).toEqual([]);
    expect(vesselDyads(undefined)).toEqual([]);
  });

  /** An edge carries no binding, so nothing it yields may pass as a gathered fleet member. */
  test("the self-edge yields an UNBOUND dyad — honest about what nothing has signed", () => {
    expect(vesselDyads(docWithSelfEdge())[0]!.binding).toBeNull();
  });

  /**
   * ⚠ THE N-SLOT GAP, MADE COUNTABLE. A vessel holds its edge at ONE `self` key while
   * `DYAD_SLOT_PREFIX` exists so a vessel carrying three faces carries three slots. The read path
   * unions both sources, so the day slots start landing this vector counts them without changing.
   */
  test("slots and the self-edge union, so N faces would read as N dyads", () => {
    // Seeded through the module's OWN writer — a hand-rolled slot would test my fixture's guess at the
    // format rather than the format, which is how a green vector ends up measuring nothing.
    const doc = docWithSelfEdge();
    writeDyad(doc, dyadFromEdge(wholeEdge("0x" + "cc".repeat(32))));
    expect(vesselDyads(doc)).toHaveLength(2);
  });
});
