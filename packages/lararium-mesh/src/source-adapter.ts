/**
 * source-adapter — the multi-app REWIND-HARDENING abstraction (pure, dependency-free).
 *
 * The kapae rewind/fork reconciliation was born Claude-Code-specific (gone-turns + the harvest tail).
 * Every AI app stores transcripts differently, but they split into two families:
 *
 *   - APPEND-ONLY / FORK  (Claude · Codex · Aider · Gemini · Copilot-CLI): a rewind ORPHANS-not-deletes
 *     — the rewound tail persists as an orphaned branch (in-file re-parent) or a new fork file. Nothing
 *     truly vanishes; the source is a corroborating co-keeper. `appendOnly = true`.
 *   - MUTABLE-TRUNCATE   (Cursor confirmed · Copilot-Chat disputed): a rewind HARD-DELETES the tail.
 *     We are the LAST KEEPER. `appendOnly = false`.
 *
 * kapae is UNIVERSAL either way — DOWN-WEIGHT + KEEP, NEVER delete. The `appendOnly` flag records
 * whether the source corroborates (⇒ the orphan is re-harvestable) or we hold the only copy (⇒ we are
 * the sole keeper). It gates the emit: re-harvest vs kapae (see {@link emitFor}).
 *
 * ## The pipeline (the contract every adapter feeds)
 *
 *   discover(files)            → group a fork-FAMILY of session files under one root
 *   currentBranch(records)     → the live leaf-chain (orphans excluded)
 *   identityLadder(rec, ctx)   → a session-namespaced key via the 4-rung ladder     [SHARED]
 *   linearBranch(records, hash)→ the whole-log branch for a linear append source    [SHARED]
 *   diffGone(prior, branch)    → the keys the branch no longer carries              [SHARED]
 *   classifyByShape(...)       → DELETE | TAIL_TRUNCATE | INTERIOR_DELETE | FORK    [SHARED]
 *   emitFor(kind, appendOnly)  → kapae | reharvest | fork                           [SHARED]
 *
 * The adapter supplies `discover · currentBranch · perAppSignal` and the `appendOnly` flag; the SHARED
 * free functions here supply the identity ladder, the linear-branch reconstruction, the diff, the
 * classify-by-shape, and the emit gate. A linear app (Codex / Copilot-CLI / Copilot-Chat) delegates
 * `currentBranch` to {@link linearBranch}; Claude-Code overrides it with its parentUuid DAG walk (the
 * one genuinely app-specific `currentBranch`).
 *
 * Pure + dependency-free (bundles beside gone-turns / branch-frontier). Content-hashing is INJECTED
 * (a `hash` fn on the identity context) so this module pulls no crypto — the node/CLI caller supplies
 * `node:crypto`; a TW5-VM caller supplies its own.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/rewind-adapter
 */

// ── Records & sessions ──────────────────────────────────────────────────────

/** One raw transcript record as an adapter reads it — the minimal cross-app shape. */
export interface AdapterRecord {
  /** The source-native turn id, when it carries one (rung 1). Null ⇒ fall down the ladder. */
  readonly uuid: string | null;
  /** The in-transcript parent id (the DAG link), or null at a root. */
  readonly parentUuid: string | null;
  /** The turn role — `user` / `assistant` (the same-type-sibling discriminant). */
  readonly role: string;
  /** The message text — the content-hash input (rung 3). */
  readonly text: string;
  /** True for a worker-swarm / sub-agent turn — filtered from the main branch. */
  readonly isSidechain: boolean;
  /** The session this record belongs to (namespaces every identity key). */
  readonly sessionId: string;
  /** A source-native stable ordinal (an event seq / monotonic index), when distinct from array pos (rung 2). */
  readonly nativeSeq?: number | string | null;
  /** The record's position in the session's append order (rung 2/4 fallback). */
  readonly index: number;
}

/** A fork-FAMILY: sessions sharing a root (a `--fork-session` / `/branch` lineage), plus their files. */
export interface SessionGroup {
  /** The shared root id the family branched from (a root uuid, or the eldest sessionId). */
  readonly rootKey: string;
  /** The member session ids, eldest → newest. */
  readonly sessionIds: readonly string[];
  /** The member transcript file paths (parallel to `sessionIds` when 1:1, else the family's files). */
  readonly files: readonly string[];
}

// ── The 4-rung identity ladder ──────────────────────────────────────────────

/** Which rung of the identity ladder produced a key — the drift-checkable provenance. */
export type IdentityRung = "native-uuid" | "session-index" | "content-hash" | "positional";

/** A normalized, session-namespaced turn identity + its parent link + the rung that made it. */
export interface TurnIdentity {
  readonly key: string;
  readonly parentKey: string | null;
  readonly rung: IdentityRung;
}

/** The per-session folding context the ladder threads (occurrence counts for content-hash tie-break). */
export interface IdentityContext {
  readonly sessionId: string;
  /** The injected content hasher (`node:crypto` for the CLI; a VM hasher in-worker). */
  readonly hash: (s: string) => string;
  /** Occurrence counter for identical (role‖text) — folds the content-hash OFFSET (rung 3 tie-break). */
  readonly seen: Map<string, number>;
}

