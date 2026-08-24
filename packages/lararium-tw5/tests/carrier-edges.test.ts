/**
 * carrier-edges — the reading that looks OUTWARD from a carrier.
 *
 * `carrier-shape` asks whether a file is whole; `meme-coordinates` asks whether its own two
 * coordinates agree; `bcc` asks whether its bytes match their check. A `lar:` URI names and does not
 * fetch, so a carrier whose target moved satisfies all three and points at nothing.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

import { describe, expect, test } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { readCarrierEdges } from "../src/carrier-edges.js";
import { REPO } from "./test-wiki.js";

describe("carrier-edges — every address a carrier points at", () => {
  /**
   * FIVE SPELLINGS, ONE RELATION. A reader counting only `loulou` sees 147 of the corpus's 192
   * dangling edges and reports a clean move over a broken one.
   */
  test("every form a carrier can name an address in is read", () => {
    const src = [
      "<<~ loulou lar:///ha.ka.ba/a/one >>",
      '<<~ pranala #x ? -> lar:///ha.ka.ba/a/two family:control >>',
      "<<~ kahea ahu lar:///ha.ka.ba/a/three >>",
      "[[a name|lar:///ha.ka.ba/a/four]]",
      "[[lar:///ha.ka.ba/a/five]]",
    ].join("\n\n");
    const got = readCarrierEdges(src);
    expect(got.map((e) => e.address!).sort())
      .toEqual(["ha.ka.ba/a/five", "ha.ka.ba/a/four", "ha.ka.ba/a/one", "ha.ka.ba/a/three", "ha.ka.ba/a/two"]);
    expect(new Set(got.map((e) => e.form))).toEqual(new Set(["loulou", "pranala", "kahea", "wikilink"]));
  });

  /**
   * THE SPEC MEMES TEACH THESE FORMS BY QUOTING THEM. Unmasked, a lesson's example reads as a broken
   * link and sends a reader chasing an address nobody meant to stand. Measured over the corpus: 18 raw matches
   * are lessons rather than links.
   */
  test("an edge quoted inside a fence is a lesson, never a link", () => {
    const taught = "````\nShow one:\n\n<<~ loulou lar:///ha.ka.ba/not/real >>\n````\n\n<<~ loulou lar:///ha.ka.ba/is/real >>";
    expect(readCarrierEdges(taught).map((e) => e.address)).toEqual(["ha.ka.ba/is/real"]);
  });

  /** A fragment rides the written form and never the address a resolver looks up. */
  test("the fragment stays on the writing and off the lookup", () => {
    const [e] = readCarrierEdges("<<~ loulou lar:///ha.ka.ba/a/one#part >>");
    expect(e!.address).toBe("ha.ka.ba/a/one");
    expect(e!.written).toBe("ha.ka.ba/a/one#part");
  });

  /** Prose punctuation belongs to the sentence, never to the name. */
  test("a trailing period is not part of an address", () => {
    expect(readCarrierEdges("See [[lar:///ha.ka.ba/a/one]].")[0]!.address).toBe("ha.ka.ba/a/one");
  });

  /**
   * THE CORPUS, AS A CEILING RATHER THAN A FLOOR. 192 edges name no carrier here — loulou 147 · pranala 31 · wikilink 14 — nearly all of
   * them older than any instrument that could see them. ''Lower this whenever it can go lower'': a
   * ceiling left slack absorbs the next break silently. This holds the line where it stands: a rename that
   * breaks edges raises the count, and that is the reading `lares normalize --edges` exists to take
   * either side of a move.
   */
  test("the corpus points at no more nothing than it already did", () => {
    const files = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
      .split("\n").filter(Boolean);
    const held = new Set<string>(), texts: string[] = [];
    for (const f of files) {
      const t = readFileSync(path.join(REPO, f), "utf8");
      texts.push(t);
      const u = /^uri-path\s*=\s*"([^"]+)"/m.exec(t)?.[1];
      if (u) held.add(u);
    }
    // An `md-target` edge names a FILE and carries no address, so it can neither resolve nor dangle.
    // Counting it here would fold a known, separately-gated class into this one and hide a real break.
    const dangling = texts.flatMap(readCarrierEdges)
      .filter((e) => e.address !== null && !held.has(e.address));
    expect(files.length).toBeGreaterThan(500);
    expect(dangling.length, "an edge broke — run `lares normalize --edges` to name it").toBeLessThanOrEqual(192);
  });
});
