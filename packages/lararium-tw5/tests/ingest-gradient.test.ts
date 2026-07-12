/**
 * The gate carries a gradient.
 *
 * The membrane refuses only where a carrier stops round-tripping, since that alone loses the
 * operator's bytes. A recovery keeps them: the driver stands the text back up and grades how far
 * it fell. So every decision the gate returns now carries the parser's diagnostics as a receipt,
 * and a caller reads the grade rather than a synthesised tiddler title.
 *
 * Speaks only through decideIngest — the meme-ast surface stays behind the gate (vm-grammar-boundary).
 */

import { describe, test, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideIngest } from "../src/ingest-gate.js";

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const BOOT = join(REPO_ROOT, "bags/@lares/ha.ka.ba/lares/api/lares/noosphere-boot.mem");
const URI  = "lar:///ha.ka.ba/lares/api/lares/noosphere-boot";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const source = readFileSync(BOOT, "utf8");

function gate(diskText: string) {
  return decideIngest({
    uri:               URI,
    diskText,
    diskHash:          sha(diskText),
    syncedHash:        null,
    currentRenderHash: "unmatched",
    hash:              sha,
  });
}

describe("the ingest gate carries the gradient", () => {
  test("a carrier that round-trips ingests, and carries its diagnostics", () => {
    const decision = gate(source);
    expect(decision.kind).toBe("ingest");
    if (decision.kind === "ingest") {
      expect(Array.isArray(decision.diagnostics)).toBe(true);
    }
  });

  test("a recovery never refuses the carrier, since the bytes survive it", () => {
    // An unclosed sigil the driver recovers: the text stands, the grade falls.
    const decision = gate(source + "\n<<~ ahu #dangling >>\n");
    expect(decision.kind).not.toBe("refuse");
  });

  test("each diagnostic lands inside the source and on the closed severity ladder", () => {
    const decision = gate(source + "\n<<~ ahu #dangling >>\n");
    const diagnostics = decision.kind === "noop" ? [] : decision.diagnostics;
    for (const diagnostic of diagnostics) {
      expect(diagnostic.from).toBeGreaterThanOrEqual(0);
      expect(diagnostic.to).toBeGreaterThanOrEqual(diagnostic.from);
      expect(["error", "warning", "info", "hint"]).toContain(diagnostic.severity);
      expect(diagnostic.source).toBe("text/x-memetic-wikitext");
      expect(typeof diagnostic.code).toBe("string");
    }
  });
});
