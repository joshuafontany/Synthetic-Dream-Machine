/**
 * mine-timeout — a SELF-TUNING subprocess-timeout servo for every `mempalace mine` / loci_io
 * call, modeled on the nalu-gate feedback servo (mesh gate-tuning#adaptGate + capture-engine's
 * EWMA cost loop) but INVERTED. A flush gate is a fire-THRESHOLD the servo SHRINKS under load
 * (smaller batches, flush sooner); a timeout is an upper-bound-to-KILL the servo GROWS under load
 * (more headroom when mines run slow) and SHRINKS when they run fast (catch a hang sooner). The
 * old fixed 30 s / no-timeout constants let a wedged mine block for 9 h; this bounds every mine to
 * ≤ CEIL, while never false-killing a slow-but-honest one (it learns the real duration first).
 *
 *   OBSERVE  each mine's wall-duration on completion → recordMineDuration.
 *   STATE    a per-pathKey EWMA (α=0.2, mirroring capture-engine's COST_EWMA_ALPHA) + sample
 *            count. Module-level, in-memory — it re-learns after a restart; FLOOR/CEIL bound it
 *            meanwhile, so a cold servo is still safe.
 *   COMPUTE  timeout = clamp(K · ewma, FLOOR, CEIL); until minSamples, a sane default holds.
 *   KILL     the call site passes the timeout to execFile(Sync) `timeout` + `killSignal` — a hang
 *            is KILLED (SIGKILL, guaranteed death even for a wedged native extension), distinct
 *            from a BUSY lock (which the retry loop WAITS on). A kill is surfaced honestly, never
 *            masked, and does NOT retry the BUSY way (a hang retried is just another hang).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

/** EWMA smoothing — mirrors capture-engine's COST_EWMA_ALPHA (the slow-loop cost tracker). */
export const TIMEOUT_EWMA_ALPHA = 0.2;
/** headroom multiple over the observed mean duration (K · ewma, before the clamp). */
export const TIMEOUT_K = 4;
/** floor — never false-kill a normal mine (a cold mine + model/holder load runs long). */
export const TIMEOUT_FLOOR_MS = 15_000;
/** ceiling — a hang dies within this, never 9 h. Sized so a LARGE honest mine fits beneath it: a
 *  756-transcript wing legitimately runs many minutes, and a ceiling that cannot hold the biggest
 *  real workload converts every big mine into a false hang. */
export const TIMEOUT_CEIL_MS = 3_600_000;
/** below this many samples the EWMA can't be trusted → the cold-start default holds. */
export const TIMEOUT_MIN_SAMPLES = 3;
/** the cold-start default (a partially-learned EWMA, < minSamples) — the prior 30 s flush constant. */
export const TIMEOUT_DEFAULT_MS = 30_000;
/** the FIRST-RUN exemption (zero observations on this key): a cold chroma + embedding-model load
 *  legitimately exceeds 30 s, so the very first mine gets generous headroom; from the first
 *  completion onward the default (then the learned EWMA) takes over. CEIL still bounds a hang. */
export const TIMEOUT_FIRST_RUN_MS = 120_000;
/** the kill signal a timed-out mine takes — SIGKILL can't be caught/ignored, so a wedged native
 *  process (chromadb/sqlite C extension that would swallow SIGTERM) is GUARANTEED to die; the
 *  palace lock is PID-held, so the next miner reclaims it once the holder is gone. */
export const TIMEOUT_KILL_SIGNAL = "SIGKILL" as const;

interface DurationState {
  ewmaMs: number;
  samples: number;
}

/** Per-pathKey learned duration state. Module-level (one servo per process); re-learns on restart. */
const state = new Map<string, DurationState>();

/**
 * OBSERVE: fold one COMPLETED mine's wall-duration into the per-key EWMA (the afferent signal both
 * the timeout and the operator's observability read). Only completions teach the servo — a hang or
 * a fault never records, so a killed/failed duration can't poison the EWMA toward the ceiling.
 */
export function recordMineDuration(pathKey: string, ms: number, items = 1): void {
  if (!Number.isFinite(ms) || ms < 0) return; // a bad clock reading never corrupts the servo
  // LEARN THE PER-ITEM RATE, never the aggregate. A mine's duration runs ~linear in the transcripts
  // presented, and a key serves wings of wildly different size — so an EWMA over raw DURATION averages
  // a 2-transcript wing against a 756-transcript one and learns a number describing neither. It then
  // kills the big mine as a hang. The unit hides inside the aggregate; keep the unit.
  ms = ms / Math.max(1, items);
  const s = state.get(pathKey);
  if (!s) {
    state.set(pathKey, { ewmaMs: ms, samples: 1 });
    return;
  }
  s.ewmaMs = TIMEOUT_EWMA_ALPHA * ms + (1 - TIMEOUT_EWMA_ALPHA) * s.ewmaMs;
  s.samples += 1;
}

