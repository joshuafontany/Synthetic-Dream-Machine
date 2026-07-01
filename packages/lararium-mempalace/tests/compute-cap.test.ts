/**
 * compute-cap — the OPTIONAL GPU cap composes when present, degrades to a bare device hint when
 * absent. The SAME nameless sidecars stand at both scales (this card box + the QA-lab box).
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { resolveComputeCapEnv, detectCudaLibDirs, hasGpuComputeCap, _resetComputeCapCache } from "../src/compute-cap.js";

const savedDevice = process.env["MEMPALACE_EMBEDDING_DEVICE"];
const savedLd = process.env["LD_LIBRARY_PATH"];

beforeEach(() => {
  _resetComputeCapCache();
  delete process.env["MEMPALACE_EMBEDDING_DEVICE"];
});

afterEach(() => {
  _resetComputeCapCache();
  if (savedDevice === undefined) delete process.env["MEMPALACE_EMBEDDING_DEVICE"]; else process.env["MEMPALACE_EMBEDDING_DEVICE"] = savedDevice;
  if (savedLd === undefined) delete process.env["LD_LIBRARY_PATH"]; else process.env["LD_LIBRARY_PATH"] = savedLd;
});

describe("resolveComputeCapEnv — the cap composes or degrades", () => {
  test("no python ⇒ no CUDA libs, only the device hint (the card-less path)", () => {
    expect(detectCudaLibDirs(null)).toEqual([]);
    _resetComputeCapCache();
    const env = resolveComputeCapEnv(null);
    expect(env["LD_LIBRARY_PATH"]).toBeUndefined(); // no lib path when no card
    expect(env["MEMPALACE_EMBEDDING_DEVICE"]).toBe("auto"); // auto = cuda-if-present-else-cpu
  });

  test("an operator-pinned device is HONORED, never overridden", () => {
    process.env["MEMPALACE_EMBEDDING_DEVICE"] = "cpu";
    const env = resolveComputeCapEnv(null);
    expect(env["MEMPALACE_EMBEDDING_DEVICE"]).toBeUndefined(); // already set → we don't touch it
  });

  test("hasGpuComputeCap is a boolean probe, false without a python", () => {
    expect(hasGpuComputeCap(null)).toBe(false);
  });

  test("a bad python path probes to [] (cap simply absent, never a throw)", () => {
    expect(detectCudaLibDirs("/nonexistent/python-xyz")).toEqual([]);
    _resetComputeCapCache();
    expect(() => resolveComputeCapEnv("/nonexistent/python-xyz")).not.toThrow();
  });
});
