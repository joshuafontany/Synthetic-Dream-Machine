/**
 * residency-actions — SPARQL-derived ALL-CAPS ACTION verbs for the residency
 * model. Operator gestures over multi-bag tiddler residency.
 *
 * The ACTION verb surface composes ON TOP of verb-tiddler.ts (M.2 pipeline).
 * An ACTION arrives as a Verb whose `verb` field carries one of
 * ACTION_VERBS; per-verb arguments ride inside the existing JSON `args` field.
 * No new URI prefix exists for actions — they reuse:
 *
 *   VERB_URI_PREFIX         volatile local invocation (daemon VM scratch)
 *   SUMMONS_URI_PREFIX  Automerge-backed remote vessel signal
 *   OUTCOME_URI_PREFIX Automerge-backed durable outcome
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
 * Meme:    lar:///ha.ka.ba/lararium/api/residency-model
 * Source:  packages/lararium-mesh/src/residency-actions.ts
 */

import {
  VERB_URI_PREFIX, SUMMONS_URI_PREFIX,
} from "./verb-tiddler.js";
import type { Verb } from "./verb-tiddler.js";

// ── ACTION verb set ────────────────────────────────────────────────────────

/** Canonical ACTION verb tuple. ALL-CAPS by convention. */
export const ACTION_VERBS = ["ADD", "COPY", "MOVE", "CLEAR", "DROP", "LOAD", "INGEST", "CREATE"] as const;
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

/** CREATE — mint a NEW empty bag at `bag` (fresh AutomergeUrl), register it in
 *  the plane's registry. `plane` designates the authority root: `catalog`
 *  (user/household plane, default) vs `oracle` (system/temple plane). The cap-gate
 *  reads the plane (read@catalog / admin@oracle). */
export interface CreateAction extends ResidencyActionBase {
  readonly verb:        "CREATE";
  readonly bag:         string;
  readonly plane:       "catalog" | "oracle";
}

/** One carrier of external content riding a LOAD verb. The operator-side
 *  gesture (which holds the disk/fetch grant) reads the source and sends the
 *  content WITH the verb — eventual-send, no island reach-back. `title` is
 *  optional when the carrier's own iam block names its uri-path. */
export interface LoadCarrier {
  readonly title?: string;
  /** File extension (e.g. ".mem", ".tid", ".json") — lets the island route a
   *  non-memetic carrier through TW5's own deserializer registry by content-type.
   *  Absent → the island treats the text as a memetic-wikitext carrier. */
  readonly ext?:   string;
  /** The carrier body. A verb NEVER inlines a body: the operator gesture stages it
   *  to the corpus CAS and rides `textCid` instead. `text` stays for a small in-line
   *  carrier and for backward-compat (the island resolves `textCid` → `text` before
   *  use). Exactly one of `text` / `textCid` MUST hold. */
  readonly text?:  string;
  /** Content-address (hex sha256) of the carrier body staged in the corpus CAS.
   *  The island resolves it via `resolveByCid` and re-verifies `cid == hash(bytes)`
   *  — content-addressed trust, no host trust. This keeps the giant Text out of the
   *  daemon command doc (the automerge scalar-string capacity wall). */
  readonly textCid?: string;
  /** Raw `.meta` sidecar text for a content filetype (a `.md`/image/… carrier
   *  keeps its fields beside the body). The island parses it (TW5's own field
   *  parser) and seeds the deserialize, so an edit to the body never drops the
   *  sidecar's type/tags/custom fields. Absent → no sidecar. */
  readonly meta?:  string;
  /** The body's byte length — metadata; the body lives in the CAS. Lets the island decide
   *  skinny-vs-inline WITHOUT resolving the bytes. */
  readonly size?:  number;
  /** The gesture flags an OVERSIZED RAW shard: the island writes a skinny handle (cid +
   *  integrity, no body) rather than materialize the body as a CRDT text field
   *  (content-resolution.mem Scenario B). */
  readonly skinny?: boolean;
}

/** LOAD — bring external content from sourceUri into toBag. Mints fresh changeId.
 *  `sourceUri` carries provenance for the audit trail; the CONTENT rides in
 *  `carriers` (islands hold no fetch capability — web3-only law: no reach-out). */
