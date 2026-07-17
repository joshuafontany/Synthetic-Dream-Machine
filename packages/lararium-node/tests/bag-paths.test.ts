import { describe, test, expect } from "vitest";
import { carrierBaseRelPath } from "../src/bag-paths.js";

describe("carrierBaseRelPath — the extension-less carrier siting function", () => {
  // Post-#37: the siting returns the carrier's base path with NO extension — the caller adds the
  // filetype's own (a .mem/.tid/.md all site at the same uri-path, only the extension differs).

  test("a stable name sites at its full uri-path (no extension)", () => {
    expect(carrierBaseRelPath("lar:///ha.ka.ba/lares/api/pono/meme"))
      .toBe("ha.ka.ba/lares/api/pono/meme");
  });

  test("a FOREIGN name sites whole — any bag holds any name (the crack, closed)", () => {
    expect(carrierBaseRelPath("lar:///ha.ka.ba/bags/@other/v2/notes/thing"))
      .toBe("ha.ka.ba/bags/@other/v2/notes/thing");
  });

  test("fragments live inside their parent carrier — null", () => {
    expect(carrierBaseRelPath("lar:///ha.ka.ba/lares/api/pono/meme#head")).toBeNull();
  });

  test("unstable or rootless forms carry no siting", () => {
    expect(carrierBaseRelPath("lar:///nope/x")).toBeNull();
    expect(carrierBaseRelPath("$:/temp/x")).toBeNull();
  });

  test("unstable attitude roots DO site when projected (session-bag adoption path)", () => {
    expect(carrierBaseRelPath("lar:///threshold.uncertain.opens/note"))
      .toBe("threshold.uncertain.opens/note");
  });
});
