/**
 * routing-totality — every tiddler a hand saves reaches the store.
 *
 * ── THE MODEL THIS HOLDS ────────────────────────────────────────────────────────────────────────
 * The bag-paths cascade decides WHICH slot a save lands in. It does NOT decide WHETHER a save
 * lands: everything a hand edits and saves — memes, `.tid`s, and every other TW5 filetype — travels
 * through the CRDT and round-trips. A title that matches no rule is a ROUTER GAP, never a decision.
 *
 * ⚠ THE FAILURE THIS EXISTS TO REFUSE. When "no rule matched" means "drop the write", the drop is
 * silent and total: `saveTiddler` returns a resolved promise, the wiki shows the edit, nothing
 * persists, and the tiddler is gone on the next boot. Measured against the shipped cascade, that
 * reached every plain title a person would ever type — `Shopping List`, `HelloThere`, an imported
 * image — and most `$:/` configuration besides.
 *
 * ── WHAT MAY STILL NOT PERSIST, AND HOW IT SAYS SO ──────────────────────────────────────────────
 * TW5 answers this question with a TOTAL default and a NAMED exclusion list (`$:/config/SyncFilter`:
 * `[is[tiddler]] -[[$:/core]] -[[$:/library/sjcl.js]] -[prefix[$:/boot/]] …`). We take the same
 * shape. The engine's own bytes are build output, regenerable, and reach the vessel through the CAS
 * plane rather than a bag — so they are excluded BY A RULE THAT NAMES THEM, which an operator can
 * read and edit. A silent gap and a named exclusion are different acts, and only one of them is
 * auditable.
 *
 * These vectors drive the REAL TiddlyWiki filter engine over the SHIPPED cascade. A fake router is
 * exactly the instrument that would bless a rule the engine parses differently.
 *
 * Meme: lar:///ha.ka.ba/lares/docs/pono/wiki-layer-ontology
 */

