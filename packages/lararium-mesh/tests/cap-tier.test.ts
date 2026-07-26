/**
 * cap-tier.test.ts — the bag's sharing-posture as SELF-DESCRIBING DATA, with the SAFETY KEYSTONE at centre.
 *
 * Proven (pure):
 *   · the 4-tier TOTAL ORDER VEIL < PERSONAGROUP < CONTRACT < PUBLIC (rank + fail-closed default),
 *   · `parseCapTier` fail-closes any torn value to VEIL (isomorphic to `federationPostureFromDoc`),
 *   · `meetCapTier` = the more-restrictive (taint-meet): associative, VEIL absorbing, PUBLIC identity,
 *   · THE SAFETY KEYSTONE — `resolveTier(declared, floor)` = declared ∧ floor, TIGHTEN-ONLY: a bag that
 *     DECLARES itself PUBLIC but whose structural floor is PERSONAGROUP resolves to PERSONAGROUP, NEVER PUBLIC,
 *   · the per-tiddler cascade (high-water-mark) only tightens,
 *   · META-CAP ≥ declared cap, and declassification (loosening) needs an operator-root act,
 *   · the gate wiring (`capTierShareDecision`): the declared datum can only WITHDRAW a doc the structure
 *     already crossed — never grant one the structure denied.
 */
import { describe, test, expect } from "vitest";
import { interpretAsDocumentId, type DocumentId } from "@automerge/automerge-repo";
import { crossroadsDocUrl } from "../src/deterministic-doc.js";
import {
  CAP_TIER_ORDER, DEFAULT_CAP_TIER, capTierRank, parseCapTier, meetCapTier, resolveTier,
  refineBagTierWithTiddlers, mayDeclareTier, mayDeclassify, structuralFloorFor, resolveTierForDoc,
  tierPermitsRelayPeer, capTierShareDecision,
  DeterministicFederationGate,
  type CapTier, type CapTierRing, type NexusMembership, type PlaneSeal,
} from "../src/index.js";

const ALL: readonly CapTier[] = CAP_TIER_ORDER;

describe("the total order — VEIL < PERSONAGROUP < CONTRACT < PUBLIC", () => {
  test("rank ascends in openness; VEIL is the floor default", () => {
    expect(CAP_TIER_ORDER).toEqual(["veil", "personagroup", "contract", "public"]);
    expect(capTierRank("veil")).toBeLessThan(capTierRank("personagroup"));
    expect(capTierRank("personagroup")).toBeLessThan(capTierRank("contract"));
    expect(capTierRank("contract")).toBeLessThan(capTierRank("public"));
    expect(DEFAULT_CAP_TIER).toBe("veil");
  });
});

describe("parseCapTier — fail-closed to VEIL", () => {
  test("the four exact literals parse (case + whitespace tolerant)", () => {
    expect(parseCapTier("veil")).toBe("veil");
    expect(parseCapTier(" PUBLIC ")).toBe("public");
    expect(parseCapTier("Contract")).toBe("contract");
  });
  test("absent / torn / unknown → VEIL (never a silent open)", () => {
    for (const bad of [undefined, null, "", "world", "open", "group:foo", 3, {}]) {
      expect(parseCapTier(bad)).toBe("veil");
    }
  });
});

describe("meetCapTier — the taint-meet (more-restrictive)", () => {
  test("VEIL absorbs; PUBLIC is identity", () => {
    for (const t of ALL) {
      expect(meetCapTier("veil", t)).toBe("veil");
      expect(meetCapTier(t, "veil")).toBe("veil");
      expect(meetCapTier("public", t)).toBe(t);
      expect(meetCapTier(t, "public")).toBe(t);
    }
  });
  test("commutative, idempotent, and never climbs above either input", () => {
    for (const a of ALL) for (const b of ALL) {
      expect(meetCapTier(a, b)).toBe(meetCapTier(b, a));
      const m = meetCapTier(a, b);
      expect(capTierRank(m)).toBeLessThanOrEqual(Math.min(capTierRank(a), capTierRank(b)));
    }
    for (const t of ALL) expect(meetCapTier(t, t)).toBe(t);
  });
  test("associative", () => {
    for (const a of ALL) for (const b of ALL) for (const c of ALL) {
      expect(meetCapTier(meetCapTier(a, b), c)).toBe(meetCapTier(a, meetCapTier(b, c)));
    }
  });
});

