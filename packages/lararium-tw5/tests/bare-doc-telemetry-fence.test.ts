/**
 * bare-doc-telemetry-fence — two 2026-07-01 membrane rulings under test:
 *
 *   1. BARE-DOC BODY-CENTERING (3d7238ec): a no-carrier doc (no SOH, no STX)
 *      parses as ALL BODY, and the recompose centers its content between the
 *      minted &#x0002;/&#x0003; markers — the header-routed wrap previously left
 *      the body slot empty and stacked blank lines.
 *
 *   2. TELEMETRY-FENCE SUPERSESSION (operator overrule 2026-07-20, supersedes
 *      ruling 16f4b271): telemetry routes through Py on capture, and a
 *      sensorium→wiki pull carries ALL its metadata. So `lar_*` sensorium /
 *      worldline fields round-trip WHOLE into the iam fence; only the
 *      STRUCTURAL/ENVELOPE set stays denied (title/text/framing rebuild from
 *      the envelope + record stratum — emitting them DOUBLES the body). Two
 *      transient parse-grade markers (`lar_parse_failures` / `lar_parse_degraded`)
 *      remain denied by EXACT name (derived-on-ingest diagnostics), and
 *      TW5-internal `$…` fields stay off the operator's TOML.
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

describe("iam fence — lar_* sensorium metadata round-trips; only structural/parse-grade denied", () => {
  test("lar_* sensorium fields re-emit; parse-grade markers + $-keys stay out; operator fields stay in", () => {
    const fields: TiddlerFields = {
      title: URI,
      type: "text/x-memetic-wikitext",
      text: "body line",
      cacheable: "true",
      // sensorium / worldline metadata — round-trips WHOLE (supersedes 16f4b271)
      lar_agent_handle: "run-99.abc123def",
      lar_ffz: "session/_.claude__run-abc._._.deadbeef",
      lar_root_handle: "sessABC",
      lar_x: "custom-sensor",
      // transient parse-grade diagnostics — denied by exact name (derived-on-ingest)
      lar_parse_failures: "3",
      lar_parse_degraded: "1",
      // TW5-internal field — never on the operator's TOML
      $internal: "never",
    };
    const map = new Map([[URI, fields]]);
    const out = expandMemeRefs((t) => map.get(t), URI)!;
    expect(out).toContain("cacheable");
    // sensorium metadata survives the round-trip
    expect(out).toContain("lar_agent_handle");
    expect(out).toContain("run-99.abc123def");
    expect(out).toContain("lar_ffz");
    expect(out).toContain("lar_root_handle");
    expect(out).toContain("lar_x");
    // the two parse-grade markers stay denied by exact name
    expect(out).not.toContain("lar_parse_failures");
    expect(out).not.toContain("lar_parse_degraded");
    // TW5-internal stays out
    expect(out).not.toContain("$internal");
  });

  test("structural/envelope fields never re-emit — a large body does NOT double on round-trip", () => {
    const bigBody = Array.from({ length: 40 }, (_, i) => `paragraph ${i} — a line of real body content.`).join("\n\n");
    const fields: TiddlerFields = {
      title: URI,
      type: "text/x-memetic-wikitext",
      text: bigBody,
      cacheable: "true",
      lar_agent_handle: "run-1.deadbeef",
    };
    const map = new Map([[URI, fields]]);
    const out = expandMemeRefs((t) => map.get(t), URI)!;
    // the body appears ONCE — structural `text`/`title` never leak into the iam TOML
    const firstPara = "paragraph 0 — a line of real body content.";
    const occurrences = out.split(firstPara).length - 1;
    expect(occurrences).toBe(1);
    // the structural keys never surface as TOML assignments
    expect(out).not.toMatch(/^\s*title\s*=/m);
    expect(out).not.toMatch(/^\s*text\s*=/m);
    // parse∘render re-reads the same body — no doubling
    const again = memeticWikitextDeserializer(out, { title: URI });
    const parent = again.find((r) => r.title === URI)!;
    expect(String(parent.text).trim()).toBe(bigBody.trim());
    expect(parent["lar_agent_handle"]).toBe("run-1.deadbeef");
  });
});