/** Make a fresh {@link IdentityContext} for one session's fold. */
export function makeIdentityContext(sessionId: string, hash: (s: string) => string): IdentityContext {
  return { sessionId, hash, seen: new Map<string, number>() };
}

/** Normalize whitespace for content-hashing — the byte-fragile spans (indent, trailing ws) drop out. */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const NS = "\u0000"; // the session-namespace separator (never appears in an id / normalized text)

/**
 * The 4-RUNG IDENTITY LADDER — session-namespaced, carrying the parent link. Picks the FIRST rung the
 * record affords, most-stable first:
 *
 *   1. native-uuid    — `<session>\0<uuid>`                    (the source's own turn id)
 *   2. session-index  — `<session>\0#<nativeSeq>`              (a native monotonic ordinal, uuid absent)
 *   3. content-hash   — `<session>\0h:<hash(role‖text)>#<occ>` (content identity + occurrence OFFSET)
 *   4. positional     — `<session>\0@<index>`                  (last resort: bare array position)
 *
 * The parent link normalizes to the SAME namespace by uuid when present (the DAG is uuid-linked at
 * rungs where uuids exist); absent a parent uuid, `parentKey` is null (the shape walk uses record order).
 */
export function identityLadder(rec: AdapterRecord, ctx: IdentityContext): TurnIdentity {
  const ns = ctx.sessionId || rec.sessionId || "?";
  const parentKey = rec.parentUuid ? `${ns}${NS}${rec.parentUuid}` : null;

  if (rec.uuid) {
    return { key: `${ns}${NS}${rec.uuid}`, parentKey, rung: "native-uuid" };
  }
  if (rec.nativeSeq != null && rec.nativeSeq !== "") {
    return { key: `${ns}${NS}#${rec.nativeSeq}`, parentKey, rung: "session-index" };
  }
  const norm = normalizeText(rec.text);
  if (norm) {
    const h = ctx.hash(`${rec.role}${NS}${norm}`);
    const occ = ctx.seen.get(h) ?? 0;
    ctx.seen.set(h, occ + 1);
    return { key: `${ns}${NS}h:${h}#${occ}`, parentKey, rung: "content-hash" };
  }
  return { key: `${ns}${NS}@${rec.index}`, parentKey, rung: "positional" };
}

/**
 * The LINEAR-BRANCH reconstruction — the current branch for an append-only LINEAR source (Codex ·
 * Copilot-CLI · Copilot-Chat): the source never edits an earlier line and has no in-file re-parent, so
 * every kept record IS on the live branch, in order. Keys ride {@link identityLadder} (which owns the
 * session-namespace separator) — never a hand-typed separator. Claude-Code overrides this with its
 * parentUuid DAG walk (the one genuinely app-specific `currentBranch`); every linear adapter delegates
 * here, passing only its own content-hasher.
 */
export function linearBranch(records: readonly AdapterRecord[], hash: (s: string) => string): string[] {
  const sessionId = records[0]?.sessionId ?? "?";
  const ctx = makeIdentityContext(sessionId, hash);
  return records.map((rec) => identityLadder(rec, ctx).key);
}

// ── Diff · classify · emit (shared) ─────────────────────────────────────────

/** The four rewind shapes the shared classifier distinguishes. */
export type RewindClass = "DELETE" | "TAIL_TRUNCATE" | "INTERIOR_DELETE" | "FORK";

/** What a finding emits downstream. */
export type RewindEmit = "kapae" | "reharvest" | "fork";

/** The per-app signal the adapter contributes to the classify step. */
export interface PerAppSignal {
  /** A NEW fork sibling appeared (a new-file `--fork-session`, or an in-file same-type divergence). */
  readonly hasNewSibling: boolean;
  /** The root the new sibling branched from (FORK findings carry it forward). */
  readonly forkRootKey?: string | null;
  /** Optional adapter note for the audit trail. */
  readonly note?: string;
}

/** A reconciled rewind finding — the classified shape, the emit, and the keys to set aside. */
export interface RewindFinding {
  readonly kind: RewindClass;
  readonly emit: RewindEmit;
  readonly goneKeys: readonly string[];
  readonly forkRootKey?: string | null;
}

/** The keys `prior` holds that the reconstructed `currentBranch` no longer carries (order = prior). */
export function diffGone(prior: readonly string[], currentBranch: Iterable<string>): string[] {
  const live = new Set<string>();
  for (const k of currentBranch) if (k) live.add(k);
  const gone: string[] = [];
  const seen = new Set<string>();
  for (const k of prior) {
    if (!k || seen.has(k)) continue;
    seen.add(k);
    if (!live.has(k)) gone.push(k);
  }
  return gone;
}

