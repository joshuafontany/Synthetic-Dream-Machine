/**
 * mcp-resolve — resolve the LARES MCP seat the harness-wire modules register, plus the shared
 * WireAction vocabulary.
 *
 * `lares` used to register the *mempalace* MCP into every harness. That was the bug: Chroma tolerates
 * one writer on a palace, and a harness holding its own sidecar reaches PAST the node into the store
 * directly — so N sessions meant N writers on one index, the contention that truncated the HNSW
 * segment and forced a drift-quarantine. The python holders enforce a flock singleton per palace dir,
 * which makes the collision loud but does not prevent it.
 *
 * The cure is not a better lock; it is one owner. Harnesses now register the LARES surface
 * (`lares_mcp.py` — FastMCP over the memory sensorium: recall · recall_structure · recall_form ·
 * plane_record · harvest · status · worldline · kapae · un_kapae), which reaches memory through the
 * lares house. The guest `~/.mempalace` keeps no seat here at all; it is raised deliberately
 * (`lares mempalace setup`) and imported FROM (`guest-import.ts`), never bound into.
 *
 * `reaped` / `absent` carry the strangler: each wire leg REMOVES a stale mempalace registration
 * beside registering the lares one, so a host an older wiring touched heals on the next wake.
 */

import { existsSync } from "node:fs";
import { resolveLaresMcpSpawn } from "@lararium/mempalace";
import { memorySensoriumDir } from "@lararium/node";

export type WireAction = "wired" | "present" | "missing-script" | "reaped" | "absent";

/** The resolved MCP server command a harness config records: argv + the env its import needs. */
export interface LaresMcpCommand {
  readonly command: string;
  readonly args: string[];
  readonly env: Record<string, string>;
}

/**
 * Resolve the `lares` MCP server invocation, or null when the pieces are not on disk (no python, no
 * script — `lares wake --install` lays them down).
 *
 * ABSOLUTE by construction: a harness spawns this with no venv active and no cwd guarantee, so the
 * interpreter, the script and the palace all resolve to full paths, and PYTHONPATH carries the
 * mempalace submodule so `import mempalace` resolves from anywhere (the sensorium consumes it as a
 * LIBRARY — that dependency stays, it is only the guest STORE that was demoted).
 */
export function resolveLaresMcp(): LaresMcpCommand | null {
  const { python, script, submoduleRoot, scriptPresent } = resolveLaresMcpSpawn();
  if (python === null || !scriptPresent) return null;
  const palace = memorySensoriumDir();
  if (!existsSync(palace)) return null; // no sensorium stood yet — `lares wake --init` stands it
  return {
    command: python,
    args: [script, "--palace", palace],
    env: { PYTHONPATH: submoduleRoot },
  };
}
