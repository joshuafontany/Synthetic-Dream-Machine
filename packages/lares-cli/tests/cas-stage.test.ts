/**
 * cas-stage.test.ts — the send-side proof: a verb rides a REFERENCE, never a body.
 *
 * `stageBodyToCas` writes the carrier body to the corpus CAS (LAR_CAS) keyed by its
 * content-address (hex sha256 of utf8 bytes) and returns that skinny cid. The daemon
 * worker reads the SAME dir back via `resolveByCid` and re-verifies the hash. Here we
 * prove: the cid IS the content-address, the blob lands on disk, and it round-trips.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

const CAS = mkdtempSync(join(tmpdir(), "lr-cas-"));
let stageBodyToCas: (text: string) => string;

beforeAll(async () => {
  process.env["LAR_CAS"] = CAS;           // larCasDir() reads LAR_CAS first
  ({ stageBodyToCas } = await import("../src/cas-stage.js"));
});
afterAll(() => { rmSync(CAS, { recursive: true, force: true }); delete process.env["LAR_CAS"]; });

const cidOf = (s: string) => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

describe("stageBodyToCas — body → corpus CAS, cid handle out", () => {
  test("a large body stages to LAR_CAS keyed by its content-address; the cid is skinny", () => {
    const body = "Roughing It — a very long chapter.\n".repeat(120_000);
    expect(body.length).toBeGreaterThan(4_000_000);

    const cid = stageBodyToCas(body);

    // The returned handle is the content-address — 64 hex chars, tiny, NOT the body.
    expect(cid).toBe(cidOf(body));
    expect(cid).toMatch(/^[0-9a-f]{64}$/);
    expect(cid.length).toBeLessThan(128);

    // The body landed on disk at <LAR_CAS>/<cid> — the dir the worker's resolveByCid reads.
    const path = join(CAS, cid);
    expect(existsSync(path)).toBe(true);
    // Round-trip: the resolved bytes utf8-decode back to the exact body string.
    expect(readFileSync(path, "utf8")).toBe(body);
  });

  test("idempotent: staging the same body twice mints the same cid, no duplicate write", () => {
    const body = "identical corpus";
    expect(stageBodyToCas(body)).toBe(stageBodyToCas(body));
  });
});
