/**
 * meme-roundtrip — the canonical-form law's harness proof (guarantee 3):
 * parse∘render ≡ records, proven, never asserted.
 *
 * The shore module owns both directions (carrier-whole at rest):
 *   ingest  — memeticWikitextDeserializer: carrier → parent + ahu children
 *   export  — expandMemeRefs: records → whole recomposed carrier
 *
 * Three guarantees under test (handoff #pattern-integrities §2):
 *   1. idempotent render — render(parse(render(x))) === render(x)
 *   2. content survives whole — only the meta fence framing (key order,
 *      alignment, the namespace line that re-homes to SOH) normalizes;
 *      every byte outside the meta fences round-trips identically
 *   3. semantic identity — parse(render(records)) ≡ records
 *
 * Vectors run against the live boot meme — the corpus's own canon — so the
 * proof binds to real operator-authored bytes, not a synthetic fixture.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  memeticWikitextDeserializer,
  expandMemeRefs,
  type TiddlerFields,
} from "../src/deserializer.js";

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const BOOT_MEME = join(REPO_ROOT, "bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem");
const BOOT_URI  = "lar:///ha.ka.ba/lares/api/noosphere-boot";

const META_FENCE_RE = /```toml meta\n[\s\S]*?```\n/g;

/** Normalize meta framing out of a carrier — content-fidelity view. */
function contentView(carrier: string): string {
  return carrier.replace(META_FENCE_RE, "```toml meta\n<normalized>\n```\n");
}

function recordsOf(text: string, uri: string): Map<string, TiddlerFields> {
  const records = memeticWikitextDeserializer(text, { title: uri });
  return new Map(records.map((r) => [String(r.title), r]));
}

function readerOf(map: Map<string, TiddlerFields>) {
  return (title: string) => map.get(title);
}

describe("parse∘render — the recompose inverse on the boot meme", () => {
  const source  = readFileSync(BOOT_MEME, "utf8");
  const records = recordsOf(source, BOOT_URI);
  const rendered = expandMemeRefs(readerOf(records), BOOT_URI);

  test("render produces a whole carrier (no kahea markers survive)", () => {
    expect(rendered).toBeTruthy();
    expect(rendered!).not.toContain("<<~ kahea ahu ");
    expect(rendered!).toContain("<<~ ahu #entry >>");
    expect(rendered!).toContain("<<~/ahu >>");
  });

  test("guarantee 2 — content bytes survive whole; only meta framing normalizes", () => {
    expect(contentView(rendered!)).toBe(contentView(source));
  });

  test("guarantee 3 — parse(render(records)) ≡ records", () => {
    const reparsed = recordsOf(rendered!, BOOT_URI);
    expect([...reparsed.keys()].sort()).toEqual([...records.keys()].sort());
    for (const [title, original] of records) {
      expect(reparsed.get(title), `record ${title}`).toEqual(original);
    }
  });

  test("guarantee 1 — idempotent render: canonical input round-trips byte-identical", () => {
    const reparsed = recordsOf(rendered!, BOOT_URI);
    const rerendered = expandMemeRefs(readerOf(reparsed), BOOT_URI);
    expect(rerendered).toBe(rendered);
  });
});

// ---------------------------------------------------------------------------
// Fence-mask law (2026-06-11): quoted sigils stay content, never structure.
// ---------------------------------------------------------------------------

const TEACHING_URI = "lar:///ha.ka.ba/lares/memory/fence-teaching";
const TEACHING = `<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>

<<^ code="${"&#x0001;"}" ? -> ${TEACHING_URI} >>
\`\`\`toml meta
uri-path = "ha.ka.ba/lares/memory/fence-teaching"
type     = "text/memetic-wikitext+tiddlywiki"
\`\`\`

<<^ code="${"&#x0002;"}" >>

<<~ ahu #lesson >>

A fenced carrier close MUST NOT close this body:

\`\`\`text
<<^ code="${"&#x0003;"}" >>
<<~ ahu #fake >>
not a child
<<~/ahu >>
<<~ kahea ahu #ghost >>
\`\`\`

Inline mentions stay literal too: \`<<^ code="${"&#x0003;"}" >>\` and \`<<~ ahu #also-fake >>\`.

\`\`\`\`md
a four-backtick fence quoting an meta fence:
\`\`\`toml meta
mana = 99
\`\`\`
\`\`\`\`

<<~/ahu >>

After the fence, the carrier still runs.

<<^ code="${"&#x0003;"}" >>ni:///sha-256;FQysnSrznq4cdM66EtuY6AkQHPmrKrzFXtGAEWIieSc

<<^ code="${"&#x0004;"}" -> ? >>
`;

