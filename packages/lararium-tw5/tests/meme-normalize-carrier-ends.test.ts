/**
 * A FRAMING SIGIL NAMES ITS ENDS.
 *
 * ── THE STANDARD ─────────────────────────────────────────────────────────────────────────────────────────
 * `pranala` and `lares aim` already write their ends as named parameters with the bearing arrow riding
 * between them — `from=? -> to=lar:///…`. The four framing codes carried theirs positionally, so a reader
 * recovered the target by counting past an arrow rather than by asking for it by name.
 *
 * The arrow stays. It reads as an unnamed positional parameter, which TiddlyWiki parses as one, and it
 * carries the bearing that the two named ends terminate.
 *
 * ── WHAT MUST NOT MOVE ───────────────────────────────────────────────────────────────────────────────────
 * Only the four framing codes take this. An arrow anywhere else — a `moves` line, prose, a sigil that
 * already names its ends — belongs to whatever wrote it.
 */

import { describe, test, expect } from "vitest";
import { normalizeMemeSource } from "../src/meme-normalize.js";

const norm = (s: string) => normalizeMemeSource(s).text;

describe("a framing sigil names its ends", () => {
  test("the opener takes from= and to=", () => {
    expect(norm('<<^ code="&#x0001;" ? -> lar:///a.b.c/x >>'))
      .toBe('<<^ code="&#x0001;" from=? -> to=lar:///a.b.c/x >>');
  });

  test("a namespace keeps its place ahead of the ends", () => {
    // The META holds the authority the SOH opener derives from — stating a namespace on the head alone
    // reads as drift and clears. So a faithful carrier declares it.
    const head = (ends: string) =>
      ['```toml meta', 'namespace = "glyph"', '```', '', `<<^ code="&#x0001;" namespace="glyph" ${ends} >>`].join("\n");
    expect(norm(head('? -> lar:///a.b.c/x'))).toBe(head('from=? -> to=lar:///a.b.c/x'));
  });

  test("the closer names the end the arrow reaches", () => {
    expect(norm('<<^ code="&#x0004;" -> ? >>')).toBe('<<^ code="&#x0004;" -> to=? >>');
  });

  test("the shifted pair carries the same law", () => {
    expect(norm('<<^ code="&#x0011;" ? -> lar:///a.b.c/x >>'))
      .toBe('<<^ code="&#x0011;" from=? -> to=lar:///a.b.c/x >>');
    expect(norm('<<^ code="&#x0014;" -> ? >>')).toBe('<<^ code="&#x0014;" -> to=? >>');
  });

  test("★ an arrow outside the framing set stays as it stands ★", () => {
    for (const src of [
      '<<~moves alpha -> beta gamma delta >>',
      '<<~ pranala #x from=? -> to=lar:///a.b.c family=reference role=source >>',
      '<<~ lares aim from=lar:///a.b.c -> to=lar:///d.e.f >>',
      '<<^ code="&#x0002;" >>',
      'A prose line with an arrow -> and a question ? in it.',
    ]) {
      expect(norm(src)).toBe(src);
    }
  });

  test("★ a head that already names its ends stands unchanged ★", () => {
    const done = '<<^ code="&#x0001;" from=? -> to=lar:///a.b.c/x >>';
    expect(norm(done)).toBe(done);
    const r = normalizeMemeSource('<<^ code="&#x0001;" ? -> lar:///a.b.c/x >>');
    expect(normalizeMemeSource(r.text).text).toBe(r.text);
  });

  test("the transform reports itself", () => {
    const r = normalizeMemeSource('<<^ code="&#x0001;" ? -> lar:///a.b.c/x >>');
    expect(r.changed).toBe(true);
    expect(r.notes.join(" ")).toMatch(/end|from|to/i);
  });
});

describe("the writer emits the ends already named", () => {
  // A forgiving reader beside a writer that emits ONE spelling carries a grammar migration. Where the
  // writer keeps the earlier spelling, every round trip mints it back.
  const URI = "lar:///test.ends";

  test("★ the minted opener and closer name their ends ★", async () => {
    const { memeticWikitextDeserializer, expandMemeRefs } = await import("../src/deserializer.js");
    const records = memeticWikitextDeserializer("Just prose.\n", { title: URI });
    const map = new Map(records.map((r) => [String(r.title), r]));
    const out = expandMemeRefs((t) => map.get(t), URI)!;
    expect(out).toContain(`from=? -> to=${URI}`);
    expect(out).toMatch(/-> to=\? >>/);
  });
});
