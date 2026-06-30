/**
 * cabal-place-charter — the VEIL-PUBLIC membrane.
 *
 * Proves the disclosure boundary (canon #the-place "shared charter, read-scope"):
 *   · the CHARTER is veil-public — name + bearing + deliberately-published meta.
 *   · the SUBSTRATE + ROSTER are members-only — they NEVER cross the membrane,
 *     even when handed to it in the same input bag (the veil holds, structurally).
 *   · the charter round-trips its public fields + serializes deterministically.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import { describe, test, expect } from "vitest";
import {
  projectCabalPlaceCharter,
  cabalPlaceCharterSnapshot,
  cabalPlaceCharterExporter,
  CABAL_PLACE_VEIL_PUBLIC_SET,
  type CabalPlace,
  type CabalPlacePublishState,
} from "../src/index.js";
import { load as automergeLoad } from "@automerge/automerge";

const PLACE: CabalPlace = {
  placeDocIdHex:   "0xdoc_aaa",
  placeAgentIdHex: "0xagent_aaa",
  substrateUrl:    "automerge:cabal-substrate-aaa",
  genesisUri:      "lar:///crossroads.fed.holds/cabal/aaa",
};

// Members-only data — a SECRET marker the test scans the wire output for.
const SECRET_ROSTER = ["0xmember_alice", "0xmember_bob", "0xmember_carol"];
const SECRET_SUBSTRATE = { topSecret: "the members' shared content", note: "0xmember_alice posted here" };

const FULL_STATE: CabalPlacePublishState = {
  place:  PLACE,
  meta:   { title: "The Crossroads", description: "a district hearth", foundedAt: 1_700_000_000_000 },
  roster: SECRET_ROSTER,
  substrateContent: SECRET_SUBSTRATE,
};

describe("projectCabalPlaceCharter — the veil-public membrane", () => {
  test("keeps ONLY the charter fields — name, bearing, published meta", () => {
    const charter = projectCabalPlaceCharter(FULL_STATE);
    expect(charter).toEqual({
      placeDocIdHex: PLACE.placeDocIdHex,
      genesisUri:    PLACE.genesisUri,
      title:         "The Crossroads",
      description:   "a district hearth",
      foundedAt:     1_700_000_000_000,
    });
  });

  test("THE VEIL HOLDS — members-only roster + substrate cannot leak through", () => {
    const charter = projectCabalPlaceCharter(FULL_STATE);
    const keys = Object.keys(charter);

    // No members-only field names cross.
    expect(keys).not.toContain("roster");
    expect(keys).not.toContain("substrateContent");
    expect(keys).not.toContain("substrateUrl");   // the substrate address stays private too
    expect(keys).not.toContain("placeAgentIdHex"); // the membership-graph anchor stays private
    expect(keys).not.toContain("memberCount");     // never DERIVED from the roster

    // No members-only VALUE crosses — scan the whole serialized charter for any
    // secret marker. The roster identities + substrate content must be absent.
    const wire = JSON.stringify(charter);
    for (const member of SECRET_ROSTER) expect(wire).not.toContain(member);
    expect(wire).not.toContain("topSecret");
    expect(wire).not.toContain("the members' shared content");
  });

  test("never derives memberCount from the roster — count omitted by default", () => {
    // A roster of 3 is present in the input, yet NO count crosses (conservative default).
    const charter = projectCabalPlaceCharter(FULL_STATE);
    expect(charter.memberCount).toBeUndefined();
  });

  test("a coarse, EXPLICITLY-published count crosses (opt-in only)", () => {
    const charter = projectCabalPlaceCharter({
      ...FULL_STATE,
      meta: { ...FULL_STATE.meta, memberCount: 5 },  // place chooses to advertise a coarse figure
    });
    expect(charter.memberCount).toBe(5);
  });

  test("a name-only place projects just name + bearing (optional meta omitted)", () => {
    const charter = projectCabalPlaceCharter({ place: PLACE });
    expect(charter).toEqual({ placeDocIdHex: PLACE.placeDocIdHex, genesisUri: PLACE.genesisUri });
    // No undefined-valued keys (so it loads cleanly into Automerge).
    expect(Object.values(charter).every((v) => v !== undefined)).toBe(true);
  });
});

describe("cabalPlaceCharterSnapshot — content-addressed + deterministic", () => {
  test("round-trips the public fields through the snapshot bytes", async () => {
    const charter = projectCabalPlaceCharter(FULL_STATE);
    const snap = await cabalPlaceCharterSnapshot(charter);
    const restored = automergeLoad<Record<string, unknown>>(snap.bytes);
    expect(restored.placeDocIdHex).toBe(PLACE.placeDocIdHex);
    expect(restored.genesisUri).toBe(PLACE.genesisUri);
    expect(restored.title).toBe("The Crossroads");
  });

  test("deterministic — the same charter yields the same cid", async () => {
    const a = await cabalPlaceCharterSnapshot(projectCabalPlaceCharter(FULL_STATE));
    const b = await cabalPlaceCharterSnapshot(projectCabalPlaceCharter(FULL_STATE));
    expect(a.cid).toBe(b.cid);
    expect(a.cid).toMatch(/^[0-9a-f]{64}$/);
  });

  test("THE VEIL HOLDS ON THE WIRE — no secret survives into the snapshot bytes", async () => {
    // Build the snapshot from the FULL publish-state via the read-face exporter — the
    // exact path a served charter takes. The serialized bytes must carry NO secret.
    const exporter = cabalPlaceCharterExporter(FULL_STATE);
    const snap = await exporter(/* live doc — ignored for a static charter */);
    const bytes = Buffer.from(snap.bytes).toString("latin1");
    for (const member of SECRET_ROSTER) expect(bytes).not.toContain(member);
    expect(bytes).not.toContain("topSecret");
    expect(bytes).not.toContain("the members' shared content");
    // The public name + bearing DO survive.
    expect(bytes).toContain(PLACE.placeDocIdHex);
  });
});

describe("CABAL_PLACE_VEIL_PUBLIC_SET — the named boundary (pattern integrity)", () => {
  test("witnesses the veil-public set: charter public, substrate + roster private", () => {
    expect(CABAL_PLACE_VEIL_PUBLIC_SET.veilPublic).toContain("placeDocIdHex");
    expect(CABAL_PLACE_VEIL_PUBLIC_SET.veilPublic).toContain("genesisUri");
    expect(CABAL_PLACE_VEIL_PUBLIC_SET.membersOnly).toContain("member roster");
    expect(CABAL_PLACE_VEIL_PUBLIC_SET.membersOnly).toContain("substrate content");
    // The two faces share nothing — no field is both public and members-only.
    const overlap = CABAL_PLACE_VEIL_PUBLIC_SET.veilPublic.filter(
      (f) => (CABAL_PLACE_VEIL_PUBLIC_SET.membersOnly as readonly string[]).includes(f),
    );
    expect(overlap).toEqual([]);
  });
});
