import { describe, expect, test } from "vitest";
import { namedBagPath, wikiBagPath } from "../src/bag-paths.js";

describe("namedBagPath", () => {
  test("rejects bare canon titles for the @lares mirror", () => {
    const toRelPath = namedBagPath("@lares");

    expect(toRelPath("lar:///ha.ka.ba/docs/lares/the-lares-protocols")).toBeNull();
    expect(toRelPath("lar:///ha.ka.ba/docs/lares/the-lares-protocols#thesis")).toBeNull();
  });

  test("maps explicit versioned @lares titles", () => {
    const toRelPath = namedBagPath("@lares");

    expect(toRelPath("lar:///ha.ka.ba/@lares/v0.1/api/mu")).toBe("api/mu.md");
  });

  test("fragment records never own a disk file (carrier-whole at rest)", () => {
    const toRelPath = namedBagPath("@lares");

    expect(toRelPath("lar:///ha.ka.ba/@lares/v0.1/docs/lares/the-lares-protocols#thesis")).toBeNull();
    expect(toRelPath("lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot#entry")).toBeNull();
  });

  test("rejects @lararium titles for the @lares mirror", () => {
    const toRelPath = namedBagPath("@lares");

    expect(toRelPath("lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/nalu-engine")).toBeNull();
  });
});

describe("wikiBagPath", () => {
  test("rejects bare ha.ka.ba titles", () => {
    const toRelPath = wikiBagPath();

    expect(toRelPath("lar:///ha.ka.ba/docs/lares/the-lares-protocols")).toBeNull();
    expect(toRelPath("lar:///ha.ka.ba/docs/lares/the-lares-protocols#thesis")).toBeNull();
  });

  test("maps versioned named bags into the wiki shadow tree", () => {
    const toRelPath = wikiBagPath();

    expect(toRelPath("lar:///ha.ka.ba/@lares/v0.1/docs/lares/the-lares-protocols")).toBe("lares/v0.1/docs/lares/the-lares-protocols.md");
    expect(toRelPath("lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/nalu-engine")).toBe("lararium/v0.1/tw5/modules/nalu-engine.md");
  });

  test("fragment records never own a disk file (carrier-whole at rest)", () => {
    const toRelPath = wikiBagPath();

    expect(toRelPath("lar:///ha.ka.ba/@lares/v0.1/docs/lares/the-lares-protocols#thesis")).toBeNull();
  });
});
