/**
 * carrier-shape — the reading that names how far down the ingest gradient a file sits.
 *
 * `bcc-witness` reads the check, `meme-coordinates` reads the coordinates, `round-trip` reads the
 * render. Each of them walks the corpus by `uri-path` and skips anything that declares none, so a file
 * that lost its address was invisible to all three at once: seventeen carriers sat outside every gate
 * while each gate called itself corpus-wide.
 *
 * The gradient reading is the one that opens those. It fails on a FAULT and never on a KIND — a bag
 * descriptor carries no body frame because it holds no meme's text, and that is the shape it should be.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

import { describe, expect, test } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { readCarrierShape } from "../src/carrier-shape.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import { REPO } from "./test-wiki.js";

const DECL = "<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>";
const head = (uri: string, ns = "") =>
  `<<^ code:"&#x0001;"${ns ? ` namespace:"${ns}"` : ""} ? -> ${uri} >>`;

describe("carrier-shape — the kind a file declares, and what that kind owes", () => {
  /**
   * THE ARROW CARRIES A `>`, and a head scan that forgets it reads every carrier as unframed. Measured:
   * a first cut of this reader reported all 617 corpus files headless and faulted 610 of them.
   */
  test("a head sigil is found through its own bearing arrow", () => {
    const shape = readCarrierShape(`${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n`);
    expect(shape.marks.head).toBe(true);
    expect(shape.marks.headUri).toBe("lar:///ha.ka.ba/x/y");
  });

  /**
   * A DECLARATION OPENS A FENCE, so its opener sits at a mask span's start and a plain masked read
   * rejects it — while a declaration quoted INSIDE a lesson must still not count.
   */
  test("the declaration is read at its own fence, and a quoted one is not", () => {
    const real = `${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\`\`\`toml iam\nuri-path = "ha.ka.ba/x/y"\ntype = "${CARRIER_TYPE}"\n\`\`\`\n`;
    expect(readCarrierShape(real).marks.iam).toBe(true);
    expect(readCarrierShape(real).marks.uriPath).toBe("ha.ka.ba/x/y");

    const taught = `${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\n\`\`\`\`\nA lesson shows one:\n\`\`\`toml iam\nuri-path = "ha.ka.ba/not/this"\n\`\`\`\n\`\`\`\`\n`;
    expect(readCarrierShape(taught).marks.iam, "a quoted declaration counted as the file's own").toBe(false);
  });

  test("the kind reads from what a file DECLARES, never from where it rests", () => {
    const of = (iam: string) => readCarrierShape(`${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\`\`\`toml iam\n${iam}\n\`\`\`\n`).kind;
    expect(of('uri-path = "ha.ka.ba/x/y"')).toBe("carrier");
    expect(of('bag = "lares"')).toBe("descriptor");
    expect(of('collection = "kumulipo"')).toBe("shelf");
    expect(readCarrierShape(`${DECL}\n\nbare prose\n`).kind).toBe("unframed");
  });

  /**
   * THE FAULT THAT MADE EVERY OTHER GATE BLIND: a head that names an address the declaration never
   * states. The file renders, round-trips, and is skipped by every corpus walk keyed on `uri-path`.
   */
  test("a head that names an address the declaration never states reads as the fault it is", () => {
    const shelf = readCarrierShape(`${DECL}\n\n${head("lar:///ha.ka.ba/library/x")}\n\`\`\`toml iam\ncollection = "x"\n\`\`\`\n`);
    expect(shelf.kind).toBe("shelf");
    expect(shelf.faults.join(" ")).toContain("every corpus gate skips it");
  });

  test("a bag descriptor carrying no body frame stands at its floor, not below it", () => {
    const d = readCarrierShape(
      `${DECL}\n\n${head("lar:///ha.ka.ba/bags/lares")}\n\`\`\`toml iam\nbag = "lares"\n\`\`\`\n\nprose\n\n<<^ code:"&#x0004;" -> ? >>\n`,
    );
    expect(d.kind).toBe("descriptor");
    expect(d.faults, "a descriptor faulted for lacking a body it never holds").toEqual([]);
  });

  /** The corpus itself: no file may sit below the floor of the kind it declares. */
  test("every carrier in the corpus stands at its kind's floor", () => {
    const files = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
      .split("\n").filter(Boolean);
    const below = files
      .map((f) => [f, readCarrierShape(readFileSync(path.join(REPO, f), "utf8"))] as const)
      .filter(([, s]) => s.faults.length > 0)
      .map(([f, s]) => `${f} — ${s.faults.join("; ")}`);
    expect(files.length).toBeGreaterThan(500);
    expect(below).toEqual([]);
  });

  /**
   * THE FILES NO GATE WALKS. Every instrument in this tree lists `bags/**\/*.mem`, so a file under a
   * bag with any other extension is read by nothing — not the check, not the coordinates, not the
   * round-trip, and not the gradient above, which classifies whatever it is handed and was never
   * handed these.
   *
   * Forty stand: 37 `.md` from before the corpus poured, two `.tid`, one `.py`. Two of the `.md` carry
   * a head sigil and are the glyph-definition drafts `period-forms` keeps verbatim, so they read as
   * `shelf` rather than `unframed` — the law and the reading agree without either being told.
   *
   * A CEILING, not a floor: converting one lowers it, and a new uncarried file raises it. The sidecar
   * pair is excluded the way `lares normalize --gradient` excludes it — a content file declaring
   * itself in a `.meta` beside it carries no frame of its own and never should.
   */
  test("no more files stand under a bag uncarried than already did", () => {
    const tracked = execSync("git ls-files bags", { encoding: "utf8", cwd: REPO })
      .split("\n").filter(Boolean).filter((f) => !f.endsWith(".gitkeep"));
    const declared = new Set(tracked.filter((f) => f.endsWith(".meta")).map((f) => f.slice(0, -5)));
    const uncarried = tracked.filter((f) =>
      !f.endsWith(".mem") && !f.endsWith(".meta") && !declared.has(f));
    expect(tracked.length).toBeGreaterThan(600);
    expect(uncarried.length, `an uncarried file appeared — run \`lares normalize --gradient $(git ls-files bags)\``)
      .toBeLessThanOrEqual(40);
  });

});
