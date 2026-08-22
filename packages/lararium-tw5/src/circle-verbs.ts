/**
 * circle-verbs — the FOLLOW-GRAPH daemon verbs over the sovereign @circles doc.
 *
 * "Adding to a circle IS the follow" (social-seed). The follow-graph's SOURCE OF TRUTH rides the @circles
 * Automerge bag — a PER-NYM CRDT-set on each circle tiddler — a PRIVATE bag the self-slot FLEET-syncs
 * same-operator (so a follow lands on ALL the operator's own devices, matching @catalog) and the
 * DeterministicFederationGate NEVER volunteers to a cross-operator (@circles sits OUTSIDE its federatable set).
 * One graph, every device of the one human, no stranger — "the only surface human eyes have on the crypto
 * layer" for friends + wanderers.
 *
 * THE PER-NYM CRDT-SET (no whole-field clobber). Membership rides as INDIVIDUAL per-nym fields, never one
 * space-joined `memberDids` register: a follow stamps `mbr+:<nym>` = now, an unfollow stamps `mbr-:<nym>` = now.
 * A nym reads PRESENT iff it carries an add stamp AND no remove stamp strictly supersedes it (remove-WINS on a
 * tie). Because a concurrent follow and unfollow touch DIFFERENT keys (add vs remove of the SAME nym) — and two
 * follows of DIFFERENT nyms touch different keys entirely — the Automerge field-merge keeps BOTH edits: no add
 * a fleet-mate made off-device is ever lost to a whole-field last-writer-wins. A legacy `memberDids` (seeded by
 * cold-boot, or an older doc) reads as a baseline add, superseded by any real remove — so an old graph folds in
 * cleanly without a migration write.
 *
 * These reactors run IN the daemon worker (verify-then-delegate gated), reaching @circles by ACCESS (the
 * @catalog registry names it) and writing-then-syncing — access≠load, never a mounted render layer. A follow
 * writes ONLY @circles; NO @crossroads / board / announce shore is reachable here, so the graph never federates
 * by SHAPE. The ONE federated surface stays the glamour a human DELIBERATELY publishes — a separate act.
 *
 * The recognition layer (the handle-book: others' nyms + private petnames) stays LOCAL for now — a follow of
 * an unknown nym fails-closed CLIENT-side (composeFollow) BEFORE the membership write reaches this verb. The
 * handle-book + petname co-move onto @circles is the operator-named fork (see the handback finding).
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/circle-verbs
 */

import {
  circleTiddlerUri, CIRCLES_INNER,
  type LarTiddlerStore, type LarTiddlerRecord,
} from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";
import type { TW5Engine } from "./tw5-vm.js";
import { CIRCLE_STATE_TITLE } from "./daemon-circle-tiddlers.js";

/** Resolve a read+write store over the @circles doc — the daemon reaches it by ACCESS (the @catalog registry
 *  names this face's `@circles-<tag>`); access≠load, so no composite layer mounts. Throws LOUD when it is
 *  unresolved. Titles INSIDE the plane spell the namespace, so a circle reads the same on every face. */
export type ResolveCirclesStore = () => Promise<LarTiddlerStore>;

export interface CircleVerbOptions {
  readonly resolveStore: ResolveCirclesStore;
  /** The daemon TW5 VM — present → a mutation/list RE-RENDERS the @daemon follow surface (a browser paints it;
   *  a headless node daemon rests the temp tiddler, never painting). Absent → pure data verbs, no render. */
  readonly tw5?: TW5Engine;
}

/** The per-nym follow stamp: `mbr+:<nym>` holds the add timestamp (a nym joined the circle at this instant). */
const MEMBER_ADD_PREFIX = "mbr+:";
/** The per-nym unfollow stamp: `mbr-:<nym>` holds the remove timestamp (a nym left; remove-wins on a tie). */
const MEMBER_RM_PREFIX = "mbr-:";
/** A legacy add-timestamp baseline — a nym present only via the old space-joined `memberDids` sorts below any
 *  real ISO remove stamp, so a later unfollow always supersedes it (a lexicographic floor, never a real time). */
const LEGACY_ADD_BASELINE = "";

function strArg(args: Record<string, unknown>, key: string): string {
  return typeof args[key] === "string" ? (args[key] as string).trim() : "";
}

/** The circle tiddler's mutable field bag (title + arbitrary fields, incl. the per-nym stamps). */
type CircleFields = Record<string, unknown>;

