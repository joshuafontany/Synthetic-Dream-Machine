/**
 * pinned-doc — the ambient-free-bytes invariant every content address rests on.
 *
 * The fault these tests fence: pinning the actor alone leaves automerge's wall-clock TIME in the saved bytes, so
 * two islands materializing one deterministic doc a second apart write two different seq-1 changes under one
 * actor — the single shape automerge refuses, and the shape that surfaced as a live cross-machine sync failure
 * (`duplicate seq 1 found for actor 000…000`). A clock that reads the same twice in a row hides the fault, so
 * these tests move the clock rather than trusting it to differ.
 */
import { describe, test, expect, vi, afterEach } from "vitest";
import { save, load, merge, getAllChanges, decodeChange, change } from "@automerge/automerge";
import { pinnedDoc, PINNED_ACTOR } from "../src/pinned-doc.js";
import { materializeSharedLarDoc, deterministicDocUrl } from "../src/deterministic-doc.js";
import { emptyLarDoc } from "../src/base-doc.js";

/** Mint the same content at two DISTINCT wall-clock seconds — the condition that split the seq-1 change. */
function mintAcrossTheClock<T extends Record<string, unknown>>(content: () => T) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-16T00:00:00Z"));
  const first = save(pinnedDoc(content()));
  vi.setSystemTime(new Date("2026-08-16T04:17:33Z"));
  const second = save(pinnedDoc(content()));
  return { first, second };
}

afterEach(() => { vi.useRealTimers(); });

describe("pinnedDoc — bytes carry no ambient state", () => {
  test("the same content minted hours apart saves byte-identical", () => {
    const { first, second } = mintAcrossTheClock(() => ({ schemaVersion: "0.1", tiddlers: {} }));
    expect(Buffer.from(first).toString("hex")).toBe(Buffer.from(second).toString("hex"));
  });

  test("the seed change pins BOTH ambient fields — actor and time", () => {
    const [seed] = getAllChanges(pinnedDoc({ schemaVersion: "0.1", tiddlers: {} })).map(decodeChange);
    expect(seed.actor).toBe(PINNED_ACTOR);
    expect(seed.time).toBe(0);
  });

  test("two islands that raced to materialize the same doc still merge", () => {
    const { first, second } = mintAcrossTheClock(() => ({ schemaVersion: "0.1", tiddlers: {} }));
    expect(() => merge(load(first), load(second))).not.toThrow();
  });

  test("each island's OWN later writes survive the merge — convergence, not erasure", () => {
    const { first, second } = mintAcrossTheClock(() => ({ schemaVersion: "0.1", tiddlers: {} }));
    // `load` mints a fresh actor per side, exactly as an imported repo handle does
    const a = change(load(first),  (d: Record<string, unknown>) => { (d.tiddlers as Record<string, unknown>).fromA = { text: "a" }; });
    const b = change(load(second), (d: Record<string, unknown>) => { (d.tiddlers as Record<string, unknown>).fromB = { text: "b" }; });
    const merged = merge(a, b) as unknown as { tiddlers: Record<string, unknown> };
    expect(Object.keys(merged.tiddlers).sort()).toEqual(["fromA", "fromB"]);
  });

  test("differing content still yields differing bytes — purity, never a constant", () => {
    const one = save(pinnedDoc({ schemaVersion: "0.1", tiddlers: { x: { text: "1" } } }));
    const two = save(pinnedDoc({ schemaVersion: "0.1", tiddlers: { x: { text: "2" } } }));
    expect(Buffer.from(one).toString("hex")).not.toBe(Buffer.from(two).toString("hex"));
  });
});

describe("materializeSharedLarDoc — the deterministic board two islands both stand", () => {
  test("blank boards materialized hours apart carry the same seed change", async () => {
    const { Repo } = await import("@automerge/automerge-repo");
    const url = deterministicDocUrl("lar:///test.board.pinned#probe");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T00:00:00Z"));
    const islandA = await materializeSharedLarDoc(new Repo({}), url, "board:probe");

    vi.setSystemTime(new Date("2026-08-16T04:17:33Z"));
    const islandB = await materializeSharedLarDoc(new Repo({}), url, "board:probe");

    const seedOf = (h: { doc: () => unknown }) => decodeChange(getAllChanges(h.doc() as never)[0]!).hash;
    expect(seedOf(islandA)).toBe(seedOf(islandB));
    expect(islandA.doc()).toEqual(emptyLarDoc());
  });
});