describe("THE SAFETY KEYSTONE — resolveTier = declared ∧ floor, tighten-only", () => {
  test("declared PUBLIC ∧ floor PERSONAGROUP → PERSONAGROUP (NEVER PUBLIC)", () => {
    expect(resolveTier("public", "personagroup")).toBe("personagroup");
  });
  test("declared self-tightens below the floor", () => {
    expect(resolveTier("veil", "public")).toBe("veil");
    expect(resolveTier("personagroup", "contract")).toBe("personagroup");
  });
  test("the quine can NEVER out-open its floor — resolved ≤ floor for EVERY (declared, floor)", () => {
    for (const declared of ALL) for (const floor of ALL) {
      const r = resolveTier(declared, floor);
      expect(capTierRank(r)).toBeLessThanOrEqual(capTierRank(floor));      // never more-open than the crypto floor
      expect(capTierRank(r)).toBeLessThanOrEqual(capTierRank(declared));   // never more-open than the declaration
    }
  });
});

describe("refineBagTierWithTiddlers — the high-water-mark cascade (tighten-only)", () => {
  test("a bag is only as shareable as its least-shareable tiddler", () => {
    expect(refineBagTierWithTiddlers("public", ["public", "personagroup", "public"])).toBe("personagroup");
    expect(refineBagTierWithTiddlers("contract", [])).toBe("contract");           // no refinement → the default
    expect(refineBagTierWithTiddlers("personagroup", ["public"])).toBe("personagroup"); // a looser tiddler never loosens
  });
});

describe("mayDeclareTier — META-CAP ≥ declared cap", () => {
  test("a world-editable datum on a private bag is DENIED; a tighter meta-cap always passes", () => {
    expect(mayDeclareTier("veil", "public")).toBe(false);   // publicly-editable declaration of a private bag → no
    expect(mayDeclareTier("public", "public")).toBe(true);
    expect(mayDeclareTier("public", "veil")).toBe(true);    // tighter meta-cap on an open bag → yes
    expect(mayDeclareTier("contract", "personagroup")).toBe(true);
  });
});

describe("mayDeclassify — loosening is an operator-root act (one-way ratchet)", () => {
  test("tightening never needs the operator; loosening needs operator-root", () => {
    expect(mayDeclassify("public", "veil", false)).toBe(true);        // tighten → free
    expect(mayDeclassify("contract", "contract", false)).toBe(true);  // no-op → free
    expect(mayDeclassify("veil", "public", false)).toBe(false);       // loosen without root → DENY
    expect(mayDeclassify("veil", "public", true)).toBe(true);         // loosen WITH operator-root → allowed
    expect(mayDeclassify("personagroup", "contract", false)).toBe(false);
  });
});

describe("structuralFloorFor — where the floor comes from on a real bag", () => {
  const oracle = {
    isPublicPlane: (d: string) => d === "pub",
    isSealedPlane: (d: string) => d === "sealed",
  };
  test("federatable-public → PUBLIC; sealed → CONTRACT; cleartext-local → VEIL; null oracle → VEIL", () => {
    expect(structuralFloorFor(oracle, "pub")).toBe("public");
    expect(structuralFloorFor(oracle, "sealed")).toBe("contract");
    expect(structuralFloorFor(oracle, "cleartext")).toBe("veil");
    expect(structuralFloorFor(null, "pub")).toBe("veil");
  });
});

describe("resolveTierForDoc — null declaration degenerates to the floor (inert)", () => {
  const ring: CapTierRing = {
    floor:    { isPublicPlane: (d) => d === "pub", isSealedPlane: (d) => d === "sealed" },
    declared: { declaredTierForDoc: (d) => (d === "pub" ? "personagroup" : null) },
  };
  test("a declared doc tightens; an undeclared doc rides the floor unchanged", () => {
    expect(resolveTierForDoc(ring, "pub")).toBe("personagroup");    // PUBLIC floor, declared tighter → tightened
    expect(resolveTierForDoc(ring, "sealed")).toBe("contract");     // null declaration → floor governs
    expect(resolveTierForDoc(ring, "cleartext")).toBe("veil");
  });
});

describe("tierPermitsRelayPeer — the holder-set chain at the wire", () => {
  test("PUBLIC → any; CONTRACT/PERSONAGROUP → member only; VEIL → none", () => {
    expect(tierPermitsRelayPeer("public", false)).toBe(true);
    expect(tierPermitsRelayPeer("contract", true)).toBe(true);
    expect(tierPermitsRelayPeer("contract", false)).toBe(false);
    expect(tierPermitsRelayPeer("personagroup", true)).toBe(true);
    expect(tierPermitsRelayPeer("personagroup", false)).toBe(false);
    expect(tierPermitsRelayPeer("veil", true)).toBe(false);
  });
});

