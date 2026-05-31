/**
 * residency-actions — SPARQL-derived ALL-CAPS ACTION verbs for the residency
 * model. Operator gestures over multi-bag tiddler residency.
 *
 * The ACTION verb surface composes ON TOP of verb-tiddler.ts (M.2 pipeline).
 * An ACTION arrives as a VerbInvocation whose `verb` field carries one of
 * ACTION_VERBS; per-verb arguments ride inside the existing JSON `args` field.
 * No new URI prefix exists for actions — they reuse:
 *
 *   VERB_URI_PREFIX         volatile local invocation (admin VM scratch)
 *   VERB_SIGNAL_URI_PREFIX  Automerge-backed remote vessel signal
 *   VERB_OUTCOME_URI_PREFIX Automerge-backed durable outcome
 *
 * Verb semantics (SPARQL Update derivation):
 *
 *   ADD    grant <title> residency in <toBag>; <fromBag> retains its copy.
 *   COPY   overwrite <toBag>'s version of <title> with <fromBag>'s; both keep history.
 *   MOVE   atomic ADD to <toBag> + CLEAR <title> from <fromBag> (transfer pair).
 *   CLEAR  empty <bag> (preserve bag identity; effect log retained).
 *   DROP   retire <bag> entirely (with disposition record).
 *   LOAD   bring external content from <sourceUri> into <toBag>.
 *
 * change-id discipline (Anti-pattern #1 defense):
 *   Every ADD / COPY / MOVE / LOAD carries a `changeId`. The same tiddler-content
 *   identity travels across bags through ADD / COPY / MOVE so that downstream
 *   tooling recognises "same change, different bag" rather than minting a new
 *   identity on copy. LOAD mints a fresh changeId (external content carries no
 *   prior mesh identity). CLEAR / DROP operate on whole bags and carry no
 *   changeId.
 *
 * Meme:    lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
 * Sprint:  Residency Model Epic — S2.1 / S2.2 / S2.3 / S2.4 / S2.6
 * Source:  packages/lararium-mesh/src/residency-actions.ts
 */

import {
  VERB_URI_PREFIX, VERB_SIGNAL_URI_PREFIX,
} from "./verb-tiddler.js";
import type { VerbInvocation } from "./verb-tiddler.js";

// ── ACTION verb set ────────────────────────────────────────────────────────

/** Canonical ACTION verb tuple. ALL-CAPS by convention. */
export const ACTION_VERBS = ["ADD", "COPY", "MOVE", "CLEAR", "DROP", "LOAD"] as const;
export type ActionVerb = typeof ACTION_VERBS[number];

const ACTION_VERB_SET: ReadonlySet<string> = new Set(ACTION_VERBS);

/** Type guard for ACTION verbs. */
export function isActionVerb(verb: string): verb is ActionVerb {
  return ACTION_VERB_SET.has(verb);
}

/** ACTION verbs that transfer a tiddler between bags (carry title + fromBag + toBag + changeId). */
export const TRANSFER_VERBS = ["ADD", "COPY", "MOVE"] as const;
export type TransferVerb = typeof TRANSFER_VERBS[number];
const TRANSFER_VERB_SET: ReadonlySet<string> = new Set(TRANSFER_VERBS);
export function isTransferVerb(verb: string): verb is TransferVerb {
  return TRANSFER_VERB_SET.has(verb);
}

/** ACTION verbs that operate on a whole bag (carry bag only). */
export const BAG_VERBS = ["CLEAR", "DROP"] as const;
export type BagVerb = typeof BAG_VERBS[number];
const BAG_VERB_SET: ReadonlySet<string> = new Set(BAG_VERBS);
export function isBagVerb(verb: string): verb is BagVerb {
  return BAG_VERB_SET.has(verb);
}

// ── ResidencyAction discriminated union ────────────────────────────────────

/** Common fields carried by every ACTION. */
interface ResidencyActionBase {
  readonly requestId:   string;
  readonly requestedBy: string;
}

/** ADD — grant title residency in toBag; fromBag retains its copy. */
export interface AddAction extends ResidencyActionBase {
  readonly verb:        "ADD";
  readonly title:       string;
  readonly fromBag:     string;
  readonly toBag:       string;
  readonly changeId:    string;
}

/** COPY — overwrite toBag's version of title with fromBag's; both keep history. */
export interface CopyAction extends ResidencyActionBase {
  readonly verb:        "COPY";
  readonly title:       string;
  readonly fromBag:     string;
  readonly toBag:       string;
  readonly changeId:    string;
}

/** MOVE — atomic ADD to toBag + CLEAR title from fromBag (transfer pair). */
export interface MoveAction extends ResidencyActionBase {
  readonly verb:        "MOVE";
  readonly title:       string;
  readonly fromBag:     string;
  readonly toBag:       string;
  readonly changeId:    string;
}

/** CLEAR — empty bag (preserve bag identity; effect log retained). */
export interface ClearAction extends ResidencyActionBase {
  readonly verb:        "CLEAR";
  readonly bag:         string;
}

