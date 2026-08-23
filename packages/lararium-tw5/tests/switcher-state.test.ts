/**
 * switcher-state — the @daemon UX widget's IN path.
 *
 * Main pushes the live activation state; the `switcher-state` worker verb writes the
 * LOCAL, volatile $:/temp/lares/switcher tiddler that the projected switcher renders
 * from. This asserts the reactor maps the pushed args onto the tiddler fields the
 * widget reads (`list` = active, plus held/surface/recipeSlug/recipe), and that the
 * state title stays under the $:/temp/ prefix (the confirmed non-sync boundary).
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/daemon-ui-tiddlers#switcher-state
 */

import { describe, test, expect } from "vitest";
import type { TW5Engine } from "../src/tw5-vm.js";
import type { VerbContext } from "../src/verb-dispatcher.js";
import { makeSwitcherStateReactor, SWITCHER_STATE_TITLE } from "../src/daemon-ui-tiddlers.js";

/** A minimal TW5Engine stand-in — the reactor only calls setTiddler. */
function fakeEngine(): { tw5: TW5Engine; written: Array<Record<string, unknown>> } {
  const written: Array<Record<string, unknown>> = [];
  const tw5 = { setTiddler: (fields: Record<string, unknown>) => { written.push(fields); } } as unknown as TW5Engine;
  return { tw5, written };
}

const CTX = {} as VerbContext;   // the reactor ignores context — it closes over the engine

describe("switcher-state reactor", () => {
  test("writes the LOCAL volatile state tiddler under $:/temp/", () => {
    expect(SWITCHER_STATE_TITLE).toBe("$:/temp/lares/switcher");
    expect(SWITCHER_STATE_TITLE.startsWith("$:/temp/")).toBe(true);   // never syncs
  });

  test("maps pushed args onto the fields the widget renders", async () => {
    const { tw5, written } = fakeEngine();
    const reactor = makeSwitcherStateReactor(tw5);

    const result = await reactor(
      { active: "notes daemon lab", held: "notes", surface: "lab", recipeSlug: "notes", recipe: "lar:///ha.ka.ba/bags/notes lar:///ha.ka.ba/bags/shared" },
      CTX,
    );

    expect(result).toEqual({ seeded: true, title: SWITCHER_STATE_TITLE });
    expect(written).toHaveLength(1);
    const t = written[0]!;
    expect(t["title"]).toBe(SWITCHER_STATE_TITLE);
    expect(t["list"]).toBe("notes daemon lab");     // the switcher iterates [list[…]]
    expect(t["held"]).toBe("notes");
    expect(t["surface"]).toBe("lab");
    expect(t["recipeSlug"]).toBe("notes");
    expect(t["recipe"]).toBe("lar:///ha.ka.ba/bags/notes lar:///ha.ka.ba/bags/shared");
    expect(typeof t["ts"]).toBe("string");
  });

  test("missing args degrade to empty strings, never undefined", async () => {
    const { tw5, written } = fakeEngine();
    const reactor = makeSwitcherStateReactor(tw5);
    await reactor({}, CTX);
    const t = written[0]!;
    expect(t["list"]).toBe("");
    expect(t["held"]).toBe("");
    expect(t["surface"]).toBe("");
    expect(t["recipe"]).toBe("");
  });
});
