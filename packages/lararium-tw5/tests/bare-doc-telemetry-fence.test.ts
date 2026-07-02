/**
 * bare-doc-telemetry-fence — two 2026-07-01 membrane rulings under test:
 *
 *   1. BARE-DOC BODY-CENTERING (3d7238ec): a no-carrier doc (no SOH, no STX)
 *      parses as ALL BODY, and the recompose centers its content between the
 *      minted &#x0002;/&#x0003; markers — the header-routed wrap previously left
 *      the body slot empty and stacked blank lines.
 *
 *   2. TELEMETRY OFF-CANON (16f4b271): machine stamps (`lar_*`, `$…`) NEVER
 *      re-emit into the iam fence — sensor readings stay off the operator's
 *      TOML (the lar_parse_failures write-back bite).
 */

import { describe, test, expect } from "vitest";
import {
  memeticWikitextDeserializer,
  expandMemeRefs,
  type TiddlerFields,
} from "../src/deserializer.js";

const URI = "lar:///test.bare.doc";
const STX = "<<~ &#x0002; >>";
const ETX = "<<~ &#x0003; >>";

function renderOf(records: TiddlerFields[]): string {
  const map = new Map(records.map((r) => [String(r.title), r]));
  const out = expandMemeRefs((t) => map.get(t), URI);
  expect(out).toBeTruthy();
  return out!;
}

describe("bare doc — ALL BODY, centered between minted STX/ETX", () => {
  const bare = "Just prose, no carrier sigils.\n\nA second paragraph.";
  const records = memeticWikitextDeserializer(bare, { title: URI });

  test("parses as one record whose text carries the whole content", () => {
    expect(records).toHaveLength(1);
    expect(records[0]!.text).toBe(bare);
    expect(records[0]!["header-text"] ?? "").toBe("");
  });

  test("recompose centers the content between STX and ETX (no empty body slot)", () => {
    const out = renderOf(records);
    const stxAt = out.indexOf(STX);
    const etxAt = out.indexOf(ETX);
    const bodyAt = out.indexOf("Just prose");
    expect(stxAt).toBeGreaterThan(-1);
    expect(bodyAt).toBeGreaterThan(stxAt);
    expect(etxAt).toBeGreaterThan(bodyAt);
    // nothing of the content leaks into the header region (before STX)
    expect(out.slice(0, stxAt)).not.toContain("Just prose");
  });

  test("round-trip fixpoint — parse(render) re-reads the same body", () => {
    const again = memeticWikitextDeserializer(renderOf(records), { title: URI });
    const parent = again.find((r) => r.title === URI)!;
    expect(String(parent.text).trim()).toBe(bare);
  });
});

describe("iam fence — lar_* telemetry never re-emits", () => {
  test("lar_* and $-keys stay out; operator fields stay in", () => {
    const fields: TiddlerFields = {
      title: URI,
      type: "text/x-memetic-wikitext",
      text: "body line",
      cacheable: "true",
      lar_parse_failures: "3",
      lar_hv: "abc123",
      $internal: "never",
    };
    const map = new Map([[URI, fields]]);
    const out = expandMemeRefs((t) => map.get(t), URI)!;
    expect(out).toContain("cacheable");
    expect(out).not.toContain("lar_parse_failures");
    expect(out).not.toContain("lar_hv");
    expect(out).not.toContain("$internal");
  });
});
