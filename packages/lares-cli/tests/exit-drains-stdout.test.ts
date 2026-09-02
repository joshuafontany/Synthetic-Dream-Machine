/**
 * exit-drains-stdout — the CLI must not discard its own answer on the way out.
 *
 * ── THE DEFECT THIS HOLDS SHUT ──────────────────────────────────────────────────────────────────
 * `process.stdout` is ASYNCHRONOUS on a pipe and synchronous on a file. `process.exit()` returns
 * immediately and drops whatever has not drained, so a large result survives `> file` and truncates
 * through `| pipe` — silently, mid-string, with exit code 0.
 *
 * Measured on a real 2,718-record `--json` result: 165,256 bytes into a file, 146,176 through a pipe,
 * `SyntaxError: Unterminated string`. The isolated shape truncates at exactly one pipe buffer: 400,021
 * bytes to a file, 65,536 through a pipe.
 *
 * `--json` exists, in this CLI's own help, "for agents/pipes" — the one sink that loses bytes. Every
 * agent reading this CLI through a pipe was reading a possibly-truncated answer.
 *
 * ── WHY A SOURCE GUARD RATHER THAN A LIVE PIPE ──────────────────────────────────────────────────
 * Reproducing it end-to-end needs a command whose JSON exceeds a pipe buffer, which needs a fed
 * vessel and a daemon — a ten-minute suite for a one-line property. The property is structural, so
 * this reads the BUILT entry point and holds the shape there. It runs in milliseconds and rides
 * `pnpm -r test`, where the e2e harness that first caught this deliberately does not.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILT = join(HERE, "..", "dist", "src", "bin", "lares.js");

/** The `runCli` body as the build emits it — the shape a pipe actually runs. */
function runCliBody(): string {
  const src = readFileSync(BUILT, "utf8");
  const at = src.indexOf("function runCli");
  expect(at, "runCli not found in the built entry point").toBeGreaterThan(-1);
  return src.slice(at, at + 600);
}

describe("the CLI sets its exit code and lets stdout drain", () => {
  it("★ the build exists — a source guard over a missing build proves nothing ★", () => {
    expect(existsSync(BUILT), `build first: ${BUILT}`).toBe(true);
  });

  it("★ runCli sets `exitCode` ★", () => {
    expect(runCliBody()).toMatch(/exitCode\s*=/);
  });

  it("★ runCli does NOT call process.exit — that is the byte-dropping call ★", () => {
    // The whole defect in one assertion. `process.exit()` here discards the undrained tail.
    expect(runCliBody()).not.toMatch(/process\.exit\s*\(/);
  });

  it("★ the failure path also sets a code rather than exiting ★", () => {
    const body = runCliBody();
    expect(body).toMatch(/console\.error/);
    expect(body).not.toMatch(/process\.exit\s*\(\s*1\s*\)/);
  });
});
