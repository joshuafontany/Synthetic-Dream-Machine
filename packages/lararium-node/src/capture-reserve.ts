/**
 * capture-reserve — the durable backing for CaptureNalu (the daemon-side WAL + quarantine).
 * This is what lets OPEN sessions survive while pieces of the system reboot, go down, or
 * get debugged: every record is write-ahead-logged BEFORE it enters the hot pool, so a
 * telemetry-VM crash / palace reboot / mid-debug kill loses nothing — on return the WAL
 * replays and the content-keyed idempotent sink dedups any record that already filed.
 *
 * Layering: the in-memory overflow (onOverflow/refill) is the working reserve tail; its
 * durability already rode the write-ahead `append`, so those sinks stay sync (CaptureNalu's
 * contract) and touch no disk. `append` (write-ahead) + `replay` (boot) + `compact` (when
 * fully drained) are the daemon's async durability hooks; `onDeadLetter` quarantines a
 * poison batch durably.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#nalu-flush-hardening
 */

import { appendFile, appendFileSync, mkdir, mkdirSync, readFile, writeFile } from "node:fs";
import { dirname } from "node:path";
import { promisify } from "node:util";

import type { CaptureRecord } from "@lararium/mesh";

const appendFileAsync = promisify(appendFile);
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);

export interface CaptureReserveOptions {
  /** write-ahead log path — every enqueued record lands here, durable, before the hot pool */
  readonly walPath: string;
  /** quarantine path — dead-lettered (poison) batches, durable, never auto-drained */
  readonly quarantinePath: string;
}

export interface CaptureReserve {
  /** Write-ahead: durably log a record BEFORE it enters the hot pool. The daemon awaits
   *  this in the capture-enqueue verb, so the producer's ack means "durable". */
  append(record: CaptureRecord): Promise<void>;
  /** CaptureNalu's overflow sink — the hot pool was full; the record already rode `append`
   *  to the WAL, so this only tracks the working reserve tail (sync, no disk). */
  onOverflow(records: readonly CaptureRecord[]): void;
  /** CaptureNalu's refill — pull up to `room` records from the reserve tail into the hot pool. */
  refill(room: number): readonly CaptureRecord[];
  /** CaptureNalu's dead-letter — quarantine a poison batch durably (it stays in the WAL too,
   *  but quarantine marks it as "do not auto-retry"). */
  onDeadLetter(records: readonly CaptureRecord[]): void;
  /** Replay the WAL on boot → the records to re-enqueue (idempotent re-file makes this safe). */
  replay(): Promise<readonly CaptureRecord[]>;
  /** Truncate the WAL once everything's filed — call when the nalu is fully drained AND the
   *  palace is healthy (all records durably filed; idempotency tolerates a stale tail). */
  compact(): Promise<void>;
}

/** Build the durable reserve. The in-memory tail is rebuilt from the WAL on `replay`. */
export function makeCaptureReserve(opts: CaptureReserveOptions): CaptureReserve {
  const reserve: CaptureRecord[] = [];
  let dirReady: Promise<unknown> | null = null;
  const ensureDir = () => (dirReady ??= mkdirAsync(dirname(opts.walPath), { recursive: true }));

  return {
    async append(record) {
      await ensureDir();
      await appendFileAsync(opts.walPath, JSON.stringify(record) + "\n", "utf-8");
    },

    onOverflow(records) {
      reserve.push(...records);
    },

    refill(room) {
      return room > 0 ? reserve.splice(0, room) : [];
    },

    onDeadLetter(records) {
      mkdirSync(dirname(opts.quarantinePath), { recursive: true });
      appendFileSync(opts.quarantinePath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
    },

    async replay() {
      let body: string;
      try {
        body = await readFileAsync(opts.walPath, "utf-8");
      } catch {
        return []; // no WAL yet — clean boot
      }
      const out: CaptureRecord[] = [];
      for (const line of body.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
          out.push(JSON.parse(t) as CaptureRecord);
        } catch {
          // skip a torn tail line (a crash mid-append) — the rest replays
        }
      }
      return out;
    },

    async compact() {
      await ensureDir();
      await writeFileAsync(opts.walPath, "", "utf-8");
    },
  };
}
