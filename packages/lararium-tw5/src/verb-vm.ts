/**
 * verb-vm — volatile verb invocation lifecycle for the admin causal island.
 *
 * Manages the in-TW5-wiki invocation tiddlers (volatile scratch, never synced)
 * and writes durable outcome tiddlers to the Automerge-backed admin bag.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/verb-vm
 */

import type { BatchMode, CompositeStore, VerbInvocation } from "@lararium/mesh";
import { ADMIN_BAG_ID, VERB_RESULT_KEY, buildVerbOutcome, buildVerbInvocation, buildRunningPatch } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";

export interface VerbPlacement {
  readonly verb:        string;
  readonly args:        Record<string, unknown>;
  readonly requestedBy: string;
  readonly targets?:    string[];
  readonly batchMode?:  BatchMode;
  readonly requestId?:  string;
  readonly fromUri?:    string;
  readonly listenable?: string;
}

export function placeVerbInvocation(tw5: TW5Engine, opts: VerbPlacement): string {
  const fields = buildVerbInvocation(opts);
  const Tiddler = tw5.$tw.Tiddler;
  tw5.$tw.wiki.addTiddler(new Tiddler(fields));
  return fields["request-id"] as string;
}

export function patchVerbInvocation(tw5: TW5Engine, title: string, patch: Record<string, string>): void {
  const wiki = tw5.$tw.wiki;
  const existing = wiki.getTiddler(title) as { fields: Record<string, unknown> } | undefined;
  if (!existing) return;
  const Tiddler = tw5.$tw.Tiddler;
  wiki.addTiddler(new Tiddler({ ...existing.fields, ...patch }));
}

export function removeVerbInvocation(tw5: TW5Engine, title: string): void {
  tw5.$tw.wiki.deleteTiddler(title);
}

export async function writeVerbOutcome(
  admin: CompositeStore,
  opts: {
    invocation:    VerbInvocation;
    status:        "done" | "error";
    result?:       Record<string, unknown>;
    errorMessage?: string;
  },
): Promise<void> {
  const origin = { kind: "lares-verb" as const, requestId: opts.invocation.requestId };
  const outcome = buildVerbOutcome({
    requestId:   opts.invocation.requestId,
    verb:        opts.invocation.verb,
    status:      opts.status,
    requestedBy: opts.invocation.requestedBy,
    cause:       opts.invocation.title,
    batchMode:   opts.invocation.batchMode,
    results: {
      [VERB_RESULT_KEY]: {
        ok: opts.status === "done",
        ...(opts.result       !== undefined && { output: opts.result }),
        ...(opts.errorMessage !== undefined && { error:  opts.errorMessage }),
      },
    },
    ...(opts.errorMessage !== undefined && { errorMessage: opts.errorMessage }),
  });
  await admin.put(outcome, origin, { bag: ADMIN_BAG_ID });
}

export async function dispatchVerbLifecycle(
  tw5: TW5Engine,
  admin: CompositeStore,
  invocation: VerbInvocation,
  run: () => Promise<Record<string, unknown>>,
): Promise<void> {
  patchVerbInvocation(tw5, invocation.title, buildRunningPatch());

  try {
    const result = await run();
    await writeVerbOutcome(admin, { invocation, status: "done", result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await writeVerbOutcome(admin, { invocation, status: "error", errorMessage: message });
  }

  removeVerbInvocation(tw5, invocation.title);
}
