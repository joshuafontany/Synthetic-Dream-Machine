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
 * Meme:    lar:///ha.ka.ba/@lararium/v0.1/api/residency-model
 */

import type {
  CompositeStore,
  LarTiddlerRecord,
  LarTiddlerStore,
  ChangeOrigin,
  Verb,
  Repo,
  ResidencyAction, AddAction, CopyAction, MoveAction, ClearAction, DropAction, LoadAction, IngestAction,
} from "@lararium/mesh";
import {
  ACTION_VERBS, type ActionVerb,
  parseResidencyAction, withEffectRecord, sha256HexSync,
} from "@lararium/mesh";
import type { VerbReactor, VerbTable } from "./verb-dispatcher.js";
import { makeCatalogAccessor } from "./catalog-accessor.js";
import { memeticWikitextDeserializer, expandMemeRefs } from "./deserializer.js";
import { decideIngest } from "./ingest-gate.js";
import { decideDeletions } from "./delete-gate.js";

/** Island default mass-delete brake when the wave carries no operator dial. */
const DEFAULT_MASS_DELETE_FRACTION = 0.25;

// ── Options + registration ─────────────────────────────────────────────────

export interface ActionHandlerOptions {
  readonly composite: CompositeStore;
  /**
   * Registry reach for **access-based** writes (operator ruling 2026-06-16, the
   * edit/action split, `wiki-layer-ontology#write-law`): a residency action whose
   * target/source bag is not a mounted layer resolves it by ACCESS across both
   * oracle planes — mounted ephemerally for the action, released after. This
   * retires the admin's standing system-bag mount: deep-bag writes become
   * explicit, audited, access-scoped events, never a floor re-seated. Absent =
   * composite-only (the wiki island, which holds its own write layer).
   */
  readonly reach?: { repo: Repo; catalogUrl: string | null; oracleUrl: string | null };
}

/**
 * Read/write access to a bag's OWN store, resolved per action — never a mount.
 *
 * The reach path (the `@admin` wiki VM) reaches a deep bag's doc by ACCESS across
 * the two registry planes (system → `@oracle`, user → `@catalog`) and writes-then-
 * syncs; it mounts nothing into a composite (access≠load; `wiki-layer-ontology#write-law`,
 * `residency-model` sovereign-worker MUST). The no-reach wiki island resolves its
 * OWN recipe-mounted layers: a source bag MAY be a read-only library layer (read),
 * a target MUST be a writable layer (write). Authority rides the cap-gate upstream.
 */
interface BagAccess {
  read(bag: string): Promise<LarTiddlerStore | null>;
  write(bag: string): Promise<LarTiddlerStore | null>;
}