// ── The GATE WIRING — the keystone enforced end-to-end at the sharePolicy seam ──────────────────────
const NEXUS = "a".repeat(64);
const relayGate = new DeterministicFederationGate(NEXUS);
// The @crossroads public board is in the federatable set — grab its documentId via the gate's own membership.
// (federatable ids are private; we test the WITHDRAWAL through a floor oracle keyed on documentId instead.)
const STRANGER = "peer-stranger";
const MEMBER = "peer-member";
const relayPeers = new Set<string>([STRANGER, MEMBER]);
const membership: NexusMembership = { holdsCarriagePeer: (p) => p === MEMBER };

/** A floor oracle + declared source over a synthetic public docId, so the tighten is observable at the seam. */
function ringDeclaring(docId: string, declared: CapTier | null): CapTierRing {
  return {
    floor:    { isPublicPlane: (d) => d === docId, isSealedPlane: () => false },
    declared: { declaredTierForDoc: (d) => (d === docId ? declared : null) },
  };
}
/** A PlaneSeal that seals exactly one docId — lets us model the base carry-split's PUBLIC floor. */
const noSeal: PlaneSeal = { isSealedPlane: () => false };

describe("capTierShareDecision — the gate consults the declared tier, TIGHTEN-ONLY", () => {
  // A real federatable docId so `carrierShareDecision` says PUBLIC-cross; then the declared tier withdraws.
  // The @crossroads public board is deterministically addressed from the nexus key (the gate federates it).
  const crossroadsId = interpretAsDocumentId(crossroadsDocUrl(NEXUS)) as DocumentId;

  test("SETUP — a federatable doc crosses to a STRANGER at the structural floor (base allows)", async () => {
    expect(crossroadsId).toBeTruthy();
    const base = await capTierShareDecision(
      relayPeers, relayGate, null, null, membership, noSeal, /*capTiers*/ null,
      STRANGER, crossroadsId,
    );
    expect(base).toBe(true);   // no tier ring → inert → the public board crosses (today's behavior)
  });

  test("THE KEYSTONE — a bag that DECLARES itself PERSONAGROUP is WITHDRAWN from a stranger's crossing", async () => {
    const ring = ringDeclaring(crossroadsId as string, "personagroup");
    const v = await capTierShareDecision(
      relayPeers, relayGate, null, null, membership, noSeal, ring,
      STRANGER, crossroadsId,
    );
    expect(v).toBe(false);   // declared PERSONAGROUP ∧ PUBLIC floor → PERSONAGROUP → a stranger holds no read-cap
  });

  test("the SAME PERSONAGROUP bag STILL crosses to a MEMBER (tighten, not blanket-deny)", async () => {
    const ring = ringDeclaring(crossroadsId as string, "personagroup");
    const v = await capTierShareDecision(
      relayPeers, relayGate, null, null, membership, noSeal, ring,
      MEMBER, crossroadsId,
    );
    expect(v).toBe(true);
  });

  test("a declared PUBLIC leaves the public crossing intact (a no-op tighten)", async () => {
    const ring = ringDeclaring(crossroadsId as string, "public");
    const v = await capTierShareDecision(
      relayPeers, relayGate, null, null, membership, noSeal, ring,
      STRANGER, crossroadsId,
    );
    expect(v).toBe(true);
  });

  test("a declared VEIL withdraws the doc from EVERY relay peer (member included)", async () => {
    const ring = ringDeclaring(crossroadsId as string, "veil");
    expect(await capTierShareDecision(relayPeers, relayGate, null, null, membership, noSeal, ring, STRANGER, crossroadsId)).toBe(false);
    expect(await capTierShareDecision(relayPeers, relayGate, null, null, membership, noSeal, ring, MEMBER, crossroadsId)).toBe(false);
  });

  test("the tier NEVER loosens — a doc the STRUCTURE denied stays denied even when the datum DECLARES PUBLIC", async () => {
    // A NON-federatable, non-sealed doc: the base carry-split denies it to a stranger. A declared PUBLIC must NOT grant it.
    const privateDoc = "deadbeef" as unknown as DocumentId;
    const ring: CapTierRing = {
      floor:    { isPublicPlane: () => false, isSealedPlane: () => false },   // VEIL structural floor
      declared: { declaredTierForDoc: () => "public" },                       // the datum LIES open
    };
    const v = await capTierShareDecision(
      relayPeers, relayGate, null, null, membership, noSeal, ring,
      STRANGER, privateDoc,
    );
    expect(v).toBe(false);   // structure denied → tier cannot resurrect (the keystone is one-directional)
  });
});
