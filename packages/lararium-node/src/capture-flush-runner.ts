/**
 * capture-flush-runner — the daemon-side fs + subprocess injection for CaptureNalu
 * (the telemetry-VM's flush half). The writer serializes a drained batch to a unique
 * NDJSON file; the runner spawns `mempalace mine --source lares` on it — the ONE-writer
 * flush (the unified-nalu law). The CaptureNalu mechanism stays pure (mesh); this is the
 * node-substrate edge that touches fs + child_process.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#forward-facing-nalu
 */

import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import type { CaptureFlushRunner, CaptureNdjsonWriter } from "@lararium/mesh";

const execFileAsync = promisify(execFile);

export interface CaptureFlushOptions {
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
 * Build the `{ writeNdjson, run }` pair the telemetry-VM injects into `CaptureNalu`.
 * `writeNdjson` serializes the drained batch to a unique NDJSON file; `run` spawns the
 * source-adapter flush and returns the count filed (parsed from `Drawers filed: N`),
 * deleting the transient file afterward — the in-memory queue stays the source of truth,
 * so a failed flush (which throws) leaves nothing on disk and CaptureNalu re-queues.
 */
export function makeCaptureFlushRunner(opts: CaptureFlushOptions): {
  writeNdjson: CaptureNdjsonWriter;
  run: CaptureFlushRunner;
} {
  const bin = opts.mempalaceBin ?? "mempalace";
  const timeout = opts.timeoutMs ?? 30_000;
  const spawn = opts.spawn ?? ((b, a) => execFileAsync(b, [...a], { timeout }));
  let seq = 0;

  const writeNdjson: CaptureNdjsonWriter = async (records) => {
    await mkdir(opts.spoolDir, { recursive: true });
    const path = join(opts.spoolDir, `batch-${seq++}.ndjson`);
    const body = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
    await writeFile(path, body, "utf-8");
    return path;
  };

  const run: CaptureFlushRunner = async (ndjsonPath) => {
    try {
      const { stdout } = await spawn(bin, [
        "mine",
        "--source",
        "lares",
        "--palace",
        opts.palacePath,
        ndjsonPath,
      ]);
      const m = stdout.match(/Drawers filed:\s*(\d+)/);
      return m ? Number(m[1]) : 0;
    } finally {
      await rm(ndjsonPath, { force: true });
    }
  };

  return { writeNdjson, run };
}
