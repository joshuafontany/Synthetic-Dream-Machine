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
  Verb,
  ResidencyAction, AddAction, CopyAction, MoveAction, ClearAction, DropAction, LoadAction, IngestAction,
} from "@lararium/mesh";
import {
  ACTION_VERBS, type ActionVerb,
  parseResidencyAction, withEffectRecord, sha256HexSync,
} from "@lararium/mesh";
import type { VerbReactor, VerbTable } from "./verb-dispatcher.js";
import { memeticWikitextDeserializer, expandMemeRefs } from "./deserializer.js";
import { decideIngest } from "./ingest-gate.js";

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
 * Re-shape the dispatched Verb + raw args into a typed ResidencyAction.
 * Uses parseResidencyAction (the shared validator). The args field on the
 * Verb may have already been deserialized; we trust whatever shape
 * the dispatcher hands us as long as parseResidencyAction accepts it.
 */
function residencyFromContext(
  verb: ActionVerb,
  args: Readonly<Record<string, unknown>>,
  invocation: Verb,
): ResidencyAction | null {
  const synth: Verb = {
    ...invocation,
    action: verb,
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
    case "INGEST":
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
    case "LOAD":  return executeLoad(action, composite);
    case "INGEST": return executeIngest(action, composite);
  }
}

/**
 * LOAD — land operator-supplied carriers into toBag. The island never fetches:
 * the operator gesture (which holds the disk grant) sends content WITH the
 * verb; `sourceUri` rides as audit provenance only. Each carrier decomposes at
 * the memetic-wikitext membrane (FFZ: parent + ahu-slot children), and every
 * resulting record lands under the action's fresh changeId.
 */
async function executeLoad(action: LoadAction, composite: CompositeStore): Promise<Record<string, unknown>> {
  const carriers = action.carriers ?? [];
  if (carriers.length === 0) {
    throw new Error(
      "LOAD: no carriers — the operator gesture supplies content with the verb " +
      "(islands hold no fetch capability; source-uri carries provenance, not an address to dereference)",
    );
  }
  const titles: string[] = [];
  for (const carrier of carriers) {
    const fieldsList = memeticWikitextDeserializer(carrier.text, { title: carrier.title ?? "" });
    for (const fields of fieldsList) {
      const title = typeof fields["title"] === "string" ? (fields["title"] as string) : "";
      if (!title) {
        throw new Error("LOAD: carrier produced a record without a title — supply carrier.title or an iam uri-path");
      }
      const record: LarTiddlerRecord = { tiddler: fields as LarTiddlerRecord["tiddler"], meta: {} };
      await landInBag(composite, action.toBag, record, action.changeId, origin(action));
      titles.push(title);
    }
  }
  return { sourceUri: action.sourceUri, toBag: action.toBag, changeId: action.changeId, count: titles.length, titles };
}


/**
 * INGEST — disk -> records through the §6 gate, replace-by-group apply.
 * The gesture supplies diskHash + syncedHash with each carrier (it holds the
 * disk grant and the Synced tree); the island computes only the
 * currentRenderHash from its own merge seat. On an ingest decision the fresh
 * records land under the action's changeId and group members that vanished
 * from the re-parsed carrier tombstone (LOAD never removes; INGEST must).
 * noop/refuse/conflict apply NOTHING — the decision rides the outcome.
 */
async function executeIngest(action: IngestAction, composite: CompositeStore): Promise<Record<string, unknown>> {
  const o = origin(action);
  const results: Array<Record<string, unknown>> = [];
  for (const carrier of action.carriers) {
    const uri = carrier.uri;
    const all = await listLiveTitlesInBag(composite, action.toBag);
    // The carrier group: the root + its fragment children (FFZ decomposition
    // emits `uri#slot` titles) + any path children (`uri/wires/...` era).
    const groupTitles = all.filter((t) => t === uri || t.startsWith(`${uri}#`) || t.startsWith(`${uri}/`));
    const current = new Map<string, Record<string, unknown>>();
    for (const t of groupTitles) {
      const rec = await readFromBag(composite, action.toBag, t);
      if (rec) current.set(t, rec.tiddler as unknown as Record<string, unknown>);
    }
    const currentText = expandMemeRefs((t) => current.get(t) as never, uri) ?? "";
    const decision = decideIngest({
      uri,
      diskText:          carrier.text,
      diskHash:          carrier.diskHash,
      syncedHash:        carrier.syncedHash,
      currentRenderHash: sha256HexSync(currentText),
      hash:              sha256HexSync,
    });
    if (decision.kind === "noop") {
      results.push({ uri, decision: "noop", reason: decision.reason });
      continue;
    }
    if (decision.kind === "refuse") {
      results.push({ uri, decision: "refuse", warnings: [...decision.warnings] });
      continue;
    }
    if (decision.kind === "conflict") {
      results.push({ uri, decision: "conflict" });
      continue;
    }
    const freshTitles = new Set<string>();
    for (const fields of decision.records) {
      const title = typeof fields["title"] === "string" ? (fields["title"] as string) : "";
      if (!title) throw new Error(`INGEST: carrier ${uri} produced a record without a title`);
      const record: LarTiddlerRecord = { tiddler: fields as LarTiddlerRecord["tiddler"], meta: {} };
      await landInBag(composite, action.toBag, record, action.changeId, o);
      freshTitles.add(title);
    }
    const tombstoned: string[] = [];
    for (const t of groupTitles) {
      if (!freshTitles.has(t)) {
        await composite.tombstoneInBag(action.toBag, t, o);
        tombstoned.push(t);
      }
    }
    results.push({ uri, decision: "ingest", landed: freshTitles.size, tombstoned });
  }
  return { sourceUri: action.sourceUri, toBag: action.toBag, changeId: action.changeId, carriers: results };
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
