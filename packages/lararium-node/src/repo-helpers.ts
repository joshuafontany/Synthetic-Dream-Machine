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
