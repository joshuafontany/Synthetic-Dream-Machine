/**
 * The parse grade rides ONE warning tiddler under TWO counts.
 *
 * ── WHY NOT ON THE RECORD ───────────────────────────────────────────────────────────────────────
 * A parse grade is something the READER observed, never something the author wrote. A field carrying
 * it is a fact an operator can see and edit and cannot round-trip — the placement law's prohibition,
 * exactly. So no record carries one.
 *
 * ── WHY TWO COUNTS AND NOT ONE ──────────────────────────────────────────────────────────────────
 * Two readings run over a carrier and neither subsumes the other. The splitter emits AUTHORING
 * advisories — a TOML key the URI already derives, a carrier close inside an unclosed fence — each
 * addressed to a person who can act on it. The grammar reports positional RECOVERIES, each naming what
 * the parser fell back to. One count for both would blur a nudge to a person with a fallback by a
 * machine, and an operator reading `3` could not tell which kind they had.
 *
 * ── WHY ONE TIDDLER AND NOT TWO ─────────────────────────────────────────────────────────────────
 * The host's own shape: TiddlyWiki stages many findings from one operation in a single `$:/Import`
 * tiddler rather than scattering them, so a reader's query stays at one address. This follows it.
 *
 * ── WHY IN A WIKI ───────────────────────────────────────────────────────────────────────────────
 * The deserializer registers as a `tiddlerdeserializer` module, and what a template or a sync layer
 * meets is what the HOST hands back from `deserializeTiddlers` — not what an exported function
 * returns. A direct call would pass while the registered module did something else entirely.
 */
import { describe, test, expect, beforeAll } from "vitest";
import { TW5Engine } from "../src/tw5-vm.js";
import { bootTestWiki, wikiSkip, skipNote } from "./test-wiki.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import { PARSE_WARNING_TAG } from "@lararium/mesh/lar-uris";

const URI = "lar:///ha.ka.ba/lares/api/pono/grade-probe";

/** A carrier whose iam declares a key the URI already derives — one authoring advisory. */
const ADVISORY = `<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>

<<^ code:"&#x0001;" ? -> ${URI} >>
\`\`\`toml iam
title    = "this key is derived from the URI and must be ignored"
type     = "text/x-memetic-wikitext+tiddlywiki"
uri-path = "ha.ka.ba/lares/api/pono/grade-probe"
\`\`\`

<<^ code:"&#x0002;" >>

the body.

<<^ code:"&#x0003;" >>

<<^ code:"&#x0004;" -> ? >>
`;

describe.skipIf(wikiSkip)(`the parse grade rides its envelope, never a record${skipNote}`, () => {
  let engine: TW5Engine;
  beforeAll(async () => { engine = await bootTestWiki(); }, 60_000);

  const read = (text: string) =>
    (engine.$tw.wiki.deserializeTiddlers(CARRIER_TYPE, text, { title: URI }) ?? []) as Array<
      Record<string, unknown>
    >;

  test("no record carries a parse-grade field", () => {
    const records = read(ADVISORY);
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(r["lar_parse_failures"], `on ${String(r["title"])}`).toBeUndefined();
      expect(r["lar_parse_degraded"], `on ${String(r["title"])}`).toBeUndefined();
    }
  });

  test("exactly one warning tiddler carries the grade", () => {
    const warned = read(ADVISORY).filter((r) => String(r["tags"] ?? "").includes(PARSE_WARNING_TAG));
    expect(warned).toHaveLength(1);
    expect(warned[0]!["meme-uri"]).toBe(URI);
  });

  /**
   * BOTH counts stand, always — a reader must never have to tell "no findings of this kind" apart
   * from "this kind was never measured", which is the same absence-versus-zero blur the check reader
   * met when a missing digest read as a passing one.
   */
  test("the warning tiddler carries both counts, each named for its own reading", () => {
    const w = read(ADVISORY).find((r) => String(r["tags"] ?? "").includes(PARSE_WARNING_TAG))!;
    expect(w).toBeDefined();
    expect(w["warning-count"]).toBeDefined();
    expect(w["failure-count"]).toBeDefined();
    // The advisory carrier trips the splitter and satisfies the grammar.
    expect(Number(w["warning-count"])).toBeGreaterThan(0);
    expect(Number(w["failure-count"])).toBe(0);
  });

  /** A clean carrier raises no envelope at all — silence is the absence of findings, not a zero row. */
  test("a carrier with nothing to report raises no warning tiddler", () => {
    const clean = ADVISORY.replace(/title    = "[^"]*"\n/, "");
    const warned = read(clean).filter((r) => String(r["tags"] ?? "").includes(PARSE_WARNING_TAG));
    expect(warned).toHaveLength(0);
  });
});
