/**
 * action-handler — Residency Model ACTION verb handler family.
 *
 * Dispatches the six ACTION verbs (ADD / COPY / MOVE / CLEAR / DROP / LOAD)
 * against a CompositeStore, wrapped in `withEffectRecord` so every bag
 * mutation lands together with its archival audit tiddler. The verb-tiddler
 * dispatch pipeline (M.2) routes operator-submitted verb-tiddlers through a
 * VerbTable; this module fills the table with the residency-action handlers
 * that the cleanup loop cleared from `island-behaviors.ts`.
 *
 * Per-verb mechanics:
 *
 *   ADD     read fromBag's record for title; write into toBag preserving change-id;
 *           fromBag retains its copy.
 *   COPY    read fromBag's record; overwrite toBag's version preserving change-id.
 *   MOVE    ADD into toBag + tombstone the title in fromBag (transfer pair audited
 *           by withEffectRecord via the paired accession+deaccession effects).
 *   CLEAR   enumerate live titles in bag, tombstone each. Effect-log entries
 *           themselves stay intact (the bag's history must persist).
 *   DROP    tombstone every live title in bag (same enumeration as CLEAR) + the
 *           bag-level disposition record marks the bag retired. True bag-removal
 *           from the recipe is a separate operator gesture (recipe edit).
 *   LOAD    external content fetch — not in Sprint 5 scope. Handler throws an
 *           explicit "not yet implemented" error so the verb-table registers but
 *           the operator surface fails loudly rather than silently no-ops.
 *
 * Cap-verify discipline:
 *   - destination-bag admin required for every verb
 *   - MOVE additionally requires source-bag admin (deaccession authority)
 *
 * Sprint:  Residency Model Epic — S5.1 / S5.2 / S5.3 (registration helper)
 * Meme:    lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
 */

import type {
  CompositeStore,
  LarTiddlerRecord,
  ChangeOrigin,
  VerbInvocation,
  ResidencyAction, AddAction, CopyAction, MoveAction, ClearAction, DropAction,
} from "@lararium/mesh";
import {
  ACTION_VERBS, type ActionVerb,
  parseResidencyAction, withEffectRecord,
} from "@lararium/mesh";
import type { VerbReactor, VerbTable } from "./verb-dispatcher.js";

// ── Options + registration ─────────────────────────────────────────────────

export interface ActionHandlerOptions {
  readonly composite: CompositeStore;
}

/**
 * Register every ACTION verb (ADD / COPY / MOVE / CLEAR / DROP / LOAD) on a
 * VerbTable. Called from island-behaviors.ts during `onEa`.
 */
export function registerActionReactors(table: VerbTable, opts: ActionHandlerOptions): void {
  for (const verb of ACTION_VERBS) {
    table.register(verb, makeActionReactorFor(verb, opts));
  }
}

/** Per-ACTION-verb reactor factory. */
export function makeActionReactorFor(verb: ActionVerb, opts: ActionHandlerOptions): VerbReactor {
  return async (args, ctx) => {
    const action = residencyFromContext(verb, args, ctx.invocation);
    if (!action) throw new Error(`action-handler/${verb}: malformed args — required fields missing or wrong type`);

    // Cap-verify destination bag (every verb)
    const destBag = destinationBag(action);
    const destProof = await ctx.cap("admin", destBag);
    if (!destProof.ok) throw new Error(`cap-denied: admin on ${destBag} required (${destProof.reason ?? "no reason"})`);

    // MOVE additionally requires source-bag admin
    if (action.verb === "MOVE") {
      const srcProof = await ctx.cap("admin", action.fromBag);
      if (!srcProof.ok) throw new Error(`cap-denied: admin on ${action.fromBag} required (${srcProof.reason ?? "no reason"})`);
    }

    const summary = await withEffectRecord(action, opts.composite, () => executeAction(action, opts.composite));
    return { verb, ...summary };
  };
}

// ── ResidencyAction reconstruction from VerbContext ────────────────────────

/**
 * Re-shape the dispatched VerbInvocation + raw args into a typed ResidencyAction.
 * Uses parseResidencyAction (the shared validator). The args field on the
 * VerbInvocation may have already been deserialized; we trust whatever shape
 * the dispatcher hands us as long as parseResidencyAction accepts it.
 */
function residencyFromContext(
  verb: ActionVerb,
  args: Readonly<Record<string, unknown>>,
  invocation: VerbInvocation,
): ResidencyAction | null {
  const synth: VerbInvocation = {
    ...invocation,
    verb,
    args,
  };
  return parseResidencyAction(synth);
}

/** Destination bag URI for the cap-verify step + audit. */
function destinationBag(action: ResidencyAction): string {
  switch (action.verb) {
    case "ADD":
    case "COPY":
    case "MOVE":
    case "LOAD":
      return action.toBag;
    case "CLEAR":
    case "DROP":
      return action.bag;
  }
}

