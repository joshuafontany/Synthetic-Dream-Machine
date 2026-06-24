/**
 * Repo helpers shared between VM openers.
 *
 * waitHandleLocal: race whenReady() against a short fallback so a
 * repo.find() against an URL the local store doesn't yet have doesn't hang
 * boot. Used by both openNodeVessel (wiki VM) and openAdminVm (admin VM).
 */

import type { AutomergeUrl, DocHandle, Repo } from "@automerge/automerge-repo";

const LOCAL_READY_MS = 3000;

export async function waitHandleLocal<T>(
  repo: Repo,
  url: AutomergeUrl,
  fallbackFn: () => DocHandle<T>,
): Promise<DocHandle<T>> {
  // automerge-repo 2.6: findWithProgress().whenReady() resolves the handle when
  // READY and rejects on unavailable (the old progress.handle accessor is gone).
  // Race local readiness against a short fallback so boot doesn't hang on a doc
  // the local store doesn't have yet.
  const progress = repo.findWithProgress<T>(url);
  const ready = await Promise.race([
    progress.whenReady().then((h) => h).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), LOCAL_READY_MS)),
  ]);
  if (ready) return ready;
  const fresh = fallbackFn();
  progress.whenReady().then((h) => { fresh.merge(h); }).catch(() => { /* remote never came */ });
  return fresh;
}

// ── resolveBootDoc — tideline-class-aware boot-time required-doc resolver ─────
//
// The split-brain-safe replacement for waitHandleLocal's create-blank fallback on
// CANONICALLY-ADDRESSED required docs. It NEVER mints a fresh id for a doc that
// already carries a canonical url (that births a ghost documentId no peer ever syncs
// — a fork on the causal island). It branches on which side of the tideline the doc
// lives, read from automerge-repo's own availability signal (findWithProgress state),
// never a blind wall-clock race used as an existence oracle:
//   - hearth-private: never crosses the tideline (social plane, catalog) — no peer
//     will ever carry it; UNAVAILABLE = local corruption -> FAIL LOUD.
//   - mesh-shared: rides the magically-federated mesh (wikis) — UNAVAILABLE may just
//     mean "not delivered yet" -> WAIT for READY up to scale-graced patience, then
//     surface "still joining" (never invent a blank).
//
// Stable-bytes origins (the genesis island — reconstructable locally with a shared id)
// keep their own genesisHandle fallback; they are not ghosts and do not route here.

/** The five DreamNet federation scales <-> the five aperture bands; reach (so patience) grows. */
export type MeshScale = "vessel" | "person-group" | "cabal" | "nexus" | "dreamnet";
/** Which side of the tideline a required boot doc lives on. */
export type Tideline = "hearth-private" | "mesh-shared";

// Patience graded by source scale: a wider scale traverses more of the mesh, so a
// transient UNAVAILABLE is more expected — wait longer before surfacing. Graceful
// starting bands; the 5-scale source-determination + tuning is forging-ahead
// (CabalGroup/NexusGroup/DreamNet not yet built) — an undeterminable scale defaults
// to the widest patience so a slow-but-real delivery never reads as missing.
const SCALE_PATIENCE_MS: Record<MeshScale, number> = {
  vessel:         3_000,
  "person-group": 8_000,
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
  const handle = await new Promise<DocHandle<T> | null>((resolve) => {
    let settled = false;
    const finish = (h: DocHandle<T> | null) => { if (!settled) { settled = true; resolve(h); } };
    const unsub = q.subscribe((s) => {
      if (s.state === "ready") { unsub(); finish(s.handle); return; }
      // hearth-private never crosses the tideline — UNAVAILABLE is the library's terminal
      // answer (no peer will ever carry it), so fail FAST on the signal, not the backstop.
      // mesh-shared keeps waiting: UNAVAILABLE there is transient (the mesh may still deliver).
      if (opts.tideline === "hearth-private" && (s.state === "unavailable" || s.state === "failed")) {
        unsub(); finish(null);
      }
    });
    q.whenReady().then((h) => { unsub(); finish(h as DocHandle<T>); }).catch(() => { /* settled via subscribe/timeout */ });
    setTimeout(() => { unsub(); finish(null); }, deadlineMs);
  });
  if (handle) return handle;

  if (opts.tideline === "hearth-private") {
    throw new Error(
      `[boot] hearth-private doc unavailable — local corruption (no peer carries it); ` +
      `re-found via \`lares rebuild\`: ${opts.label} (${url})`,
    );
  }
  // mesh-shared: never throw, never blank — surface the typed still-joining signal
  // so the joiner proceeds and reconciles in the background.
  return { stillJoining: true, scale, label: opts.label, url, waitedMs: deadlineMs };
}
