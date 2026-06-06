/**
 * island-repo — the Automerge Repo-in-island factory.
 *
 * Repo construction + network-adapter wiring is a CRDT concern, so it lives in
 * mesh (the package that owns the automerge dependency and re-exports its
 * vocabulary). Higher layers — the sovereign kernel, the vessels — compose this
 * factory through the mesh facade and never import `@automerge/*` directly.
 *
 * Every island boots its own Repo over a transferred `syncPort` (MessagePort);
 * CRDT sync over that port is the sole delta channel (Island Sovereignty Law).
 */

import { Repo } from "@automerge/automerge-repo";
import type { StorageAdapterInterface } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";

export interface IslandRepoConfig {
  /** Platform storage adapter (NodeFS / IndexedDB); undefined = in-memory. */
  storage?: StorageAdapterInterface;
  /** The transferred MessagePort the island syncs over. */
  syncPort: MessagePort;
}

/** Construct an island's sovereign Repo over its transferred syncPort. */
export function makeIslandRepo(cfg: IslandRepoConfig): Repo {
  return new Repo({
    ...(cfg.storage ? { storage: cfg.storage } : {}),
    network: [new MessageChannelNetworkAdapter(cfg.syncPort)],
    sharePolicy: async () => true,
  });
}

/**
 * Attach a MessageChannel sync leg to an EXISTING repo (the vessel's main Repo).
 * The vessel keeps the main port; the island receives the transferred peer port.
 * Network-adapter construction is a CRDT concern owned by mesh — callers compose
 * this through the facade rather than importing @automerge/* themselves.
 */
export function attachMessageChannelSync(repo: Repo, mainPort: MessagePort): void {
  repo.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(mainPort));
}