import { describe, expect, test, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { bootTestWiki, wikiSkip, skipNote, REPO } from "./test-wiki.js";
import { IslandAdaptor } from "../src/island-adaptor.js";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import type { TW5Engine } from "../src/tw5-vm.js";

const SHIPPED = path.join(REPO, "packages/lararium-tw5/tiddlers/lar-bag-paths.tid");
const SLOT_WORKING = "lar:///ha.ka.ba/wikis/test/working";

/** The cascade body of the SHIPPED tiddler — frontmatter ends at the first blank line. */
function shippedCascade(): string[] {
  const raw = readFileSync(SHIPPED, "utf8");
  return raw.slice(raw.indexOf("\n\n") + 2).trim().split("\n").map((s) => s.trim()).filter(Boolean);
}

/** Titles a hand actually produces, and the engine bytes it never does. */
const HAND_WRITTEN = [
  "lar:///ha.ka.ba/lares/api/pono/thing",   // a meme
  "Shopping List",                          // a plain tiddler with a space
  "HelloThere",                             // TW5's own first tiddler
  "Motovun Jack.jpg",                       // an imported image
  "$:/SiteTitle",                           // configuration a person edits
  "$:/DefaultTiddlers",
  "$:/theme",
  "$:/config/Something",
] as const;

/** Build output. Regenerable, reaches the vessel by CAS, and never a person's edit. */
const ENGINE_BYTES = ["$:/core", "$:/library/sjcl.js"] as const;

describe.skipIf(wikiSkip)(`routing totality — the cascade routes, it does not decide${skipNote}`, () => {
  let engine: TW5Engine;
  let route: (title: string) => string | null;

  beforeAll(async () => {
    engine = await bootTestWiki();
    const wiki = engine.$tw.wiki as never as {
      filterTiddlers(f: string, w?: unknown, s?: unknown): string[];
      getTiddler(t: string): unknown;
      addTiddler(t: unknown): void;
    };
    const Tiddler = (engine.$tw as never as { Tiddler: new (f: unknown) => unknown }).Tiddler;
    // The slot pointers `island-recipe` seeds at boot; the cascade dereferences them.
    for (const [title, text] of [
      ["lar:///ha.ka.ba/lararium/config/current-wiki-bag",      "SLOT/working"],
      ["lar:///ha.ka.ba/lararium/config/current-wiki-temp",     "SLOT/temp"],
      ["lar:///ha.ka.ba/lararium/config/current-wiki-draft",    "SLOT/draft"],
      ["lar:///ha.ka.ba/lararium/config/current-wiki-personal", "SLOT/personal"],
    ] as const) wiki.addTiddler(new Tiddler({ title, text }));

    // The adaptor's own walk (`island-adaptor._routeBag`), driven here over the shipped rules.
    route = (title: string): string | null => {
      const source = (fn: (t: unknown, ti: string) => void): void => fn(wiki.getTiddler(title), title);
      for (const f of shippedCascade()) {
        const r = wiki.filterTiddlers(f, undefined, source as never);
        if (r.length === 0) continue;
        const first = r[0] ?? "";
        return first === "" ? null : first;
      }
      return null;
    };
  }, 120_000);

  test("★ every title a hand writes routes to a slot ★", () => {
    const dropped = HAND_WRITTEN.filter((t) => route(t) === null);
    expect(dropped, "these saves reach no slot and vanish on the next boot").toEqual([]);
  });

  /**
   * A title that no longer exists still routes — a tombstone is a write, and the tiddler is already
   * gone from the wiki when the delete arrives. A rule keyed on EXISTENCE would drop every deletion
   * of a hand-written tiddler while routing its creation correctly.
   */
  test("a deleted title routes the same as a live one, so its tombstone lands", () => {
    for (const t of HAND_WRITTEN) expect(route(t), `no route for a deleted "${t}"`).not.toBeNull();
  });

  test("engine build-output is refused BY A RULE THAT NAMES IT, never by a gap", () => {
    const rules = shippedCascade().join("\n");
    for (const t of ENGINE_BYTES) {
      expect(route(t), `${t} must not travel into a bag`).toBeNull();
      expect(rules, `${t} is dropped by silence — no rule mentions it`).toContain(t);
    }
  });

  /** The volatile routes still stand where they stood: named, and pointing at their own slots. */
  test("the volatile and view-state routes keep their slots", () => {
    expect(route("$:/temp/x")).toBe("SLOT/temp");
    expect(route("$:/state/y")).toBe("SLOT/temp");
    expect(route("$:/StoryList")).toBe("SLOT/personal");
    expect(route("Draft of 'X'")).toBe("SLOT/draft");
    expect(route("lar:///ha.ka.ba/x/y")).toBe("SLOT/working");
  });
});

/**
 * THE VESSEL READS THE PACKED CASCADE, NOT THE FILE. `lar-bag-paths.tid` is a build INPUT; the plugin
 * JSON is what a wiki boots. Editing the rules without rebuilding leaves a tree where the disk says
 * one thing, the running wiki does another, and both are internally consistent — the half-build
 * shape, which reports the distance between two builds as behaviour.
 */
describe("the packed cascade is the shipped cascade", () => {
  test("the plugin's bag-paths matches lar-bag-paths.tid — rebuild if this reds", async () => {
    const plugin = JSON.parse(
      readFileSync(path.join(REPO, "packages/lararium-tw5/plugins/lares-memetic-wikitext.json"), "utf8"),
    ) as { text: string };
    const packed = (JSON.parse(plugin.text) as { tiddlers: Record<string, { text: string }> })
      .tiddlers["lar:///ha.ka.ba/lararium/config/bag-paths"];
    expect(packed, "the cascade is absent from the packed plugin — a booted wiki routes nothing").toBeDefined();
    expect(
      packed!.text.trim().split("\n").map((l) => l.trim()).filter(Boolean),
      "the packed cascade drifted from the source — run `pnpm --filter @lararium/tw5 build:plugin`",
    ).toEqual(shippedCascade());
  });
});

describe.skipIf(wikiSkip)(`routing totality — the adaptor persists what it routes${skipNote}`, () => {
  let engine: TW5Engine;

  beforeAll(async () => { engine = await bootTestWiki(); }, 120_000);

  /**
   * One adaptor over a real wiki, so the cascade under test is the PACKED one the vessel runs — the
   * plugin's copy, not the `.tid` on disk. A rig reading the source file would measure the distance
   * between two builds and report it as routing behaviour.
   *
   * The slot pointers are what `island-recipe` seeds at boot; without them the cascade dereferences
   * nothing and every write falls to the router gap.
   */
  const rig = (): { adaptor: IslandAdaptor; store: MemoryTiddlerStore } => {
    const wiki = engine.$tw.wiki as never as { addTiddler(t: unknown): void };
    const Tiddler = (engine.$tw as never as { Tiddler: new (f: unknown) => unknown }).Tiddler;
    for (const [title, text] of [
      ["lar:///ha.ka.ba/lararium/config/current-wiki-bag",      SLOT_WORKING],
      ["lar:///ha.ka.ba/lararium/config/current-wiki-temp",     "lar:///ha.ka.ba/wikis/test/temp"],
      ["lar:///ha.ka.ba/lararium/config/current-wiki-draft",    "lar:///ha.ka.ba/wikis/test/draft"],
      ["lar:///ha.ka.ba/lararium/config/current-wiki-personal", "lar:///ha.ka.ba/wikis/test/personal"],
    ] as const) wiki.addTiddler(new Tiddler({ title, text }));
    const store = new MemoryTiddlerStore();
    const adaptor = new IslandAdaptor(engine, store, "routing-totality");
    return { adaptor, store };
  };

  test("★ a plain-titled tiddler a hand saves reaches the store ★", async () => {
    const { adaptor, store } = rig();
    await adaptor.saveTiddler({ fields: { title: "Shopping List", text: "kalo, poi" } });
    expect(await store.get("Shopping List"), "the save was dropped — nothing persisted").not.toBeNull();
  });

  /**
   * FULL TW5 FILETYPE SET. A carrier's `type` is what every downstream reader dispatches on — the
   * deserializer registry, the disk projector's extension choice, the render shore. A round trip that
   * loses it hands back bytes nothing can name.
   */
  test("a non-memetic TW5 filetype round-trips with its type intact", async () => {
    const { adaptor, store } = rig();
    for (const [title, type, text] of [
      ["Motovun Jack.jpg", "image/jpeg",              "/9j/4AAQSkZJRg=="],
      ["config.json",      "application/json",        '{"a":1}'],
      ["sheet.css",        "text/css",                "body{margin:0}"],
      ["notes.md",         "text/x-markdown",         "# heading"],
      ["Plain",            "text/vnd.tiddlywiki",     "an ordinary tiddler"],
    ] as const) {
      await adaptor.saveTiddler({ fields: { title, type, text } });
      const rec = await store.get(title);
      expect(rec, `${type} did not persist`).not.toBeNull();
      expect(rec?.tiddler["type"], `${type} lost its type in the round trip`).toBe(type);
      expect(rec?.tiddler["text"], `${type} lost its body`).toBe(text);
    }
  });

  test("deleting a plain-titled tiddler tombstones it", async () => {
    const { adaptor, store } = rig();
    await adaptor.saveTiddler({ fields: { title: "Shopping List", text: "kalo" } });
    const seen: string[] = [];
    const orig = store.tombstone.bind(store);
    store.tombstone = async (t, o) => { seen.push(t); return orig(t, o); };
    await adaptor.deleteTiddler("Shopping List");
    expect(seen, "the delete was dropped — the tiddler resurrects on the next boot").toContain("Shopping List");
  });
});