// ── Per-verb executors ─────────────────────────────────────────────────────

async function executeAction(action: ResidencyAction, composite: CompositeStore): Promise<Record<string, unknown>> {
  switch (action.verb) {
    case "ADD":   return executeAdd(action, composite);
    case "COPY":  return executeCopy(action, composite);
    case "MOVE":  return executeMove(action, composite);
    case "CLEAR": return executeClear(action, composite);
    case "DROP":  return executeDrop(action, composite);
    case "LOAD":  throw new Error(
      "LOAD handler not yet implemented — external content fetch + validation belongs to a later sprint. " +
      "The verb-tiddler signal validates correctly; the dispatch fails loudly here rather than silent no-op."
    );
  }
}

function origin(action: ResidencyAction): ChangeOrigin {
  return { kind: "lares-verb", requestId: action.requestId };
}

/** Read fromBag's Manifestation of title (or null if absent). */
async function readFromBag(composite: CompositeStore, fromBag: string, title: string): Promise<LarTiddlerRecord | null> {
  const all = await composite.resolveAll(title);
  return all.find((e) => e.bagId === fromBag)?.record ?? null;
}

/** Copy a record into the target bag preserving change-id (Anti-pattern #1 defense). */
async function landInBag(
  composite: CompositeStore,
  toBag: string,
  source: LarTiddlerRecord,
  changeId: string,
  o: ChangeOrigin,
): Promise<void> {
  const record: LarTiddlerRecord = {
    tiddler: source.tiddler,
    meta: { ...(source.meta ?? {}), changeId },
  };
  await composite.put(record, o, { bag: toBag });
}

async function executeAdd(action: AddAction, composite: CompositeStore): Promise<Record<string, unknown>> {
  const source = await readFromBag(composite, action.fromBag, action.title);
  if (!source) throw new Error(`ADD: source bag ${action.fromBag} does not hold ${action.title}`);
  await landInBag(composite, action.toBag, source, action.changeId, origin(action));
  return { title: action.title, fromBag: action.fromBag, toBag: action.toBag, changeId: action.changeId };
}

async function executeCopy(action: CopyAction, composite: CompositeStore): Promise<Record<string, unknown>> {
  const source = await readFromBag(composite, action.fromBag, action.title);
  if (!source) throw new Error(`COPY: source bag ${action.fromBag} does not hold ${action.title}`);
  await landInBag(composite, action.toBag, source, action.changeId, origin(action));
  return { title: action.title, fromBag: action.fromBag, toBag: action.toBag, changeId: action.changeId, mode: "overwrite" };
}

async function executeMove(action: MoveAction, composite: CompositeStore): Promise<Record<string, unknown>> {
  const source = await readFromBag(composite, action.fromBag, action.title);
  if (!source) throw new Error(`MOVE: source bag ${action.fromBag} does not hold ${action.title}`);
  const o = origin(action);
  // Order: land destination first, then tombstone source. If land fails, source
  // stays intact (no orphaned deaccession); if tombstone fails after land, the
  // bag carries inconsistent residency — same Sprint 4 atomicity gap, surfaces
  // the error to the operator.
  await landInBag(composite, action.toBag, source, action.changeId, o);
  await composite.tombstoneInBag(action.fromBag, action.title, o);
  return { title: action.title, fromBag: action.fromBag, toBag: action.toBag, changeId: action.changeId };
}

async function executeClear(action: ClearAction, composite: CompositeStore): Promise<Record<string, unknown>> {
  const titles = await listLiveTitlesInBag(composite, action.bag);
  const o = origin(action);
  for (const title of titles) {
    await composite.tombstoneInBag(action.bag, title, o);
  }
  return { bag: action.bag, clearedCount: titles.length };
}

async function executeDrop(action: DropAction, composite: CompositeStore): Promise<Record<string, unknown>> {
  // DROP currently tombstones contents (same as CLEAR) and lets the
  // effect-record disposition mark the bag retired. True recipe-removal
  // is a separate operator gesture (recipe edit / `lares wiki remove-bag`).
  const titles = await listLiveTitlesInBag(composite, action.bag);
  const o = origin(action);
  for (const title of titles) {
    await composite.tombstoneInBag(action.bag, title, o);
  }
  return { bag: action.bag, retiredCount: titles.length, note: "bag tombstoned; recipe-edit removes the slot" };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Enumerate live tiddler titles that currently reside in `bag` only. */
async function listLiveTitlesInBag(composite: CompositeStore, bag: string): Promise<string[]> {
  const out: string[] = [];
  for (const title of await composite.listVisible()) {
    const bags = await composite.listBagsHolding(title);
    if (bags.includes(bag)) out.push(title);
  }
  return out;
}