/**
 * COMPUTE: the adaptive kill-timeout for the next mine on this key — clamp(K · ewma, FLOOR, CEIL).
 * The very FIRST mine on a key (zero observations) rides {@link TIMEOUT_FIRST_RUN_MS} — a cold
 * chroma + model load runs long, honestly. Until {@link TIMEOUT_MIN_SAMPLES} durations are learned,
 * the cold-start default holds (the servo won't trust a one-sample EWMA). The timeout GROWS as
 * observed durations rise (headroom under load) and SHRINKS as they fall (catch a hang sooner) —
 * the inversion vs the flush gate.
 */
export function adaptiveTimeoutMs(pathKey: string, items = 1): number {
  const s = state.get(pathKey);
  const scale = Math.max(1, items);
  if (!s) return Math.min(TIMEOUT_CEIL_MS, TIMEOUT_FIRST_RUN_MS * scale);
  if (s.samples < TIMEOUT_MIN_SAMPLES) return Math.min(TIMEOUT_CEIL_MS, TIMEOUT_DEFAULT_MS * scale);
  const raw = TIMEOUT_K * s.ewmaMs * scale;
  return Math.round(Math.max(TIMEOUT_FLOOR_MS, Math.min(TIMEOUT_CEIL_MS, raw)));
}

/** Read the learned servo state for a key (observability / tests); undefined until the first sample. */
export function timeoutState(pathKey: string): Readonly<DurationState> | undefined {
  const s = state.get(pathKey);
  return s ? { ewmaMs: s.ewmaMs, samples: s.samples } : undefined;
}

/** Clear all learned state — a fresh servo (tests). */
export function resetMineTimeouts(): void {
  state.clear();
}

/**
 * A subprocess KILLED by its timeout — a HANG, distinct from a BUSY lock or a real non-zero exit.
 * Node's actual fields: execFileSync timeout → `code:'ETIMEDOUT'`,
 * `signal:'SIGKILL'`, `status:null`; execFileAsync timeout → `killed:true`, `signal:'SIGKILL'`. A
 * real non-zero exit carries `signal:null` + a numeric `status` → never reads as a hang. An
 * EXTERNAL `SIGTERM` reads as a CLEAN shutdown (a system/service stop reaping children) — our own
 * kill only ever speaks {@link TIMEOUT_KILL_SIGNAL} (SIGKILL), so SIGTERM never marks our timeout.
 */
export function isMineHang(e: unknown): boolean {
  const err = e as { killed?: boolean; signal?: string | null; code?: string | null };
  if (err?.signal === "SIGTERM") return false; // external graceful stop — a clean shutdown, never our kill
  if (err?.killed === true) return true;
  if (err?.code === "ETIMEDOUT") return true;
  if (err?.signal === "SIGKILL") return true;
  return false;
}

/** Raised when a mine was killed by its adaptive timeout and the hang retries ran out (honest, not masked). */
export class MineHangError extends Error {
  readonly pathKey: string;
  readonly timeoutMs: number;
  readonly attempts: number;
  constructor(pathKey: string, timeoutMs: number, attempts: number, cause?: unknown) {
    super(`mine "${pathKey}" timed out after ${timeoutMs}ms and was killed (hang) — ${attempts} attempt(s)`);
    this.name = "MineHangError";
    this.pathKey = pathKey;
    this.timeoutMs = timeoutMs;
    this.attempts = attempts;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

/**
 * Run a SYNC mine thunk under the servo: derive its adaptive timeout, hand it to the thunk (which
 * passes it to execFileSync `timeout`), time the call, and record the duration on completion. A
 * throw skips the record (only completions teach the EWMA) and rides out unchanged so the caller's
 * retry loop can classify it (BUSY vs HANG).
 */
export function timeMine<T>(pathKey: string, run: (timeoutMs: number) => T, items = 1): T {
  const timeoutMs = adaptiveTimeoutMs(pathKey, items);
  const t0 = Date.now();
  const r = run(timeoutMs);
  recordMineDuration(pathKey, Date.now() - t0, items);
  return r;
}

/** Async twin of {@link timeMine} — for execFileAsync / spawn callers. */
export async function timeMineAsync<T>(
  pathKey: string, run: (timeoutMs: number) => Promise<T>, items = 1,
): Promise<T> {
  const timeoutMs = adaptiveTimeoutMs(pathKey, items);
  const t0 = Date.now();
  const r = await run(timeoutMs);
  recordMineDuration(pathKey, Date.now() - t0, items);
  return r;
}
