/**
 * capture-flush — the NODE substrate flush seam: serialize a drained batch to an NDJSON
 * spool file and spawn `mempalace mine --source ndjson` on it (the one-writer flush to the
 * shared palace). The `ndjson` adapter is GENERIC — it carries no Lares vocabulary, so it
 * lives upstream in mempalace; every Lares annotation rides as opaque `metadata` the palace
 * stores verbatim and never interprets (the causal-island boundary: share substrate, not
 * sovereignty). This is node's implementation of the isomorphic `CaptureFlush` verb; a
 * browser vessel implements the same verb with an IndexedDB write or a relay-send instead.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";

import type { CaptureFlush, CaptureRecord } from "@lararium/mesh";
import { canonicalPalacePath, mineWithServoAsync, TIMEOUT_KILL_SIGNAL, withMineLane } from "@lararium/mempalace";

const execFileAsync = promisify(execFile);

export interface SubprocessFlushOptions {
  /** dir for transient NDJSON batch files (e.g. <root>/.lararium/capture-nalu) */
  readonly spoolDir: string;
  /** palace path passed through to `mempalace mine --palace` */
  readonly palacePath: string;
  /** the mempalace executable (default "mempalace") */
  readonly mempalaceBin?: string;
  /** injected spawn for tests; defaults to execFile(mempalace ...). Receives the servo's adaptive
   *  per-attempt timeout — the writer-liveness guard so a wedged `mine` never blinds telemetry
   *  under load (neuro depolarization-block); self-tuning, no longer a fixed 30 s. */
  readonly spawn?: (
    bin: string,
    args: readonly string[],
    opts?: { timeout?: number; killSignal?: NodeJS.Signals },
  ) => Promise<{ stdout: string }>;
}

/**
 * THE COMPARATOR WARD — refuse to mine into the guest `~/.mempalace`, whoever asks.
 *
 * `~/.mempalace` holds the clean baseline the sensorium measures itself against, and a comparator the
 * RUN has written carries no information. The RUN never writes the comparator.
 *
 * The ward sits at the RESOURCE, never at the call sites: a ward each caller must remember fails.
 * It honors `MEMPALACE_PALACE_PATH` (upstream's own relocation lever), so a relocated guest refuses
 * too, while a sovereign or tmp palace passes.
 */
function refuseComparator(palacePath: string): void {
  const guest = canonicalPalacePath(
    process.env["MEMPALACE_PALACE_PATH"]?.trim() || join(homedir(), ".mempalace"),
  );
  if (palacePath === guest || palacePath.startsWith(guest + sep)) {
    throw new Error(
      `capture-flush: refusing to mine into the comparator (${palacePath}). ~/.mempalace is the ` +
      "clean baseline the sensorium is measured against — the RUN never writes it. Point the capture " +
      "sink at the sovereign content plane.",
    );
  }
}

/**
 * Build node's `CaptureFlush`: serialize → spawn the source-adapter flush → parse
 * `Drawers filed: N` → delete the transient file. THROWS on a failed/timed-out flush so
 * CaptureNalu re-queues; the in-memory queue stays the source of truth, so nothing lingers
 * on disk after a failure.
 */
export function makeSubprocessFlush(opts: SubprocessFlushOptions): CaptureFlush {
  const bin = opts.mempalaceBin ?? "mempalace";
  const spawn =
    opts.spawn ??
    ((b, a, o) => execFileAsync(b, [...a], { timeout: o?.timeout, killSignal: o?.killSignal }));
  // ONE canonical spelling for the physical palace — so this flush, the subagent
  // mine, and the read sidecar all address the SAME write-daemon singleton (a
  // symlinked / `..` / relative spelling otherwise keys a SECOND daemon → lock
  // starve). Resolved once at construction (the path is stable for the cap's life).
  const palacePath = canonicalPalacePath(opts.palacePath);
  refuseComparator(palacePath);
  let seq = 0;

  return async (batch: readonly CaptureRecord[]): Promise<number> => {
    await mkdir(opts.spoolDir, { recursive: true });
    const path = join(opts.spoolDir, `batch-${seq++}.ndjson`);
    await writeFile(path, batch.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
    try {
      // `--palace` is a GLOBAL option — it MUST precede the `mine` subcommand
      // (`mempalace --palace <p> mine …`); after the subcommand argparse rejects it.
      // `--daemon` HANDS OFF to mempalace's write-daemon queue (the single-writer SEAM) — the
      // causal-island boundary: the vessel never spawns a competing direct mine that races the
      // palace lock; it queues the batch and the daemon serializes it (auto-starts the daemon if
      // absent). A palace-lock BUSY signal (a concurrent one-shot mine holds the lock) WAITS+retries
      // via the shared backoff — it must not FAIL here (the @daemon flush regression). A NON-busy
      // submit failure THROWS straight through → the nalu's WAL/backoff retries (durable, no loss).
      // The adaptive timeout servo bounds a wedged `mine` (a hang dies ≤ CEIL, never 9 h) and
      // learns each flush's real duration; it COMPOSES with the BUSY-retry — a busy lock WAITS,
      // a hang is killed (SIGKILL) and surfaces honestly so the nalu's WAL re-queues it.
      // The SINGLE-WRITER lane (mine-lane): every async mine for this palace queues on one
      // in-process tail, so concurrent flushes can never race each other (or the chroma hnsw
      // compactor) into the palace lock — the busy-retry stays the CROSS-process guard, the
      // lane keeps this process from storming it.
      const { stdout } = await withMineLane(palacePath, () =>
        mineWithServoAsync("capture-flush", (timeoutMs) =>
          spawn(bin, ["--palace", palacePath, "mine", "--source", "ndjson", "--daemon", path], {
            timeout: timeoutMs,
            killSignal: TIMEOUT_KILL_SIGNAL,
          }),
        ),
      );
      const m = stdout.match(/Drawers filed:\s*(\d+)/);
      return m ? Number(m[1]) : 0;
    } finally {
      await rm(path, { force: true });
    }
  };
}
