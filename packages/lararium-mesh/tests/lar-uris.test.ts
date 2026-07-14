/**
 * lar-uris — petname l-space region predicates.
 *
 * Realizes the ruled capability-is-identity + petname model in code. Petnames /
 * TW5 titles ride the lar: grammar as a NAMING layer, classifying an address by
 * name-stability only: STABLE (ha.ka.ba — canonical, permanent) vs UNSTABLE (any
 * other three-term attitude root — a session/per-place local name). This naming
 * layer is ORTHOGONAL to federation (the residency bag controls that, not the
 * namespace) and to persistence (every meme persists but volatile-VM scratch).
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/lararium-identity#capability-and-petnames
 */

import { describe, test, expect } from "vitest";
import {
  larRoot,
  isStableLarUri,
  isUnstablePetnameUri,
  isPersistableLarUri,
  isVolatileVmUri,
  stableLarUri,
  volatileVmUri,
  STABLE_L_SPACE,
  MESH_SCALES,
  parseMeshScale,
  bagUri,
  wikiUri,
  cidUri,
  nexusRegistryUri,
  nexusHandlesUri,
  NEXUS_DOC_URI,
  CROSSROADS_DOC_URI,
  CATALOG_DOC_URI,
  ORACLE_DOC_URI,
  BAG_IDS,
  legacyIdentityUri,
  identitySlug,
} from "../src/lar-uris.js";

describe("lar-uris petname regions", () => {
  const stable = stableLarUri("@oracle"); // lar:///ha.ka.ba/bags/@oracle
  const stableBare = `lar:///${STABLE_L_SPACE}`; // root, no trailing path
  const volatile = volatileVmUri("scratch/x"); // lar:///lararium.local.vm/scratch/x
  const unstable = "lar:///threshold.uncertain.opens/peer/handle"; // a living local petname
  const session = "lar://alias:grant@host/some/path"; // session-form, capability-bearing

  test("larRoot extracts the authority-less root, undefined for session-form", () => {
    expect(larRoot(stable)).toBe("ha.ka.ba");
    expect(larRoot(stableBare)).toBe("ha.ka.ba");
    expect(larRoot(volatile)).toBe("lararium.local.vm");
    expect(larRoot(unstable)).toBe("threshold.uncertain.opens");
    expect(larRoot(session)).toBeUndefined();
    expect(larRoot("not-a-lar-uri")).toBeUndefined();
  });

  test("the stable region is ha.ka.ba alone", () => {
    expect(isStableLarUri(stable)).toBe(true);
    expect(isStableLarUri(stableBare)).toBe(true);
    expect(isStableLarUri(volatile)).toBe(false);
    expect(isStableLarUri(unstable)).toBe(false);
    expect(isStableLarUri(session)).toBe(false);
  });

  test("unstable petnames are any non-stable, non-volatile-VM local root", () => {
    expect(isUnstablePetnameUri(unstable)).toBe(true);
    expect(isUnstablePetnameUri(stable)).toBe(false);
    expect(isUnstablePetnameUri(volatile)).toBe(false); // reserved scratch, not a petname
    expect(isUnstablePetnameUri(session)).toBe(false); // session-form has no local root
  });

  test("persistence is LOCAL — every meme persists except volatile-VM scratch", () => {
    // We persist all memes. Stable AND unstable petnames write to the local store;
    // only pure volatile-VM scratch never persists. (Federation — what crosses to
    // peers — is controlled by the RESIDENCY BAG + capability, not by this naming axis.)
    expect(isPersistableLarUri(stable)).toBe(true);
    expect(isPersistableLarUri(unstable)).toBe(true); // local petname persists locally, even though it never federates
    expect(isPersistableLarUri(volatile)).toBe(false); // the one non-persistable region
  });

  test("the three regions stay mutually exclusive", () => {
    for (const uri of [stable, volatile, unstable]) {
      const flags = [isStableLarUri(uri), isVolatileVmUri(uri), isUnstablePetnameUri(uri)];
      expect(flags.filter(Boolean)).toHaveLength(1);
    }
  });
});

describe("parseMeshScale — federation scale declared on a residency entry", () => {
  test("accepts each of the five scales verbatim", () => {
    for (const s of MESH_SCALES) expect(parseMeshScale(s)).toBe(s);
    expect(MESH_SCALES).toHaveLength(5);
  });

  test("returns undefined for absent or unrecognized — caller defaults patience", () => {
    expect(parseMeshScale(undefined)).toBeUndefined();
    expect(parseMeshScale(null)).toBeUndefined();
    expect(parseMeshScale("")).toBeUndefined();
    expect(parseMeshScale("planet")).toBeUndefined();
    expect(parseMeshScale("Vessel")).toBeUndefined(); // case-sensitive, exact match
  });
});

