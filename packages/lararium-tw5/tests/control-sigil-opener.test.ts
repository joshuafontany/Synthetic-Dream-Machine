/**
 * The control band opens with the caret, everywhere, and the corpus proves it.
 *
 * WHY A GUARD AND NOT JUST A SWEEP. Turning every carrier was a one-time act; nothing about it stops a
 * hand-written `<<~ &#x0002; >>` arriving next week from a stale template, a copied fixture, or a memory
 * of the older form. A sweep fixes a corpus once. A guard keeps it fixed — and it reads the corpus off
 * disk rather than from a list, so a carrier added tomorrow gets checked without anyone remembering to
 * add it.
 *
 * WHY THE MARK MATTERS. The carrier grammar decides three constructs on the THIRD character with no
 * lookahead: `<<~` speaks, `<<^` frames, `<<<` quotes, anything else calls a macro. Put the control band
 * back on the sharktooth and the framing becomes indistinguishable from a verb; move it into an entity
 * (`<<&#x0001;`) and it lands inside the macrocall token. The caret is what keeps one character deciding.
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const REPO = resolve(__dirname, "../../..");

/** A control entity reached directly, or through a run of non-ASCII namespace glyphs. */
const OLD_OPENER = /<<~[ \t]*(?:[^\x00-\x7F][ \t]?)*&#x00[01][0-9A-Fa-f];/;

/** Every tracked carrier and doc that could hold a sigil — read from git, never from a hand-kept list. */
function trackedCarriers(): string[] {
  const out = execFileSync(
    "git",
    ["ls-files", "*.mem", "*.tid", "packages/AGENTS.md"],
    { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return out.split("\n").filter(Boolean);
}

describe("the control band opens with the caret", () => {
  const files = trackedCarriers();

  test("the corpus presents carriers to check", () => {
    expect(files.length).toBeGreaterThan(400);
  });

  test("no tracked carrier opens a control sigil with the sharktooth", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      let src: string;
      try { src = readFileSync(resolve(REPO, rel), "utf8"); } catch { continue; }
      const m = OLD_OPENER.exec(src);
      if (m) offenders.push(`${rel} → ${m[0]}`);
    }
    expect(offenders, `these carriers open the control band on the sharktooth:\n  ${offenders.join("\n  ")}`)
      .toEqual([]);
  });

  test("a sigil that merely MENTIONS the range keeps its sharktooth", () => {
    // The distinction the sweep nearly lost: an ASCII word before the entity means a sigil talking ABOUT
    // the control band, not one opening it. Guarding that shape keeps a future sweep from mangling prose.
    expect(OLD_OPENER.test("<<~ranks control-codes ~ the band the boot invokes as &#x0001;–&#x0004; >>"))
      .toBe(false);
    expect(OLD_OPENER.test("<<~ &#x0002; >>")).toBe(true);
    expect(OLD_OPENER.test("<<~ ॐ ँ&#x0001; ? -> lar:///x >>")).toBe(true);
  });
});
