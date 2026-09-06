/**
 * Child meta inheritance (regression guard) — a child re-emits a field ONLY when it DIFFERS
 * from its parent. An inherited-and-matching field floats down silently (no clutter); a
 * genuinely-distinct one survives (no loss); the two DERIVED coordinates (uri-path,
 * file-path) never re-emit on a child.
 *
 * History: two regressions bracketed this. First a deny-list over-stripped authored child
 * fields (lost `type`); then an all-fields revert stamped inherited fields onto every
 * fragment (clutter). Parent-diff resolves both.
 */
import { describe, expect, test } from "vitest";

import { expandMemeRefs } from "../src/deserializer.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import type { TiddlerFields } from "../src/deserializer.js";

const ROOT = "lar:///ha.ka.ba/x/demo";

function reader(map: Record<string, TiddlerFields>) {
  return (t: string): TiddlerFields | undefined => map[t];
}

describe("child meta inheritance (parent-diff)", () => {
  const parent: TiddlerFields = {
    title: ROOT,
    type: CARRIER_TYPE,
    namespace: "ns",
    "$carrier-soh": "0001",
    text: "<<~ kahea ahu #kid>>",
  };

  function childBlock(out: string): string {
    const m = /<<~ ahu #kid>>([\s\S]*?)<<~\/ahu>>/.exec(out);
    return m ? m[1]! : "";
  }

  test("inherited-matching field (type == parent) is NOT re-emitted on the child", () => {
    const kid: TiddlerFields = { title: `${ROOT}#/kid`, type: CARRIER_TYPE, text: "body" };
    const out = expandMemeRefs(reader({ [ROOT]: parent, [`${ROOT}#/kid`]: kid }), ROOT);
    expect(out).not.toBeNull();
    expect(childBlock(out!)).not.toMatch(/^type = /m);   // matches parent → skipped
  });

  test("distinct field (a different type, or an authored role) DOES survive on the child", () => {
    const kid: TiddlerFields = {
      title: `${ROOT}#/kid`,
      type: "text/plain",           // DIFFERS from parent → keep
      role: "source-text interior", // authored, parent lacks it → keep
      text: "body",
    };
    const out = expandMemeRefs(reader({ [ROOT]: parent, [`${ROOT}#/kid`]: kid }), ROOT);
    const block = childBlock(out!);
    expect(block).toMatch(/^type = "text\/plain"/m);
    expect(block).toMatch(/^role = /m);
  });

  test("a child meta block sits FLUSH against the ahu sigil line (no blank between)", () => {
    const kid: TiddlerFields = { title: `${ROOT}#/kid`, type: "text/plain", text: "content below" };
    const out = expandMemeRefs(reader({ [ROOT]: parent, [`${ROOT}#/kid`]: kid }), ROOT);
    // sigil line, then IMMEDIATELY the fence — one newline, no blank line between.
    expect(out).toMatch(/<<~ ahu #kid>>\n```toml meta\n/);
    // a blank line then separates the content below the fence.
    expect(out).toMatch(/```\n\ncontent below/);
  });

  test("an empty child (no meta, no body) holds a SINGLE blank line, never balloons", () => {
    const kid: TiddlerFields = { title: `${ROOT}#/kid`, type: CARRIER_TYPE, text: "" };
    const out = expandMemeRefs(reader({ [ROOT]: parent, [`${ROOT}#/kid`]: kid }), ROOT);
    // sigil · one blank · closer — no three-blank bloat.
    expect(out).toMatch(/<<~ ahu #kid>>\n\n<<~\/ahu>>/);
    expect(out).not.toMatch(/<<~ ahu #kid>>\n\n\n/);
  });

  test("derived coordinates (uri-path, file-path) never re-emit on a child", () => {
    const kid: TiddlerFields = {
      title: `${ROOT}#/kid`,
      role: "keep-me",
      "uri-path": "x/demo/kid",
      "file-path": "x/demo/kid.mem",
      text: "body",
    };
    const out = expandMemeRefs(reader({ [ROOT]: parent, [`${ROOT}#/kid`]: kid }), ROOT);
    const block = childBlock(out!);
    expect(block).toMatch(/^role = /m);
    expect(block).not.toMatch(/uri-path/);
    expect(block).not.toMatch(/file-path/);
  });
});
