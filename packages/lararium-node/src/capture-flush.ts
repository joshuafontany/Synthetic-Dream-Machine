/**
 * capture-flush — the NODE substrate flush seam: serialize a drained batch to an NDJSON
 * spool file and spawn `mempalace mine --source ndjson` on it (the one-writer flush to the
 * shared palace). The `ndjson` adapter is GENERIC — it carries no Lares vocabulary, so it
 * lives upstream in mempalace; every Lares annotation rides as opaque `metadata` the palace
 * stores verbatim and never interprets (the causal-island boundary: share substrate, not
 * sovereignty). This is node's implementation of the isomorphic `CaptureFlush` verb; a
 * browser vessel implements the same verb with an IndexedDB write or a relay-send instead.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import type { CaptureFlush, CaptureRecord } from "@lararium/mesh";
import { canonicalPalacePath, mineWithRetryAsync } from "@lararium/mempalace";

const execFileAsync = promisify(execFile);

export interface SubprocessFlushOptions {
  /** dir for transient NDJSON batch files (e.g. <root>/.lararium/capture-nalu) */
  readonly spoolDir: string;
  /** palace path passed through to `mempalace mine --palace` */
  readonly palacePath: string;
  /** the mempalace executable (default "mempalace") */
  readonly mempalaceBin?: string;
  /** flush timeout (ms) — the writer-liveness guard so a wedged `mine` never blinds
   *  telemetry under load (neuro depolarization-block). Default 30 s. */
  readonly timeoutMs?: number;
  /** injected spawn for tests; defaults to execFile(mempalace ...) */
  readonly spawn?: (bin: string, args: readonly string[]) => Promise<{ stdout: string }>;
}

/**
 * Build node's `CaptureFlush`: serialize → spawn the source-adapter flush → parse
 * `Drawers filed: N` → delete the transient file. THROWS on a failed/timed-out flush so
 * CaptureNalu re-queues; the in-memory queue stays the source of truth, so nothing lingers
 * on disk after a failure.
 */
export function makeSubprocessFlush(opts: SubprocessFlushOptions): CaptureFlush {
  const bin = opts.mempalaceBin ?? "mempalace";
  const timeout = opts.timeoutMs ?? 30_000;
  const spawn = opts.spawn ?? ((b, a) => execFileAsync(b, [...a], { timeout }));
  // ONE canonical spelling for the physical palace — so this flush, the subagent
  // mine, and the read sidecar all address the SAME write-daemon singleton (a
  // symlinked / `..` / relative spelling otherwise keys a SECOND daemon → lock
  // starve). Resolved once at construction (the path is stable for the cap's life).
  const palacePath = canonicalPalacePath(opts.palacePath);
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
      const { stdout } = await mineWithRetryAsync(() =>
        spawn(bin, ["--palace", palacePath, "mine", "--source", "ndjson", "--daemon", path]),
      );
      const m = stdout.match(/Drawers filed:\s*(\d+)/);
      return m ? Number(m[1]) : 0;
    } finally {
      await rm(path, { force: true });
    }
  };
}
