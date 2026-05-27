import type { BatchMode, ChangeOrigin, CompositeStore, LarTiddlerChange } from "@lararium/mesh";
import { JOB_INBOX_URI_PREFIX, parseJobTiddler } from "@lararium/mesh";
import type { VmJobPlacement } from "@lararium/tw5";

export type JobPlacementRequest = VmJobPlacement;

export interface JobInboxRelayOptions {
  readonly admin: CompositeStore;
  readonly isInFlight: (requestId: string) => boolean;
  readonly placeJob: (job: JobPlacementRequest) => void;
}

export async function emitJobInboxSignal(
  change: LarTiddlerChange,
  opts: JobInboxRelayOptions,
): Promise<void> {
  if (!change.record) return;
  if (!change.record.tiddler.title.startsWith(JOB_INBOX_URI_PREFIX)) return;
  if (change.origin.kind === "lares-job") return;

  const job = parseJobTiddler(change.record.tiddler as Record<string, unknown>);
  if (!job || job.status !== "pending") return;
  if (opts.isInFlight(job.requestId)) return;

  const origin: ChangeOrigin = { kind: "lares-job", requestId: job.requestId };
  await opts.admin.tombstone(change.record.tiddler.title, origin);
  opts.placeJob({
    verb: job.verb,
    args: job.args as Record<string, unknown>,
    requestedBy: job.requestedBy,
    targets: [...job.targets],
    batchMode: job.batchMode,
    requestId: job.requestId,
  });
}