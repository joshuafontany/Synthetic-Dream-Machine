/**
 * resolve-boot-doc.test.ts — the tideline-class boot resolver.
 *
 * Proves the split-brain-safe contract: resolveBootDoc NEVER mints a ghost for a
 * canonically-addressed required doc. A present doc resolves to its real handle; an
 * absent one is surfaced by class — hearth-private fails LOUD (no peer will ever carry
 * it), mesh-shared waits its scale-patience then surfaces "still joining" — never a blank.
 */

import { describe, it, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { resolveBootDoc, isStillJoining } from "../src/repo-helpers.js";

describe("resolveBootDoc — tideline-class boot resolution", () => {
  it("returns the real handle for a doc present in the local store", async () => {
    const repo = new Repo();
    const h = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });
    const got = await resolveBootDoc(repo, h.url, { tideline: "hearth-private", label: "test" });
    expect(got.url).toBe(h.url);   // the SAME id — never a fresh ghost
  });

  it("hearth-private: fails LOUD when unavailable — no peer carries it, so never invent", async () => {
    const origin = new Repo();
    const url = origin.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} }).url; // lives in `origin`
    const node = new Repo();                                                                 // separate, no network
    // THE CLAIM IS THE REFUSAL, KEYED ON ITS REASON. Grepping the prose made this test an editor of
    // wording rather than a guard on behaviour — and the wording had to change, because one message was
    // covering two conditions and offering a store-wiping cure for the harmless one. `reason` is the
    // stable branch surface; the sentence beside it is free to say it better.
    await expect(
      resolveBootDoc(node, url, { tideline: "hearth-private", label: "daemon" }),
    ).rejects.toMatchObject({ reason: "doc-unavailable" });
  });

  it("mesh-shared: waits scale-patience then returns a typed StillJoining — never throws, never invents", async () => {
    const origin = new Repo();
    const url = origin.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} }).url;
    const node = new Repo();
    const got = await resolveBootDoc(node, url, { tideline: "mesh-shared", label: "@wiki", scale: "vessel" });
    expect(isStillJoining(got)).toBe(true);
    if (!isStillJoining(got)) throw new Error("expected StillJoining");
    expect(got.scale).toBe("vessel");
    expect(got.label).toBe("@wiki");
    expect(got.url).toBe(url);          // the SAME id — never a fresh ghost
    expect(got.waitedMs).toBe(3_000);   // vessel-scale patience
  });
});
