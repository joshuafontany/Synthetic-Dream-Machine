/**
 * recall-holder — the daemon's client for the sovereign RECALL holder (`recall_session.py --serve`).
 *
 * Coordinator-only: this sends the query + read args and awaits the answer; the holder (the ONE Python
 * `LaresCoordinator`) owns all the machine-code — embed, search, RRF-fuse, #has-compose. It is a READ
 * holder with its OWN lock-prefix (distinct from the capture WRITE holder), so a concurrent re-pour never
 * blocks a recall. Both the MCP surface and this daemon-routed pipe drive the SAME coordinator — one
 * verb-router, thin skins, the guest mempalace client nowhere in the sovereign path.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolveCaptureSessionSpawn, resolveSidecarCapEnv } from "@lararium/mempalace";
import { composePalace, type PalaceHolderProc, type PalaceHolderSpawn } from "./sensorium.js";

const LABEL = "recall-holder";

export interface RecallHolder {
  /** Combined-arms recall (query → fused hits · drawer → verbatim · list → taxonomy) over the sensorium. */
  recall(req: Record<string, unknown>): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

function defaultSpawn(sensoriumRoot: string): PalaceHolderSpawn {
  return (_holderPalace: string): PalaceHolderProc => {
    const { python, script: captureScript, submoduleRoot } = resolveCaptureSessionSpawn();
    if (!python) throw new Error("no python holds the sensorium — run `lares wake --install`");
    // recall_session.py sits BESIDE capture_session.py in the sensorium scripts dir.
    const script = captureScript.replace(/capture_session\.py$/, "recall_session.py");
    if (!existsSync(script)) throw new Error(`recall-session helper missing at ${script}`);
    const env = {
      ...process.env,
      PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""),
      ...resolveSidecarCapEnv(python),
    };
    return spawn(python, [script, "--serve", "--sensorium", sensoriumRoot], {
      cwd: submoduleRoot, env, stdio: ["pipe", "pipe", "pipe"],
    }) as unknown as PalaceHolderProc;
  };
}

/** Open the one serialized Python recall pipe for a sensorium root (content/ + mempalace/ derive beneath). */
export function makeRecallHolder(
  sensoriumRoot: string,
  opts: { readonly timeoutMs?: number; readonly spawn?: PalaceHolderSpawn } = {},
): RecallHolder {
  const p = composePalace(LABEL, sensoriumRoot, opts.spawn ?? defaultSpawn(sensoriumRoot), opts.timeoutMs ?? 120_000);
  return {
    recall: async (req) => (await p.send("recall", { ...req })) as Record<string, unknown>,
    close: p.close,
  };
}