describe("bag / wiki identity — the two kinds the @catalog tracks", () => {
  test("bagUri / wikiUri mint the kind into the first path segment", () => {
    expect(bagUri("elyncia")).toBe("lar:///ha.ka.ba/bags/@elyncia");
    expect(wikiUri("elyncia")).toBe("lar:///ha.ka.ba/wikis/@elyncia");
  });

  test("a leading @ on the slug never doubles", () => {
    expect(bagUri("@lares")).toBe("lar:///ha.ka.ba/bags/@lares");
    expect(wikiUri("@lares")).toBe("lar:///ha.ka.ba/wikis/@lares");
  });

  test("the two kinds NEVER collide for one slug", () => {
    expect(bagUri("lares")).not.toBe(wikiUri("lares"));
  });

  test("legacyIdentityUri mints the pre-split form a prior store still carries", () => {
    expect(legacyIdentityUri("lares")).toBe("lar:///ha.ka.ba/@lares");
    expect(legacyIdentityUri("@lares")).toBe("lar:///ha.ka.ba/@lares");
  });

  test("identitySlug reads the slug from all three forms", () => {
    expect(identitySlug(bagUri("sdm"))).toBe("sdm");
    expect(identitySlug(wikiUri("sdm"))).toBe("sdm");
    expect(identitySlug(legacyIdentityUri("sdm"))).toBe("sdm");
  });

  test("identitySlug returns null for a nested path — a bare identity carries none", () => {
    expect(identitySlug("lar:///ha.ka.ba/wikis/@lares/drafts/did%3Aweb")).toBeNull();
    expect(identitySlug("lar:///ha.ka.ba/lares/api/lares/noosphere-boot")).toBeNull();
    expect(identitySlug("lar:///threshold.uncertain.opens")).toBeNull();
  });

  test("a meme URI keeps its ha.ka.ba root arity — the split never touches it", () => {
    // Four path segments; the split adds no fifth (bag identity rides its own URI).
    const meme = "lar:///ha.ka.ba/lares/api/lares/noosphere-boot";
    expect(identitySlug(meme)).toBeNull();               // not an identity
    expect(meme.split("/").filter(Boolean).length).toBe(6); // scheme-empty + ha.ka.ba + 4 segs
  });
});

describe("cid — the /ipfs/ immutable-artifact plane", () => {
  test("cidUri names an artifact by its content hash, no petname @", () => {
    expect(cidUri("bafkreihi4cyml3fjm3pdjbxr44mjgae6aahz6275bpurvsfw42oxw6w3pq"))
      .toBe("lar:///ha.ka.ba/cid/bafkreihi4cyml3fjm3pdjbxr44mjgae6aahz6275bpurvsfw42oxw6w3pq");
    expect(cidUri("bafkreihi4cyml3fjm3pdjbxr44mjgae6aahz6275bpurvsfw42oxw6w3pq")).not.toContain("@");
  });

  test("the cid plane never collides with bags/ or wikis/ for a same-string slug", () => {
    // A contrived overlap: the three planes stay disjoint by their segment.
    expect(cidUri("x")).not.toBe(bagUri("x"));
    expect(cidUri("x")).not.toBe(wikiUri("x"));
  });

  test("the same hash mints the same name — immutability by construction", () => {
    const h = "bafkreiayqszi37beu6bgewomlwrj5ko7hjjxjs6nzp6qbntic4ufk4uehq";
    expect(cidUri(h)).toBe(cidUri(h));
  });
});

describe("@nexus — the confederation plane, scoped per causal island", () => {
  const NX = "abcdef0123456789";

  test("the registry and the handles-face are DISTINCT docs, siblings under one nexus-pubkey", () => {
    expect(nexusRegistryUri(NX)).toBe(`${NEXUS_DOC_URI}/${NX}`);
    expect(nexusHandlesUri(NX)).toBe(`${NEXUS_DOC_URI}/${NX}/handles`);
    // WHO ⊥ the members roster — the two faces never collapse to one doc
    expect(nexusHandlesUri(NX)).not.toBe(nexusRegistryUri(NX));
    expect(nexusHandlesUri(NX).startsWith(nexusRegistryUri(NX))).toBe(true);   // sibling under the same root
  });

  test("each Nexus scopes to its own island — a different pubkey is a different WHO face", () => {
    expect(nexusHandlesUri("nexusA")).not.toBe(nexusHandlesUri("nexusB"));
    // the reach lives in the doc URI (per nexus); the identity KIND lives in the tiddler key (portable)
    expect(nexusHandlesUri("nexusA")).toContain("nexusA");
  });
});

describe("@crossroads — the public oracle plane (three-plane model)", () => {
  test("the three oracle planes are distinct bags — system, private, public never collapse", () => {
    expect(CROSSROADS_DOC_URI).toBe(bagUri("crossroads"));
    // @oracle (system-island) ⊥ @catalog (private OCAP) ⊥ @crossroads (public)
    expect(new Set([ORACLE_DOC_URI, CATALOG_DOC_URI, CROSSROADS_DOC_URI]).size).toBe(3);
    expect(BAG_IDS.crossroads).toBe(CROSSROADS_DOC_URI);
  });

  test("the WHO face's oracle-key rides a DISTINCT plane from its own doc URI (pointer ⊥ target)", () => {
    // the per-nexus WHO doc lives under @nexus; its oracle-pointer lives under @crossroads — two planes,
    // one names the doc, the other publishes where to find it to a stranger.
    expect(nexusHandlesUri("nx").startsWith(NEXUS_DOC_URI)).toBe(true);
    expect(nexusHandlesUri("nx").startsWith(CROSSROADS_DOC_URI)).toBe(false);
  });
});
