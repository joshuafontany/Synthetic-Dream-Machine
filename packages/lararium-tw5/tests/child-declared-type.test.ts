/**
 * Child declared type (regression guard) — a child slot that declares its OWN meta `type`
 * (e.g. text/markdown) keeps it through deserialization; an undeclared child defaults to
 * the memetic dialect. Guards the clobber where a hardcoded memetic `type` spread AFTER the
 * parsed meta fields erased a child's declared type.
 */
import { describe, expect, test } from "vitest";

import { splitBodyTiddler } from "../src/deserializer.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import type { TiddlerFields } from "../src/deserializer.js";

const ROOT = "lar:///ha.ka.ba/x/demo";
const base: TiddlerFields = { type: CARRIER_TYPE };

/**
 * A child addresses as a ROOTED PATH — `#/name`, `#/parent/child` — so a suffix written `#name`
 * names the leaf. The house left the bare fragment space to the anchors a live wiki renders.
 */
function childByTitleEnd(children: TiddlerFields[], suffix: string): TiddlerFields | undefined {
  const leaf = suffix.replace(/^#\/?/, "");
  return children.find((c) => String(c.title).split("#").pop()?.split("/").pop() === leaf);
}

describe("child declared meta type (default-before-spread)", () => {
  test("a child declaring type = text/markdown KEEPS it", () => {
    const body = [
      "<<~ ahu #source-text>>",
      "",
      "```toml meta",
      'type = "text/markdown"',
      'role = "source-text interior"',
      "```",
      "",
      "plain prose, no sigils",
      "",
      "<<~/ahu>>",
    ].join("\n");
    const { children } = splitBodyTiddler(ROOT, body, base);
    const kid = childByTitleEnd(children, "#source-text");
    expect(kid).toBeDefined();
    expect(kid!.type).toBe("text/markdown");   // declared, no longer clobbered
    expect(kid!.role).toBe("source-text interior");
  });

  test("an undeclared child DEFAULTS to memetic-wikitext", () => {
    const body = "<<~ ahu #plain>>\n\nplain body\n\n<<~/ahu>>";
    const { children } = splitBodyTiddler(ROOT, body, base);
    const kid = childByTitleEnd(children, "#plain");
    expect(kid).toBeDefined();
    expect(kid!.type).toBe(CARRIER_TYPE);
  });
});