/** Parse a LEGACY space-joined `memberDids` register into its nym set — the back-compat read only (seeds +
 *  older docs still carry it; the reactors never write it). Deduped, filtered. */
function parseLegacyMembers(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return [...new Set(raw.split(/\s+/).map((s) => s.trim()).filter(Boolean))];
}

/**
 * Fold a circle tiddler's fields into the PRESENT nym set — the per-nym CRDT read. Each nym carries an add
 * timestamp (the max of its `mbr+:` stamp and, for a legacy member, the baseline) and a remove timestamp (its
 * `mbr-:` stamp). A nym is PRESENT iff it has an add stamp AND its remove stamp does not supersede it
 * (`addedAt > removedAt`) — so remove WINS on a tie, and a strictly-later re-follow resurrects it. Sorted, so
 * two devices reading the same merged doc converge on one ordering.
 */
export function foldMembers(fields: CircleFields): string[] {
  const added   = new Map<string, string>();
  const removed = new Map<string, string>();
  for (const nym of parseLegacyMembers(fields["memberDids"])) {
    if (!added.has(nym)) added.set(nym, LEGACY_ADD_BASELINE);
  }
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "string") continue;
    if (key.startsWith(MEMBER_ADD_PREFIX)) {
      const nym = key.slice(MEMBER_ADD_PREFIX.length);
      const cur = added.get(nym);
      if (cur === undefined || value > cur) added.set(nym, value);
    } else if (key.startsWith(MEMBER_RM_PREFIX)) {
      const nym = key.slice(MEMBER_RM_PREFIX.length);
      const cur = removed.get(nym);
      if (cur === undefined || value > cur) removed.set(nym, value);
    }
  }
  const present: string[] = [];
  for (const [nym, addedAt] of added) {
    const removedAt = removed.get(nym);
    if (removedAt === undefined || addedAt > removedAt) present.push(nym);
  }
  return present.sort();
}

/** Read one circle's record + its folded present membership from @circles. */
async function readCircle(store: LarTiddlerStore, circle: string): Promise<{ record: LarTiddlerRecord | null; fields: CircleFields; members: string[] }> {
  const record = await store.get(circleTiddlerUri(circle));
  const fields = (record?.tiddler ?? {}) as CircleFields;
  return { record, fields, members: foldMembers(fields) };
}

/** Render the @daemon follow surface FROM the @circles membership (positional fields the surface iterates by
 *  index). Petname/glamour ride BLANK — the worker holds no handle-book (the co-move fork); the follow-graph
 *  itself lands here, which is the recognition surface the operator ruled onto @circles. */
function renderCircle(tw5: TW5Engine | undefined, circle: string, members: readonly string[]): void {
  if (!tw5) return;
  const fields: Record<string, string> = {
    title: CIRCLE_STATE_TITLE,
    ts:    new Date().toISOString(),
    circle,
    count: String(members.length),
    list:  members.map((_, i) => String(i)).join(" "),
  };
  members.forEach((nym, i) => {
    fields[`nym-${i}`]     = nym;
    fields[`petname-${i}`] = "";
    fields[`glamour-${i}`] = "";
  });
  tw5.setTiddler(fields);
}

/**
 * circle-add — the FOLLOW: add a nym to a circle's memberDids in @circles (idempotent — a re-add dedupes).
 * A non-system circle the operator names is BORN here (kind "Circle"). Writes ONLY @circles — never a board.
 */
