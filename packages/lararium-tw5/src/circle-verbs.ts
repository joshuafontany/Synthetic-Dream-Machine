/**
 * circle-verbs — the FOLLOW-GRAPH daemon verbs over the sovereign @circles doc.
 *
 * "Adding to a circle IS the follow" (social-seed). The follow-graph's SOURCE OF TRUTH rides the @circles
 * Automerge bag — `memberDids` per circle tiddler — a PRIVATE bag the self-slot FLEET-syncs same-operator
 * (so a follow lands on ALL the operator's own devices, matching @catalog) and the DeterministicFederationGate
 * NEVER volunteers to a cross-operator (@circles sits OUTSIDE its federatable set). One graph, every device of
 * the one human, no stranger — "the only surface human eyes have on the crypto layer" for friends + wanderers.
 *
 * These reactors run IN the daemon worker (verify-then-delegate gated), reaching @circles by ACCESS (the
 * @oracle registry names it) and writing-then-syncing — access≠load, never a mounted render layer. A follow
 * writes ONLY @circles; NO @crossroads / board / announce seam is reachable here, so the graph never federates
 * by SHAPE. The ONE federated surface stays the glamour a human DELIBERATELY publishes — a separate act.
 *
 * The recognition layer (the handle-book: others' nyms + private petnames) stays LOCAL for now — a follow of
 * an unknown nym fails-closed CLIENT-side (composeFollow) BEFORE the membership write reaches this verb. The
 * handle-book + petname co-move onto @circles is the operator-named fork (see the handback finding).
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/circle-verbs
 */

import {
  circleTiddlerUri, CIRCLES_DOC_URI,
  type LarTiddlerStore, type LarTiddlerRecord,
} from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";
import type { TW5Engine } from "./tw5-vm.js";
import { CIRCLE_STATE_TITLE } from "./daemon-circle-tiddlers.js";

/** Resolve a read+write store over the @circles doc — the daemon reaches it by ACCESS (the @oracle registry
 *  names CIRCLES_DOC_URI); access≠load, so no composite layer mounts. Throws LOUD when @circles is unresolved. */
export type ResolveCirclesStore = () => Promise<LarTiddlerStore>;

export interface CircleVerbOptions {
  readonly resolveStore: ResolveCirclesStore;
  /** The daemon TW5 VM — present → a mutation/list RE-RENDERS the @daemon follow surface (a browser paints it;
   *  a headless node daemon rests the temp tiddler, never painting). Absent → pure data verbs, no render. */
  readonly tw5?: TW5Engine;
}

/** memberDids rides as a SPACE-SEPARATED nym set (readCircleTiddler's shape). Parse → deduped, sorted. */
function parseMembers(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return [...new Set(raw.split(/\s+/).map((s) => s.trim()).filter(Boolean))].sort();
}

/** Serialize a nym set back to the memberDids field — deduped + sorted, so two devices converge on one string. */
function serializeMembers(members: readonly string[]): string {
  return [...new Set(members)].sort().join(" ");
}

function strArg(args: Record<string, unknown>, key: string): string {
  return typeof args[key] === "string" ? (args[key] as string).trim() : "";
}

/** The circle tiddler's mutable field bag (title + arbitrary string fields). */
type CircleFields = Record<string, unknown>;

/** Read one circle's record + its parsed membership from @circles. */
async function readCircle(store: LarTiddlerStore, circle: string): Promise<{ record: LarTiddlerRecord | null; members: string[] }> {
  const record = await store.get(circleTiddlerUri(circle));
  const fields = (record?.tiddler ?? {}) as CircleFields;
  return { record, members: parseMembers(fields["memberDids"]) };
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
    const { record, members: prev } = await readCircle(store, circle);
    const added   = !prev.includes(nym);
    const members = [...prev, nym].sort();
    const now     = new Date().toISOString();
    const prevFields = (record?.tiddler ?? {}) as CircleFields;
    const next: LarTiddlerRecord = {
      tiddler: {
        ...prevFields,
        title:       circleTiddlerUri(circle),
        id:          circle,
        displayName: (typeof prevFields["displayName"] === "string" && prevFields["displayName"]) || circle,
        kind:        (typeof prevFields["kind"] === "string" && prevFields["kind"]) || "Circle",
        createdAt:   (typeof prevFields["createdAt"] === "string" && prevFields["createdAt"]) || now,
        memberDids:  serializeMembers(members),
      } as LarTiddlerRecord["tiddler"],
      meta: { authority: "lares-verb" },
    };
    await store.put(next, { kind: "lares-verb", requestId: `circle-add-${now}-${nym.slice(0, 8)}` });
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
    const { record, members: prev } = await readCircle(store, circle);
    const removed = prev.includes(nym);
    const members = prev.filter((m) => m !== nym);
    if (removed && record) {
      const now = new Date().toISOString();
      const next: LarTiddlerRecord = {
        tiddler: { ...(record.tiddler as CircleFields), title: circleTiddlerUri(circle), memberDids: serializeMembers(members) } as LarTiddlerRecord["tiddler"],
        meta: { authority: "lares-verb" },
      };
      await store.put(next, { kind: "lares-verb", requestId: `circle-remove-${now}-${nym.slice(0, 8)}` });
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
    // Every circle: the tiddlers under the CIRCLES_DOC_URI/ prefix (the self-pointer at CIRCLES_DOC_URI —
    // no trailing slash — falls outside the prefix and is skipped, as is any nested title).
    const prefix = `${CIRCLES_DOC_URI}/`;
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
