/**
 * persona-selves — the FLEET-riding half of a human's own-persona names, as a per-field CRDT.
 *
 * The pet-name and the declared Handle name a human's own faces TO THEMSELVES and to their own devices. A
 * label a human sets on one vessel and loses on the next names the compartment badly, so both ride the
 * persona bag — the PersonaGroup's own private plane, which the self-slot FLEET-syncs same-operator and the
 * DeterministicFederationGate never volunteers to a cross-operator. One multitude, every device of the one
 * human, no stranger.
 *
 * WHAT DOES NOT RIDE. The `seat` claim stays LOCAL to the node that holds it: a Kahu chair names a seat on a
 * PARTICULAR node, so syncing it would let one device seat a persona on another device's seal. The fleet
 * carries what a persona IS called; each node keeps what it stands for HERE.
 *
 * THE PER-FIELD STAMP (no whole-record clobber). Each name carries its own value+stamp pair — `petname` beside
 * `petname@`, `handle` beside `handle@`. A rename on one vessel writes only that field's pair, so a concurrent
 * rename of a DIFFERENT persona, or of the OTHER name on the same persona, touches different keys entirely and
 * the Automerge field-merge keeps both. Where two devices renamed the SAME field concurrently, the later stamp
 * reads — a last-writer-wins the human can see and correct, never a silently dropped edit.
 *
 * NO CLOCK AUTHORITY. The stamp orders concurrent edits and settles nothing else: two vessels of one human
 * carry no shared now (causal-islands), so a stamp reads as an ordering hint the human may overrule by
 * renaming again. Nothing gates on it, and no reader treats it as a time.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */

import { personaSelfTiddlerUri, handleIndexFromSelfTiddlerUri, PERSONA_SELVES_PREFIX } from "./lar-uris.js";

/** The two fleet-riding names, each beside its own stamp. Absent = this vessel has read no such name. */
export interface PersonaSelf {
  /** The human's PRIVATE label for this compartment. */
  readonly petname?: string;
  /** The public Handle this persona declares it answers to (an intent; only an announce binds a glamour). */
  readonly handle?: string;
}

/** The mutable field bag one self tiddler carries — the two names plus their `@`-suffixed stamps. */
export type PersonaSelfFields = Record<string, unknown>;

/** The field a name's value sits at, and the field its stamp sits at. One pair per name, never a shared one. */
const NAME_FIELDS = ["petname", "handle"] as const;
export type PersonaSelfName = (typeof NAME_FIELDS)[number];
const stampField = (name: PersonaSelfName): string => `${name}@`;

/** Fold one self tiddler's fields into the names it carries — a value reads only when it holds a string. */
export function foldPersonaSelf(fields: PersonaSelfFields): PersonaSelf {
  const self: { petname?: string; handle?: string } = {};
  for (const name of NAME_FIELDS) {
    const v = fields[name];
    if (typeof v === "string" && v.trim().length > 0) self[name] = v;
  }
  return self;
}

/**
 * Write ONE name onto a self tiddler's fields, stamping only that name's pair. Every other field rides through
 * untouched, so a fleet-mate's concurrent edit to the other name — or to another persona — never gets dropped
 * by a whole-record merge. `stamp` orders concurrent writes to THIS field and nothing else.
 */
export function withPersonaSelfName(
  fields: PersonaSelfFields,
  handleIndex: number,
  name: PersonaSelfName,
  value: string,
  stamp: string,
): PersonaSelfFields {
  const held = fields[stampField(name)];
  // A stamp that does not advance loses to what the doc already holds — an out-of-order arrival from a
  // fleet-mate never overwrites a newer name with an older one.
  if (typeof held === "string" && held >= stamp && typeof fields[name] === "string") return fields;
  return {
    ...fields,
    title: personaSelfTiddlerUri(handleIndex),
    [name]: value,
    [stampField(name)]: stamp,
  };
}

/** Drop ONE name from a self tiddler's fields, advancing its stamp so the clear outranks a stale rename. */
export function withoutPersonaSelfName(
  fields: PersonaSelfFields,
  handleIndex: number,
  name: PersonaSelfName,
  stamp: string,
): PersonaSelfFields {
  return {
    ...fields,
    title: personaSelfTiddlerUri(handleIndex),
    [name]: "",
    [stampField(name)]: stamp,
  };
}

/**
 * Fold a whole persona bag's tiddlers into the multitude — `[handleIndex, PersonaSelf]` pairs ascending. Only
 * titles under the selves prefix read; every other persona-plane tiddler (the bindings, the sentinels, the hearth
 * true-name) passes by untouched, so the plane carries the identity machinery and these labels side by side.
 */
export function foldPersonaSelves(
  tiddlers: ReadonlyArray<{ readonly title: string; readonly fields: PersonaSelfFields }>,
): ReadonlyArray<readonly [number, PersonaSelf]> {
  const out: Array<readonly [number, PersonaSelf]> = [];
  for (const { title, fields } of tiddlers) {
    const index = handleIndexFromSelfTiddlerUri(title);
    if (index === null) continue;
    const self = foldPersonaSelf(fields);
    if (self.petname === undefined && self.handle === undefined) continue;   // a fully-cleared self reads absent
    out.push([index, self] as const);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

export { personaSelfTiddlerUri, handleIndexFromSelfTiddlerUri, PERSONA_SELVES_PREFIX };
