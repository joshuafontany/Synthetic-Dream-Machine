/**
 * The contract-secrets plane — a store whose bytes lose their meaning on publication floors at CONTRACT.
 *
 * The guarantee under test rides the READING ORDER inside `structuralFloorFor` (proven in the mesh suite) and
 * the ASSEMBLY here: a floor oracle built through `makeTierFloorOracle` cannot silently omit the secrets
 * reading, because each reading arrives as a named argument rather than as a remembered property.
 */
import { describe, expect, test } from "vitest";

import type { DocumentId } from "@automerge/automerge-repo";
import { makeTierFloorOracle, structuralFloorFor, resolveTierForDoc, type CapTierRing } from "@lararium/mesh";
import { makeContractSecretsRegistry, NO_CONTRACT_SECRETS_PLANE } from "../src/plane-secrets.js";

const CREDS = "creds-doc" as DocumentId;
const OTHER = "other-doc" as DocumentId;

describe("the registry records what a creating path did", () => {
  test("empty at birth reads exactly as the no-secrets floor", () => {
    const reg = makeContractSecretsRegistry();
    expect(reg.size).toBe(0);
    expect(reg.plane.isContractSecretsPlane(CREDS)).toBe(false);
    expect(NO_CONTRACT_SECRETS_PLANE.isContractSecretsPlane(CREDS)).toBe(false);
  });

  test("the oracle reads the CURRENT set, so a later registration takes effect on a held reference", () => {
    const reg = makeContractSecretsRegistry();
    const held = reg.plane;                       // a gate closing over the oracle before anything registers
    expect(held.isContractSecretsPlane(CREDS)).toBe(false);
    reg.register(CREDS);
    expect(held.isContractSecretsPlane(CREDS)).toBe(true);   // live, not a snapshot
    expect(held.isContractSecretsPlane(OTHER)).toBe(false);
  });

  test("registering twice stays one entry", () => {
    const reg = makeContractSecretsRegistry();
    reg.register(CREDS);
    reg.register(CREDS);
    expect(reg.size).toBe(1);
  });
});

describe("a floor assembled through the constructor cannot forget a reading", () => {
  test("a secrets plane floors at CONTRACT even when the federatable reading also claims it", () => {
    const reg = makeContractSecretsRegistry();
    reg.register(CREDS);
    const floor = makeTierFloorOracle({
      federatable: (d) => d === CREDS || d === "pub",   // the collision the ordering exists for
      sealed:      () => false,
      secrets:     (d) => reg.plane.isContractSecretsPlane(d as DocumentId),
    });
    expect(structuralFloorFor(floor, CREDS)).toBe("contract");
    expect(structuralFloorFor(floor, "pub")).toBe("public");
  });

  test("every omitted reading fails closed toward VEIL, never away from it", () => {
    const bare = makeTierFloorOracle({});
    expect(structuralFloorFor(bare, "anything")).toBe("veil");
    expect(bare.isContractSecretsPlane?.("anything")).toBe(false);
    expect(bare.isPublicPlane("anything")).toBe(false);
    expect(bare.isSealedPlane("anything")).toBe(false);
  });

  test("the constructor always supplies the secrets reading, so no assembled oracle omits it", () => {
    // The whole reason the constructor exists: the field is optional on the interface for compatibility,
    // so a hand-rolled literal can leave it out and read identically to one that had nothing to declare.
    expect(typeof makeTierFloorOracle({ federatable: () => true }).isContractSecretsPlane).toBe("function");
  });
});

describe("the keystone applied to a secrets plane", () => {
  const reg = makeContractSecretsRegistry();
  reg.register(CREDS);
  const floor = makeTierFloorOracle({
    federatable: () => true,                                            // the most permissive ambient reading
    secrets:     (d) => reg.plane.isContractSecretsPlane(d as DocumentId),
  });

  test("a PUBLIC declaration meets back down to CONTRACT", () => {
    const ring: CapTierRing = { floor, declared: { declaredTierForDoc: () => "public" } };
    expect(resolveTierForDoc(ring, CREDS)).toBe("contract");
  });

  test("tightening still runs free — a declaration may always narrow", () => {
    const ring: CapTierRing = { floor, declared: { declaredTierForDoc: () => "personagroup" } };
    expect(resolveTierForDoc(ring, CREDS)).toBe("personagroup");
  });

  test("a doc OUTSIDE the registry keeps whatever floor its other readings give it", () => {
    const ring: CapTierRing = { floor, declared: { declaredTierForDoc: () => "public" } };
    expect(resolveTierForDoc(ring, OTHER)).toBe("public");   // nothing is silently protected
  });
});
