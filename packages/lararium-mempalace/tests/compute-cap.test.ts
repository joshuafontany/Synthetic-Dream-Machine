/**
 * compute-cap — the OPTIONAL GPU cap composes when present, degrades to a bare device hint when
 * absent. The SAME nameless sidecars stand at both scales (this card box + the QA-lab box).
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { resolveComputeCapEnv, detectCudaLibDirs, hasGpuComputeCap, _resetComputeCapCache } from "../src/compute-cap.js";
import { resolveMempalacePython } from "../src/spawn-resolve.js";

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

/**
 * Restart-safety (P0) — the DURABLE @daemon sidecars (drawer_io · astpalace_io · form_encoder ·
 * kg_io · the read recall MCP client) each open a chroma collection that builds the default
 * onnxruntime embedder. When onnxruntime-GPU is installed, a BARE `import onnxruntime` HARD-fails
 * (`libcudart.so.NN` off the loader path), so a cold daemon restart would break durable recall. The
 * cap-env (resolveComputeCapEnv, threaded through EVERY durable spawn membrane) puts the CUDA runtime
 * libs on LD_LIBRARY_PATH. This proves the spawn env carries the cap AND that a would-fail import now
 * succeeds — GUARDED behind the cap's presence, so the card-less QA box (CPU wheel) skips cleanly.
 */
describe("restart-safety — the durable spawn env imports onnxruntime cleanly", () => {
  const py = resolveMempalacePython();
  const capPresent = hasGpuComputeCap(py);

  test.runIf(capPresent && !!py)("the spawn env carries a CUDA cap-LD dir (torch's nvidia/*/lib)", () => {
    const env = resolveComputeCapEnv(py);
    expect(env["LD_LIBRARY_PATH"]).toBeDefined();
    expect(env["LD_LIBRARY_PATH"]).toMatch(/nvidia[/\\][^:]*[/\\]lib/);
  });

  test.runIf(capPresent && !!py)("bare `import onnxruntime` FAILS but the capped durable-spawn env SUCCEEDS", () => {
    // BARE: the exact fault a cold daemon restart would hit — onnxruntime-gpu without the CUDA libs.
    const bare = spawnSync(py!, ["-c", "import onnxruntime"], { encoding: "utf8", env: withoutCapLd(process.env) });
    expect(bare.status).not.toBe(0);
    expect(bare.stderr).toMatch(/libcud|onnxruntime_pybind11_state|ImportError/i);

    // CAPPED: the SAME env the durable sidecars now spawn with — the import resolves + a provider lists.
    const capped = spawnSync(
      py!,
      ["-c", "import onnxruntime as o; print(','.join(o.get_available_providers()))"],
      { encoding: "utf8", env: { ...withoutCapLd(process.env), ...resolveComputeCapEnv(py) } },
    );
    expect(capped.status).toBe(0);
    expect(capped.stdout).toMatch(/ExecutionProvider/); // CUDA on a card, CPU on the QA box — either way it imports
  });
});

/** Strip any inherited CUDA-lib LD path so the "bare" leg reproduces a clean-shell restart. */
function withoutCapLd(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...base };
  const ld = env["LD_LIBRARY_PATH"];
  if (ld) {
    const kept = ld.split(":").filter((d) => d && !/nvidia[/\\][^:]*[/\\]lib/.test(d));
    if (kept.length) env["LD_LIBRARY_PATH"] = kept.join(":"); else delete env["LD_LIBRARY_PATH"];
  }
  return env;
}
