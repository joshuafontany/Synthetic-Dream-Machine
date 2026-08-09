/**
 * wait-handle — resolve a doc at boot without hanging on one the local store has not seen yet.
 *
 * ── THE PROBLEM A BOOT PATH ACTUALLY HAS ────────────────────────────────────────────────────────
 * A vessel opens by resolving a handful of doc URLs. Some of them the local store already holds; some
 * belong to a peer that has not synced yet. Waiting on the second kind hangs the boot; refusing to wait
 * gives a blank fork. Neither answer serves a household whose phone woke before the hearth did.
 *
 * So this races local readiness against a short window, and — the part that carries the whole value —
 * KEEPS THE REMOTE ALIVE AFTER FALLING BACK. When the doc arrives late, it merges into the handle the
 * caller already holds. Boot proceeds immediately; the content lands when it lands.
 *
 * ── WHY IT LIVES IN MESH, AND WHY IT DID NOT ────────────────────────────────────────────────────
 * The keel documents one strategy for both vessels. It ran as two: a node helper that raced and
 * late-merged, and a browser inline that awaited bare and, on rejection, took the fallback and DROPPED
 * THE REMOTE FOREVER. A doc arriving one tick past the window left a blank fork that never reconciled —
 * on a boot path, in the vessel most likely to open before its peer has synced, since a browser holds no
 * store of its own from a previous run of the hearth.
 *
 * Nothing here touches a platform: a `Repo`, a `DocHandle`, and a timer. One implementation, injected by
 * both recipes, so a keel that says "unified" says something a reader can check.
 *
 * ── THE LINE THAT MUST NOT BE DELETED ───────────────────────────────────────────────────────────
 * `progress.whenReady().then(h => fresh.merge(h))` IS the late-merge. Remove it and every call still
 * returns a handle, every boot still completes, and every test that only asserts "a handle came back"
 * still passes — while a peer's content silently never arrives. Its guard reds on exactly that deletion.
 */

import type { AutomergeUrl, DocHandle, Repo } from "@automerge/automerge-repo";

/** How long local readiness gets before the caller takes a fallback and boot moves on. */
export const LOCAL_READY_MS = 3000;

/**
 * Resolve `url`, or hand back `fallbackFn()`'s handle and merge the real doc into it when it arrives.
 *
 * `readyMs` overrides the window for a test; a caller in a causal island may also shorten it where it
 * knows its own peer is far. Zero and negative read as "do not wait" rather than as an error — a caller
 * asking for no window means it, and the late-merge still stands behind the fallback.
 */
export async function waitHandle<T>(
  repo: Repo,
  url: AutomergeUrl | string,
  fallbackFn: () => DocHandle<T>,
  readyMs: number = LOCAL_READY_MS,
): Promise<DocHandle<T>> {
  const progress = repo.findWithProgress<T>(url as AutomergeUrl);
  const ready = await Promise.race([
    progress.whenReady().then((h) => h).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), Math.max(0, readyMs))),
  ]);
  if (ready) return ready;

  const fresh = fallbackFn();
  // The remote stays alive past the fallback. A doc that lands after the window merges into the handle
  // the caller is already using, so a late peer costs latency rather than content.
  progress.whenReady().then((h) => { fresh.merge(h); }).catch(() => { /* the remote never came */ });
  return fresh;
}
