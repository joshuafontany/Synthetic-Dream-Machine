/**
 * who-face — resolve the per-Nexus WHO board through the @crossroads public plane, then announce onto it.
 *
 * This is the wiring glue between three pieces already built: the @crossroads public oracle plane (the
 * pointer home, lar-uris), the satellite-pointer protocol (resolveOracleDoc, base-doc), and the card↔doc
 * bridge (handle-announce). A @crossroads tiddler at the nexusHandlesUri key holds the WHO board's automerge:
 * URL; a vessel resolves that pointer (open-or-mint, write-back on first mint) and gets the shared board a
 * stranger can reach without standing in any operator's grant graph.
 *
 * The board carries NO write-ACL, by design: a handle-card is self-certifying (valid only if signed by its
 * own nym), so an openly-appendable board stays trustworthy — forgery is structurally impossible, and a
 * recogniser's acceptHandleUpdate vets every card. Trust rides the card, never a per-writer capability (the
 * Nostr-relay model: validity lives in the signature). "Public" grants an anonymous principal read; the gate
 * still holds (pull ≠ read) — a garbage or unsigned tiddler is simply ignored at ingest.
 *
 * Pure and platform-blind: the caller supplies the repo `resolve` strategy (node races whenReady, browser
 * uses allowableStates), exactly as resolveOracleDoc already splits. Holds no key, mounts no HTTP.
 *
 * Canon: lar:///ha.ka.ba/lararium/docs/crossroads (the public plane); persona-circle#the-vault (the WHO model).
 */
import type { DocHandle } from "@automerge/automerge-repo";
import { resolveOracleDoc, type LarDoc } from "./base-doc.js";
import { nexusHandlesUri } from "./lar-uris.js";
import { writeHandleAnnounce } from "./handle-announce.js";
import type { HandleCard } from "./handle-card.js";

/**
 * Resolve the per-Nexus WHO board through @crossroads — open the board the pointer names, or mint a blank one
 * and write the pointer back on first mint. `nexusPubkey` scopes the board to one causal island; `resolve`
 * carries the platform's repo strategy; `provenance` stamps the pointer's authority.
 */
export function resolveWhoFace(
  crossroadsHandle: DocHandle<LarDoc>,
  nexusPubkey: string,
  resolve: (oracleUrl: string | null) => Promise<DocHandle<LarDoc>> | DocHandle<LarDoc>,
  provenance: string,
): Promise<DocHandle<LarDoc>> {
  return resolveOracleDoc(crossroadsHandle, nexusHandlesUri(nexusPubkey), resolve, provenance);
}

/**
 * Announce a card onto a resolved WHO board — write it as a nym-keyed tiddler inside the handle's change.
 * A re-announce (same nym, newer version) overwrites the slot; a recogniser's HandleBook still holds the
 * lineage, so the board keeping only the latest slot never loses the anti-rollback guarantee.
 */
export function announceToWhoFace(whoFaceHandle: DocHandle<LarDoc>, card: HandleCard): void {
  whoFaceHandle.change((d) => writeHandleAnnounce(d, card));
}
