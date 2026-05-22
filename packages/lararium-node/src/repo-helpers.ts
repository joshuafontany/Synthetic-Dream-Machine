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
  const progress = repo.findWithProgress<T>(url);
  const handle = progress.handle;
  const localReady = await Promise.race([
    handle.whenReady().then(() => true),
    new Promise<false>((r) => setTimeout(() => r(false), LOCAL_READY_MS)),
  ]);
  if (localReady) return handle;
  const fresh = fallbackFn();
  handle.whenReady().then(() => { fresh.merge(handle); }).catch(() => { /* remote never came */ });
  return fresh;
}