function makeBagAccess(opts: ActionHandlerOptions): BagAccess {
  if (opts.reach) {
    const reach = opts.reach;
    const planes = [reach.catalogUrl, reach.oracleUrl].filter((u): u is string => !!u)
      .map((u) => makeCatalogAccessor(reach.repo, u));
    const cache = new Map<string, LarTiddlerStore | null>();
    // Reach a bag's store: prefer one the admin already mounts writable (its own
    // @admin bag — no find latency), else resolve the bag's doc by access across
    // the two planes. Cached per action (find() is bounded-async). Read and write
    // share the store: the doc carries no read-only flag — the cap-gate is the authority.
    const resolve = async (bag: string): Promise<LarTiddlerStore | null> => {
      const hit = cache.get(bag);
      if (hit !== undefined) return hit;
      let store: LarTiddlerStore | null = opts.composite.writableStoreForBag(bag);
      if (!store) {
        for (const accessor of planes) {
          store = await accessor.storeOf(bag).catch(() => null);
          if (store) break;
        }
      }
      cache.set(bag, store);
      return store;
    };
    return { read: resolve, write: resolve };
  }
  // No reach: the wiki island operates on its own mounted layers only.
  return {
    read:  async (bag) => opts.composite.storeForBag(bag),
    write: async (bag) => opts.composite.writableStoreForBag(bag),
  };
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

    // Resolve each bag's store by ACCESS — the admin mounts nothing, it reaches
    // the bag's own doc and writes-then-syncs; the wiki island resolves its own
    // layers. Content writes AND the effect-record ledger both ride these per-bag
    // stores, so each record lands in its affected bag (residency-model#effect-record-surface).
    const access = makeBagAccess(opts);

    // Defense in depth: the destination MUST resolve to a writable store. If
    // access resolved nothing, fail loud — a residency write never falls through
    // to the default writable (wiki-layer-ontology#write-law; the confused-deputy guard).
    if (!(await access.write(destBag))) {
      throw new Error(
        `action-handler/${verb}: destination bag "${destBag}" unreachable — ` +
        `not registered, or access resolved nothing. No silent fall-through.`,
      );
    }
    const summary = await withEffectRecord(action, (bag) => access.write(bag), () => executeAction(action, access));
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

async function executeAction(action: ResidencyAction, access: BagAccess): Promise<Record<string, unknown>> {
  switch (action.verb) {
    case "ADD":   return executeAdd(action, access);
    case "COPY":  return executeCopy(action, access);
    case "MOVE":  return executeMove(action, access);
    case "CLEAR": return executeClear(action, access);
    case "DROP":  return executeDrop(action, access);
    case "LOAD":  return executeLoad(action, access);
    case "INGEST": return executeIngest(action, access);
  }
}

/**
 * LOAD — land operator-supplied carriers into toBag. The island never fetches:
 * the operator gesture (which holds the disk grant) sends content WITH the
 * verb; `sourceUri` rides as audit provenance only. Each carrier decomposes at
 * the memetic-wikitext membrane (FFZ: parent + ahu-slot children), and every
 * resulting record lands under the action's fresh changeId.
 */
async function executeLoad(action: LoadAction, access: BagAccess): Promise<Record<string, unknown>> {
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
      await landInBag(access, action.toBag, record, action.changeId, origin(action));
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
async function executeIngest(action: IngestAction, access: BagAccess): Promise<Record<string, unknown>> {
  const o = origin(action);
  const deletions = action.deletions ?? [];

  // ── deletion wave (whole-carrier files gone from disk) ───────────────────
  // Split BEFORE the carrier loop: a rename's target carrier must skip normal
  // ingest so the re-homed (change-id-preserving) records survive. On a
  // suspended mass-delete brake the WHOLE wave applies nothing — a git-checkout
  // flood carries adds and deletes together; the operator reviews it whole.
  let deletionSummary: Record<string, unknown> | undefined;
  const renameTargets = new Set<string>();
  let renames: readonly { readonly fromUri: string; readonly toUri: string }[] = [];
  let tombstoneUris: readonly string[] = [];
  let suspended = false;

  if (deletions.length > 0) {
    const liveTitles = await listLiveTitlesInBag(access, action.toBag);
    const liveCarrierCount = new Set(liveTitles.map((t) => t.split("#")[0])).size;
    const decision = decideDeletions({
      deletes: deletions.map((d) => ({ uri: d.uri, syncedHash: d.syncedHash })),
      adds:    action.carriers.map((c) => ({ uri: c.uri, diskHash: c.diskHash })),
      liveCarrierCount,
      massDeleteFraction: action.massDeleteFraction ?? DEFAULT_MASS_DELETE_FRACTION,
    });
    if (decision.kind === "suspend") {
      suspended = true;
      deletionSummary = { decision: "suspend", reason: decision.reason, wouldTombstone: [...decision.wouldTombstone] };
    } else {
      renames = decision.renames;
      tombstoneUris = decision.tombstones;
      for (const r of renames) renameTargets.add(r.toUri);
    }
  }

  const results: Array<Record<string, unknown>> = [];

  if (suspended) {
    // apply nothing — surface the whole wave for operator review
    return {
      sourceUri: action.sourceUri, toBag: action.toBag, changeId: action.changeId,
      carriers: results, deletions: deletionSummary,
    };
  }

  for (const carrier of action.carriers) {
    // A rename's target re-homes from the vanished carrier's records (identity
    // preserved); skip its normal fresh ingest so the re-link is not overwritten.
    if (renameTargets.has(carrier.uri)) {
      results.push({ uri: carrier.uri, decision: "rename-target", note: "re-linked from a vanished carrier" });
      continue;
    }
    const uri = carrier.uri;
    const all = await listLiveTitlesInBag(access, action.toBag);
    // The carrier group: the root + its fragment children (FFZ decomposition
    // emits `uri#slot` titles) + any path children (`uri/wires/...` era).
    const groupTitles = all.filter((t) => t === uri || t.startsWith(`${uri}#`) || t.startsWith(`${uri}/`));
    const current = new Map<string, Record<string, unknown>>();
    for (const t of groupTitles) {
      const rec = await readFromBag(access, action.toBag, t);
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
      await landInBag(access, action.toBag, record, action.changeId, o);
      freshTitles.add(title);
    }
    const tombstoned: string[] = [];
    for (const t of groupTitles) {
      if (!freshTitles.has(t)) {
        await tombstoneIn(access, action.toBag, t, o);
        tombstoned.push(t);
      }
    }
    results.push({ uri, decision: "ingest", landed: freshTitles.size, tombstoned });
  }

  // ── apply the deletion wave ──────────────────────────────────────────────
  // Renames re-home the vanished carrier's whole group to the new URI,
  // PRESERVING each record's change-id (the re-link, never a fresh create);
  // tombstones remove the whole group (`groupOf`, the shared carrier-group law).
  for (const { fromUri, toUri } of renames) {
    const live = await listLiveTitlesInBag(access, action.toBag);
    let relinked = 0;
    for (const t of groupOf(live, fromUri)) {
      const rec = await readFromBag(access, action.toBag, t);
      if (!rec) continue;
      const newTitle = toUri + t.slice(fromUri.length);
      // DETACH before re-writing: a rename re-homes within the SAME bag/doc, so
      // rec's nested values (e.g. a `tags` array) ride as live doc references —
      // Automerge 3.x refuses to re-link an existing document object. Deep-clone
      // to plain data so the move writes a fresh value (cross-bag ADD reads a
      // foreign doc, which clones fine, so only this same-doc path needs it).
      const movedTiddler = JSON.parse(JSON.stringify(rec.tiddler)) as Record<string, unknown>;
      movedTiddler["title"] = newTitle;
      const moved: LarTiddlerRecord = {
        tiddler: movedTiddler as LarTiddlerRecord["tiddler"],
        meta: JSON.parse(JSON.stringify(rec.meta ?? {})), // change-id preserved — identity survives the move
      };
      await writeIn(access, action.toBag, moved, o);
      await tombstoneIn(access, action.toBag, t, o);
      relinked++;
    }
    results.push({ uri: toUri, decision: "rename", from: fromUri, relinked });
  }

  const tombstonedCarriers: string[] = [];
  for (const uri of tombstoneUris) {
    const live = await listLiveTitlesInBag(access, action.toBag);
    const group = groupOf(live, uri);
    for (const t of group) await tombstoneIn(access, action.toBag, t, o);
    results.push({ uri, decision: "tombstone", removed: group.length });
    tombstonedCarriers.push(uri);
  }

  if (deletions.length > 0 && !deletionSummary) {
    deletionSummary = { decision: "apply", renames: renames.map((r) => ({ ...r })), tombstoned: tombstonedCarriers };
  }

  return {
    sourceUri: action.sourceUri, toBag: action.toBag, changeId: action.changeId,
    carriers: results,
    ...(deletionSummary ? { deletions: deletionSummary } : {}),
  };
}

function origin(action: ResidencyAction): ChangeOrigin {
  return { kind: "lares-verb", requestId: action.requestId };
}

/** Read a bag's OWN Manifestation of title (or null if absent / bag unreachable). */
async function readFromBag(access: BagAccess, fromBag: string, title: string): Promise<LarTiddlerRecord | null> {
  const store = await access.read(fromBag);
  return store ? store.get(title) : null;
}

/** Write a record directly into the target bag's store. Fails loud when the bag
 *  has no writable store (no silent fall-through to the default writable). */
async function writeIn(access: BagAccess, bag: string, record: LarTiddlerRecord, o: ChangeOrigin): Promise<void> {
  const store = await access.write(bag);
  if (!store) throw new Error(`action-handler: target bag "${bag}" unreachable — no writable store (no silent misroute).`);
  await store.put(record, o);
}

/** Tombstone a title in the bag's own store. Fails loud when unreachable. */
async function tombstoneIn(access: BagAccess, bag: string, title: string, o: ChangeOrigin): Promise<void> {
  const store = await access.write(bag);
  if (!store) throw new Error(`action-handler: target bag "${bag}" unreachable — cannot tombstone (no silent misroute).`);
  await store.tombstone(title, o);
}

/** Copy a record into the target bag preserving change-id (Anti-pattern #1 defense). */
async function landInBag(
  access: BagAccess,
  toBag: string,
  source: LarTiddlerRecord,
  changeId: string,
  o: ChangeOrigin,
): Promise<void> {
  const record: LarTiddlerRecord = {
    // Stamp the DESTINATION residency: the disk projector routes a record to its
    // mirror by the `bag` field (disk-projector reads fields["bag"]), so a moved
    // or copied record MUST carry its new bag — else it never projects under the
    // destination mirror (it kept the source's bag). Cross-bag = cross-doc, so
    // the spread clones into a foreign doc cleanly (no same-doc aliasing).
    tiddler: { ...(source.tiddler as Record<string, unknown>), bag: toBag } as LarTiddlerRecord["tiddler"],
    meta: { ...(source.meta ?? {}), changeId },
  };
  await writeIn(access, toBag, record, o);
}

async function executeAdd(action: AddAction, access: BagAccess): Promise<Record<string, unknown>> {
  const source = await readFromBag(access, action.fromBag, action.title);
  if (!source) throw new Error(`ADD: source bag ${action.fromBag} does not hold ${action.title}`);
  await landInBag(access, action.toBag, source, action.changeId, origin(action));
  return { title: action.title, fromBag: action.fromBag, toBag: action.toBag, changeId: action.changeId };
}

async function executeCopy(action: CopyAction, access: BagAccess): Promise<Record<string, unknown>> {
  const source = await readFromBag(access, action.fromBag, action.title);
  if (!source) throw new Error(`COPY: source bag ${action.fromBag} does not hold ${action.title}`);
  await landInBag(access, action.toBag, source, action.changeId, origin(action));
  return { title: action.title, fromBag: action.fromBag, toBag: action.toBag, changeId: action.changeId, mode: "overwrite" };
}

/** A memetic-wikitext carrier is a tiddler-GROUP keyed by its root: the root
 *  title itself plus every `#fragment` child and `/path` segment. Residency ops
 *  that touch a carrier MUST carry the whole group so a fragment never orphans
 *  from its root (the shared law the deletion, rename, and MOVE paths enforce). */
function groupOf(titles: readonly string[], root: string): string[] {
  return titles.filter((t) => t === root || t.startsWith(`${root}#`) || t.startsWith(`${root}/`));
}

async function executeMove(action: MoveAction, access: BagAccess): Promise<Record<string, unknown>> {
  const o = origin(action);
  // Carrier-group MOVE (operator ruling 2026-06-18): a MOVE of a carrier root
  // carries its WHOLE group — root + #fragment + /path — so promotion publishes
  // a meme entire and never orphans a fragment from its root (#shore-law). The
  // same group law the deletion/rename path uses; a single-title move of one
  // record of a carrier was the latent bug this closes.
  const live  = await listLiveTitlesInBag(access, action.fromBag);
  const group = groupOf(live, action.title);
  if (group.length === 0) throw new Error(`MOVE: source bag ${action.fromBag} does not hold ${action.title}`);
  // Order: land the whole group first, then tombstone the source group. If a
  // land fails, the source stays intact (no orphaned deaccession); a tombstone
  // failure after land surfaces the error (the Sprint 4 atomicity gap stands).
  let moved = 0;
  for (const t of group) {
    const source = await readFromBag(access, action.fromBag, t);
    if (!source) continue;
    // change-id identity survives the move: the root keys on the action's
    // change-id (the operation), each child keeps its own (its record identity).
    const changeId = t === action.title ? action.changeId : (source.meta?.changeId ?? action.changeId);
    await landInBag(access, action.toBag, source, changeId, o);
  }
  for (const t of group) {
    await tombstoneIn(access, action.fromBag, t, o);
    moved++;
  }
  return { title: action.title, fromBag: action.fromBag, toBag: action.toBag, changeId: action.changeId, moved };
}

async function executeClear(action: ClearAction, access: BagAccess): Promise<Record<string, unknown>> {
  const titles = await listLiveTitlesInBag(access, action.bag);
  const o = origin(action);
  for (const title of titles) {
    await tombstoneIn(access, action.bag, title, o);
  }
  return { bag: action.bag, clearedCount: titles.length };
}

async function executeDrop(action: DropAction, access: BagAccess): Promise<Record<string, unknown>> {
  // DROP currently tombstones contents (same as CLEAR) and lets the
  // effect-record disposition mark the bag retired. True recipe-removal
  // is a separate operator gesture (recipe edit / `lares wiki remove-bag`).
  const titles = await listLiveTitlesInBag(access, action.bag);
  const o = origin(action);
  for (const title of titles) {
    await tombstoneIn(access, action.bag, title, o);
  }
  return { bag: action.bag, retiredCount: titles.length, note: "bag tombstoned; recipe-edit removes the slot" };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Enumerate live tiddler titles residing in `bag` — read from the bag's OWN
 *  store (its Manifestations), independent of any cascade shadowing. Empty when
 *  the bag is unreachable. */
async function listLiveTitlesInBag(access: BagAccess, bag: string): Promise<string[]> {
  const store = await access.read(bag);
  return store ? store.listVisible() : [];
}
