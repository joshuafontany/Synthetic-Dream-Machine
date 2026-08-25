/**
 * AN UNKNOWN NAME REFUSES — WITH OR WITHOUT `--help`.
 *
 * The vessel collapse retired fourteen spellings and keeps no aliases, and its own verification reads
 * *no old name answers*. That check is only performable from outside if a name that does not answer
 * REFUSES: routing an unknown command to the global menu returns 0 and prints a full page, which reads
 * exactly like a door that opened.
 *
 * Measured before this test existed: a probe of `lares wake --help` reported four retired verbs as
 * ANSWERING, because `--help` on a name outside the table fell through to the global-help branch. The
 * control — a nonsense verb — printed the identical page and exited 0, which is what named the defect.
 * So the control rides here beside the retired spellings: without it, this file could pass against a
 * binary that answers everything.
 */
import { describe, test, expect, vi, afterEach } from "vitest";
import { dispatch } from "../src/bin/lares.js";

/** Every spelling the vessel collapse retired, plus a name that never existed. */
const RETIRED = [
  "init", "wake", "serve", "dev", "reset", "fresh", "reconcile",
  "refresh", "rebuild", "build-genesis", "regenesis", "status", "node",
] as const;
const CONTROL = "zzz-not-a-verb";

afterEach(() => vi.restoreAllMocks());

const quiet = (): void => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
};

describe("the unknown-command refusal", () => {
  test("★ every retired spelling refuses, bare ★", async () => {
    quiet();
    for (const name of RETIRED) {
      expect(await dispatch([name]), `${name} answered`).toBe(2);
    }
  });

  test("★ every retired spelling refuses under --help too ★", async () => {
    quiet();
    for (const name of RETIRED) {
      expect(await dispatch([name, "--help"]), `${name} --help answered`).toBe(2);
    }
  });

  test("the control proves the refusal is real, not a binary that refuses everything", async () => {
    quiet();
    expect(await dispatch([CONTROL])).toBe(2);
    expect(await dispatch([CONTROL, "--help"])).toBe(2);
    // A live door under `--help` renders its own help and returns 0 — the other side of the same gate.
    expect(await dispatch(["vessel", "--help"])).toBe(0);
  });
});