export interface LoadAction extends ResidencyActionBase {
  readonly verb:        "LOAD";
  readonly sourceUri:   string;
  readonly toBag:       string;
  readonly changeId:    string;
  readonly carriers?:   readonly LoadCarrier[];
}

/** One carrier riding an INGEST verb — the Confluence triangle's inputs travel WITH
 *  the content: the gesture (which holds the disk grant + the Synced tree)
 *  computes diskHash and reads syncedHash; the island computes only the
 *  currentRenderHash from its own merge seat (readiness reads local). */
export interface IngestCarrier {
  /** The carrier-root lar: URI this disk path projects. */
  readonly uri:        string;
  /** The settled carrier body (quiet + stat-stable + hash-confirmed by the gesture).
   *  A verb NEVER inlines a body: the gesture stages it to the corpus CAS and rides
   *  `textCid` instead. `text` stays for backward-compat (the island resolves
   *  `textCid` → `text` before the Confluence gate). Exactly one of `text` /
   *  `textCid` MUST hold. */
  readonly text?:      string;
  /** Content-address (hex sha256) of the carrier body staged in the corpus CAS. The
   *  island resolves it via `resolveByCid` and re-verifies `cid == hash(bytes)`. This
   *  keeps a 16MB carrier out of the daemon command doc, whose automerge scalar-string
   *  value overflows past ~2^24 chars. */
  readonly textCid?:   string;
  /** Hash of text, computed gesture-side. */
  readonly diskHash:   string;
  /** Last-projected hash from the Synced tree; null = never projected. */
  readonly syncedHash: string | null;
  /** The carrier's file extension (".mem" / ".tid" / ".json" / ".md" …) as the
   *  gesture read it from disk. The island routes by it: a memetic carrier (SOH
   *  heading / `.mem`) decomposes at the memetic shore; any other legal TW5
   *  filetype rides TW5's OWN deserializer registry, keyed by this extension.
   *  Absent → the island treats the carrier as memetic (back-compat). */
  readonly ext?:       string;
  /** Raw `.meta` sidecar text a content filetype keeps beside its body; the
   *  island parses it and seeds the deserialize so a body-only edit never drops
   *  the sidecar's fields. Absent → no sidecar (or a self-contained filetype). */
  readonly meta?:      string;
  /** The body's byte length — metadata; the body lives in the CAS. Lets the island decide
   *  skinny-vs-inline WITHOUT resolving the bytes. */
  readonly size?:      number;
  /** The gesture flags an OVERSIZED RAW shard: the island writes a skinny handle (cid +
   *  integrity, no body) rather than materialize the body as a CRDT text field
   *  (content-resolution.mem Scenario B). */
  readonly skinny?:    boolean;
}

/** One vanished carrier riding an INGEST wave — a path gone from disk that the
 *  Synced tree still projects. The watcher confirms it (grace window + scan)
 *  before it rides; the gate splits the wave into renames vs tombstones. */
export interface IngestDeletion {
  /** The carrier-root lar: URI absent from disk, present in the Synced tree. */
  readonly uri:        string;
  /** Its last-projected canonical hash (the Synced tree value). */
  readonly syncedHash: string;
}

/** INGEST — disk → records through the Confluence gate, replace-by-group apply.
 *  LOAD lands unconditionally and never removes; INGEST decides (echo-noop ·
 *  refuse · canonical-equivalent · ingest · conflict) and tombstones group
 *  members that vanished from the re-parsed carrier. A wave MAY also carry
 *  whole-carrier `deletions` (vanished files): the gate re-links unique
 *  hash-matched renames and tombstones the rest, under a mass-delete brake. */
export interface IngestAction extends ResidencyActionBase {
  readonly verb:      "INGEST";
  readonly sourceUri: string;
  readonly toBag:     string;
  readonly changeId:  string;
  readonly carriers:  readonly IngestCarrier[];
  readonly deletions?: readonly IngestDeletion[];
  /** Operator dial (0,1]: a wave whose tombstones exceed this fraction of the
   *  bag's carriers SUSPENDS (mass-delete brake). Absent → island default. */
  readonly massDeleteFraction?: number;
}

