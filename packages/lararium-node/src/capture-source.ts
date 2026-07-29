/**
 * capture-source — the daemon's pointer-only bridge to the Python session
 * capture holder. This AI-session bridge carries source descriptors, never
 * session turns: Python owns parsing, CID derivation, embedding, landing, and
 * worldlines. It states no daemon-wide payload rule. Node and browser TW5
 * workers may compose other sensorium caps for their own admitted streams.
 */

import { spawn } from "node:child_process";

import { resolveCaptureSessionSpawn, resolveSidecarCapEnv } from "@lararium/mempalace";
import type { SubagentEdgePair } from "@lararium/tw5";

import { composePalace, type PalaceHolderProc, type PalaceHolderSpawn } from "./sensorium.js";

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
  /** BULK backfill — capture/RECAPTURE every discovered transcript through the holder's ONE warm stream (the
   *  same writer live capture uses). `surface` `all` folds claude+codex+copilot; `project`/`limit` narrow.
   *  Idempotent (already-landed turns skip). The routed sweep spine — no second holder, no contention. */
  sweep(request?: { surface?: string; wing?: string; project?: string; limit?: number; room?: string }):
    Promise<Record<string, unknown>>;
  /** RE-DERIVE the sensorium's whole derived layer (rejim · mempalace · worldline) in ONE command, on the
   *  SAME serialized pipe — queues between capture passes, never races the writer. `which` narrows to one. */
  refresh(request?: { which?: string }): Promise<Record<string, unknown>>;
  /** Read the landed rejim (rhythm/geology) plane — the derived regimes made askable, or an honest absence
   *  when the plane has never been repoured. Rides the same serialized pipe. */
  readRejim(request?: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** DETECT-ONLY change-point analysis over the holder's poured content stream — the isomorphic
   *  `sense_analyze` instrument run THROUGH the holder that owns the store, so it reuses the ONE content
   *  handle (never a second client). Read-only: it opens no ground-truth and mutates nothing. Boundaries
   *  report as word indices into the reconstructed stream; `spectral` switches to the embedding-geometry
   *  surface; `halves` sets the Foote kernel widths. Rides the same serialized pipe. */
  analyze(request?: { spectral?: boolean; halves?: string; sample?: number }): Promise<Record<string, unknown>>;
  /** The RHYTHM plane — per-signal multi-scale phase/amplitude decomposition (rhythm_phase.phase_encode) over
   *  an N-signal `rows` matrix → a JSON-safe summary per signal (n, band scales, the dominant band). Stateless
   *  matrix→verdict; the full per-position encoding stays py-side. Rides the serialized pipe. */
  phase(request?: { rows?: number[][]; names?: string[] }): Promise<Record<string, unknown>>;
  /** The R effective-TE coupling reference (coupling.R RTransferEntropy::calc_ete) over an N-signal `rows`
   *  matrix → the directional who-leads-whom edges. The py/R twin of `ki`; stateless matrix→verdict, behind
   *  the causal-island boundary (graceful coupling-skipped when R is absent). Rides the serialized pipe. */
  coupleR(request?: { rows?: number[][]; names?: string[]; shuffles?: number; nboot?: number; seed?: number; alpha?: number }): Promise<Record<string, unknown>>;
  /** The R early-warning plane (ews.R critical-slowing-down forecast) over an N-signal `rows` matrix → the
   *  fired/WATCH/QUIET verdict. Stateless matrix→verdict, behind the causal-island boundary. Rides the pipe. */
  forecast(request?: { rows?: number[][]; window?: number; nsurr?: number; alpha?: number; minbands?: number; seed?: number }): Promise<Record<string, unknown>>;
  /** The taxonomy over the holder's content store — what the sensorium holds. Rides the serialized pipe. */
  status(request?: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** The fork-DAG rhizome (bitemporal AS-OF `asOf`, else the whole history). Read-only over the pipe. */
  worldlineDag(request?: { asOf?: number | null }): Promise<Record<string, unknown>>;
  /** Mute a worldline branch + cascade the mute across the holder's content store (move-not-delete). A
   *  MUTATION, serialized with capture so it never races the live writer. `cascadeUnKapae` restores. */
  cascadeKapae(request: { branch: string; tick: number }): Promise<Record<string, unknown>>;
  /** Restore a muted worldline branch across the holder's content store — the reverse of `cascadeKapae`. */
  cascadeUnKapae(request: { branch: string; tick: number }): Promise<Record<string, unknown>>;
  /** The cross-plane witness: ONE cid → presence across content · structure · form (honest nulls). Read-only. */
  planeRecord(request: { cid: string }): Promise<Record<string, unknown>>;
  /** Derive a session transcript's spawn/handback edge-DAG — the worldline-COMPARE consumer's edge feed. The
   *  CRUNCH lives in python (beside the transcript data); this reads the holder's `subagent-edges` serve-op.
   *  PURE over the transcript (no store touched), but rides the SAME serialized pipe as the rest. */
  subagentEdges(request: { transcript: string }): Promise<readonly SubagentEdgePair[]>;
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
      ...resolveSidecarCapEnv(python),
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
    // The BULK backfill: the holder iterates its OWN discovery through the ONE warm stream. No session text
    // crosses (the holder discovers the pointers itself), only the sweep shape (surface/wing/project/limit).
    sweep: async (request) => await p.send("sweep", { ...(request ?? {}) }) as Record<string, unknown>,
    // A refresh carries no session text — only the optional `which` — so it needs no admission descriptor;
    // the holder RE-DERIVES its whole derived layer (or the one named) from the content it already owns.
    refresh: async (request) => await p.send("refresh", { ...(request ?? {}) }) as Record<string, unknown>,
    // Read the landed rejim (rhythm/geology) plane — the derived regimes made askable. Rides the pipe.
    readRejim: async (request) => await p.send("read_rejim", { ...(request ?? {}) }) as Record<string, unknown>,
    // DETECT-ONLY change-point analysis over the holder's content stream — reuses the holder's ONE content
    // handle (the serve-op passes it into sense_analyze.detect); read-only, mutates nothing. Rides the pipe.
    analyze: async (request) => await p.send("analyze", { ...(request ?? {}) }) as Record<string, unknown>,
    // The RHYTHM plane — rhythm_phase.phase_encode over the passed signal matrix (a JSON-safe summary rides back).
    phase: async (request) => await p.send("phase", { ...(request ?? {}) }) as Record<string, unknown>,

    // The R effective-TE coupling reference (coupling.R) over the passed signal matrix — the py/R twin of
    // ki. Stateless (couples `rows`, not the holder's stores); the serve-op shells to Rscript. Rides the pipe.
    coupleR: async (request) => await p.send("couple_r", { ...(request ?? {}) }) as Record<string, unknown>,

    // The R early-warning plane (ews.R) over the passed signal matrix — the critical-slowing-down forecast.
    // Stateless (reads `rows`, not the holder's stores); the serve-op shells to Rscript. Rides the pipe.
    forecast: async (request) => await p.send("forecast", { ...(request ?? {}) }) as Record<string, unknown>,
    // The lifecycle + cross-plane serve-ops: the taxonomy read, the fork-DAG read, the kapae/un-kapae
    // branch-mute cascades (mutations, serialized with capture — never a second writer), and the cross-plane
    // witness. Each rides the SAME serialized pipe as capture through the holder that owns the palace.
    status: async (request) => await p.send("status", { ...(request ?? {}) }) as Record<string, unknown>,
    worldlineDag: async (request) => await p.send("worldline", { ...(request ?? {}) }) as Record<string, unknown>,
    cascadeKapae: async (request) => await p.send("kapae", { ...request }) as Record<string, unknown>,
    cascadeUnKapae: async (request) => await p.send("un_kapae", { ...request }) as Record<string, unknown>,
    planeRecord: async (request) => await p.send("plane_record", { ...request }) as Record<string, unknown>,
    // The worldline-compare edge feed — the python crunch derives the spawn/handback pairs beside the
    // transcript data; the serve-op returns `{ pairs }`, honest-empty when the session spawned no spirits.
    subagentEdges: async (request) => {
      const r = await p.send("subagent-edges", { ...request }) as { pairs?: readonly SubagentEdgePair[] };
      return r.pairs ?? [];
    },
    close: p.close,
  };
}
