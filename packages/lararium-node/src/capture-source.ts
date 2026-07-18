/**
 * capture-source — the daemon's pointer-only bridge to the Python session
 * capture holder. This AI-session bridge carries source descriptors, never
 * session turns: Python owns parsing, CID derivation, embedding, landing, and
 * worldlines. It states no daemon-wide payload rule. Node and browser TW5
 * workers may compose other sensorium caps for their own admitted streams.
 */

import { spawn } from "node:child_process";

import { resolveCaptureSessionSpawn, resolveComputeCapEnv } from "@lararium/mempalace";

import { composePalace, type PalaceHolderProc, type PalaceHolderSpawn } from "./palace-holder.js";

const LABEL = "capture-source";

export interface SourceCaptureRequest {
  readonly surface: "claude" | "codex" | "copilot" | "copilot-vscode";
  readonly pointer: string;
  readonly wing: string;
  readonly room?: string;
  /** Narrow a global Copilot SQLite store to the session that just ended. */
  readonly sessionId?: string;
}

const AI_SESSION_SURFACES = new Set<SourceCaptureRequest["surface"]>([
  "claude", "codex", "copilot", "copilot-vscode",
]);

/**
 * The AI-session admission cut: this Python bridge carries a source descriptor,
 * never session text. Other daemon sensorium caps may carry their own admitted
 * inputs, including non-session telemetry. Projecting instead of spreading
 * protects this wire from untyped callers that attach extra fields at runtime.
 */
export function sourceCaptureDescriptor(request: SourceCaptureRequest): Record<string, unknown> {
  const { surface, pointer, wing, room, sessionId } = request;
  if (!AI_SESSION_SURFACES.has(surface)) throw new Error("capture-source: surface must name a supported AI session source");
  if (typeof pointer !== "string" || !pointer || typeof wing !== "string" || !wing) {
    throw new Error("capture-source: pointer and wing must carry non-empty strings");
  }
  if (room !== undefined && (typeof room !== "string" || !room)) {
    throw new Error("capture-source: room must carry a non-empty string when named");
  }
  if (sessionId !== undefined && (typeof sessionId !== "string" || !sessionId)) {
    throw new Error("capture-source: sessionId must carry a non-empty string when named");
  }
  return {
    surface,
    pointer,
    wing,
    ...(room !== undefined ? { room } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  };
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
  /** Re-pave the in-tree mempalace projection over the content plane, on the SAME serialized pipe — so a
   *  refresh queues between capture passes and never races the writer (a second store connection would). */
  refresh(request: { query?: string; k?: number; allStrata?: boolean }): Promise<Record<string, unknown>>;
  /** Read the landed rejim (rhythm/geology) plane — the derived regimes made askable, or an honest absence
   *  when the plane has never been repoured. Rides the same serialized pipe. */
  readRejim(request?: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** Re-derive the rejim plane over the content the holder already owns — the heavy whole-stream repour,
   *  queued between capture passes so it never races the writer. */
  repourRejim(request?: { channel?: string; nSurrogates?: number }): Promise<Record<string, unknown>>;
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
    capture: async (request) => await p.send("capture", sourceCaptureDescriptor(request)) as SourceCaptureResult,
    // A refresh carries no session text — only the projection knobs — so it needs no admission descriptor;
    // the holder re-derives the view from the content it already owns.
    refresh: async (request) => await p.send("refresh", { ...request }) as Record<string, unknown>,
    // The rejim (rhythm/geology) DERIVED plane: read the landed geology, or re-derive it over the content
    // the holder already owns — both ride the pipe (queue between capture passes, never race the writer).
    readRejim: async (request) => await p.send("read_rejim", { ...(request ?? {}) }) as Record<string, unknown>,
    repourRejim: async (request) => await p.send("repour_rejim", { ...(request ?? {}) }) as Record<string, unknown>,
    close: p.close,
  };
}
