/**
 * lares-verb-uri — the DOM-summon verb-tiddler contract (#48).
 *
 * A TW5 <$button> summons a verb by writing a volatile tiddler whose TITLE names the
 * verb ALONE (`…/verb/<verb>` — PURE BEARING, the URI-carries-bearing law). Per-invocation
 * args ride `arg-<name>` FIELDS, not the URI; the reaction-router lifts them into the
 * structured payload, which crosses the flat island wire as a `verb-args` JSON string.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/lar-uris#verb-summon
 */

import { describe, test, expect } from "vitest";
import {
  laresVerbUri,
  LARES_VERB_URI_PREFIX,
  LARES_DISPATCH_FIELD,
  LARES_VERB_ARG_PREFIX,
  LARES_VERB_ARGS_WIRE_FIELD,
  verbArgsFromPayload,
  isVolatileVmUri,
} from "../src/lar-uris.js";

describe("lares verb-summon URIs", () => {
  test("the prefix is the volatile VM namespace — reaction-routable yet never synced", () => {
    expect(LARES_VERB_URI_PREFIX).toBe("lar:///lararium.local.vm/verb/");
    expect(LARES_VERB_URI_PREFIX.startsWith("lar:")).toBe(true);      // reaction-router fires
    expect(isVolatileVmUri(LARES_VERB_URI_PREFIX)).toBe(true);        // capture path skips → local
  });

  test("the title names the verb ALONE — pure bearing, no args smuggled in", () => {
    const uri = laresVerbUri("wiki-switch");
    expect(uri).toBe("lar:///lararium.local.vm/verb/wiki-switch");
    expect(isVolatileVmUri(uri)).toBe(true);
    // No slug, no positional segment — the address carries the verb NAME and nothing per-invocation.
    expect(uri.endsWith("/wiki-switch")).toBe(true);
  });

  test("add-bag / remove-bag titles carry no bag URI (args left the URI entirely)", () => {
    expect(laresVerbUri("add-bag")).toBe("lar:///lararium.local.vm/verb/add-bag");
    expect(laresVerbUri("remove-bag")).toBe("lar:///lararium.local.vm/verb/remove-bag");
  });
});

describe("the summon field contract", () => {
  test("the marker + arg-field names are the fixed transmission-contract tokens", () => {
    expect(LARES_DISPATCH_FIELD).toBe("lares-dispatch");
    expect(LARES_VERB_ARG_PREFIX).toBe("arg-");
    expect(LARES_VERB_ARGS_WIRE_FIELD).toBe("verb-args");
  });

  test("verbArgsFromPayload re-parses the flat `verb-args` JSON string into structured args", () => {
    const payload = {
      uri:  laresVerbUri("add-bag"),
      verb: "add-bag",
      [LARES_VERB_ARGS_WIRE_FIELD]: JSON.stringify({ slug: "my-notes", bagUrl: "lar:///ha.ka.ba/bags/lares" }),
    };
    expect(verbArgsFromPayload(payload)).toEqual({ slug: "my-notes", bagUrl: "lar:///ha.ka.ba/bags/lares" });
  });

  test("a bag URI carrying its own '/' and ':' survives the JSON round-trip losslessly", () => {
    const bag = "lar:///ha.ka.ba/bags/lares";
    const wire = JSON.stringify({ slug: "@personal", bagUrl: bag });
    expect(verbArgsFromPayload({ [LARES_VERB_ARGS_WIRE_FIELD]: wire })).toEqual({ slug: "@personal", bagUrl: bag });
  });

  test("an absent or malformed payload reads as empty args (the no-arg summon is common)", () => {
    expect(verbArgsFromPayload({ uri: laresVerbUri("switcher-refresh"), verb: "switcher-refresh" })).toEqual({});
    expect(verbArgsFromPayload({ [LARES_VERB_ARGS_WIRE_FIELD]: "not json" })).toEqual({});
    expect(verbArgsFromPayload({ [LARES_VERB_ARGS_WIRE_FIELD]: "[1,2,3]" })).toEqual({});   // array → not a struct
  });
});
