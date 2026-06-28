/**
 * island-recipe.test.ts — the write-layer seed gate (working/canon split).
 *
 * buildIslandRecipe points config/current-wiki-bag at the wiki's LIVE write
 * layer. An operator content wiki (a @working grant resolved) routes live edits
 * to @working; a grant-less mount — the @daemon administrative DAEMON, a control
 * plane with no working/canon split — falls back to its OWN bag, keeping a
 * writable default path instead of throwing on the first cascade-routed edit
 * (the gate fix; the grant→layer→seed chain the adaptor flip witness skips).
 *
 * Canon: lar:///ha.ka.ba/@lares/docs/pono/wiki-layer-ontology#shore-law
 */

import { describe, test, expect } from "vitest";
import { buildIslandRecipe } from "../src/island-recipe.js";
import { CompositeStore, WORKING_BAG, wikiBagUri, TEMP_BAG } from "@lararium/mesh";
import type { LarDoc, DocHandle, LarTiddlerRecord, SlotUri } from "@lararium/mesh";
import type { TW5Engine } from "../src/tw5-vm.js";

const CURRENT_WIKI_BAG = "lar:///ha.ka.ba/@lararium/config/current-wiki-bag";

/** Minimal TW5 engine — buildIslandRecipe only constructs an adaptor + flushes. */
function fakeTw5(): TW5Engine {
  return {
    $tw: {
      wiki: {
        getTiddlerText:      () => "",
        getTiddler:          () => undefined,
        filterTiddlers:      () => [],
        addEventListener:    () => {},
        removeEventListener: () => {},
        transact:            (fn: () => void) => fn(),
      },
      lares: {
        enqueueNalu:    () => {},
        flushNalu:      () => {},
        isApplyingNalu: () => false,
        naluPending:    () => 0,
      },
    },
  } as unknown as TW5Engine;
}

/** Minimal Automerge handle — enough for AutomergeDocStore (doc/on/change). */
function fakeHandle(): DocHandle<LarDoc> {
  const doc = { tiddlers: {} } as unknown as LarDoc;
  return {
    url:    "automerge:fake-working",
    doc:    () => doc,
    on:     () => {},
    change: (fn: (d: LarDoc) => void) => fn(doc),
  } as unknown as DocHandle<LarDoc>;
}

async function currentWikiBag(
  stores: ReadonlyArray<{ slot: SlotUri; store: { get(t: string): Promise<LarTiddlerRecord | null> } }>,
): Promise<string | undefined> {
  const temp = stores.find((s) => s.slot === TEMP_BAG)?.store;
  const rec  = temp ? await temp.get(CURRENT_WIKI_BAG) : null;
  return rec?.tiddler.text as string | undefined;
}

describe("buildIslandRecipe — the write-layer seed gate", () => {
  test("a @working grant present → live edits route to @working (operator content wiki)", async () => {
    const composite = new CompositeStore();
    const { stores } = buildIslandRecipe({
      tw5: fakeTw5(),
      composite,
      recipe: { wikiSlug: "myproject" },
      ready: [{ slot: WORKING_BAG, handle: fakeHandle() }],
    });
    expect(await currentWikiBag(stores)).toBe(WORKING_BAG);
  });

  test("no @working grant (the @daemon daemon) → falls back to its OWN bag, never throws", async () => {
    const composite = new CompositeStore();
    const { stores } = buildIslandRecipe({
      tw5: fakeTw5(),
      composite,
      recipe: { wikiSlug: "daemon" },
      ready: [],
    });
    // The control-plane daemon keeps its own bag as the default write path.
    expect(await currentWikiBag(stores)).toBe(wikiBagUri("daemon"));
  });
});
