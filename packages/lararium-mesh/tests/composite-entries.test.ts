/**
 * composite-entries — CompositeStore.entries() contract (the S0 causal-stamped fold).
 *
 * entries() folds the island's OWN resolved surface: listVisible → resolveTopmost (kāpae-honored),
 * each entry carrying the answering bag + a causal stamp (heads + changeId). It NEVER reaches across
 * islands (local-first). The wiki-sensorium projection folds this.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-store-adapter
 */

import { describe, test, expect } from "vitest";
import { CompositeStore } from "../src/composite-store.js";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import type { ChangeOrigin } from "../src/tiddler-store.js";

const HI = "lar:///ha.ka.ba/@wiki";
const LO = "lar:///ha.ka.ba/@corpus";
function origin(): ChangeOrigin { return { kind: "canon-hydrate", receipt: "test" }; }

describe("CompositeStore.entries()", () => {
  test("folds every live title with its answering bag + causal stamp", async () => {
    const store = new CompositeStore();
    const wiki = new MemoryTiddlerStore(HI);
    store.addLayer({ bagId: HI, store: wiki, writable: true });
    await wiki.put({ tiddler: { title: "alpha", text: "one" }, meta: { changeId: "cid-alpha" } }, origin());
    await wiki.put({ tiddler: { title: "beta", text: "two" } }, origin());

    const entries = await store.entries();
    expect(entries.map((e) => e.title).sort()).toEqual(["alpha", "beta"]);
    const alpha = entries.find((e) => e.title === "alpha")!;
    expect(alpha.bagId).toBe(HI);
    expect(alpha.changeId).toBe("cid-alpha");
    // a memory-backed store carries no CRDT heads — the stamp reads honestly null.
    expect(alpha.heads).toBeNull();
    // an unstamped record reads null, never fabricated.
    expect(entries.find((e) => e.title === "beta")!.changeId).toBeNull();
  });

  test("resolves the TOPMOST manifestation across layers (recipe priority)", async () => {
    const store = new CompositeStore();
    const lo = new MemoryTiddlerStore(LO);
    const hi = new MemoryTiddlerStore(HI);
    store.addLayer({ bagId: LO, store: lo, writable: false });
    store.addLayer({ bagId: HI, store: hi, writable: true });
    await lo.put({ tiddler: { title: "shared", text: "low" } }, origin());
    await hi.put({ tiddler: { title: "shared", text: "high" } }, origin());

    const entries = await store.entries();
    const shared = entries.filter((e) => e.title === "shared");
    expect(shared).toHaveLength(1);           // one entry per title, deduped
    expect(shared[0]!.bagId).toBe(HI);        // the topmost bag answers
    expect(shared[0]!.record.tiddler.text).toBe("high");
  });

  test("kāpae-honored: a top-bag tombstone hides the title (no resurrection)", async () => {
    const store = new CompositeStore();
    const lo = new MemoryTiddlerStore(LO);
    const hi = new MemoryTiddlerStore(HI);
    store.addLayer({ bagId: LO, store: lo, writable: false });
    store.addLayer({ bagId: HI, store: hi, writable: true });
    await lo.put({ tiddler: { title: "ghost", text: "still here below" } }, origin());
    await hi.tombstone("ghost", origin());

    const entries = await store.entries();
    expect(entries.find((e) => e.title === "ghost")).toBeUndefined();
  });
});