export type ResidencyAction =
  | AddAction
  | CopyAction
  | MoveAction
  | ClearAction
  | DropAction
  | LoadAction
  | IngestAction
  | CreateAction;

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
// Verb.args fields use kebab-case (tiddler field convention).
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
  readonly carriers?:    readonly LoadCarrier[];
  readonly plane?:       "catalog" | "oracle";
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
    case "CREATE":
      return { bag: action.bag, plane: action.plane };
    case "LOAD":
      return {
        "source-uri": action.sourceUri,
        "to-bag":     action.toBag,
        "change-id":  action.changeId,
        ...(action.carriers ? { carriers: action.carriers } : {}),
      };
    case "INGEST":
      return {
        "source-uri": action.sourceUri,
        "to-bag":     action.toBag,
        "change-id":  action.changeId,
        carriers:     action.carriers,
        ...(action.deletions ? { deletions: action.deletions } : {}),
        ...(action.massDeleteFraction !== undefined ? { massDeleteFraction: action.massDeleteFraction } : {}),
      };
  }
}

// ── Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse a Verb into a ResidencyAction when the verb belongs to
 * ACTION_VERBS and all required args validate. Returns null otherwise.
 *
 * Validation rules:
 *   - verb MUST belong to ACTION_VERBS.
 *   - ADD / COPY / MOVE require title, from-bag, to-bag, change-id (all non-empty strings).
 *   - CLEAR / DROP require bag (non-empty string).
 *   - LOAD requires source-uri, to-bag, change-id (all non-empty strings).
 */
