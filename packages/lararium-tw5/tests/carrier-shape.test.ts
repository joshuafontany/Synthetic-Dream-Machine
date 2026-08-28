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
  `<<^ code="&#x0001;"${ns ? ` namespace="${ns}"` : ""} ? -> ${uri} >>`;

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
    const real = `${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\`\`\`toml meta\nuri-path = "ha.ka.ba/x/y"\ntype = "${CARRIER_TYPE}"\n\`\`\`\n`;
    expect(readCarrierShape(real).marks.meta).toBe(true);
    expect(readCarrierShape(real).marks.uriPath).toBe("ha.ka.ba/x/y");

    const taught = `${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\n\`\`\`\`\nA lesson shows one:\n\`\`\`toml meta\nuri-path = "ha.ka.ba/not/this"\n\`\`\`\n\`\`\`\`\n`;
    expect(readCarrierShape(taught).marks.meta, "a quoted declaration counted as the file's own").toBe(false);
  });

  test("the kind reads from what a file DECLARES, never from where it rests", () => {
    const of = (meta: string) => readCarrierShape(`${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\`\`\`toml meta\n${meta}\n\`\`\`\n`).kind;
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
    const shelf = readCarrierShape(`${DECL}\n\n${head("lar:///ha.ka.ba/library/x")}\n\`\`\`toml meta\ncollection = "x"\n\`\`\`\n`);
    expect(shelf.kind).toBe("shelf");
    expect(shelf.faults.join(" ")).toContain("every corpus gate skips it");
  });

  test("a bag descriptor carrying no body frame stands at its floor, not below it", () => {
    const d = readCarrierShape(
      `${DECL}\n\n${head("lar:///ha.ka.ba/bags/lares")}\n\`\`\`toml meta\nbag = "lares"\n\`\`\`\n\nprose\n\n<<^ code="&#x0004;" -> ? >>\n`,
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
   * Thirty-nine stand: 36 `.md` from before the corpus poured, two `.tid`, one `.py`. Two of the `.md` carry
   * a head sigil and are the glyph-definition drafts `period-forms` keeps verbatim, so they read as
   * `shelf` rather than `unframed` — the law and the reading agree without either being told.
   *
   * A CEILING, not a floor: converting one lowers it, and a new uncarried file raises it. ''Lower it
   * whenever it can go lower'' — a ceiling left slack absorbs the next gap silently, which is what the
   * unnamed-carrier count did for a corpus that had shrunk from seventeen to seven beneath it. The sidecar
   * pair is excluded the way `lares carrier normalize --gradient` excludes it — a content file declaring
   * itself in a `.meta` beside it carries no frame of its own and never should.
   */
  test("no more files stand under a bag uncarried than already did", () => {
    const tracked = execSync("git ls-files bags", { encoding: "utf8", cwd: REPO })
      .split("\n").filter(Boolean).filter((f) => !f.endsWith(".gitkeep"));
    const declared = new Set(tracked.filter((f) => f.endsWith(".meta")).map((f) => f.slice(0, -5)));
    const uncarried = tracked.filter((f) =>
      !f.endsWith(".mem") && !f.endsWith(".meta") && !declared.has(f));
    expect(tracked.length).toBeGreaterThan(600);
    expect(uncarried.length, `an uncarried file appeared — run \`lares carrier normalize --gradient $(git ls-files bags)\``)
      .toBeLessThanOrEqual(39);
  });

  /**
   * TORN NEVER READS AS UNCHECKED. A file cut ahead of its closer loses its ETX and its check with it —
   * and a reader that files that under "no check present" hands an adversary the cheapest strip there
   * is. The frame's standing distinguishes a transmission that never carried a check from one that lost
   * its tail, and the gradient faults the second.
   */
  test("a torn frame reads as truncated, never as unchecked", () => {
    const torn = `${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\`\`\`toml meta\nuri-path = "ha.ka.ba/x/y"\ntype = "${CARRIER_TYPE}"\n\`\`\`\n\n<<^ code="&#x0002;" >>\n\nbody cut mid-transmissi`;
    const shape = readCarrierShape(torn);
    expect(shape.marks.check).toBe("torn");
    expect(shape.faults.join(" ")).toContain("torn reads as truncated");
  });

  /**
   * ONE TEXT FRAME PER CARRIER. The check covers the first STX..ETX span only, so a second frame would
   * ride beneath a verdict computed over the first — the smuggling shape, surfaced as a fault rather
   * than blessed by the first frame's `ok`.
   */
  test("a second text frame surfaces as a fault rather than riding beneath the first frame's verdict", () => {
    const two = `${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\`\`\`toml meta\nuri-path = "ha.ka.ba/x/y"\ntype = "${CARRIER_TYPE}"\n\`\`\`\n\n<<^ code="&#x0002;" >>\n\nfirst body\n\n<<^ code="&#x0003;" >>\n\n<<^ code="&#x0002;" >>\n\nsmuggled body\n\n<<^ code="&#x0003;" >>\n\n<<^ code="&#x0004;" -> ? >>\n`;
    const shape = readCarrierShape(two);
    expect(shape.faults.join(" ")).toContain("2 text frames");
  });

  /** ADJACENT, EXACTLY. A check shifted off its closer by even one space does not verify — slack there
   *  would let two byte-different files share one verdict, the class the span law exists to close. */
  test("a shifted check does not verify", () => {
    const base = `${DECL}\n\n${head("lar:///ha.ka.ba/x/y")}\n\`\`\`toml meta\nuri-path = "ha.ka.ba/x/y"\ntype = "${CARRIER_TYPE}"\n\`\`\`\n\n<<^ code="&#x0002;" >>\n\nbody\n\n<<^ code="&#x0003;" >>`;
    const good = readCarrierShape(`${base}ni:///sha-256;AAAA\n\n<<^ code="&#x0004;" -> ? >>\n`);
    expect(good.marks.check).toBe("mismatch");   // adjacent but wrong digest — SEEN, judged
    const shifted = readCarrierShape(`${base} ni:///sha-256;AAAA\n\n<<^ code="&#x0004;" -> ? >>\n`);
    expect(shifted.marks.check).toBe("unchecked"); // one space off — not a check at all
  });



});
