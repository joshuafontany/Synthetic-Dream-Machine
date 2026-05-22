import { describe, test, expect } from "vitest";
import type { LarBlobEntry } from "@lararium/mesh";
import { collectVmPreloadedTiddlers } from "../src/vm-session.js";

function blobEntry(text: string): LarBlobEntry {
  return {
    id: "$:/plugins/test/plugin",
    version: "1.0.0",
    sha256: "sha256:test",
    mimeType: "application/json",
    blob: new TextEncoder().encode(text),
  };
}

describe("vm-session", () => {
  test("collectVmPreloadedTiddlers only includes configured recipe plugins", () => {
    const result = collectVmPreloadedTiddlers({
      recipePlugins: ["$:/plugins/test/yes"],
      blobs: {
        "$:/plugins/test/yes": blobEntry(JSON.stringify({ title: "$:/plugins/test/yes" })),
        "$:/plugins/test/no": blobEntry(JSON.stringify({ title: "$:/plugins/test/no" })),
      },
    });

    expect(result).toEqual([{ title: "$:/plugins/test/yes" }]);
  });

  test("collectVmPreloadedTiddlers appends the bootstrap plugin after vendored plugins", () => {
    const bootstrapPlugin = { title: "lar:///bootstrap/plugin" };
    const result = collectVmPreloadedTiddlers({
      recipePlugins: ["$:/plugins/test/yes"],
      blobs: {
        "$:/plugins/test/yes": blobEntry(JSON.stringify({ title: "$:/plugins/test/yes" })),
      },
      bootstrapPlugin,
    });

    expect(result).toEqual([
      { title: "$:/plugins/test/yes" },
      bootstrapPlugin,
    ]);
  });

  test("collectVmPreloadedTiddlers ignores malformed plugin payloads", () => {
    const result = collectVmPreloadedTiddlers({
      recipePlugins: ["$:/plugins/test/bad"],
      blobs: {
        "$:/plugins/test/bad": blobEntry("not json"),
      },
    });

    expect(result).toEqual([]);
  });
});