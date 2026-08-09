/**
 * The family of PersonaGroup planes, and the one a vessel stands in.
 *
 * The tests worth reading first are the two starred ones. `an unknown group THROWS` guards the failure a
 * fallback would hide: the operator reads one compartment's pet-name and the vessel writes another's
 * plane. The duplicate guard covers the layer-shadowing that makes one group answer a read meant for the
 * other — both silent, both on the identity path.
 */
import { describe, expect, test } from "vitest";

import {
  activePersonaPlane,
  mountedPlaneBagId,
  personaPlanesFault,
  resolvePersonaPlanes,
  type PersonaPlaneRef,
} from "../src/persona-planes.js";
import { personaBagIdFor } from "../src/persona-scope.js";
import { PERSONA_BAG_ID } from "../src/lar-uris.js";

const work: PersonaPlaneRef = { personaGroupId: "work-group", url: "automerge:work" };
const play: PersonaPlaneRef = { personaGroupId: "play-group", url: "automerge:play" };

describe("the family resolves its own names", () => {
  test("each plane's bag id derives from its own group, never hand-written", () => {
    const resolved = resolvePersonaPlanes([work, play]);
    expect(resolved.map((p) => p.bagId)).toEqual([personaBagIdFor("work-group"), personaBagIdFor("play-group")]);
  });

  test("resolving keeps the doc url intact, so a mount reads the plane it named", () => {
    expect(resolvePersonaPlanes([work])[0]?.url).toBe("automerge:work");
  });
});

describe("★ one face at a time ★", () => {
  test("the active group is chosen BY NAME, out of the family the vessel holds", () => {
    expect(activePersonaPlane([work, play], "play-group").url).toBe("automerge:play");
    expect(activePersonaPlane([work, play], "play-group").bagId).toBe(personaBagIdFor("play-group"));
  });

  test("★ an unknown group THROWS — never a quiet fall back to the first plane ★", () => {
    // The failure this forbids: the operator reads one compartment's pet-name on the screen while the
    // vessel writes another group's multitude, signer pin and device edge. A boot that cannot stand in
    // the compartment it was told to must stop.
    expect(() => activePersonaPlane([work, play], "absent-group")).toThrow(/no plane for the active PersonaGroup/);
  });

  test("the throw counts the planes and names none of them", () => {
    // An error string travels into logs, bug reports and screenshots — further than the vault it came
    // from. It may say how many compartments this vessel holds; it may never say which.
    try {
      activePersonaPlane([work, play], "absent-group");
      expect.unreachable();
    } catch (e) {
      const msg = String(e);
      expect(msg).toContain("holds 2");
      expect(msg).not.toContain("work-group");
      expect(msg).not.toContain("play-group");
    }
  });
});

describe("★ a family that could shadow itself never boots ★", () => {
  test("★ one group appearing twice reads as a fault, because two writable layers shadow ★", () => {
    expect(personaPlanesFault([work, work])).toMatch(/twice/);
  });

  test("a vessel standing in a group with no plane reads as a fault", () => {
    expect(personaPlanesFault([])).toMatch(/no persona plane/);
  });

  test("a well-formed family carries no fault", () => {
    expect(personaPlanesFault([work, play])).toBeNull();
  });
});

describe("★ deixis resolves HERE, and only the absolute name leaves ★", () => {
  test("★ the resolved name is the plane's ABSOLUTE name, never the deictic constant ★", () => {
    // The whole law in one assertion. A deictic that survives resolution becomes an operand in the
    // capability decision — the configuration SPKI/SDSI rules out, Capsicum banned for the filesystem
    // (`AT_FDCWD`), and MITRE catalogues as CWE-386. Return the constant here and the gesture leaks
    // into the map, where a bag URL is hashed to seed the document it names.
    const bagId = mountedPlaneBagId([work, play], "work-group");
    expect(bagId).toBe(personaBagIdFor("work-group"));
    expect(bagId).not.toBe(PERSONA_BAG_ID);
  });

  test("standing in a different group resolves to a different absolute name", () => {
    expect(mountedPlaneBagId([work, play], "work-group"))
      .not.toBe(mountedPlaneBagId([work, play], "play-group"));
  });

  test("resolution is stable, so the same gesture names the same plane on every boot", () => {
    expect(mountedPlaneBagId([work, play], "play-group")).toBe(mountedPlaneBagId([play, work], "play-group"));
  });

  test("an ungrounded gesture halts — a deictic with no referent errors, never defaults", () => {
    // DNS makes an unresolvable relative name an error rather than a fallback; every silent-default
    // case in the surveyed art produced documented harm.
    expect(() => mountedPlaneBagId([work, play], "absent-group")).toThrow();
  });
});
