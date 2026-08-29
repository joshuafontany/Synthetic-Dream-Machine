/**
 * boot-resolver — tideline-class-aware boot-time required-doc resolver.
 *
 * The split-brain-safe replacement for a create-blank fallback on CANONICALLY-
 * ADDRESSED required docs. It NEVER mints a fresh id for a doc that already
 * carries a canonical url (that births a ghost documentId no peer ever syncs —
 * a fork on the causal island). It branches on which side of the tideline the
 * doc lives, read from automerge-repo's own availability signal (findWithProgress
 * state), never a blind wall-clock race used as an existence oracle:
 *   - hearth-private: never crosses the tideline (social plane, catalog) — no
 *     peer will ever carry it, so an UNAVAILABLE ANSWER is terminal -> FAIL LOUD.
 *     A DEADLINE is a separate verdict and says nothing about the store: the
 *     library never answered, so nothing established damage (`bootFaultVerdict`).
 *   - mesh-shared: rides the magically-federated mesh (base canon, wikis) —
 *     UNAVAILABLE may just mean "not delivered yet" -> WAIT for READY up to
 *     scale-graced patience, then surface a typed StillJoining (never a blank).
 *
 * Stable-bytes origins (the genesis island — reconstructable locally with a
 * shared id) keep their own genesisHandle fallback; they do not route here.
 *
 * Lives in @lararium/mesh so the vessel keel (open-vessel-core) AND both vessel
 * openers reach it — mesh cannot import the node package.
 */

import type { AutomergeUrl, DocHandle, Repo } from "@automerge/automerge-repo";
import type { MeshScale } from "./lar-uris.js";

/** Which side of the tideline a required boot doc lives on. */
export type Tideline = "hearth-private" | "mesh-shared";

// Patience graded by source scale: a wider scale traverses more of the mesh, so a
// transient UNAVAILABLE is more expected — wait longer before surfacing. Graceful
// starting bands; the 5-scale source-determination + tuning is forging-ahead
// (CabalGroup/NexusGroup/DreamNet not yet built) — an undeterminable scale defaults
// to the widest patience so a slow-but-real delivery never reads as missing.
const SCALE_PATIENCE_MS: Record<MeshScale, number> = {
  vessel:         3_000,
  "persona-group": 8_000,
  cabal:          20_000,
  nexus:          45_000,
  dreamnet:       90_000,
};
const HEARTH_READY_MS = 3_000;

/**
 * A mesh-shared required doc that has not arrived within its scale-patience.
 * NOT an error and NOT a blank — a typed signal that the doc still joins the
 * mesh. The caller degrades gracefully and reconciles in the background once a
 * peer at this scale delivers it (the never-invent-a-blank doctrine carried
 * past boot, instead of a thrown error the joiner would have to catch).
 */
export interface StillJoining {
  readonly stillJoining: true;
  readonly scale: MeshScale;
  readonly label: string;
  readonly url: AutomergeUrl;
  readonly waitedMs: number;
}

/** Narrow a resolveBootDoc result to the still-joining signal. */
export function isStillJoining<T>(r: DocHandle<T> | StillJoining): r is StillJoining {
  return (r as Partial<StillJoining>).stillJoining === true;
}

/**
 * A boot fault's verdict — one condition, named as observed.
 *
 * TWO PATHS REACH A FAILED BOOT RESOLVE, and only one of them knows anything about the store. A TERMINAL
 * answer (`unavailable`/`failed`) is the library saying no peer will ever carry this; a DEADLINE is our own
 * patience expiring while the library said nothing at all.
 *
 * Reporting both as "local corruption" spends the operator's data to save a branch: that wording hands over
 * `rite rebirth`, which composes stop · clear · bake · stand · seed — so a vessel merely SLOW to resolve
 * under load gets told to destroy a store that was never damaged. Measured exactly so: the mesh's hearth
 * died this way beside three siblings on a stable document id, and stood clean the moment it booted alone.
 *
 * A timeout's honest first cure costs nothing — read again. Keep the destructive one for the reading that
 * actually establishes an empty store.
 */
export interface BootFaultVerdict {
  /** A branch token, stable across wordings. */
  readonly reason:  "doc-unavailable" | "resolve-timeout";
  /** What a human reads — and the only place prose belongs. */
  readonly message: string;
}

