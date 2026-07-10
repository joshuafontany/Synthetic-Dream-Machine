import { describe, test, expect } from "vitest";
import { fullPathBagPath, bagsFileToUri } from "../src/bag-paths.js";

describe("fullPathBagPath — the full-path-inside-bag siting function", () => {
  const toRelPath = fullPathBagPath();

  test("a stable name sites at its full uri-path", () => {
    expect(toRelPath("lar:///ha.ka.ba/lares/api/pono/meme"))
      .toBe("ha.ka.ba/lares/api/pono/meme.mem");
  });

  test("a FOREIGN name sites whole — any bag holds any name (the crack, closed)", () => {
    expect(toRelPath("lar:///ha.ka.ba/bags/@other/v2/notes/thing"))
      .toBe("ha.ka.ba/bags/@other/v2/notes/thing.mem");
  });

  test("fragments live inside their parent carrier — null", () => {
    expect(toRelPath("lar:///ha.ka.ba/lares/api/pono/meme#head")).toBeNull();
  });

  test("unstable or rootless forms carry no siting", () => {
    expect(toRelPath("lar:///nope/x")).toBeNull();
    expect(toRelPath("$:/temp/x")).toBeNull();
  });

  test("unstable attitude roots DO site when projected (session-bag adoption path)", () => {
    expect(toRelPath("lar:///threshold.uncertain.opens/note"))
      .toBe("threshold.uncertain.opens/note.mem");
  });
});
