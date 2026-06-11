/**
 * meme-roundtrip — the canonical-form law's harness proof (guarantee 3):
 * parse∘render ≡ records, proven, never asserted.
 *
 * The membrane module owns both directions (carrier-whole at rest):
 *   ingest  — memeticWikitextDeserializer: carrier → parent + ahu children
 *   export  — expandMemeRefs: records → whole recomposed carrier
 *
 * Three guarantees under test (handoff #pattern-integrities §2):
 *   1. idempotent render — render(parse(render(x))) === render(x)
 *   2. content survives whole — only the iam fence framing (key order,
 *      alignment, the namespace line that re-homes to SOH) normalizes;
 *      every byte outside the iam fences round-trips identically
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
const BOOT_MEME = join(REPO_ROOT, "bags/@lares/v0.1/api/lares/noosphere-boot.md");
const BOOT_URI  = "lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot";

const IAM_FENCE_RE = /```toml iam\n[\s\S]*?```\n/g;

/** Normalize iam framing out of a carrier — content-fidelity view. */
function contentView(carrier: string): string {
  return carrier.replace(IAM_FENCE_RE, "```toml iam\n<normalized>\n```\n");
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

  test("guarantee 2 — content bytes survive whole; only iam framing normalizes", () => {
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

const TEACHING_URI = "lar:///ha.ka.ba/@lares/v0.1/memory/fence-teaching";
const TEACHING = `<<~ ${"&#x0001;"} ? -> ${TEACHING_URI} >>
\`\`\`toml iam
uri-path = "ha.ka.ba/@lares/v0.1/memory/fence-teaching"
type     = "text/x-memetic-wikitext"
\`\`\`

<<~ ${"&#x0002;"} >>

<<~ ahu #lesson >>

A fenced carrier close MUST NOT close this body:

\`\`\`text
<<~ ${"&#x0003;"} >>
<<~ ahu #fake >>
not a child
<<~/ahu >>
<<~ kahea ahu #ghost >>
\`\`\`

Inline mentions stay literal too: \`<<~ ${"&#x0003;"} >>\` and \`<<~ ahu #also-fake >>\`.

\`\`\`\`md
a four-backtick fence quoting an iam fence:
\`\`\`toml iam
mana = 99
\`\`\`
\`\`\`\`

<<~/ahu >>

After the fence, the carrier still runs.

<<~ ${"&#x0003;"} >>

<<~ ${"&#x0004;"} -> ? >>
`;

describe("fence-mask — quoted sigils never frame, split, or expand", () => {
  const records = recordsOf(TEACHING, TEACHING_URI);

  test("quoted ahu/ETX sigils produce no records and do not truncate", () => {
    const titles = [...records.keys()];
    expect(titles).toContain(TEACHING_URI);
    expect(titles).toContain(`${TEACHING_URI}#lesson`);
    expect(titles.filter((t) => t.includes("#fake") || t.includes("#also-fake") || t.includes("#ghost"))).toEqual([]);
    // the fenced ETX did not truncate: post-fence prose survives in records
    expect(records.get(TEACHING_URI)!.text).toContain("the carrier still runs");
  });

  test("quoted iam (four-backtick fence) never becomes the slot's identity", () => {
    expect(records.get(`${TEACHING_URI}#lesson`)!["mana"]).toBeUndefined();
  });

  test("round-trips content-whole and idempotent", () => {
    const rendered = expandMemeRefs(readerOf(records), TEACHING_URI)!;
    expect(contentView(rendered)).toBe(contentView(TEACHING));
    const again = expandMemeRefs(readerOf(recordsOf(rendered, TEACHING_URI)), TEACHING_URI);
    expect(again).toBe(rendered);
  });
});

describe("Kapu SOH variant survives the round trip", () => {
  const KAPU_URI = "lar:///ha.ka.ba/@lares/v0.1/memory/kapu-carrier";
  const KAPU = `<<~ ⊙${"&#x0011;"} ? -> ${KAPU_URI} >>
\`\`\`toml iam
uri-path = "ha.ka.ba/@lares/v0.1/memory/kapu-carrier"
type     = "text/x-memetic-wikitext"
\`\`\`

<<~ ${"&#x0002;"} >>

kapu body.

<<~ ${"&#x0003;"} >>

<<~ ${"&#x0004;"} -> ? >>
`;
  test("the DC1 code and namespace re-emit on the SOH line", () => {
    const records = recordsOf(KAPU, KAPU_URI);
    const rendered = expandMemeRefs(readerOf(records), KAPU_URI)!;
    expect(rendered.startsWith(`<<~ ⊙${"&#x0011;"} ? -> ${KAPU_URI} >>`)).toBe(true);
    expect(rendered).toBe(expandMemeRefs(readerOf(recordsOf(rendered, KAPU_URI)), KAPU_URI));
  });
});