export function parseResidencyAction(inv: Verb): ResidencyAction | null {
  if (!isActionVerb(inv.action)) return null;
  const args = inv.args as Readonly<Record<string, unknown>>;
  const base = { requestId: inv.requestId, requestedBy: inv.requestedBy };

  const str = (key: string): string | null => {
    const v = args[key];
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  if (isTransferVerb(inv.action)) {
    const title    = str("title");
    const fromBag  = str("from-bag");
    const toBag    = str("to-bag");
    const changeId = str("change-id");
    if (!title || !fromBag || !toBag || !changeId) return null;
    return { ...base, verb: inv.action, title, fromBag, toBag, changeId };
  }

  if (isBagVerb(inv.action)) {
    const bag = str("bag");
    if (!bag) return null;
    return { ...base, verb: inv.action, bag };
  }

  if (inv.action === "INGEST") {
    const sourceUri = str("source-uri");
    const toBag     = str("to-bag");
    const changeId  = str("change-id");
    if (!sourceUri || !toBag || !changeId) return null;
    const carriers: IngestCarrier[] = [];
    const rawCarriers = args["carriers"];
    if (rawCarriers !== undefined) {
      if (!Array.isArray(rawCarriers)) return null;
      for (const c of rawCarriers) {
        if (!c || typeof c !== "object") return null;
        const o = c as Record<string, unknown>;
        const uri = o["uri"]; const text = o["text"]; const textCid = o["textCid"]; const diskHash = o["diskHash"]; const syncedHash = o["syncedHash"]; const ext = o["ext"]; const meta = o["meta"]; const size = o["size"]; const skinny = o["skinny"];
        if (typeof uri !== "string" || !uri) return null;
        // A verb NEVER inlines a body: a carrier rides EITHER an inline `text` OR a
        // corpus-CAS `textCid`, never neither. The island resolves the ref before the gate.
        const hasText = typeof text === "string" && text.length > 0;
        const hasCid  = typeof textCid === "string" && textCid.length > 0;
        if (!hasText && !hasCid) return null;
        if (typeof diskHash !== "string" || !diskHash) return null;
        if (syncedHash !== null && typeof syncedHash !== "string") return null;
        if (ext !== undefined && typeof ext !== "string") return null;
        if (meta !== undefined && typeof meta !== "string") return null;
        if (size !== undefined && typeof size !== "number") return null;
        if (skinny !== undefined && typeof skinny !== "boolean") return null;
        carriers.push({ uri, ...(hasText ? { text: text as string } : {}), ...(hasCid ? { textCid: textCid as string } : {}), diskHash, syncedHash: syncedHash as string | null, ...(typeof ext === "string" ? { ext } : {}), ...(typeof meta === "string" ? { meta } : {}), ...(typeof size === "number" ? { size } : {}), ...(skinny === true ? { skinny: true } : {}) });
      }
    }
    const deletions: IngestDeletion[] = [];
    const rawDeletions = args["deletions"];
    if (rawDeletions !== undefined) {
      if (!Array.isArray(rawDeletions)) return null;
      for (const d of rawDeletions) {
        if (!d || typeof d !== "object") return null;
        const o = d as Record<string, unknown>;
        const uri = o["uri"]; const syncedHash = o["syncedHash"];
        if (typeof uri !== "string" || !uri) return null;
        if (typeof syncedHash !== "string" || !syncedHash) return null;
        deletions.push({ uri, syncedHash });
      }
    }
    // A wave MUST carry at least one carrier or one deletion.
    if (carriers.length === 0 && deletions.length === 0) return null;
    const fracRaw = args["massDeleteFraction"];
    const massDeleteFraction = typeof fracRaw === "number" && fracRaw > 0 && fracRaw <= 1 ? fracRaw : undefined;
    return {
      ...base, verb: "INGEST", sourceUri, toBag, changeId, carriers,
      ...(deletions.length > 0 ? { deletions } : {}),
      ...(massDeleteFraction !== undefined ? { massDeleteFraction } : {}),
    };
  }

  if (inv.action === "CREATE") {
    const bag = str("bag");
    if (!bag) return null;
    // PLANE DECLARATION (by designation): default catalog; explicit "oracle" signal
    // designates the system/temple plane. TODO(name): plane-signal name co-designed
    // with the operator (the `--plane` flag below is a provisional placeholder).
    const plane = str("plane") === "oracle" ? "oracle" : "catalog";
    return { ...base, verb: "CREATE", bag, plane };
  }

  // verb === "LOAD" — only ActionVerb left after the guards above.
  const sourceUri = str("source-uri");
  const toBag     = str("to-bag");
  const changeId  = str("change-id");
  if (!sourceUri || !toBag || !changeId) return null;

  // Optional carriers — each MUST hold a non-empty text; a malformed carrier
  // rejects the whole action (no partial-trust ingest).
  const rawCarriers = args["carriers"];
  let carriers: LoadCarrier[] | undefined;
  if (rawCarriers !== undefined) {
    if (!Array.isArray(rawCarriers)) return null;
    carriers = [];
    for (const c of rawCarriers) {
      if (!c || typeof c !== "object") return null;
      const text    = (c as Record<string, unknown>)["text"];
      const textCid = (c as Record<string, unknown>)["textCid"];
      const title   = (c as Record<string, unknown>)["title"];
      const ext     = (c as Record<string, unknown>)["ext"];
      const meta    = (c as Record<string, unknown>)["meta"];
      const size    = (c as Record<string, unknown>)["size"];
      const skinny  = (c as Record<string, unknown>)["skinny"];
      // EITHER an inline `text` OR a corpus-CAS `textCid` — never neither.
      const hasText = typeof text === "string" && text.length > 0;
      const hasCid  = typeof textCid === "string" && textCid.length > 0;
      if (!hasText && !hasCid) return null;
      if (title !== undefined && typeof title !== "string") return null;
      if (ext !== undefined && typeof ext !== "string") return null;
      if (meta !== undefined && typeof meta !== "string") return null;
      if (size !== undefined && typeof size !== "number") return null;
      if (skinny !== undefined && typeof skinny !== "boolean") return null;
      carriers.push({
        ...(typeof title === "string" && title ? { title } : {}),
        ...(typeof ext === "string" && ext ? { ext } : {}),
        ...(typeof meta === "string" && meta ? { meta } : {}),
        ...(hasText ? { text: text as string } : {}),
        ...(hasCid ? { textCid: textCid as string } : {}),
        ...(typeof size === "number" ? { size } : {}),
        ...(skinny === true ? { skinny: true } : {}),
      });
    }
  }
  return { ...base, verb: "LOAD", sourceUri, toBag, changeId, ...(carriers ? { carriers } : {}) };
}

// ── URI predicates (compose with verb-tiddler URI grammar) ─────────────────

/**
 * Recognise a tiddler URI that MAY carry an ACTION verb. The URI alone does
 * not confirm ACTION semantics — the tiddler's `verb` field decides. Use this
 * predicate to short-circuit obviously-non-action titles before parse.
 */
export function isResidencyActionUri(title: string): boolean {
  return title.startsWith(VERB_URI_PREFIX) || title.startsWith(SUMMONS_URI_PREFIX);
}
