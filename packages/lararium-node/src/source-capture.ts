/**
 * source-capture — the daemon's pointer-only bridge to the Python session
 * capture holder. The bridge carries source descriptors, never session turns:
 * Python owns parsing, CID derivation, embedding, landing, and worldlines.
 */

import { spawn } from "node:child_process";

import { resolveCaptureSessionSpawn, resolveComputeCapEnv } from "@lararium/mempalace";

import { composePalace, type PalaceHolderProc, type PalaceHolderSpawn } from "./palace-holder.js";

const LABEL = "source-capture";

export interface SourceCaptureRequest {
  readonly surface: "claude" | "codex" | "copilot" | "copilot-vscode";
  readonly pointer: string;
  readonly wing: string;
  readonly room?: string;
  /** Narrow a global Copilot SQLite store to the session that just ended. */
  readonly sessionId?: string;
}

export interface SourceCaptureResult {
  readonly landed: number;
  readonly skipped: number;
  readonly failed: readonly unknown[];
  readonly watermark: number;
  readonly backlog: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface SourceCapture {
  capture(request: SourceCaptureRequest): Promise<SourceCaptureResult>;
  close(): Promise<void>;
}

export type SourceCaptureSpawn = PalaceHolderSpawn;

function defaultSpawn(sensoriumRoot: string): SourceCaptureSpawn {
  return (_holderPalace: string): PalaceHolderProc => {
    const { python, script, submoduleRoot, scriptPresent } = resolveCaptureSessionSpawn();
    if (!python) throw new Error("no python holds mempalace — run `lares wake --install`");
    if (!scriptPresent) throw new Error(`capture-session helper missing at ${script}`);
    const env = {
      ...process.env,
      PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""),
      ...resolveComputeCapEnv(python),
    };
    return spawn(python, [script, "--serve", "--sensorium", sensoriumRoot], {
      cwd: submoduleRoot, env, stdio: ["pipe", "pipe", "pipe"],
    }) as unknown as PalaceHolderProc;
  };
}

/** Open the one serialized Python capture pipe for a rooted stream sensorium. */
export function makeSourceCapture(
  sensoriumRoot: string,
  opts: { readonly timeoutMs?: number; readonly spawn?: SourceCaptureSpawn } = {},
): SourceCapture {
  const p = composePalace(LABEL, sensoriumRoot, opts.spawn ?? defaultSpawn(sensoriumRoot), opts.timeoutMs ?? 120_000);
  return {
    capture: async (request) => await p.send("capture", { ...request }) as SourceCaptureResult,
    close: p.close,
  };
}
