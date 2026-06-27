/**
 * verb-summons — CRDT verb-summons tiddler → volatile local invocation relay.
 *
 * External vessels write verb-summons tiddlers at @daemon/summons/<id> to the
 * Automerge doc. The admin island's CompositeStore subscriber calls
 * heedSummons on every change; this translates a summons tiddler into
 * a volatile local invocation and tombstones the summons entry.
 * The summons names edge transport — a peer calling another peer to act. (The
 * term "signal" now names the Agent↔Operator HUD/legibility frame, a different
 * layer; the task-transport noun reads "summons", by research verdict 2026-06-07.)
 * The volatile invocation tiddler holds the durable coordination the dispatcher watches.
 *
 * Isomorphic: no Node or browser platform APIs. Runs in any sovereign Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/verb-summons
 */

import type { BatchMode, ChangeOrigin, CompositeStore, LarTiddlerChange } from "@lararium/mesh";
import { SUMMONS_URI_PREFIX, parseVerb } from "@lararium/mesh";
import type { VerbPlacement } from "./verb-vm.js";

export type SummonsRequest = VerbPlacement;

export interface SummonsRelayOptions {
  readonly admin:       CompositeStore;
  readonly isInFlight:  (requestId: string) => boolean;
  readonly placeVerb:   (invocation: SummonsRequest) => void;
}

export async function heedSummons(
  change: LarTiddlerChange,
  opts: SummonsRelayOptions,
): Promise<void> {
  if (!change.record) return;
  if (!change.record.tiddler.title.startsWith(SUMMONS_URI_PREFIX)) return;
  if (change.origin.kind === "lares-verb") return;

  const invocation = parseVerb(change.record.tiddler as Record<string, unknown>);
  if (!invocation || invocation.status !== "pending") return;
  if (opts.isInFlight(invocation.requestId)) return;

  const origin: ChangeOrigin = { kind: "lares-verb", requestId: invocation.requestId };
  await opts.admin.tombstone(change.record.tiddler.title, origin);
  opts.placeVerb({
    verb:        invocation.action,
    args:        invocation.args as Record<string, unknown>,
    requestedBy: invocation.requestedBy,
    targets:     [...invocation.targets],
    batchMode:   invocation.batchMode,
    requestId:   invocation.requestId,
    ...(invocation.fromUri    !== undefined && { fromUri:    invocation.fromUri }),
    ...(invocation.listenable !== undefined && { listenable: invocation.listenable }),
  });
}
