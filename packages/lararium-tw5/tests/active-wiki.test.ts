import { describe, test, expect } from "vitest";
import {
  ACTIVE_WIKI_URI,
  buildActiveWikiRecord,
  readActiveWikiSlug,
  selectActiveWikiSlug,
} from "../src/active-wiki.js";

describe("active-wiki", () => {
  test("readActiveWikiSlug returns null for missing or non-string text", () => {
    expect(readActiveWikiSlug(null)).toBeNull();
    expect(readActiveWikiSlug({ tiddler: { title: ACTIVE_WIKI_URI } })).toBeNull();
    expect(readActiveWikiSlug({ tiddler: { title: ACTIVE_WIKI_URI, text: 12 as unknown as string } })).toBeNull();
  });

  test("readActiveWikiSlug trims and returns the marker slug", () => {
    expect(readActiveWikiSlug({ tiddler: { title: ACTIVE_WIKI_URI, text: " altar-fire " } })).toBe("altar-fire");
  });

  test("selectActiveWikiSlug falls back to the boot arg when the marker is absent", () => {
    expect(selectActiveWikiSlug("default-room", null)).toEqual({
      slug: "default-room",
      source: "boot-arg",
    });
  });

  test("selectActiveWikiSlug prefers the daemon marker when present", () => {
    expect(selectActiveWikiSlug("default-room", {
      tiddler: { title: ACTIVE_WIKI_URI, text: "selected-room" },
    })).toEqual({
      slug: "selected-room",
      source: "daemon-marker",
    });
  });

  test("buildActiveWikiRecord emits the canonical marker shape", () => {
    const record = buildActiveWikiRecord("altar-fire", "lares-cli:wiki-open", "2026-05-21T00:00:00.000Z");
    expect(record).toEqual({
      tiddler: {
        title: ACTIVE_WIKI_URI,
        text: "altar-fire",
        "updated-at": "2026-05-21T00:00:00.000Z",
      },
      meta: { authority: "lares-cli:wiki-open" },
    });
  });
});