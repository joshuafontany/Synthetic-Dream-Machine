/**
 * mcp-resolve — resolve the LARES MCP seat the harness-wire modules register, plus the shared
 * WireAction vocabulary.
 *
 * A harness reaches memory through the LARES surface (`lares_mcp.py` — FastMCP over the memory
 * sensorium: recall · recall_structure · recall_form · plane_record · harvest · status · worldline ·
 * kapae · un_kapae), and that surface holds NO STORE: every verb rides the @daemon cap-wire
 * (`lares_uds.py`) to the one process that owns the palace holders.
 *
 * MCP speaks stdio-per-client, so N sessions run N of these processes. A surface that opened a chroma
 * client would therefore put N unsynchronized writers on one index — and no lock cures that, because
 * the serve-holders speak NDJSON on raw stdin and answer only their spawning parent. Exactly ONE OWNER
 * holds the palace, and everyone else asks it. All the compute stays py; the @daemon only routes.
 *
 * The guest `~/.mempalace` holds no seat here. An operator raises it deliberately (`lares mempalace
 * setup`) and imports FROM it (`guest-import.ts`); the vessel never binds into it.
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
  if (!existsSync(memorySensoriumDir())) return null; // no sensorium stood — `lares wake --init` stands it
  return {
    command: python,
    args: [script],   // ROUTED: no --palace. The surface opens no store; it speaks to the @daemon.
    env: { PYTHONPATH: submoduleRoot },
  };
}
