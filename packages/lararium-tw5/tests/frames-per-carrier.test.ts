/**
 * frames-per-carrier — how many bodies a carrier holds, counted the way the PARSER counts.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 * `checkSpan` finds a file's FIRST `STX -> ETX` and stops, so `verifyBcc` answers for one body and
 * `bcc-witness` reports one verdict per file. That reading holds exactly as long as a carrier holds
 * one body, and this file is what asks.
 *
 * A grep cannot ask it. This grammar TEACHES its own control set, so the specification memes carry
 * worked examples of every mark inside quote fences — one-tick inline, three- and four-tick blocks.
 * A pattern without a fence mask reads each of those as a live frame and reports the document that
 * defines the check as a document whose second body goes unchecked. Two hand-counts did exactly that
 * before this file existed, one of them off by half.
 *
 * So the count imports `maskedExecAll` — the parser's own mask, the same reader the deserializer uses
 * to divide a carrier — and a teaching example stays a teaching example.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { maskedExecAll } from "../src/deserializer.js";
import { checkSpan } from "../src/carrier-check.js";
import { REPO } from "./test-wiki.js";

/** ETX sigils the parser would honour — quoted mentions masked out. */
function liveFrames(text: string): number {
  return [...maskedExecAll(text, /<<\^(?:[^>\n]|->)*&#x0003;(?:[^>\n]|->)*>>/g)].length;
}

describe("a carrier's bodies, counted through the parser's own fence mask", () => {
  const carriers = execSync("find bags -name '*.mem'", { cwd: REPO, encoding: "utf8" })
    .trim().split("\n").filter(Boolean);

  /** A run that scanned nothing must not read as a run that found nothing. */
  test("the corpus is present", () => {
    expect(carriers.length).toBeGreaterThan(100);
  });

  /**
   * THE CLAIM `checkSpan` RESTS ON.
   *
   * One body per carrier means one span, one check, and a witness whose per-file verdict covers the
   * whole file. A carrier holding two bodies carries one check over the first and none over the rest,
   * and every instrument in this tree would still read it green.
   *
   * A red here does NOT say the corpus is broken — it says the CHECK READER is single-frame and the
   * corpus has outgrown it. The cure lives in `carrier-check.ts`, which would walk every span rather
   * than the first, and this test names the carriers it would have to walk.
   */
  test("every carrier holds exactly one body, or names itself for a multi-frame check reader", () => {
    const multi = carriers
      .map((rel) => ({ rel, n: liveFrames(readFileSync(path.join(REPO, rel), "utf8")) }))
      .filter((c) => c.n > 1)
      .map((c) => `${c.n} bodies · ${c.rel}`);
    expect(multi).toEqual([]);
  });
});

describe("the check reader divides a carrier where the parser divides it", () => {
  const carriers = execSync("find bags -name '*.mem'", { cwd: REPO, encoding: "utf8" })
    .trim().split("\n").filter(Boolean);

  /**
   * THE READER AND THE WRITER MUST MEET ON ONE SPAN.
   *
   * `checkSpan` walks raw text — `indexOf(stx)`, `indexOf(etx)` — while the emitter and the
   * deserializer both read through the fence mask. On a carrier that quotes the control set, those two
   * readings land in different places: the unmasked reader locks onto a WORKED EXAMPLE and verifies the
   * check written inside it, while the carrier's real body goes unexamined and still reports `ok`.
   *
   * The corpus's own specification memes are the ones that quote the control set, so the documents
   * DEFINING this instrument are the documents it misreads.
   *
   * `checkSpan` reads through that same mask, so the two meet on one span and this test holds the
   * meeting. Nine carriers stopped verifying an example the day it did, and `bcc-witness` traded nine
   * false `ok` readings for nine honest `unchecked` ones.
   */
  test("checkSpan lands on the body the parser sees, never on a quoted example", () => {
    const misread: string[] = [];
    for (const rel of carriers) {
      const text = readFileSync(path.join(REPO, rel), "utf8");
      const span = checkSpan(text);
      if (!span) continue;
      const real = [...maskedExecAll(text, /<<\^(?:[^>\n]|->)*&#x0003;(?:[^>\n]|->)*>>/g)];
      if (real.length === 0) continue;
      const realEnd = real[0]!.index + real[0]![0].length;
      if (span.end !== realEnd) misread.push(`${rel}: reader ends ${span.end}, parser ends ${realEnd}`);
    }
    expect(misread).toEqual([]);
  });
});

describe("the frame head locks to control, in both directions", () => {
  const BODY = 'the body\n';

  /**
   * THE ACCEPTING HALF, which the corpus proves every run.
   */
  test("a control-headed frame divides a carrier", () => {
    const carrier = `<<^ code="&#x0002;">>\n${BODY}\n<<^ code="&#x0003;">>\n`;
    expect(checkSpan(carrier)).not.toBeNull();
  });

  /**
   * THE REJECTING HALF, which nothing proved until now.
   *
   * The corpus writes only the current form, so every test that reads it confirms the matchers still
   * FIND what the grammar emits — and none of them confirms the matchers REFUSE what it does not. That
   * is the half a lock exists for, and the half whose absence would go unnoticed longest: a reader
   * still admitting the speaking head passes every corpus test there is.
   */
  test("a speaking-headed frame does not", () => {
    const malformed = `<<~ code="&#x0002;">>\n${BODY}\n<<~ code="&#x0003;">>\n`;
    expect(checkSpan(malformed)).toBeNull();
  });

  /** A frame opening on control and closing on the speaking head divides nothing either. */
  test("a mixed frame does not", () => {
    const mixed = `<<^ code="&#x0002;">>\n${BODY}\n<<~ code="&#x0003;">>\n`;
    expect(checkSpan(mixed)).toBeNull();
  });
});

describe("what the corpus witnesses can and cannot see", () => {
  const carriers = execSync("git ls-files 'bags/**/*.mem'", { cwd: REPO, encoding: "utf8" })
    .trim().split("\n").filter(Boolean);

  /**
   * NAMING A CARRIER ADMITS IT TO THE WITNESS.
   *
   * Every corpus walk in this package opens the same way: read `uri-path`, and `continue` where a
   * carrier declares none. That skip reads as reasonable — an unnamed carrier addresses no meme, so a
   * round-trip has nothing to render it back TO — and it means a green corpus run says nothing at all
   * about the carriers it stepped over.
   *
   * The cost is not theoretical. Two carriers gained a `uri-path` in an earlier pass and immediately
   * failed the corpus round-trip, and the failure read as damage the naming had caused. It was not.
   * They had never passed; they had never been LOOKED AT, and being named is what put them in front of
   * the reader for the first time.
   *
   * So the skip gets counted rather than left implicit. The count was a ceiling of 17 while the reason
   * for each was unknown; every one of those has since been named or retired, and what remains is a
   * KIND rather than a residue: a bag declares itself and holds no meme's text, so it carries no
   * `uri-path` and never should.
   *
   * The reading tightens to match. Not "no more than N go unwalked", but "every file a corpus walk
   * skips is a bag declaring itself" — an invariant a new gap breaks, where a ceiling would have
   * absorbed it silently.
   */
  test("every carrier a corpus walk skips is a bag declaring itself", () => {
    const unnamed = carriers.filter(
      (rel) => !/^uri-path\s*=\s*"([^"]+)"/m.test(readFileSync(path.join(REPO, rel), "utf8")));
    expect(carriers.length).toBeGreaterThan(500);
    const notDescriptors = unnamed.filter(
      (rel) => !/^bag\s*=\s*"/m.test(readFileSync(path.join(REPO, rel), "utf8")));
    expect(notDescriptors, "carriers invisible to every corpus round-trip, and not bag descriptors")
      .toEqual([]);
  });
});