export function bootFaultVerdict(
  obs: { reason: "terminal" | "deadline"; label: string; url: string; waitedMs?: number },
): BootFaultVerdict {
  const where = `${obs.label} (${obs.url})`;
  if (obs.reason === "terminal") {
    return {
      reason:  "doc-unavailable",
      // WHAT THIS BRANCH KNOWS, AND WHAT IT DOES NOT. The library answered UNAVAILABLE: no reachable
      // copy, here or on any peer. It did NOT read the store, so it cannot say the store holds the
      // doc — and the earlier wording said exactly that, then handed over a rite composing
      // stop · clear · bake · stand · seed. Measured: a vessel with SIX healthy documents, the named
      // id among none of them, cured by deleting one stale pointer file.
      //
      // So the cheap cure leads and the destructive one is named as last. A message that asserts more
      // than its branch established spends an operator's store to sound certain.
      message: `[boot] ${where} — no reachable copy: this vessel's store did not answer with it, `
             + "and no peer carries it. Read the store first with `lares vessel read vessel` — if that "
             + "id is ABSENT there, a POINTER OUTLIVED ITS DOCUMENT and clearing the pointer is the whole "
             + "cure. `lares vessel rite rebirth` rebuilds the vessel and is the LAST resort, for a store "
             + "that reads damaged.",
    };
  }
  return {
    reason:  "resolve-timeout",
    message: `[boot] ${where} did not resolve within ${obs.waitedMs ?? 0}ms — this names THIS BOOT'S patience, `
           + "never the store's health, so nothing here has established damage. Stand again; a vessel under "
           + "load from its peers commonly resolves on a second reading.",
  };
}

// hearth-private resolves to a handle or throws (fail loud — no peer carries it);
// mesh-shared resolves to a handle or a typed StillJoining (never throws on
// absence). The overloads keep existing hearth-private callers on the un-widened
// DocHandle return — only mesh-shared consumers narrow the union.
export function resolveBootDoc<T>(
  repo: Repo, url: AutomergeUrl,
  opts: { tideline: "hearth-private"; label: string; scale?: MeshScale },
): Promise<DocHandle<T>>;
export function resolveBootDoc<T>(
  repo: Repo, url: AutomergeUrl,
  opts: { tideline: "mesh-shared"; label: string; scale?: MeshScale },
): Promise<DocHandle<T> | StillJoining>;
export async function resolveBootDoc<T>(
  repo: Repo,
  url: AutomergeUrl,
  opts: { tideline: Tideline; label: string; scale?: MeshScale },
): Promise<DocHandle<T> | StillJoining> {
  const scale = opts.scale ?? "dreamnet";
  const q = repo.findWithProgress<T>(url);
  const deadlineMs = opts.tideline === "hearth-private"
    ? HEARTH_READY_MS
    : SCALE_PATIENCE_MS[scale];

  // The handle rides the READY QueryState (whenReady resolves to it; subscribe carries
  // it on the ready transition). Watch BOTH: whenReady() catches an already-ready doc;
  // subscribe catches a later READY after a transient UNAVAILABLE (the mesh-shared case).
  // A doc never births here — on timeout we resolve null and branch by tideline.
  let terminal = false;
  const handle = await new Promise<DocHandle<T> | null>((resolve) => {
    let settled = false;
    const finish = (h: DocHandle<T> | null) => { if (!settled) { settled = true; resolve(h); } };
    const unsub = q.subscribe((s) => {
      if (s.state === "ready") { unsub(); finish(s.handle); return; }
      // hearth-private never crosses the tideline — UNAVAILABLE is the library's terminal
      // answer (no peer will ever carry it), so fail FAST on the signal, not the backstop.
      // mesh-shared keeps waiting: UNAVAILABLE there is transient (the mesh may still deliver).
      if (opts.tideline === "hearth-private" && (s.state === "unavailable" || s.state === "failed")) {
        terminal = true;   // the library ANSWERED — distinct from our patience expiring below
        unsub(); finish(null);
      }
    });
    q.whenReady().then((h) => { unsub(); finish(h as DocHandle<T>); }).catch(() => { /* settled via subscribe/timeout */ });
    setTimeout(() => { unsub(); finish(null); }, deadlineMs);
  });
  if (handle) return handle;

  if (opts.tideline === "hearth-private") {
    // THE VERDICT NAMES THE PATH TAKEN. `terminal` means the library answered; otherwise the deadline
    // expired and the store never spoke — two conditions that once shared one destructive wording.
    const v = bootFaultVerdict({
      reason: terminal ? "terminal" : "deadline",
      label: opts.label, url, waitedMs: deadlineMs,
    });
    throw Object.assign(new Error(v.message), { reason: v.reason });
  }
  // mesh-shared: never throw, never blank — surface the typed still-joining signal
  // so the joiner proceeds and reconciles in the background.
  return { stillJoining: true, scale, label: opts.label, url, waitedMs: deadlineMs };
}
