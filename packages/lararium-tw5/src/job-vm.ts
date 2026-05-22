import type { BatchMode, CompositeStore, JobTiddler } from "@lararium/mesh";
import { ADMIN_BAG_ID, JOB_RESULT_KEY, buildJobReceiptTiddler, buildJobTiddler, buildRunningPatch } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";

export interface VmJobPlacement {
  readonly verb: string;
  readonly args: Record<string, unknown>;
  readonly requestedBy: string;
  readonly targets?: string[];
  readonly batchMode?: BatchMode;
  readonly requestId?: string;
}

export function placeVmJob(tw5: TW5Engine, opts: VmJobPlacement): string {
  const fields = buildJobTiddler(opts);
  const Tiddler = tw5.$tw.Tiddler;
  tw5.$tw.wiki.addTiddler(new Tiddler(fields));
  return fields["request-id"] as string;
}

export function patchVmJob(tw5: TW5Engine, title: string, patch: Record<string, string>): void {
  const wiki = tw5.$tw.wiki;
  const existing = wiki.getTiddler(title) as { fields: Record<string, unknown> } | undefined;
  if (!existing) return;
  const Tiddler = tw5.$tw.Tiddler;
  wiki.addTiddler(new Tiddler({ ...existing.fields, ...patch }));
}

export function removeVmJob(tw5: TW5Engine, title: string): void {
  tw5.$tw.wiki.deleteTiddler(title);
}

export async function writeVmJobReceipt(
  admin: CompositeStore,
  opts: {
    job: JobTiddler;
    status: "done" | "error";
    result?: Record<string, unknown>;
    errorMessage?: string;
  },
): Promise<void> {
  const origin = { kind: "lares-job" as const, requestId: opts.job.requestId };
  const receipt = buildJobReceiptTiddler({
    requestId: opts.job.requestId,
    verb: opts.job.verb,
    status: opts.status,
    requestedBy: opts.job.requestedBy,
    cause: opts.job.title,
    batchMode: opts.job.batchMode,
    results: {
      [JOB_RESULT_KEY]: {
        ok: opts.status === "done",
        ...(opts.result !== undefined && { output: opts.result }),
        ...(opts.errorMessage !== undefined && { error: opts.errorMessage }),
      },
    },
    ...(opts.errorMessage !== undefined && { errorMessage: opts.errorMessage }),
  });
  await admin.put(receipt, origin, { bag: ADMIN_BAG_ID });
}

export async function dispatchVmJobLifecycle(
  tw5: TW5Engine,
  admin: CompositeStore,
  job: JobTiddler,
  run: () => Promise<Record<string, unknown>>,
): Promise<void> {
  patchVmJob(tw5, job.title, buildRunningPatch());

  try {
    const result = await run();
    await writeVmJobReceipt(admin, { job, status: "done", result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await writeVmJobReceipt(admin, { job, status: "error", errorMessage: message });
  }

  removeVmJob(tw5, job.title);
}