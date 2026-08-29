/**
 * meme-markdown — the submission projection's laws, each on the seam it guards.
 *
 * The projection serves a reader who was never taught the grammar, so every law here reads as a
 * promise to that reader: the frame never reaches them, the notation they do meet is shown
 * literally, their anchors resolve, and two projections of one carrier never differ.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transposeMarkdown, projectSubmission } from "../src/meme-markdown.js";

const REPO = new URL("../../..", import.meta.url).pathname;

const CARRIER = `<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>

<<^ code="&#x0001;" namespace="⊙" from=? -> to=lar:///ha.ka.ba/lares/api/pono/probe >>
\`\`\`toml meta
register = "Synthesis-Canon"
uri-path = "ha.ka.ba/lares/api/pono/probe"
\`\`\`

<<^ code="&#x0002;" >>

<<~ ahu #head >>

! Probe — a worked example

!! The ''bold'' law and the //italic// one

A confidence of 12/20 stays 12/20, and \`lar:///a//b\` keeps its slashes.

|!code |!mark |
|\`&#x0001;\` |SOH |

# first
# second

* a bullet

<<~ranks kind carrier -> descriptor >>
<<~ loulou lar:///ha.ka.ba/lares/api/pono/lar-uri >>

\`\`\`\`
<<^ code="&#x0002;" >>
a teaching frame stays byte-identical, ''unrendered''
\`\`\`\`

<<~/ahu >>

<<^ code="&#x0003;" >>ni:///sha-256;AAAA_probe_check
<<^ code="&#x0004;" -> to=? >>
`;

describe("the submission projection", () => {
  const p = projectSubmission(CARRIER);

  test("the frame never reaches the reader; the meta records it", () => {
    // fenced teaching examples keep their marks by law — the promise binds prose lines only
    let fence = 0;
    for (const line of p.markdown.split("\n")) {
      const m = /^(`{3,})/.exec(line);
      if (m) { fence = fence === 0 ? m[1]!.length : (m[1]!.length >= fence ? 0 : fence); continue; }
      if (fence === 0) {
        expect(line).not.toMatch(/^<<\^/);
        expect(line).not.toMatch(/^<<!DOCTYPE/);
      }
    }
    expect(p.markdown).not.toContain("toml meta");
    expect(p.uri).toBe("lar:///ha.ka.ba/lares/api/pono/probe");
    expect(p.check).toBe("ni:///sha-256;AAAA_probe_check");
    expect(p.meta).toContain("source: lar:///ha.ka.ba/lares/api/pono/probe");
    expect(p.meta).toContain("source-check: ni:///sha-256;AAAA_probe_check");
  });

  test("headings, lists, emphasis transpose total", () => {
    expect(p.markdown).toContain("# Probe — a worked example");
    expect(p.markdown).toContain("## The **bold** law and the *italic* one");
    expect(p.markdown).toContain("1. first");
    expect(p.markdown).toContain("2. second");
    expect(p.markdown).toContain("- a bullet");
  });

  test("prose numerals and code-span slashes survive the emphasis pass", () => {
    expect(p.markdown).toContain("A confidence of 12/20 stays 12/20");
    expect(p.markdown).toContain("`lar:///a//b`");
  });

  test("tables shed the header mark and gain the separator row", () => {
    expect(p.markdown).toContain("| code | mark |");
    expect(p.markdown).toContain("|---|---|");
  });

  test("an ahu opens an anchor; edges become reference bullets; other sigils show literally", () => {
    expect(p.markdown).toContain('<a id="head"></a>');
    expect(p.markdown).not.toContain("<<~/ahu");
    expect(p.markdown).toContain("- `lar:///ha.ka.ba/lares/api/pono/lar-uri`");
    expect(p.markdown).toContain("`<<~ranks kind carrier -> descriptor >>`");
  });

  test("a fence seals its interior — the teaching frame passes byte-identical", () => {
    expect(p.markdown).toContain('<<^ code="&#x0002;" >>\na teaching frame stays byte-identical');
    expect(p.markdown).toContain("''unrendered''");
  });

  test("a sigil spanning lines travels whole, fenced", () => {
    const src = "<<~ranks register a ~ one\n  -> b ~ two\n  -> c ~ three >>\nprose after\n";
    const t = transposeMarkdown(src);
    expect(t.markdown).toContain("```\n<<~ranks register a ~ one\n  -> b ~ two\n  -> c ~ three >>\n```");
    expect(t.markdown).toContain("prose after");
  });

  test("the projection is deterministic", () => {
    const again = projectSubmission(CARRIER);
    expect(again.markdown).toBe(p.markdown);
    expect(again.meta).toBe(p.meta);
  });
});

describe("against the live corpus", () => {
  test("the lar-uri spec projects whole", () => {
    const src = readFileSync(join(REPO, "bags/lares/ha.ka.ba/lares/api/pono/lar-uri.mem"), "utf8");
    const p = projectSubmission(src);
    expect(p.uri).toBe("lar:///ha.ka.ba/lares/api/pono/lar-uri");
    expect(p.check.startsWith("ni:///sha-256;")).toBe(true);
    expect(p.markdown).toContain("# ");
    // the frame stays out of the reader's copy — only fenced teaching examples may carry marks
    const unfenced = p.markdown.split("\n").filter((l) => !l.startsWith("```"));
    let fenced = 0;
    for (const line of p.markdown.split("\n")) {
      const m = /^(`{3,})/.exec(line);
      if (m) { fenced = fenced === 0 ? m[1]!.length : 0; continue; }
      if (fenced === 0) expect(line).not.toMatch(/^<<\^ code:/);
    }
    expect(unfenced.length).toBeGreaterThan(50);
  });

  test("a second projection of the spec matches the first byte-for-byte", () => {
    const src = readFileSync(join(REPO, "bags/lares/ha.ka.ba/lares/api/pono/lar-uri.mem"), "utf8");
    expect(projectSubmission(src).markdown).toBe(projectSubmission(src).markdown);
  });
});

describe("the tooth stands at one dispatch position", () => {
  const carrier = (open: string, close: string) =>
    `<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/probe >>\n\n` +
    `<<^ code="&#x0001;" from=? -> to=lar:///ha.ka.ba/probe >>\n` +
    `<<^ code="&#x0002;" >>\n\n${open}\n\n! A heading\n\n${close}\n\n` +
    `<<^ code="&#x0003;" >>\n<<^ code="&#x0004;" -> to=? >>\n`;

  const spellings: Array<[string, string, string]> = [
    ["tooth then space", "<<~ ahu #entry >>", "<<~/ahu >>"],
    ["close carries a space", "<<~ ahu #entry >>", "<<~ /ahu >>"],
    ["tooth joined to the word", "<<~ahu #entry >>", "<<~/ahu >>"],
    ["both joined", "<<~ahu #entry >>", "<<~ /ahu >>"],
  ];

  // A close word carries its own slash, matching the plain register's
  // `<<fragment …>>` / `<</fragment>>`. Every spelling reaches the same word,
  // so every spelling projects the same markdown.
  const expected = transposeMarkdown(carrier(spellings[0][1], spellings[0][2])).markdown;

  for (const [name, open, close] of spellings) {
    test(name, () => {
      const { markdown } = transposeMarkdown(carrier(open, close));
      expect(markdown).toBe(expected);
      expect(markdown).not.toContain("<<~");
    });
  }
});

describe("the projector reads a framing opener that names its ends", () => {
  // One spelling reads. A carrier holding any earlier spelling arrives through `carrier normalize`, which
  // homes it — so the projector answers to the current form alone and keeps no second branch.
  const URI = "lar:///a.b.c/x";
  const body = (ends: string) =>
    [`<<^ code="&#x0001;" ${ends} >>`, "", "A line of body.", "", '<<^ code="&#x0004;" -> to=? >>'].join("\n");

  test("the named end reaches the projection as the carrier's address", () => {
    const p = projectSubmission(body(`from=? -> to=${URI}`), { title: "lar:///t" });
    expect(p.markdown).toBeTruthy();
    expect(p.markdown).not.toContain("to=lar:///");
  });
});
