/**
 * compute-cap — the OPTIONAL GPU compute cap for the multipalace, resolved-never-ambient.
 *
 * The content embedder (mempalace's all-MiniLM / embeddinggemma, ONNX) and the torch sidecars
 * run FAR faster on an NVIDIA card — but a card is a CAP the box #has, never a dependency. This
 * box (an RTX 2070 Super) composes it; the QA-lab lararium (a separate, card-less box) does not.
 * The SAME nameless sidecars stand at both scales; only the resolved env differs.
 *
 * TWO env facets compose the cap:
 *   1. `LD_LIBRARY_PATH` — onnxruntime-gpu HARD-fails to import without the CUDA runtime libs
 *      (`libcudart.so.NN`, cuDNN) on the loader path. torch's pip wheels already ship them under
 *      `<venv>/…/site-packages/nvidia/<pkg>/lib`; we detect those dirs and prepend them. Absent (no
 *      nvidia wheels ⇒ the QA box) we add nothing — plain onnxruntime (CPU) needs no lib path.
 *   2. `MEMPALACE_EMBEDDING_DEVICE=auto` — mempalace's embedder resolver reads this: `auto` prefers
 *      CUDA ▸ CoreML ▸ DirectML ▸ CPU and DEGRADES to CPU when no accelerator compiles in. So
 *      `auto` IS the cap — cuda on a card, cpu on the QA box — one value, both scales. An operator
 *      override (a pre-set env) always wins.
 *
 * The cap is OPTIONAL + graceful: no CUDA libs detected ⇒ only the device hint rides, and the
 * embedder falls to CPU on its own. Nothing here installs or requires onnxruntime-gpu; it merely
 * makes an already-present card reachable.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

let _cudaLibDirs: string[] | undefined;

/**
 * The CUDA runtime lib dirs the interpreter can see (torch's bundled `nvidia/<pkg>/lib` wheels that
 * hold `libcud*.so*`), or [] when none — the card-less box. Asks Python directly (authoritative
 * about its own site-packages), cached for the process. A probe failure ⇒ [] (cap simply absent).
 */
export function detectCudaLibDirs(python: string | null): string[] {
  if (_cudaLibDirs !== undefined) return _cudaLibDirs;
  if (!python) return (_cudaLibDirs = []);
  // `nvidia` is a PEP-420 NAMESPACE package (torch's cu-wheels each drop a `nvidia/<pkg>/`
  // subdir), so `__file__` is None — walk `__path__` (the list of namespace roots) instead.
  const probe =
    "import glob,os,sys\n" +
    "try:\n import nvidia; bases=list(getattr(nvidia,'__path__',[]) or [])\n" +
    "except Exception: sys.exit(0)\n" +
    "dirs=set()\n" +
    "for b in bases:\n" +
    " for p in glob.glob(os.path.join(b,'*','lib','libcud*.so*')): dirs.add(os.path.dirname(p))\n" +
    "print('\\n'.join(sorted(dirs)))";
  try {
    const r = spawnSync(python, ["-c", probe], { timeout: 10_000, encoding: "utf8" });
    if (r.status !== 0 || !r.stdout) return (_cudaLibDirs = []);
    _cudaLibDirs = r.stdout.trim().split(/\r?\n/).map((s) => s.trim()).filter((s) => s && existsSync(s));
  } catch {
    _cudaLibDirs = [];
  }
  return _cudaLibDirs;
}

/**
 * The env additions that compose the GPU compute cap for a python sidecar spawn. Merge onto the
 * base spawn env. Empty of a device hint only if the operator already pinned one; empty of
 * `LD_LIBRARY_PATH` when no CUDA libs are present (the QA box).
 */
export function resolveComputeCapEnv(python: string | null): Record<string, string> {
  const env: Record<string, string> = {};
  const dirs = detectCudaLibDirs(python);
  if (dirs.length > 0) {
    const existing = process.env["LD_LIBRARY_PATH"];
    env["LD_LIBRARY_PATH"] = [...dirs, ...(existing ? [existing] : [])].join(":");
  }
  // The device cap: honor an operator override, else request `auto` (cuda-if-present-else-cpu).
  if (!process.env["MEMPALACE_EMBEDDING_DEVICE"]) env["MEMPALACE_EMBEDDING_DEVICE"] = "auto";
  return env;
}

/** True when this box composes the GPU cap (CUDA libs reachable). For status/HUD surfaces. */
export function hasGpuComputeCap(python: string | null): boolean {
  return detectCudaLibDirs(python).length > 0;
}

/** Test shore: drop the cached probe so a test can re-resolve. */
export function _resetComputeCapCache(): void {
  _cudaLibDirs = undefined;
}