/** DROP — retire bag entirely with disposition record. */
export interface DropAction extends ResidencyActionBase {
  readonly verb:        "DROP";
  readonly bag:         string;
}

/** LOAD — bring external content from sourceUri into toBag. Mints fresh changeId. */
export interface LoadAction extends ResidencyActionBase {
  readonly verb:        "LOAD";
  readonly sourceUri:   string;
  readonly toBag:       string;
  readonly changeId:    string;
}

export type ResidencyAction =
  | AddAction
  | CopyAction
  | MoveAction
  | ClearAction
  | DropAction
  | LoadAction;

// ── changeId factory ───────────────────────────────────────────────────────

/**
 * Mint a fresh changeId. Anti-pattern #1 defense: change-id stays stable across
 * ADD / COPY / MOVE so downstream tooling recognises "same change, different bag."
 * Callers MUST pass through an existing changeId when lifting a tiddler that
 * already carries one in another bag; only mint fresh on first-write or LOAD.
 *
 * Format mirrors verb-tiddler.newRequestId() — base-32 timestamp + 8-char random.
 */
export function newChangeId(): string {
  const ms = Date.now().toString(32).padStart(9, "0");
  let rand = "";
  for (let i = 0; i < 8; i++) rand += Math.floor(Math.random() * 32).toString(32);
  return `${ms}-${rand}`;
}

// ── Args field encoding ────────────────────────────────────────────────────
//
// ResidencyAction fields use camelCase (TypeScript convention).
// VerbInvocation.args fields use kebab-case (tiddler field convention).
// Mapping:
//   title       <-> "title"
//   fromBag     <-> "from-bag"
//   toBag       <-> "to-bag"
//   bag         <-> "bag"
//   sourceUri   <-> "source-uri"
//   changeId    <-> "change-id"

interface ResidencyArgs {
  readonly title?:       string;
  readonly "from-bag"?:  string;
  readonly "to-bag"?:    string;
  readonly bag?:         string;
  readonly "source-uri"?: string;
  readonly "change-id"?:  string;
}

/** Encode a ResidencyAction's verb-specific fields into the JSON args bag. */
export function encodeResidencyArgs(action: ResidencyAction): ResidencyArgs {
  switch (action.verb) {
    case "ADD":
    case "COPY":
    case "MOVE":
      return {
        title:        action.title,
        "from-bag":   action.fromBag,
        "to-bag":     action.toBag,
        "change-id":  action.changeId,
      };
    case "CLEAR":
    case "DROP":
      return { bag: action.bag };
    case "LOAD":
      return {
        "source-uri": action.sourceUri,
        "to-bag":     action.toBag,
        "change-id":  action.changeId,
      };
  }
}

// ── Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse a VerbInvocation into a ResidencyAction when the verb belongs to
 * ACTION_VERBS and all required args validate. Returns null otherwise.
 *
 * Validation rules:
 *   - verb MUST belong to ACTION_VERBS.
 *   - ADD / COPY / MOVE require title, from-bag, to-bag, change-id (all non-empty strings).
 *   - CLEAR / DROP require bag (non-empty string).
 *   - LOAD requires source-uri, to-bag, change-id (all non-empty strings).
 */
export function parseResidencyAction(inv: VerbInvocation): ResidencyAction | null {
  if (!isActionVerb(inv.verb)) return null;
  const args = inv.args as Readonly<Record<string, unknown>>;
  const base = { requestId: inv.requestId, requestedBy: inv.requestedBy };

  const str = (key: string): string | null => {
    const v = args[key];
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  if (isTransferVerb(inv.verb)) {
    const title    = str("title");
    const fromBag  = str("from-bag");
    const toBag    = str("to-bag");
    const changeId = str("change-id");
    if (!title || !fromBag || !toBag || !changeId) return null;
    return { ...base, verb: inv.verb, title, fromBag, toBag, changeId };
  }

  if (isBagVerb(inv.verb)) {
    const bag = str("bag");
    if (!bag) return null;
    return { ...base, verb: inv.verb, bag };
  }

  // verb === "LOAD" — only ActionVerb left after the two guards above.
  const sourceUri = str("source-uri");
  const toBag     = str("to-bag");
  const changeId  = str("change-id");
  if (!sourceUri || !toBag || !changeId) return null;
  return { ...base, verb: "LOAD", sourceUri, toBag, changeId };
}

// ── URI predicates (compose with verb-tiddler URI grammar) ─────────────────

/**
 * Recognise a tiddler URI that MAY carry an ACTION verb. The URI alone does
 * not confirm ACTION semantics — the tiddler's `verb` field decides. Use this
 * predicate to short-circuit obviously-non-action titles before parse.
 */
export function isResidencyActionUri(title: string): boolean {
  return title.startsWith(VERB_URI_PREFIX) || title.startsWith(VERB_SIGNAL_URI_PREFIX);
}
