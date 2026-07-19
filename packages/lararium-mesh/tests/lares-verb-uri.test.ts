/**
 * lares-verb-uri — the DOM-summon verb-tiddler encoding.
 *
 * A TW5 <$button> summons a verb by writing a volatile tiddler whose TITLE carries
 * the verb + positional args (the verse-event payload admits only {uri, verb, fromUri},
 * never args). These helpers encode/parse that title, and MUST round-trip losslessly —
 * including a bag URI arg carrying its own `/` and `:` (add-bag / remove-bag).
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/lar-uris#verb-summon
 */

import { describe, test, expect } from "vitest";
import {
  laresVerbUri,
  laresVerbUriArgs,
  laresVerbUriArg,
  LARES_VERB_URI_PREFIX,
  isVolatileVmUri,
} from "../src/lar-uris.js";

describe("lares verb-summon URIs", () => {
  test("the prefix is the volatile VM namespace — reaction-routable yet never synced", () => {
    expect(LARES_VERB_URI_PREFIX).toBe("lar:///lararium.local.vm/verb/");
    expect(LARES_VERB_URI_PREFIX.startsWith("lar:")).toBe(true);      // reaction-router fires
    expect(isVolatileVmUri(LARES_VERB_URI_PREFIX)).toBe(true);        // capture path skips → local
  });

  test("wiki-switch: one slug rides the URI and parses back", () => {
    const uri = laresVerbUri("wiki-switch", "my-notes");
    expect(uri).toBe("lar:///lararium.local.vm/verb/wiki-switch/my-notes");
    expect(isVolatileVmUri(uri)).toBe(true);
    expect(laresVerbUriArgs(uri)).toEqual({ verb: "wiki-switch", args: ["my-notes"] });
    expect(laresVerbUriArg(uri, 0)).toBe("my-notes");
  });

  test("an @-prefixed slug survives encode/parse", () => {
    const uri = laresVerbUri("wiki-switch", "@personal");
    expect(laresVerbUriArg(uri, 0)).toBe("@personal");
  });

  test("add-bag: slug + a bag URI carrying '/' and ':' round-trips losslessly", () => {
    const bag = "lar:///ha.ka.ba/bags/@lares";
    const uri = laresVerbUri("add-bag", "my-notes", bag);
    // the bag URI's own separators are %-encoded, so the segment split stays 2-wide
    expect(uri.startsWith("lar:///lararium.local.vm/verb/add-bag/my-notes/")).toBe(true);
    const parsed = laresVerbUriArgs(uri);
    expect(parsed).toEqual({ verb: "add-bag", args: ["my-notes", bag] });
    expect(laresVerbUriArg(uri, 0)).toBe("my-notes");
    expect(laresVerbUriArg(uri, 1)).toBe(bag);
  });

  test("a non-summon URI parses to null; a missing arg reads empty", () => {
    expect(laresVerbUriArgs("lar:///ha.ka.ba/bags/@lares")).toBeNull();
    expect(laresVerbUriArg("lar:///ha.ka.ba/bags/@lares", 0)).toBe("");
    expect(laresVerbUriArg(laresVerbUri("wiki-switch", "x"), 3)).toBe("");
  });

  test("a bare verb with no args parses to an empty arg list", () => {
    const uri = laresVerbUri("switcher-refresh");
    expect(uri).toBe("lar:///lararium.local.vm/verb/switcher-refresh");
    expect(laresVerbUriArgs(uri)).toEqual({ verb: "switcher-refresh", args: [] });
  });
});