export function makeCircleAddReactor(opts: CircleVerbOptions): VerbReactor {
  return async (args) => {
    const circle = strArg(args, "circle");
    const nym    = strArg(args, "nym");
    if (!circle) throw new Error("circle-add: `circle` is required");
    if (!nym)    throw new Error("circle-add: `nym` is required");
    const store = await opts.resolveStore();
    const { fields: prevFields, members: prev } = await readCircle(store, circle);
    const added   = !prev.includes(nym);
    const now     = new Date().toISOString();
    // Stamp ONLY this nym's add key — every OTHER member field rides through untouched (the `...prevFields`
    // spread re-asserts them, so the whole-record merge never drops a fleet-mate's key). A re-follow sets a
    // fresh, strictly-later add stamp that supersedes any standing remove — the fold reads it present again.
    const next: LarTiddlerRecord = {
      tiddler: {
        ...prevFields,
        title:       circleTiddlerUri(circle),
        id:          circle,
        displayName: (typeof prevFields["displayName"] === "string" && prevFields["displayName"]) || circle,
        kind:        (typeof prevFields["kind"] === "string" && prevFields["kind"]) || "Circle",
        createdAt:   (typeof prevFields["createdAt"] === "string" && prevFields["createdAt"]) || now,
        [`${MEMBER_ADD_PREFIX}${nym}`]: now,
      } as LarTiddlerRecord["tiddler"],
      meta: { authority: "lares-verb" },
    };
    await store.put(next, { kind: "lares-verb", requestId: `circle-add-${now}-${nym.slice(0, 8)}` });
    const members = foldMembers(next.tiddler as CircleFields);
    renderCircle(opts.tw5, circle, members);
    return { verb: "circle-add", circle, nym, members, added, federated: false };
  };
}

/**
 * circle-remove — the UNFOLLOW (kāpae, remove-wins): drop a nym from a circle's memberDids. Idempotent (a
 * remove of an absent nym is a no-op; an absent circle stays uncreated). LOCAL to @circles — never a board.
 */
export function makeCircleRemoveReactor(opts: CircleVerbOptions): VerbReactor {
  return async (args) => {
    const circle = strArg(args, "circle");
    const nym    = strArg(args, "nym");
    if (!circle) throw new Error("circle-remove: `circle` is required");
    if (!nym)    throw new Error("circle-remove: `nym` is required");
    const store = await opts.resolveStore();
    const { record, fields: prevFields, members: prev } = await readCircle(store, circle);
    const removed = prev.includes(nym);
    // Stamp this nym's REMOVE key whenever the circle EXISTS — even if the local view reads the nym absent — so
    // the tombstone outranks a concurrent add a fleet-mate made off-device that this replica has not yet merged
    // (remove-wins). An absent circle stays uncreated (nothing to unfollow). Only this one key is touched.
    let members = prev.filter((m) => m !== nym);
    if (record) {
      const now = new Date().toISOString();
      const next: LarTiddlerRecord = {
        tiddler: { ...prevFields, title: circleTiddlerUri(circle), [`${MEMBER_RM_PREFIX}${nym}`]: now } as LarTiddlerRecord["tiddler"],
        meta: { authority: "lares-verb" },
      };
      await store.put(next, { kind: "lares-verb", requestId: `circle-remove-${now}-${nym.slice(0, 8)}` });
      members = foldMembers(next.tiddler as CircleFields);
    }
    renderCircle(opts.tw5, circle, members);
    return { verb: "circle-remove", circle, nym, members, removed, federated: false };
  };
}

/**
 * circle-list — READ the follow-view back from @circles.memberDids. `circle` given → that circle's members
 * (+ a render); absent → every circle's membership. A pure read over @circles; it announces nothing.
 */
export function makeCircleListReactor(opts: CircleVerbOptions): VerbReactor {
  return async (args) => {
    const circle = strArg(args, "circle");
    const store  = await opts.resolveStore();
    if (circle) {
      const { members } = await readCircle(store, circle);
      renderCircle(opts.tw5, circle, members);
      return { verb: "circle-list", circle, members, federated: false };
    }
    // Every circle: the tiddlers under the namespace prefix. The plane's SELF-POINTER answers to that
    // face's own `@circles-<tag>` and never carries this prefix at all, so it is skipped by shape rather
    // than by exclusion — as is any nested title.
    const prefix = `${CIRCLES_INNER}/`;
    const titles = (await store.listVisible()).sort();
    const circles: Array<{ circle: string; members: string[] }> = [];
    for (const title of titles) {
      if (!title.startsWith(prefix)) continue;
      const id = title.slice(prefix.length);
      if (!id || id.includes("/")) continue;
      const { members } = await readCircle(store, id);
      circles.push({ circle: id, members });
    }
    return { verb: "circle-list", circles, federated: false };
  };
}

/** The three FOLLOW-GRAPH reactors over one @circles store resolver — the bundle the daemon registers. */
export function makeCircleReactors(opts: CircleVerbOptions): { add: VerbReactor; remove: VerbReactor; list: VerbReactor } {
  return {
    add:    makeCircleAddReactor(opts),
    remove: makeCircleRemoveReactor(opts),
    list:   makeCircleListReactor(opts),
  };
}
