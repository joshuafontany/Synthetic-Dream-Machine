/**
 * verb-signal — CRDT verb-signal tiddler → volatile local invocation relay.
 *
 * External vessels write verb-signal tiddlers at @admin/signals/<id> to the
 * Automerge doc. The admin island's CompositeStore subscriber calls
 * emitVerbSignal on every change; this translates a signal tiddler into
 * a volatile local invocation and tombstones the signal entry.
 * Signal = edge transport; the volatile invocation tiddler = the durable
 * coordination unit the VerbDispatcher watches.
 *
 * Isomorphic: no Node or browser platform APIs. Runs in any sovereign Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/verb-signal
 */

import type { BatchMode, ChangeOrigin, CompositeStore, LarTiddlerChange } from "@lararium/mesh";
import { VERB_SIGNAL_URI_PREFIX, parseVerbInvocation } from "@lararium/mesh";
import type { VerbPlacement } from "./verb-vm.js";

export type VerbSignalRequest = VerbPlacement;

export interface VerbSignalRelayOptions {
  readonly admin:       CompositeStore;
  readonly isInFlight:  (requestId: string) => boolean;
  readonly placeVerb:   (invocation: VerbSignalRequest) => void;
}

export async function emitVerbSignal(
  change: LarTiddlerChange,
  opts: VerbSignalRelayOptions,
): Promise<void> {
  if (!change.record) return;
  if (!change.record.tiddler.title.startsWith(VERB_SIGNAL_URI_PREFIX)) return;
  if (change.origin.kind === "lares-verb") return;

  const invocation = parseVerbInvocation(change.record.tiddler as Record<string, unknown>);
  if (!invocation || invocation.status !== "pending") return;
  if (opts.isInFlight(invocation.requestId)) return;

  const origin: ChangeOrigin = { kind: "lares-verb", requestId: invocation.requestId };
  await opts.admin.tombstone(change.record.tiddler.title, origin);
  opts.placeVerb({
    verb:        invocation.verb,
    args:        invocation.args as Record<string, unknown>,
    requestedBy: invocation.requestedBy,
    targets:     [...invocation.targets],
    batchMode:   invocation.batchMode,
    requestId:   invocation.requestId,
    ...(invocation.fromUri    !== undefined && { fromUri:    invocation.fromUri }),
    ...(invocation.listenable !== undefined && { listenable: invocation.listenable }),
  });
}
