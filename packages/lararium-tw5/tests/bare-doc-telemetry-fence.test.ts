/**
 * bare-doc-telemetry-fence — two 2026-07-01 shore rulings under test:
 *
 *   1. BARE-DOC BODY-CENTERING (3d7238ec): a no-carrier doc (no SOH, no STX)
 *      parses as ALL BODY, and the recompose centers its content between the
 *      minted &#x0002;/&#x0003; markers. A header-routed wrap leaves the body slot
 *      empty and stacks blank lines.
 *
 *   2. TELEMETRY-FENCE SUPERSESSION (operator overrule 2026-07-20, supersedes
 *      ruling 16f4b271): telemetry routes through Py on capture, and a
 *      sensorium→wiki pull carries ALL its metadata. So `lar_*` sensorium /
 *      worldline fields round-trip WHOLE into the iam fence; only the
 *      STRUCTURAL/ENVELOPE set stays denied (title/text/framing rebuild from
 *      the envelope + record stratum — emitting them DOUBLES the body). Two
 *      the deny-set holds ONLY what the host itself reserves, and
 *      TW5-internal `$…` fields stay off the operator's TOML.
 */

import { describe, test, expect } from "vitest";
import {
  memeticWikitextDeserializer,
  expandMemeRefs,
  type TiddlerFields,
} from "../src/deserializer.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";

const URI = "lar:///test.bare.doc";
const STX = "<<^ code:\"&#x0002;\" >>";
const ETX = "<<^ code:\"&#x0003;\" >>";

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
    expect(records[0]!["$header-text"] ?? "").toBe("");
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
      type: CARRIER_TYPE,
      text: "body line",
      cacheable: "true",
      // sensorium / worldline metadata — round-trips WHOLE (supersedes 16f4b271)
      lar_agent_handle: "run-99.abc123def",
      lar_ffz: "session/_.claude__run-abc._._.deadbeef",
      lar_root_handle: "sessABC",
      lar_x: "custom-sensor",
      // a field named like a former diagnostic — the operator's to write, so it round-trips
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
    // NO NAME IS RESERVED THAT THE HOST DOES NOT RESERVE. Nothing writes these any more, so a field
    // carrying one of these names arrived from the operator's own hand and travels like any other.
    expect(out).toContain("lar_parse_failures");
    expect(out).toContain("lar_parse_degraded");
    // TW5-internal stays out
    expect(out).not.toContain("$internal");
  });

  test("structural/envelope fields never re-emit — a large body does NOT double on round-trip", () => {
    const bigBody = Array.from({ length: 40 }, (_, i) => `paragraph ${i} — a line of real body content.`).join("\n\n");
    const fields: TiddlerFields = {
      title: URI,
      type: CARRIER_TYPE,
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

  /**
   * THE CARRIER GRAIN OF THE SAME LAW `child-name-blocks` holds one level down.
   *
   * Ten words this grammar once stood on — the frame's carriage, the ahu structure, the block check.
   * They belong to the author now: the carriage rides `$…`, and the check is minted rather than
   * remembered. A carrier declaring all ten reads every one of them back.
   *
   * `postamble` earns its place in the list twice over. The bytes trailing a file hang on the LAST
   * carrier's parent (`closes[closes.length - 1]`), not the first — and every carrier in the corpus
   * holds exactly one meme, so that distribution has no live case and the word is simply free.
   */
  test("every name the grammar once stood on round-trips as an authored carrier field", () => {
    const authored = [
      "postamble", "prologue", "preamble", "header-text", "slot", "fragment-parent",
      "carrier-soh", "carrier-sila", "block-check", "postamble-foreign",
    ];
    const fields: TiddlerFields = { title: URI, type: CARRIER_TYPE, text: "body line" };
    for (const k of authored) fields[k] = `AUTHORED-${k}`;

    const map = new Map([[URI, fields]]);
    const out = expandMemeRefs((t) => map.get(t), URI)!;
    const back = memeticWikitextDeserializer(out, { title: URI });
    const record = back.find((r) => r["title"] === URI)!;

    expect(authored.filter((k) => record[k] !== `AUTHORED-${k}`), "names the host does not reserve")
      .toEqual([]);
  });
});
