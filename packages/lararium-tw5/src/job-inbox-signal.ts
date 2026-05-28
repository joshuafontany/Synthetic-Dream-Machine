/**
 * job-inbox-signal — CRDT inbox tiddler → volatile local job relay.
 *
 * External vessels write job-inbox tiddlers at @admin/jobs/<id> to the
 * Automerge doc. The admin island's CompositeStore subscriber calls
 * emitJobInboxSignal on every change; this translates an inbox tiddler into
 * a volatile local job and tombstones the inbox entry. Inbox = edge transport;
 * the volatile job tiddler written by placeJob() = the durable coordination
 * unit the dispatcher watches.
 *
 * Isomorphic: no Node or browser platform APIs. Runs in any sovereign Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/job-inbox-signal
 */

import type { BatchMode, ChangeOrigin, CompositeStore, LarTiddlerChange } from "@lararium/mesh";
import { JOB_INBOX_URI_PREFIX, parseJobTiddler } from "@lararium/mesh";
import type { VmJobPlacement } from "./job-vm.js";

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
    verb:        job.verb,
    args:        job.args as Record<string, unknown>,
    requestedBy: job.requestedBy,
    targets:     [...job.targets],
    batchMode:   job.batchMode,
    requestId:   job.requestId,
  });
}