/** True when `gone` occupies exactly the CONTIGUOUS SUFFIX of `prior` (a clean tail truncation). */
function goneIsContiguousTail(prior: readonly string[], gone: readonly string[]): boolean {
  if (gone.length === 0 || gone.length > prior.length) return false;
  const goneSet = new Set(gone);
  // The last `gone.length` positions of `prior` must be EXACTLY the gone set.
  for (let i = 0; i < prior.length; i++) {
    const inTail = i >= prior.length - gone.length;
    if (goneSet.has(prior[i]!) !== inTail) return false;
  }
  return true;
}

/**
 * CLASSIFY BY SHAPE — pure, shared across every adapter. Reads WHERE the gone keys sit in the prior
 * branch order and the adapter's per-app signal:
 *
 *   - `hasNewSibling`                    → FORK           (a divergent branch was authored)
 *   - all of prior gone                  → DELETE         (the whole prior branch vanished)
 *   - gone == a contiguous suffix        → TAIL_TRUNCATE  (the classic /rewind of the tail)
 *   - gone is an interior hole           → INTERIOR_DELETE (a middle span removed — mutable sources)
 *   - nothing gone                       → null           (no rewind)
 *
 * `prior` MUST be in root→leaf order for the tail/interior distinction; an unordered `prior` still
 * classifies DELETE and FORK correctly (only the tail-vs-interior split needs the order).
 */
export function classifyByShape(opts: {
  readonly prior: readonly string[];
  readonly currentBranch: readonly string[];
  readonly signal: PerAppSignal;
}): { kind: RewindClass; goneKeys: string[] } | null {
  const { prior, currentBranch, signal } = opts;
  const gone = diffGone(prior, currentBranch);
  if (gone.length === 0) return null;
  if (signal.hasNewSibling) return { kind: "FORK", goneKeys: gone };
  if (gone.length === prior.length) return { kind: "DELETE", goneKeys: gone };
  if (goneIsContiguousTail(prior, gone)) return { kind: "TAIL_TRUNCATE", goneKeys: gone };
  return { kind: "INTERIOR_DELETE", goneKeys: gone };
}

/**
 * The EMIT GATE — `appendOnly` decides re-harvest vs kapae:
 *   - FORK                              → `fork`      (harvest the new sibling as a new branch; the old
 *                                                      tail still down-weights via kapae downstream)
 *   - any truncate/delete, appendOnly   → `reharvest` (the source keeps the orphan → re-harvestable)
 *   - any truncate/delete, mutable      → `kapae`     (WE are the last keeper → down-weight + KEEP)
 *
 * kapae's set-aside is UNIVERSAL regardless of the emit word; the word names what the reconciler does
 * with the SOURCE copy, not whether the drawer is kept (it always is).
 */
export function emitFor(kind: RewindClass, appendOnly: boolean): RewindEmit {
  if (kind === "FORK") return "fork";
  return appendOnly ? "reharvest" : "kapae";
}

/** Assemble a full {@link RewindFinding} from the classified shape + the adapter's `appendOnly` flag. */
export function reconcileFinding(
  classified: { kind: RewindClass; goneKeys: string[] } | null,
  appendOnly: boolean,
  signal: PerAppSignal,
): RewindFinding | null {
  if (!classified) return null;
  return {
    kind: classified.kind,
    emit: emitFor(classified.kind, appendOnly),
    goneKeys: classified.goneKeys,
    ...(signal.forkRootKey ? { forkRootKey: signal.forkRootKey } : {}),
  };
}

// ── The adapter contract ────────────────────────────────────────────────────

/**
 * A per-app SOURCE ADAPTER. Supplies the app-specific reads; the shared free functions above supply
 * the identity ladder, the diff, the classify, and the emit gate. `appendOnly` gates the emit.
 */
export interface SourceAdapter {
  /** The app name (`claude-code`, `codex`, `copilot-cli`, `copilot-chat`, …). */
  readonly name: string;
  /** APPEND-ONLY (orphans kept, re-harvestable) vs MUTABLE-TRUNCATE (hard-delete, we are last keeper). */
  readonly appendOnly: boolean;
  /** Group session files into fork-FAMILIES (a shared-root lineage under one {@link SessionGroup}). */
  discover(sessionFiles: readonly string[]): SessionGroup[];
  /**
   * Reconstruct the current-branch leaf-chain (root→leaf KEYS) from a session's records. A linear source
   * delegates to {@link linearBranch}; Claude-Code overrides with its parentUuid DAG walk.
   */
  currentBranch(records: readonly AdapterRecord[]): string[];
  /** The per-app signal for the classify step (in-file re-parent vs new-file fork, etc.). */
  perAppSignal(records: readonly AdapterRecord[], prior: readonly string[]): PerAppSignal;
}

/**
 * The end-to-end reconcile for one session's records against its prior index keys — the shared driver
 * every adapter rides. Returns null when nothing rewound.
 */
export function analyzeSession(
  adapter: SourceAdapter,
  params: { readonly records: readonly AdapterRecord[]; readonly prior: readonly string[] },
): RewindFinding | null {
  const { records, prior } = params;
  const currentBranch = adapter.currentBranch(records);
  const signal = adapter.perAppSignal(records, prior);
  const classified = classifyByShape({ prior, currentBranch, signal });
  return reconcileFinding(classified, adapter.appendOnly, signal);
}