describe("fence-mask — quoted sigils never frame, split, or expand", () => {
  const records = recordsOf(TEACHING, TEACHING_URI);

  test("quoted ahu/ETX sigils produce no records and do not truncate", () => {
    const titles = [...records.keys()];
    expect(titles).toContain(TEACHING_URI);
    expect(titles).toContain(`${TEACHING_URI}#/lesson`);
    expect(titles.filter((t) => t.includes("#fake") || t.includes("#also-fake") || t.includes("#ghost"))).toEqual([]);
    // the fenced ETX did not truncate: post-fence prose survives in records
    expect(records.get(TEACHING_URI)!.text).toContain("the carrier still runs");
  });

  test("quoted meta (four-backtick fence) never becomes the slot's identity", () => {
    expect(records.get(`${TEACHING_URI}#/lesson`)!["mana"]).toBeUndefined();
  });

  test("round-trips content-whole and idempotent", () => {
    const rendered = expandMemeRefs(readerOf(records), TEACHING_URI)!;
    expect(contentView(rendered)).toBe(contentView(TEACHING));
    const again = expandMemeRefs(readerOf(recordsOf(rendered, TEACHING_URI)), TEACHING_URI);
    expect(again).toBe(rendered);
  });
});

describe("Kapu SOH variant survives the round trip", () => {
  const KAPU_URI = "lar:///ha.ka.ba/lares/memory/kapu-carrier";
  const KAPU = `<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>

<<^ code="${"&#x0011;"}" namespace="⊙" ? -> ${KAPU_URI} >>
\`\`\`toml meta
uri-path = "ha.ka.ba/lares/memory/kapu-carrier"
type     = "text/memetic-wikitext+tiddlywiki"
\`\`\`

<<^ code="${"&#x0002;"}" >>

kapu body.

<<^ code="${"&#x0003;"}" >>

<<^ code="${"&#x0004;"}" -> ? >>
`;
  test("the DC1 code and namespace re-emit on the SOH line", () => {
    const records = recordsOf(KAPU, KAPU_URI);
    const rendered = expandMemeRefs(readerOf(records), KAPU_URI)!;
    expect(rendered.startsWith(`<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>

<<^ code="${"&#x0011;"}" namespace="⊙" ? -> ${KAPU_URI} >>`)).toBe(true);
    expect(rendered).toBe(expandMemeRefs(readerOf(recordsOf(rendered, KAPU_URI)), KAPU_URI));
  });
});

describe("carrier-bytes law — the boundary normalizes once (memetic-wikitext-framing #carrier-bytes)", () => {
  test("BOM strips and CRLF normalizes to LF; the carrier reads canonical", () => {
    const foreign = "﻿" + TEACHING.replace(/\n/g, "\r\n");
    const records = recordsOf(foreign, TEACHING_URI);
    expect([...records.keys()]).toContain(`${TEACHING_URI}#/lesson`);
    const rendered = expandMemeRefs(readerOf(records), TEACHING_URI)!;
    expect(rendered.includes("\r")).toBe(false);
    expect(rendered.charCodeAt(0)).not.toBe(0xfeff);
    // a CRLF+BOM carrier and its LF original parse to identical records
    const native = recordsOf(TEACHING, TEACHING_URI);
    expect([...records.keys()].sort()).toEqual([...native.keys()].sort());
    expect(records.get(TEACHING_URI)!.text).toBe(native.get(TEACHING_URI)!.text);
  });
});
