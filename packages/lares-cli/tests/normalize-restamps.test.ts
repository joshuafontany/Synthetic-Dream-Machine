/**
 * normalize re-stamps — the door leaves no carrier holding a check its body does not match.
 *
 * THE GAP THIS CLOSES. `normalize` canonicalizes framing, and framing rides INSIDE the span the block
 * check covers. A door that rewrote the framing and left the old check standing reported `canonical`
 * on a carrier it had just made non-canonical — and `--check`, the form a CI gate runs, exited 0 on it.
 * Any sweep that edits carrier bodies then normalizes hits the same silence.
 *
 * MEASURED THROUGH THE BUILT BINARY, not the function. The fault lived in what the command composed,
 * not in `bccOf`, which was correct the whole time and agreed with nothing that called it. A unit test
 * over the helper passes on the broken door.
 */
import { describe, test, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { verifyBcc } from "@lararium/tw5";

const REPO = path.resolve(new URL("../../..", import.meta.url).pathname);
const BIN = path.join(REPO, "packages/lares-cli/dist/src/bin/lares.js");
/** A real carrier, so the fixture carries every mark the door reads rather than a hand-built stub. */
const SOURCE = path.join(REPO, "bags/lares/ha.ka.ba/lares/api/pono/prism.mem");

function normalize(file: string, ...flags: string[]): { out: string; code: number } {
  try {
    return { out: execFileSync("node", [BIN, "carrier", "normalize", ...flags, file], { encoding: "utf8" }), code: 0 };
  } catch (e) {
    const err = e as { stdout?: string; status?: number };
    return { out: err.stdout ?? "", code: err.status ?? 1 };
  }
}

describe("carrier normalize — the check follows the body", () => {
  let dir: string, file: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "lares-normalize-"));
    file = path.join(dir, "prism.mem");
    copyFileSync(SOURCE, file);
    // Move a byte inside the checked span. The carrier stays well-formed and every other law still
    // holds — only the check now disagrees with what it covers.
    writeFileSync(file, readFileSync(file, "utf8").replace("The node summons it.", "The node summons it, once."));
  });

  test("a staled check reads as drift, and --check fails the gate", () => {
    expect(verifyBcc(readFileSync(file, "utf8"))).toBe("mismatch");
    const { out, code } = normalize(file, "--check");
    expect(out).toMatch(/would re-stamp/);
    expect(code).toBe(1);
    // --check writes NOTHING: the carrier it reported on is the carrier still on disk.
    expect(verifyBcc(readFileSync(file, "utf8"))).toBe("mismatch");
  });

  test("normalize leaves the check matching the body it follows", () => {
    normalize(file);
    expect(verifyBcc(readFileSync(file, "utf8"))).toBe("ok");
  });

  test("a normalized carrier reads canonical, and the gesture repeats clean", () => {
    const { out, code } = normalize(file, "--check");
    expect(out).toMatch(/canonical/);
    expect(code).toBe(0);
  });

  test("an unchecked carrier is never given a check it did not claim", () => {
    // `unchecked` and `mismatch` are different facts. Minting one here would fuse them and hand a
    // carrier a provenance mark nobody wrote.
    const bare = path.join(dir, "bare.mem");
    writeFileSync(bare, "plain text, no frame, no check\n");
    normalize(bare);
    expect(readFileSync(bare, "utf8")).not.toMatch(/ni:\/\/\//);
  });
});
