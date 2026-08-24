/**
 * persona-selves-verbs — the OWN-PERSONA name verbs over the sovereign persona doc.
 *
 * A human's labels for their own faces ride the PersonaGroup's own private bag: the self-slot FLEET-syncs
 * the persona plane same-operator (so a rename lands on ALL the operator's own devices) and the
 * DeterministicFederationGate never volunteers it to a cross-operator (the persona plane sits outside its federatable
 * set). One multitude, every device of the one human, no stranger.
 *
 * TWO NAMES RIDE, ONE CLAIM DOES NOT. `persona-label` carries the PRIVATE pet-name; `persona-handle` carries
 * the DECLARED Handle a persona answers to outward. The `seat` claim stays LOCAL to whichever node holds it —
 * a Kahu chair names a seat on a PARTICULAR node, so syncing it would let one device seat a persona on another
 * device's seal. The fleet carries what a persona IS called; each node keeps what it stands for HERE.
 *
 * A DECLARATION IS NOT A PUBLISH. Both names stay inside the human's own fleet. Only a publicly announced
 * Handle binds a PersonaGroup to a public glamour (persona-glamour), and no board shore is reachable from
 * these reactors — the wall runs structural, exactly as it does for the follow-graph one plane over.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */

import {
  personaSelfTiddlerUri, foldPersonaSelf, foldPersonaSelves,
  withPersonaSelfName, withoutPersonaSelfName,
  PERSONA_SELVES_PREFIX,
  type PersonaSelfFields, type PersonaSelfName,
  type LarTiddlerStore, type LarTiddlerRecord,
} from "@lararium/mesh";
import type { VerbReactor } from "./verb-dispatcher.js";

/** Resolve a read+write store over the PersonaGroup plane this vessel stands in — the daemon reaches it by
 *  ACCESS (the oracle registry names the plane under the id its own group derives); access≠load, so no
 *  composite layer mounts. Throws LOUD when the plane resolves to nothing. */
export type ResolvePersonaStore = () => Promise<LarTiddlerStore>;

export interface PersonaSelvesVerbOptions {
  readonly resolveStore: ResolvePersonaStore;
}

function strArg(args: Record<string, unknown>, key: string): string {
  return typeof args[key] === "string" ? (args[key] as string).trim() : "";
}

/** Read a handle-index argument, fail-closed — a verb that guessed an index would rename the wrong face. */
function indexArg(args: Record<string, unknown>, verb: string): number {
  const raw = args["handleIndex"];
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${verb}: \`handleIndex\` must be a non-negative integer`);
  return n;
}

/** Read one persona's self tiddler + its folded names. */
async function readSelf(store: LarTiddlerStore, handleIndex: number): Promise<PersonaSelfFields> {
  const record = await store.get(personaSelfTiddlerUri(handleIndex));
  return (record?.tiddler ?? {}) as PersonaSelfFields;
}

/**
 * Write ONE name onto a persona's self tiddler. Only that name's value+stamp pair moves; every other field
 * rides through untouched, so a fleet-mate's concurrent rename of the OTHER name — or of another persona —
 * survives the merge. A blank value CLEARS the name (stamped, so the clear outranks a stale rename).
 */
function makeNameReactor(opts: PersonaSelvesVerbOptions, verb: string, name: PersonaSelfName): VerbReactor {
  return async (args) => {
    const handleIndex = indexArg(args, verb);
    const value = strArg(args, name);
    const store = await opts.resolveStore();
    const prev  = await readSelf(store, handleIndex);
    const stamp = new Date().toISOString();
    const fields = value.length > 0
      ? withPersonaSelfName(prev, handleIndex, name, value, stamp)
      : withoutPersonaSelfName(prev, handleIndex, name, stamp);
    // An unchanged fold means a stale stamp lost to what the doc already held — report it rather than writing
    // a no-op, so a caller can tell "my rename landed" from "a fleet-mate's newer name stands".
    if (fields === prev) {
      return { verb, handleIndex, ...foldPersonaSelf(prev), written: false, federated: false };
    }
    const next: LarTiddlerRecord = {
      tiddler: { ...fields, title: personaSelfTiddlerUri(handleIndex) } as LarTiddlerRecord["tiddler"],
      meta: { authority: "lares-verb" },
    };
    await store.put(next, { kind: "lares-verb", requestId: `${verb}-${stamp}-h${handleIndex}` });
    return { verb, handleIndex, ...foldPersonaSelf(fields), written: true, federated: false };
  };
}

/**
 * persona-selves — the MULTITUDE-VIEW off the persona plane: every own persona this fleet has named, ascending. Reads
 * only titles under the selves prefix, so the bag's identity machinery (bindings, sentinels, the hearth
 * true-name) passes by untouched.
 */
function makeSelvesReactor(opts: PersonaSelvesVerbOptions): VerbReactor {
  return async () => {
    const store = await opts.resolveStore();
    const prefix = `${PERSONA_SELVES_PREFIX}/`;
    const titles = (await store.listVisible()).filter((t) => t.startsWith(prefix)).sort();
    const rows: Array<{ title: string; fields: PersonaSelfFields }> = [];
    for (const title of titles) {
      const record = await store.get(title);
      if (record) rows.push({ title, fields: record.tiddler as PersonaSelfFields });
    }
    const selves = foldPersonaSelves(rows).map(([handleIndex, self]) => ({ handleIndex, ...self }));
    return { verb: "persona-selves", selves, federated: false };
  };
}

/** The three own-persona name reactors, built over one persona store resolver. */
export function makePersonaSelvesReactors(opts: PersonaSelvesVerbOptions): {
  label: VerbReactor; handle: VerbReactor; selves: VerbReactor;
} {
  return {
    label:  makeNameReactor(opts, "persona-label",  "petname"),
    handle: makeNameReactor(opts, "persona-handle", "handle"),
    selves: makeSelvesReactor(opts),
  };
}
