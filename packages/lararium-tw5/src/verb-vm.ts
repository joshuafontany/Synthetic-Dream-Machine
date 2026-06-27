/**
 * verb-vm — volatile verb invocation lifecycle for the admin causal island.
 *
 * Manages the in-TW5-wiki invocation tiddlers (volatile scratch, never synced)
 * and writes durable outcome tiddlers to the Automerge-backed admin bag.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/verb-vm
 */

import type { BatchMode, CompositeStore, Verb } from "@lararium/mesh";
import { DAEMON_BAG_ID, VERB_RESULT_KEY, concludeVerb, buildVerb, buildRunningPatch } from "@lararium/mesh";
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

export function placeVerb(tw5: TW5Engine, opts: VerbPlacement): string {
  const fields = buildVerb(opts);
  const Tiddler = tw5.$tw.Tiddler;
  tw5.$tw.wiki.addTiddler(new Tiddler(fields));
  return fields["request-id"] as string;
}

export function patchVerb(tw5: TW5Engine, title: string, patch: Record<string, string>): void {
  const wiki = tw5.$tw.wiki;
  const existing = wiki.getTiddler(title) as { fields: Record<string, unknown> } | undefined;
  if (!existing) return;
  const Tiddler = tw5.$tw.Tiddler;
  wiki.addTiddler(new Tiddler({ ...existing.fields, ...patch }));
}

export function removeVerb(tw5: TW5Engine, title: string): void {
  tw5.$tw.wiki.deleteTiddler(title);
}

export async function writeOutcome(
  admin: CompositeStore,
  opts: {
    invocation:    Verb;
    status:        "done" | "error";
    result?:       Record<string, unknown>;
    errorMessage?: string;
  },
): Promise<void> {
  const origin = { kind: "lares-verb" as const, requestId: opts.invocation.requestId };
  const outcome = concludeVerb({
    requestId:   opts.invocation.requestId,
    verb:        opts.invocation.action,
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
  await admin.put(outcome, origin, { bag: DAEMON_BAG_ID });
}

/**
 * Render any thrown value to a readable message. A non-Error throw (a plain object,
 * e.g. a `{ok:false,reason}` verify result) used to stringify to "[object Object]";
 * prefer its message/reason/error field, else a compact JSON, never the bare cast.
 */
function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    for (const k of ["message", "reason", "error"]) {
      if (typeof o[k] === "string" && o[k]) return o[k] as string;
    }
    try { return JSON.stringify(err); } catch { /* circular — fall through */ }
  }
  return String(err);
}

export async function dispatchVerb(
  tw5: TW5Engine,
  admin: CompositeStore,
  invocation: Verb,
  run: () => Promise<Record<string, unknown>>,
): Promise<void> {
  patchVerb(tw5, invocation.title, buildRunningPatch());

  try {
    const result = await run();
    await writeOutcome(admin, { invocation, status: "done", result });
  } catch (err) {
    await writeOutcome(admin, { invocation, status: "error", errorMessage: errorText(err) });
  }

  removeVerb(tw5, invocation.title);
}
