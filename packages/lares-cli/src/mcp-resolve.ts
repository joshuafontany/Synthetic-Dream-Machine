/**
 * mcp-resolve — resolve the LARES MCP seat the harness-wire modules register, plus the shared
 * WireAction vocabulary.
 *
 * A harness reaches memory through the LARES surface (`lares_mcp.py` — FastMCP over the memory
 * sensorium: recall · recall_structure · recall_form · plane_record · harvest · status · worldline ·
 * kapae · un_kapae), never by opening a palace of its own. Chroma tolerates one writer per palace, and
 * a harness holding its own sidecar reaches PAST the node into the store — N sessions, N writers, one
 * index. The python holders make that collision loud; only ONE OWNER prevents it.
 *
 * The guest `~/.mempalace` holds no seat here. It is raised deliberately (`lares mempalace setup`) and
 * imported FROM (`guest-import.ts`), never bound into.
 *
 * `reaped` / `absent`: a wire leg removes any mempalace registration it finds beside registering the
 * lares one, so a harness config converges on the one owner whatever state it arrives in.
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
