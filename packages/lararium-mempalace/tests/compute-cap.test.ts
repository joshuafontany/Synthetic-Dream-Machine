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
 * Restart-safety (P0) — the DURABLE @daemon sidecars (drawer_io · structurepalace_io · form_encoder ·
 * kg_io · the read recall MCP client) each open a chroma collection that builds the default
 * onnxruntime embedder. The premise CHANGED: the GPU `ld.so.conf` + `onnxruntime-gpu` now put the CUDA
 * runtime on the SYSTEM linker path, so a BARE `import onnxruntime` — the exact path a cold daemon
 * restart hits — now RESOLVES by construction, no cap-env help needed. (Historically the bare import
 * HARD-failed on `libcudart.so.NN` off the loader path; that state is gone.) These cases assert the
 * current robust state — GUARDED behind the GPU cap's presence, so the card-less QA box (CPU wheel)
 * skips cleanly.
 */
describe("restart-safety — the durable spawn env imports onnxruntime cleanly", () => {
  const py = resolveMempalacePython();
  const capPresent = hasGpuComputeCap(py);

  test.runIf(capPresent && !!py)("the spawn env carries a CUDA cap-LD dir (torch's nvidia/*/lib)", () => {
    const env = resolveComputeCapEnv(py);
    expect(env["LD_LIBRARY_PATH"]).toBeDefined();
    expect(env["LD_LIBRARY_PATH"]).toMatch(/nvidia[/\\][^:]*[/\\]lib/);
  });

  test.runIf(capPresent && !!py)("bare `import onnxruntime` now SUCCEEDS — CUDA on the system linker path, restart-safe by construction", () => {
    // BARE (no cap-env): withoutCapLd strips any nvidia/*/lib from LD_LIBRARY_PATH, so the ONLY way the
    // CUDA runtime resolves is the SYSTEM linker path (the GPU ld.so.conf). This proves the bare import
    // — the cold-restart path — is robust by construction, not by an LD_LIBRARY_PATH cap-env hand-hold.
    const bare = spawnSync(
      py!,
      ["-c", "import onnxruntime as o; print(','.join(o.get_available_providers()))"],
      { encoding: "utf8", env: withoutCapLd(process.env) },
    );
    expect(bare.status).toBe(0);
    expect(bare.stdout).toMatch(/CUDAExecutionProvider/); // the GPU provider lists off the system linker path
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
